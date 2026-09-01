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
}

function payload(result: ToolContent): ToolPayload {
  return JSON.parse(result.content[0].text) as ToolPayload;
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
  assert.deepEqual(
    validateText('25% off — $59.90 now $44.90 with code AURORA25', facts),
    [],
  );
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
  ]) {
    assert.equal(tool(tools, name).annotations?.readOnlyHint, true, name);
  }
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
  const result = payload(
    await tool(buildTools(cb), 'update_scene').execute({
      id: 'offer',
      body: 'Use code WRONG99',
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(state.scenes[2].body, '$59.90 → $44.90 with code AURORA25');
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

void test('seek_preview clamps into the composition and export_composition returns HTML', async () => {
  const { cb, lastSeek } = makeStore();
  const tools = buildTools(cb);
  await tool(tools, 'seek_preview').execute({ tSec: 9999 });
  assert.equal(lastSeek(), 15);
  const exported = payload(await tool(tools, 'export_composition').execute({}));
  assert.equal(exported.ok, true);
  assert.match(String(exported.html), /data-composition-id="proofframe"/);
});

void test('registerProofFrameTools registers on a provided model context', () => {
  const { cb } = makeStore();
  const seen: string[] = [];
  const { registered } = registerProofFrameTools(cb, {
    registerTool: (t) => seen.push(t.name),
  });
  assert.equal(registered.length, 8);
  assert.deepEqual(seen, registered);
});
