# Dual review, wave 6 — Claude reviewer (2026-09-04)

Independent verdicts against the brief in `DUAL-REVIEW-WAVE6-BRIEF.md`. Reviewed source only; no
file in the repo was changed except this one. Verdicts, not implementations.

## Gates I ran myself

HEAD moved during the review: the brief names `b36701f`, but `532e369` ("Merge cursor/studio-pass:
per-size inventory on every merchant…") landed while I was reading, and `lib/proofframe/merchants.ts`
was being edited underneath me. Numbers below are from `532e369` unless marked.

| gate | command | result |
|---|---|---|
| tests | `npm test` | **152 tests, 152 pass, 0 fail**, 86ms (brief said 151 at `b36701f`; `cursor/studio-pass` added the inventory test) |
| types | `npx tsc --noEmit -p tsconfig.json` | **exit 0**, no diagnostics |
| lint | `npx oxlint` | no output — clean |
| tools | `npx tsx scripts/audit-tools.mts` | **`tools=21 descriptionChars=3116`**, every schema `addlProps=true`, 11 `readOnly=true`, 7 `untrusted=true`, **`maxParamDesc=0` on all 21** |
| live HTML | `curl -sI https://hemloop.app/` | 200; HSTS 1y+includeSubDomains, nosniff, XFO DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/mic/geo off — **and no `cache-control`, no `etag`, no `last-modified`** |
| live chunk | `curl -sI https://hemloop.app/_next/static/chunks/index-DZZlf_OH.js` | 200; `cache-control: public, max-age=31536000, immutable`, `etag` present, `cf-cache-status: MISS` (cold PoP) — **and none of the five security headers** |
| redirect | `curl -sI https://hemloop.app/merchant` | **307** → `/studio?tab=demand` (SITEMAP.md says 301) |
| source link | `curl -s -o /dev/null -w '%{http_code}' https://github.com/marconvm/hemloop` | **404** |

Manifest against the extracted rules: longest name 18 (≤30 ✓), longest description 303 (≤500 ✓),
all schemas closed ✓, `readOnlyHint`/`untrustedContentHint` present ✓, `registerTool()` awaited ✓.
The one deviation from Chrome's secure-tools guidance is that **no parameter carries a description**
— the rule caps them at 150 chars, it does not require them, so this is a judgement call, not a miss.

---

## Axis 1 — Design: versions, dependencies, state, abstractions, decisions

| # | item | verdict | one-line reason | effort |
|---|---|---|---|---|
| D1 | `vinext 1.0.0-beta.5` on Workers as the bet | **KEEP** | Deployed, green, TTFB 0.09–0.29s; changing the framework five days out is the rewrite the brief forbids | — |
| D2 | `tw-animate-css 1.4.0` | **CHANGE** | Zero `animate-in`/`fade-in`/`zoom-in` utilities anywhere in `components/` or `app/`, yet it still emits 18 `--tw-enter*` custom properties into the shipped `index.DKOzKYeP.css` | S |
| D3 | `shadcn 4.18.0` dep "for two components" | **KEEP** | It is not for the two components — `app/globals.css:3` imports `shadcn/tailwind.css` as the theme layer the whole token system sits on; removing it means re-homing the theme | L if changed |
| D4 | `@base-ui/react` + `cva` + `clsx` + `tailwind-merge` for a Badge and a Button | **DEFER** | Four deps to render two vendored components is fat, but they are already shipped and inert; a post-demo tidy | M |
| D5 | `react-server-dom-webpack` as a direct dep, imported nowhere in app code | **DEFER** | It is vinext's RSC peer; pulling it to prove a point risks the build for zero visible gain | S/risky |
| D6 | localStorage as the only state | **KEEP** (name the risk) | Fine for the demo. Where it bites a judge: (a) a private window or a WebView that clears site data returns the seed on every load, so "the loop ran" never survives a reload — the demo must be one unbroken session; (b) the two parties are two React trees over one origin's storage, so "where does the merchant actually run" has an honest but deflating answer. Both are a sentence of docs, not code | S (copy) |
| D7 | Multi-merchant as five `CampaignFacts` + a pure `marketScan` | **KEEP** | The abstraction is honest and got more honest today: `seedMerchants()` now derives `sizesInStock` via `sizesInStockFromInventory()` from real per-SKU rows, so stock is a consequence of inventory rather than a hand-edited array. `marketScan` is pure and returns verdict + price only — no cost or floor crosses to another merchant or the shopper, exactly as `MERCHANTS-BRIEF.md` promised | — |
| D8 | `marketScan` collapses every unknown refusal into `category-mismatch` | **CHANGE** | `lib/proofframe/merchants.ts:277-281` — `matchOffer` only ever refuses with two reasons today so nothing is wrong on screen, but the day a third refusal exists (campaign ended, no cost price) a judge reads "Other category" for it. Map to an `unavailable` verdict or carry the raw reason | S |
| D9 | `hemloop.campaigns` per merchant + `hemloop.merchant` pointer | **KEEP** | Right shape: one map, an active-id pointer, per-merchant read/write, and a one-shot migration from `hemloop.campaign` that deletes the legacy key. `migrateLegacyCampaign()` runs on every `readCampaignsMap()` rather than once, which is harmless — it early-returns when the key is gone | — |
| D10 | `writeCampaign` overload with `maybeCampaign!` | **DEFER** | The non-null assertion is unreachable through the typed overloads; cost of removing exceeds value now (`lib/proofframe/seed.ts`, `writeCampaign`) | S |
| D11 | Wardrobe seed-version migration | **CHANGE or accept** | It does not exist at HEAD — `readWardrobe()` (`lib/proofframe/closet.ts:1085`) carries no version and there is no `hemloop.seed*` key anywhere in the tree. A judge who opened the site yesterday keeps yesterday's ten rows and never sees the kids catalog or the receipt cards. Either stamp `hemloop.wardrobe.v` and reseed on bump (M), or put "clear site data first" in the demo runbook (S) | M / S |
| D12 | Five merchants, one product photo | **CHANGE** | All five carry `productImage: '/products/northlight-hoodie.jpg'` (`lib/proofframe/merchants.ts:82, 111, 138, 164, 192`) while `public/products/` already holds `east-side-straight-jean.jpg` and `harborview-crew-tee.jpg`. The market list renders no image, so this only surfaces when the auto-switch hands the loop to another merchant — and there is a test for exactly that (`tests/proofframe.test.ts:1443`, hoodie·XS → Overland), after which the creative panel shows the Northlight hoodie under Overland's name. At minimum point `denim-supply` at the jean | S |
| D13 | `SITEMAP.md`: one page per side, tabs inside | **KEEP** | Correct call. Four routes, one header, symmetric parties, `/merchant` folded rather than split. Reversing it now costs a day and buys nothing | — |
| D14 | `SITEMAP.md` says `/merchant` **301**s; live is **307** | **CHANGE** | Doc/reality mismatch in the route table. 307 is also the better choice — a 301 is cached in a judge's browser forever | S |
| D15 | `MERCHANTS-BRIEF.md` verdict table | **KEEP** | Now backed by tests at the exact numbers (`tests/proofframe.test.ts:1384` Basics, `:1418` Taste ceiling 60, `:1443` the XS switch). Nothing here is a wrong turn worth reversing |— |

**Nothing in either brief is a wrong turn worth reversing before the demo.** The two design items I
would still change are both one-liners (D8, D14) and one asset path (D12).

---

## Axis 2 — Code structure, quality, compatibility

### Structure and quality

| # | item | verdict | one-line reason | effort |
|---|---|---|---|---|
| S1 | `components/loop-room-page.tsx` at 1,183 lines | **DEFER** | The state layer is fine and well-commented; the problem is the 280-line `stationCards` literal at `:664-960`, seven blocks of prose living inside a render function. It belongs in `lib/proofframe/station-copy.ts` as a pure `(facts) => StationCard[]` — but it is the one file the live demo runs through, so not this week | M |
| S2 | `components/proofframe-studio.tsx` at 1,834 lines | **DEFER** | Worse than the Loop Room: `ProofFrameStudio` is a single component function from `:315` to EOF, ~1,500 lines with three tabs bolted on. Same reasoning — a judge does not read it, a refactor can break it | L |
| S3 | The five `*Safe` shims | **CHANGE** | `components/proofframe-studio.tsx:137-178` — `readOutcomesSafe`, `subscribeOutcomesSafe`, `readOffersSafe`, `subscribeOffersSafe`, `upsertOfferSafe`, each a `typeof mod.x === 'function'` probe with a comment saying "another agent is adding X to signal-bridge.ts, so this must compile whether or not that landed". All five exports have landed. This is the single clearest tell in the codebase that four agents were racing; deleting it is a pure subtraction | S |
| S4 | `catalogProductFor` duplicated three times | **CHANGE** | `components/loop-room-page.tsx:161`, `components/proofframe-studio.tsx:259`, `components/merchant-demand-panel.tsx:51` — plus a fourth variant `catalogProductForMerchant` in `lib/proofframe/merchants.ts:213`. Hoist one into `lib` | S |
| S5 | `demandLabel` / `money` duplicated | **DEFER** | `components/closet-studio.tsx:120` vs `components/proofframe-studio.tsx:253`; three lines each, cosmetic | S |
| S6 | `imageForCategory` (`loop-room-page.tsx:173`) | **KEEP** | Only one copy; the brief's suspicion of duplication does not hold for this one | — |
| S7 | The bridge subscription triple, repeated | **KEEP** | `loop-room-page.tsx:266-268`, `merchant-demand-panel.tsx:117-119`, three separate effects in `closet-studio.tsx` — repeated but each is three lines and correctly torn down. A `useBridge()` hook is a post-demo nicety | S |
| S8 | `app/globals.css` at 4,901 lines with three agents appending | **CHANGE** | The project already has the right pattern and did not apply it to the newest surface: `app/closet.css` (787) and `app/studio.css` (1,296) are imported by their own components (`closet-studio.tsx:26`, `proofframe-studio.tsx:29`) and code-split into their own CSS chunks, while the Loop Room's **1,747 lines** sit in `app/globals.css:3158-4901`. Move to `app/loop-room.css`, import from `loop-room-page.tsx`. Mechanical, precedented, and it ends the three-way append conflict | M |
| S9 | Dead landing CSS still shipping | **CHANGE** | `components/landing.tsx` was removed, but ~33 `landing-*` selectors survive at `app/globals.css:1622-1949` (~6.5KB of source) and appear **33 times in the built `index.DKOzKYeP.css` that every route loads**. Twenty of those class names appear in no `.tsx` and no docs HTML | S |
| S10 | Raw kebab-case enum on a judge's screen | **CHANGE** | `components/loop-room-page.tsx:830` renders `` `${row.verdict} · ${row.reason}` `` — i.e. "size-not-in-stock · M sold out" — while Codex's `MerchantMarket` renders the same rows through `VERDICT_LABEL` (`components/loop-room/merchant-market.tsx:28`). Same data, two renderings, one of them machine text. Reuse the label map or drop the duplicate facts rows | S |
| S11 | The Copy-prompt button gives no feedback and can silently fail | **CHANGE** | `components/loop-room-page.tsx:1152-1154` is `navigator.clipboard?.writeText(prompt).catch(() => {})`: the `?.` makes "no clipboard" a no-op, the `.catch(()=>{})` makes "permission denied" a no-op, and the button at `components/loop-room/station-card.tsx:72-80` has no copied state. The Loop Room's entire interaction is *copy this, paste it to your agent*; a judge who clicks and sees nothing concludes the page is broken. Add a `Copied` state plus a select/`execCommand` fallback | S |
| S12 | The auto-switch-merchant effect can oscillate | **CHANGE** | `components/loop-room-page.tsx:592-598`. `market` is memoised on `campaign.facts`, and the active merchant is scanned with its **stored** facts while every other merchant is scanned with **seed** facts. If a judge unlocks and edits two merchants in `/studio` so each fails its own scan, the effect ping-pongs between them → "Maximum update depth exceeded". Narrow trigger, but it is the only path that can white-screen the demo page. Guard with a ref of ids already tried for the current `lastSignal.signalId` | S |
| S13 | `readPurchases()` has no validation at all — **extends Codex's judge-review-3** | **CHANGE** | `lib/proofframe/closet.ts:1056-1067` returns `parsed` straight through after `Array.isArray`. Codex named `readCampaign` and `readWardrobe`; this is the third store and the weakest of them. Every field lands in rendered text (`latestImport.title/.merchant/.size`) and in `buyingPattern()`'s numeric medians, so a same-origin write puts arbitrary strings on the page and `NaN` into the pattern. `readPreferences` (`closet.ts:842`) and `readConsentLevel` (`signal-bridge.ts:296`) already do the exact rebuild this needs — copy that shape | S |
| S14 | Codex's two P0s (`readCampaign`, `readWardrobe` bounds) | **CONFIRM — not fixed at HEAD** | There is no `cursor/storage-hardening` branch in `git branch -a`. `readWardrobe` (`closet.ts:1085-1103`) still filters and passes the original object through; `parseFacts`/`parseScene` (`seed.ts:125-229`) still accept unbounded values and preserve a stored `factsLocked: true`. Both verdicts stand as written; fold S13 into the same lane | (Codex's estimate) |
| S15 | Codex's manifest copy fix | **CONFIRM — still present** | `lib/proofframe/webmcp.ts:339` still calls all returned facts "human-locked"; `:600` still says imported facts become "(still human-locked)". Copy only, no schema change | S |
| S16 | Timestamp canonicalisation in `since()` | **DEFER** | Confirms Codex: `lib/proofframe/loop-room.ts` compares raw ISO strings, and every app-minted stamp is `new Date().toISOString()`, so the real tool path is correct. Defence-in-depth, and it belongs with the storage-hardening lane, not before it | S |
| S17 | `registerAll` / `getModelContext` | **KEEP** | `lib/proofframe/webmcp.ts:57-72` uses `Promise.allSettled` per tool, so an `InvalidStateError` or `NotAllowedError` lands in `rejected` and is logged (`loop-room-page.tsx:517`) instead of killing the batch; `getModelContext` probes both `navigator.modelContext` and `document.modelContext`. This satisfies the spec rule exactly | — |
| S18 | No parameter descriptions on any of the 21 tools | **DEFER** | `maxParamDesc=0` across the board. Chrome's secure-tools guidance caps parameter descriptions at 150 chars; it does not require them. A judge reading the manifest sees bare parameter names, which is a small honesty cost. If touched, six words each on the ambiguous ones (`handle`, `size`, `orderedIds`) is enough | M |
| S19 | `components/use-surface-tab.ts` | **KEEP** | Textbook `useSyncExternalStore`: a stable string snapshot, `getServerSnapshot` returning the fallback so SSR and first client render agree, a custom event because `replaceState` does not fire `popstate`, and a no-op when the URL would not change. The only gap — a client route change altering `?tab=` outside `setTab` would not notify — is unreachable across the four routes | — |

