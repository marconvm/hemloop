// Five sample merchants and the pure market scan that decides who can answer
// one request. Verdicts and prices only — no merchant's cost or floor leaves
// this module toward another merchant or the shopper.

import type { MarketRow, MarketVerdict } from './loop-room';
import {
  matchOffer,
  slug,
  type DemandSignalLike,
  type PersonalOffer,
} from './offers';
import type { CampaignFacts } from './types';

/** One SKU line the merchant actually owns. `sizesInStock` is derived as the
 * distinct sizes with qty > 0 — never hand-edited beside this list. */
export interface MerchantInventoryRow {
  sku: string;
  size: string;
  qty: number;
}

export interface Merchant {
  id: string;
  name: string;
  facts: CampaignFacts;
  inventory: MerchantInventoryRow[];
}

const DATES = {
  startDate: '2026-08-28',
  endDate: '2026-09-07',
} as const;

/** Distinct sizes with qty > 0, first-seen order. Pure. */
export function sizesInStockFromInventory(inventory: MerchantInventoryRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of inventory) {
    if (row.qty <= 0) continue;
    if (seen.has(row.size)) continue;
    seen.add(row.size);
    out.push(row.size);
  }
  return out;
}

function merchant(
  id: string,
  name: string,
  facts: Omit<CampaignFacts, 'sizesInStock'> & { sizesInStock?: string[] },
  inventory: MerchantInventoryRow[],
): Merchant {
  const sizesInStock = sizesInStockFromInventory(inventory);
  return {
    id,
    name,
    inventory,
    facts: { ...facts, sizesInStock },
  };
}

/** The five merchants from MERCHANTS-BRIEF.md. Numbers are calibrated so a
 * hoodie · M request yields the table's verdicts at Basics and Taste.
 * Northlight inventory mirrors catalog.json variants; Ridgeline M is qty 0 so
 * size-not-in-stock stays true. */
