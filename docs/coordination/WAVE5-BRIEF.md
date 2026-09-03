# Wave 5: Loop Room fine-tune after Marco's first live run (2026-09-03)

Handoff-safe. Marco ran the merged Loop Room on hemloop.app in ChatGPT's browser (GPT-5.6 Sol, high)
and gave 13 notes. Claude triaged them into lanes below. Marco and Claude work the Claude lane one item
at a time; Codex and Cursor can start theirs now. Same rule as MERGE-PLAN.md: props in, JSX out for
Codex; state, contract, tools, copy, docs and deploy for Claude; assets and reskin for Cursor. Shared:
this file and CODEX-COORDINATION.md, append-only.

## Contract changes Claude will publish in `lib/proofframe/loop-room.ts` (Codex builds against these)

| field | type | what it is |
|---|---|---|
| `LoopRoomView.closet` | `{ id, category, brand, size, image?, isNew }[]` | the real wardrobe rows for the shopper stack, newest flagged |
| `LoopRoomView.lastRan` | `{ station: StationKey; tools: string[] } \| null` | the previous station's tool chips, kept visible until the next call lands |
| `StationCard.facts` | `{ label; value }[]` | what is true now (owned, last bought, sizes), rendered BEFORE `updated` (what is missing / changed) |
| `StationCard.eyebrow` | `string` | per-station headline kicker for the hero, replaces the static "One real action at a time" |
| `LoopRoomProps.onAddGarments` | `() => void` | the "+" on the closet stack; page adds 5 random garments, capped at 20 |

## Codex lane (presentation, `components/loop-room/*`, `app/globals.css`)

1. **Rail** (`loop-room-rail.tsx`): labels overflow at 1440 and below. Fold inactive stations to number
   plus short label, show the full label only on current and done; the connector line must sit behind
   the nodes and stop at the label edge, not strike through the text.
2. **Closet stack**: replace the two hard-coded photos and "+28" with `view.closet`; the newest row
   (`isNew`) animates in on import; a "+" control calls `onAddGarments` and hides at 20.
3. **Creative slot**: for stations `item` and `gap` the creative belongs on the SHOPPER side (the new
   garment lands in the closet); merchant side keeps composition and checkout only. Marco's screenshot 2
   shows the hoodie hero on the merchant column, which reads as if the merchant saw the purchase.
4. **Tool that ran**: render `view.lastRan` chips under the current card ("Ran at Gap: find_gaps") until
   the next call replaces them. Today the chips vanish the moment the station flips to done.
5. **Hero**: the h1 reads the current station (`eyebrow` + `title`) and highlights on change, instead
   of the same two lines on every step. Keep the "cycle N" kicker.
6. **Cycle counter**: on restart, "cycle 1 → 2" gets a +1 micro-animation (count up, brief pulse). Loop
   number already arrives in `view.loopNumber`.
7. **Station card order**: `facts` block first, then `updated`, then the gate.

## Cursor lane (assets, reskin, `/merchant`, `/closet`, `/studio`)

1. **Favicon**: `public/favicon.ico` (16/32/48) rendered from the same mark as `public/favicon.svg`;
   `app/layout.tsx` gets the `<link rel="icon" href="/favicon.ico" sizes="any">` line next to the svg.
2. **Receipt images for the demo**: two PNGs in `public/receipts/`, rendered from the two texts in
   `lib/proofframe/receipts.ts` `SAMPLE_RECEIPTS` (a till receipt and an order email), looking like a
   phone photo of a receipt and a screenshot of an email. The agent OCRs the image in chat and calls
   `import_receipt` with the text; `parseReceipt` stays text-only, no OCR on the page.
3. **Merchant page**: add the shared `SiteHeader` (active `merchant`) so the logo and nav match `/`.

## Claude lane (state, tools, copy, docs, deploy)

1. **Ten garments by default, +5 random, cap 20**: `seedWardrobe` to 10 with images from the catalog;
   `randomGarments(n, existing)` pure in `closet.ts`, drawn from the catalog so every row has a photo
   and a brand ("a variety of sources or added by the Hemloop layer"); wired to `onAddGarments`.
