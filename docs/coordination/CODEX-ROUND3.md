# Codex Round 3 review — Hemloop post-revamp

Date: 2026-09-02  
Reviewer: Codex  
Review target: current `main` (`88b3905` brief; live facts report Worker `0e5f2e3b`)  
Scope: independent review only; no implementation or deployment changes made.

## Verdict summary

| Axis | Verdict | Reason | Size |
|---|---|---|---|
| Design / dependencies | **KEEP** | The reduced dependency surface and existing Vinext/Workers pipeline are the lowest-risk path before the deadline. | S |
| Code structure | **CHANGE one security path; DEFER refactors** | The pure domain/adapters split is good, but wardrobe output and persisted consent need stricter integrity/budget handling. | S/M |
| Setup / platform | **KEEP; CHANGE only observability evidence** | Custom domain, origin-trial metadata, headers, stealth, and Workers configuration fit the demo. Check CPU metrics; do not buy Paid pre-emptively. | S |

## A. Requested security replays

Replayed directly against `lib/proofframe/webmcp-closet.ts`, `closet.ts`, `webmcp.ts`, and `signal-bridge.ts` with hostile callback/storage fixtures. Full suite also passes **63/63**, TypeScript and oxlint clean.

### A(a) Agent sends above the shopper dial — **CLEAN at the tool boundary**

With `getConsentLevel() === 1`, a request containing agent-supplied `level: 3` and `consent.fields: ['taste']` emitted a signal with consent level `1` and fields derived by `consentFieldsForRequest` (`category`, `level`, and present `size`). The agent cannot set the dial.

### A(b) Agent widens `consent.fields` — **CLEAN through the tool; CHANGE storage integrity**

Tool arguments cannot inject consent fields: the tool reconstructs the grant from the UI-owned level and request presence. However, a hostile same-origin localStorage record was accepted with `consent.level: 1` and `fields: ['category', 'priceCeiling']`; `readSignals()` filters field names but does not enforce the level-to-field relationship. This is not an agent-call path, but it means persisted client data is not integrity-authenticated. Minimum fix: normalize/reject fields against the consent level (and required-field contract) during readback; document localStorage as a client-integrity boundary.

### A(c) Forge/replay `signalId` — **CLEAN through the tool; client-storage caveat**

An attacker-supplied `signalId` argument is ignored; the emitted signal received a fresh `crypto.randomUUID()` value, and the one-shot approval prevents an immediate second send. As with (b), a script that can write same-origin localStorage can manufacture an arbitrary stored event id; the current local-only bridge has no server authentication mechanism. This is acceptable for the demo's zero-identifier privacy claim, but should not be described as tamper-proof telemetry.

### A(d) Break out of `<closet_data>` — **CLEAN**

Hostile brand/colour values containing closing and reopening fence markers were replaced at a fixpoint and returned inside one labelled fence. Bidi/control characters are stripped. No fence breakout was observed.

### A(e) Write offer facts through any tool — **CLEAN under the UI contract**

The merchant tools expose no facts setter or lock/unlock operation. `import_product` is the only tool associated with facts and delegates to the page callback; the shipped studio callback refuses imports while facts are locked, and the lock transition is human-only. Keep the `get_offer` prose precise: it returns facts plus lock state, not intrinsically immutable facts.

### A(f) Exceed 1.5K from `get_wardrobe` — **CHANGE**

A hostile wardrobe row with long `image`, `material`, `retailer`, and `colour` strings produced a serialized tool result of approximately **15.4K characters**. Only brand/colour are currently truncated; the object spread passes other optional fields through unchanged. Minimum fix: construct an explicit response shape, truncate every string field, bound arrays/row count, and test a hostile row against the 1.5K budget. This is the only replay that directly violates the stated output-budget requirement.

## B. Privacy and product-copy claims

The central claims remain supported: no shopper/account identifier crosses the bridge, approval is human-only and one-shot, and the consent fields are computed by shared pure code. Two claims need correction before submission:

1. Level 2 also sends `for` (who the shopper is shopping for), so summaries that list only occasion and fit preference are incomplete.
2. “`get_offer` reads locked facts only” is too strong while facts are unlocked; say it returns offer facts together with their human-lock status.

At level 3 the combination of size, fit, colour, materials, price ceiling, and profile can be a quasi-identifier. The current no-account-ID wording is still accurate, but avoid implying that the payload is impossible to fingerprint.

## C. Keep / change / defer decisions

### Design

- **KEEP (S):** React 19.2.8, TypeScript 5.9, Tailwind 4.2, Vite 8, Wrangler 4.127, and the reduced runtime dependency set.
- **KEEP (M):** Vinext beta for this submission. Migrating to stable Next/OpenNext or Astro would be a larger deadline risk than the known beta risk.
- **DEFER (S):** Exact-pin caret ranges and any further dependency pruning until after judging; `npm ci` plus the lockfile is sufficient for now.
- **KEEP (S):** No new service, database, queue, Smart Placement, Tail Workers, or paid add-on.

### Code structure / compatibility

- **KEEP (S):** Pure `lib/proofframe` domain functions with separate closet/merchant adapters, exporter, bridge, and UI-owned state.
- **CHANGE (S):** Bound and explicitly map all `get_wardrobe` output fields; add the hostile-output regression.
- **CHANGE (S):** Enforce consent-field semantics when rebuilding signals from storage; preserve the tool-boundary derivation.
- **DEFER (M):** Splitting the 1,300-line studio and 1,000-line closet components. Refactoring now is larger than its judging value.
- **KEEP (S):** `document.modelContext` primary probe with `navigator.modelContext` fallback, `crypto.randomUUID`, Unicode normalization, and CSS fallbacks as progressive enhancement for non-demo browsers.

### Setup / platform

- **KEEP (S):** `hemloop.app` plus `workers.dev`, origin-trial metadata, HSTS/nosniff/Referrer-Policy/Permissions-Policy, immutable hashed-asset caching, and robots/noindex until the deadline.
- **CHANGE (S):** Inspect Workers CPU-time p50/p95/p99 and `exceededCpu`/1102 invocation errors. Free CPU is 10 ms/request; enable Paid only for sustained limit pressure or actual failures, not p99 proximity alone.
- **DEFER (S):** CSP, Smart Placement, custom limits, routes/placement tuning, and paid observability until after submission unless a live failure demands them.

## Top five before 13:00 PT

1. Bound `get_wardrobe` to an explicit, truncated response under 1.5K and add the hostile-row test.
2. Normalize/reject persisted `consent.fields` that exceed their consent level.
3. Fix level-2 “what leaves” copy to include `for` / who is being shopped for.
4. Correct stale counts/labels in public writeup and verification docs (17 tools, 7 closet, 63 tests).
5. Check Workers CPU metrics and invocation errors once; record the result without changing plan unless there is evidence of pressure.

## Do not touch in the final hours

Do not migrate frameworks, add services, enable Smart Placement/Tail Workers/Paid speculatively, refactor the large UI components, add CSP without a complete script/runtime test, or remove the robots/noindex gate before the challenge closes. Do not publish coordination working notes or deploy this review report without Marco's explicit submission decision.
