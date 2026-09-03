# Cue sheet: one-take demo, 2:50

The timed layer over `docs/DEMO-SCRIPT.md`. That file holds the prompts and the
argument; this one holds the clock and what preflight actually found.

Build the narration bed first:

```sh
python3 video/build-vo-track.py video/vo-clone video/vo-clone-track.wav --check
```

Drop `vo-clone-track.wav` (your cloned voice, rendered 2026-09-03 from the current script) at 00:00. Every line is already at its beat start, so you
cut the screen capture to meet the audio rather than sliding eight files by hand.
The HeyGen bed in `video/vo/` is the fallback (`build-vo-track.py video/vo video/vo-track.wav`).

## Preflight, run 2026-09-02 on the live deployment, all green

Chrome 151 with `chrome://flags/#enable-webmcp-testing`, after the dead-code removal:

| check | result |
|---|---|
| `/closet` badge | **9 WebMCP tools live** |
| closet tools registered | `add_garment`, `check_fit`, `find_gaps`, `get_my_sizes`, `get_offers`, `get_preferences`, `get_wardrobe`, `import_receipt`, `report_demand_gap` |
| `/studio` badge | **11 WebMCP tools live** |
| studio tools registered | `add_scene`, `export_composition`, `get_campaign_state`, `get_offer`, `import_product`, `propose_offer`, `reorder_scenes`, `seek_preview`, `set_brief`, `update_scene`, `validate_claims` |
| clean state | `localStorage` empty · closet "Nothing sent yet" · studio "No signals yet" |
| sharing level | set to **2 Context**, **Shopping for: Me** |
| gates | campaign truth **locked** · **Approve next request (level 2)** armed and visible |
| proof trail | "All claims trace to locked facts · 4 scenes checked · safe to export" |
| runtime namespace | `document.modelContext` defined, `navigator.modelContext` **undefined** |

ChatGPT preflight (from learn.chatgpt.com/docs/webmcp, read 2026-09-02): site tools run only on
**GPT-5.6 Sol or Terra** (Luna has WebMCP disabled) in the ChatGPT desktop app's built-in
browser, latest version, ChatGPT Work or Codex (not Enterprise/Edu). The address bar shows a
**Site tools** indicator when the page's tools are discovered: get it in frame in the cold open.

Narration and screen now use the same words (request, offer facts): the clone render came from the updated script.

Three things to know before you roll:

1. **Proof-trail card label fixed**: it now prints `navigator.modelContext ?? document.modelContext`
   (live since Worker 27ae3d2a), matching what the runtime actually exposes.
2. **The gaps panel shows two cards**: "Hoodie · No hoodie in the wardrobe" and
   "Jacket · Only one jacket in rotation", while VO-02 says "the gap: no hoodie".
   Prompt C1 asks which category is *completely absent*, so the answer is right; just
   don't frame the shot so it reads as the agent missing the jacket.
3. **The disclaimer bakes in "until Sep 7, 2026"** and campaign end date `2026-09-07`.
   Correct during the judging window's first week. Changing locked facts this close to
   the deadline costs more than it buys, so it stays.

## The clock

The clone VO runs 1:58 across a 2:50 timeline: 52 s of headroom spread over eight beats, so
every line lands inside its slot with room for the action to breathe. Never type
live: paste, and cut the wait.

| t | VO (len) | On screen | Paste |
|---|---|---|---|
| 0:00 | VO-01 (9.2s) | Cold open **already on `/closet`**, live badge visible, first call firing. No title card. | C1 |
| 0:12 | VO-02 (11.3s) | `find_gaps` result: hoodie absent. Wardrobe grid visible, never read aloud. | n/a |
| 0:35 | VO-03 (22.2s) | Sharing level already **2 Context**; payload preview visible before any click. `report_demand_gap` → `human-approval-required`. Human clicks **Approve next request (level 2)**. Retry succeeds; **hold on the payload**: this is the longest line, use it to let a judge read the fields and see no identity column. | C2, human click, C3 |
| 1:00 | VO-04 (15.4s) | Cut to `/studio`. New event top of Incoming requests, its Occasion / For / "Shared at level 2" line visible. Human: **Unlock offer facts** → **Answer this request** → **Add sizes in stock** (meter 8 of 9 → 9 of 9) → **Lock offer facts**. Agent never clicks. | n/a |
| 1:20 | VO-05 (10.7s) | Agent runs the five-call chain; human edits the hero heading by hand in the same canvas. 14 s of headroom here: the widest beat, spend it on the two-editors shot. | M1 |
| 1:45 | VO-06 (17.2s) | The block: 50% off rejected, red row in the proof trail with the reason, canvas unchanged, agent self-corrects to 25%. | M2 |
| 2:10 | VO-07 (18.8s) | `validate_claims` → `export_composition`; the downloaded composition plays with the disclaimer footer visible. | M3 |
| 2:35 | VO-08 (13.7s) | Landing page, repo + docs flash, supporters line. | n/a |

Hard cap 3:00. VO-08 is 13.7 s inside a 15 s slot, so the close has almost no slack: start the landing cut exactly at 2:35. If you reach 2:35 behind, skip opening the downloaded HTML and cut
straight to the close: the export *result* already proved the point at 2:10.

## Optional beat, only if ahead of time

**M5 / C5**, inserted after M4 (the `get_offer` handoff), before the close: no VO track exists for this beat, so it only runs silent or ad-libbed, and only when the take is comfortably ahead of the clock above. In the studio, the merchant either toggles **Auto-propose** or clicks **Propose offer** on the incoming request, then **Approve**. Cut to the closet: the offer appears in **Offers for your requests**, Maya clicks **Bought**, and the Purchases panel row shows the offer id it came from. Skip entirely rather than push into the 3:00 hard cap.

## If the take goes wrong

Recovery lines are in `docs/DEMO-SCRIPT.md` under "Fast recovery lines". The one that
matters most: if ChatGPT explains instead of calling, say *"Do not explain yet. Call the
named page tool now."* Explaining burns runtime you cannot cut around, because the VO
bed underneath it is fixed.

Between takes: clear site data for the origin, reload both tabs, confirm the studio says
no signals and the truth is locked again. A leftover rehearsal signal in Incoming requests is
the one continuity error a judge would actually notice.
