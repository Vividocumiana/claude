#!/usr/bin/env bash
# Vivido Assistant — helper per inviare messaggi Slack via bot Vivido.
# Usa il bot token del workspace Vivido.
#
# Token (in ordine di precedenza):
#   1. env VIVIDO_BOT_TOKEN   ← usalo negli scheduled agent cloud (secret)
#   2. env SLACK_BOT_TOKEN    ← fallback: nome usato dall'ambiente cloud Vivido
#   3. file vivido-bot.token accanto allo script (uso locale)
#
# Uso:
#   send.sh <channel_id> <text_file_path> [thread_ts]
#   send.sh <channel_id> - [thread_ts]        # legge text da stdin
#
# Stampa lo `ts` del messaggio inviato su stdout (exit 0).
# In caso di errore stampa la risposta API su stderr (exit != 0).

set -euo pipefail

CHANNEL="${1:?usage: send.sh <channel_id> <text_file|-> [thread_ts]}"
TEXT_SOURCE="${2:?usage: send.sh <channel_id> <text_file|-> [thread_ts]}"
THREAD_TS="${3:-}"

if [ -n "${VIVIDO_BOT_TOKEN:-}" ]; then
  TOKEN="$(printf '%s' "$VIVIDO_BOT_TOKEN" | tr -d '\r\n')"
elif [ -n "${SLACK_BOT_TOKEN:-}" ]; then
  TOKEN="$(printf '%s' "$SLACK_BOT_TOKEN" | tr -d '\r\n')"
else
  TOKEN_FILE="$(cd "$(dirname "$0")" && pwd)/vivido-bot.token"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo "ERROR: né env VIVIDO_BOT_TOKEN né file $TOKEN_FILE" >&2
    exit 1
  fi
  TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
fi

if [ "$TEXT_SOURCE" = "-" ]; then
  TEXT="$(cat)"
else
  if [ ! -f "$TEXT_SOURCE" ]; then
    echo "ERROR: file testo non trovato: $TEXT_SOURCE" >&2
    exit 1
  fi
  TEXT="$(cat "$TEXT_SOURCE")"
fi

export VIVIDO_ASSISTANT_TEXT="$TEXT"
PAYLOAD="$(python3 - "$CHANNEL" "$THREAD_TS" <<'PY'
import json, os, sys
channel = sys.argv[1]
thread  = sys.argv[2]
text    = os.environ["VIVIDO_ASSISTANT_TEXT"]
payload = {"channel": channel, "text": text}
if thread:
    payload["thread_ts"] = thread
print(json.dumps(payload, ensure_ascii=False))
PY
)"
unset VIVIDO_ASSISTANT_TEXT

RESPONSE="$(curl -sS -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data "$PAYLOAD")"

OK_VAL="$(printf '%s' "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok'))")"
if [ "$OK_VAL" != "True" ]; then
  echo "ERROR: Slack API: $RESPONSE" >&2
  exit 2
fi

printf '%s' "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ts',''))"
