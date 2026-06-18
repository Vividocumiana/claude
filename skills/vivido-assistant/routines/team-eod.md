# Routine: Team EOD — prompt di fine giornata (canale condiviso)

Prompt serale a **tutto il team** nel canale condiviso `#vivido-general`. A fine giornata il bot Vivido posta un messaggio dove ogni membro risponde **in thread** con due cose: (1) cosa ha fatto oggi, (2) i suoi *sentori* (umore/energia/blocchi). Le reply vengono poi sintetizzate nel Knowledge Log dalla routine `team-eod-ingest` (sera, per persona).

**Quando gira**: 18:00 lun-ven (cron `0 18 * * 1-5`). È la versione *team* del loop EOD: l'EOD founder-only (`eod`, 18:30) resta separato in DM con Samuele.

**Promessa**: il team ha un rituale leggero di chiusura giornata. 2-3 righe a testa (anche audio) → polso del team tracciato nel tempo nel Company Brain, senza riunioni.

**Cosa NON fa**: non raccoglie dati Notion, non ragiona da PM, non fa domande mirate per progetto. È un prompt rituale, breve, sociale. Il "ragionamento" sta a valle (ingest + morning).

---

## Procedura

### 1. Niente data layer

Questa routine non legge lo snapshot né Notion. Compone solo il messaggio e lo invia. Velocissima.

### 2. Costruisci la mention list (dal config)

Per assicurare la notifica a ciascun membro, il prompt menziona il team esplicitamente (`<@SLACK_ID>` ognuno).

- Leggi `config.json` → `slack.team` (mappa `Nome → Slack ID`) + `slack.founder_dm`.
- Costruisci la stringa mention concatenando `<@ID>` per ogni membro del team **+ il founder** (Samuele). Esempio risultante: `<@U062MREADAB> <@U063RBJDVTJ> <@U09DUL0B9GF> <@U0ACYSH5USX> <@U08STGQP5LN>`.
- Se preferisci non pingare individualmente, fallback `<!here>` (ma è più rumoroso: usa le mention nominali come default).

**Non hardcodare gli ID nel testo**: prendili sempre dal config così la lista resta in sync quando il team cambia.

### 3. Componi il messaggio

Scrivi in `/tmp/vivido-assistant-team-eod.md`. Marker obbligatorio in apertura (`🌙 *EOD Team`) — è ciò che `team-eod-ingest` cerca per ritrovare il thread di oggi.

```
🌙 *EOD Team — <giorno, gg mese>*

Ciao team 👋 fine giornata. <mention list>
Rispondete *in questo thread* con due cose:

1️⃣ *Cosa hai fatto oggi* — i punti chiave (task chiuse, avanzamenti, blocchi). Anche in breve.
2️⃣ *I tuoi sentori* — come ti senti: energia, umore, cosa ti gira in testa. Anche 1 riga, anche un'emoji.

Bastano 2-3 righe a testa. Anche audio va benissimo 🎙️
_Quello che scrivete confluisce nel Knowledge Log → ci aiuta a leggere il polso del team nel tempo._
```

**Regole tono**: caldo, leggero, non imperativo. Niente burocrazia. Il rituale funziona solo se è facile e umano. Italiano.

### 4. Data "oggi"

`<giorno, gg mese>` = `currentDate` se passata dall'ambiente, altrimenti la data del momento di esecuzione. Formato es. `mercoledì 18 giugno`.

---

## Consegna

1. Scrivi il testo in `/tmp/vivido-assistant-team-eod.md`.
2. Invia al canale condiviso `#vivido-general`:
   ```bash
   bash ~/.claude/skills/vivido-assistant/send.sh C062VMYUG9L /tmp/vivido-assistant-team-eod.md
   ```
   Il channel ID è in `config.json` → `slack.team_channel`.
3. Fallback retry 8s sullo stesso `send.sh` in caso di errore di rete.
4. Rispondi all'utente: `✅ Team EOD inviato in #vivido-general (<N> membri menzionati).`

Il bot stampa il `ts` del messaggio su stdout: non serve persisterlo — `team-eod-ingest` ritrova il messaggio cercando il marker `🌙 *EOD Team` di oggi nel canale.

---

## Edge cases

- **Bot non nel canale** (`not_in_channel`): il bot Vivido deve essere membro di `#vivido-general`. Setup una-tantum: invita `@Vivido` nel canale, oppure (se il bot ha lo scope `channels:join`) tenta:
  ```bash
  TOKEN="$(printf '%s' "$VIVIDO_BOT_TOKEN" | tr -d '\r\n')"
  curl -sS -X POST https://slack.com/api/conversations.join \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json; charset=utf-8" \
    --data '{"channel":"C062VMYUG9L"}'
  ```
  poi ritenta `send.sh`. Se ancora fallisce → rispondi `❌ Team EOD: bot non in #vivido-general, invita @Vivido nel canale.`
- **Slack giù** → log errore, termina (il testo resta in `/tmp`).
- **Weekend/holiday** → l'agent gira solo lun-ven (cron). Niente gestione interna.
- **Config senza `team_channel`** → fallback hardcoded `C062VMYUG9L` con disclaimer in log `⚠️ team_channel mancante in config, uso default`.

---

## Filosofia

L'EOD founder (`eod`) è un debrief PM denso e privato. Il **Team EOD** è l'opposto: leggero, pubblico, rituale. Serve a due cose:

1. **Chiusura condivisa**: il team vede gli avanzamenti degli altri e si sente parte di un ritmo comune.
2. **Polso nel tempo**: i *sentori* (umore/energia) raccolti ogni giorno e loggati per persona nel Knowledge Log diventano un segnale che il founder/morning può leggere — non per sorvegliare, ma per accorgersi presto se qualcuno è in difficoltà o se l'energia del team cala.

Il valore non è nel singolo messaggio, è nella **serie**. Per questo il prompt deve restare facile (2-3 righe, audio ok): un rituale che pesa viene abbandonato. Il ragionamento e la sintesi stanno a valle (`team-eod-ingest`), non sulle spalle di chi risponde.
