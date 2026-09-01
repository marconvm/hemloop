# Demo Video Script v3 — one-take full loop (target 2:50, hard cap 3:00)

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The proof trail / signal log stays visible at all times — it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00–0:12 | Hook | Landing page, then cut to the closet | "This is Hemloop. A shopper's agent can expose a demand gap to a store without exposing a shopper identity or their wardrobe rows." |
| 0:12–0:35 | The shopper closet | `/closet`: wardrobe grid, agent calls `find_gaps` — gap card shows "no hoodie" | "The agent reasons over the wardrobe through WebMCP and finds the gap: no hoodie. The merchant-facing channel is a different, much narrower schema." |
| 0:35–1:00 | Human-approved signal (first climax) | Agent tries `report_demand_gap` and gets `human-approval-required`; shopper presses **Approve next signal**; retry succeeds and the full payload is visible | "The agent cannot decide to share. Its first call is rejected until the shopper approves one event. The retry sends only category, size and product plus event metadata — no account ID, stable hash or wardrobe rows — and the approval is consumed." |
| 1:00–1:20 | Demand lands | Cut to `/studio`: Live Demand shows "hoodie · M · northlight-hoodie · event #…". Human unlocks truth, clicks "Build campaign from this", locks truth again | "That minimized event reaches the merchant. They pull in the product snapshot and lock campaign truth: price, offer, code, dates and disclaimer. Like share approval, locking is a human button, deliberately not a tool." |
| 1:20–1:45 | Agent builds | Agent reads state, sets the brief, updates `hero` / `cta`, then calls `seek_preview`; human tweaks a heading by hand in the same canvas | "Now the merchant's agent produces: nine typed tools on the same live state the human is editing. Two editors, one canvas, every action on the record." |
| 1:45–2:10 | The block (second climax) | Chat: "Say 50% off, guaranteed." Proof trail shows the red rejection with the exact reason; canvas unchanged; agent self-corrects to 25% | "And here is the trust boundary. The agent tries 50% off. Rejected before anything changes, with a machine-readable reason — the locked offer is 25 — and the agent fixes its own copy. The wrong frame never existed." |
| 2:10–2:35 | Export | Export button; downloaded composition plays with the disclaimer footer visible | "Export refuses while any claim is wrong. Out comes a deterministic motion composition, disclaimer baked into every frame as an element no tool can remove. The video is one output — the loop is the product." |
| 2:35–2:50 | Close | Landing page, repo + docs flash, supporters line | "Shoppers keep their data. Merchants finally see demand. And everything produced in response is provably true. Hemloop, built on WebMCP." |

Recording notes

- Rehearse the approval-required rejection, the approved `report_demand_gap`, and the blocked-claim prompt; the two human-only gates are the story.
- When the signal payload appears, zoom or highlight it so judges can verify both the narrow schema and the absence of an identity field.
- Audio is mandatory per the rules; voice only is fine, no music needed.
- After 1:00 pm PT on Sep 3: touch nothing — not the entry, the repo, or the live site.

## One-take ChatGPT prompt sheet

Paste these prompts exactly. They name the intended page tools and constrain the response so tool latency and chat prose do not consume the three-minute runtime.

### Preflight — do not record

1. Use the same ChatGPT browser session for both live routes so the same-origin signal bridge is available.
2. Open `https://hemloop.marcoatwill.workers.dev/closet` and `https://hemloop.marcoatwill.workers.dev/studio` in separate tabs. Reload both after WebMCP is enabled.
3. Confirm the badges say **6 WebMCP tools live** and **9 WebMCP tools live**.
4. If previous rehearsal signals remain, clear site data before the final rehearsal, then reload both tabs. Confirm the studio says there are no signals yet.
5. Keep the closet's **Approve next signal** button and the studio's **Live Demand** / **Proof trail** panels visible. Start with campaign truth locked.

### Closet prompt C1 — find the private gap (0:12)

