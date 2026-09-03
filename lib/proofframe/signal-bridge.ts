// The demand-signal bridge between the closet page and the merchant studio.
// Both routes are served from the same origin, so localStorage carries the
// signals: cross-tab via the native 'storage' event, same-tab via a custom
// event. Only zero-ID DemandSignal objects travel through here.
// ponytail: localStorage bridge; production would be a queue/API - the
// payload contract (DemandSignal) is the part that matters.
import {
  GARMENT_CATEGORIES,
  consentFieldsForRequest,
  guessCategory,
  type BuyingPattern,
  type ConsentField,
  type DemandSignal,
  type GarmentCategory,
  type Occasion,
  type Purchase,
  type ShopperProfile,
} from './closet';
import { demoCatalog, type CatalogProduct } from './shopify';

const KEY = 'proofframe-demand-signals';
const EVENT = 'proofframe-signal';
const MAX_STORED = 50;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

const KINDS = new Set(['gap', 'fit', 'want']);
const CATEGORIES = new Set(GARMENT_CATEGORIES);
const LEVELS = new Set(['need', 'want']);
const OCCASIONS = new Set(['everyday', 'season', 'gift', 'event']);
const PROFILES = new Set(['self', 'partner', 'kid']);
const CONSENT_LEVELS = new Set([0, 1, 2, 3]);
const CONSENT_FIELDS = new Set<string>([
  'category',
  'size',
  'level',
  'handle',
  'occasion',
  'for',
  'fitPreference',
  'colourFamily',
  'avoidMaterials',
  'priceCeiling',
  'buyingPattern',
]);
const DISCOUNT_SENSITIVITIES = new Set(['code', 'percent', 'none']);
const SPEND_BANDS = new Set(['under-50', '50-100', '100-plus']);
const BRAND_LOYALTIES = new Set(['loyal', 'switcher']);

/** Rebuild a bounded, exact-key DemandSignal from untrusted storage, or null.
 * Extra keys (e.g. an injected shopperId) are dropped, enums enforced,
 * strings bounded, and the timestamp must parse. Wave-2 fields (level,
 * consent, occasion, for, context, taste) get the same treatment: level and
 * consent are required, so a malformed one drops the whole record; the rest
 * are optional and are simply omitted when malformed. */
export function toSignal(x: unknown): DemandSignal | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length > 64) return null;
  if (typeof s.kind !== 'string' || !KINDS.has(s.kind)) return null;
  if (typeof s.category !== 'string' || !CATEGORIES.has(s.category as GarmentCategory)) return null;
  if (typeof s.at !== 'string' || Number.isNaN(Date.parse(s.at))) return null;
  if (typeof s.level !== 'string' || !LEVELS.has(s.level)) return null;
  if (typeof s.consent !== 'object' || s.consent === null) return null;
  const rawConsent = s.consent as Record<string, unknown>;
  if (typeof rawConsent.level !== 'number' || !CONSENT_LEVELS.has(rawConsent.level)) return null;
  const rawFields = Array.isArray(rawConsent.fields) ? rawConsent.fields : [];
  const fields = rawFields.filter(
    (f): f is ConsentField => typeof f === 'string' && CONSENT_FIELDS.has(f),
  );

  const size = typeof s.size === 'string' && s.size.length <= 20 ? s.size : null;
  const handle = typeof s.handle === 'string' && s.handle.length <= 80 ? s.handle : null;

  const signal: DemandSignal = {
    signalId: s.signalId,
    kind: s.kind as DemandSignal['kind'],
    category: s.category as GarmentCategory,
    size,
    handle,
    at: s.at,
    level: s.level as DemandSignal['level'],
    consent: { level: rawConsent.level as 0 | 1 | 2 | 3, fields },
  };

  if (typeof s.occasion === 'string' && OCCASIONS.has(s.occasion)) {
    signal.occasion = s.occasion as Occasion;
  }
  if (typeof s.for === 'string' && PROFILES.has(s.for)) {
    signal.for = s.for as ShopperProfile;
  }
  if (typeof s.context === 'object' && s.context !== null) {
    const c = s.context as Record<string, unknown>;
    if (typeof c.fitPreference === 'string' && c.fitPreference.length <= 40) {
      signal.context = { fitPreference: c.fitPreference };
    }
  }
  if (typeof s.taste === 'object' && s.taste !== null) {
    const t = s.taste as Record<string, unknown>;
    const taste: NonNullable<DemandSignal['taste']> = {};
    if (typeof t.colourFamily === 'string' && t.colourFamily.length <= 60) {
      taste.colourFamily = t.colourFamily;
    }
    if (
      Array.isArray(t.avoidMaterials) &&
      t.avoidMaterials.every((m) => typeof m === 'string')
    ) {
      taste.avoidMaterials = (t.avoidMaterials as string[])
        .slice(0, 10)
        .filter((m) => m.length <= 40);
    }
    if (typeof t.priceCeiling === 'number' && Number.isFinite(t.priceCeiling)) {
      taste.priceCeiling = t.priceCeiling;
    }
    if (Object.keys(taste).length > 0) signal.taste = taste;
  }
  if (typeof s.pattern === 'object' && s.pattern !== null) {
    const p = s.pattern as Record<string, unknown>;
    if (
      typeof p.discountSensitivity === 'string' &&
      DISCOUNT_SENSITIVITIES.has(p.discountSensitivity) &&
      typeof p.spendBand === 'string' &&
      SPEND_BANDS.has(p.spendBand) &&
      typeof p.brandLoyalty === 'string' &&
      BRAND_LOYALTIES.has(p.brandLoyalty)
    ) {
      signal.pattern = {
        discountSensitivity: p.discountSensitivity as BuyingPattern['discountSensitivity'],
        spendBand: p.spendBand as BuyingPattern['spendBand'],
        brandLoyalty: p.brandLoyalty as BuyingPattern['brandLoyalty'],
      };
    }
  }

  // Storage is a client-integrity boundary, not an authenticated one: a same-origin script can
  // write any record. Re-derive what the consent level permits and drop the rest, so a stored
  // record can never claim more fields than its level grants. Codex round 3, finding A(b).
  const allowed = new Set(
    consentFieldsForRequest(signal.consent.level, {
      hasSize: signal.size !== null,
      hasHandle: signal.handle !== null,
      hasOccasion: signal.occasion !== undefined,
    }),
  );
  signal.consent.fields = signal.consent.fields.filter((f) => allowed.has(f));
  if (signal.consent.level < 2) {
    delete signal.occasion;
    delete signal.for;
    delete signal.context;
  }
  if (signal.consent.level < 3) {
    delete signal.taste;
    delete signal.pattern;
  }
  return signal;
}

