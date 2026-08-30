// Shopper-side domain: a private wardrobe, fit knowledge, and the hashed
// demand signals that are the ONLY thing allowed to leave for the merchant.
// The raw wardrobe never crosses the bridge; a signal carries a one-way
// hash, a category and a size - nothing re-identifiable.
import type { Catalog, CatalogProduct } from './shopify';
import { demoCatalog } from './shopify';

export type GarmentCategory =
  | 'hoodie'
  | 'tee'
  | 'denim'
  | 'jacket'
  | 'footwear'
  | 'accessory';

export interface Garment {
  id: string;
  category: GarmentCategory;
  brand: string;
  size: string;
  colour: string;
}

export interface Wardrobe {
  shopperId: string; // private; never leaves the closet page unhashed
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

export interface DemandSignal {
  signalId: string;
  shopperHash: string; // one-way hash of shopperId
  kind: 'gap' | 'fit' | 'want';
  category: GarmentCategory;
  size: string | null;
  handle: string | null;
  at: string; // ISO timestamp
}

/** 32-bit FNV-1a, hex. One-way enough for a demo privacy bridge.
 * ponytail: swap for SHA-256 via crypto.subtle if this ever leaves demo. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function seedWardrobe(): Wardrobe {
  return {
    shopperId: 'shopper-demo-001',
    garments: [
      { id: 'g1', category: 'tee', brand: 'Aurora Threads', size: 'M', colour: 'bone' },
      { id: 'g2', category: 'tee', brand: 'Aurora Threads', size: 'M', colour: 'moss' },
      { id: 'g3', category: 'tee', brand: 'Field Supply', size: 'M', colour: 'black' },
      { id: 'g4', category: 'denim', brand: 'Field Supply', size: '32x30', colour: 'indigo' },
      { id: 'g5', category: 'denim', brand: 'Field Supply', size: '32x30', colour: 'washed' },
      { id: 'g6', category: 'footwear', brand: 'Northgate', size: '10', colour: 'white' },
      { id: 'g7', category: 'accessory', brand: 'Aurora Threads', size: 'OS', colour: 'olive' },
      { id: 'g8', category: 'jacket', brand: 'Northgate', size: 'M', colour: 'navy' },
    ],
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
  ['denim', /denim|jean|pant/i],
  ['jacket', /jacket|coat|parka/i],
  ['footwear', /boot|shoe|sneaker|snowboard boot/i],
  ['accessory', /card|wax|bag|beanie|accessor/i],
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
    return { handle, category: null, ownedSize: null, note: `Unknown product "${handle}".` };
  }
  const category = guessCategory(product);
  if (!category) {
    return { handle, category: null, ownedSize: null, note: 'No fit history for this product type.' };
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

/** Build the hashed signal that crosses the privacy bridge. Contains no raw
 * shopper id, no garment list, no personal data. */
export function makeSignal(
  wardrobe: Wardrobe,
  input: { kind: DemandSignal['kind']; category: GarmentCategory; size?: string; handle?: string },
  now: () => string = () => new Date().toISOString(),
): DemandSignal {
  const at = now();
  return {
    signalId: fnv1a(`${wardrobe.shopperId}|${input.kind}|${input.category}|${at}`),
    shopperHash: fnv1a(wardrobe.shopperId),
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
