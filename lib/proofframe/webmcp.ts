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
import { validateCampaign, validateScene, validateText } from './validator';
import { exportComposition } from './exporter';

export interface ToolContent {
  content: { type: 'text'; text: string }[];
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute(args: Record<string, unknown>): Promise<ToolContent> | ToolContent;
}

export interface ModelContextLike {
  registerTool(tool: WebMcpTool): unknown;
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
}

function ok(data: object = {}): ToolContent {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: true, ...data }) }],
  };
}

function reject(violations: Violation[]): ToolContent {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ok: false,
          error: 'locked-fact-violation',
          message:
            'Rejected: the copy contradicts human-locked campaign facts. Nothing was applied. Fix the copy to match the locked facts — you cannot change the facts themselves.',
          violations,
        }),
      },
    ],
  };
}

const sceneProps = {
  kind: { type: 'string', enum: ['hero', 'product', 'offer', 'cta'] },
  heading: { type: 'string' },
  body: { type: 'string' },
  durationSec: { type: 'number', minimum: 0.5, maximum: 30 },
};

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
      },
      execute: (args) => {
        const input = args as unknown as SceneInput;
        const violations = validateScene(
          { id: 'candidate', ...input },
          cb.getState().facts,
        );
        if (violations.length > 0) return reject(violations);
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
      },
      execute: (args) => {
        const state = cb.getState();
        const id = String(args.id);
        const current = state.scenes.find((s) => s.id === id);
        if (!current)
          return reject([
            { rule: 'scene-duration', message: `No scene "${id}".` },
          ]);
        const patch: Partial<SceneInput> = {};
        for (const key of ['kind', 'heading', 'body', 'durationSec'] as const) {
          if (args[key] !== undefined)
            (patch as Record<string, unknown>)[key] = args[key];
        }
        const violations = validateScene({ ...current, ...patch }, state.facts);
        if (violations.length > 0) return reject(violations);
        cb.updateScene(id, patch);
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
        const ids = (args.orderedIds as string[]) ?? [];
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
        'Export the campaign as a standalone HyperFrames HTML composition (renderable to video). Fails if any claim violation remains.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => {
        const state = cb.getState();
        const violations = validateCampaign(state);
        if (violations.length > 0) return reject(violations);
        return ok({ html: exportComposition(state) });
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
      execute: async (args) => {
        try {
          const facts = await cb.importProduct!(
            typeof args.handle === 'string' ? args.handle : '',
          );
          return ok({ facts });
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ok: false,
                  error: 'import-failed',
                  message: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
          };
        }
      },
    });
  }

  return tools;
}

/** Register all tools on the page's model context. Returns registered names. */
export function registerProofFrameTools(
  cb: ProofFrameCallbacks,
  mc: ModelContextLike | null = getModelContext(),
): { registered: string[] } {
  if (!mc) return { registered: [] };
  const tools = buildTools(cb);
  for (const tool of tools) mc.registerTool(tool);
  return { registered: tools.map((t) => t.name) };
}
