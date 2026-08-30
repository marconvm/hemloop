# Hemloop

**A two-sided, agent-native commerce loop: shoppers keep their data, merchants finally see demand, and every promise the workflow produces is provably true.**

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/). Two surfaces, one origin, and the agent is the join:

1. **The Closet** (`/closet`) — the shopper's private surface. A wardrobe, sizes and gaps that never leave the page. The shopper's agent uses 6 WebMCP tools to shop against it: find gaps, check fit against a real Shopify catalog, and, when something is missing, send the merchant a **demand signal that is hashed locally before it leaves** — the same pattern Google Ads uses for enhanced conversions, where raw data is hashed on the client and only the hash travels. No identity, no wardrobe contents, ever.
2. **The Studio** (`/studio`) — the merchant's surface. Hashed demand arrives in a live panel: the offline dark matter merchants have never had (what nearby shoppers own, miss, and want, in what size). The merchant answers it with a workflow: lock the campaign truth (prices, offer, code, dates, disclaimer), then let their agent build the response through 9 WebMCP tools. A promo video is one output of that workflow — the trust machinery around it is the product, not the video editor.

The win-win: the shopper gets an agent that knows their wardrobe without ever uploading it; the merchant gets demand data that used to be invisible, pre-anonymised at the source; and everything the merchant's agent produces in response is claim-validated **before it applies** — copy that says "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason. The exported composition refuses to exist while violations remain, and the disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Both surfaces need tools that operate on live page state in the user's own session — the wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in the page itself: no backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural rather than conventional: the closet's only outbound tool physically cannot include wardrobe data, and the studio has no tool that can touch locked facts.

## Quickstart

```sh
npm install
npm run dev                       # landing on /, studio on /studio, closet on /closet
npx tsx --test tests/*.test.ts    # 27 tests
```

To connect an agent: enable `chrome://flags/#enable-webmcp-testing` in Chrome 149+ and reload, or open the deployed URL in ChatGPT's browser. Each page's header badge switches from "preview mode" to "tools live".

## Tool surfaces

**Closet (shopper, 6 tools):** `get_wardrobe`, `get_my_sizes`, `find_gaps`, `check_fit` (all read-only), `add_garment`, and `report_demand_gap` — the single outbound tool, which can only emit a hashed `DemandSignal` and returns the exact payload sent so the shopper can verify nothing personal is inside.

**Studio (merchant, 9 tools):** `get_campaign_state`, `validate_claims`, `export_composition` (read-only), `set_brief`, `add_scene`, `update_scene`, `reorder_scenes`, `seek_preview`, `import_product`. Mutations validate against locked facts before applying. There is deliberately **no** lock/unlock tool on either surface: locking truth and releasing wardrobe facts are human-only acts.

## Documentation

- [Product Requirements (PRD)](docs/PRD.md) — the argument for every design decision
- [User Guide](docs/USER-GUIDE.md) — shopper and merchant walkthroughs
- [Tech Guide](docs/TECH-GUIDE.md) — architecture, tool contracts, signal bridge, export format

## Challenge supporters used

- **Shopify** — campaign facts and fit checks run against a real (synthetic-data) Shopify development store catalog
- **Google Chrome** — WebMCP origin-trial surface for the live demo
- **OpenAI / ChatGPT** — the agents driving both sides of the demo
- **Cloudflare** — the app scaffold targets Cloudflare Workers (`wrangler`) for hosting
- **Netlify** — publish target for exported compositions: a validated promo is a single static HTML file, deployed as the campaign gallery
- **Render** — roadmap home for the production signal relay (the localStorage bridge's API successor)

## Provenance

All data is synthetic: "Aurora Threads" is a fictional brand, the wardrobe is seeded, the store is a Shopify development store. The exported composition uses the open HyperFrames HTML composition shape; the exporter here was written for this entry. Work in this repository was created during the challenge submission window.

## License

[MIT](./LICENSE)
