# Dual review, wave 6 (2026-09-04): the Loop Room, multi-merchant, four agents' day of work

Identical brief to two reviewers, in parallel: **Codex** (cmux surface:19, `webmcp-help`) and a
**Claude subagent** (general-purpose, Opus). Coordinator: Claude session `webmcp-hemloop-07`
(surface:95). Reviewers propose; Marco assigns. Verdicts land in
`docs/internal/coordination/DUAL-REVIEW-WAVE6-<CODEX|CLAUDE>.md`; the reconciliation table lands in
`DUAL-REVIEW-WAVE6-RECONCILED.md`. Only AGREED items are executed. Deadline context: the hackathon
submission is in; Marco is polishing for judges and for a real demo in ChatGPT's in-app browser,
so "neat and fast" must not become a rewrite.

## What changed since the wave 4 review (2026-09-02 night) — all of it on 2026-09-03

Read `main` at `b36701f` or later. Highlights, with the files that carry them:

- `/` is the **Loop Room**: `components/loop-room-page.tsx` (state, 21 tools registered once,
  `LoopRoomView` built from bridge rows and real tool results), `lib/proofframe/loop-room.ts`
  (props contract, `stationStates`, `loopRoomFlags`), `components/loop-room/*` (Codex,
  presentational: rail, station card, closet stack, merchant market, runtime status, manifest dialog,
  footer). Three human gates on the page, none reachable by a tool. A restart (closed loop plus a
  new ok `import_receipt`) scopes bridge rows to the new cycle by `loopStartedAt`.
- **Sitemap** (`SITEMAP.md`): `/`, `/closet` (tabs Wardrobe · Requests and offers), `/studio` (tabs
  Demand · Offer and rules · Composition), `/docs/`; `/merchant` 307s to `/studio?tab=demand`. Tabs
  via `components/use-surface-tab.ts` (`useSyncExternalStore`, `?tab=`). Shared `SiteHeader` and
  `SiteFooter` on every route, static mirror on the docs site.
- **Multi-merchant** (`MERCHANTS-BRIEF.md`): `lib/proofframe/merchants.ts` (five merchants,
  `marketScan` with verdicts can-offer / size-not-in-stock / category-mismatch / margin-floor /
  over-ceiling), per-merchant stored campaigns `hemloop.campaigns` + `hemloop.merchant` with a
  migration from `hemloop.campaign`, active merchant switching to the first can-offer on `/`.
- **Stored state on every page**: `hemloop.wardrobe` (`readWardrobe`/`writeWardrobe`, seed migration
  by version in progress), `hemloop.campaigns`, hydrate-after-mount on `/`, `/closet`, `/studio`.
- **Closet**: ten rows for Me, seven for Partner and Kid, `randomGarments` (cap 20 per profile, kids
  pool `lib/proofframe/catalog-kids.json`), receipt import cards with `public/receipts/*.png`,
  stepped sharing dial with a real next-request preview (`nextRequestPreview` in `closet.ts`).
- **Manifest**: 21 descriptions trimmed from 4167 to 3116 chars; result `next` texts no longer
  invite a follow-up call; a 320-char cap test.
- **Chrome**: E-commerce wording, Hemloop as the product name, favicon.ico, footer credit with the
  GitHub link (repo is still PRIVATE).
- **Removed**: `components/landing.tsx`, `components/loop-rail.tsx`, `merchant-dashboard.tsx`,
  `merchant.css`.
- **Codex's own replay** of wave 5 is in `judge-review-3-2026-09-03.md` (two P0s on `readCampaign`
  and `readWardrobe` bounds; Cursor is fixing them on `cursor/storage-hardening`). Do not re-find
  those; confirm the fix when it lands or say what it still misses.

Gates at HEAD: 151/151 tests, tsc clean, oxlint clean, `vinext build` clean, deployed to Cloudflare
Workers (`hemloop.app`).

## Extracted rules the code must satisfy (from the 2026-09-02 spec read, docs/TECH-GUIDE.md)

Sources: WebMCP spec (webmachinelearning.github.io/webmcp), its explainer, Chrome's WebMCP guide
(developer.chrome.com/docs/ai/webmcp — best-practices, secure-tools, imperative API), ChatGPT's
WebMCP page (learn.chatgpt.com/docs/webmcp). Re-read them if anything below looks stale; cite the
page if you change a rule.

| rule | source |
|---|---|
| Namespace `document.modelContext`; tool names ASCII `[A-Za-z0-9_.-]`, <=128 chars | spec |
| Name <=30, description <=500, parameter description <=150, output <=1.5K chars | Chrome secure-tools |
| `readOnlyHint` on read-only tools; `untrustedContentHint` on user/external content | spec, Chrome |
| `additionalProperties: false` on every schema | ChatGPT sample |
| Await `registerTool()`; handle `InvalidStateError` / `NotAllowedError` | spec |
| Validate strictly in code, loosely in schema; errors an agent can self-correct from | Chrome |
| Consequential actions need a human step | Chrome, ChatGPT |
| No iframes, no declarative API | ChatGPT |

## Script audit of all 21 tools (`scripts/audit-tools.mts`, run at HEAD b36701f)

