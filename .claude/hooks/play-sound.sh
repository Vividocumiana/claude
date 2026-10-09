#!/usr/bin/env bash
# Hook Claude Code: riproduce un suono quando una task finisce (Stop) o
# quando Claude ha bisogno di te (Notification).
# Cross-platform: macOS, Linux, Windows (Git Bash / WSL).
#
# Suono usato (primo trovato):
#   1. $CLAUDE_SOUND            (variabile d'ambiente, path a mp3/wav)
#   2. ~/.claude/sounds/done.*  (mp3, wav, aiff, ogg)
#   3. .claude/sounds/done.*    nel progetto corrente
#   4. suono di sistema di fallback
# Non blocca mai Claude: parte in background e ignora gli errori.

set +e
EVENT="${1:-stop}"   # "stop" o "notification"

find_sound() {
  if [ -n "${CLAUDE_SOUND:-}" ] && [ -f "$CLAUDE_SOUND" ]; then
    echo "$CLAUDE_SOUND"; return
  fi
  local name="done"
  [ "$EVENT" = "notification" ] && name="notify"
  for dir in "$HOME/.claude/sounds" "${CLAUDE_PROJECT_DIR:-.}/.claude/sounds" "$(dirname "$0")/../sounds"; do
    for ext in mp3 wav aiff aif m4a ogg; do
      [ -f "$dir/$name.$ext" ] && { echo "$dir/$name.$ext"; return; }
    done
  done
  # notify -> fallback su done
  if [ "$name" = "notify" ]; then
    for dir in "$HOME/.claude/sounds" "${CLAUDE_PROJECT_DIR:-.}/.claude/sounds" "$(dirname "$0")/../sounds"; do
      for ext in mp3 wav aiff aif m4a ogg; do
        [ -f "$dir/done.$ext" ] && { echo "$dir/done.$ext"; return; }
      done
    done
  fi
}

SOUND="$(find_sound)"

play() {
  case "$(uname -s)" in
    Darwin)
      if [ -n "$SOUND" ]; then afplay "$SOUND"
      else afplay /System/Library/Sounds/Glass.aiff; fi ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then   # WSL
        if [ -n "$SOUND" ]; then
          WIN="$(wslpath -w "$SOUND" 2>/dev/null)"
          powershell.exe -NoProfile -c "(New-Object Media.SoundPlayer '$WIN').PlaySync()" 2>/dev/null \
            || powershell.exe -NoProfile -c "Add-Type -AssemblyName presentationCore; \$p=New-Object System.Windows.Media.MediaPlayer; \$p.Open('$WIN'); \$p.Play(); Start-Sleep -s 3"
        else powershell.exe -NoProfile -c "[console]::beep(880,300)"; fi
      elif [ -n "$SOUND" ]; then
        command -v ffplay  >/dev/null && ffplay -nodisp -autoexit -loglevel quiet "$SOUND" && return
        command -v mpg123  >/dev/null && mpg123 -q "$SOUND" && return
        command -v paplay  >/dev/null && paplay "$SOUND" && return
        command -v aplay   >/dev/null && aplay -q "$SOUND" && return
        command -v cvlc    >/dev/null && cvlc --play-and-exit -q "$SOUND" && return
        printf '\a'
      else
        command -v paplay >/dev/null && paplay /usr/share/sounds/freedesktop/stereo/complete.oga && return
        printf '\a'
      fi ;;
    MINGW*|MSYS*|CYGWIN*)   # Git Bash su Windows
      if [ -n "$SOUND" ]; then
        WIN="$(cygpath -w "$SOUND" 2>/dev/null || echo "$SOUND")"
        powershell.exe -NoProfile -c "Add-Type -AssemblyName presentationCore; \$p=New-Object System.Windows.Media.MediaPlayer; \$p.Open('$WIN'); \$p.Play(); Start-Sleep -s 3"
      else powershell.exe -NoProfile -c "[console]::beep(880,300)"; fi ;;
    *) printf '\a' ;;
  esac
}

# In background così l'hook ritorna subito e non rallenta Claude
( play >/dev/null 2>&1 & )
exit 0
