# Routine: LinkedIn Content Mining — daily draft

> **Questa routine è specifica per Vivido.** Tutti i dati vengono da workspace Vivido: Notion "Vivido World" e Granola account `hello@vivido.world`. NON usare i collection ID Nest del CLAUDE.md — appartengono a un workspace separato.

Genera **una sola bozza** di post LinkedIn al giorno partendo da attività reali del founder nelle ultime 24h (Notion Vivido + Granola Vivido). Segue il framework completo in `~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md`.

Output: DM Slack al founder **nel workspace Vivido World** (user ID `U062VMYTXDL`) tramite bot `vivido_assistant` (token `vivido-bot.token`). Se nelle ultime 24h non c'è abbastanza materiale per un post onesto → **silent-skip con un messaggio breve** ("niente materiale oggi, skip") invece di inventare.

**Nota importante**: questa routine è l'unica del sistema `nest-assistant` che usa il bot Vivido (diverso dal bot Vivido Assistant delle altre 4 routine). Motivo: il contenuto LinkedIn è personal brand del founder, logicamente vicino a Vivido.

## Procedura

### 1. Leggi il framework

`Read` in parallelo di:
- `~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md` — brief strategico completo (profilo, 5 pillar, voce, anti-template, formula vincente, checklist)
- `~/.claude/skills/vivido-assistant/reference/analisi_top_post_linkedin.md` — dati empirici dei 32 post (90gg), pattern che vince vs. sotto-performa

Se uno dei due file non esiste → abortisci, manda DM `⚠️ File reference LinkedIn mancante, skip` e termina.

### 2. Raccolta materiale (tutti e 4 i source, in parallelo)

Lancia le 4 chiamate **in parallelo**. Nessuna è opzionale — se un source restituisce zero, segnalalo nel log interno ma continua con gli altri.

**2a. Granola — meeting ultime 24h**
- `list_meetings` con `time_range: this_week`. Filtra per data odierna; se zero risultati oggi, prendi ieri.
- Verifica creator `hello@vivido.world` → ignora meeting Nest.
- Per ogni meeting trovato: chiama `get_meetings` (con `meeting_ids`) per ottenere summary, decisioni, partecipanti, numeri.
- NON usare `get_meeting_transcript` — richiede piano a pagamento, fallirà sempre.
- Estrai: temi, decisioni, numeri concreti, frizioni emerse, frasi significative.

**2b. Notion — attività ultime 24h**
- `notion-search` query "progetto task aggiornato" senza `data_source_url` (workspace Vivido World).
- Filtro date: `created_date_range` start ieri, end oggi.
- NON usare collection ID Nest.
- Estrai: task completate, deliverable consegnati, note rilevanti.

**2c. Slack — messaggi ultime 24h (workspace Vivido World)**
- `slack_search_public_and_private` con query `after:yesterday` o equivalente.
- Cerca: decisioni condivise in canale, problemi emersi, numeri citati, aggiornamenti progetto.
- Ignora notifiche bot, messaggi automatici.

**2d. Gmail — email ultime 24h**
- `search_threads` con query `newer_than:1d -category:promotions -category:social`.
- Estrai: feedback clienti, decisioni, pain emersi, numeri, frasi significative.
- Ignora newsletter e notifiche automatiche.

**Filtro Vivido obbligatorio** — dopo la raccolta, per ogni pezzo: "parla di Vivido (design consultancy, clienti, Blueprint, delivery)?" Se parla solo di Nest → scartalo. Solo materiale Vivido entra nel post.

### 3. Selezione angolo

Dal materiale raccolto, identifica internamente **3 candidati angolo** in formato-storia. Per ciascuno: fatto reale + pillar + dettaglio operativo (numero/orario/frizione). Poi scegli il migliore:

**Criteri di scelta (in ordine):**
1. Ha una storia in prima persona con stakes reali? (frizione commerciale, errore, decisione difficile)
2. Ha un dettaglio operativo concreto con numero o orario? ("14:00 → 16:15", "3 tool", "10 meeting")
3. Pillar diverso dall'ultimo post in `/tmp/vivido-linkedin-history.jsonl`
4. Se l'angolo riguarda un cliente → solo se deliverable pubblico o cliente già citato (SalesMagic, Vertalis, Chimera…)

**Evita come prima scelta**: tesi AI astratta e prescrittiva ("ogni azienda deve…", "tutti vogliono…") — vedi analisi, sotto-performa sistematicamente.

**5 pillar** (ruotarli):
1. Processi reali · 2. Da processo ad AI · 3. Dietro le quinte Nest/Vivido · 4. Errori e lezioni · 5. POV sull'AI nelle operations

**Se il materiale è debole** (solo admin, zero insight, zero conversazioni) → skip onesto, non inventare.

### 4. Hook e voce

**Hook** — scegli UNO, in MAIUSCOLO, prime 1-2 righe del post:
- MAIUSCOLE vulnerabilità · Contro-intuitivo · Statistica shock · Domanda provocatoria
- Non ripetere lo stesso tipo del giorno prima (controlla history)

**Voce** — segui §5 del reference:
- Frase lunga che si srotola → frase corta che chiude
- Ancore concrete: cliente, numero, task specifico
- Max 1 marker-firma (pivot / CTA binaria / aforisma) — non cumulare
- Passata anti-AI obbligatoria: "cosa lo rende da AI?" → riscrivi quei passaggi

### 5. Scrivi la bozza

Struttura libera ma con questi elementi fissi:
```
[HOOK 1-2 righe MAIUSCOLE]

[Contesto / fatto reale che ha generato l'idea]

[Punto centrale con dato o dettaglio concreto]

[Sviluppo — flusso lungo + chiusura corta, NO bullet meccanici]

[Domanda finale specifica]

#hashtag1 #hashtag2 #hashtag3
```

