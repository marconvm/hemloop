// Shopper-side domain: a private wardrobe, fit knowledge, and data-minimized
// demand signals. A signal carries no shopper identifier or wardrobe rows.
import type { Catalog, CatalogProduct } from './shopify';
import { demoCatalog } from './shopify';

export type GarmentCategory =
  | 'hoodie'
  | 'tee'
  | 'denim'
  | 'jacket'
  | 'footwear'
  | 'accessory';

/** Who a garment (or a shopping session) is for. Absent on a Garment means
 * 'self' - the eight original seed rows never gained this field. */
export type ShopperProfile = 'self' | 'partner' | 'kid';

export interface Garment {
  id: string;
  category: GarmentCategory;
  brand: string;
  size: string;
  colour: string;
  image?: string;
  price?: number;
  currency?: string;
  retailer?: string;
  material?: string;
  purchasedAt?: string; // ISO yyyy-mm-dd
  for?: ShopperProfile; // default 'self' when absent
}

export interface Wardrobe {
  garments: Garment[];
}

export interface Gap {
  category: GarmentCategory;
  reason: string;
  /** Present only when the gap comes from age rather than absence: the
   * shopper owns this category, but the newest one they bought is past its
   * typical replacement life. Never carries a merchant, price or handle. */
  due?: {
    lastBoughtAt: string;
    monthsSince: number;
    typicalMonths: number;
    size: string;
  };
}

export interface FitNote {
  handle: string;
  category: GarmentCategory | null;
  ownedSize: string | null;
  note: string;
}

/** A fixed enum minted in code - never a free string an agent can widen.
 * Names exactly the fields a DemandSignal is carrying at the moment it is
 * sent, so the merchant sees exactly what was granted. */
export type ConsentField =
  | 'category'
  | 'size'
  | 'level'
  | 'handle'
  | 'occasion'
  | 'for'
  | 'fitPreference'
  | 'colourFamily'
  | 'avoidMaterials'
  | 'priceCeiling'
  | 'buyingPattern';

export interface ConsentGrant {
  level: 0 | 1 | 2 | 3;
  fields: ConsentField[];
}

export type Occasion = 'everyday' | 'season' | 'gift' | 'event';

export interface DemandSignal {
  signalId: string;
  kind: 'gap' | 'fit' | 'want' | 'replace';
  category: GarmentCategory;
  size: string | null;
  handle: string | null;
  at: string; // ISO timestamp
  /** Derived from kind: gap, fit or replace -> 'need', want -> 'want'. */
  level: 'need' | 'want';
  occasion?: Occasion;
  for?: ShopperProfile;
  consent: ConsentGrant;
  /** Only present at consent level >= 2. */
  context?: { fitPreference?: string };
  /** Only present at consent level 3. */
  taste?: { colourFamily?: string; avoidMaterials?: string[]; priceCeiling?: number };
  /** Only present at consent level 3. A coarse, category-scoped buying
   * pattern derived from purchase history - never the raw purchases. */
  pattern?: BuyingPattern;
}

/** Exactly which fields would leave the page for report_demand_gap at a
 * given consent level, given which optional arguments/context are present.
 * Pure, and shared by the tool (to fill consent.fields) and the UI (the
 * payload preview shown before Approve). Level 0 leaves nothing. */
export function consentFieldsForRequest(
  level: 0 | 1 | 2 | 3,
  opts: { hasSize: boolean; hasHandle: boolean; hasOccasion: boolean },
): ConsentField[] {
  if (level === 0) return [];
  const fields: ConsentField[] = ['category', 'level'];
  if (opts.hasSize) fields.push('size');
  if (opts.hasHandle) fields.push('handle');
  if (level >= 2) {
    fields.push('for', 'fitPreference');
    if (opts.hasOccasion) fields.push('occasion');
  }
  if (level >= 3) {
    fields.push('colourFamily', 'avoidMaterials', 'priceCeiling', 'buyingPattern');
  }
  return fields;
}

