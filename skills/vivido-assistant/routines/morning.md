# Routine: Morning Briefing (POV-driven, comandato dal Knowledge Log)

Briefing unico del mattino. **Il Knowledge Log della sera comanda il morning**: leggere il POV recente del founder è il PRIMO passo, e tutto il resto (progetti, CRM, urgenze) viene filtrato attraverso quel POV. Senza POV layer il morning è "lavoro cieco" e va segnalato come tale.

**Promessa**: dopo 2 minuti di lettura il founder sa cosa succede oggi su ogni front che ha menzionato di recente, e il sistema gli **ricorda** le decisioni che ha già preso (così non gli risuggerisce cose già archiviate).

**Mantra** (per ogni progetto + per il CRM):
1. *Cosa ha detto il founder di rilevante negli ultimi giorni su questo?* (POV layer, multi-entry)
2. *Cosa succede oggi qui?* (meeting, deadline step, deadline task, follow-up lead)
3. *Il dato di oggi è coerente con il POV del founder, lo conferma, o c'è una crepa?* (pattern detection)
4. *Cosa il founder vorrebbe sapere stamattina senza chiedere?* (spunti, non task)

**Differenze vs EOD**:
- Morning = "cosa fare oggi, alla luce di quello che ho deciso di recente" (POV-driven, snappy, solo progetti con segnali oggi/domani + crepe POV).
- EOD = "cosa è successo + cosa serve per domani" (coverage completa di tutti i progetti, fatture, contratti) → alimenta il prossimo Knowledge Log.

**Cosa il morning NON fa**: NON suggerisce task da creare. Surface **spunti** ("guarda che X è in tensione con quello che hai detto ieri" / "Carlo ha scritto stanotte '<estratto>' — è coerente col pivot SOP?"). Il founder decide se diventa task.

---

## Team Vivido — owner mapping (CRITICO)

Le azioni interne suggerite citano il membro del team giusto, non lo stakeholder cliente. Riferimento: `~/.claude/CLAUDE.md` §4.

| Tipo lavoro | Owner team |
|---|---|
| Notion / dashboard / OS / SOP | **Elia** |
| Automation / n8n / API / integrazioni | **Wagane** (lead), **Dami** (execution) |
| Sales / outreach / proposta | **Gabri** |
| Decisione strategica / cliente diretto | **Samuele** |

I nomi cliente (Carlo=Pixlex, Davide=Maoten, Max=Bhom, Anna=Officina38, ecc.) si usano solo per azioni rivolte al cliente. MAI confonderli con team interno.

---

## Modello dati

DB usati per la raccolta:
- **Founder Knowledge Log**: `collection://<VIVIDO_DS_KNOWLEDGE_LOG>` (3 property: `Entry` title, `Content` text, `Created time` auto). **Scritto automaticamente da `log-ingest` la sera, raccogliendo la reply del founder all'EOD.** Il morning lo legge come primo input — non scrive mai.
- **Projects**: `collection://<VIVIDO_DS_PROJECTS>`. Enumerazione canonica: `Status = "Attivo"` (clienti paganti) + `Status = "Partner"` se esiste come opzione, altrimenti `Status = "Attivo" AND Contract Type = "PARTNER"` (fallback). Distinguili visivamente nel report (`💼 Attivi` vs `🤝 Partner`) — sono ingaggi diversi.
- **Contact Email del progetto** (proprietà `Contact Email`): **fonte di verità per matching** meeting/email/Slack ↔ progetto. Mai guessare dal nome di persona (es. "Davide" è ambiguo). Se vuoto: fallback (a) email dalla pagina `Client` relazionata, (b) match per nome cliente con disclaimer esplicito.
- **Roadmap (Step)**: `collection://<VIVIDO_DS_ROADMAP>`
- **Backlog Richieste**: `collection://<VIVIDO_DS_BACKLOG>`
- **Tasks**: `collection://<VIVIDO_DS_TASKS>`. ⚠️ Owner = proprietà **`Person`** (NON `Assigned`: `Assigned` è morto, 0 task lo usano). Lo snapshot risolve già `owners[]` da `Person`. La sezione "Chi fa cosa oggi" si costruisce da lì.
- **CRM**: `collection://<VIVIDO_DS_CRM>`
- **Invoices**: `collection://<VIVIDO_DS_INVOICES>` (solo per flag urgenze in cima)
- **Contracts**: `collection://<VIVIDO_DS_CONTRACTS>` (solo per flag urgenze in cima)

Modello progetto auto-detect:
- **v2** (standard): pagina contiene Roadmap database link
- **v1** (legacy, in transizione: Bhom, Vivido, Officina38): solo Tasks

Riferimenti contestuali (NON da leggere ogni giorno, ma da tenere come background quando servono per azioni concrete):
- **Dashboard Processi**: `https://www.notion.so/3119106dc7f48079b52bc85a2f111d82` — Company SOPs Library + sezioni dipartimentali. Quando un'azione del briefing tocca un processo standardizzato (es. "onboarding cliente X"), referenzia la SOP esistente invece di reinventare.
- **GTM Toolkit**: pagine in Dashboard Processi (Sequenza LinkedIn Outbound, ICP Assessment, Sales Assessment, Sales Playbook, Proposta Nest, Partnership Program). Quando emergono azioni sales/outbound, suggerisci il toolkit pertinente al posto di istruzioni generiche.

