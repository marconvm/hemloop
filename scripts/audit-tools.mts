// Script audit of every registered tool against the WebMCP rules in
// docs/coordination/DUAL-REVIEW-WAVE6-BRIEF.md: name and description lengths,
// closed schemas, annotations. Run: npx tsx scripts/audit-tools.mts
import { buildClosetTools } from '../lib/proofframe/webmcp-closet';
import { buildTools } from '../lib/proofframe/webmcp';
import { seedWardrobe, seedPreferences, seedPurchases } from '../lib/proofframe/closet';
import { seedCampaign } from '../lib/proofframe/seed';

type Schema = { properties?: Record<string, { description?: string }>; additionalProperties?: boolean };

const closet = buildClosetTools({
  getWardrobe: () => seedWardrobe(),
  addGarment: (i) => ({ id: 'x', ...i }),
  consumeShareApproval: () => false,
  emitSignal: () => true,
  getActiveProfile: () => 'self',
  getConsentLevel: () => 1,
  getPreferences: () => seedPreferences(),
  getPurchases: () => seedPurchases(),
  addPurchases: () => {},
});
const studio = buildTools({
  getState: () => seedCampaign(),
  setBrief: () => {},
  addScene: (i) => ({ id: 's', ...i }),
  updateScene: () => {},
  reorderScenes: () => {},
  seekPreview: () => {},
  importProduct: () => seedCampaign().facts,
  deliverExport: () => {},
  getRequests: () => [],
  getOffers: () => [],
  stageOffer: () => {},
  getCatalogProduct: () => undefined,
  getBoughtRequestIds: () => [],
});

let total = 0;
for (const [surface, tools] of [['closet', closet], ['studio', studio]] as const) {
  for (const t of tools) {
    total += t.description.length;
    const schema = t.inputSchema as Schema;
    const props = schema.properties ?? {};
    const maxParam = Math.max(0, ...Object.values(props).map((p) => (p.description ?? '').length));
    console.log(
      `${surface}\t${t.name.padEnd(19)} name=${t.name.length}\tdesc=${t.description.length}\taddlProps=${schema.additionalProperties === false}\treadOnly=${Boolean(t.annotations?.readOnlyHint)}\tuntrusted=${Boolean(t.annotations?.untrustedContentHint)}\tmaxParamDesc=${maxParam}`,
    );
  }
}
console.log(`tools=${closet.length + studio.length} descriptionChars=${total}`);
