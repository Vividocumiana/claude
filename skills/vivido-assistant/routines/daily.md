# Routine: Daily brief (8:00) — 3 audience

Brief del mattino, **tre versioni** con focus diverso, generate dallo stesso snapshot:
1. **Samuele — Growth**: KPI sales/scorecard + pipeline (lead per nome) + economics progetti + capacità team. Sintetico, numerico, nomi veri.
2. **Federico — Ops & Delivery**: carico team (task + ore), salute/deadline progetti, polso team dal Knowledge Log.
3. **Team member** (per persona): le SUE task, dirette, con respiro settimanale + bussola dal KL di Federico.

Stile comune: **sintetico e denso, con entità nominate** (lead per nome+stage, progetti per nome+stato+segnale, persone con numeri). Niente prosa. Max 1 riga 🔴 d'indirizzo per brief. Italiano.

---

## 0. Data layer (PRIMO step)

```bash
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today <oggi YYYY-MM-DD>
```
Poi `Read` di `~/.claude/skills/vivido-assistant/cache/snapshot.json`. Campi usati:
- `scorecard.current` → KPI sales del mese (Revenue, Revenue Target, MQL, MQL Target, SQL, Proposals Sent/Value, Deals Won/Lost, Close Rate %, Win Rate %, CAC, ROAS, Pod MRR, Marketing Spend). `scorecard.all` per il trend mesi precedenti.
- `crm[]` → pipeline (name, status, nextAction, nextActionDate, mrr).
- `projects[]` → attivi (name, status, mrr, contractType, finePrevista).
- `tasks[]` → owner reali (relazione Team Member), `bucket` (today/overdue/soon/ghost/no_due), `status`, `projectName`.
- `team_ore[]` → per membro: target, ore, util, workload (mese corrente).
- Knowledge Log via MCP `notion-search` su `collection://cd50aae4-bcc5-8396-b4c7-0718667ffdb5` (ordine Created time desc).

**Degrada e segnala** (regola): dove un dato è vuoto, scrivilo in 1 riga e prosegui col resto. Mai bloccare.
- `team_ore` tutto a 0 / `ore`=0 → `ore <mese> non loggate (timesheet da compilare)`.
- Knowledge Log vuoto → `polso team: KL vuoto`.
- `scorecard.current` assente → `scorecard <mese> non compilata` e usa solo pipeline live.

---

## 1. Aggregazioni da calcolare (dallo snapshot)

- **Lead caldi** = `crm[]` con `status ∈ {Discovery Call, Quotation, Follow up, Negotiation, Rewind Call, Partnership}`. Raggruppa per stage, elenca i **nomi**. Nurturing pool = count `status==Nurturing`. Follow-up datati in ritardo = `nextActionDate < oggi` con azione reale e status ≠ Nurturing.
- **MQL→SQL %** = `scorecard.SQL / scorecard.MQL` (flag se basso). **Run-rate/trend** = confronto con `scorecard.all` dei 1-2 mesi precedenti (vs Target %).
- **Delivery/MRR**: `projects[]` attivi (status ∉ Completed/Expired/To Be Payed) con `mrr`. Per ogni progetto, segnale dalle task: vive (`bucket∈{today,overdue}`), waiting (`status=='Waiting for feedback'`), ghost (`bucket=='ghost'`). Progetto "a rischio" se waiting≥2 o ghost≥2 o vive≥2.
- **Carico team**: raggruppa `tasks[]` per `owners[]` → per persona {tot, vive, waiting, ghost}. + `team_ore` per ore/util. Task senza owner = `owners==["(nessun owner)"]`.

---

## 2. Brief 1 — 💰 Samuele · Growth → DM `slack.founder_dm`

