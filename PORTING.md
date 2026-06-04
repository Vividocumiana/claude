# PORTING — adattamenti manuali residui

Gli **ID** (Notion/Slack/Person) sono già diventati placeholder `<VIVIDO_*>` (vedi `CONFIG.md`).
Restano riferimenti **al team e ai progetti reali di Nest** che il find/replace non può risolvere
perché dipendono dal contesto Vivido. Vanno sistemati a mano (o fatti sistemare dall'altro Claude
dandogli `VIVIDO.md` compilato). Sotto, raggruppati per tema, con i punti precisi.

> Il modo più veloce: compila bene `VIVIDO.md` (team + progetti Vivido), poi chiedi all'altro Claude
> *"adatta le routine in `skills/vivido-assistant/routines/` sostituendo team e progetti Nest con quelli
> di Vivido in VIVIDO.md, e rimuovendo i riferimenti a file/processi Nest che non esistono per Vivido"*.

---

## 1. Owner mapping team (morning, eod, weekly, _data-layer)

Le routine citano il team Nest: **Dami, Elia, Wagane, Gabri, Massimiliano** e la tabella "tipo lavoro → owner"
(Notion→Elia, Automation→Wagane, Sales→Gabri). Sostituisci con il **team reale di Vivido**.

- `morning.md` righe ~21-29 (tabella owner mapping)
- `eod.md` righe ~30-36, ~150-162, ~190, ~233, ~278-282, ~338
- `weekly.md` righe ~22-32, ~175, ~278-281
- `_data-layer.md` riga ~52 (lista nomi completi attesi da `Person`)

Se Vivido è solo Samuele (+1) → semplifica: togli la tabella owner e lascia "owner = chi è in `Person`".

## 2. Nomi cliente / progetti (eod, morning, weekly, log-ingest, linkedin)

Esempi e mapping nome→referente sono Nest (**Pixlex, Maoten, Bhom, Officina38, 1806, SalesMagic**;
Carlo/Davide Foco/Max/Anna/Andrea). Vanno sostituiti coi clienti Vivido o resi generici.

- `eod.md`: riga ~39 (mapping referenti), ~78-79, ~90, **~102 (safety-net "<5 progetti" + lista nominale Nest — sostituisci la soglia e i nomi con i progetti Vivido, o togli il safety-net)**, ~121, ~209, ~299, ~334.
- `morning.md`: ~32, ~51, ~98-99, ~103 (esempio SalesMagic), ~180 (Partner Pixlex/SalesMagic), ~264-266, ~432, ~445.
- `weekly.md`: ~32, ~199.
- `log-ingest.md`: ~69, ~73, ~86, ~94, ~105, ~175 — **solo esempi** dentro alle istruzioni di sintesi; innocui ma meglio sostituirli con esempi Vivido per non confondere il modello.
- `linkedin.md`: ~60 (clienti-reference citabili: Virginia/Officina38/SalesMagic/Harvest → metti i reference Vivido).

## 3. Modello progetto v1/v2 / Roadmap-Step (morning, eod)

Le routine assumono il modello Nest a 3 livelli (Roadmap Step + Backlog + Tasks) e distinguono progetti
"v1" (solo Tasks) da "v2". Se Vivido **non** usa Roadmap/Step:
- lascia vuote le chiavi `roadmap`/`backlog` in `config.json`;
- in `morning.md` (~51, ~432) ed `eod.md` (~334) togli/ignora la logica Step e tieni solo la triangolazione su Tasks.

## 4. Riferimenti a processi / file Nest che per Vivido non esistono

- `morning.md` ~55 (**GTM Toolkit / Proposta Nest / Dashboard Processi**) → rimuovi o sostituisci coi materiali Vivido (Blueprint, mini-audit, playbook outbound).
- `morning.md` ~465 e `weekly.md` ~22 → riferimenti a `~/.claude/CLAUDE.md §5.1/§4`: ora il contesto è in `VIVIDO.md`, allinea i numeri di sezione.
- `weekly.md` ~139-150 → il weekly riscrive `reference_nest_active_projects_snapshot.md` (file memory Nest). Per Vivido o crei l'equivalente `reference_vivido_active_projects_snapshot.md` o rimuovi questo step.
- `morning.md` ~145 → hardcoded Slack channel `C0B5ZEB0AS3` (Group DM Nest strategico). Rimuovi o sostituisci con un canale Vivido se esiste.

## 5. Knowledge Log — Person mapping (log-ingest)

`log-ingest.md` step 5 mappa sender→Notion UUID (Samu/Dami). Aggiorna con i `<VIVIDO_PERSON_*>` reali
(vedi CONFIG). Riga ~48 cita il flusso `nest-dami-log-ingest` per altri membri — rimuovi se a Vivido
risponde solo Samuele.

## 6. linkedin.md — note residue

È già la routine Vivido. Restano frasi che spiegano la differenza Nest/Vivido (righe ~3, ~9, ~36, ~45,
~140): sono **istruzioni corrette** (dicono "non usare dati Nest") — puoi lasciarle, servono come guard-rail.
Verifica solo che ~140 non confonda: ora `send.sh` **è** il bot Vivido (nel kit l'abbiamo unificato), quindi
la frase "NON usare send.sh (è il bot Nest)" va aggiornata in "usa send.sh (bot Vivido)".

## 7. /tmp e history file

Innocui: i temp file sono già `/tmp/vivido-assistant-*` e l'history LinkedIn è `vivido-linkedin-history.jsonl`.
Nessuna azione.

---

### Checklist finale prima del go-live
- [ ] `config.json` compilato (almeno projects/tasks/knowledge_log)
- [ ] tutti i `<VIVIDO_*>` di Slack/Person sostituiti (grep `grep -rn '<VIVIDO_' .` deve tornare vuoto, a parte i DB lasciati a config)
- [ ] team Nest → team Vivido (§1)
- [ ] clienti Nest → clienti Vivido o generici (§2)
- [ ] riferimenti file/processi Nest rimossi (§4)
- [ ] framework LinkedIn reale in `reference/linkedin-content-mining.md` (ora è placeholder)
- [ ] `VIVIDO.md` in `~/.claude/CLAUDE.md` dell'account Vivido
