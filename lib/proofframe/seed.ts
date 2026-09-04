// Seeded campaigns per merchant. Facts come from seedMerchants(); scenes and
// brief stay presentation. Per-merchant storage: hemloop.campaigns +
// hemloop.merchant, with a one-shot migration from the old hemloop.campaign key.
import {
  merchantById,
  seedMerchants,
  type Merchant,
} from './merchants';
import type {
  CampaignFacts,
  CampaignFormat,
  CampaignState,
  Placement,
  Scene,
  SceneKind,
  SceneStyle,
} from './types';
import { formatForPlacement } from './types';
import { MAX_SCENE_SECONDS, MAX_TOTAL_SECONDS } from './validator';
import {
  canonicalDate,
  clampString,
  isSafeHttpsUrl,
  isSameOriginProductImage,
  nonNegFinite,
  percentInRange,
  safeCssColor,
} from './storage-policy';

const DEFAULT_MERCHANT_ID = 'northlight';
const MAX_SCENES = 12;
const MAX_BRIEF = 2000;
const SCENE_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

function scenesFor(merchant: Merchant): Scene[] {
  if (merchant.id === 'northlight') {
    return [
      {
        id: 'hero',
        kind: 'hero',
        heading: 'Layer up for the season',
        body: 'The Northlight Hoodie is back.',
        durationSec: 4,
      },
      {
        id: 'product',
        kind: 'product',
        heading: 'Heavyweight fleece. Zero fuss.',
        body: 'Brushed inside, boxy fit, six colours.',
        durationSec: 4,
      },
      {
        id: 'offer',
        kind: 'offer',
        heading: '25% off right now',
        body: '$59.90 → $44.90 with code NORTHLIGHT25',
        durationSec: 4,
        style: { background: '#1d3557', accent: '#ffd166' },
      },
      {
        id: 'cta',
        kind: 'cta',
        heading: 'Northlight Apparel',
        body: 'Shop the drop before Sep 7.',
        durationSec: 3,
      },
    ];
  }
  const price =
    merchant.facts.salePrice ??
    (merchant.facts.discountPercent
      ? Math.round(merchant.facts.regularPrice * (1 - merchant.facts.discountPercent / 100) * 100) /
        100
      : merchant.facts.regularPrice);
  return [
    {
      id: 'hero',
      kind: 'hero',
      heading: merchant.facts.productName,
      body: `${merchant.name}.`,
      durationSec: 4,
    },
    {
      id: 'offer',
      kind: 'offer',
      heading: merchant.facts.discountPercent
        ? `${merchant.facts.discountPercent}% off`
        : 'Locked offer',
      body: `$${merchant.facts.regularPrice.toFixed(2)} → $${price.toFixed(2)}`,
      durationSec: 4,
    },
    {
      id: 'cta',
      kind: 'cta',
      heading: merchant.name,
      body: merchant.facts.disclaimer,
      durationSec: 3,
    },
  ];
}

/** Build a campaign from a merchant. Default is Northlight Apparel. */
export function seedCampaign(merchantId: string = DEFAULT_MERCHANT_ID): CampaignState {
  const merchant =
    merchantById(merchantId) ?? seedMerchants().find((m) => m.id === DEFAULT_MERCHANT_ID)!;
  return {
    brief: `15-second 9:16 story promo for ${merchant.facts.productName}. Energetic, warm, ends on the offer.`,
    facts: { ...merchant.facts, bannedPhrases: [...merchant.facts.bannedPhrases] },
    factsLocked: true,
    scenes: scenesFor(merchant),
    format: formatForPlacement('story'),
    style: { background: '#101418', ink: '#f4f1ea', accent: '#ff7a45' },
  };
}

// ---------- Per-merchant campaign persistence ----------

const CAMPAIGNS_KEY = 'hemloop.campaigns';
const MERCHANT_KEY = 'hemloop.merchant';
/** Pre-multi-merchant single-campaign key; migrated into campaigns.northlight. */
const LEGACY_CAMPAIGN_KEY = 'hemloop.campaign';

const SCENE_KINDS: readonly SceneKind[] = ['hero', 'product', 'offer', 'cta'];
const PLACEMENTS: readonly Placement[] = ['story', 'feed', 'display'];

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function isSceneKind(value: unknown): value is SceneKind {
  return typeof value === 'string' && (SCENE_KINDS as readonly string[]).includes(value);
}

function isPlacement(value: unknown): value is Placement {
  return typeof value === 'string' && (PLACEMENTS as readonly string[]).includes(value);
}

