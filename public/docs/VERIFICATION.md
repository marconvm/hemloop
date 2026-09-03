# Hemloop Verification Record

Last updated: 2026-09-03 (America/Toronto), after wave 3. Older entries quote the labels and tool counts as they stood at the time (Approve next signal is now Approve next request; Live Demand is now Incoming requests; wave 3 took the studio from 10 tools to 11 and the closet from 7 to 9).

This file separates verified behaviour from the remaining ChatGPT natural-language pairing check.

## Green gates

- `npm test`: 63/63 tests pass (2026-09-02 evening, after the revamp: consent gating, get_preferences, profile filtering, outcomes, placements, completeness added), including the no-shopper-identifier signal schema, human-approval rejection, one-shot approval consumption, exact returned/sent payload equality, claim rejection, tool registration, catalog mapping and export structure.
- `npm exec -- tsc --noEmit`: clean.
- `npm exec -- oxlint`: clean.
- `npm run build`: clean; `/`, `/closet` and `/studio` are present in the Vinext output.
- `npm run prepare:worker`: removes Vinext's generated `legacy_env` field; a Wrangler 4.127.0 `deploy --dry-run` then completes successfully (no upload performed).
- Chrome visual/interaction check on `http://localhost:3001`: all three routes render; the closet approval control arms and cancels visibly; the studio editor and proof trail render.
- Cloudflare production check on `https://hemloop.marcoatwill.workers.dev`: `/`, `/closet` and `/studio` all load over HTTPS with the expected landing, closet and studio headings. The app was deployed with Wrangler 4.127.0.
- HyperFrames exporter: previously checked with `npx hyperframes check` (0 errors, 0 warnings); exporter structure is also covered by unit tests.
- Re-verified 2026-09-02 at HEAD after the dead-code removal (58 unused `components/ui/*`, `hooks/`, 8 unused dependencies): 41/41 tests, build and oxlint clean, local Worker smoke and live smoke on `/`, `/closet` and `/studio` all 200 with unchanged security headers. No runtime behaviour changed — only `badge` and `button` were ever reachable from the app.

## Real WebMCP runtime: verified on the live deployment

On 2026-09-01, Chrome 151 with `chrome://flags/#enable-webmcp-testing` enabled exposed the real WebMCP runtime on the public HTTPS deployment. In this build `document.modelContext` is defined while `navigator.modelContext` is undefined, proving that Hemloop's dual-namespace probe is required. The runtime calling convention observed was `executeTool(RegisteredTool, JSON-string-args)`; results returned as serialized JSON MCP content blocks.

Evidence chain on the live routes:

- `/closet` showed `6 WebMCP tools live`.
- `find_gaps` returned the missing hoodie category.
- The first `report_demand_gap` call returned `human-approval-required` and sent nothing.
- After one human **Approve next signal** click, the same call emitted zero-ID event `#8bb9b54a` and returned the exact minimized payload.
- An immediate third call returned `human-approval-required` again, proving the approval was consumed.
- `/studio` showed `9 WebMCP tools live` and its Live Demand panel received the event across the same-origin bridge.

The approval-gate and signal-bridge design therefore passed the real runtime test. Keep these labels evidence-based; do not infer ChatGPT pairing from the Chrome test.

## Wave 3 gates and live smoke, 2026-09-03

Recorded by Claude, pending Codex's independent re-verification (this file is Codex's record under coordination rule 4; the entry is here so the evidence is not lost, and the ask is logged in `docs/coordination/CODEX-COORDINATION.md`).

Merged `worktree-agent-a141f49e3736a882c` (docs and landing sync to wave 3) into `main`, then re-ran every gate at the merge commit:

- `npm test`: 101/101 pass, including the two `purchaseFromOffer` cases (offerId and promoCode carry through; unknown handle falls back to the demo brand and a keyword-guessed category, and a null size becomes `OS`).
- `npx tsc --noEmit`: clean. `oxlint`: clean. `npm run build`: clean, all three routes present.
- Documentation mirror: `public/docs/*` byte-identical to `docs/*` and `README.md`.
- Deployed with Wrangler 4.127.0 as Worker version `a89e3f91-8d14-48b2-8b69-adcd04b504bb`.
- Live smoke: `/`, `/closet`, `/studio`, `/docs/README.md` and `www.hemloop.app` all 200. Security headers unchanged (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS; still no CSP by the round-2 decision). The landing reads "twenty typed tools" and lists `import_receipt`, `get_offers` and `propose_offer`; the live `/docs/README.md` mirror says 101 tests.
- Live badges on hemloop.app: `/closet` shows **9 WebMCP tools live**, `/studio` shows **11 WebMCP tools live**.

### Offer-card **Bought** creates an attributable purchase (live, hemloop.app)

Seeded one sent request and one merchant-approved `PersonalOffer` for it into this browser's own storage, reloaded `/closet`, and clicked **Bought** on the offer card. Result read back from `hemloop.purchases`:

```json
{ "id": "offer-mtl5w7qo-1", "merchant": "Northlight Apparel online store", "brand": "Northlight Apparel",
  "handle": "northlight-hoodie", "title": "Northlight Hoodie", "category": "hoodie", "size": "L",
  "price": 90, "currency": "CAD", "promoCode": "NORTHLIGHT25",
  "offerId": "offer-smoke-abcdef01", "source": "offer" }
```

The purchase count went 10 to 11, the matching `SignalOutcome` (`bought`) was recorded against the request id, the garment was inserted into the wardrobe, and the card's buttons collapsed to a **Bought** label. Attribution holds end to end: the offer that won the sale is on the purchase row. Seeded keys were cleared afterwards.

## Remaining ChatGPT pairing check

1. Open both live routes in ChatGPT's browser and confirm the two live-tool badges.
2. Run the exact prompts in `docs/DEMO-SCRIPT.md`: blocked report, human approval, successful report, one-shot re-block, clean campaign mutations, unsafe mutation rejection/correction, validation and export.
3. Record the ChatGPT version/surface and results here before recording the final submission video.

If ChatGPT pairing is unavailable or unstable, the already-verified Chrome 151 WebMCP runtime is the truthful fallback demo surface.
