export interface RuntimeToolView {
  name: string;
  title?: string;
  description: string;
  readOnly: boolean;
}

export interface LoopCreative {
  kind: 'product' | 'composition' | 'checkout';
  image?: string;
  alt?: string;
  kicker: string;
  title: string;
  detail?: string;
  href?: string;
}

export interface ProcessingView {
  tool: string;
  label: string;
}
