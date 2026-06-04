# Vivido — Company Brain (Claude Code)

> Questo file è il **Livello 1 — Contesto** del Vivido Assistant. Va messo in `~/.claude/CLAUDE.md`
> dell'account Claude di Vivido (o in un `CLAUDE.md` di progetto).

---

## 1. Chi è Vivido

Vivido è una **design consultancy founder-to-founder** per startup e founder early-stage. Wedge: siti
web; deliverable a catalogo: **Blueprint**, **MVP**, **Website (Pro)**, **Design Pod**, **Cycles** (retainer
ricorrente), **Partnership**. Modello: progetti one-shot a scope + retainer mensili (Cycles/Monthly).

Founder: **Samuele** (`hello@vivido.world`). Oggi Vivido opera **solo con il founder** (no team interno
attivo nelle routine — vedi §3). Timezone operativo: **Europe/London**.

---

## 2. Mappa dei dati Vivido

Single source of truth: **Notion "Vivido World"** (workspace `6850c1bd18aa448d97fe9745f14c8ffc`).

| Cosa | Collection ID | Note |
|---|---|---|
| **Projects** | `collection://610066df-92fc-45db-88f7-bb42c2d4b449` | Owner = `Assigned` (person). Status: Discovery · Onboarding · In Progress · Paused · waiting for feedback · To Be Payed · Completed · Expired. "Attivo" = tutto tranne Completed/Expired/To Be Payed |
| **Tasks** | `collection://91c2817c-74a6-4037-9b28-6849abe2a480` | Owner = `Account` (person) + `Team Member` (relation). Progetto = relazione `Vivido Project`. Status: Next · To Do · In Progress · Waiting for feedback · Late · Done · Archived (done = Done/Archived) |
| **Knowledge log** | `collection://cd50aae4-bcc5-8396-b4c7-0718667ffdb5` | POV founder, auto-scritto da `log-ingest`. Props: `Entry` (title), `Content` (text), `Person` |
| **Sales CRM** | `collection://1450aae4-bcc5-8106-9d6c-000b908fed72` | Pipeline. Status: MQL · Discovery Call · Quotation · Follow up · Negotiation · Partnership · Nurturing · Lost · Won. Valore = `Monthly Price`/`Total Value`, follow-up = `Follow Up Target` |
| Clienti | `collection://775a0aac-ac84-49e9-ab9a-2c0d06bdc149` | usato per risolvere email cliente |
| Invoices | `collection://8d68a5c8-913a-45a1-8047-11998603e9eb` | flag finanziari (Status: Next/To Do/Sent/Paid) |
| Contracts | `collection://5fece0d9-2134-4b16-8b5f-b25dec053631` | flag contratti |
| Team Member (rif.) | `collection://1c30aae4-bcc5-80c2-852c-000b59b1a0e4` | non in snapshot; solo riferimento |

Roadmap/Backlog: **Vivido non li usa** → chiavi vuote in `config.json`, lo snapshot li salta.

**Canali dati via MCP** (account Vivido): Gmail `hello@vivido.world` · Granola `hello@vivido.world` ·
Google Calendar Vivido · Slack workspace Vivido World.

---

## 3. Team (owner mapping)

Oggi Vivido = **solo Samuele**. Le routine non fanno owner-routing a più persone: ogni task/azione
fa capo al founder.

| Membro | Ruolo | Slack ID | Notion Person UUID |
|---|---|---|---|
| Samuele | Founder | `U062VMYTXDL` | `09ff0769-85fd-4a7e-a637-b8164b9c3c5b` |

> Quando entrerà del team, aggiungi le righe qui e ripristina la logica owner-mapping nelle routine.

---

## 4. Slack — delivery

- **DM operativa** founder: channel/user `U062VMYTXDL` (`hello@vivido.world` — "Vivido Administration").
  È dove arrivano tutte le routine e dove il founder risponde all'EOD.
- **Bot Vivido**: ⚠️ **non ancora creato.** Finché non esiste il bot + `VIVIDO_BOT_TOKEN`, la consegna
  finale autonoma (cloud) non funziona. Per i test interattivi "solo con me" si consegna via MCP Slack
  alla DM del founder. Vedi `SETUP.md §5` per creare il bot e il secret.

Quando il bot esiste: consegna sempre via `~/.claude/skills/vivido-assistant/send.sh` (token da env
`VIVIDO_BOT_TOKEN` o file `vivido-bot.token`), mai `slack_send_message` MCP per la consegna finale.

---

## 5. Stile

- Lingua: **italiano**. Slack: messaggi brevi, bullet, emoji status minimali (🟢🟡🔴 · 🔍 crepa POV · 💡 spunto).
- Progetti citati col nome cliente.
- Tono: diretto, osservativo non imperativo. Le routine osservano e fanno domande; non creano task.

---

## 6. Routine disponibili

Skill `vivido-assistant` (in `~/.claude/skills/vivido-assistant/`). Argomenti: `morning`, `weekly`, `eod`,
`log-ingest`, `log-ingest-reminder`, `linkedin`. Scheduled agents: `vivido-morning`, `vivido-weekly`,
`vivido-eod`, `vivido-log-ingest`, `vivido-log-ingest-reminder`, `vivido-linkedin` (timezone Europe/London).