function parseFacts(value: unknown): CampaignFacts | null {
  if (!value || typeof value !== 'object') return null;
  const f = value as Record<string, unknown>;
  const productName = clampString(f.productName, 120);
  const currency = clampString(f.currency, 8);
  if (!productName || !currency) return null;
  const regularPrice = nonNegFinite(f.regularPrice, 100_000);
  if (regularPrice === null) return null;
  let salePrice: number | null = null;
  if (f.salePrice !== null && f.salePrice !== undefined) {
    salePrice = nonNegFinite(f.salePrice, 100_000);
    if (salePrice === null) return null;
  }
  let discountPercent: number | null = null;
  if (f.discountPercent !== null && f.discountPercent !== undefined) {
    discountPercent = percentInRange(f.discountPercent);
    if (discountPercent === null) return null;
  }
  let promoCode: string | null = null;
  if (f.promoCode !== null && f.promoCode !== undefined) {
    promoCode = clampString(f.promoCode, 40);
    if (!promoCode) return null;
  }
  const startDate = canonicalDate(f.startDate);
  const endDate = canonicalDate(f.endDate);
  if (!startDate || !endDate || startDate > endDate) return null;
  const disclaimer = clampString(f.disclaimer, 500);
  if (!disclaimer) return null;
  if (!Array.isArray(f.bannedPhrases) || f.bannedPhrases.length > 20) return null;
  const bannedPhrases: string[] = [];
  for (const p of f.bannedPhrases) {
    const phrase = clampString(p, 40);
    if (!phrase) return null;
    bannedPhrases.push(phrase);
  }

  const facts: CampaignFacts = {
    productName,
    currency,
    regularPrice,
    salePrice,
    discountPercent,
    promoCode,
    startDate,
    endDate,
    disclaimer,
    bannedPhrases,
  };
  if (f.purchaseUrl !== undefined) {
    if (!isSafeHttpsUrl(f.purchaseUrl, 300)) return null;
    facts.purchaseUrl = f.purchaseUrl;
  }
  if (f.productImage !== undefined) {
    if (!isSameOriginProductImage(f.productImage)) return null;
    facts.productImage = f.productImage;
  }
  if (f.sizesInStock !== undefined) {
    if (!Array.isArray(f.sizesInStock) || f.sizesInStock.length > 20) return null;
    const sizes: string[] = [];
    for (const s of f.sizesInStock) {
      const size = clampString(s, 10);
      if (!size) return null;
      sizes.push(size);
    }
    facts.sizesInStock = sizes;
  }
  if (f.costPrice !== undefined) {
    const cost = nonNegFinite(f.costPrice, 100_000);
    if (cost === null) return null;
    facts.costPrice = cost;
  }
  if (f.marginFloorPercent !== undefined) {
    const floor = percentInRange(f.marginFloorPercent);
    if (floor === null) return null;
    facts.marginFloorPercent = floor;
  }
  if (f.maxDiscountPercent !== undefined) {
    const max = percentInRange(f.maxDiscountPercent);
    if (max === null) return null;
    facts.maxDiscountPercent = max;
  }
  if (f.offerId !== undefined) {
    const offerId = clampString(f.offerId, 80);
    if (!offerId) return null;
    facts.offerId = offerId;
  }
  return facts;
}

function parseSceneStyle(value: unknown): Partial<SceneStyle> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const s = value as Record<string, unknown>;
  const out: Partial<SceneStyle> = {};
  if (s.background !== undefined) {
    const c = safeCssColor(s.background);
    if (!c) return undefined;
    out.background = c;
  }
  if (s.ink !== undefined) {
    const c = safeCssColor(s.ink);
    if (!c) return undefined;
    out.ink = c;
  }
  if (s.accent !== undefined) {
    const c = safeCssColor(s.accent);
    if (!c) return undefined;
    out.accent = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseScene(value: unknown): Scene | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== 'string' || !SCENE_ID_RE.test(s.id)) return null;
  if (!isSceneKind(s.kind)) return null;
  const heading = clampString(s.heading, 200);
  const body = clampString(s.body, 800);
  if (!heading || !body) return null;
  if (typeof s.durationSec !== 'number' || !Number.isFinite(s.durationSec)) return null;
  if (!(s.durationSec > 0 && s.durationSec <= MAX_SCENE_SECONDS)) return null;
  const scene: Scene = {
    id: s.id,
    kind: s.kind,
    heading,
    body,
    durationSec: s.durationSec,
  };
  if (s.style !== undefined) {
    if (!s.style || typeof s.style !== 'object' || Array.isArray(s.style)) return null;
    const raw = s.style as Record<string, unknown>;
    if (Object.keys(raw).length > 0) {
      const style = parseSceneStyle(s.style);
      if (!style) return null;
      scene.style = style;
    }
  }
  return scene;
}

