// ProofFrame domain types. All data is synthetic — no real merchant data.

export interface CampaignFacts {
  productName: string;
  currency: string; // ISO code, e.g. "CAD"
  regularPrice: number;
  salePrice: number | null;
  discountPercent: number | null;
  promoCode: string | null;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  disclaimer: string; // must appear in the finished composition
  bannedPhrases: string[]; // copy that legal never allows, case-insensitive
  purchaseUrl?: string;
  productImage?: string;
  sizesInStock?: string[];
}

export type SceneKind = 'hero' | 'product' | 'offer' | 'cta';

export interface SceneStyle {
  background: string;
  ink: string;
  accent: string;
}

export interface Scene {
  id: string; // [a-z][a-z0-9-]* — enforced by the exporter
  kind: SceneKind;
  heading: string;
  body: string;
  durationSec: number;
  style?: Partial<SceneStyle>;
}

// A placement is a human choice (ad surface + aspect ratio), never an
// agent-writable field: no WebMCP tool sets it, only the studio UI.
export type Placement = 'story' | 'feed' | 'display';

export interface PlacementPreset {
  label: string;
  ratio: string; // display label, e.g. "9:16"
  width: number;
  height: number;
  fps: number;
}

export const PLACEMENTS: Record<Placement, PlacementPreset> = {
  story: { label: 'Story', ratio: '9:16', width: 1080, height: 1920, fps: 30 },
  feed: { label: 'Feed', ratio: '4:5', width: 1080, height: 1350, fps: 30 },
  display: { label: 'Display', ratio: '16:9', width: 1920, height: 1080, fps: 30 },
};

/** Build a CampaignFormat from a placement preset. */
export function formatForPlacement(placement: Placement): CampaignFormat {
  const preset = PLACEMENTS[placement];
  return { width: preset.width, height: preset.height, fps: preset.fps, placement };
}

export interface CampaignFormat {
  width: number;
  height: number;
  fps: number;
  placement: Placement;
}

export interface CampaignState {
  brief: string;
  facts: CampaignFacts;
  factsLocked: boolean; // locking is HUMAN-ONLY (UI); no WebMCP tool may flip it
  scenes: Scene[];
  format: CampaignFormat;
  style: SceneStyle;
}

export interface Violation {
  rule:
    | 'discount-mismatch'
    | 'price-mismatch'
    | 'code-mismatch'
    | 'banned-phrase'
    | 'missing-disclaimer'
    | 'scene-duration'
    | 'scene-kind'
    | 'total-duration';
  message: string;
  sceneId?: string;
  found?: string;
  expected?: string;
}