export function readSignals(): DemandSignal[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    // Validate shape on readback: corrupt same-origin storage must not
    // crash consumers or smuggle non-signal objects into the UI.
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toSignal).filter((s): s is DemandSignal => s !== null);
  } catch {
    return [];
  }
}

/** Append and VERIFY. Returns true only when the signal is actually
 * readable back from storage — callers must not report delivery otherwise. */
export function appendSignal(signal: DemandSignal): boolean {
  if (!hasWindow()) return false;
  try {
    const next = [signal, ...readSignals()].slice(0, MAX_STORED);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    const delivered = readSignals().some((s) => s.signalId === signal.signalId);
    if (delivered) window.dispatchEvent(new CustomEvent(EVENT));
    return delivered;
  } catch {
    // storage unavailable (private mode etc.) - the closet still works,
    // the merchant just receives nothing. Approval stays consumed
    // (privacy fail-closed); the tool reports the failure honestly.
    return false;
  }
}

export function clearSignals(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/** Subscribe to signal changes from either tab. Returns an unsubscribe fn. */
export function subscribeSignals(onChange: () => void): () => void {
  if (!hasWindow()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

// ---------- Outcomes: bought / passed on a sent signal (UI-only, no tool
// can write here - a shopper's purchase-or-not is never a WebMCP call). ----

export interface SignalOutcome {
  signalId: string;
  outcome: 'bought' | 'passed';
  at: string; // ISO timestamp
}

const OUTCOMES_KEY = 'hemloop.outcomes';
const OUTCOMES_EVENT = 'hemloop-outcome-signal';
const MAX_OUTCOMES = 50;

const OUTCOME_KINDS = new Set(['bought', 'passed']);

function toOutcome(x: unknown): SignalOutcome | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length > 64) return null;
  if (typeof s.outcome !== 'string' || !OUTCOME_KINDS.has(s.outcome)) return null;
  if (typeof s.at !== 'string' || Number.isNaN(Date.parse(s.at))) return null;
  return {
    signalId: s.signalId,
    outcome: s.outcome as SignalOutcome['outcome'],
    at: s.at,
  };
}

export function readOutcomes(): SignalOutcome[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(OUTCOMES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toOutcome).filter((o): o is SignalOutcome => o !== null);
  } catch {
    return [];
  }
}

/** Append and VERIFY, mirroring appendSignal: only report success when the
 * outcome is actually readable back from storage. */
