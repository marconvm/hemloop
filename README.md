# Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an offer that cannot lie about the price.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

**Live app:** [hemloop.app](https://hemloop.app)

Maya has a closet. Northlight Apparel (a demo brand) has a campaign. The agent is the only thing that touches both.

Two surfaces, one origin, with the agent orchestrating both sides of the workflow:

1. **The Closet** (`/closet`): the shopper surface. The agent uses 6 WebMCP tools to find wardrobe gaps and check fit against a product catalog snapshot (this demo's connector is Shopify). When something is missing, `report_demand_gap` can send one event carrying no shopper identifier (zero-ID) and a limited schema, but only after the shopper arms a one-shot approval in the UI. The payload has category, size, optional product handle and event metadata; it has no account ID, stable hash or wardrobe rows.
2. **The Studio** (`/studio`): the merchant surface. Consented demand arrives in a live panel, grouped by category and size with counts and labelled Need or Want: intent that purchase history often misses. The merchant answers it with a workflow: lock the offer facts (prices, offer, code, dates, disclaimer), then let their agent build the response through 10 WebMCP tools. A promo video is one output of that workflow. The trust machinery around it is the product, not the video editor.

The win-win: the shopper gets an agent that can reason over their wardrobe while Hemloop strictly limits its merchant-facing channel; the merchant gets an explicit demand event without a shopper identifier; and every rendered claim the merchant's agent proposes is validated before it applies. Copy that says "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason. The exported composition refuses to exist while violations remain, and the disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Both surfaces need tools that operate on live page state in the user's own session: the wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in the page itself: no backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural rather than conventional: the closet's only outbound tool physically cannot include wardrobe data, and the studio has no tool that can touch locked facts.

## What we built: 16 WebMCP tools, two pages

| Surface | Tool | Kind | What it does | Structural guarantee |
|---|---|---|---|---|
| Closet | `get_wardrobe` | read | Returns the garment rows on the page | `readOnlyHint`, `untrustedContentHint`, never returns a shopper id |
| Closet | `get_my_sizes` | read | Sizes owned, optionally by brand | `readOnlyHint` |
| Closet | `find_gaps` | read | Categories missing or thin | `readOnlyHint` |
| Closet | `check_fit` | read | Size advice for a catalog item from what is owned | `readOnlyHint`, reads the public catalog only |
| Closet | `add_garment` | write | Adds one garment to the local wardrobe | Enum-validated category, bounded strings, never leaves the page |
| Closet | `report_demand_gap` | write | The only tool that can send anything to a merchant | Rejects with `human-approval-required` until the person arms one share, consumes it after one event, can emit only the no-shopper-identifier `DemandSignal` shape, returns the exact payload sent |
| Studio | `get_campaign_state` | read | Facts, scenes, timing | `readOnlyHint` |
| Studio | `validate_claims` | read | Dry run of the claim validator | Never mutates |
| Studio | `export_composition` | read | Hands finished HTML to the page for download | Refuses while any violation stands |
| Studio | `get_offer` | read | Returns the locked offer as structured data: product, prices, promo code, validity dates, disclaimer, purchase link | `readOnlyHint`, reads only human-locked facts: the handoff to a shopping agent |
| Studio | `set_brief` | write | Sets the creative brief | Brief is never rendered copy, so it cannot become a claim |
| Studio | `add_scene` / `update_scene` | write | Writes rendered copy | Claim-validated before the state changes, rejected atomically |
| Studio | `reorder_scenes` | write | Reorders the timeline | Permutation-checked |
| Studio | `seek_preview` | write | Moves the preview playhead | Clamped to length, deterministic |
| Studio | `import_product` | write | Pulls a product into the facts | `untrustedContentHint`, blocked while facts are locked |
| Both | *(absent by design)* | none | There is no `lock_facts`, no `unlock_facts`, no `approve_share` | Locking the offer and releasing wardrobe data are human-only acts. This row is the product. |

## Quickstart

```sh
npm install
npm run dev                       # landing on /, studio on /studio, closet on /closet
npm test                          # 42 tests
```

To connect an agent in a challenge-supported Chrome build: Chrome 149+ carries an origin-trial token for this domain, so no flag is needed there. On an older build, enable `chrome://flags/#enable-webmcp-testing` in the exact profile you will use, press **Relaunch**, then reopen the live URL. Or open the deployed URL in ChatGPT's desktop browser (GPT-5.6 Sol/Terra), where nothing needs enabling. Each page's header badge switches from "preview mode" to "tools live".

## Tool surfaces

**Closet (shopper, 6 tools):** `get_wardrobe`, `get_my_sizes`, `find_gaps`, `check_fit` (all read-only), `add_garment`, and `report_demand_gap`, the single merchant-facing tool. It rejects until the human arms one share, can emit only the no-shopper-identifier `DemandSignal` schema, consumes the approval, and returns the exact payload sent.

**Studio (merchant, 10 tools):** `get_campaign_state`, `validate_claims`, `export_composition` (read-only; hands the HTML to the page as a download and returns its size), `get_offer` (read-only; returns the locked offer as structured data for a shopping agent, including the purchase link), `set_brief`, `add_scene`, `update_scene`, `reorder_scenes`, `seek_preview`, `import_product`. Mutations validate against locked facts before applying. There is deliberately no lock/unlock tool on either surface: the merchant locks the offer, the agent works inside it.

## Documentation

- [Product Requirements (PRD)](docs/PRD.md): the argument for every design decision
- [Use Cases](docs/USE-CASES.md): scenarios per Need and Want
- [User Guide](docs/USER-GUIDE.md): shopper and merchant walkthroughs
- [Tech Guide](docs/TECH-GUIDE.md): architecture, tool contracts, signal bridge, export format
- [Gap Analysis](docs/GAP-ANALYSIS.md): where the build stands against the product vision
- [Verification Record](docs/VERIFICATION.md): green gates and the remaining real-browser checklist

## Challenge supporters used

- **Shopify**: catalog data for this demo's connector. The importer takes a generic Catalog shape (handle, title, price, compare-at), and Shopify is one reference source among any that fit it
- **Google Chrome**: target WebMCP runtime, with an origin-trial token so Chrome 149+ needs no flag
- **OpenAI / ChatGPT**: target agent surface for the two-sided demo, works unmodified on ChatGPT desktop
- **Cloudflare**: the live app is deployed on Cloudflare Workers at [hemloop.app](https://hemloop.app)

## Cloudflare deployment

The repository pins the Wrangler version used for the successful deployment. Vinext currently generates a `legacy_env` field that Wrangler 4.127 rejects, so prepare the generated config before deploying:

```sh
npm run build
npm run prepare:worker
npm run deploy:worker
```

`prepare:worker` only removes the unsupported generated field; it does not deploy or change Cloudflare state.

## Provenance

All data is synthetic: "Northlight Apparel" is a fictional demo brand, the wardrobe is seeded, and the catalog is a synthetic apparel catalog (8 products) shaped like a Shopify store export, with photos sourced from Unsplash (credits in docs/PHOTO-CREDITS.md). The exported composition uses the open HyperFrames HTML composition shape; the exporter here was written for this entry. Work in this repository was created during the challenge submission window.

## License

[MIT](./LICENSE)
