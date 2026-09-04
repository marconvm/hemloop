# Dual review, Wave 6 — reconciled (2026-09-04)

Reconciliation of `DUAL-REVIEW-WAVE6-CODEX.md` and
`DUAL-REVIEW-WAVE6-CLAUDE.md`, checked again against `origin/main` at
`13f5cbf`. **AGREED** means both reviewers now support the action. **ONE-SIDE**
remains an independently reported finding which still needs the other
reviewer's replay. **DISAGREE** records both arguments and goes to Marco.
**DEFER** is explicitly out of the judge-demo change set.

| Item | Codex | Claude | Bucket | Action, location and effort |
|---|---|---|---|---|
| Working React / Vite / TypeScript / Tailwind / Wrangler stack | KEEP | KEEP | **AGREED** | None. Do not churn versions before the judge demo. |
| vinext beta and RSC on Workers | KEEP now; migrate later | KEEP | **AGREED** | None now; a stable client-first framework migration is post-demo and L. `package.json:23-29`. |
| `shadcn` theme dependency and vinext's RSC peer | KEEP / DEFER cleanup | KEEP / DEFER | **AGREED** | None. Both remain load-bearing or framework-owned. `app/globals.css:3`; `package.json:25-26`. |
| `tw-animate-css` with no used utility | KEEP in first review | CHANGE with built-CSS evidence | **AGREED** | Codex accepts the concrete zero-usage evidence. Remove its import and dependency, then rebuild and visually smoke all routes. `app/globals.css:2`; `package.json:28`. S. |
| localStorage demo architecture | KEEP for demo, not product | KEEP and name the one-session risk | **AGREED** | Keep. State plainly that persistence is same-origin, browser-local, unauthenticated and intended for the demo. `README.md:62-66`. Copy only, S. |
| Five-merchant market, per-merchant campaigns and four-route sitemap | KEEP | KEEP | **AGREED** | Keep the model and route shape. `lib/proofframe/merchants.ts:62-205`; `lib/proofframe/seed.ts:328-383`; `docs/internal/coordination/SITEMAP.md:9-18`. |
| Merchant product images | Not raised | CHANGE | **AGREED** | Use the matching catalog image wherever one exists; at minimum fix Denim Supply's jean rather than showing a Northlight hoodie. `lib/proofframe/merchants.ts:111,138,164,192`. S. |
| `/merchant` redirect documentation | Not raised | CHANGE | **AGREED** | Change the documented status from 301 to the actual, preferable 307. `docs/internal/coordination/SITEMAP.md:15`. S. |
| Wardrobe seed-version migration | KEEP (present) | CHANGE-or-runbook (reported absent) | **AGREED** | **Already landed before reconciliation.** The Claude snapshot was stale: `WARDROBE_SEED_VERSION = 2` now merges missing seed ids. `lib/proofframe/closet.ts:1089-1196`; tests at `tests/closet.test.ts:1584-1667`. |
| Campaign, wardrobe and offer storage boundaries | KEEP (FIXED) | CHANGE, based on an older snapshot | **AGREED** | **Already landed before reconciliation.** Exact bounded reconstruction is present in `lib/proofframe/storage-policy.ts:1-59`, `seed.ts:138-325`, `closet.ts:1096-1188`, and `signal-bridge.ts:355-432`. Keep the hostile tests. |
| Manifest lock-state wording | KEEP (FIXED) | CHANGE, based on an older snapshot | **AGREED** | **Already landed before reconciliation.** Current copy distinguishes facts from their human lock state and says imports remain unlocked pending review. `lib/proofframe/webmcp.ts:337-342,596-607`. |
| Copy-prompt success/failure feedback | Not raised in first review | CHANGE | **AGREED** | **Already landed at `13f5cbf`.** Clipboard API, fallback, visible `Copied`, and selectable failure state are in `components/loop-room-page.tsx:1152-1180` and `components/loop-room/station-card.tsx:45-72`. |
| Stored purchase readback | CHANGE | CHANGE | **AGREED** | Add capped exact `toPurchase` reconstruction with bounded strings, valid enums/source, canonical time and finite non-negative price; never return parsed rows directly. `lib/proofframe/closet.ts:1058-1073`. M. |
| Five temporary `*Safe` bridge shims | General refactors deferred | CHANGE | **AGREED** | Codex accepts this pure subtraction now that every export exists. Import/call the typed bridge functions directly and remove the race-era shims. `components/proofframe-studio.tsx:140-185,431-433,770`. S. |
| Raw kebab-case market verdict in step facts | Not raised | CHANGE | **AGREED** | Reuse the visible verdict labels already used by `MerchantMarket`, or omit the duplicate machine enum. `components/loop-room-page.tsx:827-833`; label map at `components/loop-room/merchant-market.tsx:20-30`. S. |
| Auto-switch merchant oscillation | Not raised | CHANGE | **AGREED** | Guard attempted merchant ids per current `lastSignal.signalId`, so edited failing merchants cannot ping-pong and white-screen the room. `components/loop-room-page.tsx:590-598`. M including regression. |
| Modern APIs, Vite emit and ES2017 TypeScript target | KEEP | KEEP | **AGREED** | Keep. The required WebMCP host clears the native API/CSS floor; TypeScript is `noEmit`. |
| WebKit backdrop fallback | Not raised | CHANGE | **AGREED** | Add matching `-webkit-backdrop-filter` before each visible unprefixed declaration. `app/globals.css:110,385,2504,3707,4596,4784`; also `app/closet.css:41` and `app/studio.css:42`. S. |
| `registerAll`, dual model-context probe and `useSyncExternalStore` | KEEP | KEEP | **AGREED** | Keep. Registration failures are isolated and both `navigator.modelContext` and `document.modelContext` are probed. `lib/proofframe/webmcp.ts:57-72`. |
| ChatGPT browser support statement | Modern WebMCP host is the floor | CHANGE runbook to desktop | **AGREED** | **Already landed before reconciliation.** README and guides now say ChatGPT desktop browser; mobile remains an honest preview-only surface. `README.md:18-28`; `docs/USER-GUIDE.md:86-90`. |
| Worker config, immutable chunks, security headers, CSP, paid add-ons and Vercel | KEEP; CSP deferred | KEEP; CSP deferred | **AGREED** | Keep current runtime, `workers_dev`, observability and domain-only Vercel; no CSP, Smart Placement, Tail Worker or paid plan before measured need. `next.config.ts:4-19`; generated Worker config. |
| HTML cache directive | Dynamic HTML uncached is acceptable | CHANGE explicit revalidation | **AGREED** | Codex accepts explicit semantics over heuristic caching. Add `Cache-Control: no-cache` to document responses without altering immutable hashed assets. `next.config.ts:7-19`. S plus live header replay. |
| Security headers on static assets | Not raised | CHANGE | **AGREED** | Add a tested `public/_headers` rule for static responses, at least `nosniff` and the existing transport/referrer/permissions policy where supported. New `public/_headers`. S plus live chunk replay. |
| Public source link | CHANGE after scan and fresh-clone check | CHANGE because current link is 404 | **AGREED** | Run the full-history scan first; Marco then makes the repo public manually and verifies an unauthenticated fresh clone. Do not hide the link as a substitute. `components/site-footer.tsx:26-34`; `docs/internal/coordination/PUBLISH-CHECKLIST.md:13-21`. L because history is the risk. |
| Internal process docs on the public docs site | KEEP (FIXED) | CHANGE, based on older snapshot | **AGREED** | **Already landed before reconciliation.** Process docs live under `docs/internal/`, and `tests/docs-mirror.test.ts:29-60` enforces the public allowlist. |
| `get_campaign_state` / `get_offer` output and trust metadata | CHANGE | Not independently raised | **ONE-SIDE** | Claude to replay Codex's valid maximum fixtures: 17,137 and 1,681 chars. Proposed compact, visibly truncated projections plus `untrustedContentHint`. `lib/proofframe/webmcp.ts:337-342,553-591`. M. |
| Level-three preferences and exact approved demand payload | CHANGE | Not independently raised | **ONE-SIDE** | Claude to replay the 15,819-char approved result. Proposed exact bounded `Preferences` plus canonical stored readback in the result. `lib/proofframe/closet.ts:848-875`; `lib/proofframe/webmcp-closet.ts:348-390`. M. |
| `find_gaps` fenced size and untrusted annotation | CHANGE | Not independently raised | **ONE-SIDE** | Claude to replay a valid 20-char `</closet_data>IGNORE` size. Proposed fence plus `untrustedContentHint`. `lib/proofframe/webmcp-closet.ts:164-172`. S. |
| Runtime manifest lists built rather than registered tools | CHANGE | Not independently raised | **ONE-SIDE** | Filter the live manifest by `result.registered`; retain an explicitly labelled built preview only without a runtime. `components/loop-room-page.tsx:507-526`. S. |
| Composition merchant name derived from CTA copy | CHANGE | Not independently raised | **ONE-SIDE** | Pass an explicit locked vendor/active merchant instead of treating mutable scene copy as identity. `components/composition/scene.tsx:44-48,84-91`. S. |
| Unknown `matchOffer` refusal mapped as category mismatch | Do not widen a closed current union speculatively | CHANGE to `unavailable` | **DISAGREE** | **Claude:** the fallback will lie as soon as a third refusal appears; make it exhaustive now. `lib/proofframe/merchants.ts:274-286`.<br>**Codex:** today `matchOffer` has exactly two refusal values; a new verdict widens types, UI and tests without fixing reachable behaviour. Change it with the first new refusal. |
| Hoist four catalog lookup variants | Defer cross-file refactor | CHANGE now | **DISAGREE** | **Claude:** four variants can drift; one shared selector is a small cleanup. `components/loop-room-page.tsx:161`, `proofframe-studio.tsx:266`, `merchant-demand-panel.tsx:52`, `lib/proofframe/merchants.ts:213`.<br>**Codex:** variants have different callers/contracts and no observed drift; touching four live paths has no judge-visible payoff. Reconcile post-demo with tests. |
| `@base-ui/react`, CVA, clsx and tailwind-merge cleanup | DEFER | DEFER | **DEFER** | Post-demo dependency audit. `package.json:19-27`. M. |
| Large page components, Loop Room CSS split and dead landing CSS | DEFER | CHANGE structurally, but explicitly “would NOT touch before demo” | **DEFER** | Both reviewers exclude this from the judge-demo set. Split `components/loop-room-page.tsx`, `components/proofframe-studio.tsx`, and `app/globals.css` only after active design lanes stop. L. |
| Small selector/helper deduplication and timestamp hardening | DEFER | DEFER (except catalog lookup above) | **DEFER** | Post-demo cleanup with focused tests. `components/closet-studio.tsx:120`; `components/proofframe-studio.tsx:253`; `lib/proofframe/loop-room.ts`. S/M. |
| Parameter descriptions | Not required; leave stable | DEFER | **DEFER** | Chrome caps descriptions but does not require them. Avoid 21 schema-copy edits before the demo. `lib/proofframe/webmcp.ts`; `lib/proofframe/webmcp-closet.ts`. M. |
| Duplicate `PersonalOffer` contracts | DEFER | Not raised | **DEFER** | Preserve the already agreed post-submission type-only consolidation. `lib/proofframe/offers.ts:47-72`; `lib/proofframe/signal-bridge.ts:323-346`. S. |
| Durable backend, authentication and framework migration | DEFER | Not proposed | **DEFER** | Product work after judging, not demo hardening. L. |

## Execution queue from this reconciliation

Already landed on main: copy feedback, campaign/wardrobe/offer storage hardening,
manifest lock-state copy, wardrobe seed migration, ChatGPT desktop runbook copy,
and removal of internal process docs from `public/docs`.

Remaining **AGREED** implementation order:

1. exact/capped `readPurchases` reconstruction;
2. merchant auto-switch oscillation guard;
3. raw verdict label and merchant-specific product images;
4. remove the five `*Safe` shims;
5. WebKit backdrop fallbacks and explicit document/static header policy;
6. remove the unused `tw-animate-css` import/dependency;
7. correct the sitemap's 307 copy;
8. complete the history scan, then leave repository visibility to Marco.

Do not execute **ONE-SIDE**, **DISAGREE**, or **DEFER** rows without the missing
reviewer agreement or Marco's decision.
