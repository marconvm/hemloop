# Devpost Submission Text (draft)

## Inspiration

I run promotions for apparel retail. Two facts collide there: promo videos are produced under deadline every week, and promotional claims are regulated copy where a wrong percentage or a dropped end date is a legal problem. Meanwhile the tools that make those videos, canvases and timelines, are exactly the interfaces AI agents cannot operate by guessing at pixels.

## What it does

ProofFrame is a promo-video studio that a human and an agent edit together. The page registers nine WebMCP tools. The human locks the campaign truth (prices, offer percentage, promo code, dates, disclaimer) in the UI; locking is intentionally not a tool. The agent storyboards, writes copy, reorders scenes, seeks the preview and imports product facts from a Shopify catalog, all against the same live state the human is editing by hand. Every mutating tool call is validated against the locked facts before it applies: non-compliant copy is rejected atomically with a machine-readable reason the agent can act on. Export produces a deterministic, self-contained motion composition (HyperFrames HTML, renderable to video) that refuses to exist while violations remain and carries the disclaimer in every frame as an element no tool can touch.

## Why WebMCP fits

The tools must operate on live page state inside the user's session: the composition being edited, the playhead, the lock. WebMCP is the only shape where that works with no backend, no credential grant and no sync layer, and where the human can watch every agent action land in the same UI they are using. It also makes the trust boundary enforceable: because agent access is a typed tool surface rather than simulated clicks, "agents cannot alter campaign truth" is a structural property of the page, not a hope.

## How we built it

TypeScript throughout. A pure, framework-free core library (claim validator, composition exporter, WebMCP registration adapter, catalog importer) with 19 unit tests, wrapped by a React studio that owns all state and passes callbacks into the adapter. Registration probes both navigator.modelContext and document.modelContext. Product data is a committed snapshot of a real Shopify development store (synthetic products), refreshable by one CLI command. The scaffold targets Cloudflare Workers for hosting; the demo runs in Chrome's WebMCP origin trial and in ChatGPT.

## Challenges

Two worth naming. First, the trust asymmetry took design care: rejecting before applying (so a wrong frame never renders), returning violations the agent can self-correct from, and keeping the lock out of the tool surface entirely. Second, the demo store is password-protected, so tokenless client-side catalog fetches were impossible; we chose a committed snapshot of the real catalog over shipping any token to the client, keeping provenance without compromising the credential boundary.

## What's next

A live Storefront API importer (the interface already matches), per-merchant fact schemas (regional pricing, legal templates), and rendering the exported composition to MP4 server-side so the agent can hand back a finished file.

## Built with

TypeScript, React 19, WebMCP (navigator.modelContext), Shopify Admin/Storefront catalog data, GSAP, Cloudflare Workers scaffold, HyperFrames composition format.
