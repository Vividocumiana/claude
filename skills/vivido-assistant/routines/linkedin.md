# Routine: LinkedIn Post Idea Gen — 2 bozze/giorno → Piano Editoriale

> **Routine specifica Vivido.** Tutti i dati vengono dal workspace Vivido: Notion "Vivido World",
> Granola/Gmail/Calendar account `hello@vivido.world`. NON usare collection ID Nest.

Ogni giorno: guarda i **meeting** (Granola) e il resto del materiale reale delle ultime 24h
(Notion + Gmail), genera **2 idee** di post LinkedIn diverse tra loro, e inseriscile come
**2 righe `Bozza`** nel DB Notion **"Piano Editoriale"** (Piattaforma = LinkedIn). Poi manda
una DM Slack al founder con i link alle 2 bozze.

Framework canonico (tono, pillar, hook, struttura, mapping, checklist, few-shot):
`~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md` — **leggilo sempre per primo**.

## Coordinate del DB "Piano Editoriale"

- Database: `27c0aae4bcc582e4b6bc01dd9f7b047a`
- **Data source (parent per la create):** `92b0aae4-bcc5-8326-9483-078b106b51f9`
- Template "Nuovo Post": `bcf0aae4-bcc5-8289-afee-0196a8dd4109` (per riferimento struttura; **non** passarlo a create perché vogliamo iniettare il copy)
- Proprietà rilevanti: `Name` (title), `Status` (status), `Piattaforma` (multi_select), `Pillar` (select), `Formato` (select), `Priorità` (select), `Data pubblicazione` (date).

## Procedura

### 1. Leggi il framework

`Read` di `~/.claude/skills/vivido-assistant/reference/linkedin-content-mining.md`.
Se il file non esiste o è ancora un placeholder → abortisci, manda DM
`⚠️ Framework LinkedIn mancante, skip` e termina.

### 2. Raccolta materiale 24h (in parallelo)

**2a. Granola — meeting ultime 24h (account Vivido)**
- `list_meetings` con `time_range: today`. Se zero, fallback `yesterday`.
- Tieni solo i meeting Vivido (note creator `hello@vivido.world`). Ignora meeting Nest.
- Per ogni meeting → `get_meeting_transcript` se disponibile, altrimenti titolo + partecipanti.
- Estrai: temi, frasi del cliente, decisioni, numeri concreti, pain emersi.

**2b. Notion — attività ultime 24h (workspace Vivido World)**
- `notion-search` con query generica (es. "task progetto cliente aggiornato oggi"), scope
  `page_url: 6850c1bd18aa448d97fe9745f14c8ffc`. NON usare collection ID Nest.
- Cerca: task completate, deliverable consegnati (Blueprint/MVP/Website/Cycles), nuovi clienti
  CRM, note rilevanti delle ultime 24h.

**2c. Gmail — email Vivido ultime 24h**
- `search_threads` con `newer_than:1d` su `hello@vivido.world`.
- Estrai: feedback clienti, decisioni, pain, numeri, frasi significative. Ignora newsletter,
  notifiche automatiche, inviti calendario vuoti.

**2d. Filtro Vivido obbligatorio**
Per ogni pezzo di materiale: "parla di Vivido (Blueprint, MVP, Website, Cycles, clienti startup,
design founder-to-founder)?" Se parla di Nest → scartalo.

### 3. Estrai DUE angoli distinti

Dal materiale, scegli i **2 angoli più ricchi e diversi tra loro** (per pillar e per taglio):
- Idea A e Idea B devono usare **pillar diversi** e **hook diversi** (vedi framework §2-§3).
- Preferisci angoli con numeri concreti (€, ore, %, n° clienti/utenti).
- Una più "founder/personale", una più "valore/insight" è un buon bilanciamento.
- Verifica l'anti-ripetizione su `/tmp/vivido-linkedin-history.jsonl` (framework §7).

**Se il materiale basta solo per 1 idea onesta** → crea 1 sola bozza e dillo nel ping.
**Se il materiale è troppo debole per qualunque post onesto** → skip onesto (§7), non inventare.

