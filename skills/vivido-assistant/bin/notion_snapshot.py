#!/usr/bin/env python3
"""
Nest Assistant — Notion deterministic snapshot.

Perché esiste: il connector MCP Notion fa solo ricerca semantica (max 25 risultati,
ranking per rilevanza, senza properties). Non è in grado di enumerare un DB in modo
completo e affidabile. Questo causa "non prende le task di tutti" e "scambia i progetti".

Questo script bypassa l'MCP e usa l'API ufficiale Notion (POST /v1/data_sources/{id}/query)
con paginazione completa, risolvendo le relazioni in codice. Produce uno snapshot pulito
che le routine del Nest Assistant leggono al posto della ricerca fuzzy.

Output:
  cache/snapshot.json  — dati strutturati completi
  cache/snapshot.md    — digest leggibile, già raggruppato (task per progetto + per persona)

Uso:
  python3 notion_snapshot.py            # snapshot completo
  python3 notion_snapshot.py --probe    # test: verifica token + 1 query, niente file
  python3 notion_snapshot.py --today 2026-06-03   # override data (default: oggi)

Token: letto da ~/.claude/skills/nest-assistant/notion.token (o env NOTION_TOKEN).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, date, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
# SKILL_DIR: env VIVIDO_SKILL_DIR, altrimenti la cartella che contiene bin/.
SKILL_DIR = os.environ.get(
    "VIVIDO_SKILL_DIR",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)
CONFIG_FILE = os.path.join(SKILL_DIR, "config.json")
TOKEN_FILE = os.path.join(SKILL_DIR, "notion.token")   # fallback se NOTION_TOKEN env assente
CACHE_DIR = os.path.join(SKILL_DIR, "cache")
NOTION_VERSION = "2025-09-03"
API = "https://api.notion.com/v1"


def _load_config():
    """Carica config.json (mappa DB Vivido + nomi utenti). Env VIVIDO_NOTION_DS
    (JSON inline) vince sul file — utile per i secret degli scheduled agent cloud."""
    cfg = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            cfg = json.load(f)
    env_ds = os.environ.get("VIVIDO_NOTION_DS")
    if env_ds:
        cfg["notion_ds"] = json.loads(env_ds)
    return cfg


_CFG = _load_config()

# data_source_id == collection:// id dei DB Vivido. Popolati da config.json.
# Chiavi attese: projects, tasks, knowledge_log. Opzionali: crm, roadmap,
# backlog, clienti, team, invoices, contracts (ometti quelle che Vivido non ha).
DS = _CFG.get("notion_ds", {})

# Fallback nome utente per Person (people type) se l'API non restituisce il nome.
USER_NAMES = _CFG.get("user_names", {})

DONE_STATUSES = set(_CFG.get("done_statuses", ["Done", "Archived"]))


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def get_token():
    tok = os.environ.get("NOTION_TOKEN")
    if tok:
        return tok.strip()
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            return f.read().strip()
    sys.exit(
        "ERRORE: nessun token Notion.\n"
        f"  Crea un'integrazione su https://www.notion.so/my-integrations\n"
        f"  e salva il token (secret_... o ntn_...) in:\n    {TOKEN_FILE}\n"
        "  Poi condividi i DB con l'integrazione (vedi istruzioni)."
    )


def api_post(path, body, token):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def query_all(ds_id, token, filt=None, sorts=None, max_pages=50):
    """Pagina TUTTI i risultati di un data source. Niente cap a 25."""
    results, cursor, pages = [], None, 0
    while pages < max_pages:
        body = {"page_size": 100}
        if filt:
            body["filter"] = filt
        if sorts:
            body["sorts"] = sorts
        if cursor:
            body["start_cursor"] = cursor
        data = api_post(f"/data_sources/{ds_id}/query", body, token)
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
        pages += 1
    return results


# ---------------------------------------------------------------------------
# Property parsing
# ---------------------------------------------------------------------------
def pv(prop):
    """Normalizza un valore property Notion in un tipo Python semplice."""
    if prop is None:
        return None
    t = prop.get("type")
    v = prop.get(t)
    if t in ("title", "rich_text"):
        return "".join(x.get("plain_text", "") for x in v).strip()
    if t == "status":
        return v.get("name") if v else None
    if t == "select":
        return v.get("name") if v else None
    if t == "multi_select":
        return [x.get("name") for x in v]
    if t == "date":
        if not v:
            return None
        return {"start": v.get("start"), "end": v.get("end")}
    if t == "people":
        return [{"id": x.get("id"), "name": x.get("name") or USER_NAMES.get(x.get("id"))} for x in v]
    if t == "relation":
        return [x.get("id") for x in v]
    if t == "number":
        return v
    if t in ("email", "phone_number", "url"):
        return v
    if t == "checkbox":
        return bool(v)
    if t in ("created_time", "last_edited_time"):
        return v
    if t == "unique_id":
        return f"{v.get('prefix','')}{v.get('number','')}" if v else None
    if t == "formula":
        return v.get(v.get("type")) if v else None
    if t == "rollup":
        if not v:
            return None
        rt = v.get("type")
        if rt == "array":
            return [pv(x) for x in v.get("array", [])]
        return v.get(rt)
    return v


def props(page):
    return {k: pv(p) for k, p in page.get("properties", {}).items()}


def page_title(page):
    """Estrae il valore della property di tipo title di una pagina (Team Member,
    Collaborator Project: il nome del membro/progetto)."""
    for p in page.get("properties", {}).values():
        if p.get("type") == "title":
            return pv(p)
    return None


def norm_id(s):
    return (s or "").replace("-", "")


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------
def parse_d(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except Exception:
        try:
            return date.fromisoformat(s[:10])
        except Exception:
            return None


def days_between(d, today):
    return (d - today).days if d else None


# ---------------------------------------------------------------------------
# Build snapshot
# ---------------------------------------------------------------------------
def build(token, today, probe=False):
    out = {"generated": datetime.now().isoformat(), "today": today.isoformat(),
           "errors": [], "projects": [], "tasks": [], "crm": [], "roadmap": [],
           "backlog": [], "invoices": [], "contracts": []}

    def safe_query(key, **kw):
        if not DS.get(key):
            return []   # DB non configurato per Vivido (es. niente invoices) → skip
        try:
            return query_all(DS[key], token, **kw)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            out["errors"].append(f"{key}: HTTP {e.code} {msg}")
            return []
        except Exception as e:
            out["errors"].append(f"{key}: {e}")
            return []

    if probe:
        rows = safe_query("tasks")
        print(f"PROBE tasks: {len(rows)} righe lette (paginazione completa).")
        if out["errors"]:
            print("ERRORI:", *out["errors"], sep="\n  ")
            return None
        if rows:
            print("Esempio properties prima riga:", list(rows[0].get("properties", {}).keys()))
        return None

    # Owner = solo Person (mention). La relazione Assigned→Team Members è stata
    # rimossa dallo schema (2026-06-03, scelta founder: più clean). Niente query Team.
    team_map = {}

    # --- Clienti: id pagina -> email/nome (per fallback Contact Email) ---
    cli_rows = safe_query("clienti")
    cli_map = {}
    for r in cli_rows:
        pr = props(r)
        email = next((v for k, v in pr.items() if "mail" in k.lower() and v), None)
        name = pr.get("Name") or pr.get("Nome")
        cli_map[norm_id(r["id"])] = {"email": email, "name": name}

    # --- Projects ---
    proj_rows = safe_query("projects")
    proj_map = {}  # id pagina -> project dict
    for r in proj_rows:
        pr = props(r)
        contact = pr.get("Contact Email")
        client_rel = pr.get("Client") or []
        if not contact and client_rel:
            c = cli_map.get(norm_id(client_rel[0]))
            if c:
                contact = c.get("email")
        inizio = (pr.get("Inizio") or {}).get("start") if isinstance(pr.get("Inizio"), dict) else None
        durata = pr.get("Durata prevista")
        fine = None
        if inizio and isinstance(durata, (int, float)):
            di = parse_d(inizio)
            if di:
                m = di.month - 1 + int(durata)
                fine = date(di.year + m // 12, m % 12 + 1, min(di.day, 28)).isoformat()
        p = {
            "id": r["id"], "url": r.get("url"),
            "name": pr.get("Project name") or pr.get("Name") or pr.get("Project") or "?",
            "status": pr.get("Status"), "contactEmail": contact,
            "mrr": pr.get("Monthly Price") or pr.get("MRR"), "contractType": pr.get("Contract Type"),
            "inizio": inizio, "durataPrevista": durata, "finePrevista": fine,
        }
        out["projects"].append(p)
        proj_map[norm_id(r["id"])] = p

    # --- Team Member + Collaborator Project (owner/progetto reali Vivido) ---
    # In Notion Vivido c'è UN solo "person" (il founder/hello@): gli owner veri
    # delle task stanno nella relazione "Team Member", e molti progetti (specie
    # design) sono linkati via "Collaborator Project", non "Vivido Project".
    # Risolviamo entrambe le relazioni per nome.
    tm_map = {norm_id(r["id"]): page_title(r) for r in safe_query("team_members")}
    collab_map = {norm_id(r["id"]): page_title(r) for r in safe_query("collab_projects")}

    # --- Tasks (solo aperte) ---
    task_rows = safe_query("tasks")
    for r in task_rows:
        pr = props(r)
        status = pr.get("Status")
        if status in DONE_STATUSES:
            continue
        # relazione progetto — Vivido: "Vivido Project" → fallback "Collaborator Project"
        # → fallback Nest " Project"/"Project". projectId resta solo se linka un progetto reale.
        proj_rel = pr.get("Vivido Project") or pr.get(" Project") or pr.get("Project") or []
        proj = proj_map.get(norm_id(proj_rel[0])) if proj_rel else None
        proj_name = proj["name"] if proj else None
        if not proj_name:
            cp_rel = pr.get("Collaborator Project") or []
            if cp_rel:
                proj_name = collab_map.get(norm_id(cp_rel[0]))
        # owner = Account/Person (people) + Assigned (relation) + Team Member (relation, Vivido)
        owners = []
        for person in (pr.get("Account") or pr.get("Person") or []):
            owners.append(person.get("name") or USER_NAMES.get(person.get("id")) or person.get("id"))
        for aid in (pr.get("Assigned") or []):
            nm = team_map.get(norm_id(aid))
            if nm and nm not in owners:
                owners.append(nm)
        for tid in (pr.get("Team Member") or []):
            nm = tm_map.get(norm_id(tid))
            if nm and nm not in owners:
                owners.append(nm)
        due = (pr.get("Due Date") or {}).get("start") if isinstance(pr.get("Due Date"), dict) else None
        dd = parse_d(due)
        delta = days_between(dd, today)
        if delta is None:
            bucket = "no_due"
        elif delta < -14:
            bucket = "ghost"
        elif delta < 0:
            bucket = "overdue"
        elif delta == 0:
            bucket = "today"
        elif delta <= 3:
            bucket = "soon"
        else:
            bucket = "future"
        out["tasks"].append({
            "id": r["id"], "url": r.get("url"), "name": pr.get("Name") or "?",
            "status": status, "priority": pr.get("Priority"),
            "owners": owners or ["(nessun owner)"],
            "projectName": proj_name or "(nessun progetto)",
            "projectId": proj["id"] if proj else None,
            "due": due, "deltaDays": delta, "bucket": bucket,
        })

    # --- CRM ---
    for r in safe_query("crm"):
        pr = props(r)
        st = pr.get("Status")
        if st in ("Won", "Lost", "Accepted"):
            continue
        nad = pr.get("Next Action Date") or pr.get("Follow Up Target")
        nad = nad.get("start") if isinstance(nad, dict) else nad
        out["crm"].append({
            "id": r["id"], "url": r.get("url"),
            "name": pr.get("Name") or pr.get("Clients Name") or "?",
            "status": st, "nextAction": pr.get("Next Action") or pr.get("Message"),
            "nextActionDate": nad, "mrr": pr.get("Monthly Price") or pr.get("MRR"),
            "tipologia": pr.get("Contract Type") or pr.get("Tipologia Contratto"),
            "email": next((v for k, v in pr.items() if "mail" in k.lower() and v), None),
        })

    # --- Roadmap steps ---
    for r in safe_query("roadmap"):
        pr = props(r)
        pian = pr.get("Pianifica")
        out["roadmap"].append({
            "id": r["id"], "url": r.get("url"), "name": pr.get("Name") or "?",
            "stato": pr.get("Stato"),
            "start": pian.get("start") if isinstance(pian, dict) else None,
            "lastEdited": r.get("last_edited_time"),
        })

    # --- Backlog richieste ---
    for r in safe_query("backlog"):
        pr = props(r)
        out["backlog"].append({
            "id": r["id"], "url": r.get("url"), "name": pr.get("Name") or "?",
            "stato": pr.get("Stato"), "created": r.get("created_time"),
        })

    # --- Invoices / Contracts (flag finanziari) ---
    for r in safe_query("invoices"):
        pr = props(r)
        epd = pr.get("Expected Payment Date")
        out["invoices"].append({
            "id": r["id"], "url": r.get("url"), "name": pr.get("Name") or "?",
            "status": pr.get("Status"),
            "expected": epd.get("start") if isinstance(epd, dict) else epd,
        })
    for r in safe_query("contracts"):
        pr = props(r)
        sd = pr.get("Sent Day")
        out["contracts"].append({
            "id": r["id"], "url": r.get("url"), "name": pr.get("Name") or "?",
            "status": pr.get("Status"),
            "sentDay": sd.get("start") if isinstance(sd, dict) else sd,
        })

    return out


# ---------------------------------------------------------------------------
# Markdown digest
# ---------------------------------------------------------------------------
def render_md(s):
    today = s["today"]
    L = [f"# Vivido snapshot — {today}", f"_generato {s['generated']}_", ""]
    if s["errors"]:
        L += ["## ⚠️ Errori (DB non condivisi con l'integrazione?)"] + [f"- {e}" for e in s["errors"]] + [""]

    # Vivido: progetto "attivo" = qualunque stato che non sia chiuso/pagato
    PROJ_DONE = ("Completed", "Expired", "To Be Payed")
    active = [p for p in s["projects"] if p["status"] not in PROJ_DONE]
    L.append(f"## Progetti attivi/partner ({len(active)})")
    for p in sorted(active, key=lambda x: x["name"].lower()):
        L.append(f"- **{p['name']}** [{p['status']}] · {p.get('contactEmail') or 'NO EMAIL'} · "
                 f"MRR {p.get('mrr') or '-'} · {p.get('contractType') or '-'} · fine prevista {p.get('finePrevista') or '-'}")
    L.append("")

    tasks = s["tasks"]
    FLAG = {"ghost": "🪦", "overdue": "🔴", "today": "🟠", "soon": "🟡", "future": "·", "no_due": "·"}
    ACTIVE_NO_DEBT = ("today", "soon", "overdue")  # bucket "vivi" che richiedono un owner

    def is_owned(t):
        return t["owners"] != ["(nessun owner)"]

    # --- Salute progetti (tabella sintetica, layer operativo) ---
    byproj = {}
    for t in tasks:
        byproj.setdefault(t["projectName"], []).append(t)
    L.append("## Salute progetti (layer operativo)")
    L.append("| Progetto | Aperte | Oggi+ritardo | Fantasma | Senza owner |")
    L.append("|---|---|---|---|---|")
    ordered = [p["name"] for p in sorted(active, key=lambda x: x["name"].lower())]
    ordered += [k for k in sorted(byproj, key=str.lower) if k not in ordered]
    for proj in ordered:
        ts = byproj.get(proj, [])
        if not ts:
            continue
        live = sum(1 for x in ts if x["bucket"] in ("today", "overdue"))
        ghost = sum(1 for x in ts if x["bucket"] == "ghost")
        noown = sum(1 for x in ts if not is_owned(x))
        L.append(f"| {proj} | {len(ts)} | {live or '·'} | {ghost or '·'} | {noown or '·'} |")
    L.append("")

    # --- per progetto (dettaglio: prima i vivi, poi il resto) ---
    L.append(f"## Task aperte per progetto ({len(tasks)} totali)")
    for proj in ordered:
        ts = byproj.get(proj, [])
        if not ts:
            continue
        L.append(f"### {proj} ({len(ts)})")
        for t in sorted(ts, key=lambda x: (x["deltaDays"] is None, x["deltaDays"] if x["deltaDays"] is not None else 0)):
            L.append(f"- {FLAG[t['bucket']]} {t['name']} — {t['status']} — owner: {', '.join(t['owners'])} "
                     f"— due {t['due'] or 'no due'} [{t['priority'] or '-'}]")
        L.append("")

    # --- per persona ---
    L.append("## Task aperte per persona")
    byperson = {}
    for t in tasks:
        for o in t["owners"]:
            byperson.setdefault(o, []).append(t)
    # Membri Nest prima, "(nessun owner)" per ultimo
    people = [p for p in sorted(byperson, key=str.lower) if p != "(nessun owner)"]
    for person in people:
        ts = byperson[person]
        live = sum(1 for x in ts if x["bucket"] in ("today", "overdue"))
        ghost = sum(1 for x in ts if x["bucket"] == "ghost")
        L.append(f"### {person} ({len(ts)} aperte · {live} vive in ritardo/oggi · {ghost} fantasma)")
        for t in sorted(ts, key=lambda x: (x["deltaDays"] is None, x["deltaDays"] if x["deltaDays"] is not None else 0))[:30]:
            L.append(f"- {FLAG[t['bucket']]} [{t['projectName']}] {t['name']} — {t['status']} — due {t['due'] or 'no due'}")
        L.append("")

    # --- Hygiene, divisa per gravità ---
    parking = [t for t in tasks if not is_owned(t) and t["status"] == "Backlog" and t["bucket"] == "no_due"]
    orphan = [t for t in tasks if t["projectId"] is None and not is_owned(t)]
    ghost_noown = [t for t in tasks if t["bucket"] == "ghost" and not is_owned(t)]
    active_noown = [t for t in tasks if t["bucket"] in ACTIVE_NO_DEBT and not is_owned(t)]
    no_proj_owned = [t for t in tasks if t["projectId"] is None and is_owned(t)]

    L.append("## Hygiene (per gravità)")
    if active_noown:
        L.append(f"### 🚧 PRIORITÀ — task vive senza owner ({len(active_noown)}) — assegnare subito")
        for t in active_noown[:15]:
            L.append(f"- {FLAG[t['bucket']]} [{t['projectName']}] {t['name']} — {t['status']} — due {t['due'] or 'no due'}")
    else:
        L.append("### 🟢 Nessuna task viva (oggi/ritardo recente/≤3g) è senza owner — layer operativo coperto")
    if no_proj_owned:
        L.append(f"### 🔗 Con owner ma SENZA progetto ({len(no_proj_owned)}) — collegare al progetto")
        for t in no_proj_owned[:15]:
            L.append(f"- {t['name']} — {t['status']} — owner {', '.join(t['owners'])}")
    if ghost_noown:
        L.append(f"### 🪦 Fantasma senza owner ({len(ghost_noown)}, >14g) — chiudere o rischedulare")
        for t in sorted(ghost_noown, key=lambda x: x["deltaDays"])[:15]:
            L.append(f"- [{t['projectName']}] {t['name']} — {t['status']} — due {t['due']}")
    if orphan:
        L.append(f"### 👻 Orfane (né progetto né owner): {len(orphan)} — triage massivo")
        L.append("  " + "; ".join(t["name"] for t in orphan[:12]) + (" …" if len(orphan) > 12 else ""))
    L.append(f"### 🅿️ Parcheggio idee (Backlog senza scadenza né owner): {len(parking)} — legittimo, non allarmare")
    L.append("")

    # --- CRM: solo AZIONI REALI (no Nurturing perpetuo, no azione vuota) ---
    def has_action(c):
        a = (c.get("nextAction") or "").strip()
        # esclude vuoto e l'azione-fantoccio "Imposta Last Step" (= data gap, non azione vendita)
        return a not in ("", "—", "-", "–") and "Imposta Last Step" not in a
    HOT = ("Discovery Call", "Quotation", "Follow up", "Negotiation", "Partnership")
    actionable = [c for c in s["crm"] if c["nextActionDate"] and c["nextActionDate"][:10] <= today
                  and has_action(c) and c["status"] and c["status"] != "Nurturing"]
    today_act = [c for c in actionable if c["nextActionDate"][:10] == today]
    over_act = [c for c in actionable if c["nextActionDate"][:10] < today]
    hot = [c for c in s["crm"] if c["status"] in HOT]
    nurturing = [c for c in s["crm"] if c["status"] == "Nurturing"]
    nostatus = [c for c in s["crm"] if not c["status"]]
    L.append(f"## CRM — azioni reali oggi ({len(today_act)}) · in ritardo ({len(over_act)})")
    for c in sorted(over_act, key=lambda x: x["nextActionDate"]) + today_act:
        tag = "RITARDO" if c in over_act else "OGGI"
        mrr = f" · MRR {c['mrr']}" if c.get("mrr") else ""
        L.append(f"- [{tag}] {c['name']} — {c['status']} — {c['nextAction']} — {c['nextActionDate'][:10]}{mrr}")
    L.append(f"- 🔥 Pipeline calda (Discovery/Proposta/Rewind Call): {len(hot)}")
    L.append(f"- 🌱 Nurturing pool (ricorrente, non azione daily): {len(nurturing)}")
    if nostatus:
        L.append(f"- ⚠️ Lead SENZA Status (data gap da sistemare): {len(nostatus)}")
    L.append("")

    return "\n".join(L)


# ---------------------------------------------------------------------------
def main():
    args = sys.argv[1:]
    probe = "--probe" in args
    today = date.today()
    if "--today" in args:
        today = date.fromisoformat(args[args.index("--today") + 1])

    token = get_token()
    s = build(token, today, probe=probe)
    if probe:
        return

    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(os.path.join(CACHE_DIR, "snapshot.json"), "w") as f:
        json.dump(s, f, ensure_ascii=False, indent=2)
    with open(os.path.join(CACHE_DIR, "snapshot.md"), "w") as f:
        f.write(render_md(s))

    print(f"✅ Snapshot {today}: "
          f"{len([p for p in s['projects'] if p['status'] not in ('Completed','Expired','To Be Payed')])} progetti attivi · "
          f"{len(s['tasks'])} task aperte · {len(s['crm'])} lead CRM · "
          f"{len(s['roadmap'])} step · {len(s['backlog'])} backlog")
    if s["errors"]:
        print("⚠️ Errori:", *s["errors"], sep="\n  ")


if __name__ == "__main__":
    main()
