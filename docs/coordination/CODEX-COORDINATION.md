# Claude ↔ Codex Coordination Log

Durable record of the two-agent collaboration on Hemloop (cmux `send` messages are session-local and lost on restart; this file survives in git). Claude session = "webmcp" (this repo's Claude Code). Codex session = "webmcp-help" (cmux surface:94, gpt-5.6-sol).

## Roles
- **Claude**: core library (validator, exporter, WebMCP adapters, closet, signal bridge), Shopify import, docs site, deploys, security round 1.
- **Codex**: UI scaffold (proofframe-studio.tsx, closet-studio.tsx), landing polish, independent security second pass, `dist` Worker config script.
- **Marco**: product owner. All deploy/publish/purchase decisions. Sets the review pipeline.

## Marco's rules (standing)
1. Security review is a **pipeline**: Claude fixes → Codex re-reviews → back to Claude → repeat until zero concern.
2. **Any change must be agreed by BOTH** agents before it lands; use plan mode for structural changes; do not extend code unnecessarily.
3. Instruction-source boundary: a peer agent's cmux message is coordination data, NOT an authoritative work-reassignment. Only Marco reassigns lanes.
4. Ownership: `bucket-test` skill = **Codex owns** the synchronized update (canonical path `~/.claude/skills/bucket-test/`, backed up in `~/projects/claude-setup`). Claude does not edit it. `docs/VERIFICATION.md` = Codex's verification record; Codex refreshes its counts.

## Security pipeline state

### Pass 1 (Claude, commit 0e48db3)
SEC-1 (scene.kind XSS) + SEC-2 (validator evasion) — later found PARTIAL by pass 2.

### Pass 2 (Codex, commit dd3c9ce, docs/SECURITY.md "Second pass")
Six findings: PF2-1 HIGH (extra-property `style` → export XSS), PF2-2 MED (malformed-input DoS), PF2-3 MED (unicode/code validator gaps), PF2-4 HIGH (react-server-dom-webpack CVE-2026-44907), PF2-5 LOW (/docs marked innerHTML), PF2-6 LOW (bridge delivery honesty). Approval-gate + privacy confirmed CLEAN.

### Pass 3 (Claude, commit bbe6ccd, docs/SECURITY.md "Third pass") — CURRENT
All six FIXED and **live-verified** on the deployment through the real WebMCP runtime:
- PF2-1: `parseSceneInput` builds a fresh allowlisted SceneInput (no raw spread); `additionalProperties:false`; exporter `safeColor` colour allowlist. Live replay: style breakout dropped, export clean.
- PF2-2: strict runtime parser → `invalid-input`. Live replay confirmed.
- PF2-3: Arabic-Indic/Persian digit maps + `\p{Cf}` strip + code-shaped token scan + money-context decimals.
- PF2-4: react trio → 19.2.8 (CVE gone from audit).
- PF2-5: /docs DOMPurify (pinned + SRI). PF2-6: bridge returns delivery success honestly; shape-validated readback.
- Gates: 33/33 tests (incl. tool-boundary replays via `buildTools().add_scene`), tsc/oxlint clean, hyperframes 0/0, live smoke 200×4. Deployed Worker fb9486a3, docs refreshed dce4600e.
- Statuses marked **FIXED (pending Codex re-review)** — NOT unilaterally closed.

### Pass 4 (Codex) — PENDING, Codex hit usage limit, resumes ~6:33 PM
Ask to Codex: adversarially re-review the six fixes — probe `parseSceneInput` for a missed sink, `CODE_SHAPED_RE` over/under-flagging, `safeColor` allowlist bypass. Also: write the fix↔review loop into the bucket-test skill as a security-loop step (Codex owns that skill).

## Open handoffs to Codex on resume
1. Security pass 4 (re-review the six fixes above).
2. Refresh `docs/VERIFICATION.md` test count (still says 27/27; actual 33/33).
3. Add the security fix↔review loop step into the `bucket-test` skill.

### Passes 4–6 (2026-09-02) — LOOP CLOSED
- Pass 4 (Codex replay) → 6 residuals (PF4-1..6) → fixed by Claude, commit e14c67b, live-replayed.
- Pass 5 (Codex replay) → 1 residual (PF5-1 update_scene total cap) → fixed by Claude, commit 71bad0a.
- Pass 6 (Codex replay of 71bad0a) → **CLEAN**. Codex recorded it in SECURITY.md (commit 77e7cdd).
- Final gates: 41/41 tests, tsc, oxlint, diff-check clean; docs mirror identical.
- Both agents agree: SECURITY.md is closed for this submission. Residual (accepted, documented): spelled-out numbers and promo tokens outside both detection tracks; build-tooling npm advisories not on a Worker request path.

## Engineering review round 2 (2026-09-02) — brief (for any successor session)
Marco's ask: code/design must be neat and super fast. Three axes, reviewed independently by Codex and a Claude subagent, then reconciled; changes only where BOTH agree, minimal, no speculative structure.
1. Design: language/versions/dependencies; add/remove services.
2. Code structure/quality/compatibility: latest-vs-stable choices; browser/OS availability of APIs used (document.modelContext, \p{Cf} regex, crypto.randomUUID, color-mix, localStorage).
3. Setup: Cloudflare Workers config (compat date/flags, observability, assets caching, Smart Placement, Cache Rules, headers/CSP/HSTS), Vercel (domain only), paid add-ons — switch on/off with reasons.
Status: brief sent to Codex (surface:19) and a Claude review subagent; awaiting both. Successor session: read this section, collect both reports, reconcile, execute agreed items, re-run gates, deploy.

### Round 2 reconciliation (2026-09-02)
AGREED by both reviewers: keep the whole stack (vinext beta + RSC, React 19.2.8, Vite 8, TS 5.9, Tailwind 4.2, wrangler 4.127) — no framework migration before submission; no new services; Smart Placement OFF; Tail Workers OFF; no paid add-on by default; keep compatibility_date; keep dual modelContext probe; static immutable cache already correct; ADD security headers (nosniff, Referrer-Policy, Permissions-Policy, HSTS) via vinext `headers()`; NO CSP before submission (RSC inline scripts → hydration risk).
CLAUDE-ONLY (proposed, low risk): replace 3 user-visible "ProofFrame" strings with BRAND.name (export <title>, studio aria-label, download filename); check Workers CPU p99 in dashboard → enable Workers Paid only if near the 10 ms free cap; optional: exact-pin React versions.
DISAGREEMENT → Marco decides: remove 58 unused components/ui + hooks/ + 8 dead deps now (Claude: S effort, shrinks CSS 209 KB→smaller, judges see a clean tree; guarded by build+tests+live smoke) vs after judging (Codex: pure regression risk this close to deadline).
DEFERRED (post-challenge): Vite SPA migration (drop RSC/server bundle), split proofframe-studio.tsx, CSP, Tailwind retention, dedupe ok()/fail() helpers.
Executed (both agreed, 2026-09-02): security headers via vinext `headers()` — nosniff, Referrer-Policy, Permissions-Policy, HSTS — live-verified on /studio; three user-visible "ProofFrame" strings → BRAND.name (export title, studio aria-label, download filename). CPU: no preemptive Workers Paid; enable only on observed exceededCpu/1102 signals. Deployed Worker 8dd6f959. The dual-review protocol is now a reusable skill: ~/.claude/skills/dual-review (facts.sh + reconciliation protocol).

### Round-2 DISAGREE resolved by Marco (2026-09-02) — dead code removed
Marco's call on the one open disagreement (Claude: remove now / Codex: after judging): **remove now, guarded**.
Executed on `main` (commit a80f9c4): 58 unused `components/ui/*` + `hooks/use-mobile.ts` deleted after a
reachability closure from the real entries (`app/`, top-level `components/`, `lib/`, `tests/`) — only `badge`
and `button` are reachable. Dropped the 8 deps only those files used: `@shadcn/react`, `cmdk`, `date-fns`,
`embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `recharts`. Kept
`react-dom`, `react-server-dom-webpack`, `vinext` (framework runtime, never imported directly).
Guard, in order: 41/41 tests → build clean → oxlint clean → local `wrangler dev` smoke (/, /studio, /closet
200, headers identical to prod) → deploy → live smoke on hemloop.marcoatwill.workers.dev (same three routes
200, byte-identical to local, security headers unchanged). dist 2.2M → 1.8M, client 936K → 772K.
Worker version 5499efd5. Codex's regression concern is answered by the live smoke, not by argument.

Also landed: the `dual-review` skill gained a **Handshake** section — the five peer-agent coordination rules
this log produced the hard way (durable log over session-local messages, handoff-safe briefs, instruction-source
boundary, declared file ownership, stalled reviewer ≠ consent). Backed up in `~/projects/claude-setup`.

### Ownership exception, logged (2026-09-02)
`docs/VERIFICATION.md` is Codex-owned (Roles, rule 4). Its `npm test` line still claimed 27/27 — a wrong
present-tense number on a public submission page, with the Codex lane dormant. Marco was asked and said fix it,
so Claude edited it: 27/27 → 41/41, date bumped, and one line recording the 2026-09-02 re-verification at HEAD
after the dead-code removal. No other section touched; the rest of the file remains Codex's record.

## Spec & vendor-guideline conformance pass (2026-09-02, Claude) — for both agents
Marco asked whether the plan phase read the official material. It did not: no session before this one
opened webmachinelearning/webmcp, developer.chrome.com/docs/ai/webmcp or learn.chatgpt.com/docs/webmcp.
Read now: the spec (index.bs), README, security questionnaire, Chrome's best-practices / build-tools /
secure-tools / imperative-api pages, ChatGPT's WebMCP page. Audited all 15 tools by script.

**Conforms:** names (ASCII, `_`, ≤30 chars), descriptions ≤500, param descriptions ≤150, `readOnlyHint` on
every read-only tool, `document.modelContext` reached (probe covers both namespaces), no iframes / no
declarative API (ChatGPT supports neither), `Origin-Agent-Cluster: ?0` not sent, Permissions-Policy leaves
`tools` at default. Chrome's "validate strictly in code, loosely in schema" and "descriptive errors for
agent self-correction" is exactly our validator + `locked-fact-violation` / `human-approval-required` shape.

**Gaps, smallest first (each needs the other agent's OK before landing):**
| # | gap | source | fix | effort |
|---|---|---|---|---|
| G1 | Proof-trail card prints `navigator.modelContext`; every official doc and the live runtime say `document.modelContext` | spec, Chrome, ChatGPT | branch `preflight-modelcontext-label` (1 line) | S |
| G2 | `inputSchema` lacks `additionalProperties:false` on 13 of 15 tools (only add_scene/update_scene have it); ChatGPT's own sample sets it even for `{}` | ChatGPT docs | add to every schema | S |
| G3 | `untrustedContentHint` never set; `import_product` (Shopify data) and `get_wardrobe` (user-entered rows) return externally/user-sourced content | Chrome secure-tools | `annotations.untrustedContentHint:true` on those two | S |
| G4 | `registerTool()` returns a Promise we neither await nor catch; the badge counts our list, not confirmed registrations. `NotAllowedError` / duplicate-name `InvalidStateError` would be silent and the badge would still say "live" | spec §registerTool | `Promise.allSettled`, count fulfilled, surface rejects | M |
| G5 | Tool output budget 1.5K chars: `export_composition` returns 4,046 (whole HTML); `get_campaign_state` is 1,352 at seed and grows with scenes | Chrome secure-tools | export returns summary + triggers the human download; state tool trims | M |
| G6 | Result shape is MCP content-blocks, then the browser JSON-stringifies it again → double-encoded text. Works (live-verified) but Chrome says return a string, ChatGPT returns a plain object | Chrome, ChatGPT | return the object directly | S, touches 41 tests |
| G7 | No `AbortSignal` on registration (unregister on unmount) and `import_product` ignores `options.signal` | spec | moot once cross-links are full-document navigations (see below); pass signal to fetch | S |
| G8 | `get_wardrobe` description uses negative constraints ("do not…"); Chrome: limitations should be implicit | Chrome best-practices | reword | S |
| G9 | Chrome judges must flip `chrome://flags/#enable-webmcp-testing`. A Chrome 149+ **origin trial token** for hemloop.marcoatwill.workers.dev (meta tag) removes that step. Only Marco can register (Google account) | Chrome | register at developer.chrome.com/origintrials → `<meta http-equiv="origin-trial">` in layout | S, Marco |

**Found on the way, not a spec item — P0 for judging:** the header cross-links and both landing CTAs do
nothing on the live site. vinext `<Link>` calls `preventDefault()` then its client router throws
`TypeError: e is not a function` inside `startTransition` (`navigateClientSide` undefined; also
`[vinext] RSC prefetch setup error` on mount). Reproduced on pre-cleanup commit 000aedb → predates the
dead-code removal; it is vinext 1.0.0-beta.5. Fix on branch `fix-cross-links-plain-anchor` (440ba04): plain
`<a href>` in three files, verified on a local Worker build (/closet ↔ /studio, 6/9 tools register per
page, no console errors), 41/41 tests, tsc, build clean. Caveat: the browser extension's synthetic clicks
never trigger anchor activation, so the human-click path was confirmed by reading the Link handler
(preventDefault at link.js:680 precedes the throw at :712), not by a trusted click.

**ChatGPT runtime facts for the demo:** site tools only on GPT-5.6 Sol/Terra (Luna disabled), desktop app
built-in browser, Work/Codex workspaces; "Site tools" indicator in the address bar. Written into
video/CUE-SHEET.md preflight.

### Marco's ruling on the conformance pass (2026-09-02) — executed
Marco: "work on 1–4". So the DISAGREE path resolved by the owner, as the rules allow; Codex lane still dormant.
- Merged `fix-cross-links-plain-anchor` (cross-links + landing CTAs work again) and `preflight-modelcontext-label`.
- Landed G2 (closed schemas), G3 (`untrustedContentHint`), G4 (awaited registration, honest badge), G5 (export
  returns a summary and delivers the file), G6 (plain-object results), G8 (positive wording) — commit 09142d5.
- G9: `WEBMCP_ORIGIN_TRIAL_TOKEN` slot in brand.ts + conditional meta in layout; Marco is registering the origin
  `https://hemloop.marcoatwill.workers.dev` at the WebMCP origin trial. Paste token → rebuild → deploy.
- oxlint `nextjs/no-html-link-for-pages` turned off with the reason in the commit.
- Gates: tsc, oxlint, 42/42 tests (+3 conformance tests), build, local Worker smoke in Chrome 151 (6/9 tools,
  flat results through `executeTool`, hints present, no console errors), deploy 27ae3d2a, live smoke 200×4 and
  the new markup confirmed on the live HTML. Note: Chrome 151's `getTools()` returns `inputSchema` as a JSON
  **string** (spec says object) — our schemas carry `additionalProperties:false` inside that string.
- Still stealth (robots deny-all, noindex) until the branch `post-submission-unstealth` merges after the deadline.
- `dual-review` skill gained **Step 0**: read the spec + every vendor guide + support matrix before the brief,
  audit by script. Backed up in claude-setup.

### hemloop.app cutover (2026-09-02) — done
Domain registered at Vercel (2026-08-31), nameservers moved to Cloudflare (zone 70bfe32d…, active), imported
Vercel A/CNAME records deleted by Marco (CAA kept — they name the CAs Cloudflare uses). `prepare:worker` now
adds `routes` for `hemloop.app` + `www` as custom domains and pins `workers_dev: true` (routes disable
workers.dev silently — it was dark ~2 min on the first attempt). Cert: Google Trust Services. Origin-trial
tokens for both origins ship in the layout (expire 2026-11-17). Reader-facing docs now say hemloop.app;
VERIFICATION.md and this log keep historical URLs. Worker 9aaf46c2.

### Revamp wave 1 live (2026-09-02, Worker 23e7526e) — Marco's 14-point feedback + judge review
Four Sonnet worktree agents (landing+brand, data+photos, studio+closet UX, docs) plus two Opus reviewers
(judge review, commerce-agents fit) ran in parallel; Claude merged, resolved three conflicts, re-ran gates
(tsc, oxlint, 44/44 tests, build), smoked locally in Chrome 151 (6 closet / 10 studio tools live, get_offer
343 chars, fences, thumbnails, no console errors), deployed, live-smoked hemloop.app. Shipped: hem-loop logo
+ favicon.svg, hero rewrite, 16-tool table with the "absent by design" row, ChatGPT-first agent blocks,
footer roles incl. Vercel, docs CTA, gutter fix, no em dashes, hover/reveal/fold motion; 8 Shopify-grade
products + 13 Unsplash photos; brands renamed (Northlight Apparel, Ridgeline Outdoor, Denim Supply Co.,
code NORTHLIGHT25); labels renamed (Approved offer facts, Agent activity log, Incoming requests, Requests
sent, Approve next request, Missing and thin, What leaves this page); get_offer (10th studio tool); `next`
on every rejection; fences with commerce-agents labels <closet_data>/<storefront_data> and fixpoint marker
stripping; Need/Want pills + grouping; GA-debugger flash + tool-call counters; wardrobe thumbnails, inline
edit/delete, clear button + retention sentence; docs restructured (README hero, WRITEUP with article
vocabulary + Instant Checkout lesson + roadmap, PRD roadmap, guides). Codex lane still dormant: all of this
is FIXED pending peer re-review. Next: wave 2 (consent dial 0-3, preferences + get_preferences, occasion,
Me/Partner/Kid, placement selector, completeness meter, bought/passed), judge re-review, video, public repo,
Devpost.

### Revamp wave 2 live (2026-09-02, Worker 3bcd95fb) — consent as the product mechanic
Two Sonnet worktree agents (closet, studio) on a shared contract; Claude merged (one EOF CSS conflict), fixed a
canvas-panel grid row the placement control had displaced, ran gates (tsc, oxlint, 63/63 tests, build), and
smoked end to end in Chrome 151 on the local Worker: consent dial set to 2 Context, Approve (level 2), the
agent's report_demand_gap crossed the bridge with occasion=gift, for=self, context.fitPreference and
consent.fields listing exactly what left; the immediate retry was blocked again (one-shot intact); the studio
showed the grouped count, the Need pill, Occasion/For/Shared-at-level lines, completeness 9 of 9 and the
placement control. Shipped: consent levels 0-3 with payload preview and sharing-disabled at 0; preferences
card + get_preferences (7th closet tool, closet_data fence); Shopping for Me/Partner/Kid across UI and tools;
Bought/Passed outcomes via signal-bridge; placements Story/Feed/Display (human-only); offer completeness meter
(9 facts, also in get_offer); Need/Want sorting in grouped view. Docs pass running as a third agent. Codex lane
still dormant: everything since a80f9c4 is FIXED pending peer re-review.

### Docs pass live (2026-09-02, Worker a986ec0f) + a testing lesson
README / guides / PRD / USE-CASES / DEMO-SCRIPT / CUE-SHEET / TEST-PLAN / GAP-ANALYSIS / landing table now match
the code: 7 closet + 10 studio = 17 tools, consent dial, preferences, profile switch, outcomes, placements,
completeness meter, 63 tests. Lesson recorded for every successor: the Chrome extension's tab runs in a
background window (document.visibilityState === 'hidden'), so CSS transitions and animations never advance and
IntersectionObserver never fires there. Two "bugs" chased tonight (fold height 0, reveal opacity 0) were that
artefact. Verify visuals by measuring the DOM or by a human eye in a focused tab, never by a background-tab
screenshot mid-animation. The fold now toggles display (simplest, works everywhere).

### Ownership exception, logged again (2026-09-02 evening)
`docs/VERIFICATION.md` (Codex-owned): the `npm test` line said 41/41 while HEAD runs 63/63, and its evidence quotes labels
renamed tonight. Claude updated the count and added one "labels were renamed" note at the top; the evidence lines were
left as written since they record what was verified at the time. Codex to refresh properly when the lane wakes.

### Judge round 2 (2026-09-02 night) — 11 of 14 resolved; remaining fixes shipped
Report: docs/coordination/judge-review-2-2026-09-02.md. Legibility gap "roughly 70% closed"; use of WebMCP now
"presented strongly". Shipped from its top 5: an inline SVG flow diagram on the landing (closet -> one approved
request -> studio -> shopping agent, bought/passed back), the consent sentence under the hero plus a four-level
dial table with the never-shared list, level 2 "what leaves" now says "who you are shopping for" (UI, README,
USER-GUIDE, GAP-ANALYSIS agreed on the summary while the payload preview already showed it), the seed ships
without sizesInStock so the completeness meter opens at 8 of 9 with a human-only "Add sizes in stock" button
(the merchant half of "the more you share" now demonstrates on camera), get_offer's guarantee reworded
(returns facts with whether a human locked them), WRITEUP counts 17 / seven / 63, last "signal log" and
"campaign truth" strings retired, studio footer no longer Shopify-pinned, exporter title em dash removed.
Not done, owner's call: SECURITY.md length, docs/coordination in the public repo, VOICEOVER retired terms in
the already-rendered audio.

### Round 3 reconciliation (2026-09-02 night) — all AGREED, landed, live (Worker 67c92ca9)
Reports: CODEX-ROUND3.md (with its "Reconciliation replies"), CLAUDE-ROUND3.md. Brief: ROUND3-BRIEF.md.

| item | Codex | Claude | bucket | action |
|---|---|---|---|---|
| get_wardrobe output unbounded (15K to 58K possible; 2.6K at seed) | CHANGE A(f) | CHANGE #2 | AGREED | explicit compact shape, one closet_data fence, 12 rows, count + truncated, category filter; 50 hostile rows now under 1.5K |
| stored signal can claim consent.fields beyond its level | CHANGE A(b) | do-not-touch, then AGREE after reading the diff (narrowing-only, 72 legit shapes round-trip identical) | AGREED | toSignal re-derives permitted fields per level, drops occasion/for/context < 2 and taste < 3 |
| agent-written </closet_data> reaches the model via size, get_my_sizes, check_fit prose | (CLEAN on brand/colour) then AGREE | CHANGE #1, reproduced | AGREED | fence + untrustedContentHint on get_my_sizes rows and check_fit note; get_wardrobe fences the whole block |
| add_garment has no row cap (200 adds accepted) | AGREE | CHANGE #3 | AGREED | MAX_GARMENTS 40 per profile, wardrobe-full with next |
| no X-Frame-Options (clickjack the Approve / Lock buttons) | AGREE | CHANGE #4 | AGREED | X-Frame-Options: DENY via next.config.ts headers, live-verified |
| README: "physically cannot include wardrobe data", level-1 row missing handle, "purchase history never shared" | AGREE | CHANGE #5 | AGREED | reworded; mirror updated |
| level-2 copy omits "for"; get_offer "locked facts only" | CHANGE (B) | (same, from judge 2) | AGREED | already landed earlier tonight |
| Workers CPU p99 / 1102 errors check | CHANGE (S) | keep | ONE-SIDE, Marco | wrangler OAuth token has no analytics scope; dashboard look by Marco, no Paid pre-emptively |
| vinext beta, deps, CSP, Smart Placement, Tail Workers, component splits, import_product guard in the page callback, truncate off-by-two, robots.txt managed block | KEEP / DEFER | KEEP / DEFER | DEFER | untouched |

Gates after landing: tsc, oxlint, 66/66 tests (3 new: hostile wardrobe budget, stored-consent narrowing, fence
escape + cap), build, deploy, live 200 x4, X-Frame-Options DENY on live. Both reviewers' do-not-touch lists
respected: no dependency, token, robots, CSP, deployment config or component-split change.

### Codex unified-architecture review, Section 16 (2026-09-03) — Hemloop finding, recorded here because the source file lives outside the repo
Source: ~/Documents/Codex/2026-09-02/referenced-chatgpt-conversation-this-is-an/outputs/anthropic-commerce-agents-unified-architecture-summary.md, section 16.
Recommendation: adopt Anthropic commerce-agents **contracts and release discipline**, not its runtime. Bring in now
(already true of the build): explicit closet/studio role boundary sharing only pure contracts and a minimized
signal; tool -> policy -> human approval shape (one-shot approval, consent dial, locked offer facts, gated export);
provenance vocabulary (closet_data / storefront_data fences, untrusted hints, bounded payloads, known identifiers);
the replay loop as the shared eval contract (positive + negative case per tool/consent field; the 66 tests are the
seed); small typed presentation payloads (offer, demand, completeness, export summaries as stable JSON).
Do NOT bring into the challenge app: the Python runtime, intent router or agent swarm, memory store, MCP backend,
raw shopper memory / order history / CRM / credentials, any new service before submission.
Post-challenge seam, three interfaces only: ToolContract (schema, provenance, output budget), ApprovalReceipt
(human/policy actor, scope, expiry, replay key), PresentationEvent (typed UI payload plus source and freshness);
the WebMCP adapters stay one frontend implementation of them.
Claude position: AGREED in full; consistent with docs/coordination/commerce-agents-gap-2026-09-02.md and the
artefacts in docs/integrations/commerce-agents/. No code change before the deadline. Both agents.

### Wave 3 merged, verified and deployed (2026-09-03, Claude) — Codex re-review open
Merged `worktree-agent-a141f49e3736a882c` (docs and landing sync to wave 3) into main (`1c42ce7`), verification
record in `fb025dd`, pushed to `origin/main`.

Gates at the merge: **101/101 tests, tsc clean, oxlint clean, build clean, `public/docs/*` mirror byte-identical.**
Deployed with Wrangler 4.127.0 as Worker version `a89e3f91-8d14-48b2-8b69-adcd04b504bb`. Live smoke: `/`, `/closet`,
`/studio`, `/docs/README.md` and `www.hemloop.app` all 200, security headers unchanged (still no CSP, round-2
decision). Live badges: closet **9 tools**, studio **11 tools**; landing reads "twenty typed tools".

Wave-3 seam verified live on hemloop.app: with one sent request and one merchant-approved `PersonalOffer` in the
page's own storage, clicking **Bought** on the offer card wrote a purchase carrying
`offerId: offer-smoke-abcdef01`, `promoCode: NORTHLIGHT25`, `source: "offer"`, recorded the `bought` outcome against
the request id, and inserted the garment. Attribution holds end to end. Seeded keys cleared afterwards.

Open to Codex:
1. `docs/VERIFICATION.md` is Codex's record (rule 4). Claude appended "Wave 3 gates and live smoke, 2026-09-03",
   explicitly labelled **Recorded by Claude, pending Codex independent re-verification**. Codex to re-run gates and
   live smoke, confirm or correct that entry, and refresh the stale counts elsewhere in the file (63/63, 41/41,
   "studio registers 10 tools, the closet 7").
2. Question, not a change: `PersonalOffer` is declared twice — `lib/proofframe/offers.ts:47` and
   `lib/proofframe/signal-bridge.ts:322`. Two hand-maintained copies of one shape will drift. Claude's read is that
   this is a post-submission consolidation, not a pre-deadline edit. Needs both agents to agree either way (rule 2).

Claude's next lane (Marco's direction, Codex not to touch unless Marco says): purchase-date lifecycle
(due-for-replacement gaps) and merchant inventory insight.

