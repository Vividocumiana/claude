# Routine: LinkedIn Content Mining — daily draft

> **Questa routine è specifica per Vivido.** Tutti i dati vengono da workspace Vivido: Notion "Vivido World" e Granola account `hello@vivido.world`. NON usare i collection ID Nest del CLAUDE.md — appartengono a un workspace separato.

Genera **una sola bozza** di post LinkedIn al giorno partendo da attività reali del founder nelle ultime 24h (Notion Vivido + Granola Vivido). Segue il framework completo in `~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md`.

Output: DM Slack al founder **nel workspace Vivido World** (user ID `U062VMYTXDL`) tramite bot `vivido_assistant` (token `vivido-bot.token`). Se nelle ultime 24h non c'è abbastanza materiale per un post onesto → **silent-skip con un messaggio breve** ("niente materiale oggi, skip") invece di inventare.

**Nota importante**: questa routine è l'unica del sistema `nest-assistant` che usa il bot Vivido (diverso dal bot Vivido Assistant delle altre 4 routine). Motivo: il contenuto LinkedIn è personal brand del founder, logicamente vicino a Vivido.

## Procedura

### 1. Leggi il framework

`Read` del file `~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md`. È la fonte canonica per:
- Tone of voice (vulnerabilità + MAIUSCOLE solo hook + frasi brevi)
- I 3 pilastri (Validazione / Operations / Crescita) — scegline **uno**
- I 4 tipi di hook (Vulnerabilità, Contro-intuitivo, Statistica shock, Domanda)
- Struttura post + regole tecniche (max 1.300 caratteri, 3-5 hashtag)
- Checklist pre-salvataggio e VIETATO ASSOLUTO
- Few-shot examples dei top performer (#1-#6)

Se il file non esiste → abortisci, manda DM `⚠️ File istruzioni LinkedIn non trovato su Desktop, skip` e termina.

### 2. Raccolta materiale (parallelo)

**2a. Granola — meeting ultime 24h (account Vivido)**
- `list_meetings` con `time_range: today`. Se zero, fallback `yesterday`.
- Verifica che i meeting siano Vivido (note creator `hello@vivido.world`). Ignora meeting Nest.
- Per ogni meeting trovato → `get_meeting_transcript` (se disponibile) o titolo + partecipanti.
- Estrai: temi discussi, frasi del cliente, decisioni, numeri concreti, pain emersi.

**2b. Notion — attività ultime 24h (workspace Vivido World)**
- Usa `notion-search` con query generica (es. "task progetto attivo aggiornato oggi"), **senza** `data_source_url`. Questo restituisce risultati dal workspace Vivido World (`6850c1bd18aa448d97fe9745f14c8ffc`).
- In alternativa, passa `page_url: 6850c1bd18aa448d97fe9745f14c8ffc` come scope.
- NON usare i collection ID Nest (`1e09106d-...`, `1c79106d-...`) — sono un workspace separato e restituiranno errore o dati sbagliati.
- Cerca: task completate, meeting loggati, nuovi clienti, deliverable consegnati, note rilevanti delle ultime 24h.

**2c. Gmail — email Vivido ultime 24h**
- `search_threads` con query `newer_than:1d` sull'account `hello@vivido.world`.
- Estrai: feedback clienti, decisioni prese, pain emersi, numeri condivisi, frasi significative.
- Ignora newsletter, notifiche automatiche, inviti calendario senza contenuto.

**2d. Filtro Vivido obbligatorio**
Dopo la raccolta, verifica esplicitamente per ogni pezzo di materiale: "parla di Vivido (Blueprint, MVP, clienti startup, design consultancy)?" Se parla di Nest (processi agenzie, Nest OS, Growth Partner retainer, outbound Nest) → **scartalo**, anche se trovato nel workspace Vivido World. Solo materiale Vivido entra nel post.

**2e. Opzionale — transcript più ricco**
Se trovi un meeting Granola particolarmente denso (insight, frase cliente memorabile, fallimento, numero), prioritizzalo come angolo principale.

### 3. Content-mine framework — estrai l'angolo

Dal materiale raccolto, cerca i pattern elencati nel file export:
- Hard Problem / Tactical / Conversazioni cliente / Learning / News-Milestone / Contrarian / Case Study / Vulnerabilità

**Regole di selezione:**
- Scegli **l'angolo più ricco**, non tutti. Una sola idea per post.
- Preferisci angoli con **numeri concreti** (€, ore, %) — performano di più.
- Vulnerabilità + MAIUSCOLE hook = archetipo top reach (vedi #1 e #4 del file).
- Case study con numeri cliente = archetipo autorità (vedi #3 e #6).
- Se l'angolo è un cliente specifico → verifica di poter parlarne (deliverable pubblico o cliente-reference già citato nel file: Virginia, Officina38, SalesMagic, Harvest).

**Se il materiale è debole** (solo task di admin, zero insight, zero conversazioni significative) → skip onesto, non inventare.

### 4. Assegna pilastro e hook

- **Pilastro** — scegli UNO tra:
  - Validazione veloce (35%) → Blueprint Vivido, dire NO, red flag idee non validate
  - Operations scalabili (40%) → Nest Rewind, Nest OS, n8n, SOP, time allocation
  - Crescita reale (25%) → numeri veri, fallimenti, Nest+Vivido parallelo, team, mental load

- **Hook** — scegli UNO tra: Vulnerabilità MAIUSCOLE · Contro-intuitivo · Statistica shock · Domanda provocatoria. Alterna: evita di ripetere lo stesso archetipo due giorni di fila (vedi §6).

### 5. Scrivi la bozza

Segui la **struttura del post** del file export:
```
[HOOK 1-2 righe MAIUSCOLE]
[riga bianca]
Contesto rapido (1-2 righe)
[riga bianca]
Il punto centrale (1-2 righe)
[riga bianca]
Breakdown (max 3 punti, 1 frase ognuno, con dati)
[riga bianca]
Lesson learned applicabile (1-2 righe)
[riga bianca]
Domanda finale specifica (NO "cosa ne pensi?")
[riga bianca]
#Hashtag1 #Hashtag2 #Hashtag3
```

**Hashtag per pilastro** (3-5 max, sempre `#StartupItalia` come core):
- Validazione → `#MVPDesign #ProductValidation #LeanStartup #StartupItalia`
- Operations → `#AgencyOps #AgencyGrowth #Automation #StartupItalia`
- Crescita → `#FounderJourney #BuildInPublic #ItalianStartups #StartupItalia`

### 6. Checklist pre-consegna

Prima di mandare il DM, passa la checklist del file export. Se una sola voce fallisce → **riscrivi** (max 2 tentativi). Voci non negoziabili:
- [ ] Hook forte nelle prime 2 righe (uno dei 4 tipi)
- [ ] MAIUSCOLE solo hook (non ovunque)
- [ ] UN pilastro, UNA idea
- [ ] Almeno un dato/numero/esempio concreto
- [ ] Domanda finale specifica
- [ ] Sotto 1.300 caratteri (inclusi spazi)
- [ ] Zero link nel corpo
- [ ] Zero emoji sparse / bullet con simboli
- [ ] Zero bold/corsivo/header markdown nel testo del post
- [ ] 3-5 hashtag alla fine
- [ ] Niente pitch diretto ("prenota una call", "scopri di più")
- [ ] Niente "Soluzione", "sinergia", "innovativo", "disruptive"
- [ ] Parla di Nest come Growth Partner consultancy (non SaaS/prodotto)
- [ ] Parla di Vivido come design consultancy (non agenzia)

**Anti-ripetizione**: leggi `/tmp/vivido-linkedin-history.jsonl` (crealo se non esiste). Contiene le ultime 7 bozze con {date, pilastro, hook_type, topic}. Evita di ripetere stesso pilastro+hook due giorni di fila, e stesso topic entro 7 giorni. Appendi la bozza di oggi in coda dopo l'invio.

### 7. Consegna via DM Slack

Scrivi il messaggio finale in `/tmp/vivido-assistant-linkedin.md` con questo formato:

```
📝 *Bozza LinkedIn — <data>*
Pilastro: <pilastro> · Hook: <tipo hook>
Fonte: <1 riga — da quale meeting/task/evento viene l'angolo>

---

<POST COMPLETO qui, come verrà pubblicato, hashtag inclusi>

---

_Caratteri: <n>/1300_
```

Poi invia con lo script dedicato al bot Vivido:
```bash
bash ~/.claude/skills/vivido-assistant/send.sh U062MREADAB /tmp/vivido-assistant-linkedin.md
```

**Consegna: DM diretto al founder nel workspace Vivido** (user ID `U062VMYTXDL`, bot `vivido_assistant`). NON usare `send.sh` (è il bot Nest, workspace diverso). NON postare in #company-brain del workspace Nest. Se l'invio fallisce → retry una volta dopo 8s. Se fallisce ancora → logga l'errore nella riga di output finale e termina. Non bloccare, non chiedere conferma, non creare bozze.

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
