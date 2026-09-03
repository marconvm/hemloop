# Hemloop, gap analysis (2026-09-02, 22 hours before submission)

Inputs: Marco's 14-point third-party read of the site, his product vision, Anthropic's
"The anatomy of effective commerce agents", and an independent judge-level review
(docs/coordination/judge-review-2026-09-02.md, which carries the per-item detail).

## What Hemloop is, in one breath

Two web pages register 21 WebMCP tools. The shopper's agent shops a private closet and can send
a store exactly one thing: what is missing, in what size, with no shopper identifier, and only after
the person presses Approve. The merchant's agent answers inside offer facts a human locked first;
copy that contradicts them is rejected before it renders. The guarantees are structural: there is no
tool that can unlock facts or arm sharing. In the article's words, the harness enforces it, not the
prompt; the model stages, the person applies.

## Vision vs build

| Vision element | Today | Verdict before deadline |
|---|---|---|
| Capture purchases across all e-commerce | 8 seeded garments | roadmap |
| Manual wardrobe: edit, receipt, online lookup | add only | edit/delete: demo-grade; receipt/lookup: roadmap |
| Preferences (most important), sizes, income band, spending pattern | sizes only | preferences card: demo-grade; income band: drop from pitch (fights the no-identity story); pattern: roadmap |
| Seasonal / festival / event signals | single timestamp | `occasion` field on the signal: demo-grade |
| Family sub-profiles | none | Me / Partner / Kid switch: demo-grade |
| App / extension / web app | web app | roadmap |
| Merchant sees patterns via MCP | raw event list | group by category+size with counts: demo-grade |
| Live creatives: image/GIF first, then video | one 9:16 video composition | placement selector (Story 9:16, Feed 4:5, Display 16:9) on the existing format: demo-grade; still/GIF export: roadmap |
| Consumable by shopping agents, direct purchase link | none | `get_offer` read tool from locked facts with purchaseUrl: **real, highest value** |
| Purchase-or-not feedback loop | none | Bought / Passed on each signal row: demo-grade |
| NEED vs WANT two levels | `DemandSignal.kind` already has gap/fit/want, invisible in UI | label Need / Want, sort Needs first: **real, nearly free** |

## Shipped 2026-09-02 (wave 1 and 2)

- [x] `get_offer` read tool with Need/Want labelling (wave 1)
- [x] Preferences card and `get_preferences` (fit, colour family, materials to avoid, price ceiling, liked brands), fenced `<closet_data>`
- [x] Consent dial: sharing levels 0-3, `report_demand_gap` gated per level, level 0 returns `sharing-disabled`
- [x] `occasion` field on the demand event (season, gift, event)
- [x] Family sub-profiles: Shopping for Me / Partner / Kid, scoping wardrobe and tools
- [x] Merchant sees demand grouped by category and size with counts, and the shopper's consent grant per request
- [x] Placement selector on the studio canvas (Story 9:16, Feed 4:5, Display 16:9), human-only
- [x] Offer completeness meter over 9 facts (incl. `sizesInStock`, `purchaseUrl`, `productImage`), also returned by `get_offer`
- [x] Bought / Passed outcomes recorded per demand event, shown in the studio
- [x] 17 WebMCP tools total (7 closet, 10 studio), 63 unit tests

Roadmap items unchanged by this wave: purchase capture from receipts/order-email, aggregation before disclosure (k-anonymity floor), consent receipts, image/GIF export, browser extension.

## Judge's four, if nothing else ships

1. A real tool table on the landing page (surface, tool, kind, what it does, structural guarantee), with the row "absent by design: no lock, no unlock, no approve tool".
2. `get_offer` plus Need/Want labelling.
3. GA-debugger flash on trail and demand rows, plus a visible tool-call counter.
4. Product photos plus the gutter fix.

## Article adoption

