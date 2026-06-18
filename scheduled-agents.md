# Scheduled agents cloud — i 6 cron Vivido

Da creare **sull'account Claude di Vivido**, con lo skill `/schedule` di Claude Code (o l'equivalente
"routines"/scheduled agents nel cloud). Girano sull'infra Anthropic → nessun computer acceso.

**Timezone**: imposta quella del founder (es. `Europe/London`). I cron sotto sono in quella tz.

**Prompt**: ogni agent ha un prompt di una riga che invoca la skill. Assicurati che la skill
`vivido-assistant` sia installata/raggiungibile dall'agent (vedi `SETUP.md §4`) e che i secret
`VIVIDO_BOT_TOKEN` / `NOTION_TOKEN` siano impostati (`SETUP.md §5`).

| Agent | Cron | Quando | Prompt |
|---|---|---|---|
| `vivido-daily` | `0 8 * * *` | 08:00 ogni giorno | `Invoca la skill vivido-assistant con argomento "daily".` |
| `vivido-morning` *(legacy)* | `0 8 * * 1-5` | 08:00 lun-ven | `Invoca la skill vivido-assistant con argomento "morning".` (sostituito da `vivido-daily`) |
| `vivido-weekly` | `18 8 * * 1` | 08:18 lun | `Invoca la skill vivido-assistant con argomento "weekly".` |
| `vivido-team-eod` | `0 18 * * 1-5` | 18:00 lun-ven | `Invoca la skill vivido-assistant con argomento "team-eod".` |
| `vivido-eod` | `30 18 * * 1-5` | 18:30 lun-ven | `Invoca la skill vivido-assistant con argomento "eod".` |
| `vivido-log-ingest-reminder` | `0 19 * * 1-5` | 19:00 lun-ven | `Invoca la skill vivido-assistant con argomento "log-ingest-reminder".` |
| `vivido-team-eod-ingest` | `30 21 * * 1-5` | 21:30 lun-ven | `Invoca la skill vivido-assistant con argomento "team-eod-ingest".` |
| `vivido-log-ingest` | `0 22 * * 1-5` | 22:00 lun-ven | `Invoca la skill vivido-assistant con argomento "log-ingest".` |
| `vivido-linkedin` | `0 13 * * *` | 13:00 ogni giorno | `Invoca la skill vivido-assistant con argomento "linkedin".` |

## Note

- **Ordine del loop serale**: team-eod (18:00) → eod founder (18:30) → reminder (19:00) →
  team-eod-ingest (21:30) → log-ingest founder (22:00). Il team ha ~3.5h per rispondere in
  #vivido-general prima dell'ingest. I due ingest sono indipendenti (canale/DM diversi, entry distinte nel KL).
- **Team EOD**: prompt rituale a tutto il team in `#vivido-general` (cosa fatto + sentori). Le reply
  diventano 1 entry/persona nel Knowledge Log. ⚠️ Il bot Vivido deve essere membro di `#vivido-general`
  (invita `@Vivido` nel canale una-tantum) e la property `Person` del KL si popola solo per chi ha un
  account Notion reale (oggi solo Samuele) — vedi `routines/team-eod-ingest.md`.
- **linkedin** è indipendente dal loop POV: scegli l'orario che preferisci. Se vuoi allinearlo
  all'attuale routine Vivido locale, usa lo stesso orario di quella.
- **Dopo la creazione**: lancia un **run manuale di test** di ogni agent e controlla l'output
  (specie i connettori — vedi caveat headless in `SETUP.md §6`). Solo se tutti girano puliti, lasciali attivi.
- Se l'ambiente cloud passa `currentDate`, le routine la useranno per "oggi"; altrimenti usano la data
  del momento di esecuzione (già gestito).

## Equivalenza con i task locali Nest (per riferimento)

| Vivido (cloud) | Nest (locale, oggi) |
|---|---|
| `vivido-morning` | `nest-morning-briefing` |
| `vivido-weekly` | `nest-weekly-report` |
| `vivido-eod` | `nest-eod-check` |
| `vivido-log-ingest` | `nest-log-ingest` |
| `vivido-log-ingest-reminder` | (Nest non ce l'ha esplicito — nuovo per Vivido) |
| `vivido-linkedin` | `nest-linkedin-ideas-sync` |
