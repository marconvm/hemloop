# Hemloop, Product Requirements Document

| | |
|---|---|
| Product | Hemloop, a two-sided agent-native commerce loop: shopper-side wardrobe reasoning, human-approved zero-ID demand, truth-locked campaign production |
| Context | OpenAI WebMCP Challenge, submission deadline 2026-09-03 13:00 PT |
| Status | Draft for build, v2 (v1 was merchant-side only) |
| Date | 2026-08-30 |

## 1. Problem and context

Three structural problems, two sides of the counter:

1. **Merchants are blind to owned inventory.** A merchant knows what they sold, never what a shopper already owns, is missing, or wants in which size. That demand data exists only offline, in closets. Every attempt to collect it raw has been a privacy liability.
2. **Wardrobe data is unusually sensitive.** A shopper's agent should not need to hand an itemised closet to a merchant in order to make it useful.
3. **Agent-produced marketing is a compliance risk.** Creative tools are hostile to agents (canvases and timelines cannot be operated by guessing at pixels), and an agent asked to "make it punchy" will write 50% when the offer is 25%. In regulated retail promotion that is a legal problem, not a style problem.

Hemloop closes the loop across all three. The agent can reason over wardrobe rows on the shopper surface, but Hemloop's merchant-facing bridge accepts only a **human-approved, zero-ID demand event**. The merchant gets what is needed to act — category, size and optional product — without an account ID, stable hash or wardrobe rows. The merchant answers demand through a truth-locked workflow whose agent tools are claim-validated before they apply. A promo video is one output of that workflow, deliberately not the whole product: an agent video editor alone is a crowded category, the closed loop is not.

## 2. Key considerations

Argued before the solution, so the solution reads as a conclusion.

**Why WebMCP rather than a hosted MCP server.** The tools must operate on live page state (the composition being edited, the preview playhead) inside the user's session. WebMCP registers tools in the page itself, so agent and human manipulate the same state object with no backend, no credential grant and no sync problem.

**Why truth-locking is not a tool.** The trust boundary is the product. If an agent could lock or unlock facts, the guarantee "agents cannot alter campaign truth" would be a convention, not a property. Locking is therefore only reachable through the human UI. This asymmetry is deliberate and load-bearing.

**Why validate before applying, not after.** A validator that flags problems after they land still shows a wrong price on screen and relies on someone noticing. Rejecting the mutation before state changes means a non-compliant frame never exists.

**Why export refuses on violations.** The exported HTML is the deliverable that leaves the tool. An export gate is the last line where the guarantee can be enforced structurally.

**Why a catalog snapshot rather than live Storefront API.** The demo store is a password-protected development store; tokenless client-side fetches redirect to the password page. A committed snapshot generated from the real store keeps the provenance (real Shopify catalog data) while making the demo deterministic and offline-safe. The importer signature already matches a live fetch, so a storefront token upgrades it without an interface change. Rejected: shipping an Admin API token to the client, which is never acceptable.

**Why the signal has no shopper hash.** A hash of a predictable or stable shopper identifier is still pseudonymous and may be enumerable; the merchant does not need it for this workflow. `report_demand_gap` is Hemloop's only merchant-facing tool and its output schema contains no identity field or wardrobe rows. It also rejects until the shopper arms a one-shot approval in the UI; no WebMCP tool can grant that approval. The tool returns the exact payload sent, so the shopper (and the judge) can inspect the boundary directly.

**Why two routes on one origin, not two origins.** The narrative is two surfaces; the deployment is two routes of one app. Same-origin means the signal bridge (localStorage + storage events) works today, in any browser, with no dependency on unverified multi-tab tool availability in agent browsers. The agent can still be the join across both tabs where supported, but the demo does not bet on it.

**Rejected: two-origin tool composition as the core mechanic.** An earlier candidate (two independent sites joined only by the agent) scored higher on ambition but depended on unverified multi-tab tool behaviour. On a 4-day build, an unverified core mechanic is disqualifying; the one-origin bridge keeps the same story with none of the risk.

## 3. Solution and phases

Three routes on one origin. `/` is the landing page (the pitch, agent setup, tool contract). `/closet` is the shopper surface: private wardrobe, gaps and sizes, a signal log, 6 WebMCP tools. `/studio` is the merchant surface: campaign truth (human control), live 9:16 composition preview with timeline, a Live Demand panel fed by the signal bridge, and a proof trail logging every agent action, acceptance and rejection; it registers 9 WebMCP tools. Export emits a standalone, deterministic HyperFrames-format HTML composition renderable to video.