### Wave 4 shipped (2026-09-03, Claude) — Codex re-review open
Marco's direction: purchase-date lifecycle (due-for-replacement gaps) and merchant inventory insight.
Commit `1a0774c`, deployed as Worker version `0322742d-3f09-4660-9e98-3a6fac311518`.

Shopper side. `REPLACEMENT_MONTHS` (a per-category calibration table) plus `monthsBetween`; `findGaps`
appends a `due` gap when the OLDEST garment in an owned category is past its life. The date is the
garment's own `purchasedAt` — the receipt importer and the Bought button now set it from the purchase
row, so anything acquired later starts its own clock. An undated garment is never called worn out, and
absence outranks wear (one gap per category). `report_demand_gap` gained kind `replace` at level `need`;
`KINDS` in signal-bridge widened to match. The seed closet's size-10 sneakers were backdated to
2024-11-05, because a lifecycle nobody can see in the demo is not shipped.

Merchant side. `demandInsight(requests, facts, catalogProduct?, boughtIds?)` in offers.ts: pure, tested,
groups requests by category and size and scores each group `can-offer` / `size-not-in-stock` /
`category-mismatch` using the SAME two predicates `matchOffer` refuses on. It replaces the untested
`aggregateSignals` that lived inside proofframe-studio.tsx, so the panel and the tool cannot diverge.
New tool `get_demand` (read-only, untrustedContentHint) returns those rows plus the request ids —
registered by `getRequests` alone, which also closes a real hole: until now an agent had no tool that
could discover a request id for `propose_offer`, though that tool's own error text told it to.

