# Demo Video Script v3, one-take full loop (target 2:50, hard cap 3:00)

> **Devpost judge-email guidance (Sep 1), overrides earlier beats where they conflict:**
> open with the PROJECT WORKING inside 10-15s (no landing/title intro: any landing flash moves to the outro); the agent using tools is the centerpiece; cut every wait, never type live (paste prompts); one strong example per feature; short clips + jump cuts; on-screen text over spoken filler; AI narration is explicitly allowed. Cold-open: start ON /closet with the live badge visible and the first `find_gaps` call already firing (VO-01 plays over it).

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The agent activity log and requests sent list stay visible at all times: it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00-0:12 | Cold open (per judge guidance: no title, app already working) | `/closet` already open, live-tools badge visible, `find_gaps` call firing in the agent pane | "This is Hemloop. A shopper's agent can expose missing demand to a store without exposing a shopper identity or their wardrobe rows." |
| 0:12-0:35 | The shopper closet | `/closet`: wardrobe grid, agent calls `find_gaps`, gap card shows "no hoodie" | "The agent reasons over the wardrobe through WebMCP and finds what is missing: no hoodie. The merchant-facing channel is a different, much narrower schema." |
| 0:35-1:00 | Human-approved request (first climax) | Sharing level already set to **2 Context**; the payload preview lists exactly what would leave the page before anyone presses anything. Agent tries `report_demand_gap` and gets `human-approval-required`; shopper presses **Approve next request (level 2)**; retry succeeds and the full payload is visible | "The agent cannot decide to share. Before it even tries, the payload preview shows exactly what would leave: category, size, product, occasion, no account ID, stable hash or wardrobe rows. Its first call is rejected until the shopper approves one request. The retry sends only that, and the approval is consumed." |
| 1:00-1:20 | Demand lands | Cut to `/studio`: Incoming requests shows "hoodie · M · northlight-hoodie · request #..." with its Occasion, For and "Shared at level 2" consent line visible. Human clicks **Unlock offer facts**, **Answer this request**, **Add sizes in stock** (meter 8 of 9 to 9 of 9), then **Lock offer facts** again | "That minimal request reaches the merchant, with exactly what was shared shown on the row. They pull in the product snapshot and lock the offer facts: price, offer, code, dates and disclaimer. Like the shopper's approval, locking is a human button, deliberately not a tool." |
| 1:20-1:45 | Agent builds | Agent reads state, sets the brief, updates `hero` / `cta`, then calls `seek_preview`; human tweaks a heading by hand in the same canvas | "Now the merchant's agent produces: twelve typed tools on the same live state the human is editing. Two editors, one canvas, every action on the record." |
| 1:45-2:10 | The block (second climax) | Chat: "Say 50% off, guaranteed." Agent activity log shows the red rejection with the exact reason; canvas unchanged; agent self-corrects to 25% | "And here is the trust boundary. The agent tries 50% off. Rejected before anything changes, with a machine-readable reason (the locked offer is 25) and the agent fixes its own copy. The wrong frame never existed." |
| 2:10-2:35 | Export | Export button; downloaded composition plays with the disclaimer footer visible | "Export refuses while any claim is wrong. Out comes a deterministic motion composition, disclaimer baked into every frame as an element no tool can remove. The video is one output, the loop is the product." |
| 2:35-2:50 | Close | Landing page, repo + docs flash, supporters line | "Shoppers keep their data. Merchants finally see demand. And everything produced in response is provably true. Hemloop, built on WebMCP." |

Recording notes

- Rehearse the approval-required rejection, the approved `report_demand_gap`, and the blocked-claim prompt; the two human-only gates are the story.
- When the request payload appears, zoom or highlight it so judges can verify both the narrow schema and the absence of an identity field.
- Audio is mandatory per the rules; voice only is fine, no music needed.
- After 1:00 pm PT on Sep 3, touch nothing: not the entry, the repo, or the live site.

## Optional beat, if ahead of time

**M4 (optional, if ahead of time):** ask the agent to call `get_offer` and read back the purchase link; this is the handoff to a shopping agent. Insert after M3, before the close, only if the take is comfortably under the 2:50 target.

**M5 / C5 (optional, if ahead of time):** insert after M4, before the close, only if the take is still comfortably under target. In the studio, the merchant toggles **Auto-propose** or clicks **Propose offer** on the incoming request, then **Approve**. Cut to the closet: the offer appears in **Offers for your requests**, Maya clicks **Bought**, and the Purchases row shows the offer id it came from. This closes the loop on camera: a personal offer, matched inside the merchant's margin, approved by a human, bought, and attributed.

## One-take ChatGPT prompt sheet

Paste these prompts exactly. They name the intended page tools and constrain the response so tool latency and chat prose do not consume the three-minute runtime.

### Preflight, do not record

1. Use the same ChatGPT browser session for both live routes so the same-origin bridge is available.
2. Open `https://hemloop.app/closet` and `https://hemloop.app/studio` in separate tabs. Reload both after WebMCP is enabled.
3. Confirm the badges say **9 WebMCP tools live** and **11 WebMCP tools live**.
4. If previous rehearsal requests remain, clear site data before the final rehearsal, then reload both tabs. Confirm the studio says there are no requests yet.
5. On the closet page, set the sharing level to **2 Context**, and set **Shopping for: Me**.
6. Keep the closet's **Approve next request (level 2)** button and the studio's **Incoming requests** / **Agent activity log** panels visible. Start with offer facts locked.

