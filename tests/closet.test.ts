import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFit,
  findGaps,
  makeSignal,
  seedWardrobe,
  sizesOwned,
} from '../lib/proofframe/closet';
import {
  buildClosetTools,
  type ClosetCallbacks,
} from '../lib/proofframe/webmcp-closet';
import type { ToolContent } from '../lib/proofframe/webmcp';
import type { DemandSignal, Garment } from '../lib/proofframe/closet';

function payload(result: ToolContent): Record<string, unknown> {
  return result as Record<string, unknown>;
}

function makeStore() {
  const wardrobe = seedWardrobe();
  const emitted: DemandSignal[] = [];
  let shareApproved = false;
  const cb: ClosetCallbacks = {
    getWardrobe: () => wardrobe,
    addGarment: (input) => {
      const garment: Garment = {
        id: `g${wardrobe.garments.length + 1}`,
        ...input,
      };
      wardrobe.garments.push(garment);
      return garment;
    },
    consumeShareApproval: () => {
      if (!shareApproved) return false;
      shareApproved = false;
      return true;
    },
    emitSignal: (s) => {
      emitted.push(s);
      return true;
    },
  };
  return {
    wardrobe,
    cb,
    emitted,
    approve: () => {
      shareApproved = true;
    },
  };
}

void test('seed wardrobe has a hoodie gap (the demo arc)', () => {
  const gaps = findGaps(seedWardrobe());
  assert.ok(
    gaps.some((g) => g.category === 'hoodie'),
    'hoodie must be a gap',
  );
});

void test('sizesOwned dedupes and filters by brand case-insensitively', () => {
  const wardrobe = seedWardrobe();
  const targetBrand = wardrobe.garments[0].brand;
  const all = sizesOwned(wardrobe);
  const filtered = sizesOwned(wardrobe, targetBrand.toLowerCase());
  assert.ok(all.length > filtered.length);
  assert.ok(filtered.every((r) => r.brand === targetBrand));
});

void test('checkFit maps the northlight hoodie and recommends from owned sizes', () => {
  const fit = checkFit(seedWardrobe(), 'northlight-hoodie');
  assert.equal(fit.category, 'hoodie');
  // seed owns no hoodie, so no size history
  assert.equal(fit.ownedSize, null);
  const cap = checkFit(seedWardrobe(), 'fieldhouse-cap');
  assert.equal(cap.category, 'accessory');
  assert.equal(cap.ownedSize, 'OS');
  const unknown = checkFit(seedWardrobe(), 'nope');
  assert.match(unknown.note, /Unknown product/);
});

void test('signals are zero-ID and use an event-scoped random id', () => {
  const signal = makeSignal(
    { kind: 'gap', category: 'hoodie', size: 'M', handle: 'northlight-hoodie' },
    () => '2026-08-30T12:00:00.000Z',
    () => 'event-001',
  );
  const json = JSON.stringify(signal);
  assert.equal(signal.signalId, 'event-001');
  assert.equal(signal.category, 'hoodie');
  assert.ok(!json.includes('shopper'));
  assert.deepEqual(Object.keys(signal).sort(), [
    'at',
    'category',
    'handle',
    'kind',
    'signalId',
    'size',
  ]);
});

void test('closet tool surface: 6 tools, reads flagged readOnly', () => {
  const { cb } = makeStore();
  const tools = buildClosetTools(cb);
  assert.deepEqual(
    tools.map((t) => t.name),
    [
      'get_wardrobe',
      'get_my_sizes',
      'find_gaps',
      'check_fit',
      'add_garment',
      'report_demand_gap',
    ],
  );
  for (const name of [
    'get_wardrobe',
    'get_my_sizes',
    'find_gaps',
    'check_fit',
  ]) {
    assert.equal(
      tools.find((t) => t.name === name)?.annotations?.readOnlyHint,
      true,
      name,
    );
  }
});

void test('get_wardrobe fences brand/colour as untrusted content and carries no identity field', async () => {
  const { cb, wardrobe } = makeStore();
  const tool = buildClosetTools(cb).find((t) => t.name === 'get_wardrobe')!;
  const result = payload(await tool.execute({})) as {
    garments: (Garment & { brand: string; colour: string })[];
    note: string;
  };
  assert.equal(result.garments.length, wardrobe.garments.length);
  result.garments.forEach((g, i) => {
    assert.equal(g.id, wardrobe.garments[i].id);
    assert.equal(g.category, wardrobe.garments[i].category);
    assert.equal(g.size, wardrobe.garments[i].size);
    assert.ok(g.brand.startsWith('<<<untrusted-content>>>'), 'brand is fenced');
    assert.ok(g.brand.includes(wardrobe.garments[i].brand));
    assert.ok(g.colour.startsWith('<<<untrusted-content>>>'), 'colour is fenced');
    assert.ok(g.colour.includes(wardrobe.garments[i].colour));
  });
  assert.equal('shopperId' in result, false);
  assert.match(result.note, /untrusted-content/);
});

