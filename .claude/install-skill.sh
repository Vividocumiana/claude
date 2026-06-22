#!/usr/bin/env bash
# SessionStart hook — installa la skill vivido-assistant in ~/.claude/skills/
# Estrae sempre i file da origin/main così ogni run usa il codice aggiornato,
# indipendentemente dal branch su cui gira la sessione.
set -euo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEST="$HOME/.claude/skills/vivido-assistant"

cd "$ROOT"

# Porta i file di skills/ sempre da origin/main (non dal branch corrente)
git fetch origin main --quiet 2>/dev/null || true
git checkout origin/main -- skills/vivido-assistant 2>/dev/null || true

mkdir -p "$HOME/.claude/skills"
rm -rf "$DEST"
ln -s "$ROOT/skills/vivido-assistant" "$DEST"
echo "vivido-assistant: skill installata in $DEST (origin/main)"
