# Hemloop, gap analysis (2026-09-02, 22 hours before submission)

Inputs: Marco's 14-point third-party read of the site, his product vision, Anthropic's
"The anatomy of effective commerce agents", and an independent judge-level review
(docs/coordination/judge-review-2026-09-02.md, which carries the per-item detail).

## What Hemloop is, in one breath

Two web pages register 15 WebMCP tools. The shopper's agent shops a private closet and can send
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
