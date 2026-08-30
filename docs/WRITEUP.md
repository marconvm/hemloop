# Devpost Submission Text (draft v2, integrated loop)

## Inspiration

I run e-commerce and paid media for apparel retail. Purchase history tells merchants what sold, but rarely what a shopper still owns, is missing, or wants in which size. That context lives in closets and is too sensitive to hand over wholesale. Meanwhile the other half of my job, promotional creative, is exactly where agents are both most useful and most dangerous: a wrong percentage in a promo is a legal problem.

WebMCP made a different boundary possible: let the shopper's agent reason over page-local context, but give the merchant-facing action a smaller schema and a human-only release gate. If the merchant does not need an identity to answer a product gap, do not send even a hashed one.

## What it does

Hemloop is a two-sided workflow orchestrated by the agent, with a browser-local bridge carrying only a consented demand event.

**The Closet** is the shopper surface. Their agent uses six WebMCP tools to read wardrobe rows, find gaps and check fit against a Shopify catalog snapshot. The only merchant-facing tool, `report_demand_gap`, rejects until the shopper presses **Approve next signal** — a human-only control deliberately absent from WebMCP. One approval releases one zero-ID event: category, size, optional product, kind, time and a random event id. There is no shopper ID, stable hash or wardrobe field. The tool returns the exact payload sent, so the boundary is inspectable.

**The Studio** is the merchant surface. Consented demand arrives in a live panel: intent that purchase history often misses, without a shopper identifier or wardrobe rows. The merchant answers it with a truth-locked workflow: lock the campaign facts (prices, offer, code, dates, disclaimer), then let their agent produce through nine WebMCP tools. Every rendered-copy mutation is claim-validated before it applies; "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason the agent self-corrects from. One output is a deterministic motion composition (renderable HTML) that refuses to export while any violation remains and carries the disclaimer in every frame as an element no tool can touch.

An agent video editor alone would be one of a thousand on GitHub. The product is the loop: private data stays private, demand becomes visible, and the response is provably compliant.

## Why WebMCP fits

Both surfaces need tools operating on live page state in the user's own session: the wardrobe on one page, the composition on the other. WebMCP registers typed tools in the page itself, so there is no backend, no OAuth, no sync layer, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural: locking truth is not a tool on either surface, the closet's only outbound tool cannot carry wardrobe data, and validation runs inside the tool layer where it cannot be skipped.

## How we built it

TypeScript. A pure, framework-free core (claim validator, composition exporter, wardrobe/fit/signal logic, two WebMCP adapters) with unit tests, wrapped by React surfaces that own all state and pass callbacks in. Registration probes both `navigator.modelContext` and `document.modelContext`. Product data is a committed snapshot of a Shopify development store containing synthetic products. The two surfaces are routes of one origin, so the demo signal bridge works over localStorage and storage events with no dependency on multi-tab agent behaviour. The app scaffold targets Cloudflare Workers.

## Challenges

Making the data boundary checkable rather than promised: the signal type has no identity or wardrobe field; the human-only approval is consumed after one use; and the tool returns its own payload so a judge can inspect it in one minute. And scoping honestly: an earlier two-origin version depended on unverified multi-tab tool behaviour, so we kept the workflow and moved both surfaces to one origin.

## What's next

A real signal relay with k-anonymity floors (min N shoppers per cell before a merchant sees it), live Storefront API import, per-merchant fact schemas, and server-side rendering of exported compositions to MP4.

## Built with

TypeScript, React 19, WebMCP (`navigator.modelContext`), Shopify catalog data, GSAP, Cloudflare Workers scaffold, HyperFrames composition format.
