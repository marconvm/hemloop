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

const DEFAULT_MERCHANT_ID = 'northlight';

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
  if (typeof f.productName !== 'string') return null;
  if (typeof f.currency !== 'string') return null;
  if (typeof f.regularPrice !== 'number' || !Number.isFinite(f.regularPrice)) return null;
  if (!(f.salePrice === null || (typeof f.salePrice === 'number' && Number.isFinite(f.salePrice)))) {
    return null;
  }
  if (
    !(
      f.discountPercent === null ||
      (typeof f.discountPercent === 'number' && Number.isFinite(f.discountPercent))
    )
  ) {
    return null;
  }
  if (!(f.promoCode === null || typeof f.promoCode === 'string')) return null;
  if (typeof f.startDate !== 'string') return null;
  if (typeof f.endDate !== 'string') return null;
  if (typeof f.disclaimer !== 'string') return null;
  if (!Array.isArray(f.bannedPhrases) || !f.bannedPhrases.every((p) => typeof p === 'string')) {
    return null;
  }

  const facts: CampaignFacts = {
    productName: f.productName,
    currency: f.currency,
    regularPrice: f.regularPrice,
    salePrice: f.salePrice,
    discountPercent: f.discountPercent,
    promoCode: f.promoCode,
    startDate: f.startDate,
    endDate: f.endDate,
    disclaimer: f.disclaimer,
    bannedPhrases: f.bannedPhrases.filter((p): p is string => typeof p === 'string'),
  };
  if (typeof f.purchaseUrl === 'string') facts.purchaseUrl = f.purchaseUrl;
  if (typeof f.productImage === 'string') facts.productImage = f.productImage;
  if (Array.isArray(f.sizesInStock) && f.sizesInStock.every((s) => typeof s === 'string')) {
    facts.sizesInStock = f.sizesInStock;
  }
  if (typeof f.costPrice === 'number' && Number.isFinite(f.costPrice)) facts.costPrice = f.costPrice;
  if (typeof f.marginFloorPercent === 'number' && Number.isFinite(f.marginFloorPercent)) {
    facts.marginFloorPercent = f.marginFloorPercent;
  }
  if (typeof f.maxDiscountPercent === 'number' && Number.isFinite(f.maxDiscountPercent)) {
    facts.maxDiscountPercent = f.maxDiscountPercent;
  }
  if (typeof f.offerId === 'string') facts.offerId = f.offerId;
  return facts;
}

function parseSceneStyle(value: unknown): Partial<SceneStyle> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const s = value as Record<string, unknown>;
  const out: Partial<SceneStyle> = {};
  if (typeof s.background === 'string') out.background = s.background;
  if (typeof s.ink === 'string') out.ink = s.ink;
  if (typeof s.accent === 'string') out.accent = s.accent;
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseScene(value: unknown): Scene | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== 'string') return null;
  if (!isSceneKind(s.kind)) return null;
  if (typeof s.heading !== 'string') return null;
  if (typeof s.body !== 'string') return null;
  if (typeof s.durationSec !== 'number' || !Number.isFinite(s.durationSec)) return null;
  const scene: Scene = {
    id: s.id,
    kind: s.kind,
    heading: s.heading,
    body: s.body,
    durationSec: s.durationSec,
  };
  const style = parseSceneStyle(s.style);
  if (style) scene.style = style;
  return scene;
}

function parseFormat(value: unknown): CampaignFormat | null {
  if (!value || typeof value !== 'object') return null;
  const f = value as Record<string, unknown>;
  if (!isPlacement(f.placement)) return null;
  if (typeof f.width !== 'number' || !Number.isFinite(f.width)) return null;
  if (typeof f.height !== 'number' || !Number.isFinite(f.height)) return null;
  if (typeof f.fps !== 'number' || !Number.isFinite(f.fps)) return null;
  return {
    width: f.width,
    height: f.height,
    fps: f.fps,
    placement: f.placement,
  };
}

function parseStyle(value: unknown): SceneStyle | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  if (typeof s.background !== 'string') return null;
  if (typeof s.ink !== 'string') return null;
  if (typeof s.accent !== 'string') return null;
  return { background: s.background, ink: s.ink, accent: s.accent };
}

/** Rebuild a CampaignState from storage only when facts and scenes (and the
 * surrounding shape) look trustworthy. Anything else falls back to the seed. */
function parseCampaign(value: unknown): CampaignState | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  if (typeof c.brief !== 'string') return null;
  if (typeof c.factsLocked !== 'boolean') return null;
  const facts = parseFacts(c.facts);
  if (!facts) return null;
  if (!Array.isArray(c.scenes)) return null;
  const scenes: Scene[] = [];
  for (const row of c.scenes) {
    const scene = parseScene(row);
    if (!scene) return null;
    scenes.push(scene);
  }
  const format = parseFormat(c.format);
  if (!format) return null;
  const style = parseStyle(c.style);
  if (!style) return null;
  return { brief: c.brief, facts, factsLocked: c.factsLocked, scenes, format, style };
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