**What a judge notices in ten minutes:** the 404 source link (P9), a Copy button that appears to do
nothing (S11), and `size-not-in-stock` rendered raw next to a nicely-chipped version of the same row
(S10). **What is fine to leave:** every line count. Nobody opens a 1,800-line component in ten
minutes; they click things.

### Compatibility

| # | item | verdict | one-line reason | effort |
|---|---|---|---|---|
| C1 | Every modern API in use | **KEEP** | All Baseline **Widely available** and present in Chrome 149 (stable 2026-06-02): `crypto.randomUUID` Chrome 92 / Safari 15.4, `Array.prototype.at` 92 / 15.4, `String.replaceAll` with a global RegExp 85 / 13.1, `color-mix()` 111 / 16.2 (widely available Nov 2025), `:has()` 105 / 15.4, `<dialog>`+`showModal()`+`::backdrop` 37 / 15.4. `structuredClone` is **not used**; `@container` is **not used** (0 in source, 0 in the built CSS) — both non-questions | — |
| C2 | Does the build downlevel any of it under `target: ES2017`? | **KEEP — and the premise is wrong** | `tsconfig.json` sets `noEmit: true`, so `target` governs nothing that ships; Vite 8 / rolldown does the emit and passes ES2020+ through verbatim. Verified in the current build: `.at(-1)` in `proofframe-studio-DIYWAibx.js`, `crypto.randomUUID()` in `webmcp-CpCVY9Es.js`, 184 `?.` and 43 `??` in `loop-room-page-BGYBBU38.js`, and `color-mix` ×101, `:has(` ×7, `::backdrop` ×3 in `index.DKOzKYeP.css`. Nothing is polyfilled — the floor is the browser, and every browser that can run WebMCP clears it by years | — |
| C3 | `backdrop-filter` with no `-webkit-` fallback | **CHANGE** | Five declarations at `app/globals.css:110, 374, 3455, 4323, 4505` and **zero** `-webkit-backdrop-filter`. WebKit shipped it unprefixed only in **Safari 18** (Sept 2024); every earlier iOS/macOS WebKit needs the prefix. The site header (`:110`) and the tool-manifest dialog backdrop (`:4505`) are the two a judge sees. Cosmetic degradation, not breakage — and one line each | S |
| C4 | `crypto.randomUUID` secure-context requirement | **KEEP** (guard only if needed) | MDN: "available only in secure contexts". `hemloop.app` is HTTPS and localhost counts as secure, so both demo paths are safe. It throws only over plain http on a LAN IP — i.e. only if Marco demos from a phone against `http://192.168.x.x:5173`. Call site: `lib/proofframe/closet.ts:792` | S if needed |
| C5 | ChatGPT's in-app browser — my assumption, stated | **DEFER code, CHANGE the runbook** | OpenAI documents Site tools (WebMCP) **only for the built-in browser in the ChatGPT desktop app** (learn.chatgpt.com/docs/browser, /docs/webmcp), gated to Work/Codex on GPT-5.6 Sol/Terra. Neither page mentions iOS, Android, or chatgpt.com — there is **no documented mobile WebMCP browser**. My assumption for the engine: the desktop built-in browser renders through the OS engine (WKWebView on macOS), so the practical floor is the Safari version on the demo machine, which clears everything in C1. If anyone opens the demo from the ChatGPT **iOS** app's in-app browser, expect the page to render (WKWebView on the installed iOS) and the tools to be **absent** — the runtime chip will honestly say "preview", which is the right failure but a confusing one on stage. Say "desktop app" in the demo script | S |
| C6 | `<dialog>` + `showModal()` | **KEEP** | `components/loop-room/runtime-status.tsx:33` and `tool-manifest-dialog.tsx:92`, styled at `app/globals.css:4503`. Baseline since Safari 15.4; no polyfill needed | — |
| C7 | `useSyncExternalStore` | **KEEP** | Library API, no browser dependency — a subscribe callback and a snapshot getter. Works wherever React 19 runs | — |

