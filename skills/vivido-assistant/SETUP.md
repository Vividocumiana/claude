# Setup — Vivido Assistant

## §5. Bot Vivido + secret `VIVIDO_BOT_TOKEN`

Le routine consegnano via `send.sh`, che cerca il token in quest'ordine: env
`VIVIDO_BOT_TOKEN` → env `SLACK_BOT_TOKEN` → file `vivido-bot.token`. Oggi
esiste solo un `SLACK_BOT_TOKEN` generico usato come fallback — funziona, ma
non è un bot dedicato Vivido Assistant (nome/avatar generici nei messaggi).
Per avere un bot dedicato, servono due passi manuali che nessun tool
disponibile a Claude può eseguire (creazione app Slack e configurazione
secret d'ambiente richiedono login umano):

### Passo A — creare il bot Slack

1. Vai su https://api.slack.com/apps → **Create New App** → **From scratch**.
2. Nome app: `Vivido Assistant`. Workspace: **Vivido World**.
3. **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, aggiungi:
   - `chat:write` (obbligatorio, invio messaggi)
   - `im:write` (apertura DM diretta verso uno user ID la prima volta)
4. **Install to Workspace** (in alto nella stessa pagina) → autorizza.
5. Copia il **Bot User OAuth Token** (inizia con `xoxb-`).
6. Invita il bot alla DM del founder: da Slack, menziona `@Vivido Assistant`
   in un messaggio diretto a Samuele (`U062MREADAB`) una volta, così il bot
   può aprire la conversazione — oppure lascia fare a `im:write` al primo invio.

### Passo B — configurare il secret

Scegli **uno** dei due, a seconda di dove girano gli scheduled agent:

- **Claude Code on the web / scheduled sessions**: nelle impostazioni
  dell'environment (Environment → Environment variables/secrets), aggiungi
  `VIVIDO_BOT_TOKEN` = `xoxb-...` copiato al Passo A5. Le nuove sessioni
  schedulate lo vedranno come env var.
- **Uso locale/interattivo**: salva il token nel file
  `~/.claude/skills/vivido-assistant/vivido-bot.token` (solo testo, nessun
  altro contenuto). Non versionare questo file — resta locale.

Dopo il setup, `send.sh` userà automaticamente `VIVIDO_BOT_TOKEN` al posto
del fallback `SLACK_BOT_TOKEN`, e i messaggi arriveranno col nome/avatar del
bot dedicato invece del bot generico.

### Nota

Finché il Passo A/B non è completato, le routine **continuano a funzionare**
grazie al fallback `SLACK_BOT_TOKEN` — nessuna consegna è bloccata. Questo
setup serve solo per avere un bot dedicato e riconoscibile.
