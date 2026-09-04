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

export interface Merchant {
  id: string;
  name: string;
  facts: CampaignFacts;
}

const DATES = {
  startDate: '2026-08-28',
  endDate: '2026-09-07',
} as const;

/** The five merchants from MERCHANTS-BRIEF.md. Numbers are calibrated so a
 * hoodie · M request yields the table's verdicts at Basics and Taste. */
export function seedMerchants(): Merchant[] {
  return [
    {
      id: 'northlight',
      name: 'Northlight Apparel',
      facts: {
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
        sizesInStock: ['S', 'M', 'L', 'XL'],
        costPrice: 24,
        marginFloorPercent: 35,
        maxDiscountPercent: 30,
      },
    },
    {
      id: 'harborview',
      name: 'Harborview Basics',
      facts: {
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
        productImage: '/products/northlight-hoodie.jpg',
        sizesInStock: ['XS', 'S', 'M', 'L', 'XL'],
        costPrice: 36,
        marginFloorPercent: 30,
        maxDiscountPercent: 20,
      },
    },
    {
      id: 'ridgeline',
      name: 'Ridgeline Outdoor',
      facts: {
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
        productImage: '/products/northlight-hoodie.jpg',
        sizesInStock: ['S', 'L', 'XL'],
        costPrice: 40,
        marginFloorPercent: 35,
        maxDiscountPercent: 25,
      },
    },
    {
      id: 'denim-supply',
      name: 'Denim Supply Co.',
      facts: {
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
        productImage: '/products/northlight-hoodie.jpg',
        sizesInStock: ['28', '30', '32', '34', '36'],
        costPrice: 38,
        marginFloorPercent: 35,
        maxDiscountPercent: 20,
      },
    },
    {
      id: 'overland',
      name: 'Overland Trading Co.',
      facts: {
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
        productImage: '/products/northlight-hoodie.jpg',
        sizesInStock: ['XS', 'S', 'M', 'L', 'XL'],
        costPrice: 45,
        marginFloorPercent: 40,
        maxDiscountPercent: 10,
      },
    },
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
  const rows: MarketRow[] = merchants.map((merchant) => {
    const result = matchOffer({
      request,
      facts: merchant.facts,
      catalogProduct: catalogProductForMerchant(merchant.facts),
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
        merchantId: merchant.id,
        name: merchant.name,
        verdict,
        reason: reasonFor(verdict, null, refuse, request.size ?? null),
        price: null,
        currency: merchant.facts.currency,
      };
    }

    if (!result.marginCheck.ok) {
      return {
        merchantId: merchant.id,
        name: merchant.name,
        verdict: 'margin-floor' as const,
        reason: reasonFor('margin-floor', result, null, request.size ?? null),
        price: null,
        currency: merchant.facts.currency,
      };
    }

    if (shopperCeiling !== null && result.price > shopperCeiling) {
      return {
        merchantId: merchant.id,
        name: merchant.name,
        verdict: 'over-ceiling' as const,
        reason: reasonFor('over-ceiling', result, null, request.size ?? null),
        price: null,
        currency: merchant.facts.currency,
      };
    }

    return {
      merchantId: merchant.id,
      name: merchant.name,
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