2. **Import puts the item in the closet**: match imported items to catalog products by title words and
   vendor, so the new garment carries the product photo into `view.closet`.
3. **Prompts people would actually type** on the gap station ("What should I buy next?", "What's worn
   out?", "Anything to replace before the season?"), and facts-first copy per station.
4. **Approval flow**: after the press, the station's "say this" becomes "Yes, send it" and the copy says
   the agent is waiting for that reply. Screenshot 5: the agent asked for confirmation in chat and never
   got it. The press stays on the page and human-only (see decision below).
5. **Latency**: tool descriptions total 4.2K chars across 21 tools and several results carry a `next`
   that invites another call; trim descriptions, drop follow-up nudges from ok results, return the
   station progress in the result so the agent does not re-read the page to report "1/7". Measure the
   tool side (sub-second locally) against the chat side, and write down what is ours and what is the
   harness.
6. Docs mirror, coordination log, gates, deploy.

## Decision: approval stays a press on the page, not a chat "yes"

Marco asked whether approval should move into the agent window ("yes, do it") and become a tool call.
It should not. The whole guarantee is that no tool can arm a share: a chat "yes" is text the agent
reads, and an injected instruction in a receipt or a product description could say "yes" for the
shopper. The page press is the one act that cannot come from the model. What was missing is the
handshake AFTER the press: the agent (screenshot 5) asks "confirm I send it now" and waits, and the page
said nothing about that. Fix is copy and state on the Claude side (item 4), plus the tool's own
refusal text pointing at the reply, not a new tool.

## Latency, what we know

- `import_receipt` and `find_gaps` execute in milliseconds on the page (measured via
  `document.modelContext.executeTool` on the local Worker).
- The 1m and 48s are the agent's turn: reading the page, the 21-tool manifest, deciding, asking for
  confirmation, calling, then re-reading the page to report progress. On Sol high, thinking dominates.
- Ours to shrink: manifest size, result verbosity, nudges that cause extra calls, and anything that
  makes the agent re-read the DOM. Not ours: model thinking time and the confirmation prompt ChatGPT
  adds before a non-read-only tool.

## Batch 2 (Marco, same day)

Naming is locked, no variants anywhere on the room: **Shopper · Closet** on the left, **Merchant ·
Demand** on the right. Codex:

1. The two party boxes have the same height and alignment; today the merchant box is taller.
2. One status vocabulary. On arrival nothing is "working" or "current": the card shows no state chip
   until a tool is actually running (`processing`), then "Processing", then "Done". Drop "Working now",
   "Now", "current" as words.
3. "+N" on the closet stack only when the closet holds more rows than the stack shows; never "+28"
   on a 10-row closet. Count comes from `view.closet.length`.
4. Family closet: `view.profiles = { active, options }` (self, partner, kid) with `onSelectProfile`;
   the stack, gaps and prompts scope to the active profile, the way a parent shops for the household.

## Batch 3 (Marco, same day): the other surfaces must read as the same product

A tester may land on `/closet` or `/studio` directly. Today they carry their own headers ("Private
shopper surface · Your Closet", "Agent-native campaign studio · Hemloop"), their own five-step rail and
their own seed, so they read as a different prototype.

- **Cursor**: `/closet`, `/studio`, `/merchant` use the shared `SiteHeader` (active section set) and the
  shared footer; drop the per-page `studio-header` lockups and the `surface-nav`. Keep each page's own
  panels and behaviour; only the chrome changes. Layout must not break at 1440 and 820.
- **Codex**: publish `components/site-footer.tsx` (presentational, no bridge access) and render it on the
  Loop Room, so every page ends the same way.
- **Claude**: one wardrobe for every page. Today `/` and `/closet` each seed their own in-memory
  wardrobe, so a garment added on one never shows on the other. `closet.ts` gets `readWardrobe` /
  `writeWardrobe` (same pattern as purchases, key `hemloop.wardrobe`); the Loop Room and the closet
  page both read it on mount and write on change. The ten-row seed is what a fresh browser sees on both.
