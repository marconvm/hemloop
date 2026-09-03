# Hemloop, gap analysis (2026-09-02, 22 hours before submission)

Inputs: Marco's 14-point third-party read of the site, his product vision, Anthropic's
"The anatomy of effective commerce agents", and an independent judge-level review
(docs/coordination/judge-review-2026-09-02.md, which carries the per-item detail).

## What Hemloop is, in one breath

Two web pages register 17 WebMCP tools. The shopper's agent shops a private closet and can send
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
