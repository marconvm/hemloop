# Hemloop and WebMCP

Both surfaces need tools that operate on **live page state in the user's own session**: the
wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in
the page itself, so there is no backend, no OAuth, no credential grant, and the human watches every
agent action land in the UI they are already looking at.

It also lets the trust boundaries be **structural rather than conventional**. The closet's only
outbound tool physically cannot include wardrobe rows or an identifier: it can emit one shape. The
studio has no tool that can touch locked facts. An agent cannot do those things because the tools
do not exist, not because it was asked nicely.

## The 21 tools

All 21 register together on the Loop Room (`/`). `/closet` registers the nine Closet tools;
`/studio` registers the twelve Studio tools. The table below is the canonical tool list (moved
here from the retired landing page).

| Surface | Tool | Kind | What it does | Structural guarantee |
|---|---|---|---|---|
| Closet | `get_wardrobe` | read | Returns the garment rows on the page | `readOnlyHint`, `untrustedContentHint`, never returns a shopper id |
| Closet | `get_my_sizes` | read | Sizes owned, optionally by brand | `readOnlyHint` |
| Closet | `find_gaps` | read | Categories missing or thin, plus categories whose oldest garment is past its replacement life | `readOnlyHint`; a due row carries the date, months elapsed and size, never a merchant, price or purchase row |
| Closet | `check_fit` | read | Size advice for a catalog item from what is owned | `readOnlyHint`, reads the public catalog only |
| Closet | `get_preferences` | read | Fit, colour family, materials to avoid, price ceiling, liked brands | `readOnlyHint`, `closet_data` fence, a field travels only if the sharing level allows it |
| Closet | `add_garment` | write | Adds one garment to the local wardrobe | Enum-validated category, bounded strings, never leaves the page |
| Closet | `report_demand_gap` | write | The only tool that can send anything to a merchant | Rejects with `human-approval-required` until the person arms one share, consumes it after one event, can emit only the no-identifier `DemandSignal` shape, returns the exact payload sent |
| Closet | `import_receipt` | write | Parses a pasted receipt or order email into purchases and garments | Bounded text, parsed locally, never echoed back; nothing leaves the page |
| Closet | `get_offers` | read | Approved personal offers addressed to this closet's own requests | `readOnlyHint`, `storefront_data` fence, the shopper decides Bought or Passed on the page |
| Studio | `get_campaign_state` | read | Facts, scenes, timing | `readOnlyHint` |
| Studio | `get_demand` | read | Consented demand grouped by category and size, with request ids and, per group, whether the locked offer can answer it | `readOnlyHint`, `untrustedContentHint`; the verdict uses the same predicates the matcher refuses on |
| Studio | `validate_claims` | read | Dry run of the claim validator | Never mutates |
| Studio | `export_composition` | read | Hands finished HTML to the page for download | Refuses while any violation stands |
| Studio | `get_offer` | read | Returns the locked offer as structured data for a shopping agent: product, prices, code, dates, disclaimer, purchase link; pass `requestId` to read one approved personal offer instead | `readOnlyHint`; returns the facts with whether a human has locked them, so an agent can tell a locked offer from a draft |
| Studio | `set_brief` | write | Sets the creative brief | Brief is never rendered copy, so it cannot become a claim |
| Studio | `add_scene` / `update_scene` | write | Writes rendered copy | Claim-validated before the state changes, rejected atomically |
| Studio | `reorder_scenes` | write | Reorders the timeline | Permutation-checked |
| Studio | `seek_preview` | write | Moves the preview playhead | Clamped to length |
| Studio | `import_product` | write | Pulls a product into the facts | `untrustedContentHint`, blocked while facts are locked |
| Studio | `propose_offer` | write | Proposes a personal offer for one request inside the locked rules | Staged; a human approves before the shopper can see it; margin floor enforced in code |
| **Both** | **(absent by design)** | none | There is no `lock_facts`, `unlock_facts`, `approve_share`, `set_sharing_level` or `approve_offer` | Locking facts, releasing wardrobe data, the consent dial and approving an offer are human-only acts. **This row is the product.** |

## Consent is the dial

The shopper sets a sharing level, stored only in the browser, shown on every request before
Approve, and revocable with one button.

| Level | What leaves the page | What the shopper gains |
|---|---|---|
| 0 Private | nothing | fit checks and gap finding stay local |
| 1 Basics (default) | category, size, need or want | offers in the right size |
| 2 Context | + occasion, fit preference, who you are shopping for | offers timed and cut for the occasion |
| 3 Taste | + colour family, materials to avoid, price ceiling, **buying pattern** | offers shaped by how you actually buy |

Never shared at any level: name, account, email, wardrobe rows, purchase history, income. The
`DemandSignal` carries `consent: { level, fields[] }`, so the merchant sees exactly what was granted.

The merchant has the same dial in reverse: the more offer facts they lock (prices, code, dates,
disclaimer, sizes in stock, purchase link), the more a shopping agent can do with `get_offer`, and
the studio's completeness meter names what each missing fact unlocks.

![Demand grouped and scored against the stock the merchant locked](img/studio-demand-insight.jpg)

## What the spec and the vendor guides ask for, and what this does

| Guideline | Source | Hemloop |
|---|---|---|
| Namespace `document.modelContext`; tool names ASCII, ≤128 chars | spec | yes |
| Name ≤30, description ≤500, parameter description ≤150, output ≤1.5K chars | Chrome secure-tools | asserted for **every** tool on both surfaces by one test that loops the whole surface |
| `readOnlyHint` on readers; `untrustedContentHint` on user or external content | spec, Chrome | yes |
| `additionalProperties: false` on every schema | ChatGPT sample | yes, asserted by the same loop |
| Validate strictly in code, loosely in schema; errors an agent can self-correct from | Chrome | the validator, and every rejection carries `next` |
| Consequential actions need a human step | Chrome, ChatGPT | the two gates, human-only, no tool can arm either |
| A tool result must fit the output budget on the worst legitimate input | Chrome | results are bounded by measuring serialised size as rows are added, not by a fixed row count |
