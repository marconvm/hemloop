// WebMCP tool surface for the shopper's closet page. Same adapter pattern as
// the merchant studio (webmcp.ts): the page owns state and passes callbacks;
// tools own nothing. Privacy rule enforced here: report_demand_gap can only
// send a zero-ID DemandSignal after a human arms one share.
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
import {
  closeSchemas,
  fence,
  getModelContext,
  registerAll,
  truncate,
  UNTRUSTED_NOTE,
  type RegisterResult,
  type ModelContextLike,
  type ToolContent,
  type WebMcpTool,
} from './webmcp';

export interface GarmentInput {
  category: GarmentCategory;
  brand: string;
  size: string;
  colour: string;
}

export interface ClosetCallbacks {
  getWardrobe(): Wardrobe;
  addGarment(input: GarmentInput): Garment;
  /** Human-only, one-shot approval. No WebMCP tool may set it. */
  consumeShareApproval(): boolean;
  /** Deliver a signal to the bridge. Returns false when storage rejected it,
   * the tool must then report failure, never a false `ok`. */
  emitSignal(signal: DemandSignal): boolean;
}

function ok(data: object = {}): ToolContent {
  return { ok: true, ...data };
}

/** Every rejection tells the agent exactly what to do next (article:
 * instructions instead of error codes). */
function fail(message: string, next: string, error = 'invalid-input'): ToolContent {
  return { ok: false, error, message, next };
}

export function buildClosetTools(cb: ClosetCallbacks): WebMcpTool[] {
  return closeSchemas([
    {
      name: 'get_wardrobe',
      description:
        "Read the shopper's wardrobe for this task: garments with category, brand, size and colour. These rows stay on this page; the merchant bridge carries only the zero-ID demand event.",
      inputSchema: { type: 'object', properties: {} },
      // Shopper-entered rows are user content from the page author's perspective.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const wardrobe = cb.getWardrobe();
        const garments = wardrobe.garments.map((g) => ({
          ...g,
          brand: fence(truncate(g.brand, 80), 'closet_data'),
          colour: fence(truncate(g.colour, 40), 'closet_data'),
        }));
        return { ...ok({ garments }), note: UNTRUSTED_NOTE };
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
      description:
        'Wardrobe categories that are missing or thin, to shop against.',
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
          fit: checkFit(
            cb.getWardrobe(),
            typeof args.handle === 'string' ? args.handle : '',
          ),
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
          return fail(
            `category must be one of: ${GARMENT_CATEGORIES.join(', ')}`,
            `Choose one of: ${GARMENT_CATEGORIES.join(', ')}, then call add_garment again.`,
          );
        }
        for (const key of ['brand', 'size', 'colour'] as const) {
          const value = args[key];
          if (
            typeof value !== 'string' ||
            value.length === 0 ||
            value.length > 60
          ) {
            return fail(
              `${key} must be a non-empty string (max 60 chars).`,
              `Provide a non-empty ${key} of at most 60 characters, then call add_garment again.`,
            );
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
        'Send one data-minimized demand signal after the human explicitly approves the next share in the UI. The schema contains no shopper id or wardrobe rows: only event id, kind, category, size, optional product handle and time. Returns the exact payload sent.',
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
          return fail(
            `category must be one of: ${GARMENT_CATEGORIES.join(', ')}`,
            `Choose one of: ${GARMENT_CATEGORIES.join(', ')}, then call report_demand_gap again.`,
          );
        }
        // PF4-6: a malformed kind must not burn the approval or send as 'want'.
        if (args.kind !== undefined && args.kind !== 'gap' && args.kind !== 'fit' && args.kind !== 'want') {
          return fail(
            'kind must be one of: gap, fit, want.',
            'Use kind gap, fit, or want, then call report_demand_gap again.',
          );
        }
        const kind = (args.kind ?? 'want') as 'gap' | 'fit' | 'want';
        // Bound optional strings BEFORE consuming the one-shot approval:
        // invalid input must not burn the human's grant.
        if (args.size !== undefined && (typeof args.size !== 'string' || args.size.length > 20)) {
          return fail(
            'size must be a string of at most 20 characters.',
            'Shorten size to 20 characters or fewer, then call report_demand_gap again.',
          );
        }
        if (args.handle !== undefined && (typeof args.handle !== 'string' || args.handle.length > 80)) {
          return fail(
            'handle must be a string of at most 80 characters.',
            'Shorten handle to 80 characters or fewer, then call report_demand_gap again.',
          );
        }
        if (!cb.consumeShareApproval()) {
          return fail(
            'Human approval required. Ask the shopper to press “Approve next request” in the closet UI, then retry.',
            'Ask the shopper to press Approve next request on the closet page, then call report_demand_gap again with the same arguments. One approval releases one event.',
            'human-approval-required',
          );
        }
        const signal = makeSignal({
          kind,
          category,
          size: typeof args.size === 'string' ? args.size : undefined,
          handle: typeof args.handle === 'string' ? args.handle : undefined,
        });
        const delivered = cb.emitSignal(signal);
        if (!delivered) {
          // Approval stays consumed (privacy fail-closed); report honestly.
          return fail(
            'Signal could not be stored (bridge unavailable). Nothing was delivered; ask the shopper to approve again after fixing storage.',
            'Ask the shopper to press Approve next request again after reloading the page or checking browser storage, then retry report_demand_gap.',
            'bridge-unavailable',
          );
        }
        return ok({ sent: signal });
      },
    },
  ]);
}

export function registerClosetTools(
  cb: ClosetCallbacks,
  mc: ModelContextLike | null = getModelContext(),
): Promise<RegisterResult> {
  return registerAll(mc, buildClosetTools(cb));
}