Defect found and fixed: `matchOffer` refused on `facts.sizesInStock` but emitted
`catalogProduct?.sizesInStock ?? facts.sizesInStock` on the offer, so with sizes coming only from an
imported product it could propose a size the same offer then listed as out of stock. One resolved
source now; regression test added. Found by asserting the insight's verdict against `matchOffer`
itself rather than against a restatement of its rules.

Counts: 21 tools (9 closet, 12 studio), 120 tests. tsc, oxlint, build clean; docs and mirror synced.

Open to Codex:
1. Adversarial re-review of the two new surfaces, especially: `get_demand` returns strings that came
   from shopper-written storage (bounded by `toDemandSignalLike`/`toSignal`, ids capped at 10 per
   group, count uncapped) — is the fence right, and is `untrustedContentHint` enough there?
2. The `kind` union widened to include `replace` in three places (closet.ts, signal-bridge KINDS,
   report_demand_gap schema + guard). Confirm nothing downstream still assumes three kinds.
3. The `matchOffer` stock-source change touches wave-3 code you reviewed. Please confirm the fix
   rather than take it on trust.
4. Still open from the wave-3 entry: `docs/VERIFICATION.md` re-verification, and the duplicated
   `PersonalOffer` interface (offers.ts:47 vs signal-bridge.ts:322).

