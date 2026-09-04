# Hemloop Security Review

Reviewed 2026-09-01. Threat model: an untrusted AI agent calls the registered WebMCP tools with arbitrary arguments. Scope: the client-side app (two tool adapters, validator, exporter, signal bridge, closet logic, two studio components), static docs renderer, generated Worker config, and dependency advisories. Out of scope by design: absence of backend/auth for this synthetic-data prototype and platform-level rate-limiting.

## Findings and resolutions

| # | Severity | Finding | Status |
|---|---|---|---|
| SEC-1 | HIGH | `scene.kind` was agent-controlled and reached the exported HTML unescaped and un-validated, allowing attribute breakout → stored XSS in the exported composition. | **PARTIAL** — original vector fixed; see PF2-1 |
| SEC-2 | MEDIUM | Claim validator could be evaded (bare decimal price with no `$`, promo code without the word "code", full-width / Arabic-Indic unicode digits), letting false claims pass. | **PARTIAL** — see PF2-3 |
| SEC-3 | — | Trust boundary: no tool can lock/unlock or mutate locked facts; share approval is one-shot with no TOCTOU (synchronous check-and-consume, single-threaded). | CLEAN |
| SEC-4 | — | Privacy: `DemandSignal` carries only `signalId` (per-event `crypto.randomUUID()`), kind, category, size, handle, at — no shopper id, hash, or wardrobe rows; `get_wardrobe` output never enters a signal. | CLEAN |
| SEC-5 | — | No secrets committed; `Math.random` only used for React keys (not security); `signalId` uses `crypto.randomUUID()`; no prototype-pollution sink; validator regexes are linear (no ReDoS). | CLEAN |

## SEC-1 fix detail

`scene.kind` is now runtime-validated against the enum in `validateScene` (validator.ts), so both `add_scene` and `update_scene` reject an invalid kind before applying — the same discipline the closet tools already used for `GARMENT_CATEGORIES`. Defence in depth: the exporter also `escapeHtml`s `scene.kind` (exporter.ts). Regression test: "validator rejects an invalid scene kind (XSS vector)". This closes the original `kind` breakout but not the separate extra-property/CSS path in PF2-1.

## SEC-2 fix detail

`validateText` now NFKC-normalizes and strips a small set of zero-width characters before matching; prices are caught with or without a currency symbol; and, when a locked promo code exists, a different capitalized alnum token is flagged without requiring the literal word "code". Regression test: "validator catches evasion: no-$ price, codeless code, unicode digits". Full-width digits are covered, but the broader Arabic-Indic/format-control claim was not met; see PF2-3.

Residual (accepted for a prototype): spelled-out numbers ("twenty-five percent") are still not parsed; the locked disclaimer carries the authoritative figures and the exporter always renders it.

## First-pass dependency note (superseded)

The first pass recorded sharp/libvips build-time CVEs. The 2026-09-01 second-pass audit no longer reports those entries and instead reports the dependency set in PF2-4. Treat this paragraph as historical, not the current audit result.

## First-pass verdict (superseded)

The first pass rated the app LOW risk. The independent replay below supersedes that rating while preserving the original review record.

## Second pass (Codex)

Independently reviewed 2026-09-01 against the same arbitrary-WebMCP-arguments threat model, plus the static documentation renderer, approval delivery semantics, deployed Worker configuration, and current dependency advisories. No deployment was performed.

### Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| PF2-1 | **HIGH** | SEC-1 is still exploitable through extra `add_scene` properties: agent-supplied `style` survives the adapter/UI spreads and is interpolated raw into the export's `<style>` block, enabling stored XSS. | **OPEN** |
| PF2-2 | **MEDIUM** | Merchant scene fields have no runtime type/length parser. Malformed JSON can be accepted, stored, and crash the React canvas/exporter; the runtime duration rule also disagrees with the schema minimum. | **OPEN** |
| PF2-3 | **MEDIUM** | SEC-2 remains bypassable with Arabic-Indic/Persian digits and format controls; codeless promo claims pass when the locked code is `null`. Bare decimal matching also creates false positives. | **OPEN** |
| PF2-4 | **HIGH** | `react-server-dom-webpack@19.2.6` is in the Worker/RSC bundle and is inside the affected range for CVE-2026-44907 (server-function CPU/memory DoS); `19.2.8` is available. | **OPEN — upgrade before submission** |
| PF2-5 | **LOW** | `/docs` assigns unsanitized `marked.parse()` output to `innerHTML`. Current sources are committed and allowlisted, so this is not reachable from a WebMCP call or URL input, but any future untrusted Markdown becomes same-origin XSS. | **HARDEN** |
| PF2-6 | **LOW** | Demand `size`/`handle` strings are unbounded, and storage errors are swallowed after approval is consumed; the tool can report `ok` even when the signal did not reach localStorage. | **HARDEN** |

### PF2-1 — extra-property CSS breakout (HIGH)

`add_scene` double-casts the complete arguments object to `SceneInput`, validates `{ id, ...input }`, and passes that same object to the UI callback. The UI then constructs `{ id, ...input }`. JSON Schema does not reject additional properties here, and TypeScript types do not remove runtime keys. An untrusted call can therefore attach `style.background` even though `style` is not in the advertised tool schema.

`sceneCss` writes that value directly inside the exported `<style>` element. A replay with valid copy/kind/duration plus a background value containing a closing `</style>` and a `<script>` returned `ok: true`, stored the extra style, and produced an export containing that executable script. The `scene.kind` enum check and `escapeHtml(scene.kind)` do not cover this sink.

Required fix: construct a fresh allowlisted `SceneInput` from validated primitives rather than spreading/casting raw arguments; set `additionalProperties: false` as host-level defence in depth; and allowlist CSS colours (for example strict hex/RGB tokens) in the exporter for both scene and base styles. Add a regression test that enters through `buildTools(...).add_scene`, not only `validateScene`.

### PF2-2 — malformed scene DoS and schema drift (MEDIUM)

The same replay passed `heading: { evil: true }`, `body: null`, and `durationSec: "3"`. It returned `ok: true` and stored the malformed scene; export then threw `TypeError: s.heading.includes is not a function` (the React preview can likewise fail when asked to render an object). `update_scene` has the same primitive-validation gap. In addition, the tool schema says `durationSec >= 0.5`, while `validateScene` accepts any value greater than zero.

Required fix: one runtime parser shared by add/update should require bounded strings, a finite numeric duration in `0.5..30`, and an enum kind, returning a distinct `invalid-input` result before claim validation. Cap scene count and copy length to bound validator/export work.

### PF2-3 — claim-validator gaps (MEDIUM)

NFKC maps full-width digits but does not map Arabic-Indic `٠..٩`, Persian `۰..۹`, or the Arabic percent sign. Replays of `Now ٥٠٪ off` and `Now ۵۰% off` returned no violation. The current replacement removes only U+200B..U+200D and U+FEFF, so `lowest\u2060 price` bypassed the banned phrase. With `promoCode: null`, `Use SAVE90 at checkout` also passed because bare all-caps scanning only runs when a locked code exists. Conversely, `Rated 4.90 stars` was flagged as a price although the comment claims bare decimals are checked near money context.

Required fix: explicitly map the supported Unicode decimal sets and percent signs (or use a Unicode-aware numeric parser), strip all relevant `Cf` format controls before matching, scan code-like tokens regardless of whether a locked code exists, and either add real money-context detection or document the deliberately conservative decimal policy. Add one regression per example above.

### PF2-4 — dependency audit (HIGH)