---

## Axis 3 — Setup and platform

| # | item | verdict | one-line reason | effort |
|---|---|---|---|---|
| P1 | Worker config | **KEEP** | Generated `dist/server/wrangler.json`: `compatibility_date 2026-05-15`, flags `["nodejs_compat"]`, `assets.directory ../client`, `observability.enabled true`, custom domains `hemloop.app` + `www.hemloop.app`. All correct and current; moving the compat date before a demo is gratuitous risk | — |
| P2 | Anything paid that should stay off | **KEEP — verified off** | `.openai/hosting.json` is `{"d1": null, "r2": null}`, and the generated worker declares empty `d1_databases`, `r2_buckets`, `kv_namespaces`, `queues`, `durable_objects`, `hyperdrive`, `vectorize`, `workflows`, `analytics_engine_datasets`. The only metered dimension switched on is `observability` (Workers Logs) — and that is the one thing worth having on while judges are clicking | — |
| P3 | `_next/static` immutable chunks | **KEEP** | Verified live: `cache-control: public, max-age=31536000, immutable` plus an `etag`, correct for hash-named files. The `cf-cache-status: MISS` was a cold PoP, not a config problem | — |
| P4 | HTML carries **no** cache header and no validator | **CHANGE** | `curl -sI https://hemloop.app/` returns five security headers and no `cache-control`, `etag` or `last-modified`. With neither a directive nor a validator, intermediaries may apply heuristic freshness — and during a judging window where Marco may redeploy, a judge can hold a stale document pointing at chunk hashes that no longer exist. Add `cache-control: no-cache` (or `public, max-age=0, must-revalidate`) for document routes in `next.config.ts:17` | S |
| P5 | Security headers reach the document but not static assets | **CHANGE (small)** | `next.config.ts:17-18` declares `source: '/(.*)'`, but the live chunk response carries no `x-content-type-options` and no HSTS: on Workers the `assets` binding serves static files **without invoking the worker**, so `headers()` never runs for them. Low risk in practice (correct `content-type`, HSTS already pinned by the document). Fix is a `public/_headers` file | S |
| P6 | Absence of CSP | **KEEP — still correct** | vinext RSC injects inline bootstrap scripts and a streamed flight payload; a `script-src` without `'unsafe-inline'` needs per-request nonces the framework does not thread today, and `'unsafe-inline'` would be a CSP in name only. `X-Frame-Options: DENY` already covers the clickjacking risk that actually matters here. Revisit when nonce support exists | — |
| P7 | `X-Frame-Options: DENY` | **KEEP — with a two-minute pre-demo check** | Exactly right for a page whose value is three human-only buttons, and it aligns with ChatGPT's no-iframes rule. The only way it bites is if the host ever *embeds* the page rather than navigating to it; the failure mode would be a blank frame with no clue for the judge, so confirm it once on the demo machine before anyone is watching | S |
| P8 | `workers_dev: true` (second origin at `hemloop.marcoatwill.workers.dev`, referenced `lib/proofframe/brand.ts:16`) | **KEEP** | Untidy to publish two origins for one product, but it is the fallback URL if the custom domain misbehaves mid-demo. Turn it off after | S |
| P9 | The footer's "Source on GitHub" link is a **404** | **CHANGE — cheapest high-impact fix on this list** | `https://github.com/marconvm/hemloop` returns 404 for everyone but Marco, and the link ships in two places: `components/site-footer.tsx:29` and `public/docs/index.html:197`. To a judge evaluating an open-source-flavoured entry, a dead source link reads worse than no link. Either publish the repo (run the `repo-go-public` history scan first) or remove the anchor and keep the copyright | S to remove, L to publish safely |
| P10 | Docs mirror under `public/docs` | **KEEP the mechanism, CHANGE the contents** | The mirror discipline works — every `docs/*.md` has a byte-identical twin in `public/docs/` and the only extra is `README.md`. But the same directory publishes internal process files: `GAP-ANALYSIS.md`, `DEVPOST-CHECKLIST.md` and `DEVPOST-SUBMISSION.md` all return **200** at `https://hemloop.app/docs/<name>.md`, and GAP-ANALYSIS opens with "22 hours before submission" then enumerates what the product does not do. Reachable only by guessing a filename — but they should not be on the judge's origin. Move them out of `public/` | S |
| P11 | TTFB | **KEEP** | `/` 0.11s, `/closet` 0.12s, `/studio` 0.29s, `/docs/` 0.09s. `/studio` is the heaviest and still fine; nothing to tune | — |
| P12 | `index.DKOzKYeP.css` at 95,298 bytes on every route | **CHANGE — same fix as S8/S9** | Splitting the Loop Room's 1,747 lines out of globals and deleting the dead landing block is where the weight is; there is no separate action here | (see S8/S9) |

