# Handoff to Cursor: wave 5, assets and the other surfaces

Written 2026-09-03 by Claude at Marco's direction. Handoff-safe: assume zero chat context. Read
`WAVE5-BRIEF.md` in this directory first (Marco's notes and the lanes). Your lane: assets under
`public/`, `app/layout.tsx` for the favicon line only, and the chrome of `/closet`, `/studio`,
`/merchant` (`components/closet-studio.tsx`, `proofframe-studio.tsx`, `merchant-dashboard.tsx`,
their css files). Behaviour of those pages does not change; only what wraps them.

## Rule zero: your own worktree, your own branch

```sh
cd ~/projects/hemloop-cursor
git fetch origin
git checkout -b cursor/wave5 origin/main
npm install
```

`main` is at `6d93cc1` or later. Never `checkout` or `commit` inside `proofframe-webmcp` itself.

## Tasks

1. **Favicon**: `public/favicon.ico` (16, 32, 48) rendered from the same mark as
   `public/favicon.svg`. In `app/layout.tsx` add
   `<link rel="icon" href="/favicon.ico" sizes="any" />` next to the existing svg link. Touch
   nothing else in that file.
2. **Two demo receipt images** in `public/receipts/`: `northlight-till-receipt.png` and
   `harborview-order-email.png`, rendered from the two texts in `lib/proofframe/receipts.ts`
   (`SAMPLE_RECEIPTS`). The first should look like a phone photo of a till receipt, the second like
   a screenshot of an order-confirmation email. Every line of the text must be legible: the demo
   flow is that the tester uploads the image in the ChatGPT chat, the agent reads it and calls
   `import_receipt` with the text. No OCR on the page. Add a "Download sample receipt" link for
   each under the import textarea on `/closet`.
3. **Same header on every surface**: `/closet`, `/studio` and `/merchant` render the shared
   `components/site-header.tsx` (`active` set to `closet`, `studio`, `merchant`) instead of their
   own `studio-header` lockups and `surface-nav`. Pass the page's WebMCP status badge as `status`
   and any cross-link as `actions`. Layout must hold at 1440 and 820; verify with
   `getBoundingClientRect` the way you did for the reskin.
4. **Same footer**: Codex is publishing `components/site-footer.tsx` on branch
   `codex/loop-room-wave5`; render it at the end of the three pages once it lands on main. If it
   is not there yet when you finish 1 to 3, push without it and note it in the log.
5. **Wardrobe count copy**: the closet's activity log no longer says "8 garments"; the stored
   wardrobe is shared with the Loop Room and opens at ten rows for Me. If any copy on `/closet` or
   the docs still says eight, fix it.

## Gates before you push

```sh
npm test && npx tsc --noEmit -p tsconfig.json && npm run lint && npm run build
```

Push `cursor/wave5`, then append a short entry to `CODEX-COORDINATION.md` (what landed, the
commit). Claude merges and deploys.
