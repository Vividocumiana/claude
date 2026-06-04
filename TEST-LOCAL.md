# TEST-LOCAL — provare il Vivido Assistant sul tuo Mac (2 min)

> Perché sul Mac e non da Claude web: l'ambiente cloud web ha una **network policy** che blocca
> `api.notion.com` e `slack.com` (test fatto: HTTP 403 "Host not in allowlist"). Quindi `notion_snapshot.py`
> e `send.sh` **non girano da lì**. Sul tuo Mac non c'è quel blocco. Per i 6 scheduled agent cloud serve
> invece un ambiente con una network policy che includa quei due host (vedi `SETUP.md §6`).

## Valori già verificati (dal workspace Vivido World)
- DB mappati in `skills/vivido-assistant/config.json` — Projects / Tasks / Knowledge log / Sales CRM / Clienti / Invoices / Contracts.
- Founder Notion person: `09ff0769-85fd-4a7e-a637-b8164b9c3c5b`
- Founder Slack user: `U062VMYTXDL` · DM channel: `D0634QNLF52`
- Timezone: `Europe/London`

## Passi

### 1. Installa la skill (segui anche `INSTALL.md`)
```bash
mkdir -p ~/.claude/skills
cp -R skills/vivido-assistant ~/.claude/skills/
chmod +x ~/.claude/skills/vivido-assistant/send.sh ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py
cp VIVIDO.md ~/.claude/CLAUDE.md   # o appendi se ne hai già uno
```

### 2. Token (NON committarli — restano solo in locale)
```bash
printf '%s' 'ntn_…'  > ~/.claude/skills/vivido-assistant/notion.token
printf '%s' 'xoxp-…' > ~/.claude/skills/vivido-assistant/vivido-bot.token
chmod 600 ~/.claude/skills/vivido-assistant/*.token
```
> Nota: il token Slack `xoxp-…` (User token) funziona — posta come te. Per un'identità bot separata
> servirebbe un `xoxb-…`.

### 3. Prerequisito Notion: condividi i DB con l'integrazione
Per OGNI DB (Projects, Tasks, Knowledge log, Sales CRM, Clienti): in Notion `•••` → **Connections** →
aggiungi l'integrazione **Vivido Assistant**. Senza questo lo snapshot torna 0 righe / 404.

### 4. Test data-layer (Notion)
```bash
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --probe
# atteso: "PROBE tasks: N righe lette" con N > 0 e nessun errore
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --today 2026-06-04
# scrive cache/snapshot.json + snapshot.md → aprilo e controlla progetti/task/CRM
```

### 5. Test delivery (Slack)
```bash
echo "test vivido assistant" | bash ~/.claude/skills/vivido-assistant/send.sh D0634QNLF52 -
# atteso: stampa un ts e ti arriva il messaggio in DM
```

### 6. Test routine end-to-end
In una sessione Claude Code sul Mac (con i connettori MCP Notion/Slack/Gmail/Calendar attivi):
`vivido-assistant morning` → poi `eod`, `log-ingest`, `weekly`, `linkedin`.

## Se qualcosa non torna
- `403 Host not in allowlist` → sei ancora in un ambiente con egress ristretto, non sul Mac.
- `tasks: 0 righe` senza errore → DB non condivisi con l'integrazione (passo 3).
- Task "senza progetto" → alcune task usano la relazione `Collaborator Project` invece di `Vivido Project`
  (lo snapshot legge `Vivido Project`); è atteso, non un crash.