---

## Procedura

### -1. Snapshot deterministico (PRIMISSIMO STEP — prima di tutto, anche del KL)

Carica il data layer prima di ogni altra cosa. Vedi `routines/_data-layer.md` per il contratto completo.

```bash
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today <oggi YYYY-MM-DD>
```

Poi `Read` di `~/.claude/skills/vivido-assistant/cache/snapshot.json`. Questo è ora la **fonte di verità**
per: enumerazione progetti attivi/partner, TUTTE le task aperte (con progetto + owner già risolti),
CRM, fatture, contratti. **Non enumerare più progetti/task via `notion-search`** (vedeva max 25 task su 400+).
L'MCP resta solo per Slack/Gmail/Granola/commenti/KL e letture puntuali.

Se lo snapshot fallisce → disclaimer `⚠️ snapshot non disponibile — enumerazione parziale` e fallback MCP.

### 0. Founder Knowledge Log (FONTE PRIMARIA — comanda il resto del briefing)

Il morning **parte dal POV del founder** e tutto il resto è filtrato attraverso quel POV. Questo non è un nice-to-have: è la differenza tra un briefing che ricorda chi sei (cosa hai deciso, cosa hai accettato) e un report meccanico che ti ripropone cose già archiviate.

**0A. Determina la data target da leggere**:
- Se oggi è **martedì → venerdì**: target primaria = ieri (oggi − 1g).
- Se oggi è **lunedì**: target primaria = venerdì scorso (oggi − 3g).
- Se oggi è **sabato/domenica** (rara invocazione manuale): target primaria = giorno-lavorativo-precedente.

**0B. Recupera multi-entry (POV layer continuo, NON solo ultimo giorno)** — **regole v5 (2026-05-28)**:

Il "secondo cervello" ricorda le entry recenti **per persona**, non solo gli ultimi N entry in assoluto.

1. `notion-search` su `collection://<VIVIDO_DS_KNOWLEDGE_LOG>` **ordinato per `Created time` DESC**, `content_search_mode=workspace_search` (NIENTE `ai_search`/relevance — è un log temporale), `page_size=20`.
2. Raggruppa i risultati per `Person` (UUID): Samu=`<VIVIDO_PERSON_FOUNDER>`, Dami=`<VIVIDO_PERSON_2>`, Elia=`<VIVIDO_PERSON_3>`, Wagane=`<VIVIDO_PERSON_4>` (Flowy, NON @usanest.it), Massi=`<VIVIDO_PERSON_5>`.
3. Per ognuna delle 5 persone, identifica **l'ultima entry con `Content` non vuoto** (le entry titolate "⚠️ ping EOD senza risposta" hanno `Content` vuoto — NON contano come log valido). `notion-fetch` su quella entry.
4. Per il **POV trend di Samu** (founder): fetch anche le 2 entry Samu consolidate precedenti (per continuità decisioni).
5. **Mai dichiarare "log mancante" / "silenzio team"** prima di aver fatto 1+2+3. Se una persona non ha entry con Content negli ultimi 5g, scrivi "ultimo log <data>" senza giudizio.

**0C. Costruisci la mappa POV per progetto**:

Per ogni progetto attivo (e per CRM/temi globali), estrai dalle 5 entry:
- **Ultima decisione menzionata** (es. "Pixlex pivot su SOP — 2026-05-13")
- **Ultimo flag/preoccupazione** (es. "Bhom silenzio ok, valuta proposta interna — 2026-05-14")
- **Trend** (cliente menzionato in 3+ entry → segnale che è "in caldo" / fonte di stress)
- **Cose già accettate** (silenzi tollerati, deadline spostate, scope ridotti)

**REGOLA F — Lettura cross-sezione del KL (anti-falso-silenzio)**: NON limitarti alla sezione *Per progetto*. Estrai menzioni cliente anche da **Decisioni prese**, **Flag strategici / da non perdere**, **Cose accettate**, **Note libere**, **Q EOD**. Esempio anti-pattern: KL 29/05 mette "SalesMagic [silenzio-ok]" nella sezione Per progetto, MA le Decisioni e i Flag dello stesso KL contengono "filtro pre-call SalesMagic", "Compass come primo touch", "2 case study Compass". SalesMagic in questo caso è **CALDO**, non silenzioso. Per ogni cliente conta le menzioni totali across tutte le sezioni — se ≥1 menzione fuori da "Per progetto" → flag come **caldo strategico**, override del marker silenzio-ok.

**REGOLA A — "Silenzio-ok ≠ skip"**: il marker `[stato: silenzio-ok]` nella sezione *Per progetto* è valido SOLO se nessun'altra sezione del KL menziona il cliente. Altrimenti il silenzio è apparente: il cliente non ha avuto convo operative, ma decisioni strategiche su di lui sono pending → va incluso nel briefing.

