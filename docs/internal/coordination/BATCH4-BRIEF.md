# Batch 4 (Marco, 2026-09-03 evening, commenting on production)

Brain: Claude. Codex is on `codex/wave6`, Cursor finishes `cursor/merchants-2` then takes
`cursor/batch4`. Same lanes as before.

## 1. The header status is alive and opens the tool manifest (Codex)

"21 WebMCP tools live" in the header gets a blinking green dot and terminal-style text (monospace,
lowercase, something like `● 21 webmcp tools live`). Clicking it opens the same tool-manifest
dialog the hero pill opens today, floating in the centre of the viewport (not anchored to the
hero). Export a `RuntimeStatus` component from `components/loop-room/` that takes
`{ live, toolCount, tools, absent }` and owns the dot, the label and the dialog; the page passes it
as `SiteHeader`'s `status`. The hero pill can stay or go; Marco only asked for the header. Preview
mode: amber dot, no blink.

## 2. "E-commerce", never "commerce" (Codex in the room, Cursor everywhere else)

Every user-facing string that says "commerce" says "E-commerce": the room's kicker ("A live
E-commerce loop"), the docs, the README, the surfaces, `BRAND.sub` if it carries the word, the
metadata title/description. Grep `-i commerce` across `components/`, `app/`, `lib/proofframe/brand.ts`,
`docs/`, `public/docs/`, `README.md`; "commerce-agents" in coordination notes and the
`commerce-agents-gap` filename stay (they name Anthropic's convention, not our product).

## 3. Receipt import that looks like a receipt (Cursor, `/closet`)

The import panel today is a textarea plus two "Paste sample" buttons and two bare download links.
Make it real: the two samples become cards, each with a thumbnail of its image from
`public/receipts/` (the till receipt as a receipt photo, the order email as an email preview with a
from/subject/date header, `.eml`-style), a "Use this sample" action that fills the textarea, and
the download as an icon on the card. Keep the textarea for a pasted receipt. The parser stays
text-only; nothing about `parseReceipt` changes.

## 4. Family closets with the right photos (Cursor)

Partner and Kid open with one and two garments; Marco wants each profile to open with a real
closet and the "+" to add five that belong to that profile. Kid rows show kids' merchandise, never
adult product photos.

- Seed: Partner and Kid each open at six to eight rows in `seedWardrobe`, with `for` set, with
  dates that keep the existing test expectations for `self` (hoodie gap, thin jacket, footwear
  due) untouched; add tests for the two new profile counts.
- Photos: add kids' product photos under `public/products/kids-*.jpg` (same sourcing as the
  existing photos; update `docs/PHOTO-CREDITS.md` and its mirror) and at least two partner-suited
  ones if the current set is too narrow.
- `randomGarments(count, wardrobe, profile)` draws from a profile-appropriate pool: the catalog for
  `self` and `partner`, a kids pool for `kid`. The simplest honest way is a `kidsCatalog` snapshot in
  `lib/proofframe/catalog-kids.json` shaped like `catalog.json` (title, vendor, image, sizes such as
  4, 6, 8, 10, 12), used only by `randomGarments` and the seed. Sizes for Kid are kids' sizes.
- The closet stack's `isNew` and the "+" already work per profile; only the pool changes.

## What must not change

21 tools, gates human-only, the docs mirror byte-identical, tests green (146 now), no new
dependency.
