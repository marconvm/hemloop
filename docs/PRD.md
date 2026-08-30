# ProofFrame, Product Requirements Document

| | |
|---|---|
| Product | ProofFrame, an agent-native promo studio with human-locked campaign truth |
| Context | OpenAI WebMCP Challenge, submission deadline 2026-09-03 13:00 PT |
| Status | Draft for build, v1 |
| Date | 2026-08-30 |

## 1. Problem and context

Retail marketing teams produce short promotional videos for every campaign. Two things go wrong today:

1. Creative tools are hostile to agents. Canvases, timelines and drag interactions cannot be operated reliably by an AI agent guessing at a UI, so agents are locked out of exactly the work they could accelerate.
2. Agent-written copy is a compliance risk. An agent asked to "make it punchy" will happily write 50% when the offer is 25%, drop the end date, or promise "guaranteed lowest price". In regulated retail promotion, that is not a style problem, it is a legal one.

ProofFrame resolves both at once: the studio exposes its editing surface to agents as structured WebMCP tools, and every agent mutation passes through a claim validator bound to campaign facts that only a human can set.

## 2. Key considerations

Argued before the solution, so the solution reads as a conclusion.

**Why WebMCP rather than a hosted MCP server.** The tools must operate on live page state (the composition being edited, the preview playhead) inside the user's session. WebMCP registers tools in the page itself, so agent and human manipulate the same state object with no backend, no credential grant and no sync problem.

**Why truth-locking is not a tool.** The trust boundary is the product. If an agent could lock or unlock facts, the guarantee "agents cannot alter campaign truth" would be a convention, not a property. Locking is therefore only reachable through the human UI. This asymmetry is deliberate and load-bearing.

**Why validate before applying, not after.** A validator that flags problems after they land still shows a wrong price on screen and relies on someone noticing. Rejecting the mutation before state changes means a non-compliant frame never exists.

**Why export refuses on violations.** The exported HTML is the deliverable that leaves the tool. An export gate is the last line where the guarantee can be enforced structurally.

**Why a catalog snapshot rather than live Storefront API.** The demo store is a password-protected development store; tokenless client-side fetches redirect to the password page. A committed snapshot generated from the real store keeps the provenance (real Shopify catalog data) while making the demo deterministic and offline-safe. The importer signature already matches a live fetch, so a storefront token upgrades it without an interface change. Rejected: shipping an Admin API token to the client, which is never acceptable.

**Rejected: two-origin tool composition.** An earlier candidate (two sites joined by the agent) scored higher on ambition but depended on unverified multi-tab tool availability in current agent browsers. On a 4-day build, an unverified core mechanic is disqualifying.

## 3. Solution and phases

A single-page studio with three panels: campaign truth (human control), live 9:16 composition preview with timeline, and a proof trail logging every agent action, acceptance and rejection. The page registers 9 WebMCP tools. Export emits a standalone, deterministic HyperFrames-format HTML composition renderable to video.

| Phase | Client-visible outcome | Gate | Date |
|---|---|---|---|
| P1 Core library and tool surface | Validator, exporter, WebMCP adapter, all unit-tested | 15 tests green, lint and typecheck clean | 2026-08-30, done |
| P2 Studio integration | Working three-panel studio, blocked-claim demo live in browser | Manual browser verification, hyperframes check passes on export | 2026-08-30, done |
| P3 Shopify import and docs | import_product from real-store snapshot, PRD and guides | 19 tests green, docs committed | 2026-08-30, done |
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
