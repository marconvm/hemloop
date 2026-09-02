import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedCampaign } from '../lib/proofframe/seed';
import { validateCampaign, validateScene, validateText } from '../lib/proofframe/validator';
import { exportComposition } from '../lib/proofframe/exporter';
import {
  buildTools,
  registerProofFrameTools,
  type ProofFrameCallbacks,
  type ToolContent,
  type WebMcpTool,
} from '../lib/proofframe/webmcp';
import type { CampaignState, Scene, Violation } from '../lib/proofframe/types';

function makeStore(state: CampaignState = seedCampaign()) {
  let seekedTo: number | null = null;
  const cb: ProofFrameCallbacks = {
    getState: () => state,
    setBrief: (brief) => {
      state.brief = brief;
    },
    addScene: (input) => {
      const scene: Scene = { id: `scene-${state.scenes.length + 1}`, ...input };
      state.scenes.push(scene);
      return scene;
    },
    updateScene: (id, patch) => {
      const s = state.scenes.find((x) => x.id === id);
      if (s) Object.assign(s, patch);
    },
    reorderScenes: (ids) => {
      state.scenes = ids.map((id) => state.scenes.find((s) => s.id === id)!);
    },
    seekPreview: (t) => {
      seekedTo = t;
    },
  };
  return { state, cb, lastSeek: () => seekedTo };
}

interface ToolPayload {
  ok: boolean;
  error?: string;
  violations?: Violation[];
  html?: string;
  chars?: number;
  delivered?: boolean;
}

function payload(result: ToolContent): ToolPayload {
  return result as unknown as ToolPayload;
}

function tool(tools: WebMcpTool[], name: string): WebMcpTool {
  const t = tools.find((x) => x.name === name);
  assert.ok(t, `tool ${name} exists`);
  return t!;
}

// ---------- validator ----------

void test('seed campaign is claim-clean', () => {
  assert.deepEqual(validateCampaign(seedCampaign()), []);
});

void test('validator catches wrong discount, price, code, banned phrase', () => {
  const { facts } = seedCampaign();
  assert.equal(
    validateText('Now 50% off everything', facts)[0]?.rule,
    'discount-mismatch',
  );
  assert.equal(
    validateText('Only $19.99 today', facts)[0]?.rule,
    'price-mismatch',
  );
  assert.equal(
    validateText('Use code SAVEBIG', facts)[0]?.rule,
    'code-mismatch',
  );
  assert.equal(
    validateText('Ships free, guaranteed', facts)[0]?.rule,
    'banned-phrase',
  );
});

void test('validator accepts copy matching locked facts', () => {
  const { facts } = seedCampaign();
  const copy = `${facts.discountPercent}% off, $${facts.regularPrice.toFixed(2)} now $${facts.salePrice!.toFixed(2)} with code ${facts.promoCode}`;
  assert.deepEqual(validateText(copy, facts), []);
});

void test('validator catches evasion: no-$ price, codeless code, unicode digits', () => {
  const { facts } = seedCampaign();
  assert.equal(validateText('Just 19.99 today only', facts)[0]?.rule, 'price-mismatch');
  assert.equal(validateText('Use SAVE90 at checkout', facts)[0]?.rule, 'code-mismatch');
  assert.equal(validateText('Now ５０％ off', facts)[0]?.rule, 'discount-mismatch');
});

void test('validator rejects an invalid scene kind (XSS vector)', () => {
  const { facts } = seedCampaign();
  const bad = validateScene(
    { id: 'x', kind: 'a"><script>' as never, heading: 'Layer up', body: 'ok', durationSec: 3 },
    facts,
  );
  assert.ok(bad.some((v) => v.rule === 'scene-kind'));
});

// PF2-3 exact replay cases from the second security pass.
void test('validator handles Arabic-Indic / Persian digits and format controls', () => {
  const { facts } = seedCampaign();
  assert.equal(validateText('Now ٥٠٪ off', facts)[0]?.rule, 'discount-mismatch'); // Arabic-Indic 50%
  assert.equal(validateText('Now ۵۰% off', facts)[0]?.rule, 'discount-mismatch'); // Persian 50
  assert.ok(validateText('lowest⁠ price', facts).some((v) => v.rule === 'banned-phrase')); // word-joiner
  const nulled = { ...facts, promoCode: null };
  assert.equal(validateText('Use SAVE90 at checkout', nulled)[0]?.rule, 'code-mismatch'); // codeless, no locked code
  assert.deepEqual(validateText('Rated 4.90 stars', facts), []); // bare decimal, no money context → not a price
});

