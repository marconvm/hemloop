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

const KINDS = new Set(['gap', 'fit', 'want', 'replace']);

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

  // Wave 4: check the stock the offer will actually claim. The emitted offer
  // reports `catalogProduct?.sizesInStock ?? facts.sizesInStock` further down,
  // so checking only `facts.sizesInStock` here could propose a size the very
  // same offer then lists as out of stock.
  const stock = catalogProduct?.sizesInStock ?? facts.sizesInStock;
  if (request.size && stock && !stock.includes(request.size)) {
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
  const sizesInStock = stock;

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

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
// The garment categories, mirrored rather than imported: this file stays
// decoupled from closet.ts (see the header note), the same way KINDS is.
const CATEGORIES = new Set(['hoodie', 'tee', 'denim', 'jacket', 'footwear', 'accessory']);
const OCCASIONS = new Set<Occasion>(['everyday', 'season', 'gift', 'event']);
const SENSITIVITIES = new Set<DiscountSensitivity>(['code', 'percent', 'none']);
const SPEND_BANDS = new Set<SpendBand>(['under-50', '50-100', '100-plus']);
const LOYALTIES = new Set<BrandLoyalty>(['loyal', 'switcher']);

/** Defensively rebuild a DemandSignalLike from an unknown object (the raw
 * rows a page's getRequests() callback hands the tool). Mirrors the bounded,
 * exact-key parsing signal-bridge.ts uses for storage readback: unknown keys
 * are dropped, enums enforced, lengths capped, nothing trusted by shape alone.
 *
 * The bounds below are not decoration. `getRequests(): unknown[]` says the
 * rows are untrusted, so this parse must be no weaker than the bridge's -
 * a second parse looser than the first is a floor that is not there. Wave-4
 * review (Codex) found exactly that: signalId, category, size and handle were
 * unbounded here while `toSignal` capped all four, so a row that never came
 * through storage could carry 5K of text, or a fence closing marker, straight
 * into a tool result. */
export function toDemandSignalLike(x: unknown): DemandInsightRequest | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  // Ids are minted with crypto.randomUUID(); anything outside that shape is
  // not one of ours and has no business being echoed back to an agent.
  if (typeof s.signalId !== 'string' || !ID_RE.test(s.signalId)) return null;
  if (typeof s.category !== 'string' || !CATEGORIES.has(s.category)) return null;

  const size = typeof s.size === 'string' && s.size.length <= 20 ? s.size : null;
  const handle = typeof s.handle === 'string' && s.handle.length <= 80 ? s.handle : null;
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

  // Wave 4: kind, level and at ride along for demandInsight. Bounded the
  // same way as everything else that crosses the bridge; an unrecognised
  // value is simply dropped, never trusted through.
  const kind = typeof s.kind === 'string' && KINDS.has(s.kind) ? s.kind : undefined;
  const level = s.level === 'need' || s.level === 'want' ? s.level : undefined;
  const at = typeof s.at === 'string' && s.at.length <= 40 ? s.at : undefined;

  return { signalId: s.signalId, category: s.category, size, handle, occasion, pattern, kind, level, at };
}

// ---------- Wave 4: merchant inventory insight ----------

/** Why the locked offer can or cannot answer a group of requests. Uses the
 * SAME two predicates matchOffer refuses on, so the panel can never promise
 * something the matcher would then decline. */
export type DemandVerdict = 'can-offer' | 'size-not-in-stock' | 'category-mismatch';

/** What a request contributes to the insight, beyond what the matcher needs.
 * All of it already travels in a DemandSignal at level 1. */
export interface DemandInsightRequest extends DemandSignalLike {
  kind?: string;
  level?: 'need' | 'want';
  at?: string;
}

export interface DemandGroup {
  key: string;
  category: string;
  /** 'any size' when no size travelled with the requests in this group. */
  size: string;
  total: number;
  need: number;
  want: number;
  /** Requests the shopper marked as a replacement: they own one already. */
  replace: number;
  bought: number;
  newest: string;
  /** Ids the merchant's agent can hand straight to propose_offer, capped. */
  requestIds: string[];
  verdict: DemandVerdict;
  action: string;
}

const MAX_IDS_PER_GROUP = 10;

const VERDICT_ACTION: Record<DemandVerdict, string> = {
  'can-offer': 'The locked offer covers this: propose_offer will match.',
  'size-not-in-stock':
    'This size is not in the locked sizes in stock, so the matcher refuses. Restock it, or add the size on the offer facts before locking.',
  'category-mismatch':
    'The locked offer is for another category, so the matcher refuses. Import a product in this category to answer it.',
};

/**
 * Group incoming requests by category and size, and tell the merchant which
 * groups their locked offer can actually answer. Pure: no DOM, no clock, no
 * storage. This is the merchant's half of the loop - demand they cannot get
 * from purchase history, scored against the stock they have.
 *
 * Ordering: groups the offer can answer come first (that is where the money
 * is), then groups with at least one Need, then newest first.
 */
export function demandInsight(
  requests: DemandInsightRequest[],
  facts: CampaignFacts,
  catalogProduct?: CatalogProductLike,
  boughtIds: Iterable<string> = [],
): DemandGroup[] {
  const bought = new Set(boughtIds);
  const productCategory = campaignCategory(facts, catalogProduct);
  const sizesInStock = catalogProduct?.sizesInStock ?? facts.sizesInStock;

  const map = new Map<string, DemandGroup>();
  for (const r of requests) {
    const size = r.size ?? 'any size';
    const key = `${r.category}|${size}`;
    const at = r.at ?? '';
    const group = map.get(key) ?? {
      key,
      category: r.category,
      size,
      total: 0,
      need: 0,
      want: 0,
      replace: 0,
      bought: 0,
      newest: at,
      requestIds: [],
      verdict: 'can-offer' as DemandVerdict,
      action: '',
    };
    group.total += 1;
    if (r.level === 'want') group.want += 1;
    else group.need += 1;
    if (r.kind === 'replace') group.replace += 1;
    if (bought.has(r.signalId)) group.bought += 1;
    if (at > group.newest) group.newest = at;
    if (group.requestIds.length < MAX_IDS_PER_GROUP) group.requestIds.push(r.signalId);
    map.set(key, group);
  }

  for (const group of map.values()) {
    // Same order of refusal as matchOffer: category first, then size.
    if (!productCategory || productCategory !== group.category) {
      group.verdict = 'category-mismatch';
    } else if (
      group.size !== 'any size' &&
      sizesInStock &&
      !sizesInStock.includes(group.size)
    ) {
      group.verdict = 'size-not-in-stock';
    } else {
      group.verdict = 'can-offer';
    }
    group.action = VERDICT_ACTION[group.verdict];
  }

  return Array.from(map.values()).sort((a, b) => {
    const aCan = a.verdict === 'can-offer';
    const bCan = b.verdict === 'can-offer';
    if (aCan !== bCan) return aCan ? -1 : 1;
    const aNeed = a.need > 0;
    const bNeed = b.need > 0;
    if (aNeed !== bNeed) return aNeed ? -1 : 1;
    return a.newest < b.newest ? 1 : -1;
  });
}
