# Handoff to Codex: wave 6, the Loop Room in the ChatGPT in-app browser, and a replay of wave 5

Written 2026-09-03 by Claude at Marco's direction. Codex's quota is reset; use it. Handoff-safe:
assume zero chat context. Read `WAVE5-BRIEF.md`, `SITEMAP.md` and the tail of
`CODEX-COORDINATION.md` first. `main` is at `68211d1` or later; every wave 5 branch is merged and
live on hemloop.app.

## Rule zero

```sh
cd /Users/marco/projects/proofframe-webmcp-codex-room
git fetch origin
git checkout -b codex/wave6 origin/main
npm install
```

Never `checkout` or `commit` inside `proofframe-webmcp` itself. Cursor is on `cursor/docs`
(docs, tests, deleting `components/landing.tsx`); do not touch `docs/*`, `public/docs/*` or
`tests/*` except for tests you add for your own fixes.

## Part A: the room at phone width (your lane: `components/loop-room/*`, `app/globals.css`)

Marco runs the demo in ChatGPT's in-app browser. Every screenshot he sent today was a narrow
viewport, roughly 390 to 430 px wide, with the chat beside it. The room was verified at 1440 only.

1. Make `/` work at 390, 430 and 820 as well as 1440. At phone width the three columns become one:
   station card first (the "say this" prompt is what the tester needs on screen), then the shopper
   box, then the merchant box; the rail scrolls horizontally or folds to the current step with a
   step counter; the hero drops to one line plus the eyebrow; the party boxes keep equal height
   rules only when side by side.
2. The "Say this to the agent" block: the receipt prompt is six lines and pushes everything down.
   Show the first line with the copy button and a "show all" toggle; the copy button always copies
   the full text.
3. Touch targets at least 44 px for the copy button, the three human gates, the profile switch and
   Add five.
4. No horizontal scroll on the body at any of the four widths. Verify with
   `document.documentElement.scrollWidth <= window.innerWidth` and `getBoundingClientRect` on the
   rail, the station card and both party boxes, at each width, and put the numbers in your log
   entry.

## Part B: replay of wave 5 (findings first, then fixes in your lane only)

The same discipline as your round 3 review: replay against the code with hostile fixtures, write
what you find to `docs/coordination/judge-review-3-2026-09-03.md` (verdict, evidence, size), and fix
only what is inside your lane. Anything in `lib/*` or `components/loop-room-page.tsx` you report
with the exact line and the fix you would make; Claude applies it.

1. **Stored campaign is a client-integrity boundary** (`lib/proofframe/seed.ts` `readCampaign`).
   Storage is same-origin writable. Can a stored record present `factsLocked: true` with facts an
   agent could never have locked? Can a stored scene carry a `style` or a key the exporter would
   pass through? Compare with what `toSignal` / `toOffer` do in `signal-bridge.ts` (bounded
   strings, enums enforced, extra keys dropped) and say whether `readCampaign` meets that bar.
2. **Stored wardrobe** (`lib/proofframe/closet.ts` `readWardrobe`): rows are filtered by `id` and
   `category` only. Can a stored row with an 80-char brand, a long `image` path or a hostile
   `retailer` reach `get_wardrobe`'s output budget or the closet stack's `<img src>`? `get_wardrobe`
   truncates; the stack does not.
3. **Loop Room wiring** (`components/loop-room-page.tsx`): the restart rule (`closedRef` plus an ok
   `import_receipt`), the `since(loopStartedAt)` scoping, and the three human gates. Is there a
   sequence of real tool calls, in any order, that marks a station done without the row that is
   supposed to prove it? Is there a way a tool call presses a gate?
4. **The manifest**: 21 descriptions were trimmed to 3116 chars. Check every description still
   states the guarantee an agent must know (human-only gates, what never travels, read-only), and
   that no `next` on an ok result invites a call the agent does not need.
5. **`hemloop.campaign` and `hemloop.wardrobe` on `/closet` and `/studio`**: both pages hydrate
   after mount. Is there a render where a tool call lands between first paint and hydration and
   writes to the seed instead of the stored state, so the write is then overwritten?

## Gates before you push

```sh
npm test && npx tsc --noEmit -p tsconfig.json && npm run lint && npm run build
```

Push `codex/wave6` and append your entry to `CODEX-COORDINATION.md` with the width numbers and a
pointer to the review file. Claude merges, applies the out-of-lane fixes, and deploys.
