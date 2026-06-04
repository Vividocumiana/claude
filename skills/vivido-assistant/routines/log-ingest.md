# Routine: Knowledge Log Auto-Ingest

Legge la reply del founder al messaggio EOD più recente nella **DM bot Vivido Assistant ↔ Samuele** (`<VIVIDO_DM_CHANNEL>`), la sintetizza e scrive un'entry nel **Founder Knowledge Log** Notion. Chiude il loop: la reply alla sera diventa il POV layer del morning successivo.

**Quando gira**: 22:00 lun-ven (cron `0 22 * * 1-5`), ~3.5h dopo l'EOD delle 18:30. Lascia tempo al founder di rispondere senza tagliare reply tardive.

**Promessa**: il founder risponde all'EOD in thread (testo, audio trascritto, frasi sparse) direttamente nella chat del Vivido Assistant → l'entry nel Knowledge Log è già pronta. Niente compilazione manuale, niente passaggio su canali pubblici.

---

## Procedura

### 1. Trova il messaggio EOD di oggi nella DM bot ↔ Samuele

Channel: `<VIVIDO_DM_CHANNEL>` (DM bot Vivido Assistant `<VIVIDO_BOT_USER>` ↔ Samuele `<VIVIDO_FOUNDER_SLACK>`).

**Regola inviolabile — niente `slack_search` su DM bot↔utente**: l'MCP `slack_search_*` autenticato come account utente NON indicizza le DM con i bot (falso negativo confermato il 2026-05-20). La lettura va fatta con `conversations.history` autenticato come **bot Vivido Assistant**, oppure via lo helper `read.sh` qui sotto (curl diretto con bot token).

**Comando consigliato** (usa il bot token che già abbiamo in `bot.token`):

```bash
TOKEN="$(tr -d '\r\n' < ~/.claude/skills/vivido-assistant/bot.token)"
curl -sS -G https://slack.com/api/conversations.history \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "channel=<VIVIDO_DM_CHANNEL>" \
  --data-urlencode "limit=30"
```

1. Recupera gli ultimi 30 messaggi della DM.
2. Filtra i messaggi inviati dal bot Vivido Assistant (`bot_id = <VIVIDO_BOT_ID>`, `user = <VIVIDO_BOT_USER>`) che iniziano con `🌙 *EOD Debrief` AND la cui `ts` cade oggi (>= oggi 17:00 Europe/Rome).
3. Tieni il messaggio **più recente** che matcha → `eod_message`.
4. Se nessun match → **skip silenzioso**: logga `ℹ️ Nessun EOD oggi nella DM bot↔Samu. Nessuna entry creata.` e termina con `ℹ️ Log-ingest skippato — nessun EOD oggi.`

### 2. Leggi le reply nella thread (sempre via bot token)

```bash
curl -sS -G https://slack.com/api/conversations.replies \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "channel=<VIVIDO_DM_CHANNEL>" \
  --data-urlencode "ts=<eod_message.ts>" \
  --data-urlencode "limit=100"
```

1. Filtra le reply scritte dal **founder** (`<VIVIDO_FOUNDER_SLACK>`). In una DM bot↔Samu non ci possono essere altri sender umani, ma il filtro evita di re-ingerire eventuali ack del bot stesso.
2. Mantieni ordine cronologico. Concatena testo (separa con `\n---\n` se più di una reply).
3. Memorizza `sender_user_id` = `<VIVIDO_FOUNDER_SLACK>` — serve per popolare `Person` nello step 5.

**Nota**: in questa DM solo il founder può rispondere; le reply di altri membri team (Dami, Wagane, Elia, Gabri) avvengono nelle rispettive DM bot↔membro tramite il flusso `nest-dami-log-ingest` / analoghi, non qui.

**Edge case — zero reply del founder**:
- **Skip senza creare entry**. Logga `ℹ️ EOD trovato ma nessuna reply del founder. Nessuna entry creata.`
- Rispondi all'utente: `ℹ️ Log-ingest skippato — EOD presente ma 0 reply del founder.`
- Il morning di domani noterà `⚠️ Knowledge Log <oggi> non compilato` e userà fallback. Non è un errore, è normale (founder fuori, giornata leggera, scelta consapevole di non rispondere).

### 3. Sintetizza in entry strutturata

Le reply del founder sono in linguaggio naturale, spesso disordinate (audio trascritto, pensieri sparsi per progetto, decisioni multiple in una sola frase). Devi trasformarle in entry **strutturata per essere ritrovata dal morning** del giorno dopo (e dei giorni a venire — il morning legge le ultime 5 entry).

**Format dell'entry** (struttura stabile, sezioni sempre nello stesso ordine — il morning fa pattern matching su questa struttura):

