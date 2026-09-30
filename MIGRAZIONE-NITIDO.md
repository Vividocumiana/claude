# Migrazione: nuovo account Claude per Nitido Studio

Il nuovo account (piano Max) serve soprattutto a **Nitido Studio**, cioè il repo `Vividocumiana/vivido-sites`,
e ai contenuti Nitido. Porta con sé anche il lavoro Vivido: preventivi, contratti, pricing, roundtable e
contesto dei clienti. **Restano su questo account**:

- le routine automatiche del Vivido Assistant (morning, weekly, EOD, log-ingest, reminder, LinkedIn);
- tutto quello che riguarda Nest (non si porta niente).

Tempo stimato: circa 2 ore di configurazione, più mezz'ora di prova.

> Questo repo è **pubblico**: qui c'è solo la checklist. Il file di contesto e gli zip delle skill
> sono stati consegnati a parte e non vanno committati qui (contengono prezzi e dettagli interni).

---

## 1. Account e GitHub (10 min)

- [ ] Crea l'account e attiva il piano Max.
- [ ] Collega GitHub dalle impostazioni di Claude con un utente che ha accesso a `Vividocumiana/vivido-sites`.
- [ ] Controlla che l'app GitHub di Claude sia installata sull'organizzazione `Vividocumiana` con accesso
      a `vivido-sites` (è già installata per questo account; se il nuovo account usa lo stesso utente
      GitHub non serve rifarlo).
- [ ] Apri una sessione su `vivido-sites` e chiedi di leggere `docs/superpowers/stato.md`: se risponde, l'accesso funziona.

## 2. Skill (15 min)

Carica gli zip in Impostazioni → Capabilities → Skills:

| Skill | Perché |
|---|---|
| `nitido-content` | Refocus, caroselli, thread, calendario contenuti. Voce e regole del brand |
| `vivido-prototipo-animato` | Da Figma a prototipo animato (GSAP), verificato e consegnabile |
| `seo-geo` | Audit SEO/GEO dei siti clienti prima e dopo il lancio |
| `frontend-design` | Interfacce web con qualità di design alta. Se il nuovo account la ha già, salta |
| `vivido-pricing` | Prezzi ufficiali e regole di scoping |
| `vivido-proposal-design` | Proposte HTML Layout C per `vivido.world/quotations` |
| `preventivo-pdf` | Il PDF di una pagina che accompagna ogni proposta |
| `vivido-branding` | Brand Vivido per mail e documenti ai clienti |
| `vivido-roundtable` | Workshop → questionario → documento strategico |
| `vivido-notion-task` | Task nel database Tasks di Vivido su Notion |

Le skill standard (pdf, docx, xlsx, pptx, skill-creator, import-memory…) ci sono già su ogni account.
**Non portare**: `vivido-assistant` (le routine restano qui), `dnd-master`, `google-flights`.

## 3. Connettori (15 min)

Ogni connettore si autorizza di nuovo sul nuovo account. Quello vecchio continua a funzionare
(se uno smette, basta riconnetterlo).

| Connettore | Serve per |
|---|---|
| **Figma** | leggere i design e portarli in codice |
| **Notion** | calendario contenuti Nitido, CRM e task Vivido |
| **Granola** | trascrizioni delle call per le proposte (Granola → Claude → proposta) |
| **Gmail** / **Google Calendar** | mail ai clienti e disponibilità per le call |
| **Webflow** | siti clienti ancora su Webflow e pubblicazione delle proposte |
| Google Drive | materiali dei clienti, Google Sheet "Contabilità 2026" |
| Higgsfield / ElevenLabs | immagini e video per i contenuti (opzionale) |
| Mobbin | riferimenti UI (opzionale) |

Slack serve alle routine: si può collegare anche qui, ma le routine non vanno ricreate.

## 4. Ambiente cloud (20 min)

Per lavorare su `vivido-sites` dalle sessioni cloud:

- [ ] **Rete**: accesso a npm/pnpm, `studio.vivido.world`, `*.vercel.app`, `api.vercel.com`.
      Aggiungi Neon, GoDaddy e Resend solo se in cloud si creano siti o si tocca il DNS.
- [ ] **Setup script**: `corepack enable && pnpm install --frozen-lockfile`.
- [ ] **Segreti**. Gli script leggono `.env.segreti` alla radice del repo, che non è in git.
      Scegliete il livello:
      - *Commenti e note* (il lavoro di tutti i giorni): bastano i valori di `segreti.condivisi`
        più `STUDIO_LOGIN` / `STUDIO_PASSWORD` di un utente dello Studio dedicato a Claude.
      - *Creare siti, DNS, database*: le 23 chiavi del file completo (oggi le ha Federico).
      In entrambi i casi mettete i valori come secret dell'ambiente e fate scrivere
      `.env.segreti` al setup script. **Mai incollarli in chat.**
- [ ] Non servono qui: `SLACK_BOT_TOKEN`, `NOTION_TOKEN` del Vivido Assistant, `VIVIDO_BOT_TOKEN`.

## 5. Memoria e contesto (15 min)

- [ ] Incolla `CONTESTO-NITIDO.md` nelle istruzioni del nuovo account, oppure importalo con la skill `import-memory`. È la memoria dell'account Vivido già filtrata: tutto Vivido e Nitido, niente Nest e niente progetti personali.
- [ ] Il contesto tecnico non va copiato: sta già nel repo (`CLAUDE.md`, `README.md`,
      `docs/superpowers/stato.md`) e arriva da solo in ogni sessione.
- [ ] Lo storico delle chat non si trasferisce. Se c'è una conversazione con decisioni importanti
      su Nitido, riassumila in `docs/superpowers/` di `vivido-sites` prima di cambiare account.

## 6. Prova (30 min)

- [ ] Sessione su `vivido-sites`: `pnpm test` passa.
- [ ] `node strumenti/commenti.mjs garzena` legge i commenti dallo Studio (verifica `.env.segreti`).
- [ ] Figma: legge un frame di un file Nitido.
- [ ] `nitido-content`: "fammi un Refocus di prova" produce il formato con № e "Make it nitido."
- [ ] Su questo account non è cambiato niente: le routine continuano ad arrivare su Slack, una volta sola.