export function seedMerchants(): Merchant[] {
  return [
    merchant(
      'northlight',
      'Northlight Apparel',
      {
        productName: 'Northlight Hoodie',
        currency: 'CAD',
        regularPrice: 59.9,
        salePrice: 44.9,
        discountPercent: 25,
        promoCode: 'NORTHLIGHT25',
        ...DATES,
        disclaimer: '25% off select styles until Sep 7, 2026. Online only.',
        bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
        purchaseUrl: 'https://hemloop.app/closet?product=northlight-hoodie',
        productImage: '/products/northlight-hoodie.jpg',
        costPrice: 24,
        marginFloorPercent: 35,
        maxDiscountPercent: 30,
      },
      // Same SKUs / qty as catalog.json northlight-hoodie variants.
      [
        { sku: 'NL-HD-MOSS-S', size: 'S', qty: 18 },
        { sku: 'NL-HD-MOSS-M', size: 'M', qty: 26 },
        { sku: 'NL-HD-BONE-M', size: 'M', qty: 14 },
        { sku: 'NL-HD-BONE-L', size: 'L', qty: 9 },
        { sku: 'NL-HD-INK-M', size: 'M', qty: 21 },
        { sku: 'NL-HD-INK-XL', size: 'XL', qty: 6 },
      ],
    ),
    merchant(
      'harborview',
      'Harborview Basics',
      {
        productName: 'Harbor Fleece Hoodie',
        currency: 'CAD',
        regularPrice: 49,
        salePrice: 39.2,
        discountPercent: 20,
        promoCode: 'HARBOR20',
        ...DATES,
        disclaimer: '20% off Harbor fleece until Sep 7, 2026. Online only.',
        bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
        purchaseUrl: 'https://hemloop.app/closet?product=harbor-fleece-hoodie',
        productImage: '/products/kids-hoodie.jpg',
        costPrice: 36,
        marginFloorPercent: 30,
        maxDiscountPercent: 20,
      },
      [
        { sku: 'HV-HD-FLEECE-XS', size: 'XS', qty: 8 },
        { sku: 'HV-HD-FLEECE-S', size: 'S', qty: 16 },
        { sku: 'HV-HD-FLEECE-M', size: 'M', qty: 22 },
        { sku: 'HV-HD-FLEECE-L', size: 'L', qty: 14 },
        { sku: 'HV-HD-FLEECE-XL', size: 'XL', qty: 7 },
      ],
    ),
    merchant(
      'ridgeline',
      'Ridgeline Outdoor',
      {
        productName: 'Summit Fleece Hoodie',
        currency: 'CAD',
        regularPrice: 79,
        salePrice: null,
        discountPercent: null,
        promoCode: null,
        ...DATES,
        disclaimer: 'Summit Fleece, full price. Online only.',
        bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
        purchaseUrl: 'https://hemloop.app/closet?product=summit-fleece-hoodie',
        productImage: '/products/tidewater-shell-jacket.jpg',
        costPrice: 40,
        marginFloorPercent: 35,
        maxDiscountPercent: 25,
      },
      [
        { sku: 'RL-HD-SUMMIT-S', size: 'S', qty: 11 },
        { sku: 'RL-HD-SUMMIT-M', size: 'M', qty: 0 },
        { sku: 'RL-HD-SUMMIT-L', size: 'L', qty: 9 },
        { sku: 'RL-HD-SUMMIT-XL', size: 'XL', qty: 5 },
      ],
    ),
    merchant(
      'denim-supply',
      'Denim Supply Co.',
      {
        productName: 'East Side Straight Jean',
        currency: 'CAD',
        regularPrice: 78,
        salePrice: 62.4,
        discountPercent: 20,
        promoCode: 'DENIM20',
        ...DATES,
        disclaimer: '20% off East Side denim until Sep 7, 2026. Online only.',
        bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
        purchaseUrl: 'https://hemloop.app/closet?product=east-side-straight',
        productImage: '/products/east-side-straight-jean.jpg',
        costPrice: 38,
        marginFloorPercent: 35,
        maxDiscountPercent: 20,
      },
      [
        { sku: 'DS-JN-EAST-28', size: '28', qty: 6 },
        { sku: 'DS-JN-EAST-30', size: '30', qty: 12 },
        { sku: 'DS-JN-EAST-32', size: '32', qty: 18 },
        { sku: 'DS-JN-EAST-34', size: '34', qty: 10 },
        { sku: 'DS-JN-EAST-36', size: '36', qty: 4 },
      ],
    ),
    merchant(
      'overland',
      'Overland Trading Co.',
      {
        productName: 'Fieldhouse Fleece Hoodie',
        currency: 'CAD',
        regularPrice: 89,
        // No advertised sale; personal offers still use the 10% cap.
        salePrice: null,
        discountPercent: 10,
        promoCode: null,
        ...DATES,
        disclaimer: 'Fieldhouse Fleece. Online only.',
        bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
        purchaseUrl: 'https://hemloop.app/closet?product=fieldhouse-fleece',
        productImage: '/products/bluenotes-sherpa-shacket.jpg',
        costPrice: 45,
        marginFloorPercent: 40,
        maxDiscountPercent: 10,
      },
      [
        { sku: 'OL-HD-FIELD-XS', size: 'XS', qty: 5 },
        { sku: 'OL-HD-FIELD-S', size: 'S', qty: 10 },
        { sku: 'OL-HD-FIELD-M', size: 'M', qty: 15 },
        { sku: 'OL-HD-FIELD-L', size: 'L', qty: 12 },
        { sku: 'OL-HD-FIELD-XL', size: 'XL', qty: 8 },
      ],
    ),
  ];
}

export function merchantById(id: string, merchants: Merchant[] = seedMerchants()): Merchant | undefined {
  return merchants.find((m) => m.id === id);
}

