# Hemloop Technical Guide

For developers. Product rationale lives in [PRD.md](./PRD.md); end-user flow in [USER-GUIDE.md](./USER-GUIDE.md).

## Architecture

```
MERCHANT (/studio)                                SHOPPER (/closet)
app/studio/page.tsx                                app/closet/page.tsx
  └▶ components/proofframe-studio.tsx         └▶ components/closet-studio.tsx
        │ callbacks                                 │ callbacks
        ▼                                           ▼
   lib/proofframe/webmcp.ts (10 tools)        lib/proofframe/webmcp-closet.ts (7 tools)
        │ validates via                             │ pure logic in
        ▼                                           ▼
   validator.ts · exporter.ts                 closet.ts (gaps, fit, preferences, makeSignal: no shopper id)
   shopify.ts + catalog.json ◀────────────────┘ (check_fit reads the same catalog)

              lib/proofframe/signal-bridge.ts (localStorage + events, consent level, outcomes)
   studio incoming-requests panel ◀── DemandSignal (consent-gated) ◀── approved report_demand_gap
```

Both surfaces register tools on `navigator.modelContext` (fallback `document.modelContext`). The bridge carries only `DemandSignal` objects: event id, kind, category, size, optional handle and time, plus a `consent` grant (level and the exact fields released at that level) and, above consent level 2, `occasion`, `for` and `context`/`taste`. There is no shopper identity field, and never a name, account, email, wardrobe row, purchase history or income at any level. `report_demand_gap` also requires and consumes a human-only one-shot approval, and rejects outright with `sharing-disabled` at consent level 0.

Design rule: `lib/proofframe/*` is pure and framework-free (no React, no DOM at module scope). The studio owns all state and passes callbacks in; the adapter owns no state at all. This is what makes the whole tool surface unit-testable without a browser.

## Modules

| File | Responsibility |
|---|---|
| `lib/proofframe/types.ts` | Domain types. `factsLocked` is UI-only by design. `PLACEMENTS` (story/feed/display presets), `formatForPlacement` |
| `lib/proofframe/validator.ts` | Pure claim validator: % claims, $ prices, promo codes, banned phrases, durations. No DOM, network or clock |
| `lib/proofframe/exporter.ts` | Emits a standalone HyperFrames composition. Throws on violations. Escapes all copy. Force-renders the disclaimer as a non-clip footer |
| `lib/proofframe/webmcp.ts` | `buildTools(callbacks)` and `registerProofFrameTools(callbacks, mc?)`. Mutating tools validate before applying and return structured rejections. `computeCompleteness` backs both `get_offer` and the studio's completeness meter |
| `lib/proofframe/shopify.ts` | `makeCatalogImporter` maps snapshot products to offer facts. Promo terms stay human-owned. The importer takes a `Catalog`, not a Shopify response: Shopify is the reference connector; any source that yields handle, title, price and compare-at price works unchanged |
| `lib/proofframe/catalog.json` | Committed snapshot of the playground store catalog |
| `lib/proofframe/closet.ts` | Shopper domain: wardrobe seed, findGaps, sizesOwned, checkFit (keyword category match against the catalog), preferences (seed/read/write), consentFieldsForRequest (the fixed field enum per level), garmentsForProfile (Me/Partner/Kid scoping), and makeSignal, which carries no shopper identifier. Pure |
| `lib/proofframe/webmcp-closet.ts` | The 7 shopper tools. report_demand_gap is the only merchant-facing tool, requires human one-shot approval, blocks outright at consent level 0, and emits only the fields `consentFieldsForRequest` allows for the shopper's level |
| `lib/proofframe/signal-bridge.ts` | localStorage demo transport for signals, outcomes (bought/passed) and the consent level: 'storage' event cross-tab, CustomEvent same-tab, try/catch everywhere, 50-entry caps. A production relay would keep the same minimized payload contract and add aggregation thresholds |

## The WebMCP contract

