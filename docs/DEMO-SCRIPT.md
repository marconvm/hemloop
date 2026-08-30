# Demo Video Script v2 — the full loop (target 2:50, hard cap 3:00)

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The proof trail / signal log stays visible at all times — it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00–0:12 | Hook | Landing page, then cut to the closet | "This is Hemloop. A shopper's agent is about to tell a store exactly what to sell them, without telling the store anything about them." |
| 0:12–0:35 | The private closet | `/closet`: wardrobe grid, agent calls `get_wardrobe`, `find_gaps` — gap card shows "no hoodie" | "The wardrobe lives on the shopper's page. Their agent reads it through WebMCP tools; no merchant ever sees this list. It finds the gap: no hoodie." |
| 0:35–1:00 | Fit + the hashed signal (first climax) | Agent calls `check_fit`, then `report_demand_gap`; signal log shows the FULL payload: hash, category, size, handle | "Fit-checked against the store's catalog, then the one outbound tool fires. Look at the entire payload: a one-way hash, a category, a size. It is hashed on the shopper's side before it leaves — the same trick ad platforms use for conversions — and the tool shows the shopper exactly what was sent. Nothing else exists to leak." |
| 1:00–1:20 | Demand lands | Cut to `/studio`: Live Demand panel shows "hoodie · M · northlight-hoodie · shopper #hash". Human unlocks truth, clicks "Build campaign from this", locks truth again | "On the merchant side, that demand appears — inventory intelligence stores have never had, anonymous by construction. The merchant pulls the product in, locks the campaign truth: price, offer, code, dates, disclaimer. Locking is a button, deliberately not a tool." |
| 1:20–1:45 | Agent builds | Agent storyboards via `add_scene` / `update_scene` / `seek_preview`; human tweaks a heading by hand in the same canvas | "Now the merchant's agent produces: nine typed tools on the same live state the human is editing. Two editors, one canvas, every action on the record." |
| 1:45–2:10 | The block (second climax) | Chat: "Say 50% off, guaranteed." Proof trail shows the red rejection with the exact reason; canvas unchanged; agent self-corrects to 25% | "And here is the trust boundary. The agent tries 50% off. Rejected before anything changes, with a machine-readable reason — the locked offer is 25 — and the agent fixes its own copy. The wrong frame never existed." |
| 2:10–2:35 | Export | Export button; downloaded composition plays with the disclaimer footer visible | "Export refuses while any claim is wrong. Out comes a deterministic motion composition, disclaimer baked into every frame as an element no tool can remove. The video is one output — the loop is the product." |
| 2:35–2:50 | Close | Landing page, repo + docs flash, supporters line | "Shoppers keep their data. Merchants finally see demand. And everything produced in response is provably true. Hemloop, built on WebMCP." |

Recording notes

- Rehearse `report_demand_gap` and the blocked-claim prompt; the two climaxes (payload reveal at 0:50, rejection at 1:55) are what judges must see clearly.
- When the signal payload appears, zoom or highlight it — the "verify what was sent" moment carries the privacy claim.
- Audio is mandatory per the rules; voice only is fine, no music needed.
- After 1:00 pm PT on Sep 3: touch nothing — not the entry, the repo, or the live site.
