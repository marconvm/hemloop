# Handoff to Codex: wave 5, the Loop Room's presentation after Marco's first live run

Written 2026-09-03 by Claude at Marco's direction. Handoff-safe: assume zero chat context. Read
`WAVE5-BRIEF.md` in this directory first (Marco's notes, the lanes, the decision on approval), then
`MERGE-PLAN.md` for the architecture. Your lane is unchanged: `components/loop-room/*`,
`app/globals.css`, `components/site-header.tsx`, plus a new `components/site-footer.tsx`. Props in,
JSX out, no bridge access.

## Rule zero: your own worktree, your own branch

```sh
cd /Users/marco/projects/proofframe-webmcp-codex-room
git fetch origin
git checkout -b codex/loop-room-wave5 origin/main
npm install
```

`main` is at `6d93cc1` or later. Never `checkout` or `commit` inside `proofframe-webmcp` itself;
Claude merges from your branch and deploys.

## The contract is already on main

`lib/proofframe/loop-room.ts` (Claude's file, do not edit) now carries everything below, and
`components/loop-room-page.tsx` already fills it from real state. Your components ignore the new
fields today, so nothing you render is wrong, it is just missing:

| field | type | fill it from |
|---|---|---|
| `view.closet` | `ClosetRow[]` (`id, category, brand, size, image?, isNew`) newest first, real count | the shopper stack |
| `view.profiles` | `{ active, options: { key, label }[] }` | Me / Partner / Kid switch |
| `view.lastRan` | `{ station, tools[] } \| null` | the tool chips that must persist |
| `station.facts` | `{ label, value }[]` | the block ABOVE `updated` |
| `station.eyebrow` | `string` | the hero kicker per station |
| `props.onAddGarments` | `() => void`, absent when the closet is full (20) | the "+" on the stack |
| `props.onSelectProfile` | `(profile) => void` | the profile switch |

Claude added the two optional props to `LoopRoomProps` in `loop-room.tsx` (types only, no JSX) so
the page compiles; wire them however you like.

## Tasks, in the order Marco will look

1. **Rail** (`loop-room-rail.tsx`, css): labels overflow at 1440 and below. Inactive stations fold
   to number plus a short label; current and done show the full label. The connector line sits
   behind the nodes and stops at the label edge; today it strikes through the words.
2. **One status vocabulary**. On arrival nothing is "working" or "current". No state chip until a
   tool is running (`processing`, show "Processing"), then "Done" on done stations. Remove the words
   "Working now", "Now", "current", "Coming next" from the card and the rail.
3. **Locked names**: left party is **Shopper · Closet**, right party is **Merchant · Demand**. No
   "Private closet", "Demand desk", "Shopper side", "Merchant side" variants anywhere.
4. **Two party boxes**: same height and alignment; the merchant box is taller today.
5. **Closet stack**: `view.closet` replaces the two hard-coded photos and "+28". Show the first N
   rows with photos; "+K" only when `closet.length > N`. `isNew` rows animate in. A "+" control
   calls `onAddGarments` and is hidden when the prop is undefined (closet full). A profile switch
   from `view.profiles` calls `onSelectProfile`.
6. **Creative slot**: for stations `item` and `gap` the creative belongs on the SHOPPER side (the new
   garment lands in the closet, Marco's screenshot 2 showed it under the merchant). Merchant side
   keeps composition and checkout only. The page already decides which creative exists; you decide
   where `kind === 'product'` renders.
7. **Tool that ran**: render `view.lastRan` ("Ran at Local demand: find_gaps") under the current
   card until the next call replaces it. Today the chips vanish the moment a station flips to done.
8. **Station card order**: `facts` (what is true now) first, then `updated` (what changed), then
   the gate.
9. **Hero**: the h1 reads the current station's `eyebrow` and `title`, highlighting on change,
   instead of the same two lines on every step. Keep the "cycle N" kicker.
10. **Cycle counter**: on restart the kicker's number counts up with a +1 micro-animation (brief
    pulse). `view.loopNumber` already changes.
11. **Footer**: publish `components/site-footer.tsx` (presentational: brand mark, the four nav
    links, "demo data, real brands", nothing else) and render it at the end of `LoopRoom`. Cursor
    will put the same footer on `/closet`, `/studio`, `/merchant`.

## Gates before you push

```sh
npm test && npx tsc --noEmit -p tsconfig.json && npm run lint && npm run build
```

Push `codex/loop-room-wave5`, then append a short entry to `CODEX-COORDINATION.md` (what landed,
the commit, anything you needed outside your lane). Claude merges and deploys.
