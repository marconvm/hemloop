#!/usr/bin/env node
// ElevenLabs TTS for the Hemloop demo voiceover.
// Usage: ELEVENLABS_API_KEY=... node tts-elevenlabs.mjs <out.mp3> "text to speak" [voiceId]
// Key: set in your shell or ~/.config/hemloop-video/env (never committed).
// Default voice: "onwK4e9ZLuTAKqWW03F9" (Daniel — calm, mid-pace male). Swap
// with any voice id from https://elevenlabs.io/app/voice-library
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

function loadKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const envFile = `${homedir()}/.config/hemloop-video/env`;
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/ELEVENLABS_API_KEY=(\S+)/);
    if (m) return m[1];
  }
  console.error('No ELEVENLABS_API_KEY. Set it in the environment or in ~/.config/hemloop-video/env');
  process.exit(1);
}

// Voice precedence: CLI arg → $ELEVENLABS_VOICE_ID / env file (your clone) → Daniel.
function loadVoiceId() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  const envFile = `${homedir()}/.config/hemloop-video/env`;
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^ELEVENLABS_VOICE_ID=(\S+)/m);
    if (m) return m[1];
  }
  return 'onwK4e9ZLuTAKqWW03F9';
}
const [out, text, voiceArg] = process.argv.slice(2);
const voiceId = voiceArg || loadVoiceId();
if (!out || !text) {
  console.error('Usage: tts-elevenlabs.mjs <out.mp3> "text" [voiceId]');
  process.exit(1);
}

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': loadKey(), 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 },
  }),
});
if (!res.ok) {
  console.error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log(`wrote ${out}`);