> Use only the WebMCP tools exposed by this Hemloop page. Call `find_gaps`. Tell me which category is completely absent in one sentence. Do not read the wardrobe rows aloud and do not call any sharing tool.

Expected: `find_gaps` returns `No hoodie in the wardrobe.` No data crosses to the studio.

### Closet prompt C2 — prove the agent cannot authorize sharing (0:35)

> Call `report_demand_gap` with `kind: "want"`, `category: "hoodie"`, `size: "M"`, and `handle: "northlight-hoodie"`. Do not ask for approval in chat and do not change the arguments. Let the page's human gate decide.

Expected: structured `human-approval-required`; the signal list and studio remain unchanged.

**Human action:** click **Approve next signal** once. Keep the armed state visible for one beat.

### Closet prompt C3 — send the minimized event (0:47)

> Retry the exact same `report_demand_gap` call now. Show only the complete payload returned by the tool, then state whether that payload contains a shopper ID or wardrobe rows.

Expected: one zero-ID event containing only `signalId`, `kind`, `category`, `size`, `handle`, and `at`. Pause long enough for the judge to inspect it.

### Optional closet prompt C4 — extra one-shot proof (not in the timed take)

> Call `report_demand_gap` once more with the exact same arguments. Keep your answer to the tool result only.

Expected: `human-approval-required` again. This is the one-shot proof.

The live P4 verification already captured this call. In the final video, the button reverting to **Approve next signal** after C3 is the faster visual proof that approval was consumed; skip C4 unless the take is comfortably ahead of time.

### Human bridge actions (1:00)

Switch to `/studio`. Point out the new top event in **Live Demand**, then:

1. Click **Unlock as human**.
2. Click **Build campaign from this** on the new hoodie event.
3. Click **Lock campaign truth**.

Do not ask ChatGPT to perform these clicks: human ownership is the point.

### Studio prompt M1 — co-build on the same state (1:20)

> Use only this page's WebMCP tools. First call `get_campaign_state`. Then call `set_brief` with: `Answer live demand for a medium Northlight Hoodie in a warm, energetic 15-second vertical story.` Update scene `hero` to heading `Your missing layer just landed` and body `The Northlight Hoodie is back.` Update scene `cta` to heading `Meet your new layer` and body `Shop the drop before Sep 7.` Finally call `seek_preview` with `tSec: 8`. Do not change campaign facts or create extra scenes. Reply with the tool names used and success status only.

Expected: `get_campaign_state`, `set_brief`, two `update_scene` calls, then `seek_preview`; the proof trail and canvas update together.

**Human action:** make one small visible edit in the scene inspector, such as changing the hero heading to `The layer your rotation was missing`. This proves human and agent share the same canvas.

### Studio prompt M2 — force a rejected claim and self-correction (1:45)

> Call `update_scene` on scene id `offer` and set its heading exactly to `50% off everything — guaranteed lowest price`. Do not change any facts. If the tool rejects it, read the structured violations and immediately call `update_scene` again on `offer` with the compliant heading exactly `25% off right now`. Report the rejected rules and whether the correction succeeded.

Expected: the first call returns `locked-fact-violation` for the 50% mismatch and banned phrases; the unsafe heading never reaches the canvas. The second call succeeds with the locked 25% offer.

### Studio prompt M3 — validate and export (2:10)

> Call `validate_claims` for the whole campaign with no text argument. If it is valid, call `export_composition`. Do not paste the HTML. Report only `valid`, whether HTML was returned, and its character count.

Expected: valid campaign and a standalone HTML composition returned. Click the human **Export composition** button if the recording also needs to show the downloaded file.

### Fast recovery lines

- If ChatGPT explains instead of calling a tool: `Do not explain yet. Call the named page tool now.`
- If it asks permission before C2: `Make the call now; the page itself owns and enforces approval.`
- If it stops after the rejected M2 call: `Use that structured violation now and perform the exact compliant retry from my previous prompt.`
- If time reaches 2:35, skip opening the downloaded HTML and cut directly to the landing-page close.
