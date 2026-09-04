/**
 * Rasterise the shared Hemloop mark into favicon.ico (16/32/48) and
 * public/logo-loop.gif (256px, transparent, looping). Geometry matches
 * public/logo.svg / favicon.svg: ring r=11 at (16,16), dot r=3.5 on the ring.
 *
 * Usage: node scripts/render-logo-assets.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const toIco = require('to-ico');

const ROOT = join(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');
const TMP = join(ROOT, '.tmp-logo-frames');

const INK = '#17211c';
const LIME = '#b9f227';
const RING_R = 11;
const DOT_R = 3.5;
const CX = 16;
const CY = 16;
/** Dot centre sits on the ring path (top = rest frame). */
const ORBIT_R = RING_R;

function frameSvg(size, angleDeg, { transparent }) {
  const rad = ((angleDeg - 90) * Math.PI) / 180; // 0° = top
  const dx = CX + ORBIT_R * Math.cos(rad);
  const dy = CY + ORBIT_R * Math.sin(rad);
  const bg = transparent
    ? ''
    : `<rect width="32" height="32" fill="#fbfaf5"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  ${bg}
  <circle cx="${CX}" cy="${CY}" r="${RING_R}" fill="none" stroke="${INK}" stroke-width="2"/>
  <circle cx="${dx}" cy="${dy}" r="${DOT_R}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>
</svg>`;
}

async function pngFromSvg(svg, size) {
  return sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'fill' })
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(TMP, { recursive: true });

  // favicon.ico — static top-dot frame at 16 / 32 / 48
  const staticSvg = frameSvg(48, 0, { transparent: true });
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) {
    const buf = await pngFromSvg(frameSvg(s, 0, { transparent: true }), s);
    pngs.push(buf);
    writeFileSync(join(TMP, `favicon-${s}.png`), buf);
  }
  const ico = await toIco(pngs);
  writeFileSync(join(PUBLIC, 'favicon.ico'), ico);
  console.log('wrote public/favicon.ico (16/32/48)');

  // logo-loop.gif — 256px, 20 frames, 2.5s → 125ms/frame
  const gifSize = 256;
  const frames = 20;
  const paths = [];
  for (let i = 0; i < frames; i++) {
    const angle = (i / frames) * 360;
    const buf = await pngFromSvg(
      frameSvg(gifSize, angle, { transparent: true }),
      gifSize,
    );
    const path = join(TMP, `frame-${String(i).padStart(3, '0')}.png`);
    writeFileSync(path, buf);
    paths.push(path);
  }

  const palette = join(TMP, 'palette.png');
  const gifOut = join(PUBLIC, 'logo-loop.gif');
  const delayCs = 12; // centiseconds ≈ 120ms; 20*120ms = 2.4s ≈ 2.5s orbit

  let r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(100 / delayCs),
      '-i',
      join(TMP, 'frame-%03d.png'),
      '-vf',
      'palettegen=reserve_transparent=1',
      '-update',
      '1',
      palette,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    process.exit(1);
  }
  r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(100 / delayCs),
      '-i',
      join(TMP, 'frame-%03d.png'),
      '-i',
      palette,
      '-lavfi',
      'paletteuse=alpha_threshold=128',
      '-loop',
      '0',
      gifOut,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    process.exit(1);
  }
  console.log('wrote public/logo-loop.gif (256px loop)');

  // Keep a static reference PNG from the same geometry (optional debug).
  writeFileSync(join(TMP, 'static.svg'), staticSvg);
  console.log('geometry check: ring r=11 @16,16; dot r=3.5; orbit r=11');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
