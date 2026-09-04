# Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an offer that cannot lie about the price.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

**Live app:** [hemloop.app](https://hemloop.app)

Maya has a closet. Northlight Apparel (a demo brand) has a campaign. The agent is the only thing that touches both.

## This is not ad-tech, and the difference is the point

On the surface it looks like the same loop: a signal arrives, something gets matched, an offer goes out. It is the opposite shape.

An ad platform accumulates identity, infers intent it could have been told, and optimises for the conversion. Hemloop carries a **stated** need with no identity attached, and matches it against rules the merchant locked. `matchOffer` is one side's buying behaviour against the other side's commercial strategy:

- A shopper whose history shows she buys **without needing a code** gets a *smaller* discount, capped at 15%. Spending margin on someone who would have bought anyway is waste.
- A shopper who is a **brand switcher** gets the strongest discount the merchant permits, because winning her back is worth more than the margin on one sale.
- If either move would break the merchant's **margin floor**, the offer trims its own discount in five-point steps until the margin holds, and says so in its reasons.

No ad platform performs that third move. It is the merchant's own strategy constraining the personalisation instead of an auction optimising past it. And the behaviour driving it never leaves the page as raw data: `buyingPattern()` derives a coarse, category-scoped shape (discount sensitivity, spend band, brand loyalty), and only that shape travels, only at the shopper's highest sharing level.

**The loop compounds, and identity never does.** Every closed loop writes a purchase carrying the id of the offer that won it. That sharpens the shopper's local pattern, so the next offer is better shaped; and it sharpens the merchant's picture of what they persistently cannot fill. Both sides get better at their own half. Neither side accumulated a profile of the other. Ad platforms compound by knowing more about the person; this compounds by matching outcomes.

See [docs/USE-CASES.md](docs/USE-CASES.md) for the loop told as a story, run three times.

Four routes are the whole product (header: Loop · Closet · Studio · Docs). `/merchant` redirects to `/studio?tab=demand`.

1. **The Loop Room** (`/`): both sides of one request in one shared space, seven stations (New item → Again). Registers all **21 WebMCP tools** (9 closet + 12 studio) together. Three human gates on the page: Approve next request, Approve offer, Bought.
2. **The Closet** (`/closet`): the full shopper surface (tabs: Wardrobe · Requests and offers). Nine tools find wardrobe gaps, check fit, read preferences, import receipts, and — after one human approval — send a zero-ID demand signal. Sharing level 0–3 controls which fields travel; wardrobe rows never do.
3. **The Studio** (`/studio`): the full merchant surface (tabs: Demand · Offer and rules · Composition). Twelve tools including `get_demand` and `propose_offer`. Lock facts and approve proposals are human-only. A promo video is one output; the trust machinery is the product.
4. **Docs** (`/docs/`): the five-section docs site.

The win-win: the shopper gets an agent that can reason over their wardrobe while Hemloop strictly limits its merchant-facing channel; the merchant gets an explicit demand event without a shopper identifier; and every rendered claim the merchant's agent proposes is validated before it applies. Copy that says "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason. The exported composition refuses to exist while violations remain, and the disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Both surfaces need tools that operate on live page state in the user's own session: the wardrobe on the shopper's page, the composition on the merchant's. WebMCP registers typed tools in the page itself: no backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural rather than conventional: the closet's only outbound tool cannot include wardrobe rows or any shopper identifier, and the studio has no tool that can touch locked facts.

## What we built: 21 WebMCP tools, four routes

| Surface | Tool | Kind | What it does | Structural guarantee |
|---|---|---|---|---|
| Closet | `get_wardrobe` | read | Returns the garment rows on the page | `readOnlyHint`, `untrustedContentHint`, never returns a shopper id |
| Closet | `get_my_sizes` | read | Sizes owned, optionally by brand | `readOnlyHint` |
| Closet | `find_gaps` | read | Categories missing or thin, plus categories whose oldest garment is past its typical replacement life | `readOnlyHint`; a due row carries the date, the months elapsed and the size to buy again, never a merchant, price or purchase row |
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
| Studio | `get_demand` | read | Consented demand grouped by category and size, with the request ids and, per group, whether the locked offer can answer it | `readOnlyHint`, `untrustedContentHint`; the verdict uses the same two predicates `matchOffer` refuses on, so it cannot promise what `propose_offer` would decline |
| Studio | `import_product` | write | Pulls a product into the facts | `untrustedContentHint`, blocked while facts are locked |
| Studio | `propose_offer` | write | Proposes a personal offer for one incoming request inside the locked offer rules (cost, margin floor, max discount) | Staged; a human approves or declines before the shopper can see it; margin floor enforced in code |
| Both | *(absent by design)* | none | There is no `lock_facts`, no `unlock_facts`, no `approve_share`, no `set_sharing_level`, no `approve_offer` | Locking the offer, releasing wardrobe data, the consent dial, and approving a personal offer are human-only acts. This row is the product. |

## Quickstart

```sh
npm install
npm run dev                       # Loop Room on /, studio on /studio, closet on /closet
npm test                          # 144 tests
```

To connect an agent in a challenge-supported Chrome build: Chrome 149+ carries an origin-trial token for this domain, so no flag is needed there. On an older build, enable `chrome://flags/#enable-webmcp-testing` in the exact profile you will use, press **Relaunch**, then reopen the live URL. Or open the deployed URL in ChatGPT's desktop browser (GPT-5.6 Sol/Terra), where nothing needs enabling. Each page's header badge switches from "preview mode" to "tools live".

## Tool surfaces

**Closet (shopper, 9 tools):** `get_wardrobe`, `get_my_sizes`, `find_gaps`, `check_fit`, `get_preferences`, `get_offers` (all read-only), `add_garment`, `import_receipt`, and `report_demand_gap`, the single tool that can send anything to a merchant. `find_gaps` is also the lifecycle scan: a category whose oldest garment is past its replacement life comes back with a `due` block, which the agent reports with kind `replace`. It rejects until the human arms one share, can emit only the no-shopper-identifier `DemandSignal` schema, consumes the approval, and returns the exact payload sent.

**Studio (merchant, 12 tools):** `get_campaign_state`, `get_demand`, `validate_claims`, `export_composition` (read-only; hands the HTML to the page as a download and returns its size), `get_offer` (read-only; returns the locked offer as structured data for a shopping agent, including sizes in stock, purchase link and offer completeness, or one approved personal offer when called with `requestId`), `set_brief`, `add_scene`, `update_scene`, `reorder_scenes`, `seek_preview`, `import_product`, `propose_offer` (stages a personal offer for one incoming request inside the locked offer rules; a human approves or declines it). `get_demand` is where those request ids come from, and it tells the merchant which groups their locked offer cannot answer and why. Mutations validate against locked facts before applying. There is deliberately no lock/unlock tool on either surface, and no tool that can approve an offer: the merchant locks the offer, the agent works inside it, and a human decides what the shopper sees.

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

## Right time, not just right product

A gap is not only something you never had. `find_gaps` also reads the purchase date on each garment: when the oldest one in a category is past its typical replacement life, that category comes back with a `due` block carrying the date, the months elapsed and the size to buy again, and the agent reports it with kind `replace`. The dates come from the purchase log, so anything imported from a receipt or marked Bought starts its own clock. Nothing about where it was bought or what it cost is in the gap, and the replacement intervals are one table in `closet.ts` a merchant with real wear data should tune.

The merchant gets the reciprocal. `get_demand` groups consented requests by category and size and scores each group against the stock they locked: **can offer**, **size out of stock**, or **other category**, with the request ids to hand straight to `propose_offer`. The verdict runs the same two predicates `matchOffer` refuses on, so the panel can never promise something the matcher then declines, and a group's `replace` count tells the merchant those shoppers already own one. That is restock guidance from real intent, with no shopper identifier anywhere in it.

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

The merchant side is entirely synthetic: "Northlight Apparel" is a fictional demo brand, and its catalog (8 products, Unsplash photos) is shaped like a Shopify store export. The shopper side mixes the two: the shopper, her purchase history and her sizes are seeded and fictional, but the brands and product photos in her wardrobe are real, from the author's own Shopify catalogs and used with permission. The split is deliberate. The studio is the surface that makes promotional claims, so no real brand's name is attached to a synthetic claim anywhere in this project. Full provenance in docs/PHOTO-CREDITS.md. The exported composition uses the open HyperFrames HTML composition shape; the exporter here was written for this entry. Work in this repository was created during the challenge submission window.

## License

[MIT](./LICENSE)
