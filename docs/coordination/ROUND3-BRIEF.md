# Engineering review round 3, post-revamp (2026-09-02 night) — brief for Codex and a Claude reviewer

Handoff-safe: a reviewer with zero chat context can act on this. Owner: Marco. Coordinator: Claude session
webmcp-hemloop-04 (cmux surface:71). Codex: cmux surface:19 ("webmcp-help"). Deadline 2026-09-03 13:00 PT.

## What changed since your last look (round 2 at 000aedb)
Everything since a80f9c4 landed without a peer review because the Codex lane was dormant; it is all
FIXED-pending-peer-re-review. Read docs/coordination/CODEX-COORDINATION.md sections from "Round-2 DISAGREE
resolved" to "Judge round 2", then docs/coordination/judge-review-2-2026-09-02.md. Headlines:
- Dead code removed (58 ui components, hooks/, 8 deps). vinext <Link> router threw on click; cross-links are plain anchors.
- WebMCP spec/vendor conformance: plain-object results, closed schemas, readOnlyHint/untrustedContentHint, awaited
  registerTool with rejection handling, get_offer (10th studio tool), next on every rejection, fences <closet_data>/<storefront_data>.
- hemloop.app custom domain, origin-trial tokens for both origins (www covered).
- Revamp: hem-loop logo/favicon, hero rewrite, 17-tool table, consent dial 0-3 with payload preview and
  sharing-disabled at 0, preferences + get_preferences (7th closet tool), Shopping for Me/Partner/Kid,
  Bought/Passed outcomes, placements Story/Feed/Display, offer completeness meter (seed opens 8 of 9, human
  "Add sizes in stock" button), Need/Want pills and grouping, GA-debugger flash + counters, thumbnails, inline
  edit/delete/clear, brands renamed (Northlight Apparel, Ridgeline Outdoor, Denim Supply Co., NORTHLIGHT25),
  labels renamed (Approved offer facts, Agent activity log, Incoming requests, Requests sent, Approve next request).
- Docs restructured; commerce-agents fit analysis in docs/coordination/commerce-agents-gap-2026-09-02.md.

## Facts (from scripts/facts.sh, live)
== live headers (https://hemloop.app) ==
strict-transport-security: max-age=31536000; includeSubDomains
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url, X-Vinext-Interception-Context, X-Vinext-Mounted-Slots, X-Vinext-Rsc-Render-Mode
permissions-policy: camera=(), microphone=(), geolocation=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
server: cloudflare
== TTFB (time_starttransfer) ==
/ 0.115251s
/closet 0.104410s
/studio 0.114058s
/docs/ 0.080947s
Tests: 63/63. Live Worker 0e5f2e3b.

## The three axes, as always
1. Design: deps (11 runtime), versions, vinext beta risk relative to a 13:00 PT deadline; anything to add/remove.
2. Code structure / quality / compatibility: the new consent code path (lib/proofframe/closet.ts consentFieldsForRequest,
   webmcp-closet.ts report_demand_gap), signal-bridge.ts round-trip guard for the new fields, proofframe-studio.tsx
   (1,300 lines) and closet-studio.tsx (1,000 lines) size, the fence sanitizer (webmcp.ts fence), the awaited
   registration (registerAll). Browser API availability of anything new.
3. Setup / platform: custom domain + workers.dev both serving, origin-trial metas, headers (no CSP by earlier agreement),
   robots deny-all until the deadline, any paid switch. Name what NOT to touch in the last 12 hours.

## Specific asks
A. Security replay on the new surface: can an agent (a) send a request at a level above the shopper's dial, (b) widen
   consent.fields, (c) forge or replay a signalId, (d) break out of a <closet_data> fence, (e) write offer facts through
   any tool, (f) exceed 1.5K output on get_wardrobe with a hostile wardrobe? Give reproductions or say CLEAN per item.
B. The privacy claims on the landing and README versus the code: any sentence stronger than the code.
C. Verdicts: keep / CHANGE / DEFER per item, one-line reason, S/M/L; your top 5 you would do before 13:00 PT and the
   list you would NOT touch. Write your report to docs/coordination/CODEX-ROUND3.md (Codex) or return it (Claude subagent).
   Only items BOTH reviewers agree on will land; disagreements go to Marco.