export function seedWardrobe(): Wardrobe {
  return {
    garments: [
      {
        id: 'g1',
        category: 'tee',
        brand: 'Northlight Apparel',
        size: 'M',
        colour: 'bone',
        image: '/products/harborview-crew-tee.jpg',
        price: 22.9,
        currency: 'CAD',
        retailer: 'Northlight Apparel online store',
        material: '100% combed cotton jersey',
        purchasedAt: '2025-11-02',
      },
      {
        id: 'g2',
        category: 'tee',
        brand: 'Northlight Apparel',
        size: 'M',
        colour: 'moss',
        image: '/products/moss-tee.jpg',
        price: 24.0,
        currency: 'CAD',
        retailer: 'Northlight Apparel online store',
        material: 'Organic cotton jersey',
        purchasedAt: '2026-01-15',
      },
      {
        id: 'g3',
        category: 'tee',
        brand: 'Denim Supply Co.',
        size: 'M',
        colour: 'black',
        image: '/products/black-tee.jpg',
        price: 19.99,
        currency: 'CAD',
        retailer: 'Mall outlet',
        material: 'Cotton jersey',
        purchasedAt: '2025-08-20',
      },
      {
        id: 'g4',
        category: 'denim',
        brand: 'Denim Supply Co.',
        size: '32x30',
        colour: 'indigo',
        image: '/products/east-side-straight-jean.jpg',
        price: 68.0,
        currency: 'CAD',
        retailer: 'Denim Supply Co. flagship',
        material: 'Rigid cotton denim',
        purchasedAt: '2025-09-12',
      },
      {
        id: 'g5',
        category: 'denim',
        brand: 'Denim Supply Co.',
        size: '32x30',
        colour: 'washed',
        image: '/products/washed-denim.jpg',
        price: 54.0,
        currency: 'CAD',
        retailer: 'Mall outlet',
        material: 'Stretch cotton denim',
        purchasedAt: '2026-02-28',
      },
      {
        id: 'g6',
        category: 'footwear',
        brand: 'Ridgeline Outdoor',
        size: '10',
        colour: 'white',
        image: '/products/white-sneaker.jpg',
        price: 79.0,
        currency: 'CAD',
        retailer: 'Ridgeline Outdoor',
        material: 'Canvas upper, rubber sole',
        purchasedAt: '2024-11-05',
      },
      {
        id: 'g7',
        category: 'accessory',
        brand: 'Northlight Apparel',
        size: 'OS',
        colour: 'olive',
        image: '/products/olive-cap.jpg',
        price: 26.0,
        currency: 'CAD',
        retailer: 'Northlight Apparel online store',
        material: 'Cotton twill',
        purchasedAt: '2025-06-18',
      },
      {
        id: 'g8',
        category: 'jacket',
        brand: 'Ridgeline Outdoor',
        size: 'M',
        colour: 'navy',
        image: '/products/tidewater-shell-jacket.jpg',
        price: 96.0,
        currency: 'CAD',
        retailer: 'Ridgeline Outdoor',
        material: 'Nylon shell, sherpa-lined collar',
        purchasedAt: '2025-12-24',
      },
      {
        id: 'g9',
        category: 'tee',
        brand: 'Little Trailhead',
        size: '8',
        colour: 'red',
        image: '/products/black-tee.jpg',
        price: 14.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Cotton jersey',
        purchasedAt: '2026-04-10',
        for: 'kid',
      },
      {
        id: 'g10',
        category: 'footwear',
        brand: 'Little Trailhead',
        size: '2Y',
        colour: 'blue',
        image: '/products/white-sneaker.jpg',
        price: 32.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Canvas upper, rubber sole',
        purchasedAt: '2026-05-01',
        for: 'kid',
      },
      {
        id: 'g11',
        category: 'hoodie',
        brand: 'Northlight Apparel',
        size: 'L',
        colour: 'charcoal',
        image: '/products/northlight-hoodie.jpg',
        price: 58.0,
        currency: 'CAD',
        retailer: 'Northlight Apparel online store',
        material: 'Cotton fleece',
        purchasedAt: '2026-01-20',
        for: 'partner',
      },
    ],
  };
}

/** The wardrobe rows for one shopping profile. Garments with no `for` are
 * 'self'. Pure - used by both the WebMCP tools and the UI, so a profile
 * switch changes exactly what a tool call and the wardrobe grid agree on. */