Already embodied: harness enforcement, model stages / person applies, server-issued IDs (`signalId`),
caps on resulting state (duration rules, seek clamp), presentation as tools (`seek_preview`,
`deliverExport`), snapshot-style adversarial tests. Adopt now (cheap): a `next` step on every
rejection, an instruction in `human-approval-required`, fenced untrusted content, see / correct /
delete for the wardrobe with a retention sentence. Roadmap: typed preference memory, aggregation
before disclosure as the privacy-side "cap on resulting state".

## Decisions still with Marco

- Terms: rename the fictional brands, or keep them and mark "(demo brand)" on first use per surface (judge prefers marking; tool identifiers stay either way).
- Which demo-grade items to add before the deadline: preferences card, occasion field, sub-profile switch, demand aggregation, placement selector, bought/passed feedback.

## Added 2026-09-02 (owner): opt-in and consent as the product mechanic

"The more you share, the more you gain, on both sides." Consent is not a checkbox in front of the
loop; it is the dial that sets how much the loop can do.

Shopper side (closet): a sharing level the person sets, stored only in the browser, shown on every
request before Approve, and revocable with the clear button.

| Level | What leaves the page | What the shopper gains |
|---|---|---|
| 0 Private | nothing | fit checks and gap finding stay local |
| 1 Basics (default) | category, size, need or want | offers in the right size |
| 2 Context | + occasion (season, gift, event), fit preference, who you are shopping for | offers timed and cut for the occasion |
| 3 Taste | + colour family, materials to avoid, price ceiling | creatives that match, no wasted offers |

Never shared at any level: name, account, email, wardrobe rows, purchase history, income. The
`DemandSignal` carries `consent: { level, fields[] }` so the merchant sees exactly what was granted,
and the approval button reads "Approve next request (level N)".

Merchant side (studio): the reciprocal. The more offer facts the merchant locks (prices, code,
dates, disclaimer, sizes in stock, purchase link, placement formats), the more a shopping agent can
do with `get_offer`; the studio shows an offer completeness meter and which agent actions each
missing fact unlocks.

Both sides log every consent change and every request in the activity log. Roadmap: consent
receipts the shopper can export, and per-merchant levels.

## Wave 3 (2026-09-03, owner): the roadmap becomes the MVP

Owner's call: capture orders across brands (rivals included), record which offer a purchase came from as a
shopper attribute, and let the merchant auto-match a personal offer inside a pre-set margin. Right product,
right price, right time. The shopper only consents to send; the merchant only approves offers.

Shopper side (stays in the browser): a purchase log across merchants (seeded across four brands plus a rival),
imported from pasted receipts or order emails (local parser, no OCR), from catalog lookup, or automatically
when the shopper marks an offer Bought (which records the offer id). From that log a coarse buying pattern is
derived per category: discount sensitivity (code / percent / none), spend band, brand loyalty (loyal /
switcher). At level 3 the pattern travels with a request; the raw purchases never do.

Merchant side: locked offer rules (cost, margin floor, max discount) beside the offer facts. A pure matcher
turns an incoming request plus its shared context into a proposed personal offer within the floor, with the
validity window shaped by the occasion. The merchant's agent can propose (`propose_offer`), or auto-propose
can be switched on; a human approves before anything becomes visible. Approved offers travel back over the
bridge, addressed to the request id, never to a person; the shopper sees them in the closet and answers
Bought or Passed, which closes the loop and feeds the pattern.

## Shipped 2026-09-03 (wave 3)

