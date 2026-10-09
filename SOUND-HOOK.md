# Suono a fine task (hook)

Claude Code riproduce un suono quando finisce una risposta/task (evento `Stop`)
e quando ha bisogno di te, es. richiesta permesso (evento `Notification`).
Funziona in terminale, VS Code, JetBrains e desktop app: gli hook sono di Claude Code,
non dell'editor.

## Installazione globale (consigliata, vale per tutti i progetti)

```bash
bash .claude/hooks/install-sound-hook.sh                 # suono di default
bash .claude/hooks/install-sound-hook.sh ~/Downloads/ding.mp3   # con il tuo mp3
```

Poi riavvia Claude Code. Test manuale: `bash ~/.claude/hooks/play-sound.sh`.

## Solo in questo repo

Già attivo tramite `.claude/settings.json`: niente da fare.

## Usare il tuo mp3

Uno qualsiasi di questi:
- copia il file in `~/.claude/sounds/done.mp3` (o `.wav`, `.aiff`, `.m4a`, `.ogg`);
- `notify.mp3` nella stessa cartella per un suono diverso sulle richieste di permesso;
- metti il file in `.claude/sounds/done.mp3` del progetto;
- oppure `export CLAUDE_SOUND=/percorso/suono.mp3` nel tuo shell profile.

## Compatibilità

| Sistema | Player |
|---|---|
| macOS | `afplay` (nativo) |
| Linux | `ffplay`, `mpg123`, `paplay`, `aplay` o `cvlc` (per mp3 serve ffplay/mpg123/cvlc; wav va con tutti) |
| Windows (Git Bash / WSL) | PowerShell MediaPlayer |

Se nessun player è disponibile fa un beep di sistema. L'hook parte in background e non rallenta Claude.
