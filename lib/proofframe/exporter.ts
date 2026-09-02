// Standalone HyperFrames composition exporter.
// Contract (hyperframes-core): root <div data-composition-id> directly in
// <body> (no <template>), explicit sized box, clips as DIRECT children with
// class="clip" + data-start/data-duration/data-track-index, and exactly one
// paused GSAP timeline registered synchronously at window.__timelines[id].
// Deterministic: no clocks, no randomness, no network, finite tweens only.
import type { CampaignState, Scene } from './types';
import { BRAND } from './brand';
import { validateCampaign } from './validator';

const COMPOSITION_ID = 'proofframe';
const GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
const ID_RE = /^[a-z][a-z0-9-]*$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Allowlist CSS colours before they enter the exported <style> block.
// PF2-1 defence in depth: even if an unadvertised style value reaches here,
// only a strict colour token can pass — no `</style>`/`<script>` breakout.
const CSS_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|[a-zA-Z]{1,20})$/;
function safeColor(value: string | undefined, fallback: string): string {
  return value && CSS_COLOR_RE.test(value.trim()) ? value.trim() : fallback;
}

// PF4-1: the base CampaignState style is interpolated into body, footer and
// every scene rule, and is the fallback for scene overrides — so it must be
// allowlisted too, with hardcoded safe defaults as the final fallback.
const SAFE_BASE = { background: '#101418', ink: '#f4f1ea', accent: '#ff7a45' } as const;
function safeBase(style: CampaignState['style']): CampaignState['style'] {
  return {
    background: safeColor(style?.background, SAFE_BASE.background),
    ink: safeColor(style?.ink, SAFE_BASE.ink),
    accent: safeColor(style?.accent, SAFE_BASE.accent),
  };
}

function sceneCss(scene: Scene, base: CampaignState['style']): string {
  const bg = safeColor(scene.style?.background, base.background);
  const ink = safeColor(scene.style?.ink, base.ink);
  const accent = safeColor(scene.style?.accent, base.accent);
  return `#${scene.id} { background: ${bg}; color: ${ink}; }
#${scene.id} .accent { color: ${accent}; }`;
}

/**
 * Export the campaign as a self-contained HyperFrames HTML document.
 * Throws if the campaign fails claim validation — a non-compliant
 * composition must not exist as a file.
 */
export function exportComposition(state: CampaignState): string {
  const violations = validateCampaign(state);
  if (violations.length > 0) {
    throw new Error(
      `Cannot export: ${violations.length} claim violation(s). First: ${violations[0].message}`,
    );
  }
  if (state.scenes.length === 0) throw new Error('Cannot export: no scenes.');
  for (const s of state.scenes) {
    if (!ID_RE.test(s.id))
      throw new Error(`Invalid scene id "${s.id}" (need ${ID_RE}).`);
  }

  const { width, height, fps } = state.format;
  const total = state.scenes.reduce((sum, s) => sum + s.durationSec, 0);
  const base = safeBase(state.style);

  let cursor = 0;
  const placed = state.scenes.map((scene, i) => {
    const start = cursor;
    cursor += scene.durationSec;
    return { scene, start, track: i + 1 };
  });

  const clips = placed
    .map(
      ({
        scene,
        start,
        track,
      }) => `      <section id="${scene.id}" class="clip scene scene-${escapeHtml(scene.kind)}"
        data-start="${start}" data-duration="${scene.durationSec}" data-track-index="${track}">
        <h1 id="${scene.id}-h">${escapeHtml(scene.heading)}</h1>
        <p id="${scene.id}-b" class="accent">${escapeHtml(scene.body)}</p>
      </section>`,
    )
    .join('\n');

  const tweens = placed
    .map(
      ({
        scene,
        start,
      }) => `      tl.from("#${scene.id}-h", { y: 64, opacity: 0, duration: 0.6, ease: "power3.out" }, ${(start + 0.1).toFixed(2)});
      tl.from("#${scene.id}-b", { y: 32, opacity: 0, duration: 0.5, ease: "power2.out" }, ${(start + 0.35).toFixed(2)});`,
    )
    .join('\n');

  // The disclaimer is not a clip: it is force-rendered for the full duration.
  // Agents cannot remove it because no tool writes this element.
  const footer = state.facts.disclaimer
    ? `      <footer id="proofframe-disclaimer">${escapeHtml(state.facts.disclaimer)}</footer>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>${escapeHtml(state.facts.productName)} — ${BRAND.name} promo</title>
    <script src="${GSAP_SRC}"></script>
    <style>
      body { margin: 0; background: ${base.background}; font-family: Inter, system-ui, sans-serif; }
      #root { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; }
      .clip { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 24px; text-align: center; padding: 0 72px; }
      .scene h1 { margin: 0; font-size: ${Math.round(height * 0.05)}px; line-height: 1.1; }
      .scene p { margin: 0; font-size: ${Math.round(height * 0.028)}px; }
      #proofframe-disclaimer { position: absolute; left: 0; right: 0; bottom: ${Math.round(height * 0.02)}px; text-align: center; font-size: ${Math.round(height * 0.012)}px; color: ${base.ink}; opacity: 0.75; }
${state.scenes.map((s) => sceneCss(s, base)).join('\n')}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${COMPOSITION_ID}" data-start="0"
      data-width="${width}" data-height="${height}" data-duration="${total}" data-fps="${fps}">
${clips}
${footer}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${tweens}
      window.__timelines["${COMPOSITION_ID}"] = tl;
    </script>
  </body>
</html>
`;
}

export { COMPOSITION_ID };