Registration targets `document.modelContext` (the spec's namespace; `navigator.modelContext` is probed first only as a fallback for older drafts). Each tool is `{ name, description, inputSchema, annotations?, execute }`. `execute` returns a plain JSON object (the browser serialises it for the agent, per spec: `executeTool` resolves to the JSON string of the returned value), so there is no MCP content-block wrapper.

Success: `{ "ok": true, ... }`. Rejection (mutation contradicting locked facts):

```json
{
  "ok": false,
  "error": "locked-fact-violation",
  "message": "Rejected: the copy contradicts the human-locked offer facts.",
  "violations": [
    { "rule": "discount-mismatch", "message": "Copy claims \"50%\" but the locked offer is 25%.",
      "found": "50%", "expected": "25%" }
  ],
  "next": "Retry update_scene with the discount stated as 25%."
}
```

Every rejection, on both surfaces, carries a `next` string naming the exact retry the agent should make: the human-approval-required rejection on `/closet` says to ask the shopper to press Approve next request and call the tool again; the locked-fact-violation rejection on `/studio` says to retry with the value the locked offer facts actually contain. The agent gets an instruction, not just an error code.

At consent level 0 (Private), `report_demand_gap` never reaches the approval gate at all:

```json
{
  "ok": false,
  "error": "sharing-disabled",
  "message": "The shopper set sharing to Private. Nothing leaves this page.",
  "next": "Ask the shopper to raise the sharing level on the closet page if they want the store to hear this request."
}
```

A successful `report_demand_gap` at consent level 2 (Context), shopping for a partner, with an occasion, returns the exact `DemandSignal` sent:

```json
{
  "ok": true,
  "sent": {
    "signalId": "1c2a9e7e-...",
    "kind": "gap",
    "category": "hoodie",
    "size": "L",
    "handle": null,
    "at": "2026-09-02T18:04:11.000Z",
    "level": "need",
    "occasion": "gift",
    "for": "partner",
    "consent": {
      "level": 2,
      "fields": ["category", "level", "size", "for", "fitPreference", "occasion"]
    },
    "context": { "fitPreference": "relaxed" }
  }
}
```

`get_offer` reads the same locked facts a human owns and adds `sizesInStock` and a `completeness` object (`locked`, `total`, `missing`) computed by the same `computeCompleteness` function the studio's completeness meter renders, so the two never drift:

```json
{
  "ok": true,
  "product": "Northlight Hoodie",
  "currency": "CAD",
  "regularPrice": 58,
  "salePrice": 43.5,
  "discountPercent": 25,
  "promoCode": "NL25",
  "validFrom": "2026-08-25",
  "validTo": "2026-09-07",
  "disclaimer": "Offer valid until Sep 7, 2026. While supplies last.",
  "purchaseUrl": "https://hemloop.app/products/northlight-hoodie",
  "sizesInStock": ["S", "M", "L"],
  "locked": true,
  "completeness": { "locked": 9, "total": 9, "missing": [] }
}
```

Guarantees the adapter enforces:

- Validation runs **before** the state callback; a rejected call applies nothing (AC-1).
- There is no lock/unlock tool (AC-2). `import_product` is registered only when the page passes an `importProduct` callback, and the studio's callback throws while facts are locked.
- `get_campaign_state`, `validate_claims`, `export_composition` and `get_offer` carry `readOnlyHint: true`. `get_wardrobe`/`get_preferences` (shopper-entered rows) and `import_product` (storefront data) carry `untrustedContentHint: true`, and the third-party text they return is wrapped in source-labelled fences (`<closet_data>` for shopper-entered rows, `<storefront_data>` for catalog text, the labels Anthropic's commerce-agents harness already reads) with a one-line preamble telling the agent not to follow instructions inside them. This fence-label convention is deliberate: a harness that already knows `closet_data`/`storefront_data` from Anthropic's commerce-agents article can consume Hemloop's results unchanged.
- Every `inputSchema` is closed with `additionalProperties: false`; `registerTool()` promises are awaited via `Promise.allSettled`, so the header badge counts confirmed registrations and a duplicate-name `InvalidStateError` or a `NotAllowedError` surfaces as `WebMCP registration rejected` instead of a silent "tools live".
- `export_composition` hands the HTML to the page through the `deliverExport` callback (the studio downloads it, same as the human Export button) and returns a summary, keeping every tool result inside Chrome's 1.5K-character output budget. `get_offer` reads the same locked facts and returns them as structured data (product, prices, promo code, validity dates, disclaimer, sizesInStock, purchaseUrl, completeness) instead of rendered copy, so a shopping agent can act on it directly.
- On the closet surface, no tool can arm sharing or raise the consent level. `report_demand_gap` rejects outright with `sharing-disabled` at consent level 0, otherwise rejects with `human-approval-required` until the human presses "Approve next request (level N)", then consumes that approval after one event, emitting only the fields `consentFieldsForRequest` allows for that level.
- Placement (`PLACEMENTS.story`/`.feed`/`.display`, 9:16/4:5/16:9) is a human-only choice in the studio UI; no WebMCP tool reads or writes `campaign.format.placement`.

## Spec and vendor guidance this build follows

Read on 2026-09-02 (not during planning, recorded in the coordination log): the [WebMCP spec](https://webmachinelearning.github.io/webmcp/), its [explainer](https://github.com/webmachinelearning/webmcp), Chrome's [WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) (best practices, build tools, secure tools, imperative API) and ChatGPT's [WebMCP page](https://learn.chatgpt.com/docs/webmcp).

| guideline | source | Hemloop |
|---|---|---|
| Namespace `document.modelContext`; tool names ASCII + `_ - .`, ≤128 chars | spec | yes |
| Name ≤30, description ≤500, parameter description ≤150, output ≤1.5K chars | Chrome secure-tools | yes (unit-tested for names/descriptions/schema; output verified per tool) |
| `readOnlyHint` on read-only tools; `untrustedContentHint` on user/external content | spec, Chrome | yes |
| `additionalProperties: false` on every schema | ChatGPT sample | yes |
| Await `registerTool()`; handle `InvalidStateError` / `NotAllowedError` | spec | yes |
| "Validate strictly in code, loosely in schema"; descriptive errors so the agent self-corrects | Chrome best-practices | the validator and `locked-fact-violation` / `human-approval-required` shapes |
| Consequential actions need a human step | Chrome, ChatGPT | the closet approval button and studio lock are human-only; no tool can arm either |
| No iframes, no declarative API (ChatGPT does not support them) | ChatGPT | none used |
| `Origin-Agent-Cluster: ?0` must not be sent; `Permissions-Policy` leaves `tools` at default | Chrome | verified on the live headers |

**Chrome without the flag: origin trial.** Chrome 149+ runs WebMCP on an origin that presents an origin-trial token, so judges need not touch `chrome://flags`. Register `https://hemloop.app` at the [WebMCP origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241), tokens live in `WEBMCP_ORIGIN_TRIAL_TOKENS` in `lib/proofframe/brand.ts` (one per origin: workers.dev and hemloop.app, both registered 2026-09-02, trial ends Nov 16 2026); the layout emits one `<meta http-equiv="origin-trial">` per token. ChatGPT desktop needs no token: site tools work on GPT-5.6 Sol/Terra in its built-in browser.

## The export format

`exportComposition` emits a self-contained HTML document in the open HyperFrames composition shape: a sized root `div[data-composition-id]` directly in `<body>`, one `section.clip` per scene with `data-start` / `data-duration` / `data-track-index`, and exactly one paused GSAP timeline registered at `window.__timelines["proofframe"]`. It is deterministic by construction: no clocks, no randomness, no network beyond the pinned GSAP CDN script, finite tweens only.

Rendering the export to video: any HyperFrames-compatible renderer works, e.g.

```sh
npx hyperframes check    # lint, layout, motion, contrast gates
npx hyperframes render   # produce the video file
```

run in the directory containing the exported `index.html`.

## Catalog snapshot

`catalog.json` is generated from the real development store (Admin API via Shopify CLI), then committed. To refresh:

```sh
shopify store execute --store playground-6mz3jwlf.myshopify.com \
  --query '{ shop { currencyCode } products(first: 20, query: "status:active") { nodes { title handle description variants(first:1){nodes{price compareAtPrice}} } } }'
```

then map into the `Catalog` shape in `lib/proofframe/shopify.ts` (fields: handle, title, description, currency, price, compareAtPrice). A live Storefront API importer can replace the snapshot without an interface change once a storefront access token exists.

## Verification

```sh
npx tsx --test tests/*.test.ts   # 63 unit tests
npx tsc --noEmit                 # typecheck
npx oxlint                       # lint (vendored components/ui excluded)
npm run dev                      # studio on localhost:3000/3001
```

Manual checks: the "Try a false claim" button exercises the full rejection path in-browser; the WebMCP badge shows "preview mode" without the browser flag, "7 WebMCP tools live" on `/closet`, and "10 WebMCP tools live" on `/studio`.

Verified runtime behaviour (Chrome 151, `chrome://flags/#enable-webmcp-testing`, live deployment):

- Chrome 151 exposes **`document.modelContext` only**; `navigator.modelContext` is undefined. The adapters probe both, so registration works either way.
- The testing API surface is `getTools()`, `executeTool(registeredTool, argsJsonString)`, `registerTool()`, `ontoolchange`. `executeTool` takes the RegisteredTool object from `getTools()` (not a name) and a JSON **string** of arguments; results return as the JSON string of whatever `execute` returned.
- Full loop proven end to end: `find_gaps` → `report_demand_gap` blocked with `human-approval-required` → human presses Approve → same call succeeds emitting an event with no shopper identifier → immediate retry blocked again (one-shot consumed) → the event appears in the studio's Incoming requests panel cross-page.

## Cloudflare deployment

The production app is deployed at `https://hemloop.app` (Worker custom domains for the apex and `www`; the zone lives on Cloudflare, the domain is registered at Vercel). `https://hemloop.marcoatwill.workers.dev` serves the same Worker and stays live as a fallback: `prepare:worker` pins `workers_dev: true`, because adding routes otherwise disables it silently. Use the pinned Wrangler version and sanitize Vinext's generated config before deployment:

```sh
npm run build
npm run prepare:worker
npm run deploy:worker
```

At the time of the verified deployment, `dist/server/wrangler.json` could contain a generated `legacy_env` field that Wrangler 4.127 rejects. `scripts/prepare-worker-config.mjs` removes only that field and is safe to rerun. Do not edit or commit the generated `dist` output.

## Constraints and non-goals

- Dev-store storefront endpoints are password-gated; do not ship Admin tokens client-side, ever.
- Date claims in copy are not parsed (disclaimer carries dates); see the ponytail note in `validator.ts`.
- Single campaign in page state; persistence is out of scope for the challenge build.
