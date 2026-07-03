# CONFIG — placeholder → valori Vivido

Tutti i `<VIVIDO_*>` del kit. Compila la colonna "Valore" e poi fai find/replace su tutto il kit
(o, per i DB, compila solo `config.json`). Alcuni valori sono **già noti** dal setup Vivido esistente.

## Come applicare i find/replace

Dalla root del kit, per ogni riga compilata:
```bash
grep -rl '<VIVIDO_DM_CHANNEL>' . | xargs sed -i '' 's/<VIVIDO_DM_CHANNEL>/D0XXXXXXX/g'   # macOS
```
(I DB Notion puoi lasciarli come placeholder nelle routine e metterli SOLO in `config.json`: lì lo
snapshot li risolve. Nei `.md` servono solo come riferimento leggibile.)

---

## Slack

| Placeholder | Valore | Dove prenderlo |
|---|---|---|
| `<VIVIDO_FOUNDER_SLACK>` | **`U062MREADAB`** ✅ (noto, verificato via `slack_read_user_profile` = Samuele Poggio, `samuele@vivido.world`) | User ID di Samuele nel workspace Vivido |
| `<VIVIDO_DM_CHANNEL>` | **`D0AU40G2DDM`** ✅ (noto, verificato via `conversations.list?types=im` col bot token) | DM bot Vivido ↔ Samuele. In pratica basta passare `<VIVIDO_FOUNDER_SLACK>` a `send.sh`, chat.postMessage la risolve da solo |
| `<VIVIDO_BOT_USER>` | **`U0AVDMSQXDW`** ✅ (noto, verificato via `auth.test`) | User ID del bot `vivido_assistant` |
| `<VIVIDO_BOT_ID>` | **`B0AUG1NA7N1`** ✅ (noto, verificato via `auth.test`) | bot_id del bot (compare in `conversations.history` come `bot_id`) — serve al log-ingest per filtrare i messaggi EOD del bot |
| `VIVIDO_BOT_TOKEN` (secret) | `xoxb-...` | Bot User OAuth Token della Slack app Vivido. ⚠️ **Non ancora impostato come `VIVIDO_BOT_TOKEN`** in questo ambiente, ma il bot esiste già e il suo token è raggiungibile qui come env `SLACK_BOT_TOKEN` (fallback già supportato da `send.sh`) |

> ⚠️ `U062VMYTXDL` (che appare in alcuni file più vecchi come "Samuele") è in realtà l'account condiviso
> `hello@vivido.world` ("Vivido Administration"), non Samuele. Non usarlo come identità del founder.

## Email

| Placeholder | Valore | |
|---|---|---|
| `<VIVIDO_FOUNDER_EMAIL>` | **`samuele@vivido.world`** ✅ | |
| `<VIVIDO_TEAMMATE_EMAIL>` | `<...>` | email del 2° membro team Vivido (se esiste) |

## Notion — DB (mettili in `config.json`)

| Placeholder | config.json key | Note |
|---|---|---|
| `<VIVIDO_DS_PROJECTS>` | `projects` | DB progetti Vivido |
| `<VIVIDO_DS_TASKS>` | `tasks` | DB task; owner = `Person` |
| `<VIVIDO_DS_KNOWLEDGE_LOG>` | `knowledge_log` | DB Knowledge Log (POV founder) — **crealo se non esiste**, serve al loop |
| `<VIVIDO_DS_CRM>` | `crm` | Outbound già esistente: `8a80aae4-bcc5-83c3-8c61-87c3955f18e3` |
| `<VIVIDO_DS_ROADMAP>` | `roadmap` | opzionale (lascia vuoto se Vivido non usa il modello Roadmap/Step) |
| `<VIVIDO_DS_BACKLOG>` | `backlog` | opzionale |
| `<VIVIDO_DS_INVOICES>` | `invoices` | opzionale (lo snapshot salta se vuoto) |
| `<VIVIDO_DS_CONTRACTS>` | `contracts` | opzionale |
| `<VIVIDO_DS_TEAM>` | (non in snapshot) | solo riferimento testuale; `Assigned`/Team è deprecato |

> Per ottenere il `collection://` di un DB: aprilo in Notion → `...` → Copy link, oppure via MCP `notion-search` sul workspace Vivido. Lo snapshot vuole l'ID **senza** prefisso `collection://` (es. `1a2b...`).

## Notion — utenti (Person)

| Placeholder | Valore | Dove |
|---|---|---|
| `<VIVIDO_PERSON_FOUNDER>` | UUID di Samuele in Notion Vivido | `notion-get-users` o una pagina con Samuele in `Person` |
| `<VIVIDO_PERSON_2..5>` | UUID altri membri | idem (rimuovi i 3/4/5 se Vivido ha meno persone) |

## Secret (mai nel repo)

| Variabile | Valore |
|---|---|
| `VIVIDO_BOT_TOKEN` | `xoxb-...` |
| `NOTION_TOKEN` | `ntn_...` (integrazione interna Notion Vivido, con i DB condivisi) |
