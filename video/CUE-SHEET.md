# Cue sheet v5: one request round the Hemloop page, 2:50

Companion to `docs/internal/VOICEOVER.md` (eight segments). Both files change together.

## What is real and what is not (demo-capture rule)

The claim of this video is that **an agent can run the loop and that three acts stay human**. So:

- The agent's reasoning and every tool call are real, recorded live in the ChatGPT desktop app's
  built-in browser (GPT-5.6 Sol or Terra). No replayed transcript, no scripted calls.
- The three buttons (Approve next request, Approve offer, Bought) are pressed by Marco, on camera.
- Everything else may be automated or edited: the intro and step cards (HyperFrames), captions, the
  voice track generated from the script, speed-ramps over the waits, the cut.

## Capture settings, fixed before the first take

| setting | value |
|---|---|
| host | ChatGPT desktop app, built-in browser, chat pane on the left, page on the right |
| page | https://hemloop.app/ , **light theme**, `localStorage` cleared first (fresh install) |
| window | 1728 × 1080 logical, 2× device scale; browser zoom 125% so the room fills the pane |
| recorder | macOS screen recording (Cmd+Shift+5) of the app window, 60 fps, mic off |
| preflight | header reads **WebMCP live · 21 tools**, blinking dot; address bar shows the Site tools indicator; step 1 of 7 current |
| do not | type live; paste every prompt from the sheet below; never film a wait at 1× |

## Preflight, run before rolling

| check | expect |
|---|---|
| header | WebMCP live · 21 tools |
| rail | step 1 New item current, six ahead |
| closet stack | 10 garments for Me, Add five visible |
| market | five names greyed, waiting for a request |
| receipt image | `public/receipts/northlight-till-receipt.png` ready to drop into the chat |
| rival receipt | `public/receipts/harborview-order-email.png` ready for cycle two |

## The clock

Spoken total about 2:05 in a 2:50 runtime. The air is where the calls land and the buttons get
pressed. Speed-ramp every wait 8× to 20× in the edit; never cut the refusal, the press, or the
second refusal.

| t | VO | on screen | paste or press |
|---|---|---|---|
| 0:00 | VO-01 (~16s) | Cold open on the Hemloop page, step 1 current, live header in frame. Drop the receipt image into the chat. Agent reads it, calls `import_receipt`; purchase row and garment appear in the closet stack; step 1 done. | image + `Import this receipt` |
| 0:20 | VO-02 (~15s) | `find_gaps` runs; step 2 card shows owned counts then the gaps: hoodie missing, jacket thin, footwear due at twenty one months. | P1 |
| 0:40 | VO-03 (~20s) | `report_demand_gap` refused: human-approval-required, on screen. Marco presses **Approve next request**; the card flips to "reply Yes, send it". Reply. The packet card appears with exactly its fields. A third send is refused again. Step 3 done. | P2, press, P3, P3 again |
| 1:05 | VO-04 (~19s) | Market scan: five rows, four verdicts that say why not, Northlight answering. `get_demand` then `propose_offer`; proposal with margin versus floor. Marco presses **Approve offer**. Step 4 done. | P4, press |
| 1:30 | VO-05 (~9s) | `get_offers` returns the offer addressed to the request. Marco presses **Bought**. Hold on the click and the row changing. | P5, press |
| 1:45 | VO-06 (~14s) | Outcome panel: customer gained, merchant gained, pattern before and after, nobody gained a profile. Step 6 done, step 7 current. | none |
| 2:05 | VO-07 (~13s) | Drop the rival receipt. `import_receipt`; the kicker counts up to cycle 2; rail resets to step 2 with a sharper pattern. | image + `Import this receipt` |
| 2:25 | VO-08 (~11s) | Pull back: header (21 tools), the three gates named in a caption, docs flow map card, hemloop.app. | none |

## Prompt sheet (paste exactly)

| id | prompt |
|---|---|
| P1 | What should I buy next? |
| P2 | Tell the store I need a hoodie, size M |
| P3 | Yes, send it |
| P4 | Which store can fill this, and what can it offer inside its rules? |
| P5 | Any offers for me? |

## Post-production rules

- Speed-ramp waits, never the refusal or a press. Keep the refusal text readable for at least two
  seconds each time.
- Poster frame from 1:45 to 2:05 (outcome panel, purchase carrying the offer id). Never black,
  never the title card.
- Captions say why a step matters, not which tool ran; the tool chip is already on screen.
- Intro card and seven step cards come from HyperFrames on the Hemloop tokens; each step card is at
  most 1.2 s and sits on the cut into that step.
- Hard cap 3:00.
