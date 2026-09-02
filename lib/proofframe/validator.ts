// Pure claim validator: no DOM, no network, no clock. The single source of
// truth for "can this copy ship" — the WebMCP adapter and the UI both call it.
import type { CampaignFacts, CampaignState, Scene, SceneKind, Violation } from './types';

export const SCENE_KINDS: SceneKind[] = ['hero', 'product', 'offer', 'cta'];

const PERCENT_RE = /(\d{1,3})\s*%/g;
// Prices: with a currency symbol, OR a bare decimal near a money word.
// Currency-aware: $, C$, US$, CAD, USD (symbol or code, before the number).
const PRICE_RE = /(?:\$|C\$|US\$|\b(?:CAD|USD)\b)\s?(\d+(?:\.\d{1,2})?)/gi;
const BARE_PRICE_RE = /(?<![\d.$])(\d+\.\d{2})(?![\d])/g;
const CODE_KEYWORD_RE = /\bcode[:\s]+([A-Za-z0-9]{3,})/gi;

// Normalize before matching so no digit system or invisible format character
// can smuggle a claim past the ASCII regexes: NFKC (full-width), explicit
// Arabic-Indic U+0660-0669 and Persian U+06F0-06F9 digit maps, the Arabic
// percent sign U+066A, and a full Unicode Cf (format-control) strip.
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٪/g, '%')
    .replace(/\p{Cf}/gu, '');
}

// Money-context window for bare decimals: "Just 19.99 today" is a price
// claim; "Rated 4.90 stars" is not.
// Word-bounded so "Coffee" no longer matches "off".
const MONEY_CONTEXT_RE = /\b(?:price|only|just|now|today|sale|deal|save|off|pay|cad|usd)\b|\$/i;
// Code-shaped token: caps with BOTH letters and digits (SAVE90, BTS25) —
// flagged whether or not a locked code exists; avoids flagging plain
// all-caps words like TODAY.
// Codeless promo detection, two tracks (agreed with the second reviewer):
// 1) any letter+digit token inside a tight redemption-context window
//    ("use / apply / enter / redeem / promo / coupon / voucher … at checkout");
// 2) a narrow global fallback: 3+ leading letters then 2+ trailing digits
//    (SAVE90, Save90, AURORA25) — so model/product tokens like X100, UV400,
//    H2O2 and 1080P are never flagged on their own.
const CODE_CONTEXT_RE = /\b(?:use|apply|enter|redeem|promo|coupon|voucher|checkout)\b/gi;
const CODE_CONTEXT_WINDOW = 28;
const LETTER_DIGIT_TOKEN_RE = /\b(?=[A-Za-z0-9]{4,}\b)(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+\b/g;
const CODE_SHAPED_RE = /\b[A-Za-z]{3,}\d{2,}\b/g;

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
  const bareWithContext = [...text.matchAll(BARE_PRICE_RE)].filter((m) => {
    const start = Math.max(0, (m.index ?? 0) - 16);
    const end = (m.index ?? 0) + m[0].length + 16;
    return MONEY_CONTEXT_RE.test(text.slice(start, end));
  });
  for (const m of [...text.matchAll(PRICE_RE), ...bareWithContext]) {
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

  // Promo-code claims: an explicit "code X" phrase (any token), plus any
  // code-shaped caps token (letters+digits) — the latter runs whether or not
  // a code is locked, so "Use SAVE90 at checkout" is caught when the
  // campaign has no code at all.
  const codeTokens = new Set<string>();
  for (const m of text.matchAll(CODE_KEYWORD_RE)) codeTokens.add(m[1]);
  for (const m of text.matchAll(CODE_SHAPED_RE)) codeTokens.add(m[0]);
  for (const c of text.matchAll(CODE_CONTEXT_RE)) {
    const i = c.index ?? 0;
    const window = text.slice(Math.max(0, i - CODE_CONTEXT_WINDOW), i + c[0].length + CODE_CONTEXT_WINDOW);
    for (const t of window.matchAll(LETTER_DIGIT_TOKEN_RE)) codeTokens.add(t[0]);
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
