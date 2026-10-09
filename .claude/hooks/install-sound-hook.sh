#!/usr/bin/env bash
# Installa il suono di fine-task GLOBALMENTE (vale per tutti i progetti,
# terminale, VS Code, JetBrains, desktop app).
#   bash .claude/hooks/install-sound-hook.sh [percorso/al/tuo/suono.mp3]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HOME/.claude/hooks" "$HOME/.claude/sounds"

cp "$HERE/play-sound.sh" "$HOME/.claude/hooks/play-sound.sh"
chmod +x "$HOME/.claude/hooks/play-sound.sh"

if [ -n "${1:-}" ]; then
  ext="${1##*.}"
  cp "$1" "$HOME/.claude/sounds/done.$ext"
  echo "suono personalizzato: ~/.claude/sounds/done.$ext"
elif [ ! -e "$HOME/.claude/sounds/done.wav" ] && [ ! -e "$HOME/.claude/sounds/done.mp3" ]; then
  cp "$HERE/../sounds/done.mp3" "$HOME/.claude/sounds/done.mp3"
  echo "suono di default: ~/.claude/sounds/done.mp3"
fi

SETTINGS="$HOME/.claude/settings.json"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
python3 - "$SETTINGS" <<'PY'
import json, sys
p = sys.argv[1]
s = json.load(open(p))
hooks = s.setdefault("hooks", {})
def add(event, arg):
    cmd = f'bash "$HOME/.claude/hooks/play-sound.sh" {arg}'
    lst = hooks.setdefault(event, [])
    if any(h.get("command") == cmd for g in lst for h in g.get("hooks", [])):
        return
    lst.append({"hooks": [{"type": "command", "command": cmd}]})
add("Stop", "stop")
add("Notification", "notification")
json.dump(s, open(p, "w"), indent=2, ensure_ascii=False)
print(f"hook aggiunti a {p}")
PY
echo "fatto: riavvia Claude Code. Test: bash ~/.claude/hooks/play-sound.sh"
