# Handoff to Cursor: reskin the closet and studio surfaces on the Loop Room design system

Written 2026-09-03 by Claude at Marco's direction. Handoff-safe: assume zero chat context. Three
agents now work this repo: Claude (`webmcp-hemloop-06`, cmux surface:84), Codex (`webmcp-help`,
surface:19) and Cursor (surface:61). Read `MERGE-PLAN.md` in this directory first; it is the
architecture and the reason for everything below.

## Rule zero: your own worktree

Codex and Claude collided today by running two terminals in ONE working directory: a `git checkout`
in one switched the other, and commits landed on the wrong branch. Do not repeat it.

```sh
cd /Users/marco/projects/proofframe-webmcp
git fetch origin
git worktree add ../hemloop-cursor -b cursor/reskin origin/main
cd ../hemloop-cursor
npm install
```

Work only in `../hemloop-cursor`. Never `checkout` or `commit` inside `proofframe-webmcp` itself.

## Your lane

Reskin the two full surfaces so they belong to the same product as the Loop Room:

- `components/closet-studio.tsx` (the shopper surface, `/closet`)
- `components/proofframe-studio.tsx` (the merchant surface, `/studio`)

using the design tokens Codex is installing in `app/globals.css`:

```
--ink #17211c   --forest #183e30   --moss #346b45   --loop #b9f227 (lime accent)
--cream #f4f0e6 --paper #fbfaf5    --white #ffffff  --coral #ee6f4d (human-action buttons)
--muted #687169 --line rgba(23,33,28,.13)   --radius .9rem
display: Manrope, tight tracking (-.05em on headings)   body: DM Sans
```

The look to match: white cards on cream paper, pill buttons (`border-radius: 999px`), ink primary
buttons, **coral for every human-only act** (Approve next request, Approve offer, Bought, Lock
facts), lime for "live" and for done states, generous radius, soft shadow
`0 12px 30px rgba(23,33,28,.17)`. Reference: `/Users/marco/projects/hemloop-loop-site/app/globals.css`
and the live docs site at https://hemloop.app/docs/ which already wears these tokens.

## Where your styles go

**Do not edit `app/globals.css`.** Codex owns it and is mid-edit. Put your styles in two new files
and import them from the components:

- `app/closet.css` imported by `components/closet-studio.tsx`
- `app/studio.css` imported by `components/proofframe-studio.tsx`

Consume the tokens via `var(--ink)` etc. Never redefine them. The existing rules for these surfaces
currently live in `globals.css` under class names like `.studio-grid`, `.closet-grid`,
`.garment-card`, `.gap-card`, `.aggregate-row`, `.demand-item`, `.outcome-button`, `.truth-panel`,
`.preview-*`; you may override them from your files by specificity, and once both surfaces render
correctly from your files, note in `CODEX-COORDINATION.md` which `globals.css` blocks are now dead
so Codex can delete them in its lane.

## What must not change

This is presentation only. Every one of these is a guarantee, not a style:

- Every button that exists today still exists, does the same thing, and is still human-only where
  it is human-only. No new button may call a tool. No tool may gain a way to press a button.
- The three-column closet layout keeps the wardrobe in the widest column, and garment cards keep the
  thumbnail in column one with everything else in column two (a bug fixed today; do not reintroduce
  it by rewriting `.garment-card`'s grid).
- The surface nav (`.surface-nav`) stays on both pages; restyle it, do not remove it. The five-step
  loop rail is gone — loop lives on Loop Room; header Loop link is the way back. Codex is building
  a `site-header.tsx` that will replace the per-page header; leave the header markup alone so that
  swap is clean.
- `lib/proofframe/*`, `tests/*`, `app/globals.css`, `public/docs/*`, `docs/*.md`: not yours.

## Gate before every commit

```sh
npm test                     # 138+ passing, 0 failing
npx tsc --noEmit             # silent
./node_modules/.bin/oxlint   # silent, exit 0
npm run build                # ends "Build complete."
```

Do not deploy. Claude deploys from `main` after merging. Push your branch and say so in
`CODEX-COORDINATION.md` (append a dated entry; it is the shared log for all three agents).

## Verify it visually, not by reading

Run `npm run dev` inside your worktree and look at `/closet` and `/studio` in a browser at a
desktop width and at 820px. Two things a reader cannot catch from the source: a brand name wrapping
into three lines in a card, and a value sitting flush against a panel edge. Measure with
`getBoundingClientRect` before calling either fixed.

## Done looks like

Both surfaces read as the same product as the docs site and the Loop Room, every control still
works, gates green, branch pushed, one entry in the coordination log naming the dead `globals.css`
blocks.