function parseFormat(value: unknown): CampaignFormat | null {
  if (!value || typeof value !== 'object') return null;
  const f = value as Record<string, unknown>;
  if (!isPlacement(f.placement)) return null;
  const expected = formatForPlacement(f.placement);
  if (typeof f.width !== 'number' || f.width !== expected.width) return null;
  if (typeof f.height !== 'number' || f.height !== expected.height) return null;
  if (typeof f.fps !== 'number' || f.fps !== expected.fps) return null;
  return { ...expected };
}

function parseStyle(value: unknown): SceneStyle | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  const background = safeCssColor(s.background);
  const ink = safeCssColor(s.ink);
  const accent = safeCssColor(s.accent);
  if (!background || !ink || !accent) return null;
  return { background, ink, accent };
}

/** Rebuild a CampaignState from storage only when facts and scenes (and the
 * surrounding shape) look trustworthy. Anything else falls back to the seed. */
function parseCampaign(value: unknown): CampaignState | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  const brief = clampString(c.brief, MAX_BRIEF);
  if (!brief) return null;
  if (typeof c.factsLocked !== 'boolean') return null;
  const facts = parseFacts(c.facts);
  if (!facts) return null;
  if (!Array.isArray(c.scenes) || c.scenes.length === 0 || c.scenes.length > MAX_SCENES) {
    return null;
  }
  const scenes: Scene[] = [];
  let total = 0;
  for (const row of c.scenes) {
    const scene = parseScene(row);
    if (!scene) return null;
    total += scene.durationSec;
    if (total > MAX_TOTAL_SECONDS) return null;
    scenes.push(scene);
  }
  const format = parseFormat(c.format);
  if (!format) return null;
  const style = parseStyle(c.style);
  if (!style) return null;
  return { brief, facts, factsLocked: c.factsLocked, scenes, format, style };
}

function readCampaignsMap(): Record<string, CampaignState> {
  if (!hasStorage()) return {};
  try {
    migrateLegacyCampaign();
    const raw = window.localStorage.getItem(CAMPAIGNS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, CampaignState> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const campaign = parseCampaign(value);
      if (campaign) out[id] = campaign;
    }
    return out;
  } catch {
    return {};
  }
}

function writeCampaignsMap(map: Record<string, CampaignState>): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** One-shot: old hemloop.campaign → campaigns.northlight, then delete the key. */
function migrateLegacyCampaign(): void {
  if (!hasStorage()) return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_CAMPAIGN_KEY);
    if (!legacy) return;
    const campaign = parseCampaign(JSON.parse(legacy));
    const existingRaw = window.localStorage.getItem(CAMPAIGNS_KEY);
    const map: Record<string, CampaignState> = existingRaw
      ? ((JSON.parse(existingRaw) as Record<string, CampaignState>) ?? {})
      : {};
    if (campaign && !map[DEFAULT_MERCHANT_ID]) {
      map[DEFAULT_MERCHANT_ID] = campaign;
      window.localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(map));
    }
    window.localStorage.removeItem(LEGACY_CAMPAIGN_KEY);
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_CAMPAIGN_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function readActiveMerchantId(): string {
  if (!hasStorage()) return DEFAULT_MERCHANT_ID;
  try {
    const raw = window.localStorage.getItem(MERCHANT_KEY);
    if (raw && merchantById(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_MERCHANT_ID;
}

export function writeActiveMerchantId(merchantId: string): void {
  if (!hasStorage()) return;
  if (!merchantById(merchantId)) return;
  try {
    window.localStorage.setItem(MERCHANT_KEY, merchantId);
  } catch {
    /* ignore */
  }
}

/** Read one merchant's campaign, or the seed when empty/corrupt. */
export function readCampaign(merchantId: string = readActiveMerchantId()): CampaignState {
  if (!merchantById(merchantId)) return seedCampaign(DEFAULT_MERCHANT_ID);
  if (!hasStorage()) return seedCampaign(merchantId);
  try {
    const map = readCampaignsMap();
    return map[merchantId] ?? seedCampaign(merchantId);
  } catch {
    return seedCampaign(merchantId);
  }
}

export function writeCampaign(merchantId: string, campaign: CampaignState): void;
export function writeCampaign(campaign: CampaignState): void;
export function writeCampaign(
  merchantIdOrCampaign: string | CampaignState,
  maybeCampaign?: CampaignState,
): void {
  if (!hasStorage()) return;
  const merchantId =
    typeof merchantIdOrCampaign === 'string' ? merchantIdOrCampaign : readActiveMerchantId();
  const campaign =
    typeof merchantIdOrCampaign === 'string' ? maybeCampaign! : merchantIdOrCampaign;
  if (!merchantById(merchantId)) return;
  try {
    const map = readCampaignsMap();
    map[merchantId] = campaign;
    writeCampaignsMap(map);
  } catch {
    /* ignore */
  }
}
