# Dual review brief — Hemloop wave 4, pre-submission (2026-09-03)

Handoff-safe: assume zero chat context.

**Repo** `/Users/marco/projects/proofframe-webmcp`, branch `main`, HEAD after wave 4 (`58d06cd` +
coordination commit). **Live** https://hemloop.app (Cloudflare Worker, version `0322742d`).
**Deadline** Devpost today 1pm PT — this is a pre-submission review, not a refactor window.
**Reviewers** Codex session `webmcp-help` (cmux surface:19) and a Claude general-purpose subagent.
**Rule** only items BOTH reviewers mark CHANGE get executed. Disagreements go to Marco; nothing
happens meanwhile. Everything deferred gets written into `docs/coordination/CODEX-COORDINATION.md`.

## What changed since the last review (wave 4)

Shopper side (`lib/proofframe/closet.ts`, `lib/proofframe/webmcp-closet.ts`,
`components/closet-studio.tsx`):
- `REPLACEMENT_MONTHS` (per-category calibration table) and `monthsBetween(from, to)`.
- `findGaps(wardrobe, now = new Date())` appends a `due` gap when the OLDEST garment in an owned
  category is past its replacement life. Date source is the garment's own `purchasedAt`; the receipt
  importer and the Bought button now set it from the purchase row. Undated garment is never flagged;
  absence outranks wear (one gap per category).
- `report_demand_gap` gained `kind: 'replace'` (level `need`); `KINDS` in signal-bridge widened.
- Seed sneakers backdated to 2024-11-05 so the lifecycle is visible in the demo.

Merchant side (`lib/proofframe/offers.ts`, `lib/proofframe/webmcp.ts`,
`components/proofframe-studio.tsx`):
- `demandInsight(requests, facts, catalogProduct?, boughtIds?)`: pure, groups requests by
  category+size, scores each `can-offer` / `size-not-in-stock` / `category-mismatch` using the same
  two predicates `matchOffer` refuses on. Replaces the untested `aggregateSignals` that lived in the
  studio component.
- New tool `get_demand` (readOnlyHint + untrustedContentHint), registered by `getRequests` alone.
- `toDemandSignalLike` now carries `kind`, `level`, `at` through.
- Fix: `matchOffer` refused on `facts.sizesInStock` but emitted
  `catalogProduct?.sizesInStock ?? facts.sizesInStock` on the offer, so it could propose a size the
  same offer then listed as out of stock. One resolved source now.

## Extracted rules the code must satisfy (from the 2026-09-02 spec read, docs/TECH-GUIDE.md)

Sources: WebMCP spec (webmachinelearning.github.io/webmcp), its explainer, Chrome's WebMCP guide
(developer.chrome.com/docs/ai/webmcp — best-practices, secure-tools, imperative API), ChatGPT's
WebMCP page (learn.chatgpt.com/docs/webmcp).

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

## Script audit of all 21 tools (`scripts/audit-tools.mts`, run at HEAD)

```
closet  get_wardrobe        name=12 desc=302  addlProps=false readOnly=true  untrusted=true
closet  get_my_sizes        name=12 desc=53   addlProps=false readOnly=true  untrusted=true
closet  find_gaps           name=9  desc=320  addlProps=n/a   readOnly=true  untrusted=false
closet  check_fit           name=9  desc=123  addlProps=false readOnly=true  untrusted=true
closet  get_preferences     name=15 desc=216  addlProps=n/a   readOnly=true  untrusted=true
closet  add_garment         name=11 desc=55   addlProps=false readOnly=false untrusted=false
closet  report_demand_gap   name=17 desc=542  addlProps=false readOnly=false untrusted=false  <<< OVER 500
closet  import_receipt      name=14 desc=246  addlProps=false readOnly=false untrusted=false
closet  get_offers          name=10 desc=292  addlProps=n/a   readOnly=true  untrusted=true
studio  get_campaign_state  name=18 desc=177  addlProps=n/a   readOnly=true  untrusted=false
studio  set_brief           name=9  desc=75   addlProps=false readOnly=false untrusted=false
studio  add_scene           name=9  desc=119  addlProps=false readOnly=false untrusted=false
studio  update_scene        name=12 desc=100  addlProps=false readOnly=false untrusted=false
studio  reorder_scenes      name=14 desc=57   addlProps=false readOnly=false untrusted=false
studio  seek_preview        name=12 desc=77   addlProps=false readOnly=false untrusted=false
studio  validate_claims     name=15 desc=99   addlProps=false readOnly=true  untrusted=false
studio  export_composition  name=18 desc=212  addlProps=n/a   readOnly=true  untrusted=false
studio  get_offer           name=9  desc=370  addlProps=false readOnly=true  untrusted=false
studio  import_product      name=14 desc=129  addlProps=false readOnly=false untrusted=true
studio  get_demand          name=10 desc=357  addlProps=n/a   readOnly=true  untrusted=true
studio  propose_offer       name=13 desc=234  addlProps=false readOnly=false untrusted=false
```

