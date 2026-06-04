# Routine: Weekly Report v2 (Company Brain narrative)

Report PM settimanale che in **5 minuti di lettura** dà al founder la visione completa della settimana: cosa è successo davvero (non solo task chiuse), pattern emersi dai suoi POV giornalieri, dove è andato il tempo del team, dove sta la pipeline, e cosa decidere per la nuova settimana.

**Differenza vs v1**: il v1 era una checklist piatta per progetto. Il v2 è un **narrative report** che parte dai 5 Knowledge Log della settimana (POV layer del founder) e ci costruisce sopra coverage operativa, finanziaria e strategica.

**Promessa**: il founder lo legge il lunedì mattina e ha già in testa: "ok, la scorsa settimana è andata X, i temi ricorrenti sono stati Y, su questi 3 progetti devo decidere Z, la nuova settimana spingo su W".

---

## Periodo di riferimento

- **Settimana scorsa** = lunedì → domenica appena conclusi (calcola dal `currentDate`).
- **Questa settimana** = lunedì oggi → domenica prossima.

Indica sempre il numero settimana ISO + le date in formato `lun gg/mm – dom gg/mm` nel titolo.

---

## Team Vivido — owner mapping (CRITICO, aggiornato 2026-05-19)

Per "Carico team" e azioni interne, riferimento `~/.claude/CLAUDE.md` §4.

**Core team interno** (full-time): Samuele (founder + Sales/Growth), Damiano (automazioni execution), Elia (Notion lead).
**Risorse condivise / fractional**: Wagane (automazioni lead, condiviso con SalesMagic), Gabri (fractional GTM advisor), Massimiliano (fractional COO/Ops advisor, attivo dal 25/05/2026).

**Implicazioni per "Carico team"**:
- Mostra le metriche per i 5 membri operativi (Samuele, Dami, Elia, Wagane, Gabri) + Massimiliano se ha task linked.
- Per Wagane, considera che è condiviso con SalesMagic → se task aperte concentrate su lui ma stato fermo, possibile causa = priorità SalesMagic. Flag esplicito.
- Gabri e Massimiliano sono advisor fractional: metti carico anche se basso, è normale.

Nomi cliente (Carlo=Pixlex, Davide Foco=Maoten, Jacopo/Max=Bhom, Anna=Officina38, Andrea=1806, Alessandro Martinengo=SalesMagic) → solo azioni cliente.

---

## Procedura

### -1. Snapshot deterministico (PRIMISSIMO STEP)

Prima di tutto, carica il data layer (contratto in `routines/_data-layer.md`):

```bash
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today <oggi YYYY-MM-DD>
```

Poi `Read` di `cache/snapshot.json`: fonte di verità per enumerazione progetti attivi/partner, TUTTE le task
aperte (con progetto + owner=`Person` risolti), CRM, fatture, contratti. Niente più `notion-search` per enumerare.

### 0. Sweep Knowledge Log della settimana (PRIMO STEP — narrative spine)

Questo è il pilastro del nuovo weekly. I 5 entry del founder (lun-ven della settimana scorsa) sono la voce autentica della settimana — il resto è coverage attorno.

**0A. Recupera tutti gli entry**:
- `notion-search` su `collection://cd50aae4-bcc5-8396-b4c7-0718667ffdb5` ordinato per `Created time` desc, limit 14.
- Filtra entry con `Created time` nella settimana scorsa (lun 00:00 → dom 23:59).
- `notion-fetch` per leggere il `Content` completo di ciascuno.

**0B. Sintetizza in 4 layer**:
- **Decisioni prese**: estrai tutto ciò che è chiaramente una decisione (parole-chiave: "decido", "chiudo", "scelgo", "ok", "vado con", "fermo X"). Raggruppa per progetto / area.
- **Temi ricorrenti**: parole-chiave / clienti / problemi che compaiono in ≥2 entry diversi. Indicano dove la testa del founder è andata di più questa settimana.
- **Flag strategici**: cose che il founder ha esplicitamente segnalato come importanti ("non perdere di vista X", "occhio a Y", "opportunità su Z").
- **Domande aperte**: cose su cui il founder ha riflettuto senza arrivare a una decisione ("non so se", "devo decidere se", "valuto se"). Queste diventano la sezione "Decisioni pendenti" del weekly.