Questa mappa è il filtro: per ogni dato che incontri dopo (meeting oggi, task in scadenza, email, Notion delta), passa SEMPRE attraverso questa mappa **prima** di trasformarlo in spunto. Se il dato confliggi con una decisione recente → **non risuggerire la cosa già decisa**, ma flag la crepa.

**Edge cases step 0**:
- **Entry target mancante** (founder non ha risposto all'EOD ieri sera, o log-ingest fallita): in cima al briefing nota `⚠️ Knowledge Log <data target> non compilato — POV layer parziale (uso entry precedenti).` Procedi comunque con i 5 entry più recenti disponibili.
- **<5 entry totali nel log**: lavora con quante ce ne sono. Se zero → `ℹ️ Knowledge Log vuoto — nessun POV layer disponibile, briefing meccanico.` e procedi solo su Notion/Slack/Calendar/Granola.
- **Entry presente ma `Content` vuoto**: trattalo come entry mancante (non incluso nella mappa).

### 1. Calendar oggi (full) — matching via attendee email

`list_events` Calendar primary, oggi 00:00→23:59, timeZone Europe/Rome, orderBy startTime. Tieni tutti gli eventi (interni + cliente).

**Matching meeting ↔ progetto**: usa **solo attendee email/dominio** vs la mappa Contact Email costruita allo step 6 (sotto). Mai matchare per titolo o per nome di persona (es. "Samuele x Davide" può essere chiunque). Se nessun attendee email matcha → meeting va in sezione "📅 Altri meeting", NON assegnato a un progetto a caso.

**REGOLA D — CRM cross-check obbligatorio per meeting esterni sconosciuti**: per ogni meeting esterno (attendee non-@usanest.it) che non matcha un progetto attivo, PRIMA di scrivere "contesto?" nel briefing:
1. `notion-search` CRM (`collection://<VIVIDO_DS_CRM>`) per email/dominio attendee.
2. Se trovi match in CRM: cita stage (Discovery/Quotation/Nurturing) + ultimo contatto. Esempio: "17:30 — Giorgio Iob (1percent.it) — Discovery call, in pipeline da 3g".
3. `search_threads` Gmail `from:<email> OR to:<email>` last 14d come ulteriore contesto.
4. Solo se ZERO match in CRM AND ZERO email recenti → "contesto?" è ammesso (è un cold meeting genuino).

Vietato scrivere "contesto?" per pigrizia. Il founder ha più lead di quanto ricordi — il sistema deve recuperare il contesto per lui.

### 2. Granola — meeting di ieri

**REGOLA C — Granola query split per giorno della settimana**:
- Se oggi è **lunedì o martedì**: query `time_range: last_week` (per catturare venerdì/sabato/domenica scorsi). `this_week` di lunedì = lun-dom corrente, esclude il venerdì che vuoi davvero.
- Se oggi è **mercoledì → venerdì**: query `time_range: this_week`.
- Se oggi è **sabato/domenica**: query `time_range: this_week`.

`get_meetings` su quelli del giorno-lavorativo-precedente. Estrai action items se transcript disponibile.

### 3. Gmail recenti
`search_threads` `after:oggi-5g`. Per ogni cliente attivo: traccia ultima mail IN/OUT.

### 4. Slack mentions ultime 12h
`slack_search_public_and_private` query `to:<@<VIVIDO_FOUNDER_SLACK>> -is:read` limit=10. Conta + top 3 mittenti.

### 4.5. Slack canale strategico Massi/Gabri/Samu (REGOLA E)

**Canale `C0B5ZEB0AS3`** (Group DM Samu + Massi + Gabri) = sede delle decisioni strategiche pending (break-even, allocazione Wagane, dashboard GTM, riallineamenti SalesMagic, capacity team).

**Mandatory ad ogni morning**: `slack_read_channel C0B5ZEB0AS3` ultime 48h. Estrai:
- **Domande aperte di Massi/Gabri verso Samu** non ancora risposte → sezione 🔴 Decisioni richieste.
- **Controproposte/contestazioni** vs decisioni di Samu (es. Massi che contesta break-even settembre) → 🔍 Crepa POV.
- **Action item assegnati a Samu** (case study, dashboard, weekly strategiche da confermare).

Saltare questo canale = perdere il grosso delle decisioni in attesa del founder. Da fare PRIMA della composizione delle sezioni globali.

### 5. Notion update sweep — ultime 24h (NUOVO)

Cattura cosa è cambiato su Notion dopo l'EOD di ieri (~18:30 di ieri → ora):

**A. Task toccate** (cambio status, edit, nuove): `notion-search` su Tasks ordinato `last_edited_time` desc, limit 30. Filtra `last_edited_time >= ieri 18:00`. Per ogni task: nome, project, status precedente vs attuale (se desumibile), chi l'ha editata se ricavabile.

**B. Step Roadmap toccati**: `notion-search` su Roadmap DB ordinato `last_edited_time` desc, limit 20. Stessa logica: stato cambiato? `Pianifica` modificata?

**C. Backlog Richieste arrivate**: `notion-search` su Backlog DB ordinato `created_time` desc, limit 10. Filtra `created_time >= ieri 18:00`. Queste sono richieste cliente nuove da triagiare.

**D. Commenti recenti sulle pagine progetto**: per ogni progetto attivo, `notion-get-comments` sulla pagina principale. Estrai commenti con `created_time >= ieri 18:00`. Spesso contengono note importanti del cliente o del team che non emergono altrove.

Memorizza tutto come **"Notion delta layer"** — alimenta sia le sezioni progetto (cambiamenti specifici) sia una sezione globale "🔄 Update Notion ultime 24h" se ci sono cambi rilevanti che non finiscono altrove.

### 6. Enumera progetti attivi + partner (DB-driven multi-round, no guess) e raccogli per ciascuno

**Regola critica**: l'enumerazione viene dallo **snapshot** (`projects[]`), non più da `notion-search`.

1. Dallo snapshot, tieni `projects[]` con `status ∈ {"Attivo", "Partner"}`. Ogni progetto ha già:
   `name, status, contactEmail, mrr, contractType, inizio, durataPrevista, finePrevista` — completi e risolti.
   Niente più round multipli, niente fetch per-progetto, niente fallback nominali: lo snapshot è completo.
2. `finePrevista` è già calcolata (Inizio + Durata mesi) — usala per i flag "scadenza/rinnovo".
3. Costruisci la **mappa `contactEmail`/dominio → progetto** da `projects[]` (il fallback dal DB Clienti
   è già applicato nello snapshot). Questa mappa serve allo step 1 (match meeting) e step 3 (match email).
4. Distingui nel report: 💼 Attivi vs 🤝 Partner — sono ingaggi diversi.

**REGOLA B — Partner sempre enumerati, mai skippati**: Pixlex e SalesMagic (e ogni altro Partner attivo) DEVONO comparire nel briefing con almeno 1 riga sintetica, ANCHE se silenziosi o ancorati a POV "silenzio coerente". Motivo: il founder fatica a tenerli a mente proprio perché silenziosi, e dimenticarli è un costo (revenue sharing, white-label dynamics, co-delivery). Format minimo per Partner silenzioso: `🤝 *<Nome>* — silenzio coerente col POV <data>, nessun segnale oggi`. Se hanno segnali → trattati come Attivi.
6. Per ogni progetto, in parallelo:

**A. Step Roadmap** (se v2): `notion-search` su Roadmap DB con query nome cliente. Categorizza:
- **Fase corrente** = `Stato ∈ {In corso, In revisione}` (più recente per Pianifica.start).
- **Step in scadenza oggi/domani** = `Pianifica.start ≤ oggi+1` AND `Stato ∈ {Non iniziato, In corso, In revisione}`.
- **Step Bloccato** = `Stato = Bloccato`.
- **Step stagnante** = `Stato = In corso` AND `Ultima modifica < oggi-7g`.

**B. Tasks** — dallo **snapshot** (`tasks[]` filtrate per `projectId` di questo progetto). I bucket
sono già calcolati nel campo `bucket`, niente da ricalcolare:
- **In scadenza oggi** = `bucket == "today"`.
- **In scadenza ≤3g** = `bucket == "soon"`.
- **In ritardo "vivo"** = `bucket == "overdue"`.
- **Fantasma** = `bucket == "ghost"` (sezione globale).
- **Senza owner** = `owners == ["(nessun owner)"]` (sezione globale hygiene). Owner deriva da `Person`.
- **Waiting feedback >3gg** = `Status = Waiting for feedback` AND `last_edited_time < oggi-3g` → entra in 🔴 Decisioni.

**C. Email cliente recente**: identifica silenzio (ultima OUT > ultima IN AND > 3g fa).

**D. Notion delta cliente**: dalla sweep dello step 5, estrai cambi specifici per questo cliente (task chiuse durante la notte? Step avanzato? Commento nuovo sulla pagina progetto?).

### 7. CRM — vista "Today's Action" (PRIMARIA) + sync + classifica

**Schema CRM aggiornato (2026-06-01)**: nuove property formula `Next Action` (testo azione) e `Next Action Date` (data calcolata). Status pipeline: `New Lead` → `New Lead FU1/FU2` → `Rewind` → `Rewind FU1/FU2` → `Rewind Call` → `Discovery` → `Proposta Sent` → `Proposta FU1/FU2/FU3` → `Nurturing` → `Won/Lost`. Tipologia Contratto: `CORE / GTM / COMPASS / PARTNERSHIP`.

**Fase A — Azioni reali CRM (dallo snapshot, REGOLA G)**:

⚠️ La formula `Next Action Date` ritorna "oggi" per quasi tutti i lead (incl. i ~119 in Nurturing) → un
filtro grezzo `== oggi` produce rumore (123 "azioni"). Lo snapshot calcola già le **azioni reali**: lead con
`nextActionDate ≤ oggi` AND azione concreta (esclude Nurturing e il fantoccio "⚠️ Imposta Last Step").

Procedura:
1. Dallo snapshot `crm[]`: prendi gli **actionable** = `nextActionDate ≤ oggi` AND `status ∉ {Nurturing, vuoto}`
   AND `nextAction` reale (non "Imposta Last Step"). Spezza in OGGI (`== oggi`) e RITARDO (`< oggi`).
2. Per ognuno: `name`, `status`, `nextAction`, `mrr`, `nextActionDate`. Output in 🎯 **Today's Action CRM**
   subito dopo le Decisioni, **sempre presente** (se 0: `🎯 Today's Action: 0 — pipeline pulita oggi`).
3. Aggiungi 2 righe di contesto: `🔥 Pipeline calda: <N>` (Discovery/Proposta/Rewind Call) e
   `🌱 Nurturing pool: <N>` (non azione daily). Sono già nel digest dello snapshot.

**Fase B — Sync Gmail (per ogni lead `Status ∉ {Won, Lost}` con Email)** — write-through autorizzato:
1. `search_threads` Gmail: `from:<email> OR to:<email> after:<oggi-30gg>`.
2. Se almeno un thread → `get_thread` ultimo. Estrai `data_ultimo_in`, `data_ultimo_out`.
3. Aggiorna via `notion-update-page` (max 3/sec):
   - `Last Step Date` ← `max(in, out)` se più recente del valore attuale (era `Ultimo contatto`, ora si chiama `Last Step Date`).
   - `Summary Risposta` ← sintesi 1-frase ultima IN solo se vuoto OR email più recente dell'ultimo update. Max 200 char.
4. NON aggiornare più `Follow Up Eseguito` (property rimossa nello schema nuovo) — `Next Action` formula gestisce la logica.
5. Log modifiche in `sync_changes`.

**Fase C — Commenti Notion per ogni lead in pipeline attiva**: `notion-get-comments` sulla pagina. Recenti (14gg) come contesto inline nel report.

**Fase D — Classifica secondaria (post-Today's Action)**:
- **⏳ Prossimi 3gg**: `oggi < Next Action Date ≤ oggi+3`.
- **🚨 In ritardo**: `Next Action Date < oggi` AND `Status ∉ {Won, Lost}`.
- **🔥 Pipeline calda**: `Status ∈ {Discovery, Proposta Sent, Proposta FU1, Proposta FU2, Proposta FU3}`. MRR totale = somma.
- **💤 Dormienti**: `Status ∈ {New Lead, New Lead FU1, New Lead FU2, Nurturing}` AND `Last Step Date > 14gg`.

**Rate limit Gmail**: max 3 parallele. Se >30 lead, prioritizza Today's Action + In ritardo + Pipeline calda.

### 8. Urgenze finanziarie flash (NUOVO — solo se rilevanti)

Le fatture/contratti vivono nell'EOD. Nel morning li menzioniamo SOLO se c'è urgenza concreta che impatta oggi:

**A. Invoices**: query `collection://<VIVIDO_DS_INVOICES>`. Match se:
- `Status ∈ {Next, To do}` AND `Expected Payment Date < oggi` (in ritardo)
- OPPURE `Status ∈ {Next, To do}` AND `Expected Payment Date == oggi`

**B. Contracts**: query `collection://<VIVIDO_DS_CONTRACTS>`. Match se:
- `Status = "To send"` AND `Sent Day < oggi-3g` (contratto fermo da inviare)
- OPPURE `Status = "Sent"` AND `Sent Day < oggi-10g` (contratto inviato non firmato da 10+gg)

Se ZERO match in entrambi → skippa la sezione. Se ≥1 → riga compatta in cima ai bullet "💸 Urgenze finanziarie" con max 3 item totali. Per analisi completa rimanda all'EOD.

### 9. Triangolazione POV-first (cuore del briefing)

Per ogni progetto, incrocia in **quest'ordine**: **mappa POV multi-entry (step 0C)** → meeting oggi (1) → step (6A) → task (6B) → email (6C) → Notion delta cliente (6D) → Granola di ieri (2).

**Regola d'oro**: il POV layer **ha sempre priorità**. Prima di emettere uno spunto su un dato del giorno, controlla la mappa POV. Tre casi:

1. **Il dato CONFERMA il POV** → spunto breve, "tutto on-track con quanto hai deciso il <data>".
2. **Il dato è NUOVO** (non emerso nelle 5 entry) → spunto normale, "ecco una cosa che non avevi ancora visto".
3. **Il dato CONTRADDICE il POV** (crepa POV) → **spunto rosso 🔍**: "hai detto <X> il <data>, ma oggi vedo <Y> — vuoi rivedere?". Questo è il vero valore del secondo cervello: catturare contraddizioni che altrimenti si perdono nel rumore.

Esempi pattern POV-first:
- POV recente: "Maoten prototipo ok, archiviato" → vedi commento Notion da Davide stamattina su prototipo → **non** "verifica prototipo", ma "🔍 Davide ha commentato stanotte sul prototipo che avevi archiviato il <data> — vuole riapertura?"
- POV recente: "Pixlex pivot su SOP, no dashboard" → vedi email Carlo che chiede aggiornamento dashboard → **non** "rispondi a Carlo su dashboard", ma "🔍 Carlo ha riscritto stanotte su dashboard — il pivot SOP è chiaro col suo team?"
- POV recente: "Bhom silenzio ok, valuta proposta interna" → silenzio cliente continua → **omitti l'allarme**, "Bhom: silenzio coerente con quanto detto il <data>".
- POV recente menziona "Wagane sovraccarico, sposta automation X a settimana prossima" → vedi step automation X con deadline domani → "🔍 Step automation X scade domani ma avevi deciso di spostare a settimana prossima — Roadmap aggiornata?"

**Citazione esplicita**: ogni volta che uno spunto deriva direttamente da una entry, cita in formato `_(KL <data>: "<estratto breve>")_`. Questo dà al founder il link mentale immediato a quando l'ha scritto.

Pattern di triangolazione → **spunti osservativi** (non azioni con owner). Lo stile è "ho notato X — vuoi fare Y o Z?":

| Segnale (post-filtro POV) | Spunto osservativo |
|---|---|
| Meeting oggi cliente + task in scadenza oggi non chiusa | "Call HH:MM con <Cliente> — task '<X>' (due oggi) non chiusa. Tracciata da team o gap?" |
| Meeting oggi + step Roadmap affine | "Call HH:MM su step '<nome>'. Ultimo aggiornamento step <gg/mm> — c'è prep da chiudere?" |
| Step in scadenza oggi/domani senza task tracciate | "⚠️ Step '<Y>' scade <data> — nessuna task linked. Pronto comunque o gap?" |
| Email cliente senza risposta >3g E step in attesa feedback | "<Cliente>: ultima OUT <data>, IN <data>. Step '<nome>' in attesa — ping o lasci decantare?" |
| Step Bloccato | "<Cliente>: step '<nome>' Bloccato dal <data>. Cosa serve sbloccare? → 🔴 Decisioni" |
| Action item Granola di ieri non tracciato | "Da Granola ieri call <X>: '<frase>'. Tracciato altrove o gap?" |
| Task in Waiting feedback >3g | "<Cliente>: task '<X>' Waiting feedback da <Ng>. Re-ping o ridefinire scope?" |
| Commento Notion nuovo su pagina progetto (delta) | "Nuovo commento da <chi> su <pagina> stanotte: '<estratto>' — letto?" |
| Task chiusa stanotte (delta) | "Task '<X>' chiusa stanotte (da <chi se ricavabile>) → sblocca step '<Y>'?" |
| Email/Slack stanotte con segnale forte | "<Cliente> ha scritto stanotte '<estratto 1 riga>' — coerente col POV recente o crepa?" |
| Lavoro automation menzionato | "Automation '<Y>' menzionata — stato? (owner referente: **Wagane**)" |
| Sales/proposta in pipeline (CRM) | "<Lead> in Quotation da <data> — Gabri ha lo stato? (vedi Sales Playbook)" |

**Owner team in grassetto** = riferimento informativo, NON "assegna a X". Lo stile resta osservativo.

### 10. Componi sezioni

**A. Per ogni progetto con almeno 1 segnale oggi/domani**: sezione sintetica. Progetti silenziosi → ometti. Resto in nota finale "+N progetti silenziosi (vedi EOD)".

Ordine per impatto: `(meeting cliente oggi × 3) + (step in scadenza ≤1g × 2) + (step Bloccati × 2) + (task in scadenza oggi)`.

**B. Sezione CRM**: subito dopo i progetti. Solo categorie con ≥1 item.

**C. Sezioni globali in coda**:
- 🔍 **Crepe POV** (NUOVA, sezione di valore) — contraddizioni tra dati di oggi e POV recente del founder (vedi step 9). Max 4. Ogni crepa cita la entry da cui deriva. **Se zero crepe → ometti la sezione**.
- 🔴 **Decisioni richieste oggi** — step Bloccati + Waiting feedback >3g + silenzi che bloccano roadmap. Max 5.
- 🪦 **Task fantasma** (>14g) — max 5. "Chiudi/rischedula?"
- 🆕 **Backlog richieste da triage** — `Stato=Da valutare` AND `created < oggi-1g`. Max 3.
- 🚧 **Senza owner >7g** — conteggio + 2 esempi.
- ⚡ **Gap non tracciati** — gap email/Granola che non finiscono in task. Max 3.
- 💬 **Da Granola (ieri)** — 1 frase azionabile per meeting (max 3).
- 🔄 **Update Notion ultime 24h** — solo cambi rilevanti non già finiti nelle sezioni progetto/CRM. Max 4.
- 📬 **Slack mentions** — conteggio + top 3 mittenti.
- 👥 **Chi fa cosa oggi** (NUOVA) — dallo snapshot: task con `bucket ∈ {today, overdue, ghost}` raggruppate per `owners` (= `Person`, NON `Assigned`). Per ogni membro del team: max 3 task. Per Samuele includi anche meeting cliente di oggi (con prep) + decisioni in attesa. Task con `owners == ["(nessun owner)"]` in scadenza oggi → riga "🚧 Da assegnare urgente".

---

## Formato output

```
☀️ *Morning — <giorno, gg mese>*

🧠 *POV layer*: Knowledge Log <data target> ✓ (+<N> entry precedenti come trend)
_Headline ultima entry: "<headline 1 riga dall'entry target>"_
_(o `⚠️ KL <data> mancante — uso le <N> entry più recenti` / `ℹ️ KL vuoto — briefing meccanico`)_

💸 *Urgenze finanziarie* (<N>) — solo se ≥1
• <Cliente> — fattura €<X> in ritardo da <Ng> · <link>
• <Cliente> — contratto "To send" fermo da <Ng> · <link>

📅 *Oggi* (<N> meeting)
• HH:MM — *<titolo>* — <partecipanti chiave>

━━━━━━━━━━ PROGETTI ━━━━━━━━━━

*<Cliente>* — <fase corrente, 1 riga> _(POV: "<estratto KL <data>>")_
📅 Oggi HH:MM — <titolo meeting>
🔍 Spunti:
  • <spunto osservativo 1>
  • <spunto osservativo 2>
🔗 Task in scadenza: <task name> (oggi) <link> · <task name> (dom) <link>
🔄 <delta Notion rilevante, es. "task X chiusa stanotte">

*<Cliente>* — <fase>
📞 Silenzio cliente da 4g (ultima OUT 1/05) → step "<nome>" in attesa
🔍 Spunti:
  • Coerente col POV del <data> ("<estratto>") oppure prima volta che emerge?

*<Cliente>* — <fase>
🗺️ Step "<nome>" scade <gg/mm>, fermo da <Ng>
🔍 Spunti:
  • Hai detto il <data> "<estratto>" — questo step ancora prioritario o sposti?

_+<N> progetti silenziosi (coverage completa nell'EOD)_

━━━━━━━━━━ CRM ━━━━━━━━━━

🎯 *Today's Action* (<N>) — vista canonica `Next Action Date == oggi`
• <Lead> — <Status> — *<Next Action>* — MRR €<X> · <link>
_(se 0: "🎯 Today's Action: 0 — pipeline pulita oggi")_

🚨 *In ritardo* (<N>)
• <Lead> — <Status> — Next Action <gg/mm> (<Ng> in ritardo) · <link>

⏳ *Prossimi 3gg* (<N>)
• <Lead> — <Status> — Next Action <gg/mm>

🔥 *Pipeline calda* (<N> · MRR potenziale €<X>)
• <Lead> — <Status> — Last Step <Ng>

💤 *Dormienti >14gg* (<N>): es. <Lead>, <Lead>

📨 *Sync Gmail*: <N> Last Step Date aggiornati · <N> Summary aggiornati

━━━━━━━━━━ DECISIONI & HYGIENE ━━━━━━━━━━

🔍 *Crepe POV* (<N>) — contraddizioni col POV recente
• <Cliente> — Hai detto il <data> "<estratto>" ma oggi vedo <fatto>. Rivedere?
• <Cliente> — <crepa 2>

🔴 *Decisioni richieste* (<N>)
• <Cliente> — <descrizione>: <azione>

🪦 *Task fantasma* (<N>, >14g)
• <Cliente> — <task> — <Ng> — chiudi/rischedula? <link>

🆕 *Backlog da triage* (<N>)
• <Cliente> — *<richiesta>* — <link>

🚧 *Senza owner aperte >7gg* (<N>): es. <Cliente>—<task>; <Cliente>—<task>

⚡ *Gap non tracciati* (<N>)
• <Cliente> — [email/meeting] — <impegno in 1 riga>

💬 *Da Granola (<data>)*
• <Meeting>: <1 frase azionabile>

🔄 *Update Notion ultime 24h* (<N> non già coperti)
• <Cliente> — <delta: es. "Step Y avanzato a 'In revisione'">

📬 <N> menzioni Slack non lette (top: @X, @Y)

👥 *Chi fa cosa oggi*
• *Samuele* (<N> aperte): <task> (<cliente>, due oggi) · prep call HH:MM <Cliente> · decisione pending <X>
• *Wagane* (<N>): <task> (<cliente>) · +N altre
• *Dami* (<N>) · *Elia* (<N>) · *Gabri* (<N>)
🚧 Da assegnare urgente: <task> (<cliente>, due oggi, no owner)
```

**Regole formato**:
- Massimo 5 sezioni per-progetto. Se più progetti hanno segnali, scegli i 5 col più alto impatto + nota "+N altri progetti hanno segnali minori".
- Massimo 3 spunti per progetto. Tono **osservativo, non imperativo prescrittivo**: "Step X fermo da 5g — vuoi spingere o spostare?" invece di "Spingi step X".
- Italiano, telegrafico ma non secco.
- Sempre link Notion per task/step/lead citati.
- **POV citation**: ogni volta che uno spunto deriva da un'entry KL, cita in `_(KL <data>: "<estratto>")_`. Massimizza le citazioni — è la cosa che fa sentire al founder che il sistema lo ricorda.
- Sezioni globali: max 5-6 bullet ognuna, "+N altri" in coda.
- **Massimo 1800 caratteri totali (v5)** — il founder ha esplicitamente chiesto "più sintetico, diretto, high-level. Il brief operativo è quello del team". Se sfora, ordine di taglio: 🔄 Update Notion → ⚡ Gap → 🚧 Senza owner → 🪦 Fantasma → 💤 Dormienti CRM → "Da non dimenticare" residuale → progetti 🟡 marginali → CRM dettaglio. **Tieni sempre**: POV layer (5 bullet per persona, telegraphic), 📅 Calendar, 🎯 Today's Action CRM (sempre, anche se 0), 🔴 *Da decidere oggi* (è il cuore), 🔍 Crepe POV, stato progetti 1 riga, "Tu oggi" 1 paragrafo.
- **NIENTE dettagli operativi per persona nel founder morning** — quelli stanno nei brief membro (Dami/Elia/Wagane/Massi morning). Il founder brief è high-level su decisioni e segnali sintetici.
- Se zero segnali progetto E zero CRM in ritardo/oggi E zero urgenze E zero crepe POV → `🟢 Tutto coerente col POV recente. Giornata pulita.` dopo Calendar.

---

## Consegna

1. Scrivi il testo in `/tmp/vivido-assistant-morning.md`.
2. `bash ~/.claude/skills/vivido-assistant/send.sh <VIVIDO_DM_CHANNEL> /tmp/vivido-assistant-morning.md` (DM bot ↔ Samuele).
3. Retry 8s → `send.sh <VIVIDO_FOUNDER_SLACK>` (stessa DM, indirizzata via user ID).
4. Rispondi all'utente: `✅ Morning inviato (🧠 POV: <KL_status> · <P> progetti con segnali · 🔍<C> crepe POV · 🔴<D> decisioni · CRM:<R> azioni · 💸<U> urgenze · <M> meeting)`.

---

## Edge cases

- **Calendar vuoto E zero segnali progetto E zero CRM** → `🟢 Zero meeting + zero alert. Giornata di deep work.`
- **Zero progetti attivi enumerati** → disclaimer + procedi con altri dati.
- **Notion giù** → briefing minimale Calendar+Granola+Gmail+Slack + disclaimer.
- **Gmail giù** → salta sync CRM Fase B, procedi solo con dati Notion. Disclaimer `⚠️ Gmail sync saltato`.
- **Progetto v1 (Bhom/Vivido/Officina38)** → triangolazione senza Step. Header: `*Bhom* — _v1, no Roadmap_`.
- **Match meeting↔progetto**: SOLO via attendee email/dominio vs mappa Contact Email (step 6). Mai dedurre dal titolo o dal nome di persona. Meeting senza match → sezione "Altri meeting", non assegnato.
- **Match step↔task**: substring del nome step (>5 char) nel titolo task. Se step ≤1g senza task → flag.
- **Contact Email vuoto in pagina progetto** → fallback su pagina `Client` relazionata. Se ancora vuoto → match per nome cliente con disclaimer esplicito nel report.

---

## Filosofia

Il morning è il primo input del founder ed è **comandato dal Knowledge Log della sera**. Non è un report meccanico che riparte da zero ogni giorno — è la continuazione della conversazione che il founder ha avuto con sé stesso ieri sera nella reply all'EOD.

Il vero valore del morning sta in **3 livelli di intelligenza POV-first**:

1. **Continuità POV** — il sistema ricorda le ultime 5 entry, non solo l'ultima. Se hai deciso 3 giorni fa che Pixlex pivota su SOP, ancora oggi il morning lo sa e non ti propone azioni su dashboard. **Questo è il secondo cervello**: ricorda decisioni per te.

2. **Pattern detection** — un cliente menzionato in 3+ entry recenti è "in caldo". Un silenzio già accettato non ti fa allarmare. Una decisione presa e poi rimessa in discussione emerge come tensione. Il morning collega i puntini tra giorni diversi.

3. **Crepe POV** (sezione dedicata) — quando il dato di oggi contraddice una decisione recente, il sistema **non ignora** né **non riesegue silenziosamente**: flag esplicitamente "hai detto X il <data>, ma oggi vedo Y — rivedere?". Questa è la differenza tra un report e un copilota.

Il morning **non suggerisce task da creare**. Le task le gestisci tu. Il morning ti dà **spunti** osservativi (con citazione esplicita all'entry KL da cui derivano) — tu decidi se diventano task, mail, ping, o nulla.

Il CRM è integrato perché vendere è il secondo lavoro del founder. La sync Gmail → Notion succede silenziosamente prima del report, così la pipeline è sempre fresca quando la leggi.

Le **urgenze finanziarie** in cima sono solo per il fuoco vivo: fattura scaduta che blocca cassa, contratto fermo che blocca un closing. Tutto il resto (fatture in scadenza nei prox 7gg, contratti firmati) è EOD.

---

## Note tecniche

- ⚠️ SUPERATO (2026-06-03): l'enumerazione NON usa più `notion-search`. Lo snapshot via API ufficiale
  (`bin/notion_snapshot.py`) fa query strutturate paginate complete. `notion-search` solo per contenuti
  non strutturati (Slack/Gmail/Granola/commenti/KL).
- Roadmap/Backlog globali sono quasi vuoti (step/richieste veri nei DB per-progetto, non ancora nello snapshot).
- **Override clienti attivi**: sezione "Active Clients" in `~/.claude/CLAUDE.md` §5.1 ha precedenza se popolata.
- **Notion delta sweep (step 5)**: usa `last_edited_time` come signal — ricorda che ogni edit (anche micro) lo aggiorna, quindi non considerare ogni delta come "cambio significativo". Filtra rumore: cambi di Status, nuove task, nuovi commenti, Pianifica modificata.
