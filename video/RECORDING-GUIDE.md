# Recording your voice-clone sample (ElevenLabs)

Goal: a clean 1–3 minute sample of YOUR voice so ElevenLabs can build an Instant Voice Clone (IVC) you reuse for Hemloop and every future demo. Plan requirement verified on elevenlabs.io/pricing: **IVC needs the Starter tier** (listed at $6/mo today); **Professional Voice Clone (PVC) needs the Creator tier** ($22/mo, $11 first month promo).

## What to record

Read the eight VO lines in `docs/VOICEOVER.md` (VO-01 … VO-08) in order, naturally, at the pace you would present. That is ~104 s of speech — the exact register the clone will be used for. If you have time, read them twice; more clean minutes = better clone. Then add 30–60 s of you talking freely about Hemloop in your own words so the clone learns your natural cadence, not just read copy.

## Setup (Mac, no extra gear)

- Quiet room, no music, no fan, no keyboard clicks. Phone on silent.
- Built-in mic is fine; an external USB mic is better. Sit 15–25 cm from it, slightly off-axis to avoid plosives.
- QuickTime Player → File → New Audio Recording → quality **Maximum**. Or `rec` / Voice Memos, then export.
- Do a 5-second silent take first; if you hear hiss/hum, move rooms.
- Speak at your normal presenting pace; do not "perform". Pause 1 s between lines. Mistakes: just repeat the line, keep rolling — the clone tolerates it, and you can trim later.

## File format and naming

Convert to mono 44.1 kHz WAV (ElevenLabs accepts mp3/wav; wav avoids double compression):

```sh
mkdir -p video/voice-samples
ffmpeg -i ~/Desktop/take1.m4a -ac 1 -ar 44100 -c:a pcm_s16le video/voice-samples/marco-01.wav
# more takes → marco-02.wav, marco-03.wav …
```

Keep every file under ~10 MB and the total under ~5 minutes for IVC. `video/voice-samples/` is gitignored — nothing here is committed.

## Then

1. Put your ElevenLabs key where the scripts read it (you type this, not the agent):
   `mkdir -p ~/.config/hemloop-video && echo "ELEVENLABS_API_KEY=YOUR_KEY" > ~/.config/hemloop-video/env`
   (key from https://elevenlabs.io/app/settings/api-keys — needs Starter or above)
2. `node video/clone-voice-elevenlabs.mjs` → creates the voice, prints the `voice_id`, appends `ELEVENLABS_VOICE_ID=` to the same env file.
3. `video/generate-vo.sh elevenlabs-clone` → renders the 8 lines with your clone into `video/vo-clone/` to A/B against the HeyGen set in `video/vo/`.

## Later: Professional Voice Clone

For the highest fidelity (recommended once the challenge is over): Creator tier, **30 minutes or more** of clean speech, ideally 1–3 hours, one consistent mic and room, no music. ElevenLabs trains it in a few hours and requires a spoken verification captcha proving the voice is yours. The same `ELEVENLABS_VOICE_ID` mechanism works — just swap the id.
