# Sitemap and navigation: one page per side (2026-09-03)

Marco's question: the merchant has two pages (`/studio`, `/merchant`) and the shopper has one
(`/closet`). Either both sides get two, or the extra page folds into a tab. Decision: **one page
per side, tabs inside**. The four routes are the whole product; nothing else is linked.

## Routes

| route | name in nav | what it is | tools | tabs |
|---|---|---|---|---|
| `/` | **Loop** | The Loop Room: both sides in one shared space, the demo. | 21 | none |
| `/closet` | **Closet** | Shopper · Closet, the full shopper surface. | 9 | Wardrobe · Requests and offers |
| `/studio` | **Studio** | Merchant · Studio, the full merchant surface. | 12 | Demand · Offer and rules · Composition |
| `/docs/` | **Docs** | The five-section docs site. | 0 | its own sections |
| `/merchant` | (not in nav) | 307 to `/studio?tab=demand`, kept only so links already shared keep working. | | |

Header and footer are identical on all four (`SiteHeader`, `SiteFooter`); the header's four links are
the sitemap. No page carries a second nav, cross-link pill or "Home" link.

## Why fold, not split

- `/merchant` registers no tools; it is a read-only view of the same bridge rows the studio's
  demand panel already renders. Two merchant pages with the same data is the "splitting variance"
  Marco saw.
- Symmetry is the tell for a visitor: one page per party, both under the same header, both
  reachable from the Loop Room's two party boxes ("Open the closet", "Open the studio").
- Tabs keep each page's first screen short. The studio's first tab is Demand, because that is the
  half of the loop the merchant cannot get anywhere else; facts and composition come after.

## Tabs

`/studio`:
1. **Demand**: the merchant dashboard (demand groups with verdicts, consent levels seen, offers and
   their outcomes). This is `components/merchant-dashboard.tsx` moved in as a panel.
2. **Offer and rules**: locked facts, completeness meter, offer rules (cost, margin floor, max
   discount), proposals waiting for approval.
3. **Composition**: brief, scenes, preview, placement, export.

`/closet`:
1. **Wardrobe**: profile switch, garments, preferences, purchases, receipt import.
2. **Requests and offers**: sharing dial, payload preview, Approve next request, requests sent with
   outcomes, offers for your requests, activity log.

Tab state lives in the URL (`?tab=`) so a link can open a page on a tab; the WebMCP tools register
once per page regardless of tab, so an agent's call lands whichever tab is open, and the page
switches to the tab whose panel changed.

## Cross-links from the Loop Room

The shopper party box gets "Open the closet" (`/closet`), the merchant party box "Open the studio"
(`/studio`). Nothing else on `/` links out except the header.

## Owners

- **Cursor**: fold `/merchant` into the studio's Demand tab, tabs on both surfaces, `/merchant`
  redirect, drop Merchant from `SiteHeader` and the surface navs, the two party-box links on the
  Loop Room are a prop Codex exposes (`onOpenSide`) and Cursor does not touch `components/loop-room/*`.
- **Codex**: `SiteFooter`, the two party-box links.
- **Claude**: docs mirror (`docs/*.md`, `public/docs`) updated to the four routes, merge, deploy.
