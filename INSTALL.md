# INSTALL — installare il Vivido Assistant sull'account/macchina Vivido

> Scopo: rendere la skill `vivido-assistant` disponibile a quel Claude e mettere a posto contesto + token.
> Dopo questo, completa la configurazione seguendo `SETUP.md` (connettori, config.json, porting, cron).

## 0. Porta il kit sulla macchina/account Vivido

Scegli UNO:
- **Zip**: copia `vivido-assistant-kit.zip`, poi `unzip vivido-assistant-kit.zip`.
- **Git** (consigliato se userai gli scheduled agents cloud): metti la cartella in un repo privato e clonalo lì.

## 1. Installa la skill

Le skill di Claude Code vivono in `~/.claude/skills/<nome>/SKILL.md`. Copia la cartella:

```bash
mkdir -p ~/.claude/skills
cp -R vivido-assistant-kit/skills/vivido-assistant ~/.claude/skills/

# rendi eseguibili gli script
chmod +x ~/.claude/skills/vivido-assistant/send.sh
chmod +x ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py
```

La skill viene riconosciuta all'avvio successivo di Claude Code (o `/doctor` / riavvio sessione).
Verifica: in una sessione scrivi `/` e cerca `vivido-assistant`, oppure chiedi "quali skill hai".

## 2. Installa il contesto (VIVIDO.md)

Il file `VIVIDO.md` è il "company brain" di Vivido. Mettilo dove Claude lo carica come istruzioni:

```bash
# se l'account Vivido NON ha già un CLAUDE.md globale:
cp vivido-assistant-kit/VIVIDO.md ~/.claude/CLAUDE.md

# se ne ha già uno, NON sovrascrivere: appendi il contenuto di VIVIDO.md in fondo.
```

(In alternativa puoi tenerlo come `CLAUDE.md` di un progetto specifico Vivido invece che globale.)

## 3. Token

- **Locale / test**: crea i due file accanto agli altri (NON committarli):
  ```bash
  printf '%s' 'xoxb-...'  > ~/.claude/skills/vivido-assistant/vivido-bot.token
  printf '%s' 'ntn_...'   > ~/.claude/skills/vivido-assistant/notion.token
  chmod 600 ~/.claude/skills/vivido-assistant/{vivido-bot.token,notion.token}
  ```
- **Cloud (scheduled agents)**: NON usare i file — imposta i secret/env `VIVIDO_BOT_TOKEN` e `NOTION_TOKEN`
  sull'agent (vedi `SETUP.md §5`). Gli script leggono prima l'env, poi il file.

## 4. Verifica rapida

```bash
# Notion: token + DB condivisi con l'integrazione
python3 ~/.claude/skills/vivido-assistant/bin/notion_snapshot.py --probe
# Slack: bot token + canale
echo "test vivido assistant" | bash ~/.claude/skills/vivido-assistant/send.sh <VIVIDO_DM_CHANNEL> -
```

Se entrambi rispondono ok → la base è installata. Prosegui con `SETUP.md` (config.json §2, porting §3, cron §6).

## Nota
La skill funziona **solo dopo** aver compilato `config.json` (DB Notion) e i `<VIVIDO_*>` (vedi `CONFIG.md`).
Senza quelli lo snapshot e la delivery falliscono con errore esplicito (token/DS mancanti), non in silenzio.
