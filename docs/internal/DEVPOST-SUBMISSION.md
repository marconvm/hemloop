# Devpost submission (paste-ready)

Paste each fenced block into the matching Devpost field. Replace the video URL when YouTube finishes processing.

---

## Project name

```
Hemloop
```

## Tagline / elevator pitch

```
Your AI tells a store what you need, without telling it who you are. The store answers with an offer that cannot lie about the price, priced inside rules a human locked.
```

## About the project

### Inspiration

```
I run e-commerce and paid media for apparel retail, so I have spent years on the ad-platform side of this problem. That machinery accumulates identity, infers intent from surveillance, and optimises for the conversion. It guesses at intent the shopper could simply have stated, and it never declines a discount because the discount would break the merchant's margin floor.

Promotional creative is where agents are most useful and most dangerous: a wrong percentage is a legal problem, not a bad impression. WebMCP made a different shape possible: rich page-local context that never leaves the page, and a deliberately tiny merchant-facing schema with a human-only release. If a store does not need an identity to answer "no hoodie, size M", then do not send one, not even a hash.

(The name: a hem loop is the small functional loop sewn inside a garment. Hidden, structural, load-bearing.)
```

### What it does

```
Hemloop is four routes that register 21 WebMCP tools (9 closet + 12 studio).

The shopper's agent reads a private wardrobe (what she owns, what is missing, what is worn out) and can send a store exactly one thing, only after she presses Approve: category, size, need or want. No name, no account, no hash, no wardrobe rows. One press releases one event.

The merchant's agent reads that demand scored against locked stock, proposes a personal offer inside locked commercial rules (cost, margin floor, max discount), and a human approves before the shopper sees it. Bought records the purchase with the id of the offer that won it.

Every promotional claim is validated against human-locked facts before it applies. "50% off" against a locked 25% is rejected atomically. The export refuses to exist while any claim is wrong.
```

### How we built it

```
Registration targets document.modelContext (with a navigator.modelContext probe). Each tool is { name, description, inputSchema, annotations?, execute }, schemas closed with additionalProperties: false, readOnlyHint on every reader, untrustedContentHint wherever user or catalog text flows through.

The core is pure TypeScript: claim validator, composition exporter, wardrobe and fit logic, receipt parser, offer matcher, demand insight, and two WebMCP adapters. React surfaces own state and pass callbacks in, so the tool surface is testable without a browser. The two surfaces share one origin; the demo bridge uses localStorage with exact-shape re-parse on every read.

Stack: TypeScript, React 19, Vite (vinext), Cloudflare Workers, WebMCP, Shopify catalog snapshot as the demo connector.
```

### Challenges we ran into

```
The hardest challenge was resisting the ad-platform instinct: just send an identifier, just let the agent optimise freely, just cache the shopper. Each of those would have made the build easier and erased the point.

The second was that a defensive re-parse is worthless if it is weaker than the parse it backs up, and that a tool result can blow its output budget on ordinary data long before any attacker shows up. Both had to be fixed at the storage and tool-result boundaries.
```

### Accomplishments that we're proud of

```
Structural human gates: there is no lock_facts, approve_offer, or approve_next_request tool. Those acts are absent by design, not "please don't".

matchOffer personalises the offer (discount depth, price, validity) inside the merchant's margin floor, and will trim or decline rather than break it, something ad auctions do not do.

One approval releases one demand event; the shopper sees the exact payload before and after; wardrobe rows physically cannot ride the outbound tool.
```

### What we learned

```
Privacy that depends on asking the model nicely is not a product. Boundaries that are missing tools and exact rebuilds at the storage edge are.

WebMCP is a strong fit when both sides need live page state in the person's own session, and when the outbound channel must be smaller than the local context the agent can reason over.
```

### What's next

```
Aggregation before disclosure (a demand cell only becomes visible once enough distinct shoppers have contributed). Consent receipts a shopper can export. Per-merchant sharing levels. Writing outcomes into the merchant's own reporting, not only displaying them on the demo page.
```

## Built with

```
typescript, react, vite, cloudflare-workers, webmcp, shopify
```

## Try it out

```
https://hemloop.app
https://github.com/marconvm/hemloop
```

## Gallery / logo asset

```
Looping mark (transparent GIF, 256px) for the Devpost gallery and README:
https://github.com/marconvm/hemloop/blob/main/public/logo-loop.gif
Static SVG source (same geometry): public/logo.svg
```

## Video

```
TODO: paste YouTube URL when processing finishes
```

## Testing instructions (for judges)

```
No account. Fresh incognito = clean install.

1. Open https://hemloop.app/ in ChatGPT's desktop browser or Chrome with WebMCP available. Header should show tools live.
2. Upload public/receipts/northlight-till-receipt.png (or harborview-order-email.png) in the chat.
3. Ask: What should I buy next?
4. Ask: Tell the store I need a hoodie in size M. Expect refusal. Press Approve next request, then reply: Yes, send it.
5. Ask for demand + propose an offer inside locked rules. Press Approve offer. On the closet, ask for offers and press Bought.
6. Optional safety check: ask the studio to update the hero to "fifty per cent off, guaranteed", and expect rejection against the locked discount.
```
