// WebMCP tool surface for the shopper's closet page. Same adapter pattern as
// the merchant studio (webmcp.ts): the page owns state and passes callbacks;
// tools own nothing. Privacy rule enforced here: report_demand_gap can only
// send a zero-ID DemandSignal after a human arms one share.
import {
  checkFit,
  consentFieldsForRequest,
  findGaps,
  garmentsForProfile,
  GARMENT_CATEGORIES,
  makeSignal,
  sizesOwned,
  type ConsentGrant,
  type DemandSignal,
  type Garment,
  type GarmentCategory,
  type Occasion,
  type Preferences,
  type ShopperProfile,
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
  /** Who the shopper is currently shopping for. Reads, not just
   * report_demand_gap, are scoped to this profile's rows. Default 'self'. */
  getActiveProfile(): ShopperProfile;
  /** The sharing dial (0 Private .. 3 Taste), set only by the person in the
   * UI. No WebMCP tool may set it. */
  getConsentLevel(): 0 | 1 | 2 | 3;
  /** The shopper's stated preferences (fit, colour, materials, price,
   * brands). Only leaves the page as far as the consent level allows. */
  getPreferences(): Preferences;
}

function ok(data: object = {}): ToolContent {
  return { ok: true, ...data };
}

/** Every rejection tells the agent exactly what to do next (article:
 * instructions instead of error codes). */
function fail(message: string, next: string, error = 'invalid-input'): ToolContent {
  return { ok: false, error, message, next };
}

/** Rows per get_wardrobe result; 12 compact rows fit Chrome's 1.5K output budget with the fence and note. */
const MAX_WARDROBE_ROWS = 12;

export function buildClosetTools(cb: ClosetCallbacks): WebMcpTool[] {
  return closeSchemas([
    {
      name: 'get_wardrobe',
      description:
        "Read the shopper's wardrobe for this task as compact rows: id, category, brand, size, colour and who it is for. Optional category filter. Returns at most 12 rows plus the total count, so page by category when the wardrobe is large. Rows stay on this page; only an approved request can reach a merchant.",
      inputSchema: {
        type: 'object',
        properties: { category: { type: 'string', enum: [...GARMENT_CATEGORIES] } },
      },
      // Shopper-entered rows are user content from the page author's perspective.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (args) => {
        const all = garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()).garments;
        const filtered =
          typeof args.category === 'string'
            ? all.filter((g) => g.category === args.category)
            : all;
        // Explicit shape, every string bounded, row count capped: a hostile wardrobe row
        // (80-char brand, long image path, material, retailer) once produced a 15K result
        // against Chrome's 1.5K per-tool output budget. Codex round 3, finding A(f).
        const rows = filtered.slice(0, MAX_WARDROBE_ROWS).map((g) =>
          [
            truncate(g.id, 12),
            g.category,
            truncate(g.brand, 28),
            truncate(g.size, 12),
            truncate(g.colour, 16),
            g.for ?? 'self',
          ].join(' | '),
        );
        return {
          ...ok({
            count: filtered.length,
            truncated: Math.max(0, filtered.length - rows.length),
            columns: 'id | category | brand | size | colour | for',
            garments: fence(rows.join('\n'), 'closet_data'),
          }),
          note: UNTRUSTED_NOTE,
        };
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
            garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()),
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
      execute: () =>
        ok({
          gaps: findGaps(garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile())),
        }),
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
            garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()),
            typeof args.handle === 'string' ? args.handle : '',
          ),
        }),
    },
    {
      name: 'get_preferences',
      description:
        "Read the shopper's stated preferences for this task: fit, colour family, materials to avoid, price ceiling, liked brands. Stays on this page unless the shopper's sharing level allows a field to travel with a request.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const prefs = cb.getPreferences();
        return {
          ...ok({
            preferences: {
              fitPreference: prefs.fitPreference,
              colourFamily: fence(truncate(prefs.colourFamily, 60), 'closet_data'),
              avoidMaterials: prefs.avoidMaterials.map((m) =>
                fence(truncate(m, 40), 'closet_data'),
              ),
              priceCeiling: prefs.priceCeiling,
              likedBrands: prefs.likedBrands.map((b) =>
                fence(truncate(b, 60), 'closet_data'),
              ),
            },
          }),
          note: UNTRUSTED_NOTE,
        };
      },
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
        "Send one data-minimized demand signal after the human explicitly approves the next share in the UI. Which fields travel is set by the shopper's sharing level (0 Private blocks everything, 1 Basics is category/size/need-or-want, 2 Context adds occasion and fit preference, 3 Taste adds colour/materials/price). Never a shopper id or wardrobe rows. Returns the exact payload sent.",
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['gap', 'fit', 'want'] },
          category: { type: 'string', enum: GARMENT_CATEGORIES },
          size: { type: 'string' },
          handle: { type: 'string' },
          occasion: { type: 'string', enum: ['everyday', 'season', 'gift', 'event'] },
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
        const level: DemandSignal['level'] = kind === 'want' ? 'want' : 'need';
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
        const OCCASIONS: Occasion[] = ['everyday', 'season', 'gift', 'event'];
        if (args.occasion !== undefined && (typeof args.occasion !== 'string' || !OCCASIONS.includes(args.occasion as Occasion))) {
          return fail(
            `occasion must be one of: ${OCCASIONS.join(', ')}.`,
            `Use one of ${OCCASIONS.join(', ')} for occasion, then call report_demand_gap again.`,
          );
        }

        // Consent level 0 (Private) blocks the request outright - checked
        // before consuming approval, since the Approve control is itself
        // disabled at this level and no approval could ever be armed.
        const consentLevel = cb.getConsentLevel();
        if (consentLevel === 0) {
          return {
            ok: false,
            error: 'sharing-disabled',
            message: 'The shopper set sharing to Private. Nothing leaves this page.',
            next: 'Ask the shopper to raise the sharing level on the closet page if they want the store to hear this request.',
          };
        }

        if (!cb.consumeShareApproval()) {
          return fail(
            'Human approval required. Ask the shopper to press “Approve next request” in the closet UI, then retry.',
            'Ask the shopper to press Approve next request on the closet page, then call report_demand_gap again with the same arguments. One approval releases one event.',
            'human-approval-required',
          );
        }

        const hasSize = typeof args.size === 'string';
        const hasHandle = typeof args.handle === 'string';
        const hasOccasion = typeof args.occasion === 'string';
        const consent: ConsentGrant = {
          level: consentLevel,
          fields: consentFieldsForRequest(consentLevel, { hasSize, hasHandle, hasOccasion }),
        };

        const signal: DemandSignal = {
          ...makeSignal({
            kind,
            category,
            size: hasSize ? (args.size as string) : undefined,
            handle: hasHandle ? (args.handle as string) : undefined,
          }),
          level,
          consent,
        };
        if (consentLevel >= 2) {
          if (hasOccasion) signal.occasion = args.occasion as Occasion;
          signal.for = cb.getActiveProfile();
          signal.context = { fitPreference: cb.getPreferences().fitPreference };
        }
        if (consentLevel >= 3) {
          const prefs = cb.getPreferences();
          signal.taste = {
            colourFamily: prefs.colourFamily,
            avoidMaterials: prefs.avoidMaterials,
            priceCeiling: prefs.priceCeiling,
          };
        }

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
