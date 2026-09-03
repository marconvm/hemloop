import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedCampaign } from '../lib/proofframe/seed';
import { validateCampaign, validateScene, validateText } from '../lib/proofframe/validator';
import { exportComposition } from '../lib/proofframe/exporter';
import {
  buildTools,
  computeCompleteness,
  registerProofFrameTools,
  type ProofFrameCallbacks,
  type ToolContent,
  type WebMcpTool,
} from '../lib/proofframe/webmcp';
import { PLACEMENTS, formatForPlacement, type CampaignState, type Scene, type Violation } from '../lib/proofframe/types';
import {
  demandInsight,
  matchOffer,
  offerIdFor,
  type DemandInsightRequest,
  type PersonalOffer,
} from '../lib/proofframe/offers';

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
    sizesInStock?: string[];
    locked?: boolean;
    completeness?: { locked: number; total: number; missing: string[] };
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
  // The seed ships without sizes in stock on purpose: the studio opens at 8 of 9 so the
  // completeness meter has one "Unlocks" line to show, and the human adds the sizes on camera.
  assert.deepEqual(result.sizesInStock, []);
  assert.equal(result.completeness?.total, 9);
  assert.equal(result.completeness?.locked, 8);
  assert.deepEqual(result.completeness?.missing, ['sizesInStock']);
  assert.ok(JSON.stringify(result).length <= 1500);
});

void test('placement presets map to the right dimensions, and the exporter emits them', () => {
  assert.deepEqual(PLACEMENTS.story, { label: 'Story', ratio: '9:16', width: 1080, height: 1920, fps: 30 });
  assert.deepEqual(PLACEMENTS.feed, { label: 'Feed', ratio: '4:5', width: 1080, height: 1350, fps: 30 });
  assert.deepEqual(PLACEMENTS.display, { label: 'Display', ratio: '16:9', width: 1920, height: 1080, fps: 30 });

  for (const placement of ['story', 'feed', 'display'] as const) {
    const state = seedCampaign();
    state.format = formatForPlacement(placement);
    assert.equal(state.format.placement, placement);
    const html = exportComposition(state);
    const preset = PLACEMENTS[placement];
    assert.match(html, new RegExp(`data-width="${preset.width}" data-height="${preset.height}"`));
    assert.match(
      html,
      new RegExp(`width: ${preset.width}px; height: ${preset.height}px;`),
    );
  }
});

void test('seed campaign defaults to the story placement', () => {
  assert.equal(seedCampaign().format.placement, 'story');
});

void test('get_campaign_state includes placement (nested in format)', async () => {
  const { cb } = makeStore();
  const tools = buildTools(cb);
  const result = (await tool(tools, 'get_campaign_state').execute({})) as unknown as {
    state: CampaignState;
  };
  assert.equal(result.state.format.placement, 'story');
});

void test('completeness counts on the seed and after removing purchaseUrl', () => {
  const seed = seedCampaign();
  const onSeed = computeCompleteness(seed.facts);
  assert.equal(onSeed.total, 9);
  assert.equal(onSeed.locked, 8);
  assert.deepEqual(onSeed.missing, ['sizesInStock']);

  const full = computeCompleteness({ ...seed.facts, sizesInStock: ['XS', 'S', 'M', 'L', 'XL'] });
  assert.equal(full.locked, 9);
  assert.deepEqual(full.missing, []);

  const withoutUrl = { ...seed.facts, purchaseUrl: undefined };
  const partial = computeCompleteness(withoutUrl);
  assert.equal(partial.locked, 7);
  assert.deepEqual(partial.missing.sort(), ['purchaseUrl', 'sizesInStock']);
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

// ---------- offers (wave 3) ----------

const NOW = new Date('2026-09-03T00:00:00.000Z');

function isOffer(result: ReturnType<typeof matchOffer>): result is PersonalOffer {
  return 'offerId' in result;
}

void test('matchOffer: basic hoodie match at 25% with margin ok', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: { signalId: 'sig-0001-aaaa', category: 'hoodie', size: 'M' },
    facts,
    now: NOW,
  });
  assert.ok(isOffer(result), 'expected a proposed offer');
  const offer = result as PersonalOffer;
  assert.equal(offer.discountPercent, 25);
  assert.equal(offer.price, 44.93);
  assert.equal(offer.status, 'proposed');
  assert.equal(offer.requestId, 'sig-0001-aaaa');
  assert.equal(offer.size, 'M');
  assert.equal(offer.validFrom, '2026-09-03');
  assert.equal(offer.validTo, facts.endDate);
  assert.ok(offer.marginCheck.ok, 'margin should be above the floor');
  assert.ok(offer.reasons.length > 0 && offer.reasons.length <= 3);
  assert.ok(offer.reasons.every((r) => r.length <= 120));
});