```
closet  get_wardrobe        name=12 desc=167 addlProps=true readOnly=true  untrusted=true
closet  get_my_sizes        name=12 desc=53  addlProps=true readOnly=true  untrusted=true
closet  find_gaps           name=9  desc=207 addlProps=true readOnly=true  untrusted=false
closet  check_fit           name=9  desc=123 addlProps=true readOnly=true  untrusted=true
closet  get_preferences     name=15 desc=172 addlProps=true readOnly=true  untrusted=true
closet  add_garment         name=11 desc=55  addlProps=true readOnly=false untrusted=false
closet  report_demand_gap   name=17 desc=303 addlProps=true readOnly=false untrusted=false
closet  import_receipt      name=14 desc=167 addlProps=true readOnly=false untrusted=false
closet  get_offers          name=10 desc=182 addlProps=true readOnly=true  untrusted=true
studio  get_campaign_state  name=18 desc=172 addlProps=true readOnly=true  untrusted=false
studio  set_brief           name=9  desc=75  addlProps=true readOnly=false untrusted=false
studio  add_scene           name=9  desc=112 addlProps=true readOnly=false untrusted=false
studio  update_scene        name=12 desc=100 addlProps=true readOnly=false untrusted=false
studio  reorder_scenes      name=14 desc=57  addlProps=true readOnly=false untrusted=false
studio  seek_preview        name=12 desc=77  addlProps=true readOnly=false untrusted=false
studio  validate_claims     name=15 desc=99  addlProps=true readOnly=true  untrusted=false
studio  export_composition  name=18 desc=182 addlProps=true readOnly=true  untrusted=false
studio  get_offer           name=9  desc=209 addlProps=true readOnly=true  untrusted=false
studio  import_product      name=14 desc=129 addlProps=true readOnly=false untrusted=true
studio  get_demand          name=10 desc=265 addlProps=true readOnly=true  untrusted=true
studio  propose_offer       name=13 desc=210 addlProps=true readOnly=false untrusted=false
tools=21 descriptionChars=3116   (no parameter carries a description; all schemas closed)
```

## Facts (scripts/facts.sh, run at HEAD against live)

```
node v22.22.3
deps(11): @base-ui/react 1.7.0, class-variance-authority 0.7.1, clsx 2.1.1, lucide-react 1.31.0,
  react ^19.2.8, react-dom ^19.2.8, react-server-dom-webpack ^19.2.8, shadcn 4.18.0,
  tailwind-merge 3.6.0, tw-animate-css 1.4.0, vinext 1.0.0-beta.5
devDeps(17): @cloudflare/vite-plugin 1.37.1, @cloudflare/workers-types, @openai/sites-vite-plugin 0.2.0,
  @tailwindcss/postcss 4.2.1, @vitejs/plugin-react 6.0.2, @vitejs/plugin-rsc 0.5.26, oxfmt, oxlint,
  oxlint-tsgolint, tailwindcss 4.2.1, tsx, typescript 5.9.3, vite 8.0.13, wrangler 4.127.0
tsconfig: target ES2017, module esnext, moduleResolution bundler
vendored ui present: 2 (badge, button), both imported
worker: compatibility_date 2026-05-15, flags [nodejs_compat], assets ../client, observability on,
  custom domains hemloop.app + www
build: dist 5.2M (client 4.0M, server 1.2M); chunks index 192k, framework 188k, webmcp 68k,
  proofframe-studio 48k, loop-room-page 40k
live headers (/): HSTS 1y includeSubDomains, X-Content-Type-Options nosniff, X-Frame-Options DENY,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/mic/geo off, no CSP
_next/static chunk: cache-control public, max-age=31536000, immutable; etag present
file sizes at HEAD: loop-room-page.tsx 1183, globals.css 4901, closet-studio.tsx 1485, proofframe-studio.tsx 1834 lines
TTFB: / 0.11s, /closet 0.12s, /studio 0.29s, /docs/ 0.09s
```

## The three axes — answer all three

1. **Design**: versions and dependencies (vinext beta 5 on Workers is the bet; is anything added
   today unnecessary, e.g. tw-animate-css or shadcn still imported for two components?), the
   localStorage bridge as the only state (fine for a demo; say where it would bite a judge),
   multi-merchant modelled as five `CampaignFacts` plus a pure scan (is the abstraction honest, is
   `hemloop.campaigns` per merchant the right shape), the seed-version migration idea for the
   wardrobe, and whether anything in `MERCHANTS-BRIEF.md` or `SITEMAP.md` is a wrong turn worth
   reversing now rather than after the demo.
2. **Code structure / quality / compatibility**: `components/loop-room-page.tsx` is ~1,100 lines of
   state plus station copy; `app/globals.css` is over 4,000 lines and three agents append to it;
   `closet-studio.tsx` and `proofframe-studio.tsx` are 1,400 and 1,700+ lines with tabs bolted on;
   duplication between `loop-room-page.tsx` and the two surfaces (catalogProductFor,
   imageForCategory, the bridge subscriptions). Name what a judge notices in ten minutes and what is
   fine to leave. Modern APIs: `useSyncExternalStore`, `crypto.randomUUID` (secure context only),
   `structuredClone` if used, `Array.prototype.at`, CSS `color-mix`, container queries, `:has()`,
   `<dialog>`: state browser/OS availability for ChatGPT's in-app browser (a WebView) and Chrome 149
   and whether the build passes them through untranspiled under target ES2017.
3. **Setup / platform**: Cloudflare Workers config (compat date, assets, observability), cache headers
   for `_next/static` immutable chunks vs HTML (facts.sh shows HTML headers only; check a chunk with
   `curl -sI`), the absence of CSP (still correct for an RSC app without nonces?), the private GitHub
   repo behind the footer link, the docs mirror as static files under `public/docs`, anything paid
   that should stay OFF, and what NOT to touch before the judge demo.

## Output shape required

For every item: **KEEP / CHANGE / DEFER**, one-line reason, effort **S/M/L**. Then "top 5 I would
do now" and "would NOT touch". Cite file and line for every CHANGE. Do not implement anything;
verdicts only. Write the file named above and append one line to `CODEX-COORDINATION.md` saying it
exists.
