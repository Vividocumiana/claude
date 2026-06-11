#!/usr/bin/env bash
# SessionStart hook — installa la skill vivido-assistant in ~/.claude/skills/
# così l'agent cloud la trova per nome e i path ~/.claude/skills/vivido-assistant/... funzionano.
set -euo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SRC="$ROOT/skills/vivido-assistant"
DEST="$HOME/.claude/skills/vivido-assistant"
[ -d "$SRC" ] || { echo "vivido-assistant: skill non trovata in $SRC" >&2; exit 0; }
mkdir -p "$HOME/.claude/skills"
rm -rf "$DEST"
ln -s "$SRC" "$DEST"
echo "vivido-assistant: skill installata in $DEST"
