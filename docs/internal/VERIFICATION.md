# Hemloop Verification Record

Last updated: 2026-09-03 (America/Toronto), after wave 4. Older entries quote the labels and tool counts as they stood at the time (Approve next signal is now Approve next request; Live Demand is now Incoming requests; wave 3 took the studio from 10 tools to 11 and the closet from 7 to 9; wave 4 took the studio to 12).

This file separates verified behaviour from the remaining ChatGPT natural-language pairing check.

## Green gates

- `npm test`: **135/135 tests pass** (2026-09-03, after the wave-4 dual review and the presentation pass), including the surface-wide tool contract, the get_demand output budget, the replacement lifecycle, `replace` demand kind, inventory insight, offer attribution, consent gating, no-shopper-identifier signal schema, human approval, claim rejection, tool registration, catalog mapping and export structure.
- `npm exec -- tsc --noEmit`: clean.
- `npm exec -- oxlint`: clean.
- `npm run build`: clean; `/`, `/closet` and `/studio` are present in the Vinext output.
- `npm run prepare:worker`: removes Vinext's generated `legacy_env` field; a Wrangler 4.127.0 `deploy --dry-run` then completes successfully (no upload performed).
- Chrome visual/interaction check on `http://localhost:3001`: all three routes render; the closet approval control arms and cancels visibly; the studio editor and proof trail render.
- Cloudflare production check on `https://hemloop.marcoatwill.workers.dev`: `/`, `/closet` and `/studio` all load over HTTPS with the expected landing, closet and studio headings. The app was deployed with Wrangler 4.127.0.
- HyperFrames exporter: previously checked with `npx hyperframes check` (0 errors, 0 warnings); exporter structure is also covered by unit tests.
- Historical re-verification 2026-09-02 after dead-code removal: 41/41 tests, build and oxlint clean. The current present-tense gate is the 135/135 run above.

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

Recorded by Claude at wave 3; the current wave-4 gate and live smoke below independently re-verify the same route/header contract.

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


## Wave 4 gates and live smoke, 2026-09-03

Recorded by Claude; independently re-verified by Codex on 2026-09-03 below.

- `npm test`: 120/120 pass at the time of this entry (127/127 after the dual-review fixes below). New coverage: the replacement lifecycle (due block contents, an undated garment never flagged, oldest-garment wins, absence outranks wear, the seed closet actually ships one worn-out item), `report_demand_gap` kind `replace` (accepted at level `need`; an unknown kind still refused without burning the one-shot approval; `toSignal` accepts `replace` and still drops junk), `get_demand` (read-only, drops malformed rows, ids capped at 10 per group, registered by `getRequests` alone), `demandInsight` verdicts asserted against `matchOffer` itself, and one regression test for the `matchOffer` stock-source fix.
- `npx tsc --noEmit`: clean. `oxlint`: clean. `npm run build`: clean.
- Documentation mirror: `public/docs/*` byte-identical to `docs/*` and `README.md`.
- Deployed with Wrangler 4.127.0 as Worker version `0322742d-3f09-4660-9e98-3a6fac311518`.
- Live smoke: `/`, `/closet`, `/studio`, `/docs/README.md` and `www.hemloop.app` all 200; security headers unchanged. The landing reads "twenty-one typed tools" and lists `get_demand`; the live `/docs/README.md` says 21 WebMCP tools.
- Live badges on hemloop.app: `/closet` **9 WebMCP tools live**, `/studio` **12 WebMCP tools live**.

### Codex independent re-verification (2026-09-03)

