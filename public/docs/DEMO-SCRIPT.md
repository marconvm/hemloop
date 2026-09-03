# Demo Video Script v4, one request end to end (target 2:40, hard cap 3:00)

> **Devpost judge-email guidance (Sep 1), overrides earlier beats where they conflict:**
> open with the PROJECT WORKING inside 10-15s (no landing/title intro: any landing flash moves to the outro); the agent using tools is the centerpiece; cut every wait, never type live (paste prompts); one strong example per feature; short clips + jump cuts; on-screen text over spoken filler; AI narration is explicitly allowed. Cold-open: start ON /closet with the live badge visible and the first `find_gaps` call already firing (VO-01 plays over it).

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The agent activity log and requests sent list stay visible at all times: it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00-0:20 | Cold open, the gap (per judge guidance: no title, app already working) | `/closet` already open, live-tools badge visible, `find_gaps` firing in the agent pane. The **loop rail** sits under the header: **Gap** lights, four steps still ahead | "This is Hemloop. Watch one request go all the way round. Maya's agent reads her closet and finds two things: she has no hoodie, and the sneakers she bought twenty-one months ago are past replacing." |
| 0:20-0:50 | One approved request leaves (first human gate) | Payload preview lists exactly what would leave. Agent calls `report_demand_gap` and is **rejected**: `human-approval-required`. Maya presses **Approve next request**. Retry succeeds; the full sent payload is on screen. Rail advances to **Approved request** | "The agent cannot decide to share. Its first call is refused. One human press releases exactly one event: category, size, need or want. No account, no name, no wardrobe rows. Then the approval is spent, and the next call is refused again." |
| 0:50-1:10 | The merchant sees demand, not a person | Cut to `/studio`. `get_demand` returns the grouped rows: category, size, counts, and a verdict against the stock they locked. Human clicks **Answer this request** | "It arrives grouped, with no shopper identifier anywhere in it, and scored against what the merchant actually has in stock. This is intent their own sales data cannot show them: someone who owns the thing already and wore it out." |
| 1:10-1:30 | The answer is built inside locked rules (second human gate) | Agent calls `propose_offer` with the request id from `get_demand`. The proposal shows its price, its reasons and a margin check against the locked floor. Human presses **Approve**. Rail advances to **Matched offer** | "The merchant locked price, offer, code, dates and margin floor first. Their agent proposes inside those rules and can do nothing else. A human approves before the shopper ever sees it, and there is no tool that can approve for them." |
| 1:30-1:50 | Back to the shopper, who decides | Cut to `/closet`. The offer is in **Offers for your requests**. Maya presses **Bought**. Rail advances to **Bought** | "The offer comes back addressed to the request, never to a person. Nothing here can buy for her. She decides." |
| 1:50-2:05 | The loop closes, and it is attributable | Purchases row appears carrying the **offer id**; the garment lands in the wardrobe; the request shows its outcome. Rail reaches **Learned**, the "Next" line reads **Loop closed** | "And this is the part that pays for the whole thing. The purchase records the offer that won it. The merchant learns their offer worked without ever learning who she is." |
| 2:05-2:35 | Trust proof (25s, the second climax) | Chat: "Say 50% off, guaranteed." Agent activity log shows the red rejection with its machine-readable reason; canvas unchanged; agent self-corrects to 25%. Brief flash of the export refusing while a violation stands | "One more thing, because the offer that reaches her has to be true. The agent tries 50% off against a locked 25. Rejected before anything changes, with a reason it can correct itself from. The wrong frame never existed, and the export refuses to exist while any claim is wrong." |
| 2:35-2:40 | Close on the closed loop | The rail, all five steps lit, both surfaces side by side. Repo + docs flash | "One request. Private closet, real demand, an offer that cannot lie, and a sale the merchant can attribute. Hemloop, built on WebMCP." |

**What changed from v3 and why.** v3 made the export the climax and left the actual loop close as an optional beat at the end. That inverted the pitch: the exporter is one output, the loop is the product, and the OpenAI showcase entries that read best are the ones where a human watches an agent change the same artifact they are looking at. The spine above is one request's complete lifecycle, the trust proof is a 25-second supporting beat rather than the finale, and the export is a three-second flash inside it. The loop rail on both surfaces is the on-screen device that makes the join legible without narration.

Recording notes

- Rehearse the approval-required rejection, the approved `report_demand_gap`, and the blocked-claim prompt; the two human-only gates are the story.
- When the request payload appears, zoom or highlight it so judges can verify both the narrow schema and the absence of an identity field.
- Audio is mandatory per the rules; voice only is fine, no music needed.
- After 1:00 pm PT on Sep 3, touch nothing: not the entry, the repo, or the live site.

## Optional beats, only if ahead of time

**`get_offer` handoff:** ask the agent to call `get_offer` and read back the purchase link and offer completeness. This is the handoff to a third-party shopping agent. Insert before the close, only if the take is comfortably under 2:40.

**The sharing dial:** move the level from 1 Basics to 3 Taste and show the payload preview grow, then send a second request. Shows "the more you share, the more you gain" without narration. Costs about 15 seconds.

**Receipt import:** paste a sample order email and watch purchases and garments appear locally. Good if the recording needs to show `import_receipt`, but it is not on the critical path of the loop.
