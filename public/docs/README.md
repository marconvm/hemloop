# Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an offer that cannot lie about the price.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

**Live app:** [hemloop.app](https://hemloop.app)

Maya has a closet. Northlight Apparel (a demo brand) has a campaign. The agent is the only thing that touches both.

Two surfaces, one origin, with the agent orchestrating both sides of the workflow:

1. **The Closet** (`/closet`): the shopper surface. The agent uses 9 WebMCP tools to find wardrobe gaps, check fit and read stated preferences against a product catalog snapshot (this demo's connector is Shopify). When something is missing, `report_demand_gap` can send one event carrying no shopper identifier (zero-ID) and a limited schema, but only after the shopper arms a one-shot approval in the UI. Which fields travel is set by a sharing level the shopper controls (0 Private through 3 Taste); the payload never has an account ID, stable hash or wardrobe rows. A purchase log across every merchant (rivals included) stays in the browser too; `import_receipt` reads a pasted receipt or order email into it, and `get_offers` reads back any approved personal offer addressed to this closet's own requests.
2. **The Studio** (`/studio`): the merchant surface. Consented demand arrives in a live panel, grouped by category and size with counts and labelled Need or Want: intent that purchase history often misses. The merchant answers it with a workflow: lock the offer facts (prices, offer, code, dates, disclaimer) and the offer rules (cost, margin floor, max discount), then let their agent build the response through 11 WebMCP tools, including `propose_offer`, which stages a personal offer for one incoming request inside those rules for a human to approve or decline. A promo video is one output of that workflow. The trust machinery around it is the product, not the video editor.

The win-win: the shopper gets an agent that can reason over their wardrobe while Hemloop strictly limits its merchant-facing channel; the merchant gets an explicit demand event without a shopper identifier; and every rendered claim the merchant's agent proposes is validated before it applies. Copy that says "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason. The exported composition refuses to exist while violations remain, and the disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Both surfaces need tools that operate on live page state in the user's own session: the wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in the page itself: no backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural rather than conventional: the closet's only outbound tool cannot include wardrobe rows or any shopper identifier, and the studio has no tool that can touch locked facts.

## What we built: 20 WebMCP tools, two pages

| Surface | Tool | Kind | What it does | Structural guarantee |
|---|---|---|---|---|
| Closet | `get_wardrobe` | read | Returns the garment rows on the page | `readOnlyHint`, `untrustedContentHint`, never returns a shopper id |
| Closet | `get_my_sizes` | read | Sizes owned, optionally by brand | `readOnlyHint` |
| Closet | `find_gaps` | read | Categories missing or thin | `readOnlyHint` |
| Closet | `check_fit` | read | Size advice for a catalog item from what is owned | `readOnlyHint`, reads the public catalog only |
| Closet | `get_preferences` | read | Reads the shopper's stated preferences: fit, colour family, materials to avoid, price ceiling, liked brands | `readOnlyHint`, `closet_data` fence, a field travels only if the sharing level allows it |
| Closet | `add_garment` | write | Adds one garment to the local wardrobe | Enum-validated category, bounded strings, never leaves the page |
| Closet | `report_demand_gap` | write | The only tool that can send anything to a merchant | Rejects with `human-approval-required` until the person arms one share, consumes it after one event, can emit only the no-shopper-identifier `DemandSignal` shape, returns the exact payload sent |
| Closet | `import_receipt` | write | Parses a pasted receipt or order email into purchases and garments on this page | Bounded text, parsed locally, never echoed back; nothing leaves the page |
| Closet | `get_offers` | read | Approved personal offers addressed to this closet's own requests | `readOnlyHint`, `storefront_data` fence, the shopper decides Bought or Passed on the page |
| Studio | `get_campaign_state` | read | Facts, scenes, timing | `readOnlyHint` |
| Studio | `validate_claims` | read | Dry run of the claim validator | Never mutates |
| Studio | `export_composition` | read | Hands finished HTML to the page for download | Refuses while any violation stands |
| Studio | `get_offer` | read | Returns the locked offer as structured data: product, prices, promo code, validity dates, disclaimer, sizes in stock, purchase link, offer completeness; pass `requestId` to read one approved personal offer instead | `readOnlyHint`, reads only human-locked facts: the handoff to a shopping agent |
| Studio | `set_brief` | write | Sets the creative brief | Brief is never rendered copy, so it cannot become a claim |
| Studio | `add_scene` / `update_scene` | write | Writes rendered copy | Claim-validated before the state changes, rejected atomically |
| Studio | `reorder_scenes` | write | Reorders the timeline | Permutation-checked |
| Studio | `seek_preview` | write | Moves the preview playhead | Clamped to length, deterministic |
| Studio | `import_product` | write | Pulls a product into the facts | `untrustedContentHint`, blocked while facts are locked |
| Studio | `propose_offer` | write | Proposes a personal offer for one incoming request inside the locked offer rules (cost, margin floor, max discount) | Staged; a human approves or declines before the shopper can see it; margin floor enforced in code |
| Both | *(absent by design)* | none | There is no `lock_facts`, no `unlock_facts`, no `approve_share`, no `set_sharing_level`, no `approve_offer` | Locking the offer, releasing wardrobe data, the consent dial, and approving a personal offer are human-only acts. This row is the product. |

## Quickstart

```sh
npm install
npm run dev                       # landing on /, studio on /studio, closet on /closet
npm test                          # 101 tests
```

To connect an agent in a challenge-supported Chrome build: Chrome 149+ carries an origin-trial token for this domain, so no flag is needed there. On an older build, enable `chrome://flags/#enable-webmcp-testing` in the exact profile you will use, press **Relaunch**, then reopen the live URL. Or open the deployed URL in ChatGPT's desktop browser (GPT-5.6 Sol/Terra), where nothing needs enabling. Each page's header badge switches from "preview mode" to "tools live".

## Tool surfaces

**Closet (shopper, 9 tools):** `get_wardrobe`, `get_my_sizes`, `find_gaps`, `check_fit`, `get_preferences`, `get_offers` (all read-only), `add_garment`, `import_receipt`, and `report_demand_gap`, the single tool that can send anything to a merchant. It rejects until the human arms one share, can emit only the no-shopper-identifier `DemandSignal` schema, consumes the approval, and returns the exact payload sent.

**Studio (merchant, 11 tools):** `get_campaign_state`, `validate_claims`, `export_composition` (read-only; hands the HTML to the page as a download and returns its size), `get_offer` (read-only; returns the locked offer as structured data for a shopping agent, including sizes in stock, purchase link and offer completeness, or one approved personal offer when called with `requestId`), `set_brief`, `add_scene`, `update_scene`, `reorder_scenes`, `seek_preview`, `import_product`, `propose_offer` (stages a personal offer for one incoming request inside the locked offer rules; a human approves or declines it). Mutations validate against locked facts before applying. There is deliberately no lock/unlock tool on either surface, and no tool that can approve an offer: the merchant locks the offer, the agent works inside it, and a human decides what the shopper sees.

## Consent is the dial

Sharing is not a checkbox in front of the loop, it is a dial the shopper sets, stored only in their browser:

| Level | What leaves the page | What the shopper gains |
|---|---|---|
| 0 Private | nothing | fit checks and gap finding stay local |
| 1 Basics (default) | category, size, need or want, optional product handle | offers in the right size |
| 2 Context | + occasion (season, gift, event), fit preference, who you are shopping for | offers timed and cut for the occasion |
| 3 Taste | + colour family, materials to avoid, price ceiling, buying pattern (discount sensitivity, spend band, brand loyalty) | creatives that match, no wasted offers |

Name, account, email, wardrobe rows, purchase history and income are never shared with a merchant, at any level. At level 0, `report_demand_gap` returns `sharing-disabled` and nothing crosses the bridge; the Approve button itself reads "Approve next request (level N)" so the level is visible at the moment of the grant.

A few more pieces of the shopper side worth knowing about: **Shopping for** lets the shopper switch between Me, Partner and Kid, scoping the wardrobe and every closet tool to that profile. **Bought / Passed** records, in the browser, whether a sent request turned into a purchase, and the studio shows that outcome next to the request. On the merchant side, the studio's **placement** control (Story 9:16, Feed 4:5, Display 16:9) is a human-only choice, never a WebMCP tool, and the **offer completeness meter** counts how many of nine offer facts are locked, naming exactly what each missing fact unlocks for a shopping agent.

## The loop closes

Purchases across every store, rivals included, stay with the shopper: a private log in their own browser, filled by hand, by pasting a receipt or order email, or automatically whenever an offer is marked Bought. At sharing level 3, a coarse buying pattern derived from that log, discount sensitivity, spend band, brand loyalty, travels with a request; the raw purchases never do. On the merchant side, the locked offer rules (cost, margin floor, max discount) let the merchant's agent auto-match a personal offer to that request, inside the margin, with `propose_offer` or the Auto-propose toggle. A human still approves or declines before anything reaches the shopper. The shopper answers Bought or Passed on the approved offer, and Bought records the purchase with the offer it came from, so the pattern that shaped the offer improves the next one.

## Documentation

- [Product Requirements (PRD)](docs/PRD.md): the argument for every design decision
- [Use Cases](docs/USE-CASES.md): scenarios per Need and Want
- [User Guide](docs/USER-GUIDE.md): shopper and merchant walkthroughs
- [Tech Guide](docs/TECH-GUIDE.md): architecture, tool contracts, signal bridge, export format
- [Gap Analysis](docs/GAP-ANALYSIS.md): where the build stands against the product vision
- [Plugging into a commerce-agents harness](docs/integrations/commerce-agents/README.md): a SKILL.md and a snapshot eval case in Anthropic's reference format
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
