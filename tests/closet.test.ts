import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFit,
  findGaps,
  fnv1a,
  makeSignal,
  seedWardrobe,
  sizesOwned,
} from '../lib/proofframe/closet';
import { buildClosetTools, type ClosetCallbacks } from '../lib/proofframe/webmcp-closet';
import type { ToolContent } from '../lib/proofframe/webmcp';
import type { DemandSignal, Garment } from '../lib/proofframe/closet';

function payload(result: ToolContent): Record<string, unknown> {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

function makeStore() {
  const wardrobe = seedWardrobe();
  const emitted: DemandSignal[] = [];
  const cb: ClosetCallbacks = {
    getWardrobe: () => wardrobe,
    addGarment: (input) => {
      const garment: Garment = { id: `g${wardrobe.garments.length + 1}`, ...input };
      wardrobe.garments.push(garment);
      return garment;
    },
    emitSignal: (s) => emitted.push(s),
  };
  return { wardrobe, cb, emitted };
}

void test('seed wardrobe has a hoodie gap (the demo arc)', () => {
  const gaps = findGaps(seedWardrobe());
  assert.ok(gaps.some((g) => g.category === 'hoodie'), 'hoodie must be a gap');
});

void test('sizesOwned dedupes and filters by brand case-insensitively', () => {
  const all = sizesOwned(seedWardrobe());
  const aurora = sizesOwned(seedWardrobe(), 'aurora threads');
  assert.ok(all.length > aurora.length);
  assert.ok(aurora.every((r) => r.brand === 'Aurora Threads'));
});

void test('checkFit maps the northlight hoodie and recommends from owned sizes', () => {
  const fit = checkFit(seedWardrobe(), 'northlight-hoodie');
  assert.equal(fit.category, 'hoodie');
  // seed owns no hoodie, so no size history
  assert.equal(fit.ownedSize, null);
  const card = checkFit(seedWardrobe(), 'gift-card');
  assert.equal(card.category, 'accessory');
  assert.equal(card.ownedSize, 'OS');
  const unknown = checkFit(seedWardrobe(), 'nope');
  assert.match(unknown.note, /Unknown product/);
});

void test('signals are hashed: no raw shopper id, deterministic hash', () => {
  const wardrobe = seedWardrobe();
  const signal = makeSignal(
    wardrobe,
    { kind: 'gap', category: 'hoodie', size: 'M', handle: 'northlight-hoodie' },
    () => '2026-08-30T12:00:00.000Z',
  );
  const json = JSON.stringify(signal);
  assert.ok(!json.includes(wardrobe.shopperId), 'raw shopper id must never appear');
  assert.equal(signal.shopperHash, fnv1a(wardrobe.shopperId));
  assert.equal(signal.category, 'hoodie');
  // same inputs, same id (deterministic)
  const again = makeSignal(
    wardrobe,
    { kind: 'gap', category: 'hoodie', size: 'M', handle: 'northlight-hoodie' },
    () => '2026-08-30T12:00:00.000Z',
  );
  assert.equal(signal.signalId, again.signalId);
});

void test('closet tool surface: 6 tools, reads flagged readOnly', () => {
  const { cb } = makeStore();
  const tools = buildClosetTools(cb);
  assert.deepEqual(
    tools.map((t) => t.name),
    ['get_wardrobe', 'get_my_sizes', 'find_gaps', 'check_fit', 'add_garment', 'report_demand_gap'],
  );
  for (const name of ['get_wardrobe', 'get_my_sizes', 'find_gaps', 'check_fit']) {
    assert.equal(tools.find((t) => t.name === name)?.annotations?.readOnlyHint, true, name);
  }
});

void test('get_wardrobe never exposes the raw shopper id', async () => {
  const { cb, wardrobe } = makeStore();
  const tool = buildClosetTools(cb).find((t) => t.name === 'get_wardrobe')!;
  const text = (await tool.execute({})).content[0].text;
  assert.ok(!text.includes(wardrobe.shopperId));
});

void test('add_garment validates category and strings', async () => {
  const { cb, wardrobe } = makeStore();
  const tool = buildClosetTools(cb).find((t) => t.name === 'add_garment')!;
  const bad = payload(await tool.execute({ category: 'car', brand: 'x', size: 'M', colour: 'red' }));
  assert.equal(bad.ok, false);
  const before = wardrobe.garments.length;
  const good = payload(
    await tool.execute({ category: 'hoodie', brand: 'Aurora Threads', size: 'M', colour: 'rust' }),
  );
  assert.equal(good.ok, true);
  assert.equal(wardrobe.garments.length, before + 1);
});

void test('report_demand_gap emits exactly the hashed payload it returns', async () => {
  const { cb, emitted, wardrobe } = makeStore();
  const tool = buildClosetTools(cb).find((t) => t.name === 'report_demand_gap')!;
  const result = payload(
    await tool.execute({ kind: 'gap', category: 'hoodie', size: 'M', handle: 'northlight-hoodie' }),
  );
  assert.equal(result.ok, true);
  assert.equal(emitted.length, 1);
  assert.deepEqual(result.sent, emitted[0]);
  assert.ok(!JSON.stringify(emitted[0]).includes(wardrobe.shopperId));
});
