// Shopper-side domain: a private wardrobe, fit knowledge, and data-minimized
// demand signals. A signal carries no shopper identifier or wardrobe rows.
import type { Catalog, CatalogProduct } from './shopify';
import { demoCatalog, kidsCatalog } from './shopify';
import {
  canonicalDate,
  clampString,
  isSameOriginProductImage,
  nonNegFinite,
} from './storage-policy';

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

/** One row in the closet payload preview: a field with its draft value, and
 * whether the current sharing level would let it travel. */
export interface NextRequestPreviewRow {
  field: ConsentField | 'kind';
  label: string;
  value: string;
  travels: boolean;
}

const PREVIEW_FIELD_LABEL: Record<ConsentField | 'kind', string> = {
  kind: 'Kind',
  category: 'Category',
  size: 'Size',
  level: 'Need or want',
  handle: 'Product handle',
  occasion: 'Occasion',
  for: 'Shopping for',
  fitPreference: 'Fit preference',
  colourFamily: 'Colour family',
  avoidMaterials: 'Materials to avoid',
  priceCeiling: 'Price ceiling',
  buyingPattern: 'Buying pattern',
};

/** Build the ACTUAL next-request draft from the top wardrobe gap, then mark
 * each field as travelling or held back at the current consent level. Pure.
 * Returns null when there is no gap to report. */
export function nextRequestPreview(
  gap: Gap | undefined,
  args: {
    consentLevel: 0 | 1 | 2 | 3;
    sizeHint: string | null;
    profile: ShopperProfile;
    preferences: Preferences;
    pattern: BuyingPattern | null;
  },
): { kind: DemandSignal['kind']; rows: NextRequestPreviewRow[] } | null {
  if (!gap) return null;
  const kind: DemandSignal['kind'] = gap.due ? 'replace' : 'gap';
  const size = gap.due?.size ?? args.sizeHint;
  const hasSize = typeof size === 'string' && size.length > 0;
  const traveling = new Set(
    consentFieldsForRequest(args.consentLevel, {
      hasSize,
      hasHandle: false,
      hasOccasion: false,
    }),
  );
  const patternText = args.pattern
    ? `${args.pattern.discountSensitivity} · ${args.pattern.spendBand} · ${args.pattern.brandLoyalty}`
    : null;
  const draft: { field: ConsentField | 'kind'; value: string | null }[] = [
    { field: 'kind', value: kind },
    { field: 'category', value: gap.category },
    { field: 'level', value: 'Need' },
    { field: 'size', value: hasSize ? size! : null },
    {
      field: 'for',
      value: args.profile === 'self' ? 'Me' : args.profile === 'partner' ? 'Partner' : 'Kid',
    },
    { field: 'fitPreference', value: args.preferences.fitPreference },
    { field: 'colourFamily', value: args.preferences.colourFamily },
    {
      field: 'avoidMaterials',
      value:
        args.preferences.avoidMaterials.length > 0
          ? args.preferences.avoidMaterials.join(', ')
          : null,
    },
    { field: 'priceCeiling', value: String(args.preferences.priceCeiling) },
    { field: 'buyingPattern', value: patternText },
  ];
  // Kind always describes the draft; consent only gates the payload fields.
  // Rows without a value stay out so the preview matches what report_demand_gap
  // would actually send (no empty handle / occasion).
  const rows: NextRequestPreviewRow[] = [];
  for (const entry of draft) {
    if (entry.value === null) continue;
    if (entry.field === 'kind') {
      rows.push({
        field: 'kind',
        label: PREVIEW_FIELD_LABEL.kind,
        value: entry.value,
        travels: args.consentLevel > 0,
      });
      continue;
    }
    // Only show fields this draft can carry at full Taste (L3), so raising
    // the dial visibly adds rows (Basics → Context → Taste) rather than
    // listing every ConsentField enum member.
    const atFull = consentFieldsForRequest(3, {
      hasSize,
      hasHandle: false,
      hasOccasion: false,
    });
    if (!atFull.includes(entry.field)) continue;
    rows.push({
      field: entry.field,
      label: PREVIEW_FIELD_LABEL[entry.field],
      value: entry.value,
      travels: traveling.has(entry.field),
    });
  }
  return { kind, rows };
}

