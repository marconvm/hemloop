# Plugging Hemloop into a commerce-agents style harness

Hemloop is a WebMCP tool surface, not an agent. Anthropic's reference repo
[anthropics/commerce-agents](https://github.com/anthropics/commerce-agents) is the shape of harness we
aim to be consumed by. The fit analysis is in
[../../coordination/commerce-agents-gap-2026-09-02.md](../../coordination/commerce-agents-gap-2026-09-02.md).
This folder holds the two artefacts that harness already knows how to read:

- `SKILL.md`: a skill a shopping agent loads to use the closet tools (frontmatter `name` and
  `description`, then the flow: read before you recommend, size from provenance-checked handles, stage a
  demand request and let the person approve).
- `demand-003-approval-gate-holds.json`: a snapshot eval case in the repo's case format, driving Hemloop's
  tool boundary instead of a model. Keys that need a live agent carry `skip` with the reason.

What Hemloop already matches: results carry `next` remediation text; untrusted content is fenced with the
repo's source labels (`<closet_data>`, `<storefront_data>`); `signalId` is server-issued; caps are enforced
on resulting state; the two human gates are the repo's "model stages, person applies". What we refuse:
memory keyed by a person. The wardrobe, preferences and request log are bound to the browser and can be
cleared by the shopper; no field that could identify the shopper ever enters a request at any sharing level.

## Post-challenge seam (agreed by both reviewing agents, 2026-09-03)

Three interfaces, nothing more: `ToolContract` (schema, provenance label, output budget), `ApprovalReceipt`
(who approved, human or policy, scope, expiry, replay key) and `PresentationEvent` (typed UI payload with
source and freshness). The WebMCP adapters in `lib/proofframe/webmcp*.ts` stay one frontend implementation of
those interfaces; a future authenticated backend adds server-side identity and revalidation behind them without
weakening the no-identifier bridge. Not before the deadline: no runtime, router, memory store, MCP backend or
new service enters the challenge app.

Wave 3's offer approval is what `ApprovalReceipt` looks like in practice before that interface exists as code: a merchant presses Approve on a `PersonalOffer` staged by `propose_offer` or the Auto-propose toggle, the offer's `status` flips from `proposed` to `approved` with an `approvedAt` timestamp, and only that state, keyed to the request's `requestId`, is what `get_offer(requestId)` and `get_offers` will ever return. No WebMCP tool can write `approved`. A future `ApprovalReceipt` would give that flip a durable, replayable record (who, scope, expiry); the shape it needs to carry is already visible in this one field today.
