# Handoff to Gemini (Antigravity CLI): wave 5 docs, tests and dead code

Written 2026-09-03 by Claude at Marco's direction. Handoff-safe: assume zero chat context. Four
agents work this repo now: Claude (brain: plans, reviews, merges, deploys), Codex (Loop Room
presentation), Cursor (surfaces, assets, sitemap), Gemini (this lane: docs, tests, dead code).
Read `WAVE5-BRIEF.md` and `SITEMAP.md` in this directory first. Everything you write must be
checked against the code, not remembered: every route, tool name, count and file path you put in a
doc must exist in the repo at the commit you are on.

## Rule zero: your own worktree, your own branch

```sh
cd ~/projects/proofframe-webmcp
git fetch origin
git worktree add ../hemloop-gemini -b gemini/docs origin/main
cd ../hemloop-gemini
npm install
```

Work only in `../hemloop-gemini`. Never `checkout` or `commit` inside `proofframe-webmcp` itself.
Your lane: `docs/*.md`, `public/docs/*` (the mirror), `README.md`, `tests/*.test.ts`, and the one
deletion below. Do not edit anything under `components/`, `lib/` or `app/` except that deletion.

## Task 1: docs say what the product now is

The product changed today and the docs still describe the old one. Update, in this order, keeping
each file's structure and voice (short sentences, no marketing):

1. `docs/USER-GUIDE.md`: the home page is the Loop Room (`/`), seven stations (New item, Local
   demand, Approved request, Matched offer, Bought, Learned, Again), each with "say this to the
   agent", the tool that ran, what updated, and what each side sees. Three human gates on the page:
   Approve next request, Approve offer, Bought. After pressing Approve next request the shopper
   replies "Yes, send it" in the chat; the agent waits for that reply. The closet opens at ten
   garments for Me, with a + control that adds five random ones up to twenty. A receipt is imported
   by uploading one of the two sample images in `public/receipts/` in the chat; the agent reads it
   and calls `import_receipt` with the text. Routes per `SITEMAP.md`: `/`, `/closet`, `/studio`,
   `/docs/`; `/merchant` redirects to the studio's Demand tab once Cursor lands it (write it as the
   sitemap says, and note the redirect).
2. `docs/05-quick-start.md`: the quick start walks the Loop Room, not the two separate pages. Keep
   the Chrome flag and ChatGPT browser paragraphs as they are.
3. `docs/02-the-loop.md`: the loop now starts at a purchase (New item) and ends with Again; align
   the step list with the seven stations.
4. `README.md`: routes table and the tool count line. The surface is 21 tools (9 closet, 12 studio),
   registered together on `/`. Test count is whatever `npm test` prints on your branch.
5. `docs/DEMO-SCRIPT.md` prompt sheet: replace "Find the gaps in my closet" with "What should I buy
   next?", add the "Yes, send it" reply after the press, and the receipt image upload as the first
   move.

Then mirror: `public/docs/<name>.md` must be byte-identical to `docs/<name>.md` for every file
that exists in both. Copy, do not re-edit.

## Task 2: tests for what landed today without one

Add to `tests/closet.test.ts`, using the `installFakeWindow()` helper already in that file:

- `readWardrobe` returns the seed when nothing is stored, returns what `writeWardrobe` stored, drops
  rows whose `category` is not a `GarmentCategory`, and returns the seed on corrupt JSON.
- `randomGarments` with a fixed `rand` is deterministic (same ids and rows twice).

Add to `tests/proofframe.test.ts`: every tool description is at most 320 characters (the manifest
was trimmed today so an agent reads less per turn; this stops it growing back).

## Task 3: delete the dead landing page

`components/landing.tsx` is no longer routed (`app/page.tsx` renders the Loop Room). Delete it. Its
tool table (the 21 rows with surface, tool, kind, what, guarantee) must not be lost: move those rows
into `docs/04-webmcp-overview.md` as a markdown table if that file does not already list every
tool with its guarantee, then mirror. Confirm with `grep -rn "landing" app components` that nothing
imports it.

## Gates before you push

```sh
npm test && npx tsc --noEmit -p tsconfig.json && npm run lint && npm run build
```

Push `gemini/docs`, then append a short entry to `CODEX-COORDINATION.md` (what landed, the commit,
the test count). Claude reviews, merges and deploys. If a fact you need is not in the code, ask in
your terminal rather than guessing; a wrong route or tool name in the docs is worse than a gap.