---

## Top 5 I would do now

1. **P9 — the 404 "Source on GitHub" link.** `components/site-footer.tsx:29` and
   `public/docs/index.html:197`. Either publish the repo or remove the anchor; do not ship a dead
   source link to judges. **S**
2. **S11 — make the Copy-prompt button visibly work.** `components/loop-room-page.tsx:1152` and
   `components/loop-room/station-card.tsx:72-80`. Add a `Copied` state and a fallback; today a
   clipboard failure and a success look identical, and copying is the demo's only interaction. **S**
3. **S13 + S14 — one storage-hardening lane.** Codex's two P0s are still unfixed at HEAD (no
   `cursor/storage-hardening` branch exists); add `readPurchases` (`lib/proofframe/closet.ts:1056`)
   to the same pass, using the rebuild shape `readPreferences` already has. **S each**
4. **S3 — delete the five `*Safe` shims.** `components/proofframe-studio.tsx:137-178`. Pure
   subtraction, and it removes the most visible scar of four agents racing. **S**
5. **C3 — five `-webkit-backdrop-filter` lines.** `app/globals.css:110, 374, 3455, 4323, 4505`.
   One line each; insurance against any WebKit before Safari 18. **S**

Runners-up, both S and both one line: **P4** (an HTML `cache-control`) and **D12** (point
`denim-supply` at `east-side-straight-jean.jpg`).

