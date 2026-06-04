# Data layer deterministico — contratto comune a tutte le routine

**Perché esiste.** Il connector MCP Notion fa SOLO ricerca semantica: max 25 risultati, ranking
per rilevanza, **senza properties**. Non sa enumerare un DB in modo completo. È la causa storica
di "non prende le task di tutti" (vedeva ~25 task su 400+) e "scambia i progetti" (matching fuzzy).
Dal 2026-06-03 l'enumerazione NON passa più dall'MCP ma da uno snapshot via API ufficiale Notion.

## Regola d'oro

**Per enumerare progetti, task, CRM, fatture, contratti → USA SEMPRE lo snapshot.**
L'MCP `notion-search`/`notion-fetch` resta valido SOLO per contenuti non strutturati:
Slack, Gmail, Granola, commenti pagina, Knowledge Log, lettura puntuale di una pagina specifica.

Mai più: enumerare task/progetti via `notion-search` con query per nome cliente. Mai più: matchare
task↔progetto per sottostringa del titolo. Lo snapshot ha già la relazione risolta.

## Come caricarlo (primo step operativo di OGNI routine, prima di tutto)

```bash
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today <YYYY-MM-DD>
```

- Gira in pochi secondi, pagina TUTTO via `POST /v1/data_sources/{id}/query` (Notion-Version 2025-09-03).
- Token in `~/.claude/skills/vivido-assistant/notion.token` (integrazione "Claude Outbound").
- Scrive due file in `~/.claude/skills/vivido-assistant/cache/`:
  - **`snapshot.json`** — dati completi strutturati (usa questo per logica fine).
  - **`snapshot.md`** — digest leggibile, già raggruppato per progetto e per persona (lettura rapida).
- Poi `Read` di `cache/snapshot.json` (o `.md`). Se lo stdout mostra `⚠️ Errori`, segnala ma procedi.

Se lo script fallisce del tutto (token assente, API giù) → fallback al vecchio metodo MCP con
disclaimer esplicito in cima al report `⚠️ snapshot non disponibile — enumerazione parziale via MCP`.

## Cosa contiene lo snapshot.json

- `projects[]`: `name, status, contactEmail, mrr, contractType, inizio, durataPrevista, finePrevista`.
  Attivi/partner = `status ∈ {"Attivo","Partner"}`. `contactEmail` è la fonte di verità per il matching
  meeting/email/Slack (già con fallback dal DB Clienti applicato).
- `tasks[]` (solo aperte, `Status ∉ {Done,Archived}`): `name, status, priority, owners[], projectName,
  projectId, due, deltaDays, bucket`.
  - **`owners`** = UNIONE di `Person` + `Assigned`. Nota dati reali (2026-06-03): `Assigned` è MORTO
    (0 task lo usano), tutti usano `Person`. **Owner = `Person`.**
  - **`bucket`**: `ghost` (>14g ritardo), `overdue` (<oggi), `today`, `soon` (≤3g), `future`, `no_due`.
- `crm[]`: `name, status, nextAction, nextActionDate, mrr, tipologia, email` (esclusi Won/Lost/Accepted).
- `invoices[]`, `contracts[]`: per i flag finanziari.
- `roadmap[]`, `backlog[]`: ⚠️ i DB globali sono quasi vuoti — gli step/richieste veri vivono nei DB
  per-progetto (non ancora nello snapshot). Non fidarti del conteggio roadmap globale.
- `errors[]`: DB non raggiungibili (es. Team Members non condiviso — irrilevante perché Assigned è morto).

## Owner mapping — campo Person (NON Assigned)

"Chi fa cosa" si costruisce da `tasks[].owners` (che deriva da `Person`). L'API restituisce i nomi
completi: "Samuele Poggio", "Damiano Poggio", "Elia Golfetto", "Massimiliano Napoli", "Gabriele Bollino".
Mai più filtrare su `Assigned` (sempre vuoto → zero task → bug storico del founder morning).
