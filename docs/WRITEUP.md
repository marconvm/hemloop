# Devpost Submission Text (draft v2, integrated loop)

## Inspiration

I run e-commerce and paid media for apparel retail. Merchants live with a blind spot: they know what they sold, never what shoppers already own, miss, or want in which size. That data exists only in closets, offline, and every product that asked shoppers to upload it has died a privacy death. Meanwhile the other half of my job, promotional creative, is exactly where agents are both most useful and most dangerous: a wrong percentage in a promo is a legal problem.

Paid media solved a version of the first problem years ago: hash the sensitive data on the client, send only the hash, match centrally. Google's enhanced conversions are built on it. WebMCP made me realise the same pattern could carry demand instead of conversions, with the shopper's own agent doing the sending.

## What it does

ProofFrame is a two-sided loop where the agent is the join.

**The Closet** is the shopper's private surface. Their agent uses six WebMCP tools to read the wardrobe, find gaps and check fit against a real Shopify catalog. The one outbound tool, report_demand_gap, can only emit a demand signal hashed locally before it leaves: a one-way hash, a category, a size, optionally a product handle. It returns the exact payload sent, so the shopper can verify nothing personal is inside. The wardrobe is structurally unable to cross.

**The Studio** is the merchant's surface. Hashed demand arrives in a live panel: owned-inventory data merchants have never had, pre-anonymised at the source. The merchant answers it with a truth-locked workflow: lock the campaign facts (prices, offer, code, dates, disclaimer), then let their agent produce through nine WebMCP tools. Every mutation is claim-validated before it applies; "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason the agent self-corrects from. One output of the workflow is a deterministic motion composition (a promo video, renderable HTML) that refuses to export while any violation remains and carries the disclaimer in every frame as an element no tool can touch.

An agent video editor alone would be one of a thousand on GitHub. The product is the loop: private data stays private, demand becomes visible, and the response is provably compliant.

## Why WebMCP fits

Both surfaces need tools operating on live page state in the user's own session: the wardrobe on one page, the composition on the other. WebMCP registers typed tools in the page itself, so there is no backend, no OAuth, no sync layer, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural: locking truth is not a tool on either surface, the closet's only outbound tool cannot carry wardrobe data, and validation runs inside the tool layer where it cannot be skipped.

## How we built it

TypeScript. A pure, framework-free core (claim validator, composition exporter, wardrobe/fit/signal logic, two WebMCP adapters) with 27 unit tests, wrapped by React surfaces that own all state and pass callbacks in. Registration probes both navigator.modelContext and document.modelContext. Product data is a committed snapshot of a real Shopify development store. The two surfaces are routes of one origin, so the signal bridge works over localStorage and storage events with no dependency on multi-tab agent behaviour. Scaffold targets Cloudflare Workers; exported compositions are single static HTML files published to Netlify as the campaign gallery; a production signal relay is the roadmap use for Render.

## Challenges

Making the privacy claim checkable rather than promised: the signal type, the hash, and the tool that returns its own payload exist so a judge can falsify the claim in one minute. And scoping honestly: an earlier two-origin version depended on unverified multi-tab tool behaviour, so we kept the story and moved both surfaces to one origin.

## What's next

A real signal relay with k-anonymity floors (min N shoppers per cell before a merchant sees it), live Storefront API import, per-merchant fact schemas, and server-side rendering of exported compositions to MP4.

## Built with

TypeScript, React 19, WebMCP (navigator.modelContext), Shopify catalog data, GSAP, Cloudflare Workers scaffold, Netlify (gallery), HyperFrames composition format.