**0C. Edge cases**:
- **Tutti gli entry presenti (5/5)**: massima fedeltà al POV — il report rifletterà fortemente il pensiero del founder.
- **Entry parziali (2-4/5)**: lavora con quelli disponibili, nota in testa `📓 Knowledge Log: <N>/5 giorni compilati`.
- **Zero entry**: nota `⚠️ Zero Knowledge Log della settimana — narrative ricostruita solo da segnali operativi (meno fedele al POV founder)`. Procedi con sola triangolazione operativa.

### 1. Sweep email settimana (comprehensive)

`search_threads` Gmail `after:lun_settimana_scorsa before:lun_oggi`.

Per ogni progetto attivo + ogni lead CRM attivo:
- Conta thread totali, IN/OUT.
- Identifica ultimo OUT del founder e ultimo IN del cliente.
- Calcola **delta ratio**: se OUT >> IN o IN >> OUT → flag squilibrio.
- Estrai **email importanti**: con allegati (probabili contratti/proposte/fatture), con keyword finanziarie ("preventivo", "fattura", "contratto"), con keyword decisionali ("ok", "approvo", "no", "rimando").
- Identifica **clienti silenziosi** = nessuna IN da >7g dopo OUT del founder.
- Identifica **nuovi mittenti** = email da indirizzi non già in CRM/Projects.

Memorizza come "Email sweep layer" → alimenta sezioni progetto + CRM + "Segnali esterni".

### 2. Sweep Granola + Calendar settimana

`list_meetings` `time_range: last_week`. `get_meetings` su ciascuno con transcript.

Per ogni meeting:
- Partecipanti (interni vs esterni).
- Cliente di riferimento (match fuzzy).
- Action items estratti dal transcript.
- Decisioni chiare prese in call.

Inoltre `list_events` Calendar settimana scorsa per:
- **Meeting cancellati** (eventi con status cancelled o spostati di settimana).
- **Meeting interni vs cliente**: ratio del tempo.

Memorizza come "Meeting sweep layer".

### 3. Sweep Notion delta settimana

Per ogni DB rilevante, `notion-search` ordinato `last_edited_time` desc, filtro `last_edited_time >= lun_scorso`:

**A. Tasks** (`collection://91c2817c-74a6-4037-9b28-6849abe2a480`):
- Chiuse questa settimana (`Status = Done` AND `last_edited` nella settimana).
- Riaperte (più difficile da rilevare automaticamente — flag se task `Status = In progress` con `last_edited > created + 7g` e cambiamenti recenti).
- Nuove create (`created_time` nella settimana).
- Rimaste in `Waiting for feedback >5g`.

**B. Roadmap Steps** (`collection://<VIVIDO_DS_ROADMAP>`):
- Chiusi questa settimana.
- Avanzati di stato (e.g. `Non iniziato → In corso`).
- Bloccati nuovi.
- Stagnanti `In corso >7g` (carry-over).

**C. Backlog Richieste** (`collection://<VIVIDO_DS_BACKLOG>`):
- Arrivate questa settimana.
- Approvate questa settimana (convertite in Step?).
- Rifiutate.
- Ferme da valutare >5g.

**D. CRM movements** (`collection://1450aae4-bcc5-8106-9d6c-000b908fed72`):
- Lead nuovi questa settimana.
- Lead avanzati di Status (e.g. `Discovery → Quotation`).
- Lead chiusi `Accepted` / `Lost` / `Partnership`.
- MRR potenziale aggiunto in pipeline.

**E. Invoices** (`collection://8d68a5c8-913a-45a1-8047-11998603e9eb`):
- Emesse questa settimana (`Status: Next/To do → Sent`).
- Pagate questa settimana (`Sent → Payed`, somma €).
- Nuove in arrivo (`created_time` nella settimana).

**F. Contracts** (`collection://5fece0d9-2134-4b16-8b5f-b25dec053631`):
- Inviati (`To send → Sent`).
- Firmati (`Sent → Signed`, somma €).
- Bloccati (`To send > 7g`).

### 3bis. Refresh snapshot progetti (NUOVO — settimanale, alimenta memoria stabile)

Il weekly è il momento canonico per **aggiornare lo snapshot dei progetti** che vive in memoria locale (`reference_nest_active_projects_snapshot.md`). Senza refresh settimanale, lo snapshot diventa stale e le routine giornaliere finiscono per usare info vecchie.

