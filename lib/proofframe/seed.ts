// Seeded synthetic campaign for the demo. "Northlight Apparel" is a fictional
// brand; every number here is invented.
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

export function seedCampaign(): CampaignState {
  return {
    brief:
      '15-second 9:16 story promo for the Northlight Hoodie back-to-school offer. Energetic, warm, ends on the promo code.',
    facts: {
      productName: 'Northlight Hoodie',
      currency: 'CAD',
      regularPrice: 59.9,
      salePrice: 44.9,
      discountPercent: 25,
      promoCode: 'NORTHLIGHT25',
      startDate: '2026-08-28',
      endDate: '2026-09-07',
      disclaimer: '25% off select styles until Sep 7, 2026. Online only.',
      bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
      purchaseUrl: 'https://hemloop.app/closet?product=northlight-hoodie',
      productImage: '/products/northlight-hoodie.jpg',
      costPrice: 24,
      marginFloorPercent: 35,
      maxDiscountPercent: 30,
    },
    factsLocked: true,
    scenes: [
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
    ],
    format: formatForPlacement('story'),
    style: { background: '#101418', ink: '#f4f1ea', accent: '#ff7a45' },
  };
}

// ---------- Campaign persistence: one campaign for every page ----------
// The Loop Room and /studio used to seed their own in-memory CampaignState, so
// a brief or scene edited on one never showed on the other. Same browser-only
// pattern as hemloop.wardrobe; the seed is what a fresh browser sees on both.
// factsLocked is part of the stored state: a human lock on /studio must show
// as locked on /.

const CAMPAIGN_KEY = 'hemloop.campaign';

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

/** Read the shared campaign, or the seed when storage is empty, unavailable,
 * or holds something malformed. Never throws. */
export function readCampaign(): CampaignState {
  if (!hasStorage()) return seedCampaign();
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return seedCampaign();
    const parsed: unknown = JSON.parse(raw);
    return parseCampaign(parsed) ?? seedCampaign();
  } catch {
    return seedCampaign();
  }
}

export function writeCampaign(campaign: CampaignState): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  } catch {
    /* ignore */
  }
}
