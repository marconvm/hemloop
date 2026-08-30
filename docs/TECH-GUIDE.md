# ProofFrame Technical Guide

For developers. Product rationale lives in [PRD.md](./PRD.md); end-user flow in [USER-GUIDE.md](./USER-GUIDE.md).

## Architecture

```
MERCHANT (/)                                SHOPPER (/closet)
app/page.tsx                                app/closet/page.tsx
  └▶ components/proofframe-studio.tsx         └▶ components/closet-studio.tsx
        │ callbacks                                 │ callbacks
        ▼                                           ▼
   lib/proofframe/webmcp.ts (9 tools)         lib/proofframe/webmcp-closet.ts (6 tools)
        │ validates via                             │ pure logic in
        ▼                                           ▼
   validator.ts · exporter.ts                 closet.ts (gaps, fit, makeSignal+fnv1a)
   shopify.ts + catalog.json ◀────────────────┘ (check_fit reads the same catalog)

              lib/proofframe/signal-bridge.ts (localStorage + events)
   studio demand panel ◀── hashed DemandSignal only ◀── report_demand_gap
```

Both surfaces register tools on `navigator.modelContext` (fallback `document.modelContext`). The bridge carries only `DemandSignal` objects: hashed shopper id, category, size, optional handle.

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
| `lib/proofframe/closet.ts` | Shopper domain: wardrobe seed, findGaps, sizesOwned, checkFit (keyword category match against the catalog), fnv1a and makeSignal. Pure |
| `lib/proofframe/webmcp-closet.ts` | The 6 shopper tools. report_demand_gap is the single outbound tool and can only emit a makeSignal payload |
| `lib/proofframe/signal-bridge.ts` | localStorage transport for signals: 'storage' event cross-tab, CustomEvent same-tab, try/catch everywhere, 50-entry cap. Production successor: a queue/API (Render), same payload contract |

## The WebMCP contract

Registration probes `navigator.modelContext` then `document.modelContext` (the namespace moved between spec drafts). Each tool is `{ name, description, inputSchema, annotations?, execute }`; results are MCP text content blocks whose text is JSON.

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
- `get_campaign_state`, `validate_claims` and `export_composition` carry `readOnlyHint: true`.

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
npx tsx --test tests/*.test.ts   # 19 unit tests
npx tsc --noEmit                 # typecheck
npx oxlint                       # lint (vendored components/ui excluded)
npm run dev                      # studio on localhost:3000/3001
```

Manual checks: the "Try unsafe agent claim" button exercises the full rejection path in-browser; the WebMCP badge shows "preview mode" without the browser flag and "9 WebMCP tools live" with it.

## Constraints and non-goals

- Dev-store storefront endpoints are password-gated; do not ship Admin tokens client-side, ever.
- Date claims in copy are not parsed (disclaimer carries dates); see the ponytail note in `validator.ts`.
- Single campaign in page state; persistence is out of scope for the challenge build.