**Already found, both reviewers please confirm the fix rather than re-find it:**
`report_demand_gap`'s description is 542 chars, over Chrome's documented 500, introduced by wave 4's
`replace` sentence. The existing suite only length-checks `get_preferences`, one tool, incidentally —
which is why it slipped. `docs/TECH-GUIDE.md` currently claims "yes (unit-tested for
names/descriptions/schema)", so the doc is also wrong. Proposed: trim the description, and promote
the audit above into the suite as one test that loops EVERY tool on BOTH surfaces.

## Facts (scripts/facts.sh, run at HEAD against live)

- node v22.22.3; deps 11, devDeps 17; tsconfig `target: ES2017`, `module: esnext`,
  `moduleResolution: bundler`.
- `components/ui`: 2 present, 2 imported (badge, button) — no dead vendored UI.
- Worker: `compatibility_date 2026-05-15`, flags `["nodejs_compat"]`, no bindings of any kind.
- Build: dist 2.6M (client 1.5M, server 1.1M). Largest chunks: index 192k, framework 188k,
  webmcp 88k, closet-studio 40k, proofframe-studio 40k.
- Live headers on `/`: HSTS, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
  X-Frame-Options: DENY, `server: cloudflare`, a long `Vary`. **No `cache-control` header at all,
  and no `cf-cache-status`** — please judge this on axis 3.
- TTFB: `/` 0.107s, `/closet` 0.126s, `/studio` 0.092s.
- Gates at HEAD: 120/120 tests, tsc clean, oxlint clean, build clean, `public/docs/*` mirror
  byte-identical to `docs/*`.

## The three axes — answer all three

1. **Design**: runtime/dependency versions, beta-vs-stable risk RELATIVE TO A DEADLINE TODAY
   (`vinext@1.0.0-beta.5`, `vite@8`, `@base-ui/react@1.7.0`), anything vendored but unused, any
   service to add or remove.
2. **Code structure / quality / compatibility**: layering, oversized files, duplication a judge
   notices in ten minutes. For EVERY modern API the code uses, state its availability and whether the
   build passes it through — the repo is `target: ES2017` while the code uses at least `\p{Cf}` and
   other Unicode property escapes (ES2018), `Object.hasOwn` (ES2022), `Array.prototype.at` (ES2022),
   `structuredClone`?, `crypto.randomUUID` (secure context), `color-mix()` in CSS. Say which of these
   are actually reachable in a judge's browser and whether ES2017 downlevelling touches them.
   Specific to wave 4: is `monthsBetween`'s UTC arithmetic right across DST and month-end; can
   `demandInsight`'s id cap (10/group, count uncapped) mislead; is `get_demand`'s treatment of
   shopper-written strings (bounded by `toDemandSignalLike`, plus `untrustedContentHint`) the right
   fence, or does it need the same `<closet_data>` / `<storefront_data>` style fence the closet tools
   use.
3. **Setup / platform**: Cloudflare Worker config, cache headers for immutable `_next/static` chunks
   vs HTML (currently none — say ON/OFF and why), security headers, Smart Placement, observability,
   paid add-ons. Each with ON/OFF and a reason. Explicitly name what NOT to touch today.

## Output shape required

For each item: `keep` / `CHANGE` / `DEFER`, a ONE-LINE reason, and S/M/L effort. Then:
- "Top 5 I would do before submission today"
- "Would NOT touch today" (and why)

Judge facts, not memory. If you assert a limit or a browser-support claim, name the source.
