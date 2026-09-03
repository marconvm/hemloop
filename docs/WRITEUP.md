# Devpost Submission Text (draft v3, judge-review pass)

## Inspiration

I run e-commerce and paid media for apparel retail. Purchase history tells merchants what sold, but rarely what a shopper still owns, is missing, or wants in which size. That context lives in closets and is too sensitive to hand over wholesale. Meanwhile the other half of my job, promotional creative, is exactly where agents are both most useful and most dangerous: a wrong percentage in a promo is a legal problem.

WebMCP made a different boundary possible: let the shopper's agent reason over page-local context, but give the merchant-facing action a smaller schema and a human-only release gate. If the merchant does not need an identity to answer a product gap, do not send even a hashed one.

In one sentence each, the before/after: a shopper's agent can surface an anonymous demand event to a store in one human-approved tool call, where before the store simply never knew; a merchant's agent can turn that event into a claim-compliant offer in minutes, where before it took a design round-trip and a legal check. (The name: a hem loop is the small functional loop sewn inside a garment, hidden, structural, load-bearing. So is this one.)

## What it does

Two web pages register 21 WebMCP tools. The shopper's agent shops a private closet and can send a store exactly one thing: what is missing, in what size, with no shopper identifier, and only after the person presses Approve. The merchant's agent answers inside offer facts a human locked first; copy that contradicts them is rejected before it renders. The guarantees are structural: there is no tool that can unlock facts, arm sharing, or approve an offer.

Maya has a closet. Northlight Apparel (a demo brand) has a campaign. The agent is the only thing that touches both.

The loop, in three steps:

1. **The shopper's agent finds the gap.** On `/closet`, nine WebMCP tools let the agent read wardrobe rows, find what is missing or worn out, check fit against a product catalog snapshot, and read (or import from a pasted receipt) a purchase log spanning every store, rivals included. The only tool that can send anything to a merchant, `report_demand_gap`, rejects until the shopper presses **Approve next request**, a human-only control deliberately absent from WebMCP. One approval releases one event with no shopper identifier: category, size, optional product, kind, time and a random event id; at the shopper's highest sharing level it may also carry a coarse buying pattern derived from that purchase log, never the raw purchases. `find_gaps` is also a lifecycle scan: when the oldest garment in a category is past its typical replacement life, the row comes back with a `due` block and the agent reports it with kind `replace`, which is timing a merchant cannot infer from their own sales. The tool returns the exact payload sent, so the boundary is inspectable.
2. **The merchant answers it, inside locked facts and locked offer rules.** On `/studio`, consented demand arrives in a live panel, grouped by category and size with counts, labelled Need or Want, and scored against the stock they locked: can offer, size out of stock, or other category. `get_demand` hands their agent those same rows with the request ids, and the verdict runs the same two predicates the matcher refuses on, so the panel can never promise what `propose_offer` would decline. The merchant locks the offer facts (prices, offer, code, dates, disclaimer) and the offer rules (cost, margin floor, max discount), then their agent produces through twelve WebMCP tools. Every rendered-copy mutation is claim-validated before it applies; "50% off" against a locked 25% offer is rejected atomically with a machine-readable reason the agent self-corrects from. One of those tools, `propose_offer`, matches a single incoming request against the locked rules and stages a personal offer; the offer stays invisible to the shopper until a human approves it.
3. **The offer becomes something a shopping agent can act on, and the loop closes.** `get_offer` reads the locked facts back out as structured data: product, prices, promo code, validity dates, disclaimer and a purchase link, or, called with a request id, the one approved personal offer answering that request. It is read-only and it is the handoff out of Hemloop toward whatever agent is doing the actual buying. On the closet side, the shopper reads the same approved offer with `get_offers` and answers Bought or Passed by hand; Bought records a purchase carrying the offer's id, so the offer that won the sale stays traceable and the next buying pattern reflects it.

An agent video editor alone would be one of a thousand on GitHub. The product is the loop: private data stays private, demand becomes visible, the response is provably compliant and provably inside the merchant's margin, and a human closes it on both ends.

## Why WebMCP fits