```
<headline 1 riga: cosa è il succo della giornata secondo il founder>

## Per progetto
- *<Cliente>*: <decisione/contesto/flag in 1-2 frasi> [stato: <attivo/silenzio-ok/in-tensione/archiviato>]
- *<Cliente>*: <...>

## Decisioni prese
- <decisione 1 sintetica con cliente in chiaro: "Pixlex — pivot da dashboard a SOP">
- <decisione 2>

## Cose accettate (silenzi/pause/scope ridotti)
- <cosa accettata 1: "Bhom — silenzio cliente ok, valuta proposta interna">
- <cosa accettata 2>

## Flag strategici / da non perdere
- <flag 1>
- <flag 2>

## Note libere
<tutto quello che non rientra nei bucket sopra, in prosa fluida ma concisa>
```

**Regole di sintesi**:
- **Niente invenzioni**. Se il founder non ha parlato di X, X non finisce nell'entry.
- **Niente parafrasi pesanti**. Mantieni la voce del founder. Frasi del tipo "secondo me Pixlex sta andando male" restano "Pixlex sta andando male". Non "L'agency sta affrontando sfide con Pixlex".
- **Nomi cliente sempre in chiaro** all'inizio di ogni bullet "Per progetto" / "Decisioni" / "Cose accettate" — il morning matcha per nome cliente.
- **Tag stato per progetto** in coda al bullet "Per progetto" — `[stato: attivo]` / `[stato: silenzio-ok]` (silenzio cliente già accettato, NON allarmare il giorno dopo) / `[stato: in-tensione]` (qualcosa che non torna) / `[stato: archiviato]` (founder considera chiuso, non risuggerire). Questo tag è il segnale primario che il morning usa per la mappa POV.
- **"Cose accettate"** è la sezione che impedisce al morning di riproporre allarmi su silenzi/pause già OK — popolala sempre quando il founder accetta esplicitamente uno stato.
- **Risposte alle "Domande per te" dell'EOD**: per ogni domanda dell'EOD a cui il founder ha risposto, struttura come `**Q**: <domanda dell'EOD> — **A**: <risposta del founder>`. Mettile nella sezione che fa più senso (per progetto se la domanda era specifica, in "Note libere" se generica).
- **Niente "approvazioni task"**: la sezione vecchia "Task approvate dall'EOD" non esiste più (l'EOD non propone più task). Se il founder ha menzionato task specifiche da chiudere/spostare, finiscono in "Decisioni prese".

**Headline (1 riga in cima)**: 60-80 caratteri max, cattura il succo. Esempi:
- `Pixlex pivot su SOP confermato, Maoten prototipo chiuso, Bhom proposta in stallo`
- `Giornata di operations, 3 task chiuse, 2 decisioni rimandate a domani`
- `Cliente nuovo da Linkedin (Vivido), Carlo silenzio ok, fatture tutte pulite`

**Tono**: prima persona implicita ("Decido di...", non "Il founder decide..."). È il founder che parla a sé stesso domani mattina.

### 4. Determina il titolo dell'entry

Format: `YYYY-MM-DD — <keyword progetti/temi principali>`

- Data = oggi (ISO).
- Keyword = 2-4 nomi cliente / temi più ricorrenti nel testo delle reply. Es. `2026-05-14 — Pixlex, Maoten, Bhom`, oppure `2026-05-14 — CRM, ops, fatture`.

### 5. Scrivi l'entry su Notion

DB: `collection://<VIVIDO_DS_KNOWLEDGE_LOG>`.

Properties da scrivere:
- `Entry` (title) = il titolo dello step 4
- `Content` (text) = il body strutturato dello step 3
- `Person` (person) = JSON array con lo user Notion dell'autore della reply EOD. **Sempre valorizzata, mai vuota.**

`Created time` è auto-set da Notion.

**Mapping autore → Notion user ID** (sender della reply EOD → user da scrivere in `Person`):
- Samuele (Slack `<VIVIDO_FOUNDER_SLACK>`, email `<VIVIDO_FOUNDER_EMAIL>`) → `<VIVIDO_PERSON_FOUNDER>`
- Damiano (Slack `U0AD5E1UTK8`, email `<VIVIDO_TEAMMATE_EMAIL>`) → `<VIVIDO_PERSON_2>`
- Future estensioni: leggere da `collection://<VIVIDO_DS_TEAM>` (Team Members DB) per matchare slack_id/email del sender.

**Perché**: il founder vuole distinguere in Notion le entry sue da quelle di Dami (e in futuro di altri). Senza tag `Person` le routine downstream (morning, EOD, brief PM-mode) non possono filtrare il POV per persona. Le entry storiche senza `Person` non vanno toccate — la regola vale solo da oggi in avanti.

Usa `notion-create-pages` con il data source URL della Knowledge Log. Body in markdown semplice (il DB Content è text/rich text, accetta formattazione base).

**Edge case — entry per oggi già esiste**: rarissimo (il founder ha già compilato a mano), ma possibile. In quel caso:
- **Non sovrascrivere**. Crea una **seconda entry** con titolo suffissato `... (auto-ingest)`.
- Logga: `⚠️ Entry manuale già presente per oggi, creato secondo entry auto-ingest distinta.`

### 6. Notifica founder (DM, non canale)

Invia un DM al founder via `send.sh <VIVIDO_FOUNDER_SLACK>`:

```
🧠 Knowledge Log <YYYY-MM-DD> ✓
<headline dell'entry, 1 riga>

<N> reply integrate · <link Notion all'entry>
```

Tono: silenzioso, conferma rapida. Non vogliamo svegliare nessuno alle 22.

---

## Consegna

1. Le reply del founder vengono lette dal thread EOD (no draft, no conferma intermedia — è l'intero punto del loop).
2. L'entry viene scritta direttamente su Notion senza conferma (il founder ha autorizzato write-through esplicito su questo DB — il valore è nel loop chiuso, non nella conferma manuale).
3. DM finale al founder = audit log + chiusura ciclo.

**Rispondi all'utente**:
- Success: `✅ Knowledge Log <data> creato (<N> reply integrate, <C> char). Link: <url>`
- Skip per zero reply: `ℹ️ Log-ingest skippato — EOD presente ma 0 reply del founder.`
- Skip per zero EOD: `ℹ️ Log-ingest skippato — nessun EOD oggi.`
- Errore: `❌ Log-ingest failed: <errore>. Founder dovrà compilare a mano se vuole il POV nel morning.`

---

## Edge cases

- **EOD non inviato oggi** (founder fuori, weekend, holiday) → skip silenzioso (vedi step 1).
- **Zero reply del founder** → skip silenzioso (vedi step 2). Pattern frequente: giornate in cui il founder legge l'EOD ma non ha nulla da aggiungere.
- **Reply solo emoji o ack** (`👍`, `ok`, `visto`): se la concatenazione di tutte le reply è <50 caratteri di contenuto utile (escludendo emoji standalone e "ok"/"visto"), **skip e logga** `ℹ️ Reply troppo brevi (<50 char utili) — nessun POV da loggare.` Non vale la pena creare entry vuote.
- **Notion giù** → salva il body sintetizzato in `/tmp/vivido-assistant-log-ingest-pending-<YYYYMMDD>.md` e DM founder: `⚠️ Notion giù, body in /tmp/vivido-assistant-log-ingest-pending-<data>.md — recupera a mano o ri-trigger domani.`
- **Slack giù** → impossibile leggere thread, log errore e termina.
- **Reply con audio Slack (non trascritto)**: Slack di solito allega `.mp3`. La nostra MCP non trascrive audio. In quel caso: nel body dell'entry includi `<nota: 1 reply audio non trascritta — recupera manualmente da Slack thread <link>>`.

---

## Filosofia

Il **Knowledge Log** è il cuore del Company Brain. Il morning del giorno dopo legge le ultime 5 entry, non solo l'ultima — quindi la qualità *strutturale* di ogni entry conta molto: il morning fa pattern matching su "Per progetto", "Decisioni prese", "Cose accettate" per costruire la mappa POV.

Senza POV del founder scritto da qualche parte, ogni report del giorno dopo lavora cieco (caso "verifica prototipo Maoten navigabile" — sapere o non sapere fa la differenza tra raccomandazioni utili e meccaniche). Prima il passaggio era manuale: il founder spesso saltava (stanchezza, dimenticanza) → morning cieco. Con l'auto-ingest il founder ha solo un compito: **rispondere all'EOD in thread Slack**. Anche in modo disordinato, audio trascritto, frasi sparse. La routine `log-ingest` alle 22:00 trasforma il chaos in entry strutturata.

**Perché la struttura è importante** (refactor 2026-05-15):
- "Per progetto" con `[stato: ...]` → il morning sa subito quali progetti sono "attivi vs silenzio-ok vs in-tensione vs archiviati" senza dover interpretare prosa.
- "Cose accettate" → è la sezione che impedisce gli allarmi-fantasma (silenzi accettati che il morning altrimenti riproporrebbe come urgenze).
- "Decisioni prese" → il morning le usa per detection delle "Crepe POV" (oggi vedo X, ma 2 giorni fa hai deciso Y → crepa).
- Headline → il morning la cita nell'header del POV layer come riassunto di 1 riga.

**Cosa NON facciamo** (intenzionalmente):
- Non interrompiamo il founder per chiedere conferma sulla sintesi. Il loop sta in piedi solo se è automatico.
- Non scriviamo entry vuote o di basso valore (skip silenzioso se reply assenti/troppo brevi).
- Non duplichiamo se il founder ha già compilato a mano (creiamo entry separata "(auto-ingest)" per audit, ma non sovrascriviamo).
- Non leggiamo altre fonti per "arricchire" l'entry (Granola, email). L'entry è il POV del founder, niente altro. Se vogliamo correlazioni cross-source, le facciamo nel morning, non qui.
