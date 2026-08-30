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

export interface Garment {
  id: string;
  category: GarmentCategory;
  brand: string;
  size: string;
  colour: string;
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

export interface DemandSignal {
  signalId: string;
  kind: 'gap' | 'fit' | 'want';
  category: GarmentCategory;
  size: string | null;
  handle: string | null;
  at: string; // ISO timestamp
}

export function seedWardrobe(): Wardrobe {
  return {
    garments: [
      {
        id: 'g1',
        category: 'tee',
        brand: 'Aurora Threads',
        size: 'M',
        colour: 'bone',
      },
      {
        id: 'g2',
        category: 'tee',
        brand: 'Aurora Threads',
        size: 'M',
        colour: 'moss',
      },
      {
        id: 'g3',
        category: 'tee',
        brand: 'Field Supply',
        size: 'M',
        colour: 'black',
      },
      {
        id: 'g4',
        category: 'denim',
        brand: 'Field Supply',
        size: '32x30',
        colour: 'indigo',
      },
      {
        id: 'g5',
        category: 'denim',
        brand: 'Field Supply',
        size: '32x30',
        colour: 'washed',
      },
      {
        id: 'g6',
        category: 'footwear',
        brand: 'Northgate',
        size: '10',
        colour: 'white',
      },
      {
        id: 'g7',
        category: 'accessory',
        brand: 'Aurora Threads',
        size: 'OS',
        colour: 'olive',
      },
      {
        id: 'g8',
        category: 'jacket',
        brand: 'Northgate',
        size: 'M',
        colour: 'navy',
      },
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
): DemandSignal {
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