// PF2-1: an unadvertised `style` property must never reach the export.
void test('add_scene drops extra properties; export has no style breakout', async () => {
  const { state, cb } = makeStore();
  const tools = buildTools(cb);
  const res = payload(
    await tool(tools, 'add_scene').execute({
      kind: 'product',
      heading: 'Built for cold',
      body: 'Six colours.',
      durationSec: 3,
      style: { background: '</style><script>alert(1)</script>' },
    } as Record<string, unknown>),
  );
  assert.equal(res.ok, true);
  const added = state.scenes.at(-1) as Scene & { style?: unknown };
  assert.equal(added.style, undefined, 'style must not survive the parser');
  const html = exportComposition(state);
  assert.ok(!html.includes('<script>alert(1)'), 'no injected script in export');
  assert.ok(!html.includes('</style><script>'), 'no style breakout in export');
});

// PF2-2: malformed field types are rejected as invalid-input, not stored.
void test('add_scene rejects malformed field types', async () => {
  const { state, cb } = makeStore();
  const before = state.scenes.length;
  const res = payload(
    await tool(buildTools(cb), 'add_scene').execute({
      kind: 'product',
      heading: { evil: true },
      body: null,
      durationSec: '3',
    } as unknown as Record<string, unknown>),
  );
  assert.equal(res.ok, false);
  assert.equal(res.error, 'invalid-input');
  assert.equal(state.scenes.length, before, 'nothing stored');
});

// PF2-1 defence in depth: exporter allowlists CSS colours even if a style
// is injected directly onto a scene (bypassing the tools).
void test('exporter neutralizes a malicious scene style colour', () => {
  const state = seedCampaign();
  (state.scenes[0] as Scene).style = { background: 'red;}</style><script>x</script>' };
  const html = exportComposition(state);
  assert.ok(!html.includes('</style><script>'), 'malicious colour must not break out');
  assert.ok(!html.includes('<script>x</script>'));
});

// ---------- exporter ----------

