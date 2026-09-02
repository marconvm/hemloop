import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedCampaign } from '../lib/proofframe/seed';
import { demoCatalog, makeCatalogImporter, productToFacts } from '../lib/proofframe/shopify';
import { buildTools, type ToolContent } from '../lib/proofframe/webmcp';
import type { Violation } from '../lib/proofframe/types';

interface ToolPayload {
  ok: boolean;
  error?: string;
  message?: string;
  facts?: Record<string, unknown>;
  violations?: Violation[];
}

function payload(result: ToolContent): ToolPayload {
  return result as unknown as ToolPayload;
}

void test('catalog snapshot has the demo product first and real provenance', () => {
  assert.equal(demoCatalog.source, 'playground-6mz3jwlf.myshopify.com');
  assert.equal(demoCatalog.products[0]?.handle, 'northlight-hoodie');
  assert.ok(demoCatalog.products.length >= 10);
});

void test('productToFacts derives sale pricing and keeps promo terms human-owned', () => {
  const current = seedCampaign().facts;
  const facts = productToFacts(
    {
      handle: 'x',
      title: 'Test Tee',
      description: '',
      currency: 'CAD',
      price: 30,
      compareAtPrice: 40,
    },
    current,
  );
  assert.equal(facts.productName, 'Test Tee');
  assert.equal(facts.regularPrice, 40);
  assert.equal(facts.salePrice, 30);
  assert.equal(facts.discountPercent, 25);
  // promo terms untouched
  assert.equal(facts.promoCode, current.promoCode);
  assert.equal(facts.disclaimer, current.disclaimer);

  const fullPrice = productToFacts(
    { handle: 'y', title: 'Full', description: '', currency: 'CAD', price: 30, compareAtPrice: null },
    current,
  );
  assert.equal(fullPrice.regularPrice, 30);
  assert.equal(fullPrice.salePrice, null);
  assert.equal(fullPrice.discountPercent, null);
});

void test('importer resolves northlight-hoodie and rejects unknown handles', () => {
  const importer = makeCatalogImporter(() => seedCampaign().facts);
  const facts = importer('northlight-hoodie');
  assert.equal(facts.productName, 'Northlight Hoodie');
  assert.equal(facts.regularPrice, 59.9);
  assert.equal(facts.salePrice, 44.9);
  assert.equal(facts.discountPercent, 25);
  assert.throws(() => importer('no-such-product'), /Unknown product handle/);
});

void test('import_product tool returns a structured error instead of throwing', async () => {
  const state = seedCampaign();
  const tools = buildTools({
    getState: () => state,
    setBrief: () => {},
    addScene: (input) => ({ id: 'scene-x', ...input }),
    updateScene: () => {},
    reorderScenes: () => {},
    seekPreview: () => {},
    importProduct: makeCatalogImporter(() => state.facts),
  });
  const importTool = tools.find((t) => t.name === 'import_product');
  assert.ok(importTool);

  const good = payload(await importTool!.execute({ handle: 'northlight-hoodie' }));
  assert.equal(good.ok, true);
  assert.equal((good.facts as { productName?: string }).productName, 'Northlight Hoodie');

  const bad = payload(await importTool!.execute({ handle: 'nope' }));
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'import-failed');
  assert.match(String(bad.message), /Unknown product handle/);
});