## Would NOT touch before the judge demo

- **S1 / S2 — the big-component refactors.** `loop-room-page.tsx` and `proofframe-studio.tsx` are
  the two files the demo actually runs through. A judge never opens them; a regression there ends
  the demo. Worth doing the week after, not this week.
- **S8 / S9 / P12 — the CSS move.** Right change, wrong moment: three agents are still appending to
  `app/globals.css`, so moving 1,747 lines now guarantees a merge conflict with work in flight. Do
  it the moment the lanes stop.
- **P1 / P6 / P8 — worker compat date, CSP, `workers_dev`.** All three are correct as they stand and
  all three can only make things worse under time pressure.
- **D11 — the wardrobe seed-version migration.** Write "clear site data before demoing" into the
  runbook instead; a storage migration is exactly the kind of change that fails only on the one
  browser that matters.
- **Any dependency version** — `vinext` beta 5, React 19, Tailwind 4. D2 (`tw-animate-css`) is the
  single exception and only because it is a removal with zero usage behind it.
- **D13 / D15 — the sitemap and the multi-merchant model.** Both decisions are sound and both are
  now load-bearing across routes, tests and docs.
- **D5 — `react-server-dom-webpack`.** Unused in app code, but it is the framework's RSC peer;
  removing it to be tidy risks the build.
- **S18 — parameter descriptions.** Twenty-one tools' worth of copy edits against a rule that does
  not require them, in the file the whole submission depends on.

---

*Claude reviewer, wave 6. Verdicts only — nothing in this review was implemented. Reconciliation
against Codex's verdicts belongs in `DUAL-REVIEW-WAVE6-RECONCILED.md`; only items both reviewers
agree on should be executed.*