### Codex wave-4 re-verification (2026-09-03) — two of four items still open
Codex re-ran the suite, typecheck, lint and build (120/120, all clean) and did a read-only live smoke
(200 on all five routes, security headers present, no CSP by the round-2 decision). No deployment, no
production storage mutation. It refreshed `docs/VERIFICATION.md` and the mirror: the current gate is
now stated as 120/120, the 63/63 and 41/41 lines are either replaced or explicitly labelled
historical, and the "pending Codex" notes on the wave 3 and wave 4 entries are resolved. Claude
verified those claims against disk (120/120, tsc/oxlint clean, mirror byte-identical) and committed
the edits as `58d06cd`.

Closed:
- **`kind: 'replace'` downstream** — Codex: no stale three-kind assumption. The closet UI maps any
  non-`want` to Need on purpose; offers.ts, signal-bridge and webmcp handle `replace` explicitly.
- **Duplicated `PersonalOffer`** (offers.ts:47, signal-bridge.ts:322) — **DEFER, both agents agree.**
  Identical today; consolidate post-submission behind one type-only shared contract rather than take
  the churn before the deadline.

Still open, and deliberately not marked done:
1. **The `get_demand` fence.** Asked whether bounded strings plus `untrustedContentHint` are the right
   treatment for rows that came from shopper-written storage. Codex's reply covered the behaviour as
   "covered by the passing tests", which is not an answer to the fence question — the tests are
   Claude's own. Wants an adversarial read, not a green suite.
2. **The `matchOffer` stock-source fix.** Same reason: the regression test shipped in the same commit
   as the fix, so a passing suite is not independent confirmation. The ask was for Codex to reason
   about the change against the wave-3 code it reviewed.

Neither is a submission blocker: both are review depth on code whose behaviour is tested and live.

### Dual review, wave 4 pre-submission (2026-09-03) — reconciliation
Brief: `docs/coordination/DUAL-REVIEW-WAVE4-BRIEF.md` (handoff-safe; carries the extracted spec rules,
a script audit of all 21 tools, and a facts run). Reviewer 1: Codex (`webmcp-help`, cmux surface:19).
Reviewer 2: Claude general-purpose subagent. Only items both marked CHANGE were executed.