void test('matchOffer: discountSensitivity "none" caps the discount at 15', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: {
      signalId: 'sig-none-0001',
      category: 'hoodie',
      size: 'M',
      pattern: { discountSensitivity: 'none', spendBand: 'under-50', brandLoyalty: 'loyal' },
    },
    facts,
    now: NOW,
  });
  assert.ok(isOffer(result));
  assert.equal((result as PersonalOffer).discountPercent, 15);
});

void test('matchOffer: a switcher gets up to the locked max discount, never above it', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: {
      signalId: 'sig-switch-01',
      category: 'hoodie',
      size: 'M',
      pattern: { discountSensitivity: 'code', spendBand: '100-plus', brandLoyalty: 'switcher' },
    },
    facts,
    now: NOW,
  });
  assert.ok(isOffer(result));
  assert.equal((result as PersonalOffer).discountPercent, facts.maxDiscountPercent);
});

void test('matchOffer: the margin floor trims the discount, and says so', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: { signalId: 'sig-margin-01', category: 'hoodie', size: 'M' },
    facts: { ...facts, costPrice: 30 }, // higher cost than the seed: 25% off no longer clears the floor
    now: NOW,
  });
  assert.ok(isOffer(result));
  const offer = result as PersonalOffer;
  assert.ok(offer.discountPercent < 25, 'discount must be trimmed below the requested 25%');
  assert.ok(offer.marginCheck.ok, 'trimming should land back above the floor');
  assert.ok(
    offer.reasons.some((r) => r.includes('margin floor')),
    'must explain the trim',
  );
});

void test('matchOffer: a gift or event shortens validTo to one week out', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: { signalId: 'sig-gift-01', category: 'hoodie', size: 'M', occasion: 'gift' },
    facts: { ...facts, endDate: '2026-12-31' },
    now: NOW,
  });
  assert.ok(isOffer(result));
  const offer = result as PersonalOffer;
  assert.equal(offer.validTo, '2026-09-10');
  assert.ok(offer.reasons.some((r) => r.includes('occasion')));
});

void test('matchOffer: refuses when the requested size is not in stock', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: { signalId: 'sig-size-01', category: 'hoodie', size: 'XL' },
    facts: { ...facts, sizesInStock: ['S', 'M'] },
    now: NOW,
  });
  assert.ok(!isOffer(result));
  assert.equal((result as { ok: false; reason: string }).reason, 'size not in stock');
});

void test('matchOffer: refuses when the request category does not match the campaign product', () => {
  const { facts } = seedCampaign();
  const result = matchOffer({
    request: { signalId: 'sig-cat-01', category: 'denim', size: '32' },
    facts,
    now: NOW,
  });
  assert.ok(!isOffer(result));
  assert.equal((result as { ok: false; reason: string }).reason, 'category mismatch');
});

void test('propose_offer stages a matched offer through a fake callback, under budget', async () => {
  const { cb } = makeStore();
  let staged: PersonalOffer | null = null;
  const request = { signalId: 'req-aaaa1111', category: 'hoodie', size: 'M' };
  const fullCb: ProofFrameCallbacks = {
    ...cb,
    getRequests: () => [request],
    stageOffer: (o) => {
      staged = o;
    },
    getCatalogProduct: () => ({
      handle: 'northlight-hoodie',
      title: 'Northlight Hoodie',
      sizesInStock: ['S', 'M', 'L'],
    }),
  };
  const tools = buildTools(fullCb);
  const result = await tool(tools, 'propose_offer').execute({ requestId: 'req-aaaa1111' });
  const p = payload(result) as ToolPayload & { offer?: PersonalOffer };
  assert.equal(p.ok, true);
  assert.ok(staged, 'stageOffer must be called on a match');
  assert.equal((staged as unknown as PersonalOffer).requestId, 'req-aaaa1111');
  assert.equal(p.offer?.requestId, 'req-aaaa1111');
  assert.ok(JSON.stringify(result).length <= 1500);
});