void test('exporter emits a valid standalone HyperFrames composition', () => {
  const state = seedCampaign();
  const html = exportComposition(state);
  const total = state.scenes.reduce((s, x) => s + x.durationSec, 0);

  assert.match(html, /data-composition-id="proofframe"/);
  assert.match(html, new RegExp(`data-duration="${total}"`));
  assert.match(html, /window\.__timelines\["proofframe"\]/);
  assert.match(html, /gsap\.timeline\(\{ paused: true \}\)/);
  assert.equal(html.match(/class="clip/g)?.length, state.scenes.length);
  // disclaimer footer is always rendered and is not a clip
  assert.match(html, /id="proofframe-disclaimer"/);
  assert.ok(!/id="proofframe-disclaimer"[^>]*class="clip/.test(html));
});

void test('exporter escapes HTML in copy', () => {
  const state = seedCampaign();
  state.scenes[0].heading = 'Layer up <script>alert("x")</script>';
  const html = exportComposition(state);
  assert.ok(!html.includes('<script>alert("x")</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

void test('exporter refuses a campaign with claim violations', () => {
  const state = seedCampaign();
  state.scenes[2].heading = '70% off right now';
  assert.throws(() => exportComposition(state), /claim violation/);
});

// ---------- webmcp adapter ----------

void test('adapter registers the agreed tool surface (no lock tool)', () => {
  const { cb } = makeStore();
  const names = buildTools(cb).map((t) => t.name);
  assert.deepEqual(names, [
    'get_campaign_state',
    'set_brief',
    'add_scene',
    'update_scene',
    'reorder_scenes',
    'seek_preview',
    'validate_claims',
    'export_composition',
    'get_offer',
  ]);
  assert.ok(
    !names.some((n) => /lock/.test(n)),
    'locking facts must stay human-only',
  );
});

void test('import_product tool appears only when a callback is provided', () => {
  const { cb } = makeStore();
  const withImport = buildTools({
    ...cb,
    importProduct: () => seedCampaign().facts,
  });
  assert.ok(withImport.some((t) => t.name === 'import_product'));
});

void test('read tools carry readOnlyHint', () => {
  const { cb } = makeStore();
  const tools = buildTools(cb);
  for (const name of [
    'get_campaign_state',
    'validate_claims',
    'export_composition',
    'get_offer',
  ]) {
    assert.equal(tool(tools, name).annotations?.readOnlyHint, true, name);
  }
});

void test('get_offer reads the current locked facts as agent-actionable offer data, under budget', async () => {
  const { cb } = makeStore();
  const { facts } = seedCampaign();
  const tools = buildTools(cb);
  const result = payload(await tool(tools, 'get_offer').execute({})) as ToolPayload & {
    product?: string;
    currency?: string;
    regularPrice?: number;
    salePrice?: number | null;
    discountPercent?: number | null;
    promoCode?: string | null;
    validFrom?: string;
    validTo?: string;
    disclaimer?: string;
    purchaseUrl?: string | null;
    locked?: boolean;
  };
  assert.equal(result.ok, true);
  assert.equal(result.product, facts.productName);
  assert.equal(result.currency, facts.currency);
  assert.equal(result.regularPrice, facts.regularPrice);
  assert.equal(result.salePrice, facts.salePrice);
  assert.equal(result.discountPercent, facts.discountPercent);
  assert.equal(result.promoCode, facts.promoCode);
  assert.equal(result.validFrom, facts.startDate);
  assert.equal(result.validTo, facts.endDate);
  assert.equal(result.disclaimer, facts.disclaimer);
  assert.equal(result.locked, true);
  assert.ok(JSON.stringify(result).length <= 1500);
});

void test('add_scene with violating copy is rejected and applies nothing', async () => {
  const { state, cb } = makeStore();
  const before = state.scenes.length;
  const result = payload(
    await tool(buildTools(cb), 'add_scene').execute({
      kind: 'offer',
      heading: 'Everything 90% off',
      body: '',
      durationSec: 3,
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, 'locked-fact-violation');
  assert.equal(result.violations?.[0]?.rule, 'discount-mismatch');
  assert.equal(state.scenes.length, before, 'state unchanged');
  const next = (result as unknown as { next?: string }).next;
  assert.equal(typeof next, 'string');
  assert.ok(next && next.length > 0, 'a locked-fact-violation rejection must say what to do next');
});

void test('clean add_scene and update_scene apply', async () => {
  const { state, cb } = makeStore();
  const tools = buildTools(cb);
  const added = payload(
    await tool(tools, 'add_scene').execute({
      kind: 'product',
      heading: 'Built for cold mornings',
      body: 'Same $44.90 in every colour.',
      durationSec: 3,
    }),
  );
  assert.equal(added.ok, true);
  assert.equal(state.scenes.at(-1)?.heading, 'Built for cold mornings');

  const updated = payload(
    await tool(tools, 'update_scene').execute({
      id: 'hero',
      heading: 'Layer up, Aurora',
    }),
  );
  assert.equal(updated.ok, true);
  assert.equal(state.scenes[0].heading, 'Layer up, Aurora');
});

void test('update_scene rejects a patch that breaks a locked fact', async () => {
  const { state, cb } = makeStore();
  const originalBody = state.scenes[2].body;
  const result = payload(
    await tool(buildTools(cb), 'update_scene').execute({
      id: 'offer',
      body: 'Use code WRONG99',
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(state.scenes[2].body, originalBody);
});

void test('reorder_scenes requires a permutation', async () => {
  const { state, cb } = makeStore();
  const tools = buildTools(cb);
  const bad = payload(
    await tool(tools, 'reorder_scenes').execute({ orderedIds: ['hero'] }),
  );
  assert.equal(bad.ok, false);
  const good = payload(
    await tool(tools, 'reorder_scenes').execute({
      orderedIds: ['cta', 'offer', 'product', 'hero'],
    }),
  );
  assert.equal(good.ok, true);
  assert.equal(state.scenes[0].id, 'cta');
});

void test('seek_preview clamps into the composition; export_composition delivers HTML to the page and returns a summary under the 1.5K output budget', async () => {
  const { cb, lastSeek } = makeStore();
  let delivered = '';
  cb.deliverExport = (html) => {
    delivered = html;
  };
  const tools = buildTools(cb);
  await tool(tools, 'seek_preview').execute({ tSec: 9999 });
  assert.equal(lastSeek(), 15);
  const result = await tool(tools, 'export_composition').execute({});
  const exported = payload(result);
  assert.equal(exported.ok, true);
  assert.match(delivered, /data-composition-id="proofframe"/);
  assert.equal(exported.chars, delivered.length);
  assert.equal(exported.delivered, true);
  assert.ok(!('html' in exported), 'HTML goes to the page, not into the tool result');
  assert.ok(JSON.stringify(result).length <= 1500);
});

void test('every tool closes its input schema and stays inside Chrome\'s character budgets', () => {
  const { cb } = makeStore();
  for (const t of buildTools(cb)) {
    assert.equal(t.inputSchema.additionalProperties, false, t.name);
    assert.ok(t.name.length <= 30, t.name);
    assert.ok(t.description.length <= 500, t.name);
  }
});

void test('registerProofFrameTools awaits every registration and reports rejections', async () => {
  const { cb } = makeStore();
  const seen: string[] = [];
  const { registered, rejected } = await registerProofFrameTools(cb, {
    registerTool: (t) => {
      seen.push(t.name);
      return Promise.resolve();
    },
  });
  assert.equal(registered.length, 9);
  assert.deepEqual(seen, registered);
  assert.deepEqual(rejected, []);

  // Spec: a second registration of the same name rejects with InvalidStateError.
  const names = new Set<string>();
  const dup = await registerProofFrameTools(cb, {
    registerTool: (t) =>
      names.has(t.name)
        ? Promise.reject(new Error('InvalidStateError'))
        : (names.add(t.name), Promise.resolve()),
  });
  assert.equal(dup.registered.length, 9);
  const again = await registerProofFrameTools(cb, {
    registerTool: (t) =>
      names.has(t.name) ? Promise.reject(new Error('InvalidStateError')) : Promise.resolve(),
  });
  assert.equal(again.registered.length, 0);
  assert.equal(again.rejected.length, 9);
  assert.match(again.rejected[0].reason, /InvalidStateError/);
});

// ---------- Security pass 4 (PF4-1..PF4-4) ----------

void test('PF4-1: malicious BASE style cannot break out of the export', () => {
  const state = seedCampaign();
  state.style = { background: 'red;}</style><script>x</script>', ink: 'url(x)', accent: '#fff' };
  const html = exportComposition(state);
  assert.ok(!html.includes('</style><script>'));
  assert.ok(!html.includes('<script>x'));
  assert.ok(!html.includes('url(x)'));
});

void test('PF4-2: reorder_scenes rejects a non-array with a length property', async () => {
  const { state, cb } = makeStore();
  const before = state.scenes.map((s) => s.id);
  const res = payload(
    await tool(buildTools(cb), 'reorder_scenes').execute({ orderedIds: { length: 1 } } as never),
  );
  assert.equal(res.ok, false);
  assert.equal(res.error, 'invalid-input');
  assert.deepEqual(state.scenes.map((s) => s.id), before);
});

void test('PF4-3: add_scene caps scene count and total duration', async () => {
  const { state, cb } = makeStore();
  const add = tool(buildTools(cb), 'add_scene');
  const clean = { kind: 'product', heading: 'Cold ready', body: 'Six colours.', durationSec: 1 };
  // seed = 4 scenes / 15s; cap is 12 scenes — 8 more should pass, the 9th must not
  for (let i = 0; i < 8; i++) assert.equal(payload(await add.execute(clean)).ok, true, `add ${i}`);
  const capped = payload(await add.execute(clean));
  assert.equal(capped.ok, false);
  assert.equal(capped.error, 'invalid-input');
  assert.equal(state.scenes.length, 12);
  // total-duration guard: fresh store, 15s + 30s ok, next 30s would be 75s > 60
  const fresh = makeStore();
  const add2 = tool(buildTools(fresh.cb), 'add_scene');
  assert.equal(payload(await add2.execute({ ...clean, durationSec: 30 })).ok, true);
  const over = payload(await add2.execute({ ...clean, durationSec: 30 }));
  assert.equal(over.ok, false);
  assert.equal(over.violations?.[0]?.rule, 'total-duration');
});

void test('PF4-4: currency-aware prices, letter-led codes, no false flags', () => {
  const { facts } = seedCampaign();
  assert.equal(validateText('Now CAD 19.99', facts)[0]?.rule, 'price-mismatch');
  assert.equal(validateText('Use Save90 at checkout', facts)[0]?.rule, 'code-mismatch');
  assert.deepEqual(validateText('Coffee rating 4.90', facts), []); // "off" inside Coffee must not count
  assert.deepEqual(validateText('Watch it in 1080P', facts), []); // digit-led token is not a code
});

// PF4-4 (agreed design): context-window + narrow fallback; product tokens stay clean.
void test('PF4-4b: product/model tokens are not promo codes; Save90 still is', () => {
  const { facts } = seedCampaign();
  for (const clean of ['Try the X100 today', 'UV400 lenses included', 'Contains H2O2', 'Watch in 1080P']) {
    assert.deepEqual(validateText(clean, facts), [], clean);
  }
  assert.equal(validateText('Use Save90 at checkout', facts)[0]?.rule, 'code-mismatch');
  assert.equal(validateText('Apply XR7 now', facts)[0]?.rule, undefined); // too short for either track
  assert.equal(validateText('Redeem AB12CD today', facts)[0]?.rule, 'code-mismatch'); // context window catches non-fallback shapes
});

// PF5-1: update_scene must honour the projected campaign total cap.
void test('PF5-1: update_scene rejects a duration that pushes the total over 60s', async () => {
  const { state, cb } = makeStore(); // seed = 15s
  const upd = tool(buildTools(cb), 'update_scene');
  assert.equal(payload(await upd.execute({ id: 'hero', durationSec: 30 })).ok, true); // 41s
  const over = payload(await upd.execute({ id: 'product', durationSec: 30 })); // would be 67s
  assert.equal(over.ok, false);
  assert.equal(over.violations?.[0]?.rule, 'total-duration');
  assert.equal(state.scenes.find((s) => s.id === 'product')?.durationSec, 4, 'unchanged');
  assert.equal(state.scenes.reduce((s, x) => s + x.durationSec, 0), 41);
});
