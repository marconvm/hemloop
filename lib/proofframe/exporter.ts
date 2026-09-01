// Standalone HyperFrames composition exporter.
// Contract (hyperframes-core): root <div data-composition-id> directly in
// <body> (no <template>), explicit sized box, clips as DIRECT children with
// class="clip" + data-start/data-duration/data-track-index, and exactly one
// paused GSAP timeline registered synchronously at window.__timelines[id].
// Deterministic: no clocks, no randomness, no network, finite tweens only.
import type { CampaignState, Scene } from './types';
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

function sceneCss(scene: Scene, base: CampaignState['style']): string {
  const bg = scene.style?.background ?? base.background;
  const ink = scene.style?.ink ?? base.ink;
  const accent = scene.style?.accent ?? base.accent;
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
    <title>${escapeHtml(state.facts.productName)} — ProofFrame promo</title>
    <script src="${GSAP_SRC}"></script>
    <style>
      body { margin: 0; background: ${state.style.background}; font-family: Inter, system-ui, sans-serif; }
      #root { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; }
      .clip { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 24px; text-align: center; padding: 0 72px; }
      .scene h1 { margin: 0; font-size: ${Math.round(height * 0.05)}px; line-height: 1.1; }
      .scene p { margin: 0; font-size: ${Math.round(height * 0.028)}px; }
      #proofframe-disclaimer { position: absolute; left: 0; right: 0; bottom: ${Math.round(height * 0.02)}px; text-align: center; font-size: ${Math.round(height * 0.012)}px; color: ${state.style.ink}; opacity: 0.75; }
${state.scenes.map((s) => sceneCss(s, state.style)).join('\n')}
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
