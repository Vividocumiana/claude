# Vivido Assistant — Setup runbook (leggi questo per primo)

Questo kit replica il **Nest Assistant** per Vivido, con 5 routine:
`morning` (daily brief) · `weekly` · `eod` · `log-ingest` (+ `log-ingest-reminder`) · `linkedin` (idea sync).

Obiettivo: farlo girare **online, senza dipendere da nessun computer**, su un **account Claude separato per Vivido**, con i dati dal **Notion Vivido già esistente**.

---

## 0. Come funziona oggi vs come deve funzionare

| | Nest Assistant (oggi) | Vivido Assistant (obiettivo) |
|---|---|---|
| Trigger | cron **locale** (`~/.claude/scheduled-tasks/`) → gira solo se il Mac è acceso | **scheduled agents cloud** → girano sull'infra Anthropic, zero computer |
| Token Slack/Notion | file locali (`bot.token`, `notion.token`) | **secret/env** dell'agent cloud (`VIVIDO_BOT_TOKEN`, `NOTION_TOKEN`) |
| Skill + script | `~/.claude/skills/nest-assistant/` sul Mac | committati in un **repo git** che l'agent cloud usa come workspace |
| Dati | Notion Nest | Notion Vivido |

Il lavoro di setup è quindi: (1) account+connettori Vivido, (2) repo con la skill, (3) secret, (4) scheduled agents.

---

## 1. Prerequisiti sull'account Claude Vivido

1. **Account/abbonamento Claude separato** per Vivido (Claude Code).
2. **Connettori MCP autenticati sul workspace Vivido** (OAuth):
   - **Notion** (workspace Vivido World) — obbligatorio
   - **Slack** (workspace Vivido) — per leggere i thread EOD nel log-ingest
   - **Gmail** (`samuele@vivido.world`) — morning/eod/linkedin
   - **Google Calendar** (Vivido) — morning/eod
   - **Granola** (`hello@vivido.world`) — linkedin/meeting (⚠️ vedi caveat §6)
3. **Bot Slack Vivido** già esistente (`vivido_assistant`). Recupera il suo **Bot User OAuth Token** (`xoxb-...`) dalla pagina dell'app Slack → diventa il secret `VIVIDO_BOT_TOKEN`.
4. **Integrazione interna Notion** ("Vivido Assistant") su https://www.notion.so/my-integrations → token `ntn_...` = secret `NOTION_TOKEN`. **Condividi con l'integrazione i DB** Progetti/Tasks/Knowledge Log/CRM Vivido (altrimenti lo snapshot non li vede).

---

## 2. Compila la config (vedi `CONFIG.md`)

Tutti i valori Vivido stanno in due posti:
- `skills/vivido-assistant/config.json` → i **DB IDs Notion** + nomi utenti (per lo snapshot).
- `VIVIDO.md` → il **contesto** (team, Slack, ICP) che va in `~/.claude/CLAUDE.md` dell'account Vivido.
- I placeholder `<VIVIDO_*>` dentro le routine → sostituiscili col find/replace di `CONFIG.md`.

`CONFIG.md` ha la tabella completa: ogni placeholder, dove prendere il valore, valori già noti.

---

## 3. Completa l'adattamento delle routine (vedi `PORTING.md`)

Le 5 routine sono clonate dal Nest Assistant: gli ID sono già diventati placeholder, ma restano riferimenti che dipendono dal **team e dai progetti reali di Vivido** (owner mapping, nomi progetti per i safety-net, file memory). `PORTING.md` elenca esattamente cosa resta da sistemare a mano, file per file.

---

## 4. Metti la skill dove l'agent cloud la trova

Due opzioni:

**A) Repo git (consigliato per il cloud).** Crea un repo privato `vivido-assistant` con dentro la cartella `skills/` di questo kit (e `VIVIDO.md`, `reference/`). Lo scheduled agent cloud gira con questo repo come working dir → la skill è in `.claude/skills/vivido-assistant/` e i path `~/.claude/skills/vivido-assistant/...` vanno adattati al path del repo, **oppure** installa la skill in `~/.claude/skills/` dell'account (vedi B).