export function recordOutcome(outcome: SignalOutcome): boolean {
  if (!hasWindow()) return false;
  try {
    const next = [outcome, ...readOutcomes()].slice(0, MAX_OUTCOMES);
    window.localStorage.setItem(OUTCOMES_KEY, JSON.stringify(next));
    const delivered = readOutcomes().some(
      (o) => o.signalId === outcome.signalId && o.outcome === outcome.outcome,
    );
    if (delivered) window.dispatchEvent(new CustomEvent(OUTCOMES_EVENT));
    return delivered;
  } catch {
    return false;
  }
}

export function subscribeOutcomes(onChange: () => void): () => void {
  if (!hasWindow()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === OUTCOMES_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(OUTCOMES_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(OUTCOMES_EVENT, onChange);
  };
}

// ---------- Consent level: the sharing dial (0 Private .. 3 Taste). Stored
// only in this browser, default 1 (Basics). ----

const CONSENT_KEY = 'hemloop.consent';
const DEFAULT_CONSENT_LEVEL = 1;

function isConsentLevel(n: number): n is 0 | 1 | 2 | 3 {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

export function readConsentLevel(): 0 | 1 | 2 | 3 {
  if (!hasWindow()) return DEFAULT_CONSENT_LEVEL;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === null) return DEFAULT_CONSENT_LEVEL;
    const n = Number(raw);
    return isConsentLevel(n) ? n : DEFAULT_CONSENT_LEVEL;
  } catch {
    return DEFAULT_CONSENT_LEVEL;
  }
}

export function writeConsentLevel(level: 0 | 1 | 2 | 3): void {
  if (!hasWindow()) return;
  if (!isConsentLevel(level)) return;
  try {
    window.localStorage.setItem(CONSENT_KEY, String(level));
  } catch {
    /* ignore */
  }
}

// ---------- Personal offers: the merchant's proposed answer to one
// DemandSignal, addressed to its requestId - never to a person. Same
// same-origin bridge mechanism as signals. ----

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
  status: 'proposed' | 'approved' | 'declined' | 'expired';
  proposedBy: 'agent' | 'auto' | 'human';
  proposedAt: string;
  approvedAt?: string;
  reasons: string[];
  marginCheck: { floorPercent: number; resultingMarginPercent: number; ok: boolean };
}

const OFFERS_KEY = 'hemloop.offers';
const OFFERS_EVENT = 'hemloop-offer-signal';
const MAX_OFFERS = 50;

const OFFER_STATUSES = new Set(['proposed', 'approved', 'declined', 'expired']);
const OFFER_PROPOSERS = new Set(['agent', 'auto', 'human']);

/** Rebuild a bounded, exact-shape PersonalOffer from untrusted storage, or
 * null. Mirrors toSignal: enums enforced, strings bounded, numbers finite,
 * reasons capped at 3 items of at most 120 chars, junk dropped. */