- `npm test`: **120/120 pass** at the time of Codex's run; 127/127 after the dual-review fixes. `npx tsc --noEmit`, `npx oxlint`, and `npm run build` clean.
- Read-only live smoke returned HTTP 200 for `/`, `/closet`, `/studio`, `/docs/README.md`, and `www.hemloop.app/`. The deployed security-header contract remained present (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`; no CSP by decision).
- The Wave 4 lifecycle, `replace` kind, inventory insight, and stock-source behavior are covered by the passing tests. I did not mutate production storage or deploy during this verification.

### The lifecycle is visible (live, hemloop.app)

`/closet` renders three gap rows out of the box, one of them a lifecycle gap:

```
Hoodie    No hoodie in the wardrobe.
Jacket    Only one jacket in rotation.
Footwear  due · size 10 · Bought 21 months ago; footwear is typically replaced after 12.
```

### The inventory insight is visible (live, hemloop.app)

With four consented requests in the page's own storage, `/studio` grouped and scored them:

```
Hoodie · XXL     1 request (1 need, 0 wants)                                CAN OFFER
Hoodie · L       2 requests (2 needs, 0 wants) · 1 replacing one they own   CAN OFFER
Footwear · 10    1 request (1 need, 0 wants) · 1 replacing one they own     OTHER CATEGORY
```

XXL reads CAN OFFER here because the seed campaign locks no `sizesInStock`; once the merchant locks the sizes, the same function returns `size-not-in-stock` for it (covered by unit test). Seeded keys were cleared afterwards.

### Defect found and fixed during this wave

`matchOffer` checked `facts.sizesInStock` for the stock refusal but reported `catalogProduct?.sizesInStock ?? facts.sizesInStock` on the offer it emitted, so with sizes coming only from an imported product it could propose a size that very offer then listed as out of stock. Both now read one resolved source. Found by asserting `demandInsight`'s verdict against `matchOffer` rather than against a restatement of its rules.


## Presentation pass and loop rail, 2026-09-03

Owner-directed after the dual review. Recorded by Claude; not independently re-verified.

- Fixed a live 404: `/products/black-hoodie.jpg` was referenced by seed garment `g11` and had never been in the repo. A test now asserts every image path the seed wardrobe or the catalog references resolves to a file in `public/`, and a failed image hides itself rather than showing a broken icon.
- The closet had been inheriting `.studio-grid`'s column ratios, putting the wardrobe in the narrowest track at 142px per card; inside a card the 56px thumbnail defined an implicit column that the brand name and the Edit/Delete pair fell into. Both fixed; `.closet-grid` had existed on the element with no rule behind it.
- Every surface now carries the same navigation. Previously the closet could only reach the studio, the studio only the closet, and the docs only home.
- Real retail product photography, used with permission, replaces stock imagery in the shopper's wardrobe and on the merchant's product. Provenance and the deliberate split, real brands on the shopper side, a fictional merchant on the claim-making side, are documented in `docs/PHOTO-CREDITS.md`. The "Synthetic demo" badges and the landing footer claim that "every brand, product and shopper is fictional" were true before this change and are not now; both were corrected rather than left standing.
- New: a five-step loop rail (Gap, Approved request, Matched offer, Bought, Learned) on both surfaces, from a pure `loopSteps()` with 5 tests. A later flag cannot skip an earlier step, so an unauthenticated storage write cannot present the loop as further along than it is.
- `docs/DEMO-SCRIPT.md` reframed to v4: one request's complete lifecycle is the spine, the trust proof is a 25-second supporting beat, and the export is a three-second flash. `video/CUE-SHEET.md` carries a banner saying its rows were timed against v3 and need re-timing.

Gates: 135/135 tests, tsc clean, oxlint clean, build clean, mirror byte-identical.

## Remaining ChatGPT pairing check

1. Open both live routes in ChatGPT's browser and confirm the two live-tool badges.
2. Run the exact prompts in `docs/DEMO-SCRIPT.md`: blocked report, human approval, successful report, one-shot re-block, clean campaign mutations, unsafe mutation rejection/correction, validation and export.
3. Record the ChatGPT version/surface and results here before recording the final submission video.

If ChatGPT pairing is unavailable or unstable, the already-verified Chrome 151 WebMCP runtime is the truthful fallback demo surface.
