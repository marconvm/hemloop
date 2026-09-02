#!/usr/bin/env node
// Create an ElevenLabs Instant Voice Clone from video/voice-samples/*.wav|mp3.
// Usage: node video/clone-voice-elevenlabs.mjs ["Voice name"]
// Key is read from $ELEVENLABS_API_KEY or ~/.config/hemloop-video/env and is
// never printed. On success the voice_id is appended to that env file as
// ELEVENLABS_VOICE_ID=... so tts-elevenlabs.mjs picks it up by default.
// API (verified 2026-09): POST https://api.elevenlabs.io/v1/voices/add
// multipart: name (required), files (required, repeatable), description,
// remove_background_noise, labels → { voice_id, requires_verification }.
import { readFileSync, readdirSync, existsSync, appendFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const ENV_FILE = `${homedir()}/.config/hemloop-video/env`;
const SAMPLES_DIR = join(process.cwd(), 'video', 'voice-samples');

function loadKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  if (existsSync(ENV_FILE)) {
    const m = readFileSync(ENV_FILE, 'utf8').match(/^ELEVENLABS_API_KEY=(\S+)/m);
    if (m) return m[1];
  }
  console.error(
    `No ELEVENLABS_API_KEY. Run this yourself (never paste the key to an agent):\n` +
      `  mkdir -p ~/.config/hemloop-video && echo "ELEVENLABS_API_KEY=YOUR_KEY" > ${ENV_FILE}`,
  );
  process.exit(1);
}

const name = process.argv[2] || 'Marco Cheung';
const files = existsSync(SAMPLES_DIR)
  ? readdirSync(SAMPLES_DIR).filter((f) => /\.(wav|mp3|m4a)$/i.test(f)).sort()
  : [];
if (files.length === 0) {
  console.error(`No samples in ${SAMPLES_DIR}. See video/RECORDING-GUIDE.md.`);
  process.exit(1);
}
const key = loadKey(); // resolved after the samples check so the missing-samples message is not masked

const form = new FormData();
form.append('name', name);
form.append('description', 'Marco Cheung — presenter voice for Hemloop and product demos (own voice, consented).');
form.append('remove_background_noise', 'true');
form.append('labels', JSON.stringify({ use: 'demo-narration', owner: 'marco' }));
let total = 0;
for (const f of files) {
  const p = join(SAMPLES_DIR, f);
  total += statSync(p).size;
  const type = /\.wav$/i.test(f) ? 'audio/wav' : /\.mp3$/i.test(f) ? 'audio/mpeg' : 'audio/mp4';
  form.append('files', new Blob([readFileSync(p)], { type }), basename(f));
}
console.log(`Uploading ${files.length} sample(s), ${(total / 1e6).toFixed(1)} MB, as "${name}" …`);

const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
  method: 'POST',
  headers: { 'xi-api-key': key },
  body: form,
});
if (!res.ok) {
  let detail = await res.text();
  try {
    const j = JSON.parse(detail);
    detail = j.detail?.message ?? j.detail ?? detail;
    if (typeof detail !== 'string') detail = JSON.stringify(detail);
  } catch {}
  console.error(`ElevenLabs ${res.status}: ${String(detail).slice(0, 400)}`);
  if (res.status === 401 || res.status === 403) console.error('Check the key and that your plan includes Instant Voice Cloning (Starter+).');
  process.exit(1);
}
const { voice_id: voiceId, requires_verification: rv } = await res.json();
if (!voiceId) {
  console.error('No voice_id in response');
  process.exit(1);
}
console.log(`voice_id: ${voiceId}${rv ? '  (requires_verification=true — complete it in the ElevenLabs app)' : ''}`);

const line = `ELEVENLABS_VOICE_ID=${voiceId}\n`;
const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
if (/^ELEVENLABS_VOICE_ID=/m.test(existing)) {
  console.log(`ELEVENLABS_VOICE_ID already present in ${ENV_FILE}; not overwriting. New id above if you want to switch.`);
} else {
  appendFileSync(ENV_FILE, (existing && !existing.endsWith('\n') ? '\n' : '') + line);
  console.log(`Appended ELEVENLABS_VOICE_ID to ${ENV_FILE}`);
}
