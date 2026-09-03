# Hemloop User Guide

For the person running a campaign. The technical companion is [TECH-GUIDE.md](./TECH-GUIDE.md).

## What Hemloop is

Two surfaces of one loop.

**As a shopper** (`/closet`): your agent can read the wardrobe rows shown on the page to find gaps, check fit and read your stated preferences against a product catalog snapshot (this demo's connector is Shopify). Each row shows a thumbnail, and you can edit or delete any row inline, or press **Clear wardrobe and requests sent** to reset both. Wardrobe rows and the requests-sent list live in this browser only; nothing is stored on a server, and clearing removes both. Hemloop's merchant-facing bridge has a deliberately narrower schema: no shopper ID, stable hash or wardrobe rows, and how much of it travels is set by the **sharing level** you control (0 Private through 3 Taste; see "Consent is the dial" below). When something is missing, press **Approve next request (level N)**; one `report_demand_gap` call may then send exactly the fields your level allows. The approval is consumed immediately, and the requests-sent list shows the complete payload. A **Purchases across stores** panel holds what you bought from any merchant, rivals included, and an **Offers for your requests** panel holds what a merchant has approved back to you; see "Purchases, receipts and offers" below for both.

**As a merchant** (`/studio`): human-approved requests arrive in the studio's **Incoming requests** panel without a shopper identifier or wardrobe rows. Requests are grouped by category and size, with a count ("hoodie · M · 4 requests"), and each is labelled **Need** or **Want** so you can see which is a gap in someone's wardrobe and which is a stated preference. You answer one with a campaign: press **Unlock offer facts**, edit them, press **Answer this request** to pull the product in, then **Lock offer facts** before your agent produces. Rendered claims that contradict the locked facts are rejected before they apply. Placement (Story 9:16, Feed 4:5, Display 16:9) is a human-only choice above the canvas. The promo video below is one output of that workflow. Below the facts sit the **offer rules** (cost price, margin floor, max discount) and, on each incoming request, a **Propose offer** button your agent's `propose_offer` call can also trigger, plus an **Auto-propose** toggle; see "Personal offers" below.

### Consent is the dial

Before you approve anything, set the **sharing level**: a row of four buttons above the payload preview, 0 Private through 3 Taste. Raising it does not just widen the payload, it changes what you gain in return:

| Level | What leaves the page | What you gain |
|---|---|---|
| 0 Private | nothing | fit checks and gap finding stay local |
| 1 Basics (default) | category, size, need or want | offers in the right size |
| 2 Context | + occasion (season, gift, event), fit preference, who you are shopping for | offers timed and cut for the occasion |
| 3 Taste | + colour family, materials to avoid, price ceiling | creatives that match, no wasted offers |

Your name, account, email, wardrobe rows, purchase history and income are never shared, at any level. Under the level buttons sits a **payload preview**: the exact list of fields that would leave the page if you approved right now, so you see the boundary before you cross it, not after. At level 0, sharing is disabled outright, the Approve button is greyed out, and any agent call to `report_demand_gap` gets `sharing-disabled` back instead of a request to approve.

### Preferences, profiles and outcomes

A **Preferences** card on the closet page holds fit preference, colour family, materials to avoid, a price ceiling and liked brands; your agent reads it with `get_preferences`, and a field only travels with a request if your sharing level allows it (colour, materials and price ceiling need level 3 Taste). A **Shopping for** switch (Me / Partner / Kid) scopes the wardrobe grid and every closet tool to that profile, so a gift search for your partner never touches your own sizes. Once a request has been sent, its row grows **Bought** and **Passed** buttons; pressing one records the outcome in your browser and the studio sees it next to the same request.

### Purchases, receipts and offers

A **Purchases across stores** panel lists what you bought, from any merchant, rivals included; it seeds a small history across five brands so the log works across stores, not just one. Each row shows the merchant, size, price, any promo code, and how the row entered the log (a pasted till receipt, a pasted order email, added by hand, a catalog lookup, or an approved offer you marked Bought). This log never leaves the page as raw rows; only a **buying pattern**, a coarse per-category summary of how you tend to get a discount, how much you tend to spend, and whether you stick to one brand, can, and only at sharing level 3 Taste.

Below it, an **Import a receipt or order email** panel lets you paste text from either shape and press **Import**: no OCR, no network, parsed on this page. Two **Paste sample** buttons fill the textarea with a worked till-receipt and a worked order-email example so you can see the parser work without a real receipt handy. A successful import adds rows to Purchases and, for items whose category it can recognise, garments to the wardrobe. Your agent can do the same thing with `import_receipt`; the pasted text itself is never echoed back or sent anywhere off the page.

An **Offers for your requests** panel holds personal offers a merchant approved for one of the requests you sent. Each shows the price (and the regular price it is off), any promo code, and the validity date; your agent can read the same list with `get_offers`. Nothing here can buy for you: you press **Bought** or **Passed** yourself. Pressing **Bought** records a purchase in the Purchases panel above, with the offer's id attached, so you can trace which offer led to which purchase.

### The studio in one paragraph

A promo-video studio that you and an AI agent edit together. You control the facts (prices, offer, promo code, dates, disclaimer). The agent does the production work (scenes, copy, pacing) through structured tools, and it is physically unable to publish a claim that contradicts your facts.

### Personal offers

Beside the offer facts sits a locked **offer rules** block: cost price, margin floor percent, and max discount percent. No WebMCP tool can read or write these; `propose_offer` only ever stays inside them. On each row in Incoming requests, a **Propose offer** button asks the matcher to turn that one request into a personal offer within the rules; your agent's own `propose_offer` call does the same thing. Either way, the proposal shows its price, any promo code, validity date, up to three reasons for the numbers it chose (for example "Discount trimmed to protect the margin floor"), and a margin check, then waits for you to press **Approve** or **Decline**. Nothing is visible to the shopper until you approve it. An **Auto-propose incoming requests** toggle, off by default and settable only by you, proposes one automatically for every new request that does not already have one; you still approve or decline each one by hand. Once approved, `get_offer` called with a `requestId` returns that one offer to a shopping agent, and `get_offers` on the closet page lists every approved offer addressed to that shopper's own requests.

## The three panels

1. **Approved offer facts** (left). The source facts. Edit them while unlocked, then press "Lock offer facts" before letting an agent work. The lock is deliberately absent from the agent's tools: only you can change these values. Above the offer facts sits the **offer completeness meter**: how many of nine facts (product name, regular price, sale price or discount, promo code, dates, disclaimer, purchase link, sizes in stock, product image) are locked, with a note next to each missing one naming exactly what it unlocks for a shopping agent, for example "Unlocks: agents can hand the shopper a place to buy" for the purchase link.
2. **Live composition** (middle). A **placement** row (Story 9:16, Feed 4:5, Display 16:9) sits above the preview, a human-only choice no WebMCP tool can set. Below it, a 9:16 preview of the video: play it, scrub the timeline, click a scene card to edit its heading, body or duration by hand. Your edits and the agent's edits land in the same place.
3. **Agent activity log** (right). Every agent action, accepted or blocked, with the reason. The current claim status ("all claims trace to locked facts" or a violation count) sits at the top. Export is only enabled when the status is clean.

## Incoming requests, in detail

Each row in **Incoming requests** shows: the category and size (and product handle, when the shopper checked fit against a specific item), a **Need** or **Want** pill, and a compact metadata line, occasion (season, gift, event) and who the shopper is buying for (Me / Partner / Kid), when the shopper's sharing level was high enough to include them. Underneath, "Shared at level N: field, field, ..." lists exactly what the shopper's consent grant contained for that one request, nothing inferred. If the shopper later recorded an outcome, a **Bought** or **Passed** badge sits next to the Need/Want pill.

## Working with an agent

### Enable WebMCP first

- **Challenge-supported Chrome:** Chrome 149+ carries an origin-trial token for this domain, so the flag below is not needed there. On an older build, in the exact profile you will use, open `chrome://flags/#enable-webmcp-testing`, set it to Enabled, then press **Relaunch**. Reopen the live URL after the browser restarts.
- **ChatGPT desktop:** open `https://hemloop.app` inside ChatGPT's built-in browser (GPT-5.6 Sol/Terra); tools are picked up automatically, nothing to enable.

The badge in each page's header tells you the state: "9 WebMCP tools live" on the closet, "11 WebMCP tools live" on the studio, "preview mode" when the page is running as a plain editor.

### Things to say to the agent, on the closet page

- "What's in my wardrobe, and what am I missing?"
- "Check the fit of northlight-hoodie against what I own."
- "What are my stated preferences?" (reads the preferences card with `get_preferences`)
- "I want that hoodie in medium. Tell me what you would send." Then press **Approve next request (level N)** and ask the agent to send it.
- "Show me exactly what you sent them." (the tool returns the full payload)

### Things to say to the agent, in the studio

- "Read the campaign and tell me what the locked offer is."
- "There's a Need for a hoodie in M. Build the campaign around that product."
- "Import the product northlight-hoodie and rebuild the storyboard around it."
- "Add an energetic opening scene, keep it under 4 seconds."
- "Tighten the copy on the offer scene, keep the price and code exact."
- "Reorder so the offer lands before the CTA, then seek the preview to the offer."
- "Validate the whole campaign, then export it."
- "Call `get_offer` and read back the purchase link." This is the read-only tool a shopping agent would call once the offer is locked: it returns the product, prices, promo code, validity dates, disclaimer, sizes in stock, purchase link and offer completeness as structured data, nothing more.

### When the agent gets blocked

If the agent proposes copy like "50% off, guaranteed", the agent activity log shows a red entry naming the exact violation ("Copy claims 50% but the locked offer is 25%") and nothing changes on the canvas. Every rejection also carries a `next` instruction telling the agent what to try instead, so it corrects itself on the next try without you having to explain the rule. The "Try a false claim" button simulates one of these rejections so you can see the behaviour without an agent connected.

## Exporting

Export produces a single self-contained HTML file, a deterministic motion composition (HyperFrames format). Your disclaimer is baked into every frame of it as a footer that no tool can remove. To turn it into a video file, see "Rendering the export" in the tech guide.

## Limits worth knowing

- The demo catalog is a synthetic apparel catalog shaped like a Shopify store export. Prices are realistic demo values; products and the brand are fictional.
- Date phrasing in copy ("ends Sunday") is not fact-checked; the locked disclaimer carries the authoritative dates.
- One campaign per page session; refresh restores the seed campaign.