void test('add_garment validates category and strings', async () => {
  const { cb, wardrobe } = makeStore();
  const tool = buildClosetTools(cb).find((t) => t.name === 'add_garment')!;
  const bad = payload(
    await tool.execute({
      category: 'car',
      brand: 'x',
      size: 'M',
      colour: 'red',
    }),
  );
  assert.equal(bad.ok, false);
  const before = wardrobe.garments.length;
  const good = payload(
    await tool.execute({
      category: 'hoodie',
      brand: 'Northlight Apparel',
      size: 'M',
      colour: 'rust',
    }),
  );
  assert.equal(good.ok, true);
  assert.equal(wardrobe.garments.length, before + 1);
});

void test('report_demand_gap requires human approval, consumes it, and returns exactly what it sends', async () => {
  const { cb, emitted, approve } = makeStore();
  const tool = buildClosetTools(cb).find(
    (t) => t.name === 'report_demand_gap',
  )!;
  const rejected = payload(
    await tool.execute({
      kind: 'gap',
      category: 'hoodie',
      size: 'M',
      handle: 'northlight-hoodie',
    }),
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, 'human-approval-required');
  assert.equal(emitted.length, 0);
  assert.equal(typeof rejected.next, 'string');
  assert.ok(
    typeof rejected.next === 'string' && rejected.next.length > 0,
    'a human-approval-required rejection must say what to do next',
  );

  approve();
  const result = payload(
    await tool.execute({
      kind: 'gap',
      category: 'hoodie',
      size: 'M',
      handle: 'northlight-hoodie',
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(emitted.length, 1);
  assert.deepEqual(result.sent, emitted[0]);

  const second = payload(
    await tool.execute({
      kind: 'gap',
      category: 'hoodie',
      size: 'M',
      handle: 'northlight-hoodie',
    }),
  );
  assert.equal(second.error, 'human-approval-required');
  assert.equal(emitted.length, 1);
});

// ---------- Security pass 4 (PF4-6) ----------

void test('PF4-6a: an invalid kind is rejected BEFORE the approval is consumed', async () => {
  let approved = true;
  const emitted: DemandSignal[] = [];
  const cb: ClosetCallbacks = {
    getWardrobe: () => seedWardrobe(),
    addGarment: (input) => ({ id: 'g-x', ...input }),
    consumeShareApproval: () => {
      if (!approved) return false;
      approved = false;
      return true;
    },
    emitSignal: (s) => {
      emitted.push(s);
      return true;
    },
  };
  const report = buildClosetTools(cb).find((t) => t.name === 'report_demand_gap')!;
  const bad = payload(await report.execute({ kind: 'bogus', category: 'hoodie' }));
  assert.equal(bad.ok, false);
  assert.equal(approved, true, 'approval must survive a malformed call');
  assert.equal(emitted.length, 0);
  const good = payload(await report.execute({ kind: 'gap', category: 'hoodie' }));
  assert.equal(good.ok, true);
  assert.equal(approved, false);
});

void test('PF4-6b: readSignals rebuilds exact-key signals and drops junk', async () => {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  const { readSignals } = await import('../lib/proofframe/signal-bridge');
  store.set(
    'proofframe-demand-signals',
    JSON.stringify([
      { signalId: 'a', kind: 'gap', category: 'hoodie', size: 'M', handle: null, at: '2026-09-01T00:00:00Z', shopperId: 'LEAK' },
      { signalId: 'b', kind: 'bogus', category: 'hoodie', at: '2026-09-01T00:00:00Z' },
      { signalId: 'c', kind: 'gap', category: 'spaceship', at: '2026-09-01T00:00:00Z' },
      { signalId: 'd', kind: 'gap', category: 'hoodie', at: 'not-a-date' },
      'garbage',
    ]),
  );
  const out = readSignals();
  assert.equal(out.length, 1);
  assert.deepEqual(Object.keys(out[0]).sort(), ['at', 'category', 'handle', 'kind', 'signalId', 'size']);
  assert.ok(!('shopperId' in out[0]));
  delete (globalThis as { window?: unknown }).window;
});