**Procedura**:
1. Enumera progetti dal DB con il multi-round (vedi step 4 sotto), filtra `Status ∈ {"Attivo", "Partner", "Onboarding"}`.
2. Per ogni progetto, `notion-fetch` properties chiave: `Name`, `Status`, `Contract Type`, `MRR`, `Contact Email`, `Client`, `Inizio`, count `Tasks`, count `Timesheet Nest Agency`.
3. **Confronta col snapshot precedente** (`reference_nest_active_projects_snapshot.md`):
   - Nuovi progetti entrati (presenti ora, non prima) → flag `🆕 Nuovo`
   - Progetti usciti (`Status` ora non più Attivo/Partner) → flag `📤 Uscito` con motivo (`Status: Paused/Completato/Not active`)
   - Cambi di `Status` (es. Onboarding → Attivo, Attivo → Paused) → flag `🔄 Cambio status`
   - Cambi di `Contact Email` → flag `📧 Email aggiornata`
   - Cambi di `MRR` significativi (>20% variazione) → flag `💰 MRR cambiato`
4. **Riscrivi il file** `reference_nest_active_projects_snapshot.md` con lo stato corrente + data ultimo refresh.
5. **Nel report weekly**, sezione "Movimenti portfolio" mostra: nuovi, usciti, cambi status, cambi MRR. Se zero movimenti → riga compatta `📁 Portfolio stabile (N progetti)`.

### 4. Enumera progetti attivi + partner + per ciascuno aggrega

Dallo snapshot: `projects[]` con `status ∈ {"Attivo","Partner"}` — enumerazione completa, niente multi-round né retry. Le task di ogni progetto sono `tasks[]` filtrate per `projectId`; owner = `owners[]` (da `Person`).

Per ogni progetto, combina i layer raccolti (KL, email, meeting, Notion delta) in un blocco compatto:
- **Health** 🟢/🟡/🔴 (criteri sotto).
- **Fatto questa settimana**: 2-3 item dai layer (task chiuse + step avanzati + meeting chiave).
- **Cita KL** se il founder ne ha parlato: `_(KL <giorno>: "<estratto>")_`.
- **Prossimo (questa settimana)**: 1-2 milestone dalla Roadmap.
- **Decisione richiesta** (se applicabile): dalla sezione 0B "Domande aperte" o segnali bloccanti.
- **Health Roadmap mini**: `X/Y step chiusi · N in corso · N bloccati · prossimo: <step> (<gg/mm>)`.

### 5. Classifica health progetto (criteri v2 — più ricchi)

- 🟢 **On-track**: zero task in ritardo, attività settimana, nessuno step Bloccato, KL menzioni neutre/positive.
- 🟡 **Attenzione**: 1-2 task in ritardo, OPPURE silenzio cliente 7-10g, OPPURE 1 step Bloccato, OPPURE KL ha menzionato preoccupazioni ricorrenti.
- 🔴 **A rischio**: 3+ task in ritardo, OPPURE silenzio >10g, OPPURE 2+ step Bloccati, OPPURE MRR > 0 con zero delivery settimanale, OPPURE KL ha esplicitamente flaggato il progetto come problema.

**Override KL**: se il founder ha scritto "<cliente> tutto ok, silenzio voluto" → NON marcare 🟡 anche se i segnali operativi lo direbbero. Il POV ha priorità.

### 6. Carico team (NUOVO — visibilità ops)

Per ogni Nest member (Dami, Elia, Massimiliano, Gabri, Wagane):
- Task in corso (dallo snapshot: `tasks[]` con `<member>` in `owners` — owner = `Person`, NON `Assigned`).
- Task chiuse questa settimana: lo snapshot include solo task APERTE; per le chiuse fai una query MCP mirata
  (`Status=Done` AND `last_edited` nella settimana) o ometti la metrica con nota. (TODO: modalità snapshot `--closed`.)
- Bottleneck rilevati (task `Waiting for feedback >5g`, task in ritardo concentrate su una sola persona).
- Carico relativo: se uno è palesemente sovraccarico (>2× la media) → flag.

Output sintetico in 1 riga per persona. Aiuta il founder a vedere chi è il collo di bottiglia operativo.

### 7. Pattern strategici (NUOVO — sintesi cross-progetto dai KL + delta)

Dai layer sezione 0 + 1-3, estrai pattern che attraversano più progetti / aree:

- **Temi ricorrenti**: cosa è apparso in più progetti o più KL? (es. "3 clienti hanno chiesto la stessa cosa", "stesso bottleneck Notion su 2 clienti")
- **Opportunità di scaling**: stesso processo ripetuto su N clienti → candidato SOP?
- **Anti-pattern**: cosa è andato storto in modo simile su più fronti?
- **Lezioni**: cose che il founder ha esplicitamente imparato (dai KL: keyword "ho capito che", "mi sono accorto", "lezione")?

