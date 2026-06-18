# Routine: Team EOD Ingest — reply del team → Knowledge Log (per persona)

Legge le reply al messaggio **Team EOD** di oggi in `#vivido-general`, le sintetizza e crea **una entry per persona** nel Knowledge Log Notion. È il gemello team della routine `log-ingest` (che è founder-only, in DM).

**Quando gira**: 21:30 lun-ven (cron `30 21 * * 1-5`), ~3.5h dopo il prompt delle 18:00. Lascia tempo al team di rispondere senza tagliare reply tardive. Gira **prima** del `log-ingest` founder (22:00) — sono due flussi indipendenti su DB diverso/stesse-entry distinte.

**Promessa**: il team risponde in thread (testo, audio, frasi sparse) → ogni reply diventa una entry strutturata nel Knowledge Log, attribuita alla persona. Niente compilazione manuale.

---

## ⚠️ Vincolo `Person` (LEGGERE PRIMA)

La property `Person` del Knowledge Log è di tipo **Notion-person**: può puntare SOLO a utenti reali del workspace Notion. Ad oggi **l'unico account `person` è Samuele** (`hello@vivido.world` → `09ff0769-85fd-4a7e-a637-b8164b9c3c5b`). Federico, Nicolas, Gabriele, Raja **non hanno account Notion** → non possono essere messi in `Person`.

**Strategia di attribuzione** (finché il team non è invitato su Notion come guest):
- **Attribuzione primaria via titolo + body**: ogni entry ha titolo `YYYY-MM-DD — EOD <Nome>` e prima riga del Content `👤 Autore: <Nome>`. Questo rende le entry filtrabili/ritrovabili per persona anche senza la property.
- **`Person` valorizzata solo quando il sender risolve a un account Notion** (oggi: solo Samuele). Per gli altri → `Person` vuota, attribuzione affidata a titolo+body.
- Quando in futuro i membri verranno invitati su Notion (vedi `PORTING.md`), basterà popolare `slack.user_to_notion_person` in `config.json` e l'ingest inizierà a taggare anche loro in `Person`. Nessuna modifica alla routine.

---

## Procedura

### 1. Trova il messaggio Team EOD di oggi in #vivido-general

Channel: `C062VMYUG9L` (`config.json` → `slack.team_channel`).

Lettura via **bot token** (curl diretto, come `log-ingest`):

```bash
TOKEN="$(printf '%s' "${VIVIDO_BOT_TOKEN:-$(tr -d '\r\n' < ~/.claude/skills/vivido-assistant/vivido-bot.token)}" | tr -d '\r\n')"
curl -sS -G https://slack.com/api/conversations.history \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "channel=C062VMYUG9L" \
  --data-urlencode "limit=50"
```

1. Recupera gli ultimi 50 messaggi del canale.
2. Filtra i messaggi inviati dal **bot Vivido** che iniziano con `🌙 *EOD Team` AND con `ts` di oggi (>= oggi 17:00 Europe/Rome).
3. Tieni il più recente che matcha → `team_eod_message`.
4. Se nessun match → **skip silenzioso**: `ℹ️ Nessun Team EOD oggi in #vivido-general. Nessuna entry creata.` e termina.

### 2. Leggi le reply nel thread

```bash
curl -sS -G https://slack.com/api/conversations.replies \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "channel=C062VMYUG9L" \
  --data-urlencode "ts=<team_eod_message.ts>" \
  --data-urlencode "limit=200"
```

1. Scarta il messaggio root (il prompt del bot) e qualsiasi reply del bot stesso.
2. **Raggruppa le reply per `user` (Slack ID)**: un membro può scrivere più messaggi nel thread → concatenali in ordine cronologico (separatore `\n`).
3. Per ogni gruppo memorizza `sender_slack_id` + testo concatenato.

**Edge case — zero reply umane** → skip silenzioso: `ℹ️ Team EOD presente ma 0 reply del team. Nessuna entry creata.`

### 3. Risolvi mittente → Nome + Notion Person

Per ogni `sender_slack_id`:

- **Nome**: inverti `config.json` → `slack.team` (`Nome → ID`) per ottenere `ID → Nome`. Aggiungi il founder: `U062MREADAB`/`U062VMYTXDL` → `Samuele`. Se l'ID non è in mappa, risolvi via `slack_read_user_profile` (real_name) e logga `ℹ️ sender <id> non in config, risolto via profilo Slack`.
- **Notion Person**: cerca `sender_slack_id` in `config.json` → `slack.user_to_notion_person`. Se presente → quel Notion user ID va in `Person`. Se assente → `Person` resta vuota (vedi vincolo sopra).

