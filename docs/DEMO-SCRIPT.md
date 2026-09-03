# Demo Video Script v4, one request end to end (target 2:40, hard cap 3:00)

> **Devpost judge-email guidance (Sep 1), overrides earlier beats where they conflict:**
> open with the PROJECT WORKING inside 10-15s (no landing/title intro: any landing flash moves to the outro); the agent using tools is the centerpiece; cut every wait, never type live (paste prompts); one strong example per feature; short clips + jump cuts; on-screen text over spoken filler; AI narration is explicitly allowed. Cold-open: start ON /closet with the live badge visible and the first `find_gaps` call already firing (VO-01 plays over it).

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL. Two browser tabs: `/closet` and `/studio`, agent chat beside them. Voiceover throughout; captions for tool names. The agent activity log and requests sent list stay visible at all times: it is the narrative device.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00-0:20 | Cold open, the gap (per judge guidance: no title, app already working) | `/closet` already open, live-tools badge visible, `find_gaps` firing in the agent pane. The **loop rail** sits under the header: **Gap** lights, four steps still ahead. Note `find_gaps` returns THREE rows against the seed (no hoodie, only one jacket, footwear due at 21 months); the narration names two of them and does not claim a count | "This is Hemloop. Watch one request go all the way round. Maya's agent reads her closet and finds the missing hoodie, and a pair of sneakers due for replacement twenty-one months after she bought them." |
| 0:20-0:50 | One approved request leaves (first human gate) | Payload preview lists exactly what would leave. Agent calls `report_demand_gap` and is **rejected**: `human-approval-required`. Maya presses **Approve next request**. Retry succeeds; the full sent payload is on screen. Rail advances to **Approved request** | "The agent cannot decide to share. Its first call is refused. One human press releases exactly one event: category, size, need or want. No account, no name, no wardrobe rows. Then the approval is spent, and the next call is refused again." |
| 0:50-1:10 | The merchant sees demand, not a person | Cut to `/studio`. `get_demand` returns the grouped rows: category, size, counts, and a verdict against the stock they locked. Human clicks **Answer this request** | "It arrives grouped, with no shopper identifier anywhere in it, and scored against what the merchant actually has in stock. This is intent their own sales data cannot show them: someone who owns the thing already and wore it out." |
| 1:10-1:30 | The answer is built inside locked rules (second human gate) | Agent calls `propose_offer` with the request id from `get_demand`. The proposal shows its price, its reasons and a margin check against the locked floor. Human presses **Approve**. Rail advances to **Matched offer** | "The merchant locked price, offer, code, dates and margin floor first. Their agent proposes inside those rules and can do nothing else. A human approves before the shopper ever sees it, and there is no tool that can approve for them." |
| 1:30-1:50 | Back to the shopper, who decides | Cut to `/closet`. The offer is in **Offers for your requests**. Maya presses **Bought**. Rail advances to **Bought** | "The offer comes back addressed to the request, never to a person. Nothing here can buy for her. She decides." |
| 1:50-2:05 | The loop closes, and it is attributable | Purchases row appears carrying the **offer id**; the garment lands in the wardrobe; the request shows its outcome. Rail reaches **Learned**, the "Next" line reads **Loop closed** | "And this is the part that pays for the whole thing. The purchase records the offer that won it. The merchant learns their offer worked without ever learning who she is." |
| 2:05-2:35 | Trust proof (25s, the second climax) | Chat: "Say 50% off, guaranteed." Agent activity log shows the red rejection with its machine-readable reason; canvas unchanged; agent self-corrects to 25%. Brief flash of the export refusing while a violation stands | "One more thing, because the offer that reaches her has to be true. The agent tries 50% off against a locked 25. Rejected before anything changes, with a reason it can correct itself from. The wrong frame never existed, and the export refuses to exist while any claim is wrong." |
| 2:35-2:40 | Close on the closed loop | The rail, all five steps lit, both surfaces side by side. Repo + docs flash | "One request. Private closet, real demand, an offer that cannot lie, and a sale the merchant can attribute. Hemloop, built on WebMCP." |

## Recording rule: the agent must be a real agent

The automated-demo playbook this project borrows its editing rules from has the AI drive the app
with Playwright, and defends it with: "the only thing that's automated is the part a human would've
done by hand anyway." That defence holds for every app whose demo is a person clicking. **It does
not hold here, and copying that step would hollow out the entry.**

What Hemloop claims is that an agent calls typed tools the page registered, and that two acts are
reserved for a human. So:

- The agent moves must be a **real agent** making **real WebMCP calls** against the live page.
  Scripted clicks on the same buttons would fake exactly the thing being demonstrated.
- The two human clicks (**Approve next request**, **Approve** on the proposal) must be visibly human,
  because their whole meaning is that no tool can perform them.
- Automation is legitimate for everything around the demo: cursor rendering, pacing, capture, editing,
  publishing. Not for the tool calls, and not for the gates.

The runtime is real and drivable on the live site: Chrome exposes `document.modelContext` (not
`navigator.modelContext`) on this origin. Driving the full loop through it end to end already caught
a genuine defect once, the studio rail being unable to reach 5/5, which is the playbook's other
claim holding true here: a demo that really drives the product is also a test of it.

## Prompt sheet (paste these, never type live)

Every prompt is pasted, in this order. `C` prompts go to the agent on `/closet`, `M` prompts to the
agent on `/studio`. The two human clicks are marked and cannot be done by any tool, which is the
point of the take. Cue ids match the Paste column in `video/CUE-SHEET.md`.

| id | t | surface | paste this | expect |
|---|---|---|---|---|
| C1 | 0:00 | closet | `Check my closet. What am I missing, and is anything worn out?` | `find_gaps` returns three rows: no hoodie, only one jacket, footwear due at 21 months |
| C2 | 0:20 | closet | `Tell the store I need a hoodie in size M.` | `report_demand_gap` returns `human-approval-required`. Nothing is sent |
| — | 0:20 | **human** | click **Approve next request (level 1)** | the control arms; no tool can do this |
| C3 | 0:20 | closet | `Try that again.` | succeeds; the tool returns the exact payload sent, with no identity field |
| C4 | 0:20 | closet | `Send it once more.` | refused again: the approval was consumed by one event |
| M1 | 0:50 | studio | `What demand has come in? Group it and tell me what we can actually fill.` | `get_demand` returns the grouped row, its counts and a verdict against locked stock |
| M2 | 1:10 | studio | `Propose an offer for that request, inside our locked rules.` | `propose_offer` stages it: price, reasons, margin check against the floor. Not yet visible to the shopper |
| — | 1:10 | **human** | click **Approve** on the proposal | no tool can approve an offer |
| C5 | 1:30 | closet | `Any offers for me?` | `get_offers` returns the approved offer, fenced as storefront data |
| — | 1:30 | **human** | click **Bought** on the offer card | records the purchase with the offer id attached |
| M3 | 2:05 | studio | `Update the hero to say fifty per cent off, guaranteed.` | rejected with `locked-fact-violation`, rules `discount-mismatch` and `banned-phrase`. Canvas unchanged |
| M4 | 2:05 | studio | `Fix it so it matches the locked offer.` | agent self-corrects to twenty five per cent and the write applies |

**Rehearse C2 → human click → C3 → C4 as one motion.** Those four moves are the whole privacy
argument: refused, approved once, sent, refused again.

**If a prompt does not produce the expected call,** do not improvise on camera. Stop, reset with the
closet's **Clear wardrobe, purchases and requests** button, and start the take again. The agent
paraphrases; the tool names in the Expect column are what must appear in the activity log.

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