Both surfaces need tools operating on live page state in the user's own session: the wardrobe on one page, the campaign on the other. WebMCP registers typed tools in the page itself, so there is no backend, no OAuth, no sync layer, and the human watches every agent action land in the UI they are using. It also makes both trust boundaries structural: locking the offer is not a tool on either surface, the closet's only outbound tool cannot carry wardrobe data, and validation runs inside the tool layer where it cannot be skipped.

## How this compares

Scraping-as-a-service gets its speed by reverse-engineering a site's private endpoints and its resilience by self-healing when the site changes, all without the site's knowledge. Hemloop inverts both: the site publishes a small, hand-written set of typed tools, so there is nothing to reverse-engineer and nothing to heal, and every write is validated against human-locked facts before it applies, so the wrong claim is never rendered rather than repaired later. Fewer tools, each with a trust boundary, instead of a marketplace of thousands.

The build leans on a small vocabulary for these properties rather than inventing its own: the harness enforces it, not the prompt; the model stages, the person applies; server-issued IDs only, so nothing the agent invents can become an identifier; snapshot evals over the tool boundary, including adversarial replays; and presentation as tools, where a tool like `seek_preview` or `export_composition` acts on the surface the human is already looking at instead of returning a payload blob (vocabulary borrowed from Anthropic's "The anatomy of effective commerce agents").

## Trust and safety, briefly

The tool surface went through six review passes (two independent reviewers, then a fix-and-replay loop) covering the locked-facts boundary, export escaping, and the no-identifier event shape; every finding was fixed with a regression test and replayed against the live WebMCP runtime, not just unit tests. Full detail, including the adversarial cases, lives in [docs/SECURITY.md](./SECURITY.md).

## How we built it

TypeScript. A pure, framework-free core (claim validator, composition exporter, wardrobe/fit/signal logic, receipt parser, personal-offer matcher, two WebMCP adapters) with 135 unit tests (including adversarial tool-boundary replays: extra-property XSS, malformed input, unicode claim evasion), wrapped by React surfaces that own all state and pass callbacks in. Registration probes both `navigator.modelContext` and `document.modelContext`. Product data is a synthetic apparel catalog shaped like a Shopify store export (this demo's connector), with a generic Catalog interface underneath so any source with handle, title, price and compare-at works unchanged. The two surfaces are routes of one origin, so the demo signal bridge works over localStorage and storage events with no dependency on multi-tab agent behaviour. The live app is deployed on Cloudflare Workers.

## Challenges

Making the data boundary checkable rather than promised: the demand-event type has no identity or wardrobe field; the human-only approval is consumed after one use; and the tool returns its own payload so a judge can inspect it in one minute. And scoping honestly: an earlier two-origin version depended on unverified multi-tab tool behaviour, so we kept the workflow and moved both surfaces to one origin.

## What's next

Purchase capture, buying pattern, auto-matched personal offers and the Bought/Passed attribution loop shipped this wave. What is still real roadmap:

1. **Real purchase capture.** `import_receipt` parses two pasted text shapes today, no OCR, no network. Next is receipt OCR for a photographed receipt and real order-email connectors (Gmail, a merchant's own confirmation webhook), so the log fills without the shopper pasting anything.
2. **Aggregation before disclosure.** A merchant should see a pattern, not a single event: a k-anonymity floor so a demand cell only becomes visible once enough distinct shoppers have contributed to it. This is the article's cap on resulting state, applied to the privacy boundary instead of to the campaign.
3. **Creatives for every placement.** Image and GIF exports first, matched to real ad placements (Story 9:16, Feed 4:5, Display 16:9), then short video once the still and motion pipelines share one validator.
4. **A browser extension surface**, so the closet and the purchase log travel with the shopper instead of living on one origin.
5. **The seam behind the WebMCP adapters.** Three interfaces, `ToolContract`, `ApprovalReceipt` and `PresentationEvent`, so a future authenticated backend can add server-side identity and revalidation without weakening the no-identifier bridge; sketched in `docs/integrations/commerce-agents/README.md`, not built.

The first artefacts of that plan are in the repo: `docs/integrations/commerce-agents/` holds a SKILL.md a commerce-agents shopping agent would load to use the closet, and a snapshot eval case in that harness's format that drives our tool boundary instead of a model.

## Built with

TypeScript, React 19, WebMCP (`document.modelContext`, with `navigator.modelContext` fallback), a Shopify-shaped synthetic catalog, GSAP, Cloudflare Workers, HyperFrames composition format.
