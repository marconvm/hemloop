# Hemloop, Product Requirements Document

| | |
|---|---|
| Product | Hemloop, a two-sided agent-native E-commerce loop: shopper-side wardrobe reasoning, human-approved demand with no shopper identifier (zero-ID), locked-offer campaign production |
| Context | OpenAI WebMCP Challenge, submission deadline 2026-09-03 13:00 PT |
| Status | Draft for build, v2 (v1 was merchant-side only) |
| Date | 2026-08-30 |

## 1. Problem and context

Three structural problems, two sides of the counter:

1. **Merchants are blind to owned inventory.** A merchant knows what they sold, never what a shopper already owns, is missing, or wants in which size. That demand data exists only offline, in closets. Every attempt to collect it raw has been a privacy liability.
2. **Wardrobe data is unusually sensitive.** A shopper's agent should not need to hand an itemised closet to a merchant in order to make it useful.
3. **Agent-produced marketing is a compliance risk.** Creative tools are hostile to agents (canvases and timelines cannot be operated by guessing at pixels), and an agent asked to "make it punchy" will write 50% when the offer is 25%. In regulated retail promotion that is a legal problem, not a style problem.

Hemloop closes the loop across all three. The agent can reason over wardrobe rows on the shopper surface, but Hemloop's merchant-facing bridge accepts only a **human-approved demand event with no shopper identifier (zero-ID)**. The merchant gets what is needed to act (category, size and optional product), without an account ID, stable hash or wardrobe rows. The merchant answers demand through a workflow built on one rule, the merchant locks the offer and the agent works inside it, and every agent tool is claim-validated before it applies. A promo video is one output of that workflow, deliberately not the whole product: an agent video editor alone is a crowded category, the closed loop is not.

## 2. Key considerations

Argued before the solution, so the solution reads as a conclusion.

**Why WebMCP rather than a hosted MCP server.** The tools must operate on live page state (the composition being edited, the preview playhead) inside the user's session. WebMCP registers tools in the page itself, so agent and human manipulate the same state object with no backend, no credential grant and no sync problem.

**Why locking the offer is not a tool.** The trust boundary is the product. If an agent could lock or unlock facts, the guarantee "agents cannot alter the locked offer" would be a convention, not a property. Locking is therefore only reachable through the human UI. This asymmetry is deliberate and load-bearing.

**Why validate before applying, not after.** A validator that flags problems after they land still shows a wrong price on screen and relies on someone noticing. Rejecting the mutation before state changes means a non-compliant frame never exists.

**Why export refuses on violations.** The exported HTML is the deliverable that leaves the tool. An export gate is the last line where the guarantee can be enforced structurally.

**Why a catalog snapshot rather than live Storefront API.** The demo store is a password-protected development store; tokenless client-side fetches redirect to the password page. A committed snapshot generated from the real store keeps the provenance (real Shopify catalog data) while making the demo deterministic and offline-safe. The importer signature already matches a live fetch, so a storefront token upgrades it without an interface change. Rejected: shipping an Admin API token to the client, which is never acceptable. WebMCP is platform-agnostic by construction, so the catalog is an interface, not a dependency: the importer takes a generic `Catalog` shape (handle, title, price, compare-at), and Shopify is this demo's connector, not a requirement.

**Why the demand event has no shopper hash.** A hash of a predictable or stable shopper identifier is still pseudonymous and may be enumerable; the merchant does not need it for this workflow. `report_demand_gap` is Hemloop's only merchant-facing tool and its output schema contains no identity field or wardrobe rows. It also rejects until the shopper arms a one-shot approval in the UI; no WebMCP tool can grant that approval. The tool returns the exact payload sent, so the shopper (and the judge) can inspect the boundary directly.

**Why two routes on one origin, not two origins.** The narrative is two surfaces; the deployment is two routes of one app. Same-origin means the signal bridge (localStorage + storage events) works today, in any browser, with no dependency on unverified multi-tab tool availability in agent browsers. The agent can still be the join across both tabs where supported, but the demo does not bet on it.

**Rejected: two-origin tool composition as the core mechanic.** An earlier candidate (two independent sites joined only by the agent) scored higher on ambition but depended on unverified multi-tab tool behaviour. On a 4-day build, an unverified core mechanic is disqualifying; the one-origin bridge keeps the same story with none of the risk.

## 3. Solution and phases

Three routes on one origin. `/` is the landing page (the pitch, agent setup, tool contract). `/closet` is the shopper surface: private wardrobe, gaps, sizes, preferences, a sharing-level dial and a requests-sent list, 7 WebMCP tools. `/studio` is the merchant surface: approved offer facts (human control), a placement control, live composition preview with timeline, an offer completeness meter, an Incoming requests panel fed by the signal bridge and grouped by category and size, and an agent activity log recording every agent action, acceptance and rejection; it registers 10 WebMCP tools. Export emits a standalone, deterministic HyperFrames-format HTML composition renderable to video.