export function toOffer(x: unknown): PersonalOffer | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.offerId !== 'string' || s.offerId.length === 0 || s.offerId.length > 64) return null;
  if (typeof s.requestId !== 'string' || s.requestId.length === 0 || s.requestId.length > 64) return null;
  if (typeof s.handle !== 'string' || s.handle.length === 0 || s.handle.length > 80) return null;
  if (typeof s.title !== 'string' || s.title.length === 0 || s.title.length > 200) return null;
  if (typeof s.size !== 'string' && s.size !== null) return null;
  if (typeof s.size === 'string' && s.size.length > 20) return null;
  if (typeof s.currency !== 'string' || s.currency.length === 0 || s.currency.length > 8) return null;
  if (typeof s.regularPrice !== 'number' || !Number.isFinite(s.regularPrice) || s.regularPrice < 0) return null;
  if (typeof s.price !== 'number' || !Number.isFinite(s.price) || s.price < 0) return null;
  if (
    typeof s.discountPercent !== 'number' ||
    !Number.isFinite(s.discountPercent) ||
    s.discountPercent < 0 ||
    s.discountPercent > 100
  )
    return null;
  if (typeof s.promoCode !== 'string' && s.promoCode !== null) return null;
  if (typeof s.promoCode === 'string' && s.promoCode.length > 40) return null;
  if (typeof s.validFrom !== 'string' || Number.isNaN(Date.parse(s.validFrom))) return null;
  if (typeof s.validTo !== 'string' || Number.isNaN(Date.parse(s.validTo))) return null;
  if (typeof s.disclaimer !== 'string' || s.disclaimer.length > 400) return null;
  if (typeof s.purchaseUrl !== 'string' || s.purchaseUrl.length === 0 || s.purchaseUrl.length > 300) return null;
  if (typeof s.status !== 'string' || !OFFER_STATUSES.has(s.status)) return null;
  if (typeof s.proposedBy !== 'string' || !OFFER_PROPOSERS.has(s.proposedBy)) return null;
  if (typeof s.proposedAt !== 'string' || Number.isNaN(Date.parse(s.proposedAt))) return null;
  if (!Array.isArray(s.reasons) || !s.reasons.every((r) => typeof r === 'string')) return null;
  const reasons = (s.reasons as string[]).slice(0, 3).filter((r) => r.length <= 120);
  if (typeof s.marginCheck !== 'object' || s.marginCheck === null) return null;
  const mc = s.marginCheck as Record<string, unknown>;
  if (typeof mc.floorPercent !== 'number' || !Number.isFinite(mc.floorPercent)) return null;
  if (typeof mc.resultingMarginPercent !== 'number' || !Number.isFinite(mc.resultingMarginPercent)) return null;
  if (typeof mc.ok !== 'boolean') return null;

  const offer: PersonalOffer = {
    offerId: s.offerId,
    requestId: s.requestId,
    handle: s.handle,
    title: s.title,
    size: s.size as string | null,
    currency: s.currency,
    regularPrice: s.regularPrice,
    price: s.price,
    discountPercent: s.discountPercent,
    promoCode: s.promoCode as string | null,
    validFrom: s.validFrom,
    validTo: s.validTo,
    disclaimer: s.disclaimer,
    purchaseUrl: s.purchaseUrl,
    status: s.status as PersonalOffer['status'],
    proposedBy: s.proposedBy as PersonalOffer['proposedBy'],
    proposedAt: s.proposedAt,
    reasons,
    marginCheck: {
      floorPercent: mc.floorPercent,
      resultingMarginPercent: mc.resultingMarginPercent,
      ok: mc.ok,
    },
  };
  if (typeof s.image === 'string' && s.image.length <= 300) offer.image = s.image;
  if (
    Array.isArray(s.sizesInStock) &&
    s.sizesInStock.every((v) => typeof v === 'string')
  ) {
    offer.sizesInStock = (s.sizesInStock as string[]).slice(0, 20).filter((v) => v.length <= 20);
  }
  if (typeof s.approvedAt === 'string' && !Number.isNaN(Date.parse(s.approvedAt))) {
    offer.approvedAt = s.approvedAt;
  }
  return offer;
}

export function readOffers(): PersonalOffer[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(OFFERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toOffer).filter((o): o is PersonalOffer => o !== null);
  } catch {
    return [];
  }
}

/** Insert or replace by offerId, cap at MAX_OFFERS, verify on readback -
 * mirrors appendSignal. Returns true only when the offer is actually
 * readable back from storage. */
export function upsertOffer(o: PersonalOffer): boolean {
  if (!hasWindow()) return false;
  try {
    const current = readOffers();
    const next = [o, ...current.filter((x) => x.offerId !== o.offerId)].slice(0, MAX_OFFERS);
    window.localStorage.setItem(OFFERS_KEY, JSON.stringify(next));
    const delivered = readOffers().some((x) => x.offerId === o.offerId);
    if (delivered) window.dispatchEvent(new CustomEvent(OFFERS_EVENT));
    return delivered;
  } catch {
    return false;
  }
}

export function subscribeOffers(onChange: () => void): () => void {
  if (!hasWindow()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === OFFERS_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(OFFERS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(OFFERS_EVENT, onChange);
  };
}

const DEFAULT_OFFER_BRAND = 'Northlight Apparel';

/** Pure: the Purchase a shopper's own "Bought" action on an approved
 * PersonalOffer creates. offerId and promoCode carry through so the offer
 * that won the sale is attributable later. Brand and category are guessed
 * from the catalog by handle (falling back to the demo's own brand and a
 * keyword guess), since a PersonalOffer carries neither field. */
export function purchaseFromOffer(offer: PersonalOffer, id: string, at: string): Purchase {
  const product = demoCatalog.products.find((p) => p.handle === offer.handle);
  const brand = product?.vendor ?? DEFAULT_OFFER_BRAND;
  const syntheticProduct: CatalogProduct = {
    handle: offer.handle,
    title: offer.title,
    description: '',
    currency: offer.currency,
    price: offer.price,
    compareAtPrice: null,
  };
  const category = guessCategory(product ?? syntheticProduct) ?? 'accessory';
  return {
    id,
    at,
    merchant: `${brand} online store`,
    brand,
    handle: offer.handle,
    title: offer.title,
    category,
    size: offer.size ?? 'OS',
    price: offer.price,
    currency: offer.currency,
    promoCode: offer.promoCode,
    offerId: offer.offerId,
    source: 'offer',
  };
}