```
💰 Growth — <ggset gg mese>

📊 <Mese> MTD: Revenue €<X>/€<T> · MQL <n>/<t> <🟢/🟡/🔴> · SQL <n> · Proposte <n> (€<val>) · <won> won
   ⚠️ MQL→SQL <%> — <lettura 1 riga: dove si rompe>   (ometti se sano)

🔥 Pipeline calda (<N>):
• Quotation (<n>): <nome> · <nome> · …
• Negotiation (<n>): <nome> · …
• Follow up: <nome> · …   • Discovery: <nome>
🌱 <n> nurturing · follow-up in ritardo <n>

🏗️ Delivery (€<MRR>/mese): <Cliente> €<mrr> · <Cliente> €<mrr> …
   A rischio: <Cliente> (<segnale>) · <Cliente> (<segnale>)
   Ore <mese>: <util medio / "0 loggate → capacità cieca">

💸 <n> fatture da incassare
🔴 Oggi: <una mossa che muove il numero>
```
- I nomi dei lead vengono da `crm[].name`. Se `mrr` del lead è valorizzato, aggiungi `€<mrr>` accanto.
- Tono agentico **solo** nelle 2 righe ⚠️/🔴: connetti i segnali, non editorializzare il resto.

## 3. Brief 2 — 🛠️ Federico · Ops & Delivery → DM `slack.federico_dm`

```
🛠️ Ops — <ggset gg mese>

🧭 <N> progetti attivi · €<MRR>/mese · <T> task aperte · <NO> senza owner · <G> ghost
🧠 Polso team: <estratto ultimo KL / "KL vuoto"> · ore <mese> <util/"0 loggate">

👥 Carico (task · vive · waiting · ghost):
• <Nome> <tot> · <vive> · <wait> · <ghost>   (una riga per membro, ⚠️ se wait/ghost alti)
• 🚧 <NO> task SENZA owner → assegnare

🚦 Progetti a rischio:
• <Cliente> — <vive/wait/ghost>   • <Cliente> — <…>
📦 Backlog grossi: <Progetto> (<n>) · …

📅 Deadline: <task/step due <data>, owner> · …
🔴 Oggi: <collo di bottiglia da sbloccare>
```

## 4. Brief 3 — 👋 Team member (per persona)

Per ogni membro in `slack.team` con almeno 1 task aperta. Filtra `tasks[]` per `owners` contiene il nome.
```
👋 <Nome> — <ggset gg mese>
📌 Da Federico (KL): <estratto ultimo punto di Federico / "—">
🎯 Oggi (<n>): <task — progetto>
🔴 In ritardo (<n>): <task — Ng>
⏳ Aspetti feedback (<n>): <task> → chiedi lo sblocco
🪦 Ferme >14g (<n>): <task> · …
📅 Questa settimana (<n>): <task due ≤ domenica>
🗂️ Progetti tuoi: <Progetto>(<n>) · …
💬 <1 nudge>
```

---

## 5. Consegna

Scrivi ogni brief in `/tmp/vivido-daily-<chi>.md`, poi:
```bash
bash ~/.claude/skills/vivido-assistant/send.sh <slack_id> /tmp/vivido-daily-<chi>.md
```
- **Samuele** → `slack.founder_dm` (sempre).
- **Federico** → `slack.federico_dm` (sempre).
- **Team member** → SOLO se `slack.team_broadcast == true`: invia a ogni `slack.team[<nome>]`. Se `false` (default fase test): **non** inviare ai membri; genera il brief di **Nicolas** e invialo a `slack.founder_dm` come anteprima (header `[anteprima <Nome>]`).

Retry 8s sullo stesso `send.sh` in caso di errore di rete.

Rispondi all'utente in 1 riga: `✅ Daily inviato — Samuele (Growth) · Federico (Ops) · team: <broadcast on/off>`.

---

## Edge cases
- Snapshot fallito → disclaimer `⚠️ snapshot non disponibile` e brief minimale da MCP.
- Slack down → log errore e termina (i brief restano in `/tmp`).
- Nessuna task per un membro → niente brief per lui (non inviare DM vuote).
