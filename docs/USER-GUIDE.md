# Hemloop User Guide

For the person walking the demo. The technical companion is [TECH-GUIDE.md](./TECH-GUIDE.md).

## What Hemloop is

Four routes are the whole product (see the sitemap): **Loop** (`/`), **Closet** (`/closet`),
**Studio** (`/studio`), **Docs** (`/docs/`). `/merchant` redirects to `/studio?tab=demand` so old
links keep working; it is not in the header.

The home page is the **Loop Room**: both sides of one request in one shared space. Twenty-one
WebMCP tools (9 closet + 12 studio) register together on `/`. The Closet and Studio pages are the
full shopper and merchant surfaces, with tabs; open them from the header or from the Loop Room's
party boxes.

## The Loop Room (`/`)

Seven stations on the rail. Each card shows what to say to the agent (when it is an agent step),
which tools ran, what is true now, what updated, and what each side can see. Three coral human
gates sit on the page; no tool can press them.

| Station | Say this to the agent | Tool that ran | What updated | Shopper sees | Merchant sees |
|---|---|---|---|---|---|
| **New item** | Upload a sample receipt image in the chat (see below); the agent calls `import_receipt` with the text | `import_receipt` | A purchase row and a garment on this page | The receipt parsed here. Nothing was sent | Nothing. A purchase stays private |
| **Local demand** | `What should I buy next?` | `find_gaps` | Gaps from wardrobe rows and purchase dates | Gaps stay local until a request is approved | Nothing yet |
| **Approved request** | First: `Tell the store I need …`. After you press Approve: reply **`Yes, send it`** in the chat | `report_demand_gap` (refused, then one send, then refused again) | One packet on the bridge | Exact fields that would travel, before and after | One event: category, size, need or want. No shopper id |
| **Matched offer** | `What demand came in, and what can we fill? Then propose an offer inside our rules for the newest request.` | `get_demand`, `propose_offer` | Grouped demand and a staged proposal | Nothing until Approve offer | Demand scored against locked stock; proposal checked against the margin floor |
| **Bought** | `Any offers for me?` | `get_offers` | Outcome on the request; purchase with the offer id | Price, code, validity. Bought is yours alone | One request came back bought. Still no shopper id |
| **Learned** | (none; human act already done) | (derived from the attributed purchase) | Pattern before → after | The next offer is shaped by a sharper local pattern | An attributable sale |
| **Again** | Import the rival receipt (Harborview) the same way as New item | `import_receipt` on a new cycle | Cycle number advances; the rail resets | A new item starts the next loop | Nothing until a new request is approved |

### The three human gates

1. **Approve next request** — arms one `report_demand_gap`. After the press, the shopper replies
   **Yes, send it** in the chat; the agent waits for that reply. One press releases one event.
2. **Approve offer** — flips a staged proposal to `approved` so the shopper can see it.
3. **Bought** — records the outcome, logs the purchase with the offer id, adds the garment.

### Closet stack on the Loop Room

The room opens at **ten garments for Me**. A **+** control adds five random catalog garments, up to
twenty rows for that profile. Switch Me / Partner / Kid to scope the stack.

### Receipts

A receipt is imported by uploading one of the two sample images in `public/receipts/`
(`northlight-till-receipt.png`, `harborview-order-email.png`) in the ChatGPT chat. The agent reads
the image and calls `import_receipt` with the text. No OCR runs on the page.

## The Closet (`/closet`)

Shopper surface. Tabs: **Wardrobe** (profile switch, garments, preferences, purchases, receipt
import) and **Requests and offers** (sharing dial, payload preview, Approve next request, requests
sent, offers, activity log). Nine WebMCP tools. Wardrobe and purchases are shared with the Loop
Room in this browser (`hemloop.wardrobe`).

### Consent is the dial

| Level | What leaves the page | What you gain |
|---|---|---|
| 0 Private | nothing | fit checks and gap finding stay local |
| 1 Basics (default) | category, size, need or want | offers in the right size |
| 2 Context | + occasion, fit preference, who you are shopping for | offers timed and cut for the occasion |
| 3 Taste | + colour family, materials to avoid, price ceiling, buying pattern | creatives that match, no wasted offers |

Name, account, email, wardrobe rows, purchase history and income are never shared. At level 0 the
Approve button is disabled and `report_demand_gap` returns `sharing-disabled`.

## The Studio (`/studio`)

Merchant surface. Tabs: **Demand** (grouped requests and verdicts; this is what `/merchant` used to
be), **Offer and rules** (locked facts, completeness, offer rules, proposals), **Composition**
(brief, scenes, preview, placement, export). Twelve WebMCP tools. Campaign state is shared with the
Loop Room in this browser (`hemloop.campaign`), including whether facts are locked.

Human-only on this page: **Lock / Unlock offer facts**, placement (Story / Feed / Display),
**Approve** or **Decline** on a proposal, and the Auto-propose toggle. No WebMCP tool can do those.

## Enable WebMCP

- **Challenge-supported Chrome:** Chrome 149+ carries an origin-trial token for this domain. On an
  older build, enable `chrome://flags/#enable-webmcp-testing`, press **Relaunch**, reopen the URL.
- **ChatGPT desktop:** open `https://hemloop.app` inside ChatGPT's built-in browser (GPT-5.6
  Sol/Terra); tools are picked up automatically.

The header badge shows how many tools registered, or "preview mode" when the runtime is absent.
On `/` it counts all 21 once they are live.

## When the agent gets blocked

If the studio agent proposes copy like "50% off, guaranteed", the activity log shows the violation
and nothing changes on the canvas. Every rejection carries a `next` instruction so the agent can
correct itself.

## Exporting

Export produces a self-contained HyperFrames HTML file. The disclaimer is baked into every frame.
See "Rendering the export" in the tech guide.

## Limits worth knowing

- The demo catalog is synthetic apparel shaped like a Shopify store export. Northlight Apparel is
  fictional; wardrobe brand photos are real (see PHOTO-CREDITS).
- Date phrasing in copy ("ends Sunday") is not fact-checked; the locked disclaimer carries the dates.
- One shared campaign and one shared wardrobe per browser; a fresh profile or cleared storage restores
  the seeds.
