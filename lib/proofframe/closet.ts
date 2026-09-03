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
  | 'priceCeiling';

export interface ConsentGrant {
  level: 0 | 1 | 2 | 3;
  fields: ConsentField[];
}

export type Occasion = 'everyday' | 'season' | 'gift' | 'event';

export interface DemandSignal {
  signalId: string;
  kind: 'gap' | 'fit' | 'want';
  category: GarmentCategory;
  size: string | null;
  handle: string | null;
  at: string; // ISO timestamp
  /** Derived from kind: gap or fit -> 'need', want -> 'want'. */
  level: 'need' | 'want';
  occasion?: Occasion;
  for?: ShopperProfile;
  consent: ConsentGrant;
  /** Only present at consent level >= 2. */
  context?: { fitPreference?: string };
  /** Only present at consent level 3. */
  taste?: { colourFamily?: string; avoidMaterials?: string[]; priceCeiling?: number };
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
    fields.push('colourFamily', 'avoidMaterials', 'priceCeiling');
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
        purchasedAt: '2026-03-05',
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
        image: '/products/black-hoodie.jpg',
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

/** Categories the wardrobe is missing or thin on. Pure. */
export function findGaps(wardrobe: Wardrobe): Gap[] {
  const gaps: Gap[] = [];
  for (const category of ESSENTIALS) {
    const owned = wardrobe.garments.filter((g) => g.category === category);
    if (owned.length === 0) {
      gaps.push({ category, reason: `No ${category} in the wardrobe.` });
    } else if (owned.length === 1) {
      gaps.push({ category, reason: `Only one ${category} in rotation.` });
    }
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
