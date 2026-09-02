// WebMCP registration adapter. Pure glue: it owns no state — the page hands
// in callbacks. Every mutating tool call is claim-validated BEFORE the
// callback runs; a violation returns a structured rejection and applies
// nothing. Note there is deliberately NO lock/unlock tool: locking facts is
// human-only, via the UI.
import type {
  CampaignFacts,
  CampaignState,
  Scene,
  SceneKind,
  Violation,
} from './types';
import { MAX_TOTAL_SECONDS, validateCampaign, validateScene, validateText } from './validator';
import { exportComposition } from './exporter';

// A tool result is a plain JSON object. The browser serialises whatever
// `execute` returns (spec: executeTool resolves to the JSON string of the
// value), so wrapping it in MCP content blocks only double-encoded the text.
export type ToolContent = Record<string, unknown>;

export interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(
    args: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<ToolContent> | ToolContent;
}

export interface ModelContextLike {
  /** Spec: returns a Promise; rejects on duplicate name or disabled permission. */
  registerTool(tool: WebMcpTool): unknown;
}

/** Every schema closes over its declared properties (ChatGPT's own sample does this even for `{}`). */
export function closeSchemas(tools: WebMcpTool[]): WebMcpTool[] {
  return tools.map((t) => ({
    ...t,
    inputSchema: { ...t.inputSchema, additionalProperties: false },
  }));
}

export interface RegisterResult {
  registered: string[];
  rejected: { name: string; reason: string }[];
}

/** Register every tool, awaiting each promise so a rejection is seen, not swallowed. */
export async function registerAll(
  mc: ModelContextLike | null,
  tools: WebMcpTool[],
): Promise<RegisterResult> {
  if (!mc) return { registered: [], rejected: [] };
  const settled = await Promise.allSettled(
    tools.map((t) => Promise.resolve().then(() => mc.registerTool(t))),
  );
  const result: RegisterResult = { registered: [], rejected: [] };
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') result.registered.push(tools[i].name);
    else result.rejected.push({ name: tools[i].name, reason: String(s.reason) });
  });
  return result;
}

/** Probe both namespaces — the spec moved between navigator and document. */
export function getModelContext(): ModelContextLike | null {
  const g = globalThis as {
    navigator?: { modelContext?: ModelContextLike };
    document?: { modelContext?: ModelContextLike };
  };
  return g.navigator?.modelContext ?? g.document?.modelContext ?? null;
}

export interface SceneInput {
  kind: SceneKind;
  heading: string;
  body: string;
  durationSec: number;
}

export interface ProofFrameCallbacks {
  getState(): CampaignState;
  setBrief(brief: string): void;
  addScene(input: SceneInput): Scene;
  updateScene(id: string, patch: Partial<SceneInput>): void;
  reorderScenes(orderedIds: string[]): void;
  seekPreview(tSec: number): void;
  /** Optional: fetch real product facts (e.g. Shopify Storefront API). */
  importProduct?(handle: string): Promise<CampaignFacts> | CampaignFacts;
  /** Optional: hand the exported HTML to the page (e.g. trigger the download the human would). */
  deliverExport?(html: string): void;
}

function ok(data: object = {}): ToolContent {
  return { ok: true, ...data };
}

function reject(violations: Violation[]): ToolContent {
  return {
    ok: false,
    error: 'locked-fact-violation',
    message:
      'Rejected: the copy contradicts human-locked campaign facts. Nothing was applied. Fix the copy to match the locked facts — you cannot change the facts themselves.',
    violations,
  };
}

const sceneProps = {
  kind: { type: 'string', enum: ['hero', 'product', 'offer', 'cta'] },
  heading: { type: 'string', maxLength: 200 },
  body: { type: 'string', maxLength: 400 },
  durationSec: { type: 'number', minimum: 0.5, maximum: 30 },
};

const SCENE_KINDS_SET = new Set(['hero', 'product', 'offer', 'cta']);
const MAX_HEADING = 200;
const MAX_BODY = 400;
// PF4-3: bound campaign growth before any callback runs.
const MAX_SCENES = 12;

type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Build a FRESH, allowlisted SceneInput from raw tool arguments. This is the
 * PF2-1/PF2-2 fix: never spread or cast the raw args object (an agent can
 * attach unadvertised keys like `style` that survive to the exporter, or
 * malformed types that crash the canvas). Every field is a validated
 * primitive; nothing else is carried through.
 */
