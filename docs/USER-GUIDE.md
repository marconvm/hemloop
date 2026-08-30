# ProofFrame User Guide

For the person running a campaign. The technical companion is [TECH-GUIDE.md](./TECH-GUIDE.md).

## What ProofFrame is

Two surfaces of one loop.

**As a shopper** (`/closet`): your wardrobe lives on your page and never leaves it. Your agent reads it to shop for you — find gaps, check fit against a real store catalog — and when something you want is missing, it sends the merchant an anonymous demand signal, hashed on your side before it goes (the way ad platforms hash conversion data client-side). The signal log shows you the complete payload of everything ever sent: a hash, a category, a size. Nothing else exists to leak.

**As a merchant** (`/`): hashed demand arrives in the studio's Live Demand panel — the closest thing to seeing inside customers' closets without seeing inside customers' closets. You answer it with a campaign: lock the truth, let your agent produce, and nothing non-compliant can come out. The promo video below is one output of that workflow.

### The studio in one paragraph

A promo-video studio that you and an AI agent edit together. You control the facts (prices, offer, promo code, dates, disclaimer). The agent does the production work (scenes, copy, pacing) through structured tools, and it is physically unable to publish a claim that contradicts your facts.

## The three panels

1. **Campaign truth** (left). The source facts. Edit them while unlocked, then press "Lock campaign truth" before letting an agent work. The lock is deliberately absent from the agent's tools: only you can change these values.
2. **Live composition** (middle). A 9:16 preview of the video. Play it, scrub the timeline, click a scene card to edit its heading, body or duration by hand. Your edits and the agent's edits land in the same place.
3. **Proof trail** (right). Every agent action, accepted or blocked, with the reason. The current claim status ("all claims trace to locked facts" or a violation count) sits at the top. Export is only enabled when the status is clean.

## Working with an agent

### Enable WebMCP first

- **Chrome (149+):** open `chrome://flags/#enable-webmcp-testing`, set it to Enabled, relaunch. This is a manual browser setting; nothing on the page can flip it for you.
- **ChatGPT with browsing:** open the deployed studio URL inside ChatGPT's browser; tools are picked up automatically where WebMCP is supported.

The badge in the studio header tells you the state: "9 WebMCP tools live" when connected, "preview mode" when the page is running as a plain editor.

### Things to say to the agent, on the closet page

- "What's in my wardrobe, and what am I missing?"
- "Check the fit of northlight-hoodie against what I own."
- "I want that hoodie in medium. Let the store know, anonymously."
- "Show me exactly what you sent them." (the tool returns the full payload)

### Things to say to the agent, in the studio

- "Read the campaign and tell me what the locked offer is."
- "There's a demand signal for a hoodie in M. Build the campaign around that product."
- "Import the product northlight-hoodie and rebuild the storyboard around it."
- "Add an energetic opening scene, keep it under 4 seconds."
- "Tighten the copy on the offer scene, keep the price and code exact."
- "Reorder so the offer lands before the CTA, then seek the preview to the offer."
- "Validate the whole campaign, then export it."

### When the agent gets blocked

If the agent proposes copy like "50% off, guaranteed", the proof trail shows a red entry naming the exact violation ("Copy claims 50% but the locked offer is 25%") and nothing changes on the canvas. The agent receives the same structured reason and will usually correct itself on the next try. The "Try unsafe agent claim" button simulates one of these rejections so you can see the behaviour without an agent connected.

## Exporting

Export produces a single self-contained HTML file, a deterministic motion composition (HyperFrames format). Your disclaimer is baked into every frame of it as a footer that no tool can remove. To turn it into a video file, see "Rendering the export" in the tech guide.

## Limits worth knowing

- The demo catalog is a snapshot of a synthetic development store. Prices are real store data; products are fictional.
- Date phrasing in copy ("ends Sunday") is not fact-checked; the locked disclaimer carries the authoritative dates.
- One campaign per page session; refresh restores the seed campaign.