| Phase | Client-visible outcome | Gate | Date |
|---|---|---|---|
| P1 Core library and tool surface | Validator, exporter, WebMCP adapter, all unit-tested | 15 tests green, lint and typecheck clean | 2026-08-30, done |
| P2 Studio integration | Working three-panel studio, blocked-claim demo live in browser | Manual browser verification, hyperframes check passes on export | 2026-08-30, done |
| P3 Shopify import and docs | import_product from real-store snapshot, PRD and guides | 19 tests green, docs committed | 2026-08-30, done |
| P3b Closet surface and request loop | /closet page, 6 shopper tools, signal bridge carrying no shopper identifier, studio Incoming requests panel | Unit tests green, loop verified in browser end to end | 2026-08-30, done |
| P4 Agent verification | Tools exercised by a real agent (Chrome WebMCP flag or ChatGPT) | Demo loop recorded end to end | 2026-08-31 |
| P5 Submission pack | Public repo, deploy, video, Devpost entry | Owner approval, then submit with 24 h buffer | 2026-09-01 to 09-02 |

## 4. Acceptance criteria

Each criterion is verifiable and traceable to a test or a documented manual check.

| # | Criterion | Verified by |
|---|---|---|
| AC-1 | Agent mutations that contradict locked facts are rejected with a structured violation list and change no state | tests/proofframe.test.ts, blocked-claim browser demo |
| AC-2 | No WebMCP tool can alter or unlock the offer facts; import_product fails while facts are locked | adapter tool-surface test, studio guard |
| AC-3 | Export refuses while any violation exists; exported HTML passes hyperframes check with 0 errors | exporter tests, hyperframes check run |
| AC-4 | The disclaimer renders for the full duration of every export and is not removable by any tool | exporter footer test |
| AC-5 | All rendered copy is HTML-escaped in the export | escaping test |
| AC-6 | Tool registration works under both navigator.modelContext and document.modelContext | adapter probe + registration test |
| AC-7 | import_product maps real catalog pricing to facts and keeps promo terms human-owned | tests/shopify.test.ts |
| AC-8 | The page functions as a normal single-user editor when WebMCP is absent (preview mode) | manual browser check |
| AC-9 | Repository ships an OSI license, README, PRD, user guide and tech guide | repo inspection |
| AC-10 | DemandSignal has no shopper identifier or wardrobe field; `report_demand_gap` rejects without human one-shot approval, consumes approval on use, and returns the exact payload sent | tests/closet.test.ts |
| AC-11 | Requests emitted on the closet surface appear in the studio Incoming requests panel live (same tab and cross tab) | browser loop verification |
| AC-12 | The closet's read tools carry readOnlyHint and report_demand_gap is the only outbound tool | closet tool-surface test |
| AC-13 | Name, account, email, wardrobe rows, purchase history and income are never sent by `report_demand_gap` at any consent level | tests/closet.test.ts |
| AC-14 | Consent level 0 (Private) makes `report_demand_gap` return `sharing-disabled` and emit nothing, without touching the approval gate | tests/closet.test.ts |
| AC-15 | `ConsentGrant.fields` is drawn only from the fixed `ConsentField` enum minted in code; no WebMCP tool can widen it to a free string | tests/closet.test.ts |

## 4b. Consent, shipped 2026-09-02

Wave 2 turns opt-in into the product mechanic rather than a checkbox in front of the loop. A shopper-controlled sharing level (0 Private, 1 Basics, 2 Context, 3 Taste, stored only in the browser) sets exactly which `ConsentField`s a `report_demand_gap` call may carry; `consentFieldsForRequest` is the single pure function both the tool and the payload-preview UI call, so they can never drift. AC-13 through AC-15 are the acceptance criteria this mechanic exists to satisfy.

## 4c. Wave 3 acceptance criteria, shipped 2026-09-03

