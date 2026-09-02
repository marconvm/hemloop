#!/usr/bin/env bash
# Render the 8 Hemloop voiceover segments from docs/VOICEOVER.md.
# Usage: video/generate-vo.sh [heygen|elevenlabs|elevenlabs-clone]
#   heygen           → video/vo/        (HeyGen starfish voice, with word timestamps)
#   elevenlabs       → video/vo-el/     (ElevenLabs stock voice, or your clone if ELEVENLABS_VOICE_ID is set)
#   elevenlabs-clone → video/vo-clone/  (ElevenLabs, REQUIRES ELEVENLABS_VOICE_ID — your own cloned voice)
set -euo pipefail
cd "$(dirname "$0")/.."
PROVIDER="${1:-heygen}"
ENV_FILE="$HOME/.config/hemloop-video/env"
case "$PROVIDER" in
  heygen) OUTDIR=video/vo ;;
  elevenlabs) OUTDIR=video/vo-el ;;
  elevenlabs-clone)
    OUTDIR=video/vo-clone
    if [ -z "${ELEVENLABS_VOICE_ID:-}" ] && ! grep -qE '^ELEVENLABS_VOICE_ID=' "$ENV_FILE" 2>/dev/null; then
      echo "elevenlabs-clone needs ELEVENLABS_VOICE_ID (run: node video/clone-voice-elevenlabs.mjs first)" >&2
      exit 1
    fi ;;
  *) echo "unknown provider: $PROVIDER" >&2; exit 64 ;;
esac
mkdir -p "$OUTDIR"
for i in 01 02 03 04 05 06 07 08; do
  TEXT=$(awk "/^## VO-$i/{flag=1;next}/^## /{flag=0}flag" docs/VOICEOVER.md | sed '/^$/d' | tr '\n' ' ')
  if [ "$PROVIDER" = "heygen" ]; then
    OUT="$OUTDIR/vo-$i.wav"
    echo "-- VO-$i (${#TEXT} chars) -> $OUT"
    node ~/.claude/skills/media-use/audio/scripts/heygen-tts.mjs "$TEXT" -o "$OUT" --words "$OUTDIR/vo-$i.words.json"
  else
    OUT="$OUTDIR/vo-$i.mp3"
    echo "-- VO-$i (${#TEXT} chars) -> $OUT"
    node video/tts-elevenlabs.mjs "$OUT" "$TEXT"
  fi
done
echo "Done. Files in $OUTDIR/"