export function seedWardrobe(): Wardrobe {
  return {
    garments: [
      {
        id: 'g1',
        category: 'tee',
        brand: 'Bluenotes',
        size: 'M',
        colour: 'white',
        image: '/products/bluenotes-relaxed-tee.jpg',
        price: 19.99,
        currency: 'CAD',
        retailer: 'Bluenotes online store',
        material: 'Cotton jersey',
        purchasedAt: '2025-11-02',
      },
      {
        id: 'g2',
        category: 'tee',
        brand: 'Aeropostale',
        size: 'M',
        colour: 'sage',
        image: '/products/aero-ribbed-tee.jpg',
        price: 19.99,
        currency: 'CAD',
        retailer: 'Aeropostale online store',
        material: 'Ribbed cotton',
        purchasedAt: '2026-01-15',
      },
      {
        id: 'g3',
        category: 'tee',
        brand: 'Harborview Basics',
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
        brand: 'Bluenotes',
        size: '32x30',
        colour: 'indigo',
        image: '/products/bluenotes-mom-jean.jpg',
        price: 29.99,
        currency: 'CAD',
        retailer: 'Bluenotes online store',
        material: 'Rigid cotton denim',
        purchasedAt: '2025-09-12',
      },
      {
        id: 'g5',
        category: 'denim',
        brand: 'Aeropostale',
        size: '32x30',
        colour: 'washed',
        image: '/products/aero-wide-leg-cargo-jean.jpg',
        price: 12.0,
        currency: 'CAD',
        retailer: 'Aeropostale online store',
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
        brand: 'Aeropostale',
        size: 'OS',
        colour: 'white',
        image: '/products/aero-no-show-socks.jpg',
        price: 14.99,
        currency: 'CAD',
        retailer: 'Aeropostale online store',
        material: 'Cotton blend',
        purchasedAt: '2025-06-18',
      },
      {
        id: 'g8',
        category: 'jacket',
        brand: 'Bluenotes',
        size: 'M',
        colour: 'ecru',
        image: '/products/bluenotes-sherpa-shacket.jpg',
        price: 69.99,
        currency: 'CAD',
        retailer: 'Bluenotes online store',
        material: 'Sherpa-lined cotton twill',
        purchasedAt: '2025-12-24',
      },
      // Two more so 'self' opens at ten rows. Same categories the closet
      // already covers, so the seed's three gaps (hoodie, thin jacket, worn
      // footwear) are unchanged.
      {
        id: 'g12',
        category: 'denim',
        brand: 'Denim Supply Co.',
        size: '32',
        colour: 'indigo',
        image: '/products/east-side-straight-jean.jpg',
        price: 79.0,
        currency: 'CAD',
        retailer: 'Denim Supply Co. online store',
        material: '13oz rigid denim',
        purchasedAt: '2026-03-14',
      },
      {
        id: 'g13',
        category: 'accessory',
        brand: 'Overland Trading Co.',
        size: 'OS',
        colour: 'olive',
        image: '/products/fieldhouse-cap.jpg',
        price: 24.0,
        currency: 'CAD',
        retailer: 'Overland Trading Co.',
        material: 'Cotton twill',
        purchasedAt: '2026-06-02',
      },
      {
        id: 'g9',
        category: 'tee',
        brand: 'Little Trailhead',
        size: '8',
        colour: 'red',
        image: '/products/kids-tee.jpg',
        price: 16.0,
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
        image: '/products/kids-sneakers.jpg',
        price: 42.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Canvas upper, rubber sole',
        purchasedAt: '2026-05-01',
        for: 'kid',
      },
      {
        id: 'g14',
        category: 'denim',
        brand: 'Little Trailhead',
        size: '10',
        colour: 'khaki',
        image: '/products/kids-chino.jpg',
        price: 32.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Cotton twill',
        purchasedAt: '2026-03-18',
        for: 'kid',
      },
      {
        id: 'g15',
        category: 'denim',
        brand: 'Little Trailhead',
        size: '8',
        colour: 'indigo',
        image: '/products/kids-denim.jpg',
        price: 38.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Cotton denim',
        purchasedAt: '2026-02-08',
        for: 'kid',
      },
      {
        id: 'g16',
        category: 'jacket',
        brand: 'Little Trailhead',
        size: '8',
        colour: 'olive',
        image: '/products/kids-jacket.jpg',
        price: 48.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Nylon shell',
        purchasedAt: '2025-12-02',
        for: 'kid',
      },
      {
        id: 'g17',
        category: 'accessory',
        brand: 'Little Trailhead',
        size: 'OS',
        colour: 'olive',
        image: '/products/kids-cap.jpg',
        price: 18.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Cotton twill',
        purchasedAt: '2026-06-11',
        for: 'kid',
      },
      {
        id: 'g18',
        category: 'tee',
        brand: 'Little Trailhead',
        size: '10',
        colour: 'sage',
        image: '/products/kids-crew.jpg',
        price: 28.0,
        currency: 'CAD',
        retailer: 'Little Trailhead',
        material: 'Cotton fleece',
        purchasedAt: '2026-01-22',
        for: 'kid',
      },
      {
        id: 'g11',
        category: 'hoodie',
        brand: 'Bluenotes',
        size: 'L',
        colour: 'bone',
        image: '/products/bluenotes-crew-sweatshirt.jpg',
        price: 29.99,
        currency: 'CAD',
        retailer: 'Bluenotes online store',
        material: 'Cotton fleece',
        purchasedAt: '2026-01-20',
        for: 'partner',
      },
      {
        id: 'g19',
        category: 'hoodie',
        brand: 'Northlight Apparel',
        size: 'XL',
        colour: 'ink',
        image: '/products/northlight-hoodie.jpg',
        price: 44.9,
        currency: 'CAD',
        retailer: 'Northlight Apparel',
        material: '400gsm brushed cotton fleece',
        purchasedAt: '2025-08-12',
        for: 'partner',
      },
      {
        id: 'g20',
        category: 'tee',
        brand: 'Harborview Basics',
        size: 'L',
        colour: 'white',
        image: '/products/harborview-crew-tee.jpg',
        price: 22.9,
        currency: 'CAD',
        retailer: 'Harborview Basics',
        material: 'Cotton jersey',
        purchasedAt: '2025-10-14',
        for: 'partner',
      },
      {
        id: 'g21',
        category: 'tee',
        brand: 'Aeropostale',
        size: 'XL',
        colour: 'black',
        image: '/products/aero-ribbed-tee.jpg',
        price: 24.99,
        currency: 'CAD',
        retailer: 'Aeropostale',
        material: 'Ribbed cotton',
        purchasedAt: '2026-03-02',
        for: 'partner',
      },
      {
        id: 'g22',
        category: 'denim',
        brand: 'Denim Supply Co.',
        size: '34',
        colour: 'indigo',
        image: '/products/east-side-straight-jean.jpg',
        price: 79.0,
        currency: 'CAD',
        retailer: 'Denim Supply Co. online store',
        material: '13oz rigid denim',
        purchasedAt: '2025-11-30',
        for: 'partner',
      },
      {
        id: 'g23',
        category: 'jacket',
        brand: 'Ridgeline Outdoor',
        size: 'L',
        colour: 'navy',
        image: '/products/tidewater-shell-jacket.jpg',
        price: 128.0,
        currency: 'CAD',
        retailer: 'Ridgeline Outdoor',
        material: 'Nylon shell',
        purchasedAt: '2025-09-08',
        for: 'partner',
      },
      {
        id: 'g24',
        category: 'accessory',
        brand: 'Fieldhouse',
        size: 'OS',
        colour: 'navy',
        image: '/products/fieldhouse-cap.jpg',
        price: 32.0,
        currency: 'CAD',
        retailer: 'Fieldhouse',
        material: 'Cotton twill',
        purchasedAt: '2026-04-03',
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

/** Most rows one profile's closet will hold; add_garment and randomGarments
 * both stop here. */
export const MAX_CLOSET_ROWS = 20;

/** Draw `count` garments for one profile from a profile-appropriate catalog
 * pool (adult demo catalog for self/partner; kids catalog for kid), so every
 * row has a real brand, photo and size. Pure given `rand` (0..1); never pushes
 * the profile past MAX_CLOSET_ROWS. Dates land inside the last six months so a
 * random draw cannot invent a worn-out garment. */
export function randomGarments(
  count: number,
  wardrobe: Wardrobe,
  profile: ShopperProfile,
  rand: () => number = Math.random,
  catalog?: Catalog,
  now: Date = new Date(),
): Garment[] {
  const poolCatalog = catalog ?? (profile === 'kid' ? kidsCatalog : demoCatalog);
  const owned = garmentsForProfile(wardrobe, profile).garments.length;
  const room = Math.max(0, Math.min(count, MAX_CLOSET_ROWS - owned));
  const pool = poolCatalog.products.filter((p) => guessCategory(p) !== null);
  const out: Garment[] = [];
  const stamp = now.getTime().toString(36);
  for (let i = 0; i < room && pool.length > 0; i++) {
    const product = pool[Math.floor(rand() * pool.length)];
    const sizes = product.options?.find((o) => o.name === 'Size')?.values ?? ['OS'];
    const colours = product.options?.find((o) => o.name === 'Colour')?.values ?? ['unspecified'];
    const daysAgo = Math.floor(rand() * 180);
    const purchasedAt = new Date(now.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10);
    out.push({
      id: `r-${stamp}-${i}`,
      category: guessCategory(product)!,
      brand: product.vendor ?? 'Unknown',
      size: sizes[Math.floor(rand() * sizes.length)],
      colour: colours[Math.floor(rand() * colours.length)].toLowerCase(),
      image: product.image,
      price: product.price,
      currency: product.currency,
      retailer: `${product.vendor ?? 'Unknown'} online store`,
      purchasedAt,
      for: profile,
    });
  }
  return out;
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
    priceCeiling: 60,
    likedBrands: ['Bluenotes', 'Aeropostale'],
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
      merchant: 'Bluenotes online store',
      brand: 'Bluenotes',
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
      merchant: 'Aeropostale online store',
      brand: 'Aeropostale',
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
      merchant: 'Aeropostale online store',
      brand: 'Aeropostale',
      handle: 'fieldhouse-cap',
      title: 'A87 No-Show Socks 3-Pack',
      category: 'accessory',
      size: 'OS',
      price: 23.4,
      currency: 'CAD',
      promoCode: 'AERO10',
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
      merchant: 'Bluenotes online store',
      brand: 'Bluenotes',
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

// ---------- Wardrobe persistence: one closet for every page ----------
// The Loop Room and /closet used to seed their own in-memory wardrobe, so a
// garment added on one never showed on the other. Same browser-only pattern
// as purchases; the seed is what a fresh browser sees on both.

const WARDROBE_KEY = 'hemloop.wardrobe';
/** Bumped when seedWardrobe gains rows browsers with an older store must merge in. */
const WARDROBE_SEED_KEY = 'hemloop.wardrobe.seed';
export const WARDROBE_SEED_VERSION = 2;
const MAX_WARDROBE_ROWS = 60;
const SHOPPER_PROFILES: readonly ShopperProfile[] = ['self', 'partner', 'kid'];

/** Rebuild one garment from storage. Drop the row (return null) rather than
 * pass through a partially checked original object. */
export function toGarment(value: unknown): Garment | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const g = value as Record<string, unknown>;
  const id = clampString(g.id, 64);
  if (!id) return null;
  if (typeof g.category !== 'string' || !GARMENT_CATEGORIES.includes(g.category as GarmentCategory)) {
    return null;
  }
  const brand = clampString(g.brand, 40);
  const size = clampString(g.size, 20);
  const colour = clampString(g.colour, 40);
  if (!brand || !size || !colour) return null;

  const out: Garment = {
    id,
    category: g.category as GarmentCategory,
    brand,
    size,
    colour,
  };
  if (g.image !== undefined) {
    if (!isSameOriginProductImage(g.image)) return null;
    out.image = g.image;
  }
  if (g.price !== undefined) {
    const price = nonNegFinite(g.price, 100_000);
    if (price === null) return null;
    out.price = price;
  }
  if (g.currency !== undefined) {
    const currency = clampString(g.currency, 8);
    if (!currency) return null;
    out.currency = currency;
  }
  if (g.retailer !== undefined) {
    const retailer = clampString(g.retailer, 80);
    if (!retailer) return null;
    out.retailer = retailer;
  }
  if (g.material !== undefined) {
    const material = clampString(g.material, 80);
    if (!material) return null;
    out.material = material;
  }
  if (g.purchasedAt !== undefined) {
    const purchasedAt = canonicalDate(g.purchasedAt);
    if (!purchasedAt) return null;
    out.purchasedAt = purchasedAt;
  }
  if (g.for !== undefined) {
    if (typeof g.for !== 'string' || !(SHOPPER_PROFILES as readonly string[]).includes(g.for)) {
      return null;
    }
    out.for = g.for as ShopperProfile;
  }
  return out;
}

export function readWardrobe(): Wardrobe {
  if (!hasStorage()) return seedWardrobe();
  try {
    const raw = window.localStorage.getItem(WARDROBE_KEY);
    if (!raw) {
      const seed = seedWardrobe();
      writeWardrobe(seed);
      return seed;
    }
    const parsed: unknown = JSON.parse(raw);
    const garmentsRaw = (parsed as { garments?: unknown })?.garments;
    if (!Array.isArray(garmentsRaw)) return seedWardrobe();
    const cleaned: Garment[] = [];
    for (const row of garmentsRaw.slice(0, MAX_WARDROBE_ROWS)) {
      const garment = toGarment(row);
      if (garment) cleaned.push(garment);
    }
    const storedVersion = Number(window.localStorage.getItem(WARDROBE_SEED_KEY) ?? '0');
    if (!Number.isFinite(storedVersion) || storedVersion < WARDROBE_SEED_VERSION) {
      const ids = new Set(cleaned.map((g) => g.id));
      for (const row of seedWardrobe().garments) {
        if (ids.has(row.id)) continue;
        cleaned.push(row);
        ids.add(row.id);
      }
      const merged: Wardrobe = { garments: cleaned.slice(0, MAX_WARDROBE_ROWS) };
      writeWardrobe(merged);
      return merged;
    }
    return { garments: cleaned };
  } catch {
    return seedWardrobe();
  }
}

export function writeWardrobe(wardrobe: Wardrobe): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(WARDROBE_KEY, JSON.stringify(wardrobe));
    window.localStorage.setItem(WARDROBE_SEED_KEY, String(WARDROBE_SEED_VERSION));
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