| # | Criterion | Verified by |
|---|---|---|
| AC-16 | Raw `Purchase` rows never appear in a `DemandSignal`; only the derived `BuyingPattern` can, and only at consent level 3 | tests/closet.test.ts |
| AC-17 | `buyingPattern` is deterministic and pure: same purchases and category always yield the same discount sensitivity, spend band and brand loyalty | tests/closet.test.ts |
| AC-18 | A `PersonalOffer` a `propose_offer` call or the auto-propose toggle stages is never visible to the shopper (`get_offer`/`get_offers`) until a human approves it in the studio | tests/proofframe.test.ts, tests/closet.test.ts |
| AC-19 | `matchOffer` never returns a price whose resulting margin is below `facts.marginFloorPercent`; the discount is trimmed in 5-point steps until the floor holds or the discount reaches 0 | tests/proofframe.test.ts |
| AC-20 | A `PersonalOffer` is addressed to a `requestId` (a `DemandSignal.signalId`), never to a shopper identifier; `get_offer(requestId)` and `get_offers` match on that id alone | tests/proofframe.test.ts, tests/closet.test.ts |
| AC-21 | `import_receipt` never echoes the pasted text back verbatim and never sends it anywhere off the page; a failed parse returns a structured `unparsed-receipt` result, not a throw | tests/closet.test.ts |
| AC-22 | Auto-propose is a human-only toggle no WebMCP tool can read or flip | adapter tool-surface test, studio guard |

## 4d. Wave 4 acceptance criteria, shipped 2026-09-03

| # | Criterion | Evidence |
|---|---|---|
| AC-23 | A category whose oldest owned garment is past its typical replacement life comes back from `find_gaps` with a `due` block carrying the date, the months elapsed and the size to buy again, and nothing about the merchant, the price or the purchase row | tests/closet.test.ts |
| AC-24 | A garment with no purchase date is never reported as worn out, and a category that is missing or thin is reported once, without a `due` block: absence outranks wear | tests/closet.test.ts |
| AC-25 | `report_demand_gap` accepts kind `replace` at level `need`; an unknown kind is still refused without consuming the human's one-shot approval | tests/closet.test.ts |
| AC-26 | `get_demand` never mutates the campaign, drops malformed request rows, and is registered by `getRequests` alone, so an agent can discover a request id before any offer can be staged | tests/proofframe.test.ts |
| AC-27 | For every demand group, the panel's verdict is `can-offer` exactly when `matchOffer` on that group would return an offer: the insight cannot promise what `propose_offer` then declines | tests/proofframe.test.ts |

## 5. Ownership

| Component | Owner |
|---|---|
| lib/proofframe (validator, exporter, adapter, importer) and tests | Claude session "webmcp" |
| Studio UI, app shell, hosting scaffold | Codex session "webmcp-help" |
| Approvals: public repo, deploy, submission | Marco (product owner) |

## 6. Roadmap: Hemloop as the middle layer

Hemloop sits between the shopper's closet and the merchant's offer today. The next layer is Hemloop sitting between the merchant's locked offer and whatever agent does the actual buying. Four threads, ordered by what they build on. Wave 2 (2026-09-02) shipped a first slice of every thread; wave 3 (2026-09-03) closed the E-commerce-handoff thread with a real, human-approved offer loop. What remains is called out per row.

| Layer | Shipped | Still roadmap |
|---|---|---|
| Shopper profile | Replacement lifecycle from purchase dates: `find_gaps` returns a `due` block for a category whose oldest garment is past its typical life, and `report_demand_gap` kind `replace` carries that timing to the merchant (wave 4). Preferences card (fit, colour family, materials, price ceiling, liked brands) as `get_preferences`, consent-gated per field; `occasion` on the demand event (season, gift, event); family sub-profiles (Me / Partner / Kid) via `garmentsForProfile` (wave 2); purchase log across every merchant, rivals included, filled by hand, `import_receipt` (till receipt and order-email formats, no OCR), or automatically on Bought; a coarse `buyingPattern` per category derived from it (wave 3) | Receipt OCR; real order-email connectors; a consent receipt the shopper can export; a browser extension surface |
| Demand visibility | Grouped by category and size with counts; labelled Need or Want; each request carries the shopper's consent grant (level and exact fields) (wave 2); the level-3 grant can carry `buyingPattern` (wave 3); each group scored against the locked stock and readable by the merchant's agent through `get_demand`, with a `replace` count marking shoppers who already own one (wave 4) | Aggregation before disclosure: a k-anonymity floor so a demand cell only becomes visible to the merchant once enough distinct shoppers have contributed to it; per-merchant consent levels |
| Creative output | Placement selector (Story 9:16, Feed 4:5, Display 16:9) on the existing HTML composition; a human-only control, no WebMCP tool sets it (wave 2) | Image and GIF export matched to those placements, then short video once the still and motion pipelines share one validator; a browser extension surface |
| E-commerce handoff | `get_offer`: locked facts as structured data with sizesInStock, purchaseUrl and an offer-completeness meter (9 facts, `computeCompleteness`); Bought / Passed outcomes recorded per demand event (wave 2); locked offer rules (cost, margin floor, max discount); `matchOffer` auto-matches a personal offer inside them; `propose_offer` and the Auto-propose toggle stage one, a human approves or declines; `get_offer(requestId)` and `get_offers` hand the approved offer to a shopping agent or the shopper; Bought on an approved offer records the purchase with its `offerId` (wave 3) | The outcome written back into the merchant's own reporting, not just displayed; the `ToolContract`/`ApprovalReceipt`/`PresentationEvent` seam described in `docs/integrations/commerce-agents/README.md` |

