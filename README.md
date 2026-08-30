# ProofFrame

**An agent-native promo studio where humans lock the truth and agents do the production.**

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/). A human sets and locks campaign facts (prices, offer, promo code, dates, disclaimer); an AI agent, connected through [WebMCP](https://webmcp.dev/) tools registered by the page itself, storyboards and edits a 9:16 motion promo in the same UI, in the same state, in real time. Every agent mutation is claim-validated **before it applies**: copy that says "50% off" against a locked 25% offer is rejected with a structured reason and changes nothing. The exported video composition refuses to exist while any violation remains, and the legal disclaimer is baked into every frame as an element no tool can remove.

## Why WebMCP

Creative tools are the worst case for agents that guess at UIs: canvases, timelines and drag interactions are effectively unclickable. WebMCP lets the studio hand the agent a real editing contract instead, nine typed tools operating on the live page state the human is looking at. No backend, no API keys, no OAuth: the tools run in the page, in the user's own session. And because the tool layer is where validation lives, the human-agent trust boundary is enforced structurally, not by prompt.

## Quickstart

```sh
npm install
npm run dev            # studio on http://localhost:3000
npx tsx --test tests/*.test.ts   # 19 tests
```

To connect an agent: enable `chrome://flags/#enable-webmcp-testing` in Chrome 149+ and reload, or open the deployed URL in ChatGPT's browser. The header badge switches from "preview mode" to "9 WebMCP tools live".

## The tool surface

| Tool | Kind | Behaviour |
|---|---|---|
| `get_campaign_state` | read | Full campaign incl. locked facts (`readOnlyHint`) |
| `validate_claims` | read | Dry-run the validator on any copy, or the whole campaign |
| `export_composition` | read | Standalone HyperFrames HTML; refuses on violations |
| `set_brief` | write | Creative direction (not rendered copy) |
| `add_scene` / `update_scene` | write | Claim-validated before apply; violations reject atomically |
| `reorder_scenes` | write | Permutation-checked |
| `seek_preview` | write | Deterministic timeline seek, clamped |
| `import_product` | write | Pulls real product facts from a Shopify catalog snapshot; blocked while facts are locked |

There is deliberately **no** lock/unlock tool. Locking campaign truth is human-only, via the UI.

## Documentation

- [Product Requirements (PRD)](docs/PRD.md), the argument for every design decision
- [User Guide](docs/USER-GUIDE.md), for the person running a campaign
- [Tech Guide](docs/TECH-GUIDE.md), architecture, tool contract, export format, verification

## Challenge supporters used

- **Shopify**: campaign facts import from a real (synthetic-data) Shopify development store catalog
- **Google Chrome**: WebMCP origin-trial surface for the live demo
- **Cloudflare**: the app scaffold targets Cloudflare Workers (`wrangler`) for hosting
- **ChatGPT**: the agent driving the demo

## Provenance

All product data is synthetic ("Aurora Threads" is fictional). The exported composition uses the open HyperFrames HTML composition shape (a sized root, timed clips, one seekable paused timeline); the exporter here was written for this entry. Work in this repository was created during the challenge submission window.

## License

[MIT](./LICENSE)
