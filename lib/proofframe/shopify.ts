// Shopify product import. The demo storefront (a password-protected dev
// store) cannot serve tokenless client-side requests, so facts come from a
// committed snapshot of the real store's catalog.
// ponytail: snapshot import; swap in a live Storefront API fetch once a
// storefront token exists — the importer signature already matches.
// Refresh: see "Catalog snapshot" in docs/TECH-GUIDE.md.
import catalogJson from './catalog.json';
import kidsCatalogJson from './catalog-kids.json';
import type { CampaignFacts } from './types';

export interface CatalogProduct {
  handle: string;
  title: string;
  description: string;
  currency: string;
  price: number;
  compareAtPrice: number | null;
  vendor?: string;
  productType?: string;
  tags?: string[];
  image?: string;
  options?: { name: string; values: string[] }[];
  variants?: {
    sku: string;
    title: string;
    size?: string;
    colour?: string;
    price: number;
    compareAtPrice: number | null;
    inventoryQuantity: number;
  }[];
  metafields?: { material?: string; fit?: string; care?: string; origin?: string };
  url?: string;
}

export interface Catalog {
  source: string;
  kind: string;
  generatedAt: string;
  products: CatalogProduct[];
}

export const demoCatalog = catalogJson as Catalog;
export const kidsCatalog = kidsCatalogJson as Catalog;

/** Map one catalog product onto campaign facts. Prices come from the store;
 * promo terms (code, dates, disclaimer, banned phrases) stay human-owned. */
export function productToFacts(
  product: CatalogProduct,
  current: CampaignFacts,
): CampaignFacts {
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  return {
    ...current,
    productName: product.title,
    currency: product.currency,
    regularPrice: onSale ? (product.compareAtPrice as number) : product.price,
    salePrice: onSale ? product.price : null,
    discountPercent: onSale
      ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
      : null,
  };
}

/**
 * Build an importProduct callback for the WebMCP adapter.
 * `getFacts` supplies the current facts so promo terms carry over.
 */
export function makeCatalogImporter(
  getFacts: () => CampaignFacts,
  catalog: Catalog = demoCatalog,
): (handle: string) => CampaignFacts {
  return (handle: string) => {
    const product = catalog.products.find((p) => p.handle === handle);
    if (!product) {
      const known = catalog.products
        .slice(0, 8)
        .map((p) => p.handle)
        .join(', ');
      throw new Error(`Unknown product handle "${handle}". Try one of: ${known}, …`);
    }
    return productToFacts(product, getFacts());
  };
}