| Phase | Client-visible outcome | Gate | Date |
|---|---|---|---|
| P1 Core library and tool surface | Validator, exporter, WebMCP adapter, all unit-tested | 15 tests green, lint and typecheck clean | 2026-08-30, done |
| P2 Studio integration | Working three-panel studio, blocked-claim demo live in browser | Manual browser verification, hyperframes check passes on export | 2026-08-30, done |
| P3 Shopify import and docs | import_product from real-store snapshot, PRD and guides | 19 tests green, docs committed | 2026-08-30, done |
| P3b Closet surface and signal loop | /closet page, 6 shopper tools, zero-ID signal bridge, studio demand panel | Unit tests green, loop verified in browser end to end | 2026-08-30, done |
| P4 Agent verification | Tools exercised by a real agent (Chrome WebMCP flag or ChatGPT) | Demo loop recorded end to end | 2026-08-31 |
| P5 Submission pack | Public repo, deploy, video, Devpost entry | Owner approval, then submit with 24 h buffer | 2026-09-01 to 09-02 |

## 4. Acceptance criteria

Each criterion is verifiable and traceable to a test or a documented manual check.

| # | Criterion | Verified by |
|---|---|---|
| AC-1 | Agent mutations that contradict locked facts are rejected with a structured violation list and change no state | tests/proofframe.test.ts, blocked-claim browser demo |
| AC-2 | No WebMCP tool can alter or unlock campaign facts; import_product fails while facts are locked | adapter tool-surface test, studio guard |
| AC-3 | Export refuses while any violation exists; exported HTML passes hyperframes check with 0 errors | exporter tests, hyperframes check run |
| AC-4 | The disclaimer renders for the full duration of every export and is not removable by any tool | exporter footer test |
| AC-5 | All rendered copy is HTML-escaped in the export | escaping test |
| AC-6 | Tool registration works under both navigator.modelContext and document.modelContext | adapter probe + registration test |
| AC-7 | import_product maps real catalog pricing to facts and keeps promo terms human-owned | tests/shopify.test.ts |
| AC-8 | The page functions as a normal single-user editor when WebMCP is absent (preview mode) | manual browser check |
| AC-9 | Repository ships an OSI license, README, PRD, user guide and tech guide | repo inspection |
| AC-10 | DemandSignal has no shopper identifier or wardrobe field; `report_demand_gap` rejects without human one-shot approval, consumes approval on use, and returns the exact payload sent | tests/closet.test.ts |
| AC-11 | Signals emitted on the closet surface appear in the studio demand panel live (same tab and cross tab) | browser loop verification |
| AC-12 | The closet's read tools carry readOnlyHint and report_demand_gap is the only outbound tool | closet tool-surface test |

## 5. Ownership

| Component | Owner |
|---|---|
| lib/proofframe (validator, exporter, adapter, importer) and tests | Claude session "webmcp" |
| Studio UI, app shell, hosting scaffold | Codex session "webmcp-help" |
| Approvals: public repo, deploy, submission | Marco (product owner) |

## Appendix A, WebMCP tool contract

Summarised; full schemas in `lib/proofframe/webmcp.ts` and docs/TECH-GUIDE.md.

| Tool | Kind | Guarantee |
|---|---|---|
| get_campaign_state | read | readOnlyHint |
| validate_claims | read | dry-run, never mutates |
| export_composition | read | refuses on violations |
| set_brief | write | free-form, brief is not rendered copy |
| add_scene / update_scene | write | claim-validated before apply |
| reorder_scenes | write | permutation-checked |
| seek_preview | write | clamped to composition length, deterministic |
| import_product | write | snapshot-backed, blocked while facts are locked |

## Appendix B, Closet tool contract (shopper surface)

| Tool | Kind | Guarantee |
|---|---|---|
| get_wardrobe | read | readOnlyHint; never exposes the raw shopper id |
| get_my_sizes | read | readOnlyHint |
| find_gaps | read | readOnlyHint |
| check_fit | read | readOnlyHint; uses the public catalog snapshot |
| add_garment | write | enum-validated category, bounded strings |
| report_demand_gap | write | only merchant-facing tool; requires human one-shot approval, emits a zero-ID DemandSignal and returns the exact payload sent |
