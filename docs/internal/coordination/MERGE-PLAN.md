# Merge plan: Codex's Loop Room design on Hemloop's real tool surface

Written 2026-09-03 by Claude at Marco's direction. Marco's decision, in his words: ignore the
deadline, do the right thing, deploy to hemloop.app. "Merge our pros together."

## What Marco asked for

1. Not ads-match. That framing stays front and centre.
2. Codex's design system, layout, icons, colour, creative style.
3. The loop starts **earlier**: a purchase → the product drops into the closet → then the gap.
4. Every step is **triggered by the agent in the ChatGPT in-app browser**: keyword → real WebMCP
   call → page shows what processed, which tool ran, what attribute/event updated → then the
   creative (image / video / checkout link).
5. The loop **closes** showing what the customer gained and what the merchant gained, then
   **restarts** with a new item, so the loop is visibly the point.
6. Page full of the keywords that trigger the tools, and what each side received in between.
7. Persistent logo top-left and navigation across every page.
8. Keep Hemloop's depth: income / spend band, promotion reaction (buying pattern), family
   profiles, receipt import, offer rules, claim validation. The prototype skipped these.
9. Docs restructured: What is Hemloop · The loop and its outcome · The problem in the real world ·
   Hemloop WebMCP overview · Quick start and implementation · use-case tabs with images. Remove
   the internal record, the threat model page, and personal md links.

## Architecture: one state, three views

The bridge (`localStorage` + storage events) already carries signals, offers, outcomes, purchases,
consent. Every view reads and writes the same bridge, so nothing is mocked:

| route | what it is | tools registered |
|---|---|---|
| `/` | **The Loop Room.** Codex's single shared space: closet left, packet through the centre, merchant right, rail, activity, human gates. Wired to the REAL callbacks. | all 21 (9 closet + 12 studio), names already unique |
| `/closet` | the full shopper surface: wardrobe, profiles, preferences, purchases, receipt import, offers | 9 |
| `/studio` | the full merchant surface: locked facts, offer rules, composition, demand insight, proposals | 12 |
| `/docs` | restructured per item 9 | none |

Registering both tool sets on `/` keeps every boundary intact, because the boundaries live in the
callbacks, not the page: `report_demand_gap` can still only emit the `DemandSignal` shape, and no
studio tool has a callback that reaches the wardrobe.

## The loop on `/`, step by step

| step | rail | keyword the page shows | real tool | page shows | creative |
|---|---|---|---|---|---|
| 0 | New item | "Import this receipt" (sample provided) | `import_receipt` | product drops into the closet, purchase row appears, pattern recomputes | product photo |
| 1 | Gap | "Find the gap in my closet" | `find_gaps` | three rows incl. the `due` one | — |
| 2 | Approved request | "Tell the store I need a hoodie in size M" | `report_demand_gap` ×3 | refused → **human Approve** → exact packet → refused again | packet card |
| 3 | Matched offer | "What demand came in, and what can we fill?" then "Propose an offer inside our rules" | `get_demand`, `propose_offer` | grouped demand + verdict; proposal with margin check and reasons; **human Approve** | composition preview, product hero |
| 4 | Bought | "Any offers for me?" | `get_offers` | offer addressed to the request; **human Bought** | checkout link (`purchaseUrl`) |
| 5 | Learned | — | — | **customer gained:** right item, right price, nothing about her left. **merchant gained:** attributable sale, sharper demand picture. Pattern before/after. | — |
| ↺ | Again | "Import this receipt" (second sample, a rival's) | `import_receipt` | loop restarts with a sharper pattern; show the offer change | — |

Every step card carries four slots: **say this** · **tool that ran** · **what updated** · **what each
side sees**. Nothing advances without the real call landing on the bridge.

## Lanes

| owner | files | job |
|---|---|---|
| **Codex** | `app/globals.css` (theme tokens, fonts), `components/site-header.tsx`, `components/loop-room/*` (presentational: rail, stage card, packet-in-transit, gate button, outcome panel, tool manifest dialog) | look, layout, motion. Port the Loop Room's design system in. Props in, JSX out, no bridge access. |
| **Claude** | `lib/proofframe/*`, `app/page.tsx` (composition of Codex's components over real state), `components/closet-studio.tsx` and `proofframe-studio.tsx` (wiring + reskin hooks only), `public/docs/*`, `docs/*`, `tests/*` | state, tools, bridge, docs, gates, deploy |
| **shared** | `docs/internal/coordination/*` | append-only log |

Codex works on branch `codex/loop-room-design`; Claude merges into `main` and deploys. Small
commits, pull often. If either needs a file in the other's lane, say so in
`CODEX-COORDINATION.md` first.

## Order of work

1. Codex: tokens + fonts + `site-header` first, so every page gets the logo and nav immediately.
2. Claude, in parallel: docs restructure (no dependency on Codex).
3. Codex: `loop-room/*` presentational components against a props contract Claude publishes in
   `lib/proofframe/loop-room.ts` (the step model, what each slot receives).
4. Claude: wire `/` to real callbacks, register 21 tools, outcome and restart.
5. Both: reskin `/closet` and `/studio` with the tokens; Claude keeps their behaviour unchanged.
6. Gates, deploy, live smoke with the real runtime, on every merge.

## What must not regress

136 tests, the surface-wide tool contract, the output budgets, the fences, every human gate
human-only, the docs mirror byte-identical. The design changes; the guarantees do not.
