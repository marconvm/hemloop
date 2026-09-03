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
