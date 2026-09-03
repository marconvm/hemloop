// Personal-offer matcher: pure, no DOM, no network, no clock (a `now` can be
// injected for tests). Turns one incoming request plus the merchant's locked
// offer rules into a proposed PersonalOffer, or a typed refusal.
//
// Deliberately decoupled from closet.ts: the sibling agent owns closet.ts /
// signal-bridge.ts / webmcp-closet.ts and may still be adding the `pattern`
// field to DemandSignal there. Every type this file needs is defined here,
// structurally compatible with (but not imported from) that shape, so this
// file compiles whether or not the sibling's changes have landed yet.
import type { CampaignFacts } from './types';

export type DiscountSensitivity = 'code' | 'percent' | 'none';
export type SpendBand = 'under-50' | '50-100' | '100-plus';
export type BrandLoyalty = 'loyal' | 'switcher';

export interface BuyingPattern {
  discountSensitivity: DiscountSensitivity;
  spendBand: SpendBand;
  brandLoyalty: BrandLoyalty;
}

export type Occasion = 'everyday' | 'season' | 'gift' | 'event';

/** The subset of an incoming request the matcher needs. Structurally
 * compatible with closet.ts's DemandSignal plus its optional wave-3
 * `pattern` field, but defined locally so this file never depends on
 * closet.ts's exact shape. */
export interface DemandSignalLike {
  signalId: string;
  category: string;
  size?: string | null;
  handle?: string | null;
  occasion?: Occasion;
  pattern?: BuyingPattern;
}

export interface CatalogProductLike {
  handle: string;
  title: string;
  image?: string;
  sizesInStock?: string[];
}

export type OfferStatus = 'proposed' | 'approved' | 'declined' | 'expired';
export type ProposedBy = 'agent' | 'auto' | 'human';

export interface PersonalOffer {
  offerId: string;
  requestId: string;
  handle: string;
  title: string;
  image?: string;
  size: string | null;
  currency: string;
  regularPrice: number;
  price: number;
  discountPercent: number;
  promoCode: string | null;
  validFrom: string;
  validTo: string;
  disclaimer: string;
  purchaseUrl: string;
  sizesInStock?: string[];
  status: OfferStatus;
  proposedBy: ProposedBy;
  proposedAt: string;
  approvedAt?: string;
  reasons: string[];
  marginCheck: { floorPercent: number; resultingMarginPercent: number; ok: boolean };
}

export interface MatchOfferInput {
  request: DemandSignalLike;
  facts: CampaignFacts;
  catalogProduct?: CatalogProductLike;
  now?: Date;
}

export type MatchOfferResult = PersonalOffer | { ok: false; reason: string };

/** Lowercase, hyphenate. Used to build a stable offer id from a product
 * name, and as the fallback catalog handle when nothing else matches. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable id for the campaign's general offer: product + code + end date.
 * `propose_offer` appends the request's own event id to this, so every
 * personal offer traces back to the general offer it was built from. */
export function offerIdFor(facts: CampaignFacts): string {
  return `${slug(facts.productName)}:${facts.promoCode ?? 'none'}:${facts.endDate}`;
}

const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ['hoodie', /hoodie|fleece|sweat/i],
  ['tee', /tee|t-shirt|shirt/i],
  ['denim', /denim|jean|pant|chino/i],
  ['jacket', /jacket|coat|parka/i],
  ['footwear', /boot|shoe|sneaker/i],
  ['accessory', /cap|hat|bag|beanie|accessor/i],
];

/** Guess a garment category from free text (product name, catalog title).
 * Local copy of the same idea as closet.ts's guessCategory, kept separate
 * on purpose: this file must not depend on closet.ts. */
function guessCategoryFromText(text: string): string | null {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return null;
}