/** Catalog-shaped product for matchOffer, from the merchant's own facts. */
export function catalogProductForMerchant(facts: CampaignFacts) {
  return {
    handle: slug(facts.productName),
    title: facts.productName,
    image: facts.productImage,
    sizesInStock: facts.sizesInStock,
  };
}

function isOffer(result: ReturnType<typeof matchOffer>): result is PersonalOffer {
  return !('ok' in result && result.ok === false);
}

function reasonFor(
  verdict: MarketVerdict,
  offer: PersonalOffer | null,
  refuseReason: string | null,
  size: string | null = null,
): string {
  switch (verdict) {
    case 'can-offer':
      return offer
        ? `margin ${offer.marginCheck.resultingMarginPercent}%`
        : 'Can offer';
    case 'size-not-in-stock':
      return size ? `${size} sold out` : 'Size sold out';
    case 'category-mismatch':
      return 'Other category';
    case 'margin-floor': {
      if (!offer) return 'Cannot clear the margin floor';
      const { resultingMarginPercent, floorPercent } = offer.marginCheck;
      return `margin ${resultingMarginPercent}% under the ${floorPercent}% floor`;
    }
    case 'over-ceiling':
      return offer
        ? `${offer.price.toFixed(2)} is above the ceiling`
        : 'Above the shopper ceiling';
    default:
      return refuseReason ?? 'Cannot offer';
  }
}

/**
 * Pure market scan: one request against every merchant's locked rules.
 * `shopperCeiling` is only set when the request carried taste.priceCeiling
 * (sharing level 3); otherwise over-ceiling never fires.
 */
export function marketScan(
  request: DemandSignalLike,
  merchants: Merchant[] = seedMerchants(),
  shopperCeiling: number | null = null,
  now: Date = new Date(),
): MarketRow[] {
  const rows: MarketRow[] = merchants.map((merchantRow) => {
    const result = matchOffer({
      request,
      facts: merchantRow.facts,
      catalogProduct: catalogProductForMerchant(merchantRow.facts),
      now,
    });

    if (!isOffer(result)) {
      const refuse = result.reason;
      const verdict: MarketVerdict =
        refuse === 'size not in stock'
          ? 'size-not-in-stock'
          : refuse === 'category mismatch'
            ? 'category-mismatch'
            : 'category-mismatch';
      return {
        merchantId: merchantRow.id,
        name: merchantRow.name,
        verdict,
        reason: reasonFor(verdict, null, refuse, request.size ?? null),
        price: null,
        currency: merchantRow.facts.currency,
      };
    }

    if (!result.marginCheck.ok) {
      return {
        merchantId: merchantRow.id,
        name: merchantRow.name,
        verdict: 'margin-floor' as const,
        reason: reasonFor('margin-floor', result, null, request.size ?? null),
        price: null,
        currency: merchantRow.facts.currency,
      };
    }

    if (shopperCeiling !== null && result.price > shopperCeiling) {
      return {
        merchantId: merchantRow.id,
        name: merchantRow.name,
        verdict: 'over-ceiling' as const,
        reason: reasonFor('over-ceiling', result, null, request.size ?? null),
        price: null,
        currency: merchantRow.facts.currency,
      };
    }

    return {
      merchantId: merchantRow.id,
      name: merchantRow.name,
      verdict: 'can-offer' as const,
      reason: reasonFor('can-offer', result, null, request.size ?? null),
      price: result.price,
      currency: result.currency,
    };
  });

  const can = rows.filter((r) => r.verdict === 'can-offer');
  const rest = rows.filter((r) => r.verdict !== 'can-offer');
  // can-offer first (seed order among them), then the rest in seed order.
  const canIds = new Set(can.map((r) => r.merchantId));
  const orderedCan = merchants
    .filter((m) => canIds.has(m.id))
    .map((m) => can.find((r) => r.merchantId === m.id)!);
  const orderedRest = merchants
    .filter((m) => !canIds.has(m.id))
    .map((m) => rest.find((r) => r.merchantId === m.id)!);
  return [...orderedCan, ...orderedRest];
}