Max 3 pattern, solo se davvero emergenti. Se settimana piatta → omettere sezione.

### 8. Calcola "Top 3 per questa settimana"

NON è una lista di task. È una sintesi di **outcome di business** per la nuova settimana:
- Ricava dai KL (domande aperte) + step Roadmap in scadenza ≤7gg + decisioni pendenti.
- Ogni outcome è formulato come risultato, non come azione (es. "Pixlex SOP delivery firmate", non "completare task X").
- Max 3.

---

## Formato output

```
📊 *Weekly Report — Settimana <ISO>, <anno>*
_Periodo: lun <gg/mm> – dom <gg/mm>_
📓 Knowledge Log: <N>/5 giorni compilati

━━━━━━━━━━ NARRATIVE DELLA SETTIMANA ━━━━━━━━━━
_Sintesi dai tuoi 5 Knowledge Log + sweep operativo._

🎯 *Decisioni prese* (<N>)
• <progetto/area>: <decisione sintetica> _(KL <giorno>)_
• ...

🔁 *Temi ricorrenti*
• <tema 1>: emerso in <N> KL + <N> meeting → <implicazione>
• ...

🚩 *Flag strategici*
• <flag 1> _(KL <giorno>: "<estratto>")_
• ...

❓ *Decisioni ancora pendenti* (<N>)
• <progetto>: <domanda aperta> _(KL <giorno>)_
• ...

━━━━━━━━━━ MOVIMENTI PORTFOLIO ━━━━━━━━━━
_Refresh snapshot vs settimana precedente. Se zero movimenti → riga compatta._

🆕 *Nuovi*: <Cliente> (<Status>, <Contract Type>, MRR €<X>) — <data ingresso>
📤 *Usciti*: <Cliente> → <Paused/Completato/Not active> il <data>
🔄 *Cambi status*: <Cliente> <Status_prima> → <Status_dopo>
📧 *Contact Email aggiornate*: <Cliente> → <nuova email>
💰 *Cambi MRR*: <Cliente> €<X> → €<Y>

(oppure: 📁 *Portfolio stabile* — N progetti, nessun movimento questa settimana.)

━━━━━━━━━━ PORTFOLIO ━━━━━━━━━━
<P> progetti totali · 💼 <A> attivi · 🤝 <P> partner · 🟢 <X> · 🟡 <Y> · 🔴 <Z>

*🔴 A rischio* (<N>)

*<Cliente>* — <motivo 1 riga>
 ✓ Settimana: <fatto 1>; <fatto 2>
 🗺️ Roadmap: <X>/<Y> step · in corso: <step> · 🚫 bloccato: <step>
 ⏭ Questa settimana: <prossimo critico>
 ⚠️ Decidere: <domanda> _(KL <giorno>: "<estratto>")_

*🟡 Attenzione* (<N>)

*<Cliente>* — <motivo>
 ✓ <fatto sintetico>
 ⏭ <prossimo>
 ⚠️ <flag se rilevante>

*🟢 On-track* (<N>)
• *<Cliente>* — <X>/<Y> step · ultimo: <step chiuso> · prossimo: <step> (<gg/mm>)
• ...

━━━━━━━━━━ CRM ━━━━━━━━━━

🆕 *Lead nuovi*: <N> _(<lead 1>, <lead 2>...)_
📈 *Avanzamenti pipeline*: <N> lead avanzati di Status
🎉 *Chiusi*: <N> Accepted (€<MRR>) · <N> Lost · <N> Partnership
💤 *Pipeline calda silente*: <N> lead in Quotation/Quote fu >5g
🔥 *MRR potenziale aggiunto*: €<X>/mese

━━━━━━━━━━ FINANZA SETTIMANALE ━━━━━━━━━━

💰 *Fatture*: <N> emesse · <N> pagate (€<X> incassati)
📜 *Contratti*: <N> firmati (€<Y> valore totale) · <N> bloccati >7g

━━━━━━━━━━ CARICO TEAM ━━━━━━━━━━

• *Wagane*: <N chiuse> · <N in corso> <eventuale flag>
• *Dami*: <N chiuse> · <N in corso>
• *Elia*: <N chiuse> · <N in corso>
• *Gabri*: <N chiuse> · <N in corso>
⚠️ <bottleneck rilevato se applicabile, max 1 riga>

━━━━━━━━━━ NOTION DELTA ━━━━━━━━━━

📋 *Task*: <N chiuse> · <N nuove> · <N in waiting feedback >5g>
🗺️ *Step Roadmap*: <N chiusi> · <N avanzati> · <N bloccati>
📥 *Backlog*: <N arrivate> · <N approvate> · <N rifiutate> · <N ferme>

━━━━━━━━━━ PATTERN STRATEGICI ━━━━━━━━━━
_Solo se ≥1 pattern emergente._

🔁 *<Pattern 1>*: <descrizione 1-2 righe> → <azione/opportunità>
🚧 *<Pattern 2>*: <descrizione> → <azione>

━━━━━━━━━━ TOP 3 PER QUESTA SETTIMANA ━━━━━━━━━━
_Outcome di business, non task. Cosa vuoi raccontare venerdì sera nel KL?_

1. *<Outcome 1>* — _(perché: dal KL <giorno> + step <X> in scadenza <data>)_
2. *<Outcome 2>* — _(perché: ...)_
3. *<Outcome 3>* — _(perché: ...)_
```

