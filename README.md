# Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an offer priced inside rules a human locked, and every promotional claim is checked before it can exist. Neither side accumulates a profile of the other.

**Live:** [hemloop.app](https://hemloop.app) · Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

## Four routes

| Route | What it is |
|---|---|
| **Hemloop** `/` | Both sides of one request in one shared space. Registers all **21** WebMCP tools (9 closet + 12 studio). Three human gates: Approve next request, Approve offer, Bought. |
| **Closet** `/closet` | Full shopper surface (Wardrobe · Requests and offers). Nine tools. Wardrobe rows never leave the page. |
| **Studio** `/studio` | Full merchant surface (Demand · Offer and rules · Composition). Twelve tools. Lock facts and approve proposals are human-only. |
| **Docs** `/docs/` | Product docs: the loop, the problem, WebMCP, quick start, use cases. |

`/merchant` redirects to `/studio?tab=demand`.

## How to run the demo

**Supported hosts:** [hemloop.app](https://hemloop.app) and
[hemloop.marcoatwill.workers.dev](https://hemloop.marcoatwill.workers.dev).
Use either URL the same way.

**Supported browsers:**

1. **ChatGPT’s desktop-app built-in browser** — open one of the hosts above inside ChatGPT; WebMCP tools register automatically.
2. **Chrome** with `chrome://flags/#enable-webmcp-testing` enabled — flip the flag, press **Relaunch**, then reopen the host. (Chrome 149+ may already carry the origin-trial token for these hosts.)

The header should show tools **live**. Amber **preview** means the runtime is not exposed in that browser. The **iOS in-app browser** shows the page with tools in preview.

No account. State lives in your browser (`localStorage`); an incognito window is a clean install.

1. Open a supported host in a supported browser (above).
2. Upload a sample receipt image from `public/receipts/` (`northlight-till-receipt.png` or `harborview-order-email.png`) in the chat so the agent can call `import_receipt`.
3. Ask: **What should I buy next?** (`find_gaps`).
4. Ask: **Tell the store I need a hoodie in size M.** It is **refused** (`human-approval-required`). Press **Approve next request**, then reply **Yes, send it**. One press releases one event; a third send is refused again.
5. Ask the merchant side to group demand and **propose an offer inside our rules**. Press **Approve offer**. Back on the closet, ask for offers and press **Bought**.

Full walkthrough: [docs/USER-GUIDE.md](docs/USER-GUIDE.md) · [docs/05-quick-start.md](docs/05-quick-start.md).

## 21 WebMCP tools

| Surface | Tool | Kind | What it does | Structural guarantee |
|---|---|---|---|---|
| Closet | `get_wardrobe` | read | Compact wardrobe rows on this page | `readOnlyHint`, `untrustedContentHint`; no shopper id |
| Closet | `get_my_sizes` | read | Sizes owned, optional brand filter | `readOnlyHint` |
| Closet | `find_gaps` | read | Missing / thin categories; worn-out by purchase date | `readOnlyHint`; due rows carry date, months, size only |
| Closet | `check_fit` | read | Size advice from owned garments vs catalog | `readOnlyHint` |
| Closet | `get_preferences` | read | Fit, colour, materials, ceiling, brands | `readOnlyHint`; fields only if sharing level allows |
| Closet | `add_garment` | write | Add one local wardrobe row | Enum + bounds; never leaves the page |
| Closet | `report_demand_gap` | write | Only outbound path to a merchant | Needs human approval; one press → one event; no shopper id |
| Closet | `import_receipt` | write | Parse receipt / order email into local purchases | Parsed locally; nothing leaves the page |
| Closet | `get_offers` | read | Approved offers for this closet’s own requests | `readOnlyHint`; Bought / Passed is human-only |
| Studio | `get_campaign_state` | read | Facts, lock state, brief, scenes, format | `readOnlyHint` |
| Studio | `set_brief` | write | Creative brief (not rendered copy) | Brief cannot become a claim |
| Studio | `add_scene` / `update_scene` | write | Scene copy | Claim-validated before apply; reject atomically |
| Studio | `reorder_scenes` | write | Timeline order | Permutation-checked |
| Studio | `seek_preview` | write | Preview playhead | Clamped; deterministic |
| Studio | `validate_claims` | read | Dry-run claim validator | Never mutates |
| Studio | `export_composition` | read | Deliver HTML to the page | Refuses while any violation stands |
| Studio | `get_offer` | read | Locked offer (or one approved personal offer) | `readOnlyHint`; human-locked facts only |
| Studio | `import_product` | write | Pull a catalog product into unlocked facts | Refuses while facts are locked |
| Studio | `get_demand` | read | Incoming requests grouped and scored vs stock | `readOnlyHint`, `untrustedContentHint` |
| Studio | `propose_offer` | write | Stage a personal offer inside locked rules | Staged only; Approve is human-only |

Absent by design (no tool exists): `approve_next_request`, `approve_offer`, `mark_bought`, `lock_facts`, `set_sharing_level`.

## Local development

```sh
git clone https://github.com/marconvm/hemloop
cd hemloop
npm install
npm run dev
```

Node 22+. App routes: `/`, `/closet`, `/studio`, `/docs/`. Tests: `npm test`. Lint: `npm run lint`.

Deploy (Cloudflare Workers): `npm run build` then `npm run prepare:worker` and `npm run deploy:worker` (see project scripts).

## Licence

[MIT](LICENSE) · Copyright © 2026 Marco Cheung.

## Credits

Wardrobe product photos from the author’s own Bluenotes and Aeropostale catalogs, used with permission. The merchant (Northlight Apparel) and its campaign are fictional. See [docs/PHOTO-CREDITS.md](docs/PHOTO-CREDITS.md).
