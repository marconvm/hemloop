# Hemloop User Guide

For the person walking the demo. The technical companion is [TECH-GUIDE.md](./TECH-GUIDE.md).

## What Hemloop is

Four routes are the whole product (see the sitemap): **Hemloop** (`/`), **Closet** (`/closet`),
**Studio** (`/studio`), **Docs** (`/docs/`). `/merchant` redirects to `/studio?tab=demand` so old
links keep working; it is not in the header.

The home page is **Hemloop**: both sides of one request in one shared space. Twenty-one
WebMCP tools (9 closet + 12 studio) register together on `/`. The Closet and Studio pages are the
full shopper and merchant surfaces, with tabs; open them from the header or from Hemloop's
party boxes.

## Hemloop (`/`)

Seven stations on the rail. Each card shows what to say to the agent (when it is an agent step),
which tools ran, what is true now, what updated, and what each side can see. Three coral human
gates sit on the page; no tool can press them.

| Station | Say this to the agent | Tool that ran | What updated | Shopper sees | Merchant sees |
|---|---|---|---|---|---|
| **New item** | Upload a sample receipt image in the chat (see below); the agent calls `import_receipt` with the text | `import_receipt` | A purchase row and a garment on this page | The receipt parsed here. Nothing was sent | Nothing. A purchase stays private |
| **Local demand** | `Use Hemloop's find_gaps site tool now, then tell me: What should I buy next?` | `find_gaps` | Gaps from wardrobe rows and purchase dates | Gaps stay local until a request is approved | Nothing yet |
| **Approved request** | First: `Use Hemloop's report_demand_gap site tool now. Tell the store I need hoodie, size M`. After you press Approve: reply **`Yes, send it now with Hemloop's report_demand_gap site tool. Tell the store I need hoodie, size M`** in the chat | `report_demand_gap` (refused, then one send, then refused again) | One packet on the bridge | Exact fields that would travel, before and after | One event: category, size, need or want. No shopper id |
| **Matched offer** | `Use Hemloop's get_demand and propose_offer site tools now. Which store can fill this, and what can it offer inside its rules?` | `get_demand`, `propose_offer` | Grouped demand and a staged proposal | Nothing until Approve offer | Demand scored against locked stock; proposal checked against the margin floor |
| **Bought** | `Use Hemloop's get_offers site tool now. Are there any offers for me?` | `get_offers` | Outcome on the request; purchase with the offer id | Price, code, validity. Bought is yours alone | One request came back bought. Still no shopper id |
| **Learned** | (none; human act already done) | (derived from the attributed purchase) | Pattern before → after | The next offer is shaped by a sharper local pattern | An attributable sale |
| **Again** | Import the rival receipt (Harborview) the same way as New item | `import_receipt` on a new cycle | Cycle number advances; the rail resets | A new item starts the next loop | Nothing until a new request is approved |

### The three human gates

1. **Approve next request** — arms one `report_demand_gap`. After the press, the shopper replies
   **Yes, send it** in the chat; the agent waits for that reply. One press releases one event.
2. **Approve offer** — flips a staged proposal to `approved` so the shopper can see it.
3. **Bought** — records the outcome, logs the purchase with the offer id, adds the garment.

### Closet stack on Hemloop

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

Merchant surface. Tabs: **Demand** (grouped requests, a merchant switcher, and the market scan
verdict per store for each incoming request; this is what `/merchant` used to be), **Offer and
rules** (locked facts, completeness, offer rules, proposals), **Composition** (brief, scenes,
preview, placement, export). Twelve WebMCP tools. Campaign state is shared with Hemloop in
this browser per merchant (`hemloop.campaigns` + `hemloop.merchant`), including whether facts are
locked. A request is scanned against every merchant's rules; only a `can-offer` store answers.
Market rows show verdict and price only — never another merchant's cost or floor.

Human-only on this page: **Lock / Unlock offer facts**, placement (Story / Feed / Display),
**Approve** or **Decline** on a proposal, and the Auto-propose toggle. No WebMCP tool can do those.

## How to run the demo

**Host:** `https://hemloop.app`. The app deploys to Cloudflare Workers (wrangler) or Vercel and
runs the same way on either.

**Supported browsers:**

- **ChatGPT’s desktop-app built-in browser** — open a supported host inside ChatGPT
  (GPT-5.6 Sol/Terra); tools are picked up automatically.
- **Chrome** — enable `chrome://flags/#enable-webmcp-testing`, press **Relaunch**, reopen
  the host. Chrome 149+ may already carry an origin-trial token for these hosts.

The header badge shows how many tools registered (**live**), or amber **preview** when the
runtime is absent. The **iOS in-app browser** shows the page with tools in preview.

On `/` the count is all 21 once they are live. No account; state is `localStorage` in this
browser (incognito is a clean install). Walk the stations in the table above, or follow the
numbered path in the [README](../README.md#how-to-run-the-demo).

## Enable WebMCP

Same hosts and browsers as [How to run the demo](#how-to-run-the-demo). If tools stay in
preview on desktop Chrome after enabling the flag, confirm you relaunched and reopened the
URL (not a stale tab).

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
- One shared wardrobe per browser, and one campaign per merchant (`hemloop.campaigns`); a fresh
  profile or cleared storage restores the seeds. The active merchant id lives in `hemloop.merchant`.
  Legacy `hemloop.campaign` migrates into Northlight on first read.
