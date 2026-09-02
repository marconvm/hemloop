# Hemloop Test Plan and Results

Last run: 2026-09-01 (America/Toronto). Scope: the Hemloop WebMCP prototype (Cloudflare Workers, synthetic data). Companion evidence in [VERIFICATION.md](./VERIFICATION.md); acceptance criteria in [PRD.md](./PRD.md).

Legend: PASS / FAIL / N-A (not applicable to a client-side synthetic-data hackathon prototype, with reason) / DEFERRED (needs a human step).

## 1. Functional Test — does each feature do what it should

| # | Case | Expected | Result |
|---|---|---|---|
| F1 | `find_gaps` on the seed wardrobe | Returns hoodie (missing) and jacket (thin) | PASS (unit + live runtime) |
| F2 | `check_fit` for a known handle | Maps category, returns owned size or "no history" | PASS (unit) |
| F3 | `get_my_sizes` brand filter | Dedupes, filters case-insensitively | PASS (unit) |
| F4 | `add_garment` valid/invalid | Valid appends; bad category or empty string rejected | PASS (unit) |
| F5 | `report_demand_gap` without approval | `human-approval-required`, nothing emitted | PASS (unit + live) |
| F6 | `report_demand_gap` after one approval | Emits zero-ID event; second call re-blocks | PASS (live, event #8bb9b54a) |
| F7 | Merchant `add_scene`/`update_scene` clean copy | Applies, visible in canvas | PASS (unit + browser) |
| F8 | `import_product` while locked / unlocked | Blocked when locked; imports when unlocked | PASS (unit + browser) |
| F9 | `export_composition` clean campaign | Delivers standalone HyperFrames HTML to the page (download) and returns `{ delivered, chars, scenes, durationSec }` under 1.5K chars | PASS (unit; `hyperframes check` 0 errors) |
| F10 | Disclaimer footer in export | Present for full duration, not a clip, not removable | PASS (unit) |

## 2. Smoke Test — does the deployed thing come up at all

| # | Case | Result |
|---|---|---|
| S1 | `GET /` 200, landing renders | PASS |
| S2 | `GET /studio` 200, studio renders | PASS |
| S3 | `GET /closet` 200, closet renders | PASS |
| S4 | WebMCP badges render (preview or live) | PASS |
| S5 | No uncaught console errors on load (framework error-boundary shims excluded) | PASS |

Command: `for p in "" studio closet; do curl -s -o /dev/null -w "%{http_code}" https://hemloop.marcoatwill.workers.dev/$p; done` → 200/200/200.

## 3. Integration Test — do the parts work together

| # | Case | Expected | Result |
|---|---|---|---|
| I1 | Closet emits signal → studio Live Demand receives it | Same-origin bridge delivers cross-page | PASS (live) |
| I2 | Studio "Build campaign from this" pulls the signalled product | Facts update from catalog snapshot | PASS (browser) |
| I3 | Validator ↔ both adapters ↔ UI share one source of truth | Rejection identical via tool call and UI button | PASS |
| I4 | Shopify catalog snapshot ↔ importer ↔ facts | Real store pricing maps correctly | PASS (unit) |
| I5 | Exporter output ↔ HyperFrames renderer | `hyperframes check` clean | PASS |

## 4. Regression Test — did new work break old work

| # | Case | Result |
|---|---|---|
| R1 | Full unit suite after every milestone | PASS — 41/41 at HEAD |
| R2 | `tsc --noEmit` after each change | PASS — clean |
| R3 | `oxlint` after each change | PASS — clean |
| R4 | Production build after each change | PASS |
| R5 | Blocked-claim demo still fires after the two-sided-loop refactor | PASS (browser) |

Regression guard = the committed test suite; each commit was gated on it.

## 5. User Acceptance Test (UAT) — does it meet the brief

Mapped to the Devpost judging criteria and the PRD acceptance criteria (AC-1…AC-12).

| # | Acceptance statement | Result |
|---|---|---|
| U1 | A shopper's agent finds gaps and requests demand without exposing identity or wardrobe (AC-10, AC-12) | PASS (live) |
| U2 | Sharing requires a human one-shot approval no tool can grant (AC-10) | PASS (live) |
| U3 | A merchant sees demand and answers it in a truth-locked workflow (AC-2, AC-11) | PASS |
| U4 | An unsafe agent claim is rejected before it applies, with a machine-readable reason (AC-1) | PASS (live + browser) |
| U5 | Export refuses on violations; disclaimer baked in (AC-3, AC-4) | PASS |
| U6 | Works as a plain editor without WebMCP (AC-8) | PASS (preview mode) |
| U7 | Repo ships license + PRD + guides (AC-9) | PASS (pending public push) |

## 6. Performance Test

| Metric | Target | Observed | Result |
|---|---|---|---|
| Worker startup | < 50 ms | 18 ms (deploy log) | PASS |
| Route TTFB (edge) | < 500 ms | 130–330 ms | PASS |
| Total upload / gzip | reasonable | 866 KiB / 254 KiB gzip | PASS |
| LCP element is an `<img>` / static hero | web-craft rule | Landing hero is text/CSS, no canvas LCP | PASS |
| No continuous below-fold animation loop | web-craft rule | Reveal uses one-shot IntersectionObserver | PASS |

Note: a full Lighthouse run is DEFERRED (not required for submission); the structural web-vitals traps from the web-craft checklist are cleared.

## 7. Security Test

Covered by a dedicated review pass (see [SECURITY.md](./SECURITY.md)). Summary of the in-scope surface:

| Area | Result |
|---|---|
| Tool-argument → DOM injection (exporter HTML escaping) | see SECURITY.md |
| Trust-boundary bypass (locked facts, share approval one-shot) | see SECURITY.md |
| Privacy (zero-ID signal, no wardrobe leak) | see SECURITY.md |
| Committed secrets | none (synthetic data only; no tokens in repo) |
| Review loop (closed) | Six passes: Claude first pass, Codex independent second pass, then a fix↔replay loop (passes 3–6). Every finding (SEC-1/2, PF2-1…6, PF4-1…6, PF5-1) fixed with a regression test and, where tool-reachable, a live-runtime replay. Pass 6 clean; SECURITY.md closed for this submission |
| Dependency audit | Runtime CVE-2026-44907 (`react-server-dom-webpack`) FIXED by upgrading the React trio to 19.2.8. Remaining advisories are build/dev tooling only (Vinext image-size, Windows-only Vite/esbuild, Undici under Miniflare) — not on a Worker request path; re-evaluate on the next Vinext upgrade |

## 8. Penetration Test (adversarial-agent, in-scope subset)

A full external pentest is out of scope for a synthetic-data prototype; the relevant threat model is a hostile AI agent driving the registered tools. Adversarial cases exercised:

| # | Attack | Result |
|---|---|---|
| P1 | Agent calls `report_demand_gap` repeatedly to force a send without approval | Blocked every time; approval is one-shot and UI-only |
| P2 | Agent submits `<script>`/attribute-breakout copy, then exports | Escaped in export (unit test `exporter escapes HTML`) |
| P3 | Agent writes "50% off / guaranteed" against a 25% locked offer | Rejected atomically, nothing applied |
| P4 | Agent tries to call a lock/unlock tool | No such tool exists on either surface |
| P5 | Agent enumerates tools for a hidden identity field | `getTools()` surface carries no identity tool; DemandSignal schema has no id field |
| P6 | Agent attaches an unadvertised `style` property to break out of the export `<style>` block | Live replay: property dropped by `parseSceneInput`, export clean; also colour-allowlisted in the exporter (PF2-1) |
| P7 | Agent sends malformed field types to crash the canvas/exporter | Live replay: rejected as `invalid-input`, nothing stored (PF2-2) |
| P8 | Agent evades the validator with Arabic-Indic/Persian digits or format controls | Normalized and flagged (PF2-3) |
| P9 | Agent passes a non-array with a `length` to `reorder_scenes` | `invalid-input`, no throw (PF4-2, live) |
| P10 | Agent floods `add_scene` / stretches `update_scene` to inflate the campaign | Scene cap 12 and projected total ≤ 60 s enforced before any callback (PF4-3, PF5-1, live) |
| P11 | Malicious base style or injected `shopperId` in stored signals | Base colours allowlisted with safe defaults; `readSignals` rebuilds exact-key signals (PF4-1, PF4-6) |

The earlier deep findings (unicode/whitespace bypass, extra-property XSS, malformed-input DoS) were surfaced in the SECURITY.md second pass and are now fixed with regression tests; P6–P8 above enter through the real `buildTools()` tool boundary, not just the validator.

## 9. Disaster Recovery Test

| # | Scenario | Behaviour | Result |
|---|---|---|---|
| D1 | localStorage unavailable (private mode / blocked) | Bridge try/catch: closet still works, studio simply receives nothing | PASS |
| D2 | Corrupt localStorage payload | `readSignals` returns `[]` on JSON error | PASS |
| D3 | WebMCP runtime absent | Both surfaces fall back to preview mode, fully usable | PASS |
| D4 | Bad worker version deployed | `wrangler rollback` to a prior Version ID (immutable versions retained) | PASS (mechanism available) |
| D5 | Source loss | Full git history; can rebuild + redeploy from clone | PASS |
| D6 | Catalog snapshot stale | One CLI command regenerates `catalog.json` (documented in TECH-GUIDE) | PASS |

Recovery objective for a prototype: redeploy from git + `wrangler deploy` in minutes; no stateful backend to restore.

## 10. Go-Live Checklist

- [x] All unit tests green (41/41), tsc clean, oxlint clean, production build clean
- [x] Live deployment reachable on HTTPS, all three routes 200
- [x] Real WebMCP runtime verified on the live URL (Chrome 151)
- [x] Disclaimer/claim trust boundaries verified in the real runtime
- [x] MIT license in repo
- [x] PRD, user guide, tech guide, test plan, verification record committed
- [x] SECURITY.md CLOSED: six review passes (two independent reviewers, fix↔review loop), all findings fixed with regressions and live-runtime replays; Pass 6 clean
- [ ] Repo pushed public; license visible in host About
- [ ] `hemloop.app` DNS cut over; HTTPS cert valid
- [ ] Demo video recorded (< 3 min, audio, public YouTube)
- [ ] ChatGPT natural-language pairing confirmed or Chrome fallback documented
- [ ] Devpost form submitted before 2026-09-03 13:00 PDT
- [x] Runtime dependency CVE (react-server-dom-webpack) fixed; remaining advisories are build/dev tooling only, logged for the next Vinext upgrade
- [ ] Post-submission freeze: after the deadline, touch nothing (fork to keep building)
