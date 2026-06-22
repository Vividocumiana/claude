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
| `vivido-eod` | `30 18 * * 1-5` | 18:30 lun-ven | `Invoca la skill vivido-assistant con argomento "eod".` |
| `vivido-log-ingest-reminder` | `0 19 * * 1-5` | 19:00 lun-ven | `Invoca la skill vivido-assistant con argomento "log-ingest-reminder".` |
| `vivido-log-ingest` | `0 22 * * 1-5` | 22:00 lun-ven | `Invoca la skill vivido-assistant con argomento "log-ingest".` |
| `vivido-linkedin` | `45 18 * * *` | 18:45 ogni giorno (fine giornata) | `Invoca la skill vivido-assistant con argomento "linkedin".` |

## Note

- **Ordine del loop serale**: eod (18:30) → reminder (19:00) → log-ingest (22:00). Il reminder dà al
  founder ~3h per rispondere in thread prima che il log-ingest legga le reply.
- **linkedin** gira a **fine giornata (18:45)**, subito dopo l'EOD digest (18:30): così cattura
  tutti i meeting del giorno. Genera **2 idee post** dal materiale 24h (meeting Granola + Notion +
  Gmail) e le salva come bozze nel DB Notion "Piano Editoriale" (Piattaforma = LinkedIn), poi manda
  un ping Slack al founder con i link. L'orario è modificabile (è indipendente dal loop POV).
  - **Caveat consegna**: il ping Slack richiede il bot Vivido (`VIVIDO_BOT_TOKEN`). Finché non è
    impostato, le 2 bozze vengono comunque create su Notion ma il ping fallisce (vedi `SETUP.md §5`).
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
