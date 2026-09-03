// WebMCP tool surface for the shopper's closet page. Same adapter pattern as
// the merchant studio (webmcp.ts): the page owns state and passes callbacks;
// tools own nothing. Privacy rule enforced here: report_demand_gap can only
// send a zero-ID DemandSignal after a human arms one share.
import {
  buyingPattern,
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
  type Purchase,
  type ShopperProfile,
  type Wardrobe,
} from './closet';
import { parseReceipt } from './receipts';
import { readOffers, readSignals } from './signal-bridge';
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
  /** Purchases across every merchant (including rivals), newest first or
   * not - order is the caller's choice. Only the derived BuyingPattern ever
   * leaves the page, never these raw rows. */
  getPurchases(): Purchase[];
  /** Append purchases (from an imported receipt/order-email, or a Bought
   * outcome on an offer). Never called by a WebMCP tool for the offer path -
   * that one is human-only, via the UI. */
  addPurchases(p: Purchase[]): void;
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
/** Garments per profile that add_garment will accept; the studio has MAX_SCENES for the same reason. */
const MAX_GARMENTS = 40;
/** Upper bound on rows get_offers will even attempt; the running JSON-size
 * guard inside the tool is what actually keeps it under the 1.5K budget. */
const MAX_OFFER_ROWS = 10;

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
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (args) => ({
        ...ok({
          // brand and size are shopper- or agent-written text: fence them. Claude round 3, A(d).
          sizes: sizesOwned(
            garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()),
            typeof args.brand === 'string' ? args.brand : undefined,
          )
            .slice(0, 20)
            .map((r) => ({
              brand: fence(truncate(r.brand, 28), 'closet_data'),
              category: r.category,
              size: fence(truncate(r.size, 12), 'closet_data'),
            })),
        }),
        note: UNTRUSTED_NOTE,
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
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (args) => {
        const fit = checkFit(
          garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()),
          typeof args.handle === 'string' ? args.handle : '',
        );
        // The note interpolates owned brand/size (shopper- or agent-written) into prose: fence it.
        return {
          ...ok({ fit: { ...fit, note: fence(truncate(fit.note, 240), 'closet_data') } }),
          note: UNTRUSTED_NOTE,
        };
      },
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
        if (garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()).garments.length >= MAX_GARMENTS) {
          return fail(
            `The wardrobe holds at most ${MAX_GARMENTS} garments for this profile.`,
            'Ask the shopper to delete a garment on the closet page, or switch profile, then call add_garment again.',
            'wardrobe-full',
          );
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
          signal.pattern = buyingPattern(cb.getPurchases(), category);
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
    {
      name: 'import_receipt',
      description:
        'Import a pasted receipt or order-confirmation email (no OCR, no network, just the text). Adds each item to the purchase log, and to the wardrobe for items whose category is recognised. Everything stays on this page; nothing is sent to a merchant.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', maxLength: 4000 } },
        required: ['text'],
      },
      execute: (args) => {
        if (
          typeof args.text !== 'string' ||
          args.text.length === 0 ||
          args.text.length > 4000
        ) {
          return fail(
            'text must be a non-empty string of at most 4000 characters.',
            'Paste the receipt or order email text (up to 4000 characters), then call import_receipt again.',
          );
        }
        const text = args.text;
        const parsed = parseReceipt(text);
        if (!parsed) {
          return {
            ok: false,
            error: 'unparsed-receipt',
            message: 'Could not recognise this as a receipt or order email.',
            next: 'Paste the receipt or order email text as-is, including the merchant name and item lines.',
          };
        }

        // ParsedReceipt does not distinguish which shape it came from -
        // re-check the same heuristic receipts.ts uses, only to tag the
        // Purchase source correctly.
        const looksLikeEmail =
          /^order\s*#/im.test(text) || /thank you for your order/i.test(text);
        const source: Purchase['source'] = looksLikeEmail ? 'order-email' : 'receipt';
        const stamp = Date.now().toString(36);
        const purchases: Purchase[] = parsed.items.map((item, i) => ({
          id: `import-${stamp}-${i}`,
          at: parsed.at,
          merchant: parsed.merchant,
          brand: parsed.merchant,
          title: item.title,
          category: item.category ?? 'accessory',
          size: item.size ?? 'OS',
          price: item.price,
          currency: parsed.currency,
          promoCode: parsed.promoCode,
          source,
        }));
        cb.addPurchases(purchases);

        let garmentsAdded = 0;
        for (const item of parsed.items) {
          if (!item.category) continue;
          if (
            garmentsForProfile(cb.getWardrobe(), cb.getActiveProfile()).garments
              .length >= MAX_GARMENTS
          ) {
            break;
          }
          cb.addGarment({
            category: item.category,
            brand: parsed.merchant,
            size: item.size ?? 'OS',
            colour: 'unspecified',
          });
          garmentsAdded++;
        }

        return ok({
          merchant: fence(truncate(parsed.merchant, 80), 'storefront_data'),
          itemsAdded: parsed.items.length,
          garmentsAdded,
          purchasesAdded: purchases.length,
          next: 'Call get_wardrobe or find_gaps to see what changed.',
        });
      },
    },
    {
      name: 'get_offers',
      description:
        "Read approved personal offers addressed to requests this closet already sent (matched by request id): size, price, code, validity, and a purchase link. Read-only; a human already approved these on the merchant side. The shopper decides Bought or Passed on this page, no tool can buy for them.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const sentIds = new Set(readSignals().map((s) => s.signalId));
        const eligible = readOffers().filter(
          (o) => o.status === 'approved' && sentIds.has(o.requestId),
        );
        const rows: Record<string, unknown>[] = [];
        for (const o of eligible) {
          if (rows.length >= MAX_OFFER_ROWS) break;
          const row = {
            offerId: o.offerId,
            requestId: o.requestId,
            title: fence(truncate(o.title, 60), 'storefront_data'),
            size: o.size,
            price: o.price,
            regularPrice: o.regularPrice,
            discountPercent: o.discountPercent,
            promoCode: o.promoCode,
            validTo: o.validTo,
            purchaseUrl: truncate(o.purchaseUrl, 80),
          };
          // Budget guard: Chrome asks for <=1.5K per tool output. Stop before
          // a run of large offers would blow it, rather than trusting a
          // fixed row count - same discipline as get_wardrobe's cap
          // (round 3, finding A(f)).
          if (JSON.stringify([...rows, row]).length > 1150) break;
          rows.push(row);
        }
        return {
          ...ok({
            offers: rows,
            count: eligible.length,
            truncated: eligible.length - rows.length,
          }),
          note: UNTRUSTED_NOTE,
          next: 'Ask the shopper to choose Bought or Passed on the closet page; you cannot buy for them.',
        };
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