function parseSceneInput(
  args: Record<string, unknown>,
  partial: boolean,
): ParseResult<Partial<SceneInput>> {
  const out: Partial<SceneInput> = {};
  const required = !partial;

  if (args.kind !== undefined || required) {
    if (typeof args.kind !== 'string' || !SCENE_KINDS_SET.has(args.kind)) {
      return { ok: false, message: `kind must be one of hero, product, offer, cta.` };
    }
    out.kind = args.kind as SceneKind;
  }
  for (const [field, max] of [['heading', MAX_HEADING], ['body', MAX_BODY]] as const) {
    if (args[field] !== undefined || required) {
      const v = args[field];
      if (typeof v !== 'string' || v.length > max) {
        return { ok: false, message: `${field} must be a string of at most ${max} chars.` };
      }
      (out as Record<string, unknown>)[field] = v;
    }
  }
  if (args.durationSec !== undefined || required) {
    const d = args.durationSec;
    if (typeof d !== 'number' || !Number.isFinite(d) || d < 0.5 || d > 30) {
      return { ok: false, message: `durationSec must be a finite number between 0.5 and 30.` };
    }
    out.durationSec = d;
  }
  return { ok: true, value: out };
}

function invalidInput(message: string): ToolContent {
  return { ok: false, error: 'invalid-input', message };
}

