// Pure receipt / order-email parser. No OCR, no network - just two pasted
// text shapes the shopper already has: a till receipt and an
// order-confirmation email. Understood defensively: bounded input, bounded
// items, no throw on garbage (returns null instead).
import { guessCategory, type GarmentCategory } from './closet';
import type { CatalogProduct } from './shopify';

export interface ParsedReceipt {
  merchant: string;
  at: string; // ISO timestamp
  promoCode: string | null;
  currency: string;
  items: {
    title: string;
    category: GarmentCategory | null;
    size: string | null;
    price: number;
    qty: number;
  }[];
}

const MAX_TEXT = 4000;
const MAX_ITEMS = 20;
const MAX_MERCHANT = 80;

/** Guess a garment category from an item title, reusing the same keyword
 * map guessCategory already uses for catalog products. Only title matters
 * here - the other CatalogProduct fields are unused filler. */
function categoryFor(title: string): GarmentCategory | null {
  const product: CatalogProduct = {
    handle: '',
    title,
    description: '',
    currency: 'CAD',
    price: 0,
    compareAtPrice: null,
  };
  return guessCategory(product);
}

function isoFromDateLike(line: string): string | null {
  const match = line.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const d = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Till receipt: "1 x Everyday Fleece Hoodie M  $44.90"
const TILL_ITEM_RE = /^(\d+)\s*x\s+(.+?)\s+([A-Za-z0-9./]+)\s+\$(\d+(?:\.\d{1,2})?)$/i;
// Order email: "Essential Crew Tee - Size M - $12.99 x1"
const EMAIL_ITEM_RE = /^(.+?)\s*-\s*Size\s+([A-Za-z0-9./]+)\s*-\s*\$(\d+(?:\.\d{1,2})?)\s*x(\d+)$/i;
const PROMO_RE = /^PROMO\s+(\S+)/i;
const DISCOUNT_CODE_RE = /Discount code:\s*(\S+)/i;
const ORDER_AT_RE = /thank you for your order at\s+(.+?)\.?$/i;

/** Parse pasted receipt or order-email text into purchase candidates.
 * Bounds input to 4000 chars and items to 20. Returns null when neither
 * known shape yields at least one item - never throws on garbage input. */
export function parseReceipt(text: string): ParsedReceipt | null {
  if (typeof text !== 'string') return null;
  const bounded = text.slice(0, MAX_TEXT);
  const lines = bounded
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const isEmail = lines.some(
    (l) => /^order\s*#/i.test(l) || /thank you for your order/i.test(l),
  );

  let merchant = lines[0];
  let promoCode: string | null = null;
  let at: string | null = null;
  const items: ParsedReceipt['items'] = [];

  if (isEmail) {
    const atLine = lines.find((l) => ORDER_AT_RE.test(l));
    const atMatch = atLine?.match(ORDER_AT_RE);
    if (atMatch) merchant = atMatch[1].trim();

    for (const line of lines) {
      if (items.length >= MAX_ITEMS) break;
      const m = line.match(EMAIL_ITEM_RE);
      if (!m) continue;
      const title = m[1].trim();
      const size = m[2];
      const price = Number(m[3]);
      const qty = Number(m[4]);
      if (!title || !Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) continue;
      items.push({ title, category: categoryFor(title), size, price, qty });
    }

    const discountMatch = bounded.match(DISCOUNT_CODE_RE);
    if (discountMatch) promoCode = discountMatch[1];
  } else {
    for (const line of lines) {
      if (items.length >= MAX_ITEMS) break;
      const m = line.match(TILL_ITEM_RE);
      if (!m) continue;
      const qty = Number(m[1]);
      const title = m[2].trim();
      const size = m[3];
      const price = Number(m[4]);
      if (!title || !Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) continue;
      items.push({ title, category: categoryFor(title), size, price, qty });
    }

    const promoLine = lines.find((l) => PROMO_RE.test(l));
    const promoMatch = promoLine?.match(PROMO_RE);
    if (promoMatch) promoCode = promoMatch[1];
  }

  for (const line of lines) {
    const iso = isoFromDateLike(line);
    if (iso) {
      at = iso;
      break;
    }
  }

  if (items.length === 0) return null;

  return {
    merchant: merchant.slice(0, MAX_MERCHANT),
    at: at ?? new Date().toISOString(),
    promoCode,
    currency: 'CAD',
    items: items.slice(0, MAX_ITEMS),
  };
}

/** Two paste-ready samples for the studio's "Paste sample" buttons and for
 * tests, one per format parseReceipt understands. */
export const SAMPLE_RECEIPTS: { label: string; text: string }[] = [
  {
    label: 'Till receipt (Northlight Apparel)',
    text: [
      'Northlight Apparel',
      '482 King St W, Toronto ON',
      '1 x Everyday Fleece Hoodie M  $44.90',
      '1 x Solstice Graphic Tee M  $28.90',
      'PROMO NORTHLIGHT25',
      '2026-07-12',
    ].join('\n'),
  },
  {
    label: 'Order email (Harborview Basics)',
    text: [
      'Order #78421',
      'Thank you for your order at Harborview Basics',
      'Essential Crew Tee - Size M - $12.99 x1',
      'Woven Cap - Size OS - $15.00 x1',
      'Discount code: HB20',
      'Order date: 2026-04-27',
    ].join('\n'),
  },
];