**Regole formato**:
- **Massimo 5000 caratteri totali**. Se sfora: ordine di taglio = Notion Delta → Carico team → Finanza → Pattern strategici (mai tagliare Narrative, Portfolio 🔴/🟡, Top 3).
- **Sezione Narrative sempre per prima** dopo il titolo: è la spina dorsale.
- **Per 🔴 e 🟡 sempre** Decisione richiesta se esiste, **citando il KL** se la domanda viene da lì.
- **🟢 max 1 riga per progetto** (compatto).
- **Top 3 = outcome business**, non task. Cita perché (dal KL o dalla Roadmap).
- **Tono**: PM senior che fa il punto del lunedì mattina. Diretto, sintetico, ma non telegrafico. Le sezioni Narrative + Pattern hanno una voce un po' più "riflessiva" delle altre routine.
- **Tutti i link Notion**: mai citare progetto/step/lead senza link.

---

## Consegna

1. Scrivi il testo in `/tmp/vivido-assistant-weekly.md`.
2. `bash ~/.claude/skills/vivido-assistant/send.sh U062VMYTXDL /tmp/vivido-assistant-weekly.md` (DM bot ↔ Samuele).
3. Fallback `send.sh U062VMYTXDL` se fallisce.
4. Rispondi all'utente: `✅ Weekly v2 inviato (🟢<X> 🟡<Y> 🔴<Z> · 📓<KL>/5 KL · ❓<D> decisioni pendenti · 🔁<P> pattern).`

---

## Edge cases

- **Zero KL settimana**: report comunque, ma sezione Narrative diventa solo "Decisioni operative rilevate dai delta" (ricostruita da task chiuse + step avanzati + email rilevanti). Disclaimer in testa.
- **Zero progetti attivi**: errore di enumerazione, report minimale + alert.
- **Zero meeting settimana**: salta sezione Granola, non è un errore (settimana di deep work).
- **Tutti 🟢 + zero pattern + Top 3 vuoti**: tono celebrativo `🎉 Settimana clean. Spazio per spingere su Growth: <suggerimento dai KL trend>`.
- **Granola/Gmail down**: degrade graceful, disclaimer in testa, procedi con solo Notion+KL.
- **Più settimane di KL accumulati** (es. invocato dopo 2 settimane off): nel sweep KL prendi solo la settimana target, ma menziona in coda `ℹ️ <N> KL extra disponibili pre-settimana (non integrati in questo report)`.

---

## Filosofia

Il weekly v1 era una checklist piatta — utile ma generica. Il v2 è un **report narrativo** che parte dal POV del founder (5 entry KL della settimana, scritti via auto-ingest dalle reply EOD) e ci costruisce sopra tre livelli di coverage:

1. **Narrative**: cosa è successo davvero secondo te, sintesi del tuo pensiero settimanale.
2. **Operativo**: portfolio, CRM, finanza, team, Notion delta — tutto quello che è cambiato.
3. **Strategico**: pattern emersi, opportunità di scaling, lezioni — quello che il singolo giorno non vede ma la settimana sì.

I 5 KL sono il valore principale: senza di loro, il report sarebbe solo numeri. Con loro, è una conversazione del founder con sé stesso del lunedì mattina — dove è andata la testa la settimana scorsa, dove deve andare questa.

La sezione **Pattern strategici** è il vero output del weekly: è dove la routine fa il salto da "report" a "insight". Se la settimana è stata piatta, omettila — niente filler.

Il **Top 3** è in fondo apposta: tutto il report serve a costruire quei 3 outcome. Sono il filtro: se non riesci a derivarli dai dati, il report non ha fatto il suo lavoro.