export function buildTools(cb: ProofFrameCallbacks): WebMcpTool[] {
  const tools: WebMcpTool[] = [
    {
      name: 'get_campaign_state',
      description:
        'Read the full campaign: human-locked facts (price, discount, code, dates, disclaimer), brief, scenes, format. Locked facts are immutable to agents — write copy that matches them.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => ok({ state: cb.getState() }),
    },
    {
      name: 'set_brief',
      description:
        'Set the creative brief (tone, pacing, angle). Free-form; not rendered copy.',
      inputSchema: {
        type: 'object',
        properties: { brief: { type: 'string' } },
        required: ['brief'],
      },
      execute: (args) => {
        cb.setBrief(typeof args.brief === 'string' ? args.brief : '');
        return ok();
      },
    },
    {
      name: 'add_scene',
      description:
        'Append a scene. heading/body are rendered copy and are claim-validated against locked facts before anything is applied.',
      inputSchema: {
        type: 'object',
        properties: sceneProps,
        required: ['kind', 'heading', 'body', 'durationSec'],
        additionalProperties: false,
      },
      execute: (args) => {
        const parsed = parseSceneInput(args, false);
        if (!parsed.ok) return invalidInput(parsed.message);
        const input = parsed.value as SceneInput;
        const violations = validateScene(
          { id: 'candidate', ...input },
          cb.getState().facts,
        );
        if (violations.length > 0) return reject(violations);
        const state = cb.getState();
        if (state.scenes.length >= MAX_SCENES) {
          return invalidInput(`Scene limit reached (${MAX_SCENES}). Update or remove a scene instead.`);
        }
        const projected = state.scenes.reduce((s, x) => s + x.durationSec, 0) + input.durationSec;
        if (projected > MAX_TOTAL_SECONDS) {
          return reject([
            { rule: 'total-duration', message: `Adding this scene would make the campaign ${projected}s, over the ${MAX_TOTAL_SECONDS}s limit.` },
          ]);
        }
        const scene = cb.addScene(input);
        return ok({ scene });
      },
    },
    {
      name: 'update_scene',
      description:
        "Patch a scene's copy, kind, or duration. The patched result is claim-validated before it is applied.",
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, ...sceneProps },
        required: ['id'],
        additionalProperties: false,
      },
      execute: (args) => {
        const state = cb.getState();
        const id = String(args.id);
        const current = state.scenes.find((s) => s.id === id);
        if (!current)
          return reject([
            { rule: 'scene-duration', message: `No scene "${id}".` },
          ]);
        const parsed = parseSceneInput(args, true);
        if (!parsed.ok) return invalidInput(parsed.message);
        const violations = validateScene({ ...current, ...parsed.value }, state.facts);
        if (violations.length > 0) return reject(violations);
        // PF5-1: a duration patch must respect the campaign total cap too.
        if (parsed.value.durationSec !== undefined) {
          const projected =
            state.scenes.reduce((sum, x) => sum + x.durationSec, 0) -
            current.durationSec +
            parsed.value.durationSec;
          if (projected > MAX_TOTAL_SECONDS) {
            return reject([
              { rule: 'total-duration', sceneId: id, message: `This duration would make the campaign ${projected}s, over the ${MAX_TOTAL_SECONDS}s limit.` },
            ]);
          }
        }
        cb.updateScene(id, parsed.value);
        return ok({});
      },
    },
    {
      name: 'reorder_scenes',
      description: 'Reorder scenes. Pass every current scene id exactly once.',
      inputSchema: {
        type: 'object',
        properties: {
          orderedIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['orderedIds'],
      },
      execute: (args) => {
        // PF4-2: never trust the shape — an object with a length property
        // used to reach ids.includes and throw.
        const rawIds = args.orderedIds;
        if (!Array.isArray(rawIds) || !rawIds.every((x) => typeof x === 'string')) {
          return invalidInput('orderedIds must be an array of scene id strings.');
        }
        const ids = rawIds as string[];
        const current = cb.getState().scenes.map((s) => s.id);
        const valid =
          ids.length === current.length &&
          current.every((id) => ids.includes(id));
        if (!valid) {
          return reject([
            {
              rule: 'scene-duration',
              message: `orderedIds must be a permutation of [${current.join(', ')}].`,
            },
          ]);
        }
        cb.reorderScenes(ids);
        return ok({});
      },
    },
    {
      name: 'seek_preview',
      description:
        'Seek the live preview to a time (seconds). Deterministic — same t, same frame.',
      inputSchema: {
        type: 'object',
        properties: { tSec: { type: 'number', minimum: 0 } },
        required: ['tSec'],
      },
      execute: (args) => {
        const total = cb
          .getState()
          .scenes.reduce((s, x) => s + x.durationSec, 0);
        cb.seekPreview(Math.min(Math.max(Number(args.tSec) || 0, 0), total));
        return ok({ total });
      },
    },
    {
      name: 'validate_claims',
      description:
        'Dry-run the claim validator over a piece of copy, or over the whole campaign when no text is given.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
      annotations: { readOnlyHint: true },
      execute: (args) => {
        const state = cb.getState();
        const violations =
          typeof args.text === 'string'
            ? validateText(args.text, state.facts)
            : validateCampaign(state);
        return ok({ valid: violations.length === 0, violations });
      },
    },
    {
      name: 'export_composition',
      description:
        'Export the campaign as a standalone HyperFrames HTML composition (renderable to video). The page receives the file as a download; the result carries its size and scene count. Fails if any claim violation remains.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => {
        const state = cb.getState();
        const violations = validateCampaign(state);
        if (violations.length > 0) return reject(violations);
        const html = exportComposition(state);
        cb.deliverExport?.(html);
        // Budget: Chrome asks for ≤1.5K chars per tool output; the full HTML is ~4K.
        return ok({
          delivered: typeof cb.deliverExport === 'function',
          chars: html.length,
          scenes: state.scenes.length,
          durationSec: state.scenes.reduce((sum, s) => sum + s.durationSec, 0),
        });
      },
    },
  ];

  if (cb.importProduct) {
    tools.push({
      name: 'import_product',
      description:
        'Import product facts by handle from the connected demo storefront. Imported facts become the (still human-locked) campaign facts.',
      inputSchema: {
        type: 'object',
        properties: { handle: { type: 'string' } },
        required: ['handle'],
      },
      // Storefront data is external content from the page author's perspective.
      annotations: { untrustedContentHint: true },
      execute: async (args) => {
        try {
          const facts = await cb.importProduct!(
            typeof args.handle === 'string' ? args.handle : '',
          );
          return ok({ facts });
        } catch (error) {
          return {
            ok: false,
            error: 'import-failed',
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },
    });
  }

  return closeSchemas(tools);
}

/** Register all tools on the page's model context. Resolves with confirmed names and any rejections. */
export function registerProofFrameTools(
  cb: ProofFrameCallbacks,
  mc: ModelContextLike | null = getModelContext(),
): Promise<RegisterResult> {
  return registerAll(mc, buildTools(cb));
}