The merchant already answers demand at two levels, Need and Want (`DemandSignal.kind`: `gap`/`fit` read as Need, `want` reads as Want). The roadmap above deepens both levels; it does not add a third.

## Appendix A, WebMCP tool contract

Summarised; full schemas in `lib/proofframe/webmcp.ts` and docs/TECH-GUIDE.md.

| Tool | Kind | Guarantee |
|---|---|---|
| get_campaign_state | read | readOnlyHint |
| validate_claims | read | dry-run, never mutates |
| export_composition | read | refuses on violations |
| get_offer | read | readOnlyHint; returns the locked offer (product, prices, promo code, validity dates, disclaimer, sizes in stock, purchase link, offer completeness) as structured data for a shopping agent; pass `requestId` to read one approved personal offer instead |
| set_brief | write | free-form, brief is not rendered copy |
| add_scene / update_scene | write | claim-validated before apply |
| reorder_scenes | write | permutation-checked |
| seek_preview | write | clamped to composition length, deterministic |
| import_product | write | snapshot-backed, blocked while facts are locked |
| get_demand | read | consented demand grouped by category and size, with the request ids and, per group, whether the locked offer can answer it (`can-offer`, `size-not-in-stock`, `category-mismatch`) |
| propose_offer | write | matches one incoming request against the locked offer rules (cost, margin floor, max discount); stages a `PersonalOffer`, never visible to the shopper until a human approves it |

## Appendix B, Closet tool contract (shopper surface)

| Tool | Kind | Guarantee |
|---|---|---|
| get_wardrobe | read | readOnlyHint; never exposes the raw shopper id |
| get_my_sizes | read | readOnlyHint |
| find_gaps | read | readOnlyHint |
| check_fit | read | readOnlyHint; uses the public catalog snapshot |
| get_preferences | read | readOnlyHint; fit, colour family, materials to avoid, price ceiling, liked brands; a field travels only if the sharing level allows it |
| add_garment | write | enum-validated category, bounded strings |
| report_demand_gap | write | the only tool that can send anything to a merchant; blocks outright with `sharing-disabled` at consent level 0, otherwise requires human one-shot approval, emits a DemandSignal with no shopper identifier scoped to the shopper's consent level, and returns the exact payload sent |
| import_receipt | write | parses a pasted receipt or order email (bounded text, no OCR, no network); adds purchases and, for recognised items, garments; the pasted text itself never leaves the page |
| get_offers | read | readOnlyHint; approved personal offers addressed to requests this closet already sent, matched by `requestId` |

Note on labelling: `DemandSignal.kind` values `gap` and `fit` are labelled **Need** in both UIs; `want` is labelled **Want**. The tool contract and stored value are unchanged; only the human-facing label differs.

### DemandSignal shape (consent-gated)

```json
{
  "signalId": "string, random event id, not a shopper id",
  "kind": "gap | fit | want",
  "category": "hoodie | tee | denim | jacket | footwear | accessory",
  "size": "string or null",
  "handle": "string or null",
  "at": "ISO timestamp",
  "level": "need | want",
  "consent": { "level": "0 | 1 | 2 | 3", "fields": ["a fixed ConsentField enum, never a free string"] },
  "occasion": "everyday | season | gift | event, present only at consent level >= 2",
  "for": "self | partner | kid, present only at consent level >= 2",
  "context": { "fitPreference": "string, present only at consent level >= 2" },
  "taste": { "colourFamily": "string", "avoidMaterials": ["string"], "priceCeiling": "number, present only at consent level 3" },
  "pattern": {
    "discountSensitivity": "code | percent | none",
    "spendBand": "under-50 | 50-100 | 100-plus",
    "brandLoyalty": "loyal | switcher",
    "_comment": "present only at consent level 3, derived from purchase history by buyingPattern(); the raw Purchase rows never appear here"
  }
}
```

`fields` in `consent` is always a subset of the enum minted in `ConsentField` (`category`, `size`, `level`, `handle`, `occasion`, `for`, `fitPreference`, `colourFamily`, `avoidMaterials`, `priceCeiling`, `buyingPattern`); no WebMCP tool can widen it. Name, account, email, wardrobe rows, purchase history and income never appear in this shape at any level.
