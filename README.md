# Hemloop

**A two-sided, agent-native commerce loop: shoppers keep their data, merchants finally see demand, and every promise the workflow produces is provably true.**

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/). Two surfaces, one origin, with the agent orchestrating both sides of the workflow:

**Live app:** [hemloop.marcoatwill.workers.dev](https://hemloop.marcoatwill.workers.dev)

1. **The Closet** (`/closet`) — the shopper surface. The agent uses 6 WebMCP tools to find wardrobe gaps and check fit against a Shopify catalog snapshot. When something is missing, `report_demand_gap` can send one **zero-ID, schema-limited demand event** — but only after the shopper arms a one-shot approval in the UI. The payload has category, size, optional product handle and event metadata; it has no account ID, stable hash or wardrobe rows.
2. **The Studio** (`/studio`) — the merchant surface. Consented demand arrives in a live panel: intent that purchase history often misses. The merchant answers it with a workflow: lock the campaign truth (prices, offer, code, dates, disclaimer), then let their agent build the response through 9 WebMCP tools. A promo video is one output of that workflow — the trust machinery around it is the product, not the video editor.

The win-win: the shopper gets an agent that can reason over their wardrobe while Hemloop strictly limits its merchant-facing channel; the merchant gets an explicit demand event without a shopper identifier; and every rendered claim the merchant's agent proposes is validated **before it applies**. Copy that says "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason. The exported composition refuses to exist while violations remain, and the disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Both surfaces need tools that operate on live page state in the user's own session — the wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in the page itself: no backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural rather than conventional: the closet's only outbound tool physically cannot include wardrobe data, and the studio has no tool that can touch locked facts.

## Quickstart

```sh
npm install
npm run dev                       # landing on /, studio on /studio, closet on /closet
npx tsx --test tests/*.test.ts    # 33 tests
```

To connect an agent in a challenge-supported Chrome build: enable `chrome://flags/#enable-webmcp-testing` in the exact profile you will use, press **Relaunch**, then reopen the live URL. Or open the deployed URL in ChatGPT's browser where WebMCP is supported. Each page's header badge switches from "preview mode" to "tools live".

## Tool surfaces

**Closet (shopper, 6 tools):** `get_wardrobe`, `get_my_sizes`, `find_gaps`, `check_fit` (all read-only), `add_garment`, and `report_demand_gap` — the single merchant-facing tool. It rejects until the human arms one share, can emit only the zero-ID `DemandSignal` schema, consumes the approval, and returns the exact payload sent.

**Studio (merchant, 9 tools):** `get_campaign_state`, `validate_claims`, `export_composition` (read-only), `set_brief`, `add_scene`, `update_scene`, `reorder_scenes`, `seek_preview`, `import_product`. Mutations validate against locked facts before applying. There is deliberately **no** lock/unlock tool on either surface: locking truth and releasing wardrobe facts are human-only acts.

## Documentation

- [Product Requirements (PRD)](docs/PRD.md) — the argument for every design decision
- [User Guide](docs/USER-GUIDE.md) — shopper and merchant walkthroughs
- [Tech Guide](docs/TECH-GUIDE.md) — architecture, tool contracts, signal bridge, export format
- [Verification Record](docs/VERIFICATION.md) — green gates and the remaining real-browser checklist

## Challenge supporters used

- **Shopify** — campaign facts and fit checks run against a real (synthetic-data) Shopify development store catalog
- **Google Chrome** — target WebMCP runtime; final production flag/relaunch verification is tracked in the verification record
- **OpenAI / ChatGPT** — target agent surface for the two-sided demo; in-app pairing is the remaining P4 gate
- **Cloudflare** — the live app is deployed on Cloudflare Workers at [hemloop.marcoatwill.workers.dev](https://hemloop.marcoatwill.workers.dev)

## Cloudflare deployment

The repository pins the Wrangler version used for the successful deployment. Vinext currently generates a `legacy_env` field that Wrangler 4.127 rejects, so prepare the generated config before deploying:

```sh
npm run build
npm run prepare:worker
npm run deploy:worker
```

`prepare:worker` only removes the unsupported generated field; it does not deploy or change Cloudflare state.

## Provenance

All data is synthetic: "Aurora Threads" is a fictional brand, the wardrobe is seeded, the store is a Shopify development store. The exported composition uses the open HyperFrames HTML composition shape; the exporter here was written for this entry. Work in this repository was created during the challenge submission window.

## License

[MIT](./LICENSE)