- [x] Purchase log across every merchant, rivals included: `Purchase`, seeded across five brands (Northlight Apparel, Denim Supply Co., Ridgeline Outdoor, Overland Trading Co., and the rival Harborview Basics), stored only in the browser (`hemloop.purchases`)
- [x] Receipt / order-email import: pure local parser (`receipts.ts`, no OCR, no network), two recognised paste shapes, `import_receipt` tool, human textarea with two paste-ready samples
- [x] Buying pattern per category: `buyingPattern(purchases, category, brand?)` derives discount sensitivity (code / percent / none), spend band, and brand loyalty (loyal / switcher); pure, deterministic
- [x] `ConsentField` gained `buyingPattern`; `DemandSignal.pattern` carries the derived `BuyingPattern`, only at consent level 3; the raw purchases never leave the page
- [x] Merchant offer rules locked beside the offer facts: cost price 24, margin floor 35%, max discount 30%, all human-only, no WebMCP tool reads or writes them
- [x] `matchOffer`: pure matcher turning one request plus the locked rules into a `PersonalOffer` or a typed refusal; discount capped at 15 for `'none'` sensitivity, raised to the max for a `'switcher'`, trimmed in 5-point steps to hold the margin floor, validity shortened to 7 days for a gift or event occasion, category and in-stock size both enforced
- [x] `propose_offer` tool: stages a proposal for one incoming request; a human approves or declines in the studio; an Auto-propose toggle (human-only, default off) proposes one automatically for every new request
- [x] Approved offers travel over the bridge (`hemloop.offers`) addressed to the request id, never to a person; they appear in the closet's "Offers for your requests" with Bought / Passed
- [x] Bought records a purchase with the offer's id attached (attribution) and adds the garment to the wardrobe; `get_offer(requestId)` and `get_offers` hand the approved offer to a shopping agent or the shopper
- [x] 20 WebMCP tools total (9 closet, 11 studio), 101 unit tests
- [x] Landing, README, PRD, User Guide, Tech Guide, Use Cases, Writeup, Test Plan, Demo Script and Cue Sheet synced to wave 3

Roadmap items unchanged by this wave: receipt OCR, real order-email connectors, a browser extension surface, aggregation before disclosure (k-anonymity floor), the outcome written back into the merchant's own reporting, and the `ToolContract`/`ApprovalReceipt`/`PresentationEvent` seam described in `docs/integrations/commerce-agents/README.md`.

## Wave 4 (2026-09-03): right time, and stock the merchant can see

Two gaps left by wave 3. The closet knew what was missing but not what was worn out, and the
merchant's agent had no tool that could tell it which requests existed - `propose_offer` needed a
request id it could only get out of band.

- [x] Purchase-date lifecycle: `REPLACEMENT_MONTHS` per category (a calibration table, not a law) and
      `monthsBetween`; `findGaps` adds a `due` block when the oldest garment in an owned category is
      past its replacement life. The date is the garment's own `purchasedAt`, which the receipt
      importer and the Bought button now fill in from the purchase log, so anything bought later
      starts its own clock. An undated garment is never called worn out, and absence still outranks
      wear: one gap per category
- [x] `report_demand_gap` gained kind `replace` (level `need`), so the merchant can tell "never had
      one" from "wore it out" - timing that purchase history alone does not give them
- [x] The seed closet ships one genuinely worn-out item (the size 10 sneakers, bought 2024-11-05), or
      the lifecycle would be invisible in the demo
- [x] `demandInsight`: pure, tested, groups consented requests by category and size and scores each
      group against the locked stock (`can-offer`, `size-not-in-stock`, `category-mismatch`) using the
      same two predicates `matchOffer` refuses on, so the panel can never promise what the matcher
      declines. Replaces the untested aggregator that lived inside the studio component
- [x] `get_demand` tool: the merchant's agent can now discover request ids and read the same rows the
      merchant sees. Registered by `getRequests` alone, so it is available even where nothing can be
      staged
- [x] Fixed while building it: `matchOffer` checked `facts.sizesInStock` but reported
      `catalogProduct?.sizesInStock ?? facts.sizesInStock` on the offer it emitted, so it could
      propose a size the same offer then listed as out of stock. Both now read one resolved source
- [x] 21 WebMCP tools total (9 closet, 12 studio), 127 unit tests

Roadmap items unchanged by this wave: receipt OCR, real order-email connectors, a browser extension
surface, aggregation before disclosure (k-anonymity floor), the outcome written back into the
merchant's own reporting, and the `ToolContract`/`ApprovalReceipt`/`PresentationEvent` seam.
