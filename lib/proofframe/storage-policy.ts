// Shared client-storage integrity helpers for campaign, wardrobe and offer
// readback. Same-origin localStorage is not authenticated; parsers must
// rebuild exact bounded shapes or fall back to seed.

const CSS_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|rgb\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|[a-zA-Z]{1,20})$/;

/** Same-origin product assets only — never https://, data:, or javascript:. */
const PRODUCT_IMAGE_RE = /^\/products\/[a-z0-9][a-z0-9._-]{0,80}\.(?:jpg|jpeg|png|webp)$/i;

export function clampString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > max) return null;
  return value;
}

export function isSafeCssColor(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && CSS_COLOR_RE.test(value.trim());
}

export function safeCssColor(value: unknown): string | null {
  if (!isSafeCssColor(value)) return null;
  return value.trim();
}

/** https checkout URLs only (no javascript:, data:, or http). */
export function isSafeHttpsUrl(value: unknown, maxLen = 300): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLen) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSameOriginProductImage(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_IMAGE_RE.test(value);
}

/** Canonical calendar day, or null. */
export function canonicalDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 32) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export function nonNegFinite(value: unknown, max = 1_000_000): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > max) return null;
  return value;
}

export function percentInRange(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}