function campaignCategory(facts: CampaignFacts, catalogProduct?: CatalogProductLike): string | null {
  const text = `${catalogProduct?.title ?? ''} ${facts.productName}`;
  return guessCategoryFromText(text);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampReason(reason: string): string {
  return reason.length > 120 ? `${reason.slice(0, 119)}…` : reason;
}

const SENSITIVITY_REASON: Record<DiscountSensitivity, string> = {
  none: 'Kept the discount modest since you tend to buy without needing one.',
  percent: 'Applied the discount automatically, no code required to redeem.',
  code: 'Included the promo code, the way you like to redeem offers.',
};

/**
 * Match one incoming request against the locked offer rules on `facts`.
 * Pure: no side effects, deterministic given `now`. Refuses (does not
 * throw) when the category does not match the campaign product or the
 * shopper's size is not in stock.
 */
export function matchOffer(input: MatchOfferInput): MatchOfferResult {
  const { request, facts, catalogProduct, now = new Date() } = input;

  const productCategory = campaignCategory(facts, catalogProduct);
  if (!productCategory || productCategory !== request.category) {
    return { ok: false, reason: 'category mismatch' };
  }

  if (
    request.size &&
    facts.sizesInStock &&
    !facts.sizesInStock.includes(request.size)
  ) {
    return { ok: false, reason: 'size not in stock' };
  }

  const pattern = request.pattern;
  const maxDiscount = facts.maxDiscountPercent;
  let discount = facts.discountPercent ?? 0;

  if (pattern?.discountSensitivity === 'none') {
    discount = Math.min(discount, 15);
  }
  if (pattern?.brandLoyalty === 'switcher' && maxDiscount !== undefined) {
    // Win-back: give the strongest discount the merchant allows.
    discount = maxDiscount;
  }
  if (maxDiscount !== undefined) discount = Math.min(discount, maxDiscount);
  discount = Math.max(0, discount);

  const costPrice = facts.costPrice ?? 0;
  const marginFloor = facts.marginFloorPercent ?? 0;
  const regularPrice = facts.regularPrice;

  let price = round2(regularPrice * (1 - discount / 100));
  let marginPercent = price > 0 ? ((price - costPrice) / price) * 100 : 0;
  let trimmed = false;
  while (marginPercent < marginFloor && discount > 0) {
    discount = Math.max(0, discount - 5);
    price = round2(regularPrice * (1 - discount / 100));
    marginPercent = price > 0 ? ((price - costPrice) / price) * 100 : 0;
    trimmed = true;
  }
  const marginOk = marginPercent >= marginFloor;

  const todayStr = now.toISOString().slice(0, 10);
  let validTo = facts.endDate;
  let shortenedForOccasion = false;
  if (request.occasion === 'gift' || request.occasion === 'event') {
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekLaterStr = weekLater.toISOString().slice(0, 10);
    if (weekLaterStr < validTo) {
      validTo = weekLaterStr;
      shortenedForOccasion = true;
    }
  }

  const reasons: string[] = [];
  if (trimmed) reasons.push('Discount trimmed to protect the margin floor.');
  if (shortenedForOccasion) reasons.push('Timed for the occasion.');
  if (pattern?.discountSensitivity) reasons.push(SENSITIVITY_REASON[pattern.discountSensitivity]);
  if (pattern?.brandLoyalty === 'switcher') {
    reasons.push('Offered a stronger discount to win you over from another brand.');
  }
  reasons.push(`Matches the ${request.category} you're shopping for.`);

  const title = catalogProduct?.title ?? facts.productName;
  const handle = catalogProduct?.handle ?? slug(facts.productName);
  const image = catalogProduct?.image ?? facts.productImage;
  const sizesInStock = catalogProduct?.sizesInStock ?? facts.sizesInStock;

  const offer: PersonalOffer = {
    offerId: `${offerIdFor(facts)}:${request.signalId.slice(0, 8)}`,
    requestId: request.signalId,
    handle,
    title,
    image,
    size: request.size ?? null,
    currency: facts.currency,
    regularPrice,
    price,
    discountPercent: discount,
    promoCode: facts.promoCode ?? null,
    validFrom: todayStr,
    validTo,
    disclaimer: facts.disclaimer,
    purchaseUrl: facts.purchaseUrl ?? '',
    sizesInStock,
    status: 'proposed',
    proposedBy: 'agent',
    proposedAt: now.toISOString(),
    reasons: reasons.slice(0, 3).map(clampReason),
    marginCheck: {
      floorPercent: marginFloor,
      resultingMarginPercent: round2(marginPercent),
      ok: marginOk,
    },
  };

  return offer;
}

const OCCASIONS = new Set<Occasion>(['everyday', 'season', 'gift', 'event']);
const SENSITIVITIES = new Set<DiscountSensitivity>(['code', 'percent', 'none']);
const SPEND_BANDS = new Set<SpendBand>(['under-50', '50-100', '100-plus']);
const LOYALTIES = new Set<BrandLoyalty>(['loyal', 'switcher']);

/** Defensively rebuild a DemandSignalLike from an unknown object (the raw
 * rows a page's getRequests() callback hands the tool). Mirrors the
 * bounded, exact-key parsing signal-bridge.ts uses for storage readback:
 * unknown keys are dropped, enums enforced, nothing trusted by shape alone. */
export function toDemandSignalLike(x: unknown): DemandSignalLike | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length === 0) return null;
  if (typeof s.category !== 'string') return null;

  const size = typeof s.size === 'string' ? s.size : null;
  const handle = typeof s.handle === 'string' ? s.handle : null;
  const occasion =
    typeof s.occasion === 'string' && OCCASIONS.has(s.occasion as Occasion)
      ? (s.occasion as Occasion)
      : undefined;

  let pattern: BuyingPattern | undefined;
  if (typeof s.pattern === 'object' && s.pattern !== null) {
    const p = s.pattern as Record<string, unknown>;
    const discountSensitivity =
      typeof p.discountSensitivity === 'string' && SENSITIVITIES.has(p.discountSensitivity as DiscountSensitivity)
        ? (p.discountSensitivity as DiscountSensitivity)
        : undefined;
    const spendBand =
      typeof p.spendBand === 'string' && SPEND_BANDS.has(p.spendBand as SpendBand)
        ? (p.spendBand as SpendBand)
        : undefined;
    const brandLoyalty =
      typeof p.brandLoyalty === 'string' && LOYALTIES.has(p.brandLoyalty as BrandLoyalty)
        ? (p.brandLoyalty as BrandLoyalty)
        : undefined;
    if (discountSensitivity && spendBand && brandLoyalty) {
      pattern = { discountSensitivity, spendBand, brandLoyalty };
    }
  }

  return { signalId: s.signalId, category: s.category, size, handle, occasion, pattern };
}
