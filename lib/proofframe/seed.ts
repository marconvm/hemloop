// Seeded synthetic campaign for the demo. "Aurora Threads" is a fictional
// brand; every number here is invented.
import type { CampaignState } from './types';

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
      promoCode: 'AURORA25',
      startDate: '2026-08-28',
      endDate: '2026-09-07',
      disclaimer: '25% off select styles until Sep 7, 2026. Online only.',
      bannedPhrases: ['free', 'guaranteed', 'lowest price', 'best ever'],
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
        body: '$59.90 → $44.90 with code AURORA25',
        durationSec: 4,
        style: { background: '#1d3557', accent: '#ffd166' },
      },
      {
        id: 'cta',
        kind: 'cta',
        heading: 'Aurora Threads',
        body: 'Shop the drop before Sep 7.',
        durationSec: 3,
      },
    ],
    format: { width: 1080, height: 1920, fps: 30 },
    style: { background: '#101418', ink: '#f4f1ea', accent: '#ff7a45' },
  };
}