export function garmentsForProfile(
  wardrobe: Wardrobe,
  profile: ShopperProfile,
): Wardrobe {
  return {
    garments: wardrobe.garments.filter((g) => (g.for ?? 'self') === profile),
  };
}

const ESSENTIALS: GarmentCategory[] = ['hoodie', 'tee', 'denim', 'jacket'];

/** How long a category typically lasts before it is worth replacing, in
 * months. A calibration table, not a law: a merchant or a shopper with real
 * wear data should tune these numbers - the lifecycle logic does not change
 * when they do. */
export const REPLACEMENT_MONTHS: Record<GarmentCategory, number> = {
  footwear: 12,
  tee: 18,
  denim: 24,
  hoodie: 30,
  accessory: 36,
  jacket: 48,
};

/** Whole months from `from` to `to`, floored, never negative. Day-of-month
 * aware, so 2026-01-31 to 2026-02-28 is 0 months, not 1. */
export function monthsBetween(from: string, to: Date): number {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  let months =
    (to.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - start.getUTCMonth());
  if (to.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Categories the wardrobe is missing or thin on, plus categories the shopper
 * owns where the oldest garment is past its typical replacement life. The
 * date comes from the garment's own `purchasedAt`, which the receipt importer
 * and the Bought button fill in from the purchase log; a garment with no date
 * is never called worn out. Pure; `now` is injectable so the result is
 * deterministic in tests. */
export function findGaps(wardrobe: Wardrobe, now: Date = new Date()): Gap[] {
  const gaps: Gap[] = [];
  for (const category of ESSENTIALS) {
    const owned = wardrobe.garments.filter((g) => g.category === category);
    if (owned.length === 0) {
      gaps.push({ category, reason: `No ${category} in the wardrobe.` });
    } else if (owned.length === 1) {
      gaps.push({ category, reason: `Only one ${category} in rotation.` });
    }
  }

  // A category already reported as missing or thin does not also need an age
  // argument - one gap per category, and absence outranks wear. The oldest
  // dated garment decides: a new tee does not make last decade's boots fine.
  const reported = new Set(gaps.map((g) => g.category));
  for (const category of GARMENT_CATEGORIES) {
    if (reported.has(category)) continue;
    const oldest = wardrobe.garments
      .filter((g) => g.category === category && g.purchasedAt)
      .reduce<Garment | null>(
        (best, g) => (!best || g.purchasedAt! < best.purchasedAt! ? g : best),
        null,
      );
    if (!oldest) continue;
    const typicalMonths = REPLACEMENT_MONTHS[category];
    const monthsSince = monthsBetween(oldest.purchasedAt!, now);
    if (monthsSince < typicalMonths) continue;
    gaps.push({
      category,
      reason: `Bought ${monthsSince} months ago; ${category} is typically replaced after ${typicalMonths}.`,
      due: {
        lastBoughtAt: oldest.purchasedAt!,
        monthsSince,
        typicalMonths,
        size: oldest.size,
      },
    });
  }
  return gaps;
}

/** Sizes the shopper owns, optionally scoped to one brand. Pure. */
export function sizesOwned(
  wardrobe: Wardrobe,
  brand?: string,
): { brand: string; category: GarmentCategory; size: string }[] {
  const seen = new Set<string>();
  const rows: { brand: string; category: GarmentCategory; size: string }[] = [];
  for (const g of wardrobe.garments) {
    if (brand && g.brand.toLowerCase() !== brand.toLowerCase()) continue;
    const key = `${g.brand}|${g.category}|${g.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ brand: g.brand, category: g.category, size: g.size });
  }
  return rows;
}

const CATEGORY_KEYWORDS: [GarmentCategory, RegExp][] = [
  ['hoodie', /hoodie|fleece|sweat/i],
  ['tee', /tee|t-shirt|shirt/i],
  ['denim', /denim|jean|pant|chino/i],
  ['jacket', /jacket|coat|parka/i],
  ['footwear', /boot|shoe|sneaker|snowboard boot/i],
  ['accessory', /card|wax|bag|beanie|accessor|cap|hat/i],
];

export function guessCategory(product: CatalogProduct): GarmentCategory | null {
  const text = `${product.title} ${product.description}`;
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return null;
}

/** Fit advice for a catalog product based on what the shopper owns. Pure. */
export function checkFit(
  wardrobe: Wardrobe,
  handle: string,
  catalog: Catalog = demoCatalog,
): FitNote {
  const product = catalog.products.find((p) => p.handle === handle);
  if (!product) {
    return {
      handle,
      category: null,
      ownedSize: null,
      note: `Unknown product "${handle}".`,
    };
  }
  const category = guessCategory(product);
  if (!category) {
    return {
      handle,
      category: null,
      ownedSize: null,
      note: 'No fit history for this product type.',
    };
  }
  const owned = wardrobe.garments.find((g) => g.category === category);
  if (!owned) {
    return {
      handle,
      category,
      ownedSize: null,
      note: `You own no ${category} yet - no size history to compare.`,
    };
  }
  return {
    handle,
    category,
    ownedSize: owned.size,
    note: `You own ${owned.size} in ${category} (${owned.brand}). Start from ${owned.size} for "${product.title}".`,
  };
}

/** The base signal shape, unchanged since wave 1: event id, kind, category,
 * size, handle, time. Consent-gated fields (level, consent, occasion, for,
 * context, taste) are layered on by the caller that knows the consent
 * level and profile - report_demand_gap in webmcp-closet.ts. */
export type BaseSignal = Pick<
  DemandSignal,
  'signalId' | 'kind' | 'category' | 'size' | 'handle' | 'at'
>;

/** Build the zero-ID signal that crosses the privacy bridge. The random id is
 * an event id, not a stable shopper id. Dependencies are injectable for tests. */
export function makeSignal(
  input: {
    kind: DemandSignal['kind'];
    category: GarmentCategory;
    size?: string;
    handle?: string;
  },
  now: () => string = () => new Date().toISOString(),
  makeId: () => string = () => crypto.randomUUID(),
): BaseSignal {
  const at = now();
  return {
    signalId: makeId(),
    kind: input.kind,
    category: input.category,
    size: input.size ?? null,
    handle: input.handle ?? null,
    at,
  };
}

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  'hoodie',
  'tee',
  'denim',
  'jacket',
  'footwear',
  'accessory',
];

// ---------- Preferences ----------

export interface Preferences {
  fitPreference: 'slim' | 'regular' | 'relaxed' | 'oversized';
  colourFamily: string;
  avoidMaterials: string[];
  priceCeiling: number;
  likedBrands: string[];
}

export function seedPreferences(): Preferences {
  return {
    fitPreference: 'regular',
    colourFamily: 'neutrals',
    avoidMaterials: ['wool'],
    priceCeiling: 120,
    likedBrands: ['Northlight Apparel', 'Ridgeline Outdoor'],
  };
}

const PREFERENCES_KEY = 'hemloop.preferences';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

/** Read stored preferences, or the seed defaults when storage is empty,
 * unavailable, or holds something malformed. Never throws. */
export function readPreferences(): Preferences {
  if (!hasStorage()) return seedPreferences();
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return seedPreferences();
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const seed = seedPreferences();
    return {
      fitPreference:
        parsed.fitPreference === 'slim' ||
        parsed.fitPreference === 'regular' ||
        parsed.fitPreference === 'relaxed' ||
        parsed.fitPreference === 'oversized'
          ? parsed.fitPreference
          : seed.fitPreference,
      colourFamily:
        typeof parsed.colourFamily === 'string' ? parsed.colourFamily : seed.colourFamily,
      avoidMaterials: Array.isArray(parsed.avoidMaterials)
        ? parsed.avoidMaterials.filter((m): m is string => typeof m === 'string')
        : seed.avoidMaterials,
      priceCeiling:
        typeof parsed.priceCeiling === 'number' && Number.isFinite(parsed.priceCeiling)
          ? parsed.priceCeiling
          : seed.priceCeiling,
      likedBrands: Array.isArray(parsed.likedBrands)
        ? parsed.likedBrands.filter((b): b is string => typeof b === 'string')
        : seed.likedBrands,
    };
  } catch {
    return seedPreferences();
  }
}

export function writePreferences(prefs: Preferences): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

// ---------- Purchases across stores ----------

/** One purchase, from any merchant (including rivals). Never leaves the
 * page as a raw row - only the derived BuyingPattern below does, and only
 * at consent level 3. */
export interface Purchase {
  id: string;
  at: string; // ISO timestamp
  merchant: string;
  brand: string;
  handle?: string;
  title: string;
  category: GarmentCategory;
  size: string;
  price: number;
  currency: string;
  promoCode?: string | null;
  offerId?: string | null;
  source: 'receipt' | 'order-email' | 'manual' | 'lookup' | 'offer';
}

/** ~10 purchases over the last 12 months across four partner brands and one
 * rival (Harborview Basics), mixed promo-code and full-price, one bought
 * through an approved personal offer. Deterministic dates, no `now` call -
 * mirrors seedWardrobe. */
export function seedPurchases(): Purchase[] {
  return [
    {
      id: 'p1',
      at: '2025-09-10T14:22:00.000Z',
      merchant: 'Northlight Apparel online store',
      brand: 'Northlight Apparel',
      title: 'Harborview Crew Tee',
      category: 'tee',
      size: 'M',
      price: 17.18,
      currency: 'CAD',
      promoCode: 'NORTHLIGHT25',
      source: 'receipt',
    },
    {
      id: 'p2',
      at: '2025-10-18T09:05:00.000Z',
      merchant: 'Denim Supply Co. flagship',
      brand: 'Denim Supply Co.',
      handle: 'east-side-straight-jean',
      title: 'East Side Straight Jean',
      category: 'denim',
      size: '32x30',
      price: 68.0,
      currency: 'CAD',
      promoCode: null,
      source: 'manual',
    },
    {
      id: 'p3',
      at: '2025-11-24T18:40:00.000Z',
      merchant: 'Ridgeline Outdoor',
      brand: 'Ridgeline Outdoor',
      handle: 'tidewater-shell-jacket',
      title: 'Tidewater Shell Jacket',
      category: 'jacket',
      size: 'M',
      price: 96.0,
      currency: 'CAD',
      promoCode: null,
      source: 'order-email',
    },
    {
      id: 'p4',
      at: '2025-12-06T12:00:00.000Z',
      merchant: 'Overland Trading Co.',
      brand: 'Overland Trading Co.',
      handle: 'fieldhouse-cap',
      title: 'Fieldhouse Cap',
      category: 'accessory',
      size: 'OS',
      price: 23.4,
      currency: 'CAD',
      promoCode: 'OVERLAND10',
      source: 'order-email',
    },
    {
      id: 'p5',
      at: '2026-01-14T20:15:00.000Z',
      merchant: 'Harborview Basics online',
      brand: 'Harborview Basics',
      title: 'Essential Crew Tee',
      category: 'tee',
      size: 'M',
      price: 12.99,
      currency: 'CAD',
      promoCode: 'HB20',
      source: 'receipt',
    },
    {
      id: 'p6',
      at: '2026-02-02T11:30:00.000Z',
      merchant: 'Northlight Apparel online store',
      brand: 'Northlight Apparel',
      handle: 'northlight-hoodie',
      title: 'Northlight Hoodie',
      category: 'hoodie',
      size: 'L',
      price: 33.68,
      currency: 'CAD',
      promoCode: 'NORTHLIGHT25',
      source: 'manual',
    },
    {
      id: 'p7',
      at: '2026-03-19T16:45:00.000Z',
      merchant: 'Denim Supply Co. flagship',
      brand: 'Denim Supply Co.',
      handle: 'camden-chino',
      title: 'Camden Chino',
      category: 'denim',
      size: '32x30',
      price: 58.0,
      currency: 'CAD',
      promoCode: null,
      source: 'lookup',
    },
    {
      id: 'p8',
      at: '2026-04-27T13:10:00.000Z',
      merchant: 'Harborview Basics online',
      brand: 'Harborview Basics',
      title: 'Woven Cap',
      category: 'accessory',
      size: 'OS',
      price: 15.0,
      currency: 'CAD',
      promoCode: null,
      source: 'receipt',
    },
    {
      id: 'p9',
      at: '2026-06-15T10:00:00.000Z',
      merchant: 'Ridgeline Outdoor',
      brand: 'Ridgeline Outdoor',
      handle: 'amble-court-sneaker',
      title: 'Amble Court Sneaker',
      category: 'footwear',
      size: '10',
      price: 79.0,
      currency: 'CAD',
      promoCode: null,
      source: 'order-email',
    },
    {
      id: 'p10',
      at: '2026-07-30T08:20:00.000Z',
      merchant: 'Northlight Apparel online store',
      brand: 'Northlight Apparel',
      handle: 'solstice-graphic-tee',
      title: 'Solstice Graphic Tee',
      category: 'tee',
      size: 'M',
      price: 18.0,
      currency: 'CAD',
      promoCode: null,
      offerId: 'seed-offer-1',
      source: 'offer',
    },
  ];
}

const PURCHASES_KEY = 'hemloop.purchases';

/** Read stored purchases, or the seed set when storage is empty,
 * unavailable, or holds something malformed. Never throws. */
export function readPurchases(): Purchase[] {
  if (!hasStorage()) return seedPurchases();
  try {
    const raw = window.localStorage.getItem(PURCHASES_KEY);
    if (!raw) return seedPurchases();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedPurchases();
    return parsed;
  } catch {
    return seedPurchases();
  }
}

export function writePurchases(purchases: Purchase[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  } catch {
    /* ignore */
  }
}

/** A coarse, per-category buying pattern the shopper's own agent may share
 * at consent level 3: how they tend to get a discount, how much they tend
 * to spend, and whether they stick to one brand. Never the raw purchases. */
export type BuyingPattern = {
  discountSensitivity: 'code' | 'percent' | 'none';
  spendBand: 'under-50' | '50-100' | '100-plus';
  brandLoyalty: 'loyal' | 'switcher';
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function spendBandFor(medianPrice: number): BuyingPattern['spendBand'] {
  if (medianPrice < 50) return 'under-50';
  if (medianPrice >= 100) return '100-plus';
  return '50-100';
}

/** True when a purchase looks like it was won on a markdown without a
 * promo code: it came from an approved personal offer (the discount is
 * baked into the price, no code needed), or its price sits below the
 * catalog's known regular price for that handle. Pure - reads the
 * committed catalog snapshot, never fetches. */
function isMarkdown(p: Purchase): boolean {
  if (p.promoCode) return false;
  if (p.source === 'offer') return true;
  if (!p.handle) return false;
  const product = demoCatalog.products.find((x) => x.handle === p.handle);
  if (!product) return false;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const regular = onSale ? (product.compareAtPrice as number) : product.price;
  return p.price < regular;
}

/** Derive a category-scoped buying pattern from purchase history: code if
 * most purchases in the category used a promo code, percent if most were on
 * markdown without one, else none; spend band from the median price;
 * brand loyalty from how many distinct brands appear. Ties favour code over
 * percent over none. Pure and total - an empty match returns a neutral
 * default rather than throwing. Optionally scoped to one brand. */
export function buyingPattern(
  purchases: Purchase[],
  category: GarmentCategory,
  brand?: string,
): BuyingPattern {
  const rows = purchases.filter(
    (p) =>
      p.category === category &&
      (!brand || p.brand.toLowerCase() === brand.toLowerCase()),
  );
  if (rows.length === 0) {
    return { discountSensitivity: 'none', spendBand: 'under-50', brandLoyalty: 'loyal' };
  }
  let codeCount = 0;
  let markdownCount = 0;
  let noneCount = 0;
  for (const p of rows) {
    if (p.promoCode) codeCount++;
    else if (isMarkdown(p)) markdownCount++;
    else noneCount++;
  }
  const discountSensitivity: BuyingPattern['discountSensitivity'] =
    codeCount > 0 && codeCount >= markdownCount && codeCount >= noneCount
      ? 'code'
      : markdownCount > 0 && markdownCount >= noneCount
        ? 'percent'
        : 'none';
  const spendBand = spendBandFor(median(rows.map((p) => p.price)));
  const brands = new Set(rows.map((p) => p.brand.toLowerCase()));
  const brandLoyalty: BuyingPattern['brandLoyalty'] = brands.size >= 2 ? 'switcher' : 'loyal';
  return { discountSensitivity, spendBand, brandLoyalty };
}
