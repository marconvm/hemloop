# Demo Video Script v2 — the full loop (target 2:50, hard cap 3:00)

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The proof trail / signal log stays visible at all times — it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00–0:12 | Hook | Landing page, then cut to the closet | "This is Hemloop. A shopper's agent can expose a demand gap to a store without exposing a shopper identity or their wardrobe rows." |
| 0:12–0:35 | The shopper closet | `/closet`: wardrobe grid, agent calls `find_gaps` — gap card shows "no hoodie" | "The agent reasons over the wardrobe through WebMCP and finds the gap: no hoodie. The merchant-facing channel is a different, much narrower schema." |
| 0:35–1:00 | Human-approved signal (first climax) | Agent tries `report_demand_gap` and gets `human-approval-required`; shopper presses **Approve next signal**; retry succeeds and the full payload is visible | "The agent cannot decide to share. Its first call is rejected until the shopper approves one event. The retry sends only category, size and product plus event metadata — no account ID, stable hash or wardrobe rows — and the approval is consumed." |
| 1:00–1:20 | Demand lands | Cut to `/studio`: Live Demand shows "hoodie · M · northlight-hoodie · event #…". Human unlocks truth, clicks "Build campaign from this", locks truth again | "That minimized event reaches the merchant. They pull in the product snapshot and lock campaign truth: price, offer, code, dates and disclaimer. Like share approval, locking is a human button, deliberately not a tool." |
| 1:20–1:45 | Agent builds | Agent storyboards via `add_scene` / `update_scene` / `seek_preview`; human tweaks a heading by hand in the same canvas | "Now the merchant's agent produces: nine typed tools on the same live state the human is editing. Two editors, one canvas, every action on the record." |
| 1:45–2:10 | The block (second climax) | Chat: "Say 50% off, guaranteed." Proof trail shows the red rejection with the exact reason; canvas unchanged; agent self-corrects to 25% | "And here is the trust boundary. The agent tries 50% off. Rejected before anything changes, with a machine-readable reason — the locked offer is 25 — and the agent fixes its own copy. The wrong frame never existed." |
| 2:10–2:35 | Export | Export button; downloaded composition plays with the disclaimer footer visible | "Export refuses while any claim is wrong. Out comes a deterministic motion composition, disclaimer baked into every frame as an element no tool can remove. The video is one output — the loop is the product." |
| 2:35–2:50 | Close | Landing page, repo + docs flash, supporters line | "Shoppers keep their data. Merchants finally see demand. And everything produced in response is provably true. Hemloop, built on WebMCP." |

Recording notes

- Rehearse the approval-required rejection, the approved `report_demand_gap`, and the blocked-claim prompt; the two human-only gates are the story.
- When the signal payload appears, zoom or highlight it so judges can verify both the narrow schema and the absence of an identity field.
- Audio is mandatory per the rules; voice only is fine, no music needed.
- After 1:00 pm PT on Sep 3: touch nothing — not the entry, the repo, or the live site.