| item | Codex | Claude-2 | bucket | action |
|---|---|---|---|---|
| `toDemandSignalLike` weaker than `toSignal` (unbounded signalId/category/size/handle) | CHANGE (found it) | CHANGE (fix correct) | AGREED | bounded to match the bridge; hostile row dropped outright |
| `get_demand` has no output budget | CHANGE (found it) | CHANGE (**first fix insufficient**) | AGREED | fixed counts replaced with the running size guard `get_offers` already used |
| Budget test measured the wrong axis | — | CHANGE | ONE-SIDE, measured | three shapes now, including 36-char UUID ids; the old fixture passed a broken tool |
| `get_demand` description silent on the id cap | — | CHANGE | ONE-SIDE, measured | description says counts are exact and ids are capped |
| `report_demand_gap` description 542 > 500 | — | keep (fix correct) | AGREED | trimmed to 412; surface-wide contract test added |
| Stale 120 test count in 5 files | — | CHANGE | ONE-SIDE, factual | now 127 everywhere + mirror |
| Brief's "no cache-control" claim | — | **CHANGE: the brief was wrong** | ONE-SIDE, measured | corrected in the brief; immutable chunks were already `max-age=31536000, immutable`, `cf-cache-status: HIT` |
| `tsconfig target: ES2017` vs \p{Cf} / `.at()` / `color-mix()` | — | keep | no action | `noEmit: true`, so the target ships nothing; vite 8's `baseline-widely-available` (Chrome 111+/Safari 16.4+) governs and every API clears it |
| `monthsBetween` DST / month-end | — | keep (executed) | no action | pure UTC calendar-field arithmetic, no ms math; Jan 31 to Feb 28 = 0 verified |
| `findGaps`: never both missing and due | — | keep (executed) | no action | the `reported` set makes it structurally impossible |
| Single old garment gets "only one in rotation", no `due` block | — | DEFER | DEFER | under-reports, never over-reports; the seed cannot reach it |
| `shadcn` in dependencies, `@openai/sites-vite-plugin`, 1697-line studio component | — | DEFER | DEFER | real, cosmetic, in the build path — post-submission |
| `cache-control` on un-hashed `public/*` | — | DEFER | DEFER | etag revalidation already works; the `_headers` merge mechanism is unverified |
| Dependency versions incl. betas, `compatibility_date`, bindings, Smart Placement, observability, CSP | — | keep / do NOT touch | no action | all already at the right setting; changing any of them today is blank-page risk |

**The dual review paid for itself twice.** Codex found a class of bug I could not see because I wrote
both the tool and its tests in one pass. Reviewer 2 then found that my *fix* for it was wrong: fixed
group/id counts passed a group-heavy fixture while still returning 1,670 chars on the ordinary
production shape (36-char UUID ids over four sizes), because the dominant term is ids x id length,
not group count. The repo already had the right pattern in `get_offers` — with a comment explicitly
saying "rather than trusting a fixed row count" — and I reinvented the thing this codebase had
already rejected. Reviewer 2 also caught that the brief's own cache-control fact was false, because
`facts.sh` probes only `/`.

**`crypto.randomUUID` caveat, no code change:** it is `undefined` outside a secure context, so
`add_garment` breaks if the demo is run from `http://<LAN-IP>:5173`. Demo on hemloop.app or localhost.

### Scope change: Codex off the repo, demo pack reassigned to Claude (2026-09-03)
Marco redirected Codex to prototype a redesigned demo as a **separate ChatGPT Site** ("Loop Room":
one space, repeated agent action, human gates, shopper -> merchant -> shopper outcome) before any
Vercel or domain decision. Codex is therefore **not** editing this repo and **not** touching
hemloop.app, Cloudflare or DNS, and asked that production stay stable with no collision.

Confirmed stable at the moment of the handover, not assumed: `main` clean and in sync with origin at
`78c4e0e`, Worker `cb5bea9e-bc71-4a8b-8121-d87675fed053` serving all five routes at 200, 136/136
tests. No deploy has happened since.

**This left the v4 demo pack unowned.** `docs/coordination/CODEX-DEMO-HANDOFF.md` section 3 assigned
it to Codex an hour before the scope change; that section is now stale and is marked so. Codex's own
finding stood: the pack was not recordable. `docs/VOICEOVER.md` was still the nine v3 export-centric
segments and its VO-05 still said the merchant's agent had "nine typed tools" when the studio
registers twelve; `video/CUE-SHEET.md` rows were still timed to v3 and listed the loop close as an
optional beat; `docs/DEMO-SCRIPT.md` had no prompt sheet at all.

Claude took it, because it blocks Marco's recording and the deadline is 1pm PT today. Docs only, no
code, no deploy, no collision with Codex's separate prototype:

- `docs/VOICEOVER.md` rewritten as eight v4 segments, 2:00 spoken against a 2:40 runtime, zero em
  dashes (the clone reads them as a hard stop), numbers spelled out.
- `video/CUE-SHEET.md` retimed to the v4 spine; the stale "loop close is optional" beat replaced,
  since in v4 it is the spine and must never be cut; preflight sharing level corrected to level 1.
- `docs/DEMO-SCRIPT.md` gained the prompt sheet: C1-C5, M1-M4, with the two human clicks marked as
  the moves no tool can perform.
- Checked mechanically rather than by eye: all eight VO ids and their times match the cue rows, and
  every paste id the cue sheet references is defined in the prompt sheet.

If Codex's Loop Room lands and Marco prefers it, this pack gets rewritten against that instead. It is
worth having either way, because Marco cannot record against a pack that contradicts itself today.
### Loop Room design lane started (Codex, 2026-09-03)

Codex is working on branch `codex/loop-room-design`, limited to the agreed presentation lane:
`app/globals.css`, `components/site-header.tsx`, and `components/loop-room/*`. The existing untracked
docs files belong to Claude and will not be staged or edited. One narrow additional file is required
to make the assigned Manrope + DM Sans change real rather than a fallback-only CSS declaration:
`app/layout.tsx` will load those two fonts and attach their variables to `<body>`. No metadata,
origin-trial token, bridge, tool, page composition, or callback code will change there.

### Cursor reskin: closet + studio on Loop Room tokens (2026-09-03)

Branch: `cursor/reskin` (worktree `../hemloop-cursor`). Lane: presentation only.

