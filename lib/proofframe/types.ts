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

export interface CampaignFormat {
  width: number;
  height: number;
  fps: number;
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
    | 'total-duration';
  message: string;
  sceneId?: string;
  found?: string;
  expected?: string;
}