**B) Skill installata nell'account.** Copia `skills/vivido-assistant/` in `~/.claude/skills/vivido-assistant/` dell'account Vivido. I path nelle routine (`~/.claude/skills/vivido-assistant/...`) funzionano così come sono.

> In entrambi i casi i **token NON vanno committati**: restano secret/env (§5).

---

## 5. Secret / env dell'agent cloud

Imposta queste variabili come **secret dello scheduled agent** (o env dell'ambiente cloud):

| Variabile | Valore | Usata da |
|---|---|---|
| `VIVIDO_BOT_TOKEN` | `xoxb-...` (Bot token Slack Vivido) | `send.sh` (delivery) |
| `NOTION_TOKEN` | `ntn_...` (integrazione interna Notion Vivido) | `notion_snapshot.py` |
| `VIVIDO_NOTION_DS` *(opzionale)* | JSON inline della mappa DB (alternativa a `config.json`) | `notion_snapshot.py` |

`send.sh` e `notion_snapshot.py` leggono **prima** l'env, poi il file locale — quindi in cloud bastano i secret, in locale bastano i file. Niente token nel repo.

Se l'ambiente cloud **non** supporta env-secret per gli script bash/python, due fallback:
- usa `config.json` per i DB (non è segreto) e committa i token solo in un repo **privato** (accettabile, non ideale);
- oppure salta `notion_snapshot.py` e fai enumerare alle routine via MCP Notion (più semplice ma fuzzy — ok solo se i DB Vivido sono piccoli; vedi `routines/_data-layer.md`).

---

## 6. Crea gli scheduled agents cloud (vedi `scheduled-agents.md`)

Sull'account Vivido, usa lo skill **`/schedule`** di Claude Code per creare un agent per routine. `scheduled-agents.md` contiene i 6 spec pronti (nome, cron, timezone, prompt). Ogni prompt è una riga: "invoca la skill `vivido-assistant` con arg `<X>`".

Esempio orari (timezone Vivido — imposta `Europe/London` o quella del founder):
- `vivido-morning` — 08:00 lun-ven
- `vivido-weekly` — 08:18 lun
- `vivido-eod` — 18:30 lun-ven
- `vivido-log-ingest-reminder` — 19:00 lun-ven
- `vivido-log-ingest` — 22:00 lun-ven
- `vivido-linkedin` — 13:00 ogni giorno (o l'orario preferito)

> ⚠️ **Caveat connettori headless.** I connettori OAuth (Notion/Slack/Gmail/Calendar) di norma funzionano nei run headless/cron. Alcuni connettori autenticati interattivamente (es. **Granola**) **potrebbero non essere disponibili** in cloud. Dopo aver creato gli agent, **lancia un run manuale di test di ciascuno** e verifica nell'output che la raccolta dati funzioni. Se Granola non risponde in cloud, la `linkedin` perde la fonte meeting ma resta su Notion+Gmail; il `morning`/`eod` usano comunque snapshot+Gmail+Calendar.

---

## 7. Test prima di andare live

In una sessione interattiva sull'account Vivido (con i connettori attivi):

```bash
# 1. snapshot Notion (verifica token + DB condivisi)
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --probe
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today <YYYY-MM-DD>

# 2. delivery Slack (verifica bot token + DM channel)
echo "test vivido assistant" | bash ~/.claude/skills/vivido-assistant/send.sh <VIVIDO_DM_CHANNEL> -
```

Poi invoca le routine a mano una per una: `vivido-assistant morning`, `... eod`, `... log-ingest`, `... weekly`, `... linkedin`. Controlla che arrivino in DM. Solo quando tutte e 5 girano pulite → attiva gli scheduled agents.

---

## Indice file del kit

- `SETUP.md` ← questo
- `CONFIG.md` — tabella placeholder → valori
- `PORTING.md` — adattamenti manuali residui nelle routine
- `scheduled-agents.md` — spec dei 6 cron cloud
- `VIVIDO.md` — contesto L1 (va in `~/.claude/CLAUDE.md` Vivido)
- `skills/vivido-assistant/` — la skill (SKILL.md, routines/, bin/, send.sh, config.json, reference/)