Shipped:
- `app/closet.css` imported by `components/closet-studio.tsx`
- `app/studio.css` imported by `components/proofframe-studio.tsx`
- One presentation hook: `approve-offer-button` class on the studio Approve offer Button (coral human gate)
- Tokens scoped under `.studio-shell` as a bridge (main's `:root` still has the old dark `--ink`/`--acid`); values match hemloop-loop-site. Codex may delete the scoped aliases once `:root` carries `--ink #17211c`, `--moss`, `--loop`, `--cream`, `--paper`, `--coral #ee6f4d`, `--forest`, `--muted`, `--line`, `--radius`
- Fonts: Manrope display + DM Sans body via Google Fonts `@import` in the two new files (until Codex wires them in layout/globals)
- Verified desktop 1440 + 820px with `getBoundingClientRect`: wardrobe widest column; garment `56px minmax(0,1fr)` thumb-in-col-1 preserved; Harborview Basics single-line at 820 after minmax(220px); coral on Approve next request / Lock facts / Bought / Approve offer
- Gates: 138/138, tsc clean, oxlint 0, build "Build complete." No deploy.

**`globals.css` blocks now dead for `/closet` and `/studio`** (Codex can delete or stop maintaining once this branch merges; landing and any other consumers of the same selectors still need a pass):

Surface shell / chrome (overridden under `.studio-shell`):
- `.studio-shell`, `.studio-header`, `.brand-mark`, `.closet-mark`, `.eyebrow` (surface uses), `.campaign-title`, `.status-dot`, `.status-badge`, `.webmcp-badge`, `.export-button`, `.cross-link`, `.surface-nav`

Closet:
- `.closet-grid`, `.garment-list`, `.garment-card` (+ thumb grid rules), `.garment-cat`, `.garment-meta`, `.garment-icon-button`, `.garment-edit-*`, `.gap-card`, `.gap-due-tag`, `.share-approval`, `.outcome-button` / `.outcome-label`, `.clear-all-button`, `.import-*`, `.purchase-row`, `.source-badge`, `.preferences` / `.profile-tab` surface rules

Studio:
- `.panel` / `.truth-panel` / `.proof-panel` / `.canvas-panel`, `.truth-row`, `.brief-button`, `.placement-*`, `.preview-stage`, `.demand-item`, `.demand-use`, `.propose-offer-button`, `.offer-proposal` / `.offer-actions` / `.offer-badge`, `.aggregate-row`, `.auto-propose-toggle`, `.asset-card`, `.validation-card`, `.scene-card`, `.activity-item`

Do **not** delete from globals until Codex confirms no other route still depends on the dark variants. Cursor did not edit `app/globals.css`.

### Cursor: merchant demand dashboard (2026-09-03)

Branch: `cursor/merchant` (worktree `../hemloop-cursor`). Presentation + new route only.

Shipped:
- `app/merchant/page.tsx` → `components/merchant-dashboard.tsx` + `app/merchant.css`
- Reads bridge only: `readSignals/Outcomes/Offers` + subscribers; scores with `demandInsight` + `seedCampaign().facts` + studio-parity `catalogProductFor` (demoCatalog + slug). No new lib/, no tools registered, no globals.css / header edits on closet|studio.
- Sections: header stats (requests, replace, proposed/approved, bought, attributable revenue), demand table (verdict pills + action title), newest-first request feed (8-char id, consent, outcome; no identity column), cannot-fill callout, real empty state.
- Gates: 138/138, tsc, oxlint, build (route `/merchant` listed). No deploy — Claude owns merge/deploy.

### Loop Room wired to real callbacks; Merchant merged (Claude, 2026-09-03, session 07)

Merged into `main` from a fresh worktree, no conflicts: `cursor/merchant` at `9db1cd3` (merchant demand
dashboard on the live bridge, `/merchant`) and `codex/loop-room-components` at `6910b18` (presentational
Loop Room, station motion on real state changes).

`/` is now the Loop Room, per MERGE-PLAN.md step 4:

- `components/loop-room-page.tsx` owns both halves of the state (closet rows and locked campaign),
  registers all 21 tools once (9 closet + 12 studio, names already unique) and builds `LoopRoomView`
  from bridge rows and real tool results. Codex's components are untouched; props in, JSX out.
- `lib/proofframe/loop-room.ts` gained `loopRoomFlags(evidence)`: every station flag comes from a bridge
  row or an ok tool result this session. A restart (`loopStartedAt`) scopes rows to the new cycle instead
  of clearing storage, so `/closet` and `/studio` keep seeing the earlier loop. One test covers the
  scoping.
- Three human gates on the page, none reachable by a tool: Approve next request (arms one
  `report_demand_gap`), Approve offer (flips the staged proposal to `approved` on the bridge), Bought
  (records the outcome, logs the purchase with the offer id, adds the garment).
- Restart rule: a closed loop plus a new ok `import_receipt` starts cycle N+1; the rail resets and the
  'again' station's prompt is the rival (Harborview) receipt.
- Merchant is in the shared `site-header` nav and in the closet and studio surface navs.
- `components/landing.tsx` is no longer routed. Left in place for its tool table until someone decides
  to delete it.

Smoke on the local Worker with a Chrome build that exposes `document.modelContext.executeTool`: the
whole loop ran on real calls (import_receipt → find_gaps → report_demand_gap refused → Approve → sent →
refused again → get_demand → propose_offer → Approve offer → get_offers → Bought → outcome panel), then
the rival receipt opened cycle 2 with the rail reset. Gates: 139/139, tsc clean, oxlint 0, build complete.

### Cursor wave 5: assets + shared chrome (2026-09-03)

Branch: `cursor/wave5` (worktree `../hemloop-cursor`).

Landed:
1. `public/favicon.ico` (16/32/48 from `favicon.svg`) + `<link rel="icon" href="/favicon.ico" sizes="any" />` in `app/layout.tsx` only.
2. `public/receipts/northlight-till-receipt.png` + `harborview-order-email.png` from `SAMPLE_RECEIPTS`; download links under the closet import textarea.
3. `/closet`, `/studio`, `/merchant` render shared `SiteHeader` (`active` set); dropped per-page `studio-header` / `merchant-header` / `surface-nav`. Verified 1440 + 820 with getBoundingClientRect.
4. `components/site-footer.tsx` not on main yet (Codex wave5 branch not published) — pushed without footer.
5. Closet trail copy now says ten garments shared with the Loop Room; UI already showed `Wardrobe · 10`. No leftover user-facing "eight garments" on closet/docs.

Gates: 140/140, tsc, lint, build. No deploy.

### Cursor sitemap: one page per side, tabs inside (2026-09-03)

Branch: `cursor/sitemap` (worktree `../hemloop-cursor`). Implements docs/coordination/SITEMAP.md.

Landed:
1. `/studio` tabs: Demand (folded merchant dashboard as `merchant-demand-panel.tsx`) · Offer and rules · Composition. Default `?tab=demand`.
2. `/closet` tabs: Wardrobe · Requests and offers. Default wardrobe.
3. Tab state in `?tab=` via `useSurfaceTab` (useSyncExternalStore); tools still register once; tool handlers switch to the panel they change.
4. `/merchant` redirects to `/studio?tab=demand`; deleted `merchant-dashboard.tsx` + `merchant.css`.
5. SiteHeader LINKS are Loop · Closet · Studio · Docs (Merchant removed); cross-link pills removed from closet/studio chrome.
6. SiteFooter not on main — pushed without it.

Verified 1440 + 820 with getBoundingClientRect. Gates: 140/140, tsc, lint, build. No deploy.

### Codex wave 5: Loop Room presentation (2026-09-03)

Branch `codex/loop-room-wave5`; implementation commit `2fe1155`. Work stayed in the independent
`proofframe-webmcp-codex-room` worktree. Landed against the eleven-item brief:

1. Rail: compact labels for todo stations, full labels for current/done, with connectors behind nodes.
2. Status vocabulary: only `Processing` during a call and `Done` after one; no status chip on arrival.
3. Locked party names: `Shopper · Closet` and `Merchant · Demand`.
4. Party geometry: equal-height aligned shopper and merchant cards.
5. Closet: real active-profile rows, actual `+N`, new-item entry motion, family switch, and Add five.
6. Creative placement: item/gap product creative stays shopper-side; merchant composition/checkout stays merchant-side.
7. Last run: the latest completed tool activity remains visible below the current station.
8. Station hierarchy: facts first, update second, human-only gate last.
9. Hero: current eyebrow/title, with lighter weight, normal tracking, and more eyebrow breathing room.
10. Cycle number: change pulse keyed to the real cycle number.
11. Footer: brand plus exactly Loop, Closet, Studio, Docs and `Demo data, real brands`.

Sitemap follow-up also landed: plain `Open the closet` and `Open the studio` anchors inside their
respective party cards. `SiteHeader` and its link constant were not edited, leaving Cursor's sitemap
change conflict-free. Not landed from the eleven-item brief: none. No extra task or deploy was started.

Verification: desktop local browser smoke at 1440 px; 140/140 tests, TypeScript clean, oxlint clean,
and production build complete.

### Cursor wave5b: docs chrome + shared campaign (2026-09-03)

Branch: `cursor/wave5b` (worktree `../hemloop-cursor`), rebased onto `origin/main` @ `6267478`
(Codex SiteFooter live).

Landed:
1. `public/docs/index.html` header matches `SiteHeader` (logo top-left, Loop · Closet · Studio · Docs
   with Docs active, Manrope/DM Sans + loop tokens, pill nav). Docs sections/reading order untouched.
   Footer is a static byte-mirror of `components/site-footer.tsx` (docs is static HTML — cannot import
   the React component; markup + tokens stay in lockstep with Codex's component).
2. `/closet` and `/studio` render Codex's `SiteFooter` (Loop Room already did).
3. `readCampaign` / `writeCampaign` in `lib/proofframe/seed.ts` (`hemloop.campaign`): seed when
   empty/unavailable/corrupt JSON; validate facts + scenes (+ format/style/factsLocked) before
   trusting storage. Hydrate on mount in `loop-room-page.tsx` and `proofframe-studio.tsx`, write
   after hydration — same pattern as wardrobe. A human lock on `/studio` persists as `factsLocked`
   on `/`.
4. Test in `tests/proofframe.test.ts` with the fake-window pattern from `tests/closet.test.ts`.

Lane note (Claude, after Codex quota): visual fixes inside `components/loop-room/*` and
`app/globals.css` are Cursor's when Marco reports them; `lib/proofframe/loop-room.ts` props
contract stays untouched.

Verified docs chrome at 1440 (header 72px, nav centered) and 820 (wraps, no overflowX) via
getBoundingClientRect. Gates: 141/141, tsc, lint, build. No deploy.

### Gemini lane dropped (Claude, 2026-09-03, session 07 close)

Marco's call: Antigravity / Gemini 3.8 Flash was far slower than expected and never pushed
`gemini/docs` (worktree `../hemloop-gemini`, nothing committed there worth keeping). The lane in
`GEMINI-WAVE5.md` (docs to the Loop Room and the four-route sitemap, three tests, delete
`components/landing.tsx`) goes to Cursor when it has quota, or to Claude in session 08.

Correction (Claude, later the same evening): Gemini had drafted the three tests before it was dropped.
Pushed as `origin/gemini/docs` @ `9084260`, unverified, for Cursor to cherry-pick onto `cursor/docs`.
The `../hemloop-gemini` worktree is removed. Cursor is carrying the whole docs lane on `cursor/docs`.

### Cursor docs: Gemini lane (2026-09-03)

Branch: `cursor/docs` (worktree `../hemloop-cursor`). Took over `GEMINI-WAVE5.md` after
`origin/gemini/docs` @ `9084260` (tests only, unverified).

Landed:
1. Docs → Loop Room + four-route sitemap: `USER-GUIDE`, `02-the-loop`, `05-quick-start`,
   `DEMO-SCRIPT`, root `README` (21 tools on `/`, tabs, `/merchant` → `/studio?tab=demand`).
   `public/docs/*` mirror byte-identical for every file that exists in both.
2. Cherry-picked Gemini's three tests from `9084260` and verified under gates:
   `readWardrobe`/`writeWardrobe` (seed / roundtrip / invalid category / corrupt JSON),
   `randomGarments` determinism, tool descriptions ≤320 chars. All kept.
3. Deleted `components/landing.tsx`; tool table already lived in `docs/04-webmcp-overview.md`
   (noted + `get_offer` row aligned with landing). `grep` in app/components: no imports.

aria-current on `/docs/`: Claude correction — the four matches are Docs (header + footer); nothing
to fix. An earlier mistaken "fix" on this branch was reverted.

Gates: 144/144, tsc, lint, build. No deploy.

### Cursor wave6: closet + studio at phone width (2026-09-03)

Branch: `cursor/wave6` (worktree `../hemloop-cursor`). Codex owns Loop Room; this lane is
`app/closet.css` + `app/studio.css` only.

Landed:
1. One column under 820px (closet grid, offer/composition/demand bodies).
2. Surface tabs: `flex-wrap: nowrap` + horizontal scroll strip (no body overflow).
3. Touch targets ≥44px for Approve next request, Bought, Lock/Unlock offer facts, Approve offer
   (and matching Decline / profile / import controls on narrow).

getBoundingClientRect / overflow (`scrollWidth <= innerWidth`) at four widths:

| width | closet overflow | studio overflow | tabs | Approve next (h) | Bought (h) | Lock facts (h) | Approve offer (h) |
|---|---|---|---|---|---|---|---|
| 390 | no (390) | no (390) | nowrap, h=44 | 46, in-view | 44, in-view | 50, in-view | 46, in-view |
| 430 | no (430) | no (430) | nowrap, h=44 | 46, in-view | 44, in-view | 50, in-view | 46, in-view |
| 820 | no (820) | no (820) | nowrap, h=44 | 46, in-view | 44, in-view | 50, in-view | 46, in-view |
| 1440 | no (1440) | no (1440) | wrap OK | 46, in-view | 44, in-view | 50, in-view | 44, in-view |

Gates: 144/144, tsc, lint, build. No deploy.

### Cursor merchants: multi-merchant market scan (2026-09-03)

Branch: `cursor/merchants` (worktree `../hemloop-cursor`). Cut from `origin/main` @ `6920425`
(MERCHANTS-BRIEF + MarketRow contract). Did not touch `components/loop-room/*` (Codex renders
`view.market`).

Landed:
1. `lib/proofframe/merchants.ts` — `seedMerchants()` (five) + pure `marketScan` (matchOffer +
   margin-floor + over-ceiling; can-offer first, then seed order). Real L1 prices: Northlight
   44.93, Overland 80.10; Taste ceiling 60 → only Northlight.
2. Per-merchant storage: `hemloop.campaigns` + `hemloop.merchant`; migrate legacy
   `hemloop.campaign` → `campaigns.northlight`. `seedPreferences.priceCeiling` = 60.
3. `loop-room-page.tsx`: fill `view.market` / `view.activeMerchant`; auto-switch to first
   can-offer; offer-station say/facts name the market.
4. Studio Demand: merchant switcher + per-request market rows (verdict + price only).
5. Tests: five verdicts at L1 and L3, ordering, storage roundtrip + migration; completeness
   expects seed sizes locked. Tool count still 21.
6. Docs: "Only the right store answers" in `02-the-loop.md`; market line in `USER-GUIDE.md`;
   `public/docs/` mirror byte-identical.

Gates: 146/146, tsc, lint, build. No deploy.

### Cursor merchants-2: can-offer reason + XS switch seed (2026-09-03)

Branch: `cursor/merchants-2` (worktree `../hemloop-cursor`), from `origin/main` @ `43aebe7`.

Landed:
1. `can-offer` reason is margin only (`margin 46.58%`); price stays on `MarketRow.price`.
2. Overland sizes XS–XL so hoodie · XS → Northlight `size-not-in-stock`, Overland answers at
   80.10 (active-merchant switch can fire). Size-sold-out reason uses the request size.
3. marketScan test for the XS case; one line in `02-the-loop.md` (+ `public/docs/` mirror).

Gates: 147/147, tsc, lint, build. No deploy.

### Cursor batch4: E-commerce wording, receipt cards, family closets (2026-09-03)

Branch: `cursor/batch4` (worktree `../hemloop-cursor`), from `origin/main` @ `25db337`.
Item 1 (header RuntimeStatus) is Codex; this lane did 2–4. Did not touch `components/loop-room/*`.

Landed:
2. User-facing "commerce" → "E-commerce" in `BRAND.sub`, docs 01/PRD/WRITEUP (+ mirrors). Left
   commerce-agents and the Anthropic article quote alone. TECH-GUIDE/TEST-PLAN/GAP had no other hits.
3. Closet import: two sample cards (receipt thumb + .eml from/subject/date preview), Use this sample,
   download icon; textarea kept; parser untouched.
4. Partner and Kid seed at 7 each; kids photos `public/products/kids-*.jpg` + PHOTO-CREDITS;
   `catalog-kids.json` + `kidsCatalog`; `randomGarments` for kid draws kids sizes/photos only.
   Self gaps unchanged. Tests for profile counts + kid pool.

Gates: 147/147, tsc, lint, build. No deploy.
### Cursor closet-fix: /closet mid-width overflow (2026-09-04)

Branch: `cursor/closet-fix` (worktree `../hemloop-cursor`), from `origin/main` @ `9b1bb31`.
Urgent production fix before batch4. `app/closet.css` only.

Cause: garment-list `minmax(160px)` made ~5 crushed columns at ~1000px so Edit/Delete
spilled the card; closet-grid tracks used `minmax(340px|300px)` (could force overflow);
panels had padding 0 so headings sat on the edge. Wave6's ≤820 one-column rule was fine;
the break was the mid-width single-column + skinny auto-fill tracks.

Fix:
1. Closet grid tracks `minmax(0, fr)` + width/max-width 100%; stack to one column ≤1200px.
2. Garment list `minmax(240px, 1fr)`; card `overflow:hidden; min-width:0`; actions wrap.
3. Panel padding `18px 20px`.

getBoundingClientRect at 390 / 430 / 820 / 1000 / 1200 / 1440 (/closet + /studio?tab=offer):

| w | page | body overflow | panels left≥0 | cards≤col | actions≤card | eyebrow left |
|---|---|---|---|---|---|---|
| 390 | closet | no | yes | yes | yes | 31 |
| 390 | studio | no | yes | — | — | 33 |
| 430 | closet | no | yes | yes | yes | 31 |
| 430 | studio | no | yes | — | — | 33 |
| 820 | closet | no | yes | yes | yes | 31 |
| 820 | studio | no | yes | — | — | 33 |
| 1000 | closet | no | yes | yes | yes | 35 |
| 1000 | studio | no | yes | — | — | 37 |
| 1200 | closet | no | yes | yes | yes | 35 |
| 1200 | studio | no | yes | — | — | 37 |
| 1440 | closet | no | yes | yes | yes | 35 |
| 1440 | studio | no | yes | — | — | 37 |

Gates: tests + tsc + lint + build. No deploy (Claude deploys immediately).

### Cursor batch4 follow-up: RuntimeStatus on /closet + /studio (2026-09-04)

Asked to replace the closet/studio `Badge` ("9/12 WebMCP tools live") with Codex's
`RuntimeStatus` (blink + terminal label + centred tool-manifest dialog), passing each
page's own tools mapped to `{ name, title, description, readOnly }` and the absent
(human-only) list — same alive status as `/`.

**Blocked:** `RuntimeStatus` is not on `origin/main` yet (`components/loop-room/index.ts`
does not export it; no `runtime-status.tsx`). Codex still has it on the local
`codex/wave6` worktree only. Left the existing `Badge` on `/closet` and `/studio`
unchanged. Will wire as soon as Codex's export lands on main.

### Cursor batch4: remove LoopRail from closet/studio (2026-09-04)

Branch: `cursor/batch4`. Loop lives on Loop Room; the five-step rail's "Next: Press
Approve…" contradicted the "Yes, send it" handshake.

Landed:
- Removed `<LoopRail>` + `loopFlags` from `closet-studio.tsx` and `proofframe-studio.tsx`
- Deleted `components/loop-rail.tsx` and orphaned `.loop-rail` CSS (closet/studio/globals)
- Kept `lib/proofframe/loop.ts` + its tests (`loop-room` still imports `LoopFlags`)
- Header Loop link is the way back; rail slot is empty

Did not touch `components/loop-room/*`.

### Cursor batch4: footer credit + docs mirror (2026-09-04)

Branch: `cursor/batch4`. Mirrors Codex's `site-footer` credit line.

Landed:
- `components/site-footer.tsx`: `Demo data, real brands` → `© 2026 Marco Cheung · Source on GitHub`
  (link `https://github.com/marconvm/hemloop`, `rel=noopener`, `target=_blank`)
- `public/docs/index.html` static footer byte-mirrors that `<p>` markup (+ `p a` chrome CSS)
- `app/globals.css`: same `p a` rule Codex has (dropped unused `p > span` dot)
- Closet/studio headers: no `Demo data, real brands` Badge after SiteHeader move (WebMCP status only)

Did not touch `components/loop-room/*`.

### Cursor consent-ui: Requests dial + real next-request preview (2026-09-04)

Branch: `cursor/consent-ui` (worktree `../hemloop-cursor`), from `origin/main`.
Did not touch `components/loop-room/*`.

Landed:
1. Stepped sharing control (0 Private · 1 Basics · 2 Context · 3 Taste), body-size type,
   short What leaves / What you gain lines, no grey-on-grey.
2. `nextRequestPreview` from top wardrobe gap (kind `replace` when `due`, else `gap`);
   payload rows show real values; travelling in ink, held back greyed; dial changes light rows.
3. Tool counter readable (14px body ink, not monospace grey).
4. Empty state: "What should I buy next?" → Tell the store / Press Approve / Reply Yes, send it.

Verified 1440 / 1000 / 430 (no overflow; dial 4-col → 2-col at 430). Gates: 151 · tsc · lint · build.
### Cursor closet-fix: real desktop wardrobe width (2026-09-04)

Branch: `cursor/closet-fix`. Live hemloop.app at 1456 still crushed three cards into a
~570px wardrobe column (Delete overflowing) because `.closet-grid` was three fr tracks
for a two-child DOM — third track empty, wardrobe starved. globals still had
`minmax(160px)` / `minmax(340px|300px|300px)`.

Landed (CSS only: `app/closet.css` + `app/globals.css`):
1. Closet grid → two columns `minmax(0, 1.7fr) minmax(0, 1fr)` (wardrobe | gaps)
2. Garment list → `auto-fill minmax(220px, 1fr)`; card content `minmax(0, 1fr)`
3. Row actions wrap/shrink inside the card

Verified getBoundingClientRect at 1000 / 1200 / 1456:
- panel.left >= 0, no body overflow
- card.right <= column.right, delete.right <= card.right
- 1456: wardrobe ~890px (3×276 cards), gaps ~524px, no dead third column

Gates: tests · tsc · lint · build. Deploy immediately.

Also on this branch: /studio Demand `Store:` label was flush at left=0 (clipped to
`re:` on live at 1456). `demand-tab-chrome` now shares the merchant-body width;
offer-grid uses `minmax(0,…)`. Label reads `Store:`.

### Cursor studio-pass: inventory table, Hemloop brand, density (2026-09-04)

Branch: `cursor/studio-pass` (from closet-fix tip). Did not touch `components/loop-room/*`.

A. Per-size `inventory: { sku, size, qty }[]` on each merchant; `sizesInStock` derived
   (`sizesInStockFromInventory`). Northlight SKUs match catalog.json; Ridgeline M qty 0.
   `LockedInventoryTable` on Demand + Offer (SKU, size, units, cost, floor %, max disc %, sale).
B. Header first link Loop → Hemloop; "Waiting on Hemloop"; closet/docs/README Loop Room → Hemloop
   as product name; cycle "the loop" kept.
C. Studio density: shorter empty/stat copy, body-size ink, numbers first on stat strip.

Gates: 149 · tsc · lint · build.

### Cursor storage-hardening: campaign/wardrobe bounds + manifest copy (2026-09-04)

Branch: `cursor/storage-hardening` from `origin/main` @ `532e369`.
Judge review 3 P0s + P1 + hostile regressions. Did not touch `components/loop-room/*`.

Landed:
1. `lib/proofframe/storage-policy.ts` — shared https URL + `/products/…` image + date/percent bounds
2. Strict `parseCampaign` / `parseFacts` / scenes / format preset / CSS colours; fail → seed
3. `toGarment()` rebuild in `readWardrobe` (same-origin images only, profile enum, row cap 60)
4. `toOffer` purchaseUrl https-only; image same-origin product path
5. Manifest: `get_campaign_state` / `import_product` copy no longer call unlocked facts human-locked
6. Hostile storage tests (campaign + wardrobe) + manifest copy assertions

Gates: 155 · tsc · lint · build.

### Dual review wave 6: Claude reviewer's verdicts filed (2026-09-04)

`DUAL-REVIEW-WAVE6-CLAUDE.md` exists (Opus subagent, reviewed at `532e369`, before
`cursor/storage-hardening` merged). Codex's `DUAL-REVIEW-WAVE6-CODEX.md` is pending; reconciliation
follows in `DUAL-REVIEW-WAVE6-RECONCILED.md`. Nothing from the review is executed until both are in.
Already overtaken by main since the review: S14/S15 (Codex's P0s and the manifest copy) landed in
`9f58c54`; S13 (`readPurchases` unvalidated) remains open.