void test('propose_offer reports no-match without staging when nothing fits', async () => {
  const { cb } = makeStore();
  let staged = false;
  const fullCb: ProofFrameCallbacks = {
    ...cb,
    getRequests: () => [{ signalId: 'req-nope-0001', category: 'denim', size: '32' }],
    stageOffer: () => {
      staged = true;
    },
  };
  const result = payload(
    await tool(buildTools(fullCb), 'propose_offer').execute({ requestId: 'req-nope-0001' }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, 'no-match');
  assert.equal(staged, false);
});

void test('get_offer with requestId returns the approved personal offer, or no-approved-offer', async () => {
  const { cb } = makeStore();
  const { facts } = seedCampaign();
  const matched = matchOffer({
    request: { signalId: 'req-approved-01', category: 'hoodie', size: 'M' },
    facts,
    now: NOW,
  });
  assert.ok(isOffer(matched));
  const approvedOffer: PersonalOffer = { ...(matched as PersonalOffer), status: 'approved', approvedAt: NOW.toISOString() };
  const withOffers: ProofFrameCallbacks = { ...cb, getOffers: () => [approvedOffer] };
  const tools = buildTools(withOffers);

  const found = payload(
    await tool(tools, 'get_offer').execute({ requestId: 'req-approved-01' }),
  ) as ToolPayload & { offer?: PersonalOffer };
  assert.equal(found.ok, true);
  assert.equal(found.offer?.requestId, 'req-approved-01');

  const missing = payload(await tool(tools, 'get_offer').execute({ requestId: 'req-unknown' }));
  assert.equal(missing.ok, false);
  assert.equal(missing.error, 'no-approved-offer');
});

void test('get_offer includes offerId built from the locked facts', async () => {
  const { cb } = makeStore();
  const { facts } = seedCampaign();
  const result = payload(await tool(buildTools(cb), 'get_offer').execute({})) as ToolPayload & {
    offerId?: string;
  };
  assert.equal(result.offerId, offerIdFor(facts));
});

void test('buildTools registers 12 tools when every optional callback is present (get_demand and propose_offer are the wave-3/4 pair)', () => {
  const { cb } = makeStore();
  const fullCb: ProofFrameCallbacks = {
    ...cb,
    importProduct: () => seedCampaign().facts,
    getRequests: () => [],
    getOffers: () => [],
    stageOffer: () => {},
    getCatalogProduct: () => undefined,
  };
  const tools = buildTools(fullCb);
  assert.equal(tools.length, 12);
  assert.ok(tools.some((t) => t.name === 'propose_offer'));
  assert.ok(tools.some((t) => t.name === 'get_demand'));
});

void test('get_demand is registered by getRequests alone, so an agent can discover request ids before any offer can be staged', () => {
  const { cb } = makeStore();
  const tools = buildTools({ ...cb, getRequests: () => [] });
  assert.ok(tools.some((t) => t.name === 'get_demand'));
  assert.ok(!tools.some((t) => t.name === 'propose_offer'));
});

void test('get_demand is read-only, drops junk rows, and hands back ids propose_offer accepts', () => {
  const { cb } = makeStore();
  const requests = [
    { signalId: 'r1', category: 'hoodie', size: 'L', at: '2026-09-01T00:00:00.000Z', level: 'need', kind: 'gap' },
    { signalId: 'r2', category: 'hoodie', size: 'L', at: '2026-09-02T00:00:00.000Z', level: 'need', kind: 'replace' },
    { nope: true },
    null,
  ];
  const tools = buildTools({
    ...cb,
    getRequests: () => requests,
    getCatalogProduct: () => ({ handle: 'northlight-hoodie', title: 'Northlight Hoodie', sizesInStock: ['M', 'L'] }),
    getBoughtRequestIds: () => ['r1'],
  });
  const tool = tools.find((t) => t.name === 'get_demand')!;
  assert.equal(tool.annotations?.readOnlyHint, true);
  const before = JSON.stringify(cb.getState());
  const out = tool.execute({}) as {
    ok: boolean;
    requests: number;
    demand: { size: string; total: number; replace: number; bought: number; requestIds: string[]; verdict: string }[];
  };
  assert.equal(out.ok, true);
  assert.equal(out.requests, 2, 'the two malformed rows are dropped, not counted');
  assert.equal(out.demand.length, 1);
  assert.deepEqual(out.demand[0]?.requestIds, ['r1', 'r2']);
  assert.equal(out.demand[0]?.replace, 1);
  assert.equal(out.demand[0]?.bought, 1);
  assert.equal(out.demand[0]?.verdict, 'can-offer');
  assert.equal(JSON.stringify(cb.getState()), before, 'get_demand must not mutate the campaign');
});

// ---------- Wave 4: merchant inventory insight ----------

function req(overrides: Partial<DemandInsightRequest> = {}): DemandInsightRequest {
  return {
    signalId: 's1',
    category: 'hoodie',
    size: 'L',
    at: '2026-09-01T00:00:00.000Z',
    level: 'need',
    kind: 'gap',
    ...overrides,
  };
}

const HOODIE = { handle: 'northlight-hoodie', title: 'Northlight Hoodie', sizesInStock: ['M', 'L'] };

void test('demandInsight groups by category and size and counts needs, wants, replacements and conversions', () => {
  const { facts } = seedCampaign();
  const rows = demandInsight(
    [
      req({ signalId: 'a' }),
      req({ signalId: 'b', level: 'want', kind: 'want', at: '2026-09-03T00:00:00.000Z' }),
      req({ signalId: 'c', kind: 'replace' }),
      req({ signalId: 'd', size: 'XL' }),
    ],
    facts,
    HOODIE,
    ['b'],
  );
  const large = rows.find((r) => r.size === 'L')!;
  assert.equal(large.total, 3);
  assert.equal(large.need, 2);
  assert.equal(large.want, 1);
  assert.equal(large.replace, 1);
  assert.equal(large.bought, 1);
  assert.equal(large.newest, '2026-09-03T00:00:00.000Z');
  assert.deepEqual(large.requestIds, ['a', 'b', 'c']);
});

void test('demandInsight verdicts match what matchOffer would actually do', () => {
  const { facts } = seedCampaign();
  const rows = demandInsight(
    [req({ signalId: 'fits' }), req({ signalId: 'big', size: 'XXL' }), req({ signalId: 'other', category: 'footwear' })],
    facts,
    HOODIE,
  );
  const verdicts = new Map(rows.map((r) => [r.key, r.verdict]));
  assert.equal(verdicts.get('hoodie|L'), 'can-offer');
  assert.equal(verdicts.get('hoodie|XXL'), 'size-not-in-stock');
  assert.equal(verdicts.get('footwear|L'), 'category-mismatch');

  // The panel must never promise what the matcher then refuses.
  for (const row of rows) {
    const request = { signalId: row.requestIds[0]!, category: row.category, size: row.size };
    const matched = 'offerId' in matchOffer({ request, facts, catalogProduct: HOODIE });
    assert.equal(matched, row.verdict === 'can-offer', `${row.key}: verdict and matcher must agree`);
  }
});

void test('demandInsight puts answerable groups first, then needs, then newest', () => {
  const { facts } = seedCampaign();
  const rows = demandInsight(
    [
      req({ signalId: 'stale', at: '2026-01-01T00:00:00.000Z' }),
      req({ signalId: 'nostock', size: 'XXL', at: '2026-09-09T00:00:00.000Z' }),
      req({ signalId: 'fresh', size: 'M', at: '2026-09-08T00:00:00.000Z' }),
    ],
    facts,
    HOODIE,
  );
  assert.deepEqual(rows.map((r) => r.key), ['hoodie|M', 'hoodie|L', 'hoodie|XXL']);
  assert.match(rows[2]!.action, /Restock/);
});

void test('demandInsight treats a sizeless request as any size, and caps the ids it hands back', () => {
  const { facts } = seedCampaign();
  const many = Array.from({ length: 14 }, (_, i) => req({ signalId: `s${i}`, size: null }));
  const rows = demandInsight(many, facts, HOODIE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.size, 'any size');
  assert.equal(rows[0]?.total, 14);
  assert.equal(rows[0]?.requestIds.length, 10, 'ids are capped, the count is not');
  assert.equal(rows[0]?.verdict, 'can-offer', 'no size means nothing to be out of stock for');
});

void test('demandInsight on no requests is an empty list, not a fabricated row', () => {
  assert.deepEqual(demandInsight([], seedCampaign().facts, HOODIE), []);
});

void test("matchOffer checks the stock the offer will claim, not only the facts' own list", () => {
  const { facts } = seedCampaign();
  assert.equal(facts.sizesInStock, undefined, 'the seed locks no sizes of its own');
  // Regression: with sizes coming only from the imported product, a size that
  // product does not carry must be refused, not offered and then contradicted.
  const refused = matchOffer({
    request: { signalId: 'r', category: 'hoodie', size: 'XXL' },
    facts,
    catalogProduct: HOODIE,
  });
  assert.deepEqual(refused, { ok: false, reason: 'size not in stock' });
  const matched = matchOffer({
    request: { signalId: 'r', category: 'hoodie', size: 'L' },
    facts,
    catalogProduct: HOODIE,
  });
  assert.ok('offerId' in matched);
  assert.deepEqual((matched as PersonalOffer).sizesInStock, HOODIE.sizesInStock);
});