### Closet prompt C1: find the private gap (0:12)

> Use only the WebMCP tools exposed by this Hemloop page. Call `find_gaps`. Tell me which category is completely absent in one sentence. Do not read the wardrobe rows aloud and do not call any sharing tool.

Expected: `find_gaps` returns `No hoodie in the wardrobe.` No data crosses to the studio.

### Closet prompt C2: prove the agent cannot authorize sharing (0:35)

> Call `report_demand_gap` with `kind: "want"`, `category: "hoodie"`, `size: "M"`, and `handle: "northlight-hoodie"`. Do not ask for approval in chat and do not change the arguments. Let the page's human gate decide.

Expected: structured `human-approval-required`; the requests-sent list and studio remain unchanged.

**Human action:** click **Approve next request (level 2)** once. Keep the armed state visible for one beat.

### Closet prompt C3: send the minimized request (0:47)

> Retry the exact same `report_demand_gap` call now. Show only the complete payload returned by the tool, then state whether that payload contains a shopper ID or wardrobe rows.

Expected: one request containing no shopper identifier, only `signalId`, `kind`, `category`, `size`, `handle`, and `at`. Pause long enough for the judge to inspect it.

### Optional closet prompt C4: extra one-shot proof (not in the timed take)

> Call `report_demand_gap` once more with the exact same arguments. Keep your answer to the tool result only.

Expected: `human-approval-required` again. This is the one-shot proof.

The live P4 verification already captured this call. In the final video, the button reverting to **Approve next request (level 2)** after C3 is the faster visual proof that approval was consumed; skip C4 unless the take is comfortably ahead of time.

### Human bridge actions (1:00)

Switch to `/studio`. Point out the new top request in **Incoming requests**, then:

1. Click **Unlock offer facts**.
2. Click **Answer this request** on the new hoodie request.
3. Click **Add sizes in stock (XS to XL)** under the completeness meter: it moves from 8 of 9 to 9 of 9 and the "Unlocks: agents can skip sizes you cannot fill" line disappears. This is the merchant half of "the more you share, the more you gain", on camera.
4. Click **Lock offer facts**.

Do not ask ChatGPT to perform these clicks: human ownership is the point.

### Studio prompt M1: co-build on the same state (1:20)

> Use only this page's WebMCP tools. First call `get_campaign_state`. Then call `set_brief` with: `Answer live demand for a medium Northlight Hoodie in a warm, energetic 15-second vertical story.` Update scene `hero` to heading `Your missing layer just landed` and body `The Northlight Hoodie is back.` Update scene `cta` to heading `Meet your new layer` and body `Shop the drop before Sep 7.` Finally call `seek_preview` with `tSec: 8`. Do not change the offer facts or create extra scenes. Reply with the tool names used and success status only.

Expected: `get_campaign_state`, `set_brief`, two `update_scene` calls, then `seek_preview`; the agent activity log and canvas update together.

**Human action:** make one small visible edit in the scene inspector, such as changing the hero heading to `The layer your rotation was missing`. This proves human and agent share the same canvas.

### Studio prompt M2: force a rejected claim and self-correction (1:45)

> Call `update_scene` on scene id `offer` and set its heading exactly to `50% off everything, guaranteed lowest price`. Do not change any facts. If the tool rejects it, read the structured violations and the `next` field, and immediately call `update_scene` again on `offer` with the compliant heading exactly `25% off right now`. Report the rejected rules and whether the correction succeeded.

Expected: the first call returns `locked-fact-violation` for the 50% mismatch and banned phrases, with a `next` field naming the compliant retry; the unsafe heading never reaches the canvas. The second call succeeds with the locked 25% offer.

### Studio prompt M3: validate and export (2:10)

> Call `validate_claims` for the whole campaign with no text argument. If it is valid, call `export_composition`. Report only `valid`, the scene count and the character count it returns.

Expected: valid campaign; the composition file downloads in the page (the same path the human Export button takes) and the tool returns `{ delivered: true, chars, scenes, durationSec }`, a summary, never the HTML, which keeps the tool output inside Chrome's 1.5K budget. The download landing is the visible proof; no second click needed.

### Studio prompt M4 (optional): the handoff to a shopping agent

> Call `get_offer`. Report the product, the price, the promo code and the purchase link exactly as returned.

Expected: a read-only structured result (product, prices, promo code, validity dates, disclaimer, purchase link) straight from the locked offer facts. This is what a shopping agent would call to act on the offer directly.

### Studio prompt M5 (optional): propose a personal offer for the loop to close

> Call `propose_offer` with the current request's id. Report the price, the discount percent and whether the margin check passed.

Expected: a staged `PersonalOffer` inside the locked offer rules, invisible to the shopper until approved. **Human action:** click **Approve** on the proposal in the studio, then switch to the closet tab, click **Bought** on the offer in Offers for your requests, and point out the offer id on the new Purchases row.

### Fast recovery lines

- If ChatGPT explains instead of calling a tool: `Do not explain yet. Call the named page tool now.`
- If it asks permission before C2: `Make the call now; the page itself owns and enforces approval.`
- If it stops after the rejected M2 call: `Use that structured violation now and perform the exact compliant retry from my previous prompt.`
- If time reaches 2:35, skip opening the downloaded HTML and cut directly to the landing-page close.
