# Vivido — Company Brain (Claude Code)

> Questo file è il **Livello 1 — Contesto** del Vivido Assistant. Va messo in `~/.claude/CLAUDE.md`
> dell'account Claude di Vivido (o in un `CLAUDE.md` di progetto). È l'equivalente del CLAUDE.md di Nest.
> Compila tutti i `<...>` con i valori reali di Vivido prima del primo run.

---

## 1. Chi è Vivido

Vivido è una **design consultancy** (wedge: siti web; deliverable: Blueprint / MVP / mini-audit Figma) per startup e founder. <descrivi modello di ingaggio, ICP, servizi — 3-5 righe>

Founder: **Samuele** (stesso founder di Nest, ma Vivido è un'entità separata).

> ⚠️ **Vivido ≠ Nest.** Mai mescolare i due workspace. I dati Vivido vivono nel workspace Notion Vivido, Slack Vivido, account Gmail/Calendar/Granola Vivido. Niente collection ID Nest qui.

---

## 2. Mappa dei dati Vivido (da compilare)

Single source of truth: **Notion Vivido** (workspace `6850c1bd18aa448d97fe9745f14c8ffc` — "Vivido World").

| Cosa | Collection ID | Note |
|---|---|---|
| **Progetti Vivido** | `collection://<VIVIDO_DS_PROJECTS>` | Status attivi: <...> |
| **Tasks Vivido** | `collection://<VIVIDO_DS_TASKS>` | Owner = proprietà `Person`. Status: <...> |
| **Knowledge Log** | `collection://<VIVIDO_DS_KNOWLEDGE_LOG>` | POV founder, auto-scritto da log-ingest |
| **CRM / Outbound Pipeline** | `collection://<VIVIDO_DS_CRM>` | (Outbound già esistente: `collection://8a80aae4-bcc5-83c3-8c61-87c3955f18e3`) |
| *(opzionali)* Clienti / Roadmap / Backlog / Invoices / Contracts | — | compila solo se Vivido li usa |

**Canali dati via MCP** (account Vivido):
- Gmail — `samuele@vivido.world`
- Granola — note creator `hello@vivido.world`
- Google Calendar — Vivido
- Slack — workspace Vivido

---

## 3. Team Vivido (owner mapping)

Compila la composizione reale del team Vivido. Le routine usano questa tabella per mappare "chi fa cosa".

| Membro | Ruolo | Slack ID | Notion Person UUID |
|---|---|---|---|
| Samuele | Founder | `<VIVIDO_FOUNDER_SLACK>` (= `U062MREADAB`) | `<VIVIDO_PERSON_FOUNDER>` |
| <membro 2> | <ruolo> | `<...>` | `<VIVIDO_PERSON_2>` |

Regola owner-mapping: <quando una routine suggerisce un'azione, mappa al membro Vivido giusto>.

---

## 4. Slack — delivery

- **Bot Vivido**: user `<VIVIDO_BOT_USER>`, bot_id `<VIVIDO_BOT_ID>`.
- **DM operativa** bot ↔ founder: channel `<VIVIDO_DM_CHANNEL>`. È dove arrivano tutte le routine e dove il founder risponde all'EOD.
- Founder Slack (Vivido): `<VIVIDO_FOUNDER_SLACK>` (= `U062MREADAB`).

Consegna sempre via `~/.claude/skills/vivido-assistant/send.sh` (bot token da env `VIVIDO_BOT_TOKEN` o file `vivido-bot.token`). Mai `slack_send_message` MCP per la consegna finale.

---

## 5. Stile

- Lingua: italiano. Slack: messaggi brevi, bullet, emoji status minimali (🟢🟡🔴).
- Progetti citati col nome cliente.
- **Mai menzionare Nest** negli output Vivido. Sono entità separate.

---

## 6. Routine disponibili

Skill `vivido-assistant` (in `~/.claude/skills/vivido-assistant/`). Argomenti: `morning`, `weekly`, `eod`, `log-ingest`, `log-ingest-reminder`, `linkedin`. Scheduled agents: `vivido-morning`, `vivido-weekly`, `vivido-eod`, `vivido-log-ingest`, `vivido-log-ingest-reminder`, `vivido-linkedin`.
