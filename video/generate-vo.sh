#!/usr/bin/env bash
# Generate all 9 Hemloop voiceover segments from docs/VOICEOVER.md.
# Provider: elevenlabs (default) or heygen. Usage: ./generate-vo.sh [elevenlabs|heygen]
set -euo pipefail
cd "$(dirname "$0")/.."
PROVIDER="${1:-elevenlabs}"
mkdir -p video/vo
for i in 01 02 03 04 05 06 07 08; do
  TEXT=$(awk "/^## VO-$i/{flag=1;next}/^## /{flag=0}flag" docs/VOICEOVER.md | sed '/^$/d' | tr '\n' ' ')
  OUT="video/vo/vo-$i.mp3"
  echo "-- VO-$i (${#TEXT} chars) -> $OUT"
  if [ "$PROVIDER" = "heygen" ]; then
    node ~/.claude/skills/media-use/scripts/resolve.mjs --type voice --intent "$TEXT" --project "$PWD/video" 
  else
    node video/tts-elevenlabs.mjs "$OUT" "$TEXT"
  fi
done
echo "Done. Files in video/vo/"
