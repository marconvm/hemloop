# Hemloop Technical Guide

For developers. Product rationale lives in [PRD.md](./PRD.md); end-user flow in [USER-GUIDE.md](./USER-GUIDE.md).

## Architecture

```
MERCHANT (/studio)                                SHOPPER (/closet)
app/studio/page.tsx                                app/closet/page.tsx
  └▶ components/proofframe-studio.tsx         └▶ components/closet-studio.tsx
        │ callbacks                                 │ callbacks
        ▼                                           ▼
   lib/proofframe/webmcp.ts (9 tools)         lib/proofframe/webmcp-closet.ts (6 tools)
        │ validates via                             │ pure logic in
        ▼                                           ▼
   validator.ts · exporter.ts                 closet.ts (gaps, fit, zero-ID makeSignal)
   shopify.ts + catalog.json ◀────────────────┘ (check_fit reads the same catalog)

              lib/proofframe/signal-bridge.ts (localStorage + events)
   studio demand panel ◀── zero-ID DemandSignal only ◀── approved report_demand_gap
```

Both surfaces register tools on `navigator.modelContext` (fallback `document.modelContext`). The bridge carries only `DemandSignal` objects: event id, kind, category, size, optional handle and time. There is no shopper identity field. `report_demand_gap` also requires and consumes a human-only one-shot approval.

Design rule: `lib/proofframe/*` is pure and framework-free (no React, no DOM at module scope). The studio owns all state and passes callbacks in; the adapter owns no state at all. This is what makes the whole tool surface unit-testable without a browser.

## Modules

| File | Responsibility |
|---|---|
| `lib/proofframe/types.ts` | Domain types. `factsLocked` is UI-only by design |
| `lib/proofframe/validator.ts` | Pure claim validator: % claims, $ prices, promo codes, banned phrases, durations. No DOM, network or clock |
| `lib/proofframe/exporter.ts` | Emits a standalone HyperFrames composition. Throws on violations. Escapes all copy. Force-renders the disclaimer as a non-clip footer |
| `lib/proofframe/webmcp.ts` | `buildTools(callbacks)` and `registerProofFrameTools(callbacks, mc?)`. Mutating tools validate before applying and return structured rejections |
| `lib/proofframe/shopify.ts` | `makeCatalogImporter` maps snapshot products to campaign facts. Promo terms stay human-owned |
| `lib/proofframe/catalog.json` | Committed snapshot of the playground store catalog |
| `lib/proofframe/closet.ts` | Shopper domain: wardrobe seed, findGaps, sizesOwned, checkFit (keyword category match against the catalog), and zero-ID makeSignal. Pure |
| `lib/proofframe/webmcp-closet.ts` | The 6 shopper tools. report_demand_gap is the only merchant-facing tool, requires human one-shot approval, and can only emit a makeSignal payload |
| `lib/proofframe/signal-bridge.ts` | localStorage demo transport for signals: 'storage' event cross-tab, CustomEvent same-tab, try/catch everywhere, 50-entry cap. A production relay would keep the same minimized payload contract and add aggregation thresholds |

## The WebMCP contract

Registration targets `document.modelContext` (the spec's namespace; `navigator.modelContext` is probed first only as a fallback for older drafts). Each tool is `{ name, description, inputSchema, annotations?, execute }`. `execute` returns a plain JSON object — the browser serialises it for the agent (spec: `executeTool` resolves to the JSON string of the returned value), so there is no MCP content-block wrapper.

Success: `{ "ok": true, ... }`. Rejection (mutation contradicting locked facts):

```json
{
  "ok": false,
  "error": "locked-fact-violation",
  "message": "Rejected: the copy contradicts human-locked campaign facts. …",
  "violations": [
    { "rule": "discount-mismatch", "message": "Copy claims \"50%\" but the locked offer is 25%.",
      "found": "50%", "expected": "25%" }
  ]
}
```

Guarantees the adapter enforces:

- Validation runs **before** the state callback; a rejected call applies nothing (AC-1).
- There is no lock/unlock tool (AC-2). `import_product` is registered only when the page passes an `importProduct` callback, and the studio's callback throws while facts are locked.
- `get_campaign_state`, `validate_claims` and `export_composition` carry `readOnlyHint: true`. `get_wardrobe` (shopper-entered rows) and `import_product` (storefront data) carry `untrustedContentHint: true`.
- Every `inputSchema` is closed with `additionalProperties: false`; `registerTool()` promises are awaited via `Promise.allSettled`, so the header badge counts confirmed registrations and a duplicate-name `InvalidStateError` or a `NotAllowedError` surfaces as `WebMCP registration rejected` instead of a silent "tools live".
- `export_composition` hands the HTML to the page through the `deliverExport` callback (the studio downloads it, same as the human Export button) and returns a summary, keeping every tool result inside Chrome's 1.5K-character output budget.
- On the closet surface, no tool can arm sharing. `report_demand_gap` rejects with `human-approval-required` until the human presses “Approve next signal”, then consumes that approval after one event.

## Spec and vendor guidance this build follows

Read on 2026-09-02 (not during planning — recorded in the coordination log): the [WebMCP spec](https://webmachinelearning.github.io/webmcp/), its [explainer](https://github.com/webmachinelearning/webmcp), Chrome's [WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) (best practices, build tools, secure tools, imperative API) and ChatGPT's [WebMCP page](https://learn.chatgpt.com/docs/webmcp).

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

**Chrome without the flag — origin trial.** Chrome 149+ runs WebMCP on an origin that presents an origin-trial token, so judges need not touch `chrome://flags`. Register `https://hemloop.marcoatwill.workers.dev` at the [WebMCP origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241), paste the token into `WEBMCP_ORIGIN_TRIAL_TOKEN` in `lib/proofframe/brand.ts`, rebuild and deploy; the layout emits `<meta http-equiv="origin-trial">` only when the constant is set. ChatGPT desktop needs no token: site tools work on GPT-5.6 Sol/Terra in its built-in browser.

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
npx tsx --test tests/*.test.ts   # 33 unit tests
npx tsc --noEmit                 # typecheck
npx oxlint                       # lint (vendored components/ui excluded)
npm run dev                      # studio on localhost:3000/3001
```

Manual checks: the "Try unsafe agent claim" button exercises the full rejection path in-browser; the WebMCP badge shows "preview mode" without the browser flag and "9 WebMCP tools live" with it.

Verified runtime behaviour (Chrome 151, `chrome://flags/#enable-webmcp-testing`, live deployment):

- Chrome 151 exposes **`document.modelContext` only**; `navigator.modelContext` is undefined. The adapters probe both, so registration works either way.
- The testing API surface is `getTools()`, `executeTool(registeredTool, argsJsonString)`, `registerTool()`, `ontoolchange`. `executeTool` takes the RegisteredTool object from `getTools()` (not a name) and a JSON **string** of arguments; results return as the JSON string of whatever `execute` returned.
- Full loop proven end to end: `find_gaps` → `report_demand_gap` blocked with `human-approval-required` → human presses Approve → same call succeeds emitting the zero-ID event → immediate retry blocked again (one-shot consumed) → the event appears in the studio's Live Demand panel cross-page.

## Cloudflare deployment

The production app is deployed at `https://hemloop.marcoatwill.workers.dev`. Use the pinned Wrangler version and sanitize Vinext's generated config before deployment:

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
