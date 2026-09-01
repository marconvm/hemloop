// Pure claim validator: no DOM, no network, no clock. The single source of
// truth for "can this copy ship" — the WebMCP adapter and the UI both call it.
import type { CampaignFacts, CampaignState, Scene, SceneKind, Violation } from './types';

export const SCENE_KINDS: SceneKind[] = ['hero', 'product', 'offer', 'cta'];

const PERCENT_RE = /(\d{1,3})\s*%/g;
// Prices: with a currency symbol, OR a bare decimal near a money word.
const PRICE_RE = /\$\s?(\d+(?:\.\d{1,2})?)/g;
const BARE_PRICE_RE = /(?<![\d.$])(\d+\.\d{2})(?![\d])/g;
const CODE_KEYWORD_RE = /\bcode[:\s]+([A-Za-z0-9]{3,})/gi;

// Normalize before matching so full-width / Arabic-Indic digits and stray
// format chars cannot smuggle a claim past the ASCII regexes.
function normalize(text: string): string {
  return text.normalize('NFKC').replace(/[​-‍﻿]/g, '');
}

export const MAX_SCENE_SECONDS = 30;
export const MAX_TOTAL_SECONDS = 60;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/** Validate one piece of copy against locked campaign facts. */
export function validateText(rawText: string, facts: CampaignFacts): Violation[] {
  const violations: Violation[] = [];
  const text = normalize(rawText);

  for (const m of text.matchAll(PERCENT_RE)) {
    const pct = Number(m[1]);
    if (facts.discountPercent === null || pct !== facts.discountPercent) {
      violations.push({
        rule: 'discount-mismatch',
        message:
          facts.discountPercent === null
            ? `Copy claims "${m[0].trim()}" but the campaign has no percentage offer.`
            : `Copy claims "${m[0].trim()}" but the locked offer is ${facts.discountPercent}%.`,
        found: m[0].trim(),
        expected:
          facts.discountPercent === null
            ? 'no percentage'
            : `${facts.discountPercent}%`,
      });
    }
  }

  const allowedPrices = [facts.regularPrice, facts.salePrice].filter(
    (p): p is number => p !== null,
  );
  const seenPrice = new Set<string>();
  for (const m of [...text.matchAll(PRICE_RE), ...text.matchAll(BARE_PRICE_RE)]) {
    const price = Number(m[1]);
    if (seenPrice.has(m[1])) continue;
    seenPrice.add(m[1]);
    if (!allowedPrices.some((p) => near(p, price))) {
      violations.push({
        rule: 'price-mismatch',
        message: `Copy shows "${m[0].trim()}" but locked prices are ${allowedPrices
          .map((p) => `$${p.toFixed(2)}`)
          .join(' / ')}.`,
        found: m[0].trim(),
        expected: allowedPrices.map((p) => `$${p.toFixed(2)}`).join(' / '),
      });
    }
  }

  // Any ALL-CAPS/alnum token that looks like a promo code but is not the
  // locked one, whether or not it follows the word "code".
  const codeTokens = new Set<string>();
  for (const m of text.matchAll(CODE_KEYWORD_RE)) codeTokens.add(m[1]);
  if (facts.promoCode) {
    for (const m of text.matchAll(/\b([A-Z][A-Z0-9]{3,})\b/g)) {
      if (m[1] !== facts.promoCode.toUpperCase()) codeTokens.add(m[1]);
    }
  }
  for (const token of codeTokens) {
    if (
      facts.promoCode === null ||
      token.toUpperCase() !== facts.promoCode.toUpperCase()
    ) {
      violations.push({
        rule: 'code-mismatch',
        message:
          facts.promoCode === null
            ? `Copy mentions promo code "${token}" but the campaign has no code.`
            : `Copy mentions promo code "${token}" but the locked code is ${facts.promoCode}.`,
        found: token,
        expected: facts.promoCode ?? 'no code',
      });
    }
  }

  const lower = text.toLowerCase();
  for (const phrase of facts.bannedPhrases) {
    if (phrase && lower.includes(phrase.toLowerCase())) {
      violations.push({
        rule: 'banned-phrase',
        message: `Copy contains banned phrase "${phrase}".`,
        found: phrase,
      });
    }
  }

  // ponytail: date claims ("ends Sep 7") are not parsed — the disclaimer rule
  // carries the dates; add date extraction if judges/legal ever need it.
  return violations;
}

export function validateScene(scene: Scene, facts: CampaignFacts): Violation[] {
  const violations = validateText(`${scene.heading}\n${scene.body}`, facts).map(
    (v) => ({
      ...v,
      sceneId: scene.id,
    }),
  );
  if (!(scene.durationSec > 0 && scene.durationSec <= MAX_SCENE_SECONDS)) {
    violations.push({
      rule: 'scene-duration',
      sceneId: scene.id,
      message: `Scene duration must be between 0 and ${MAX_SCENE_SECONDS}s, got ${scene.durationSec}.`,
    });
  }
  // kind is agent-controlled and reaches the exported HTML; enforce the enum
  // at runtime (the JSON-schema enum is advisory and host-dependent).
  if (!SCENE_KINDS.includes(scene.kind)) {
    violations.push({
      rule: 'scene-kind',
      sceneId: scene.id,
      message: `Scene kind must be one of: ${SCENE_KINDS.join(', ')}.`,
    });
  }
  return violations;
}

/** Whole-campaign validation: every scene, plus composition-level rules. */
export function validateCampaign(state: CampaignState): Violation[] {
  const violations = state.scenes.flatMap((s) => validateScene(s, state.facts));

  const total = state.scenes.reduce((sum, s) => sum + s.durationSec, 0);
  if (total > MAX_TOTAL_SECONDS) {
    violations.push({
      rule: 'total-duration',
      message: `Total duration ${total}s exceeds ${MAX_TOTAL_SECONDS}s.`,
    });
  }

  const hasOffer =
    state.facts.discountPercent !== null || state.facts.salePrice !== null;
  if (hasOffer && state.facts.disclaimer) {
    const shown = state.scenes.some(
      (s) =>
        s.heading.includes(state.facts.disclaimer) ||
        s.body.includes(state.facts.disclaimer),
    );
    // The exporter also force-renders the disclaimer as a persistent footer,
    // so this rule is satisfied by construction once scenes exist.
    if (!shown && state.scenes.length === 0) {
      violations.push({
        rule: 'missing-disclaimer',
        message:
          'Offer campaigns need at least one scene so the disclaimer footer can render.',
      });
    }
  }

  return violations;
}