**Hashtag** (3-5, sempre `#StartupItalia`):
- Processi / AI ops → `#AgencyOps #Automation #AIOperations #StartupItalia`
- Dietro le quinte / Errori → `#FounderJourney #BuildInPublic #ItalianStartups #StartupItalia`
- POV / Controcorrente → `#FuturoDelLavoro #AIStrategy #StartupItalia`

### 6. Checklist pre-consegna

Se una voce fallisce → riscrivi (max 2 tentativi):
- [ ] Fatto reale di Nest/Vivido (non genericità)
- [ ] Parla a un founder operativo, di un problema vero
- [ ] Pillar diverso dall'ultima bozza
- [ ] Hook in MAIUSCOLO, solo prime 1-2 righe
- [ ] Max 1 marker-firma, diverso dai post recenti
- [ ] Almeno un dato/numero/dettaglio concreto
- [ ] Domanda finale specifica (NO "cosa ne pensi?")
- [ ] Sotto 1.300 caratteri
- [ ] Zero link nel corpo, zero emoji sparse, zero markdown nel testo
- [ ] Zero buzzword (sinergia, ecosistema, disruptive, innovativo, valore aggiunto)
- [ ] Zero hype AI fine a sé
- [ ] Suona come Samuele, non come un modello che spiega
- [ ] Nest = Growth Partner consultancy (non SaaS)
- [ ] Vivido = design consultancy (non agenzia)
- [ ] 3-5 hashtag alla fine

**Anti-ripetizione**: leggi `/tmp/vivido-linkedin-history.jsonl` (crealo se non esiste) — ultime 7 bozze con `{date, pillar, hook_type, topic}`. Evita stesso pillar+hook due giorni di fila, stesso topic entro 7 giorni. Appendi la bozza di oggi dopo l'invio.

### 7. Salva bozza in Notion (Piano Editoriale)

Crea la pagina nel database Piano Editoriale (data_source_id: `92b0aae4-bcc5-8326-9483-078b106b51f9`) con queste properties:

```json
{
  "Name": "Bozza LinkedIn — <DD MMM YYYY> · <topic 3-4 parole>",
  "Status": "Bozza",
  "Piattaforma": "[\"LinkedIn\"]",
  "Formato": "Post Singolo",
  "Pillar": "<pillar scelto>",
  "Priorità": "🟡 Media",
  "date:Data pubblicazione:start": "<YYYY-MM-DD>",
  "date:Data pubblicazione:is_datetime": 0
}
```

Contenuto della pagina: il post completo (hook MAIUSCOLO + corpo + domanda + hashtag) dentro un blocco di codice, più una sezione **Fonte** e una **Checklist** (uguale al template `bcf0aae4-bcc5-8289-afee-0196a8dd4109`). Usa il link della pagina creata nel messaggio Slack (passo 7a).

⚠️ NON creare mai bozze LinkedIn nel database Tasks — solo nel Piano Editoriale.

### 7a. Consegna via DM Slack

Scrivi il messaggio finale in `/tmp/vivido-assistant-linkedin.md` con questo formato:

```
🟢 <https://notion.so/<page-id>|Bozza LinkedIn pronta>
• <HOOK IN MAIUSCOLO — prima riga del post>
💡 <fonte — es. "Granola: nome meeting" o "Knowledge Log: titolo entry"> · Samuele
```

Regole formato:
- Hook **sempre in MAIUSCOLO**
- Niente righe vuote tra le voci (compatto)
- Il link Notion punta alla bozza salvata (o al workspace se non salvata)

Il post completo (testo pubblicabile + hashtag) va come **reply in thread** al messaggio sopra:
```
<POST COMPLETO qui, come verrà pubblicato, hashtag inclusi>

_Caratteri: <n>/1300_
```

Poi invia con:
```bash
# Messaggio principale
TS=$(bash ~/.claude/skills/vivido-assistant/send.sh U062MREADAB /tmp/vivido-assistant-linkedin.md)
# Post completo in thread
bash ~/.claude/skills/vivido-assistant/send.sh U062MREADAB /tmp/vivido-assistant-linkedin-post.md "$TS"
```

**Consegna: DM diretto al founder** via user ID `U062MREADAB` (Samuele).

`send.sh` usa il token in questo ordine: env `VIVIDO_BOT_TOKEN` → env `SLACK_BOT_TOKEN` → file `vivido-bot.token`. Almeno uno dei tre è sempre presente nell'environment.

⛔ **MAI usare `slack_send_message` MCP come fallback** — invia come utente, non come bot, zero notifiche push. Se send.sh fallisce → retry una volta dopo 8s → se fallisce ancora logga l'errore e termina. Basta.

### 8. Skip onesto

Se al punto 3 decidi che il materiale è troppo debole per un post onesto, manda invece questo messaggio corto:

```
📝 *LinkedIn — <data>*
Niente materiale forte nelle ultime 24h per un post onesto. Skip.
<1 riga su cosa hai guardato: es. "2 meeting Granola + 6 task Notion, tutto admin">
```

Ricorda: **meglio skip che post generico**. Il framework dice esplicitamente "una sola idea per post" e vieta le frasi motivazionali vuote.

### 9. Risposta all'utente (nella CLI)

UNA riga:
- Se inviato: `LinkedIn draft inviato (pilastro: <X>, hook: <Y>, <n> char)`
- Se skip: `LinkedIn skip — materiale debole`
- Se errore: `LinkedIn errore: <causa breve>`