### 4. Sintetizza ogni reply in entry strutturata

Le reply sono in linguaggio naturale, brevi, a volte solo umore. Struttura ognuna così (Content):

```
👤 Autore: <Nome>

## Cosa ho fatto oggi
- <punto 1>
- <punto 2>

## Sentori
<umore/energia/blocchi in 1-3 righe, voce della persona>

## Note libere
<tutto ciò che non rientra sopra, se c'è>
```

**Regole di sintesi**:
- **Niente invenzioni**. Solo ciò che la persona ha scritto.
- **Mantieni la voce della persona**. "sono cotto ma contento" resta così, non "il membro riporta affaticamento".
- **Sezioni vuote → ometti** (se uno scrive solo i sentori e non cosa ha fatto, tieni solo `## Sentori`).
- **Reply solo emoji / ack** (`👍`, `ok`): se <30 caratteri di contenuto utile → **skip quella persona** (niente entry), logga `ℹ️ <Nome>: reply troppo breve, nessuna entry`.
- **Audio non trascritto**: includi nel body `<nota: reply audio non trascritta — recupera da Slack thread>`.

### 5. Titolo entry

Format: `YYYY-MM-DD — EOD <Nome>`. Esempi: `2026-06-18 — EOD Federico`, `2026-06-18 — EOD Nicolas`.

### 6. Scrivi le entry su Notion

DB: `collection://cd50aae4-bcc5-8396-b4c7-0718667ffdb5` (Knowledge Log), via `notion-create-pages`. **Una pagina per persona** che ha risposto in modo sostanziale.

Properties:
- `Entry` (title) = titolo dello step 5.
- `Content` (text) = body dello step 4.
- `Person` (person) = JSON array con il Notion user del mittente **solo se risolto** (step 3); altrimenti ometti la property.

`Created time` è auto-set.

**Edge case — entry di oggi per quella persona già esiste** (ri-trigger): non sovrascrivere, crea una seconda entry suffissata `... (re-ingest)` e logga.

### 7. Notifica founder (DM, silenziosa)

Una sola DM riepilogo al founder via `send.sh D0634QNLF52`:

```
🧠 Team EOD ingerito — <YYYY-MM-DD>
<N> reply integrate nel Knowledge Log: <Nome1>, <Nome2>, …
<M> non risposto: <NomeX>, <NomeY>
```

La riga "non risposto" elenca i membri di `slack.team` (+founder) senza reply sostanziale — utile al founder per leggere il polso (chi è silente più giorni di fila è un segnale). Tono silenzioso, è un audit log delle 21:30.

---

## Consegna

1. Reply lette dal thread via bot token (no draft, no conferma).
2. Entry scritte direttamente su Notion (write-through autorizzato su KL).
3. DM riepilogo al founder = audit + segnale "chi è silente".

**Rispondi all'utente**:
- Success: `✅ Team EOD ingerito — <N> entry create (<Nomi>), <M> silenti. Person taggata: <K>/<N>.`
- Skip zero EOD: `ℹ️ Team EOD ingest skippato — nessun Team EOD oggi.`
- Skip zero reply: `ℹ️ Team EOD ingest skippato — prompt presente, 0 reply del team.`
- Errore: `❌ Team EOD ingest failed: <errore>.`

---

## Edge cases

- **Prompt Team EOD non inviato oggi** → skip silenzioso (step 1).
- **Zero reply** → skip silenzioso (step 2).
- **Reply solo emoji/ack per tutti** → nessuna entry, log `ℹ️ Tutte le reply troppo brevi, nessuna entry.`
- **Notion giù** → salva i body in `/tmp/vivido-assistant-team-eod-ingest-pending-<YYYYMMDD>.md` e DM founder con avviso.
- **Slack giù** → impossibile leggere thread, log errore e termina.
- **Sender non mappato** → nome via profilo Slack, `Person` vuota, entry comunque creata (attribuzione via titolo/body).

---

## Filosofia

Stesso principio del `log-ingest` founder: **trasformare il chaos delle reply in entry strutturate**, ma per il team e con attribuzione per persona. La differenza chiave è la doppia natura del segnale:

- **Cosa ho fatto** → continuità operativa, visibilità avanzamenti.
- **Sentori** → segnale umano. Loggato nel tempo, permette al founder e al morning di accorgersi di trend (energia che cala, blocchi ricorrenti, qualcuno silente da giorni) **prima** che diventino problemi. Non è sorveglianza: è cura del team resa leggibile.

Il valore sta nella serie, non nella singola entry. E nella sezione "non risposto" della DM founder: il **silenzio** è un dato quanto la reply.