### 4. Scrivi le 2 bozze

Per ciascuna idea, applica struttura + hashtag + checklist del framework (§4, §5, §8).
Assegna `Pillar`, `Formato`, `Priorità` e un `Name` interno breve (non l'hook completo).
Riscrivi se una voce non negoziabile della checklist fallisce (max 2 tentativi per idea).

### 5. Crea le pagine in "Piano Editoriale"

Usa `mcp__Notion__notion-create-pages` con **una sola chiamata** per entrambe le idee:

```
parent: { type: "data_source_id", data_source_id: "92b0aae4-bcc5-8326-9483-078b106b51f9" }
pages: [
  {
    icon: "✍️",
    properties: {
      "Name": "<name interno idea A>",
      "Status": "Bozza",
      "Piattaforma": "[\"LinkedIn\"]",
      "Pillar": "<pillar A>",
      "Formato": "<formato A>",
      "Priorità": "<🔴 Alta | 🟡 Media>"
    },
    content: "<corpo Notion-markdown idea A, vedi sotto>"
  },
  { ... idea B ... }
]
```

**Corpo `content`** (replica il template "Nuovo Post", copy dentro code block):

```
# ✍️ Copy
​```
<POST COMPLETO, come va pubblicato, hashtag inclusi>
​```

---

## Fonte
<1 riga: meeting/task/email/evento da cui nasce l'angolo>

## Meta
Pillar: <pillar> · Hook: <tipo hook> · Caratteri: <n>/1300

# ✅ Checklist
- [ ] Copy approvato
- [ ] Grafica/Video pronta
- [ ] Orario confermato
- [ ] Contenuto programmato
```

Note tecniche:
- `Piattaforma` è multi_select → passa una **stringa JSON array** `"[\"LinkedIn\"]"`.
- `Pillar`/`Formato`/`Priorità`/`Status` sono select/status → passa il nome esatto dell'opzione.
- NON impostare `Data pubblicazione` (la decide il founder in revisione).
- NON usare `template_id` (impedirebbe di iniettare il copy).
- Dalla risposta, recupera gli `url` delle 2 pagine create per il ping.

### 6. Aggiorna l'anti-ripetizione

Appendi a `/tmp/vivido-linkedin-history.jsonl` una riga per idea creata:
`{"date":"<oggi>","pillar":"<X>","hook_type":"<Y>","topic":"<breve>"}`.

### 7. Ping Slack al founder

Scrivi `/tmp/vivido-assistant-linkedin.md`:

```
📝 *Idee LinkedIn — <data>* (2 bozze in Piano Editoriale)

1) <Name A> — <pillar A> · <hook A>
   <url pagina A>
2) <Name B> — <pillar B> · <hook B>
   <url pagina B>

_Fonte: <1 riga sul materiale 24h usato>. Le trovi come Bozza nel Piano Editoriale._
```

Invia con il bot Vivido:
```bash
bash ~/.claude/skills/vivido-assistant/send.sh D0634QNLF52 /tmp/vivido-assistant-linkedin.md
```
Se l'invio fallisce → retry una volta dopo 8s, poi logga l'errore nella riga finale e termina
(le bozze Notion restano comunque create).

### 8. Skip onesto

Se al punto 3 il materiale è troppo debole, **non creare pagine**. Manda solo:

```
📝 *LinkedIn — <data>*
Niente materiale forte nelle ultime 24h per 2 post onesti. Skip.
<1 riga su cosa hai guardato: es. "1 meeting Granola + 5 task admin">
```

Meglio skip che bozze generiche.

### 9. Risposta all'utente (CLI)

UNA riga:
- 2 create: `LinkedIn: 2 bozze create in Piano Editoriale (<pillar A> + <pillar B>), ping inviato`
- 1 create: `LinkedIn: 1 bozza creata (materiale per 1 sola idea onesta)`
- skip: `LinkedIn skip — materiale debole`
- errore: `LinkedIn errore: <causa breve>`