`npm audit --omit=dev` on 2026-09-01 reports five HIGH package nodes and one LOW. The actionable runtime item is the direct `react-server-dom-webpack@19.2.6` dependency: [GitHub advisory GHSA-wx67-qw84-cm4g / CVE-2026-44907](https://github.com/advisories/GHSA-wx67-qw84-cm4g) covers `19.2.0..<19.2.8` and recommends immediate upgrade. No user-authored `"use server"` action exists in this repo, which reduces demonstrated reachability, but Vinext serves React Server Components and the generated Worker bundle contains the server decoder. Upgrade `react`, `react-dom`, and `react-server-dom-webpack` together to `19.2.8`, then run the full build/runtime gates.

The other reported paths are currently build/dev tooling rather than reachable Worker request paths: Vinext's `image-size` parser, Windows-only Vite/esbuild dev-server issues, and Undici under Miniflare/shadcn tooling. Keep them recorded and re-evaluate with the Vinext upgrade; do not describe the current audit as sharp/libvips-only.

### PF2-5 — documentation renderer (LOW, contingent)

The route selector itself is clean: the URL hash is checked against a fixed `DOCS` filename allowlist, text labels use `textContent`, fetches stay same-origin, and current Markdown contains no active raw-HTML payload. The pinned cdnjs script's SHA-384 bytes match the declared SRI value.

However, [Marked explicitly does not sanitize output](https://github.com/markedjs/marked#usage), and `/docs` writes it to `content.innerHTML`. The live `/docs/` response also has no Content-Security-Policy header. There is no active runtime injection path under the current trusted-static-docs model, but the boundary must not silently expand. Before accepting generated/user Markdown, sanitize the parsed output (for example DOMPurify), self-host/pin dependencies, and add an appropriate CSP.

### Approval gate and privacy boundary — confirmed clean

- Only the human button writes `shareApprovedRef`; no registered tool or callback can arm it.
- `report_demand_gap` validates category before the synchronous check-and-consume. `consumeShareApproval` clears the ref before signal creation/emission, so a re-entrant or immediate second call sees `false`; there is no asynchronous TOCTOU window on the JavaScript main thread.
- A later storage/emission failure does not restore approval. That is privacy fail-closed, though PF2-6 means delivery reporting is not yet trustworthy.
- The signal constructor still emits only event id, kind, category, optional size/handle, and time. Wardrobe rows and shopper identity have no bridge field. React escapes the displayed strings.

For PF2-6, cap `size`/`handle`, make `appendSignal` return success/failure, validate objects read back from localStorage, and return `ok` only when the bridge actually accepted the payload.

### Other areas confirmed clean

- The original `scene.kind` breakout is blocked; rendered heading/body/disclaimer/product text is HTML-escaped, and exported scene ids are allowlisted before CSS/JS selector interpolation.
- `/docs` cannot select arbitrary paths from the hash, and the current marked.js SRI check passes.
- No committed credential was found. The generated Worker config has no secrets or service bindings, includes `nodejs_compat`, enables observability, and uses a compatibility date less than six months old. Latest Workers types checked were `5.20260901.1`; the one-day project pin difference did not affect this review.
- The one-origin localStorage bridge is data-minimized under its intended write path. Corrupt same-origin storage can cause availability/type issues but does not create a new wardrobe-exfiltration field.
- `robots.txt` deny-all and `noindex,nofollow` are present on the app and docs. These are discovery hints, not access control; direct judge/browser access remains possible.

### Verification record

- Existing gates remain green: `npm test` 29/29, `npx tsc --noEmit`, and `npx oxlint` all passed after this documentation update.
- Separate tool-boundary attack replays reproduced PF2-1, PF2-2, and all four PF2-3 examples. They are not yet permanent regression tests, so the green suite does not close those findings.
- `git diff --check` passed, and `docs/SECURITY.md` is byte-identical to the local `public/docs/SECURITY.md` mirror. The live site was not redeployed in this pass.

### Current verdict and fix order

Current risk is **HIGH** until PF2-1 and PF2-4 are resolved and re-tested. The approval/privacy thesis remains intact; the open HIGH items are in export input handling and the RSC runtime dependency.

1. Strictly parse/allowlist merchant tool arguments and CSS values; add tool-boundary XSS/type regression tests.
2. Upgrade the matched React trio to `19.2.8`; rebuild, run tests/type/lint, and repeat live smoke/WebMCP checks before deploying.
3. Close PF2-3 Unicode/code gaps and add the four exact regression cases.
4. Harden docs sanitization/CSP and bridge delivery acknowledgement as time permits.

## Third pass (Claude) — fixes applied and verified

Marco set the review pipeline: Claude fixes → Codex re-reviews → back and forth until no concern; changes agreed by both. This section records the fixes; statuses are **FIXED (pending Codex re-review)**, not unilaterally closed.

| # | Fix | Verified |
|---|---|---|
| PF2-1 | `add_scene`/`update_scene` now build a fresh allowlisted `SceneInput` via `parseSceneInput` (no spread/cast of raw args, so `style` and any other unadvertised key is dropped); schemas set `additionalProperties: false`; the exporter allowlists CSS colours (`safeColor`, strict hex/rgb/keyword) for scene and base styles. | Live replay on the deployment: `add_scene` with `style:{background:'</style><script>…'}` returns ok but the style is dropped and the export contains no script or `</style>` breakout. Unit: "add_scene drops extra properties…", "exporter neutralizes a malicious scene style colour". |
| PF2-2 | Shared runtime parser requires enum kind, bounded strings (heading ≤200, body ≤400), and a finite duration in 0.5–30; malformed input returns a distinct `invalid-input` before claim validation. Schema `minimum` now agrees with the runtime bound. | Live replay: malformed `heading:{},body:null,durationSec:"3"` returns `ok:false error:invalid-input`, nothing stored. Unit: "add_scene rejects malformed field types". |
| PF2-3 | `normalize` maps Arabic-Indic (U+0660–0669), Persian (U+06F0–06F9), the Arabic percent sign, and strips all `\p{Cf}` format controls; code-shaped caps tokens (letters+digits) are flagged whether or not a code is locked; bare decimals only flag inside a money-context window. | Unit: "validator handles Arabic-Indic / Persian digits and format controls" — `٥٠٪`, `۵۰%`, word-joiner banned phrase, codeless `SAVE90` all caught; `Rated 4.90 stars` correctly not flagged. |
| PF2-4 | `react`, `react-dom`, `react-server-dom-webpack` upgraded to 19.2.8. | `npm audit --omit=dev` no longer lists CVE-2026-44907; build + 33/33 tests + live smoke pass on the redeployed Worker. |
| PF2-5 | `/docs` now sanitizes `marked.parse()` output with DOMPurify (pinned + SRI). | Live `/docs/` 200; renders correctly. |
| PF2-6 | `appendSignal` returns success only when the signal reads back from storage and dispatches the event only then; `report_demand_gap` returns `bridge-unavailable` (not a false `ok`) when delivery fails, approval staying consumed (fail-closed); `size`/`handle` bounded before the one-shot approval is spent; `readSignals` validates shape on readback. | Unit suite green; interface change threaded through the studio trail. |

Gates after fixes: **33/33 tests, tsc clean, oxlint clean, production build clean, hyperframes check 0/0, live smoke 200 on all four routes, live WebMCP attack replays neutralized.** Redeployed as Worker version fb9486a3.

Handoff to Codex (next pipeline turn): please adversarially re-review these six fixes with fresh eyes — especially whether `parseSceneInput` misses a sink, whether `CODE_SHAPED_RE` over/under-flags, and the `safeColor` allowlist. Also, Marco asked that this fix→review→fix pipeline itself be captured in the bucket-test skill (which you own) as a security loop step.

## Fourth pass — Codex replay findings (PF4-1..6) and Claude fixes

Codex replayed the third-pass fixes and found six residual concerns; Claude fixed all six in the same fix↔review loop. Statuses are **FIXED (pending Codex Pass 5 replay)**.

| # | Finding | Fix |
|---|---|---|
| PF4-1 (PF2-1 residual) | Base `CampaignState.style` was interpolated raw into the body rule and the disclaimer footer, and was the unsanitized fallback for scene styles. | `safeBase()` allowlists background/ink/accent with hardcoded safe defaults; every interpolation (body, footer, scene rules, scene fallback) now reads the sanitized base. Test: "PF4-1: malicious BASE style cannot break out of the export". |
| PF4-2 (PF2-2 residual) | `reorder_scenes` cast `orderedIds`; an object with a `length` property threw. | Runtime guard: must be an array of strings, else `invalid-input`. Test: "PF4-2". |
| PF4-3 (PF2-2 residual) | Scene count uncapped (140 adds accepted). | `MAX_SCENES = 12` and a projected total-duration check (≤ 60 s) run **before** the state callback. Test: "PF4-3". |
| PF4-4 (PF2-3 residual) | `CAD 19.99` and mixed-case `Save90` passed; "Coffee" matched money-context `off`; `1080P` false-flagged. | Currency-aware price regex ($, C$, US$, CAD, USD); word-bounded money context; two-track code detection agreed with the reviewer — a redemption-context window (use/apply/enter/redeem/promo/coupon/voucher/checkout) catches any letter+digit token, and the global fallback is narrowed to 3+ letters then 2+ digits so X100, UV400, H2O2, 1080P stay clean. Tests: "PF4-4", "PF4-4b". |
| PF4-5 (PF2-5) | Pinned DOMPurify 3.2.7 inside CVE-2026-41238 range. | Pinned to 3.4.14 with a fresh SHA-384 SRI. |
| PF4-6 (PF2-6 residual) | Malformed `kind` defaulted to `want` and consumed the approval; `readSignals` accepted invalid enums/dates and extra keys such as `shopperId`. | Invalid provided `kind` is rejected before the approval is consumed; `readSignals` rebuilds an exact-key, enum-validated, bounded `DemandSignal` (extra keys dropped, unparseable dates rejected). Tests: "PF4-6a", "PF4-6b". |

Gates after Pass 4 fixes: 40/40 tests, tsc clean, oxlint clean. Residual, accepted: spelled-out numbers and promo tokens outside both tracks (e.g. a bare `AB12CD` with no redemption context) are not parsed; the locked disclaimer carries the authoritative figures and always renders.

Live-runtime replay on the deployed build (Chrome 151 `document.modelContext`, Worker 8418d4ff): `reorder_scenes` with `{length:1}` → `invalid-input`; `add_scene` accepted 8 more (12 total) then refused with `invalid-input`; `validate_claims` flags `CAD 19.99` (price) and `Use Save90 at checkout` (code) while `X100`, `UV400` and `Coffee rating 4.90` return no violations.

## Fifth pass — Codex replay (PF5-1) and fix

Codex Pass 5 confirmed all PF4 fixes clean on independent replay and found one residual: `update_scene` had no projected campaign-total cap (hero→30s then product→30s reached 67s). Fixed: a duration patch now computes the projected total and rejects with `total-duration` before `cb.updateScene`. Regression: "PF5-1".

## Pass 6 — Codex final replay

Status: **CLEAN — no open application-security findings from the reviewed paths.**

Independent replay after commit `71bad0a` verified:

- Base-style breakout is neutralized; malformed `reorder_scenes` returns structured `invalid-input` without throwing.
- Scene growth stops at 12 scenes and 60 seconds. A two-step `update_scene` attack (hero→30s, then product→30s) accepts the first at 41s, rejects the second at 67s before the callback, and leaves state unchanged at 41s.
- `CAD 19.99` and `Save90` in checkout context are flagged; `Coffee rating 4.90`, `X100`, `UV400`, `H2O2`, and `1080P` are not false-flagged.
- Invalid closet `kind` is rejected before approval consumption; corrupt localStorage entries are dropped and extra keys are not returned.
- The approval gate remains fail-closed when signal storage is unavailable: no success is reported and approval is not restored.

Gates: **41/41 tests, TypeScript clean, oxlint clean, diff check clean, and the documentation mirror byte-identical.** This review made no deployment. Remaining audit advisories are confined to previously recorded build/dev tooling paths; they are not new reachable application findings.
