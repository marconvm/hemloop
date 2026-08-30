// WebMCP tool surface for the shopper's closet page. Same adapter pattern as
// the merchant studio (webmcp.ts): the page owns state and passes callbacks;
// tools own nothing. Privacy rule enforced here: the only tool that can send
// anything toward the merchant is report_demand_gap, and it can only send a
// hashed DemandSignal built by makeSignal - never the wardrobe itself.
import {
  checkFit,
  findGaps,
  GARMENT_CATEGORIES,
  makeSignal,
  sizesOwned,
  type DemandSignal,
  type Garment,
  type GarmentCategory,
  type Wardrobe,
} from './closet';
import { getModelContext, type ModelContextLike, type ToolContent, type WebMcpTool } from './webmcp';

export interface GarmentInput {
  category: GarmentCategory;
  brand: string;
  size: string;
  colour: string;
}

export interface ClosetCallbacks {
  getWardrobe(): Wardrobe;
  addGarment(input: GarmentInput): Garment;
  emitSignal(signal: DemandSignal): void;
}

function ok(data: object = {}): ToolContent {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: true, ...data }) }],
  };
}

function fail(message: string): ToolContent {
  return {
    content: [
      { type: 'text', text: JSON.stringify({ ok: false, error: 'invalid-input', message }) },
    ],
  };
}

export function buildClosetTools(cb: ClosetCallbacks): WebMcpTool[] {
  return [
    {
      name: 'get_wardrobe',
      description:
        "Read the shopper's private wardrobe: garments with category, brand, size, colour. This data stays on this page - it is never shared with any merchant.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => {
        const wardrobe = cb.getWardrobe();
        // shopperId stays private even from the agent transcript
        return ok({ garments: wardrobe.garments });
      },
    },
    {
      name: 'get_my_sizes',
      description: 'Sizes the shopper owns, optionally filtered by brand.',
      inputSchema: {
        type: 'object',
        properties: { brand: { type: 'string' } },
      },
      annotations: { readOnlyHint: true },
      execute: (args) =>
        ok({
          sizes: sizesOwned(
            cb.getWardrobe(),
            typeof args.brand === 'string' ? args.brand : undefined,
          ),
        }),
    },
    {
      name: 'find_gaps',
      description: 'Wardrobe categories that are missing or thin, to shop against.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => ok({ gaps: findGaps(cb.getWardrobe()) }),
    },
    {
      name: 'check_fit',
      description:
        "Fit advice for a store product handle, based on sizes the shopper already owns. Read-only; uses the store's public catalog.",
      inputSchema: {
        type: 'object',
        properties: { handle: { type: 'string' } },
        required: ['handle'],
      },
      annotations: { readOnlyHint: true },
      execute: (args) =>
        ok({
          fit: checkFit(cb.getWardrobe(), typeof args.handle === 'string' ? args.handle : ''),
        }),
    },
    {
      name: 'add_garment',
      description: 'Add a garment the shopper owns to the private wardrobe.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: GARMENT_CATEGORIES },
          brand: { type: 'string' },
          size: { type: 'string' },
          colour: { type: 'string' },
        },
        required: ['category', 'brand', 'size', 'colour'],
      },
      execute: (args) => {
        const category = args.category as GarmentCategory;
        if (!GARMENT_CATEGORIES.includes(category)) {
          return fail(`category must be one of: ${GARMENT_CATEGORIES.join(', ')}`);
        }
        for (const key of ['brand', 'size', 'colour'] as const) {
          const value = args[key];
          if (typeof value !== 'string' || value.length === 0 || value.length > 60) {
            return fail(`${key} must be a non-empty string (max 60 chars).`);
          }
        }
        const garment = cb.addGarment({
          category,
          brand: args.brand as string,
          size: args.size as string,
          colour: args.colour as string,
        });
        return ok({ garment });
      },
    },
    {
      name: 'report_demand_gap',
      description:
        'Send the merchant an ANONYMOUS demand signal (hashed shopper id, category, size, optional product handle). This is the only tool that shares anything with the merchant, and it can never include wardrobe contents or identity. Returns the exact payload sent so the shopper can verify.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['gap', 'fit', 'want'] },
          category: { type: 'string', enum: GARMENT_CATEGORIES },
          size: { type: 'string' },
          handle: { type: 'string' },
        },
        required: ['category'],
      },
      execute: (args) => {
        const category = args.category as GarmentCategory;
        if (!GARMENT_CATEGORIES.includes(category)) {
          return fail(`category must be one of: ${GARMENT_CATEGORIES.join(', ')}`);
        }
        const kind =
          args.kind === 'gap' || args.kind === 'fit' || args.kind === 'want' ? args.kind : 'want';
        const signal = makeSignal(cb.getWardrobe(), {
          kind,
          category,
          size: typeof args.size === 'string' ? args.size : undefined,
          handle: typeof args.handle === 'string' ? args.handle : undefined,
        });
        cb.emitSignal(signal);
        return ok({ sent: signal });
      },
    },
  ];
}

export function registerClosetTools(
  cb: ClosetCallbacks,
  mc: ModelContextLike | null = getModelContext(),
): { registered: string[] } {
  if (!mc) return { registered: [] };
  const tools = buildClosetTools(cb);
  for (const tool of tools) mc.registerTool(tool);
  return { registered: tools.map((t) => t.name) };
}
