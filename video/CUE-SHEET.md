# Cue sheet — one-take demo, 2:50

The timed layer over `docs/DEMO-SCRIPT.md`. That file holds the prompts and the
argument; this one holds the clock and what preflight actually found.

Build the narration bed first:

```sh
python3 video/build-vo-track.py video/vo video/vo-track.wav --check
```

Drop `vo-track.wav` at 00:00. Every line is already at its beat start, so you
cut the screen capture to meet the audio rather than sliding eight files by hand.
Re-run it against `video/vo-clone/` once the ElevenLabs clone is in.

## Preflight — run 2026-09-02 on the live deployment, all green

Chrome 151 with `chrome://flags/#enable-webmcp-testing`, after the dead-code removal:

| check | result |
|---|---|
| `/closet` badge | **6 WebMCP tools live** |
| closet tools registered | `add_garment`, `check_fit`, `find_gaps`, `get_my_sizes`, `get_wardrobe`, `report_demand_gap` |
| `/studio` badge | **9 WebMCP tools live** |
| studio tools registered | `add_scene`, `export_composition`, `get_campaign_state`, `import_product`, `reorder_scenes`, `seek_preview`, `set_brief`, `update_scene`, `validate_claims` |
| clean state | `localStorage` empty · closet "Nothing sent yet" · studio "No signals yet" |
| gates | campaign truth **locked** · **Approve next signal** armed and visible |
| proof trail | "All claims trace to locked facts · 4 scenes checked · safe to export" |
| runtime namespace | `document.modelContext` defined, `navigator.modelContext` **undefined** |

ChatGPT preflight (from learn.chatgpt.com/docs/webmcp, read 2026-09-02): site tools run only on
**GPT-5.6 Sol or Terra** — Luna has WebMCP disabled — in the ChatGPT desktop app's built-in
browser, latest version, ChatGPT Work or Codex (not Enterprise/Edu). The address bar shows a
**Site tools** indicator when the page's tools are discovered: get it in frame in the cold open.

Three things to know before you roll:

1. **The proof-trail card still prints `navigator.modelContext`** — the one namespace
   that is not there. A judge with the console open sees the contradiction, and it sits
   on screen for the whole take. One-line fix waiting on branch
   `preflight-modelcontext-label`; not merged, because a change lands only when both
   agents agree and the Codex lane is dormant.
2. **The gaps panel shows two cards** — "Hoodie · No hoodie in the wardrobe" and
   "Jacket · Only one jacket in rotation" — while VO-02 says "the gap: no hoodie".
   Prompt C1 asks which category is *completely absent*, so the answer is right; just
   don't frame the shot so it reads as the agent missing the jacket.
3. **The disclaimer bakes in "until Sep 7, 2026"** and campaign end date `2026-09-07`.
   Correct during the judging window's first week. Changing locked facts this close to
   the deadline costs more than it buys — leaving it.

## The clock

VO runs 1:46 across a 2:50 timeline: 64 s of headroom spread over eight beats, so
every line lands inside its slot with room for the action to breathe. Never type
live — paste, and cut the wait.

| t | VO (len) | On screen | Paste |
|---|---|---|---|
| 0:00 | VO-01 (7.3s) | Cold open **already on `/closet`**, live badge visible, first call firing. No title card. | C1 |
| 0:12 | VO-02 (10.6s) | `find_gaps` result: hoodie absent. Wardrobe grid visible, never read aloud. | — |
| 0:35 | VO-03 (22.6s) | `report_demand_gap` → `human-approval-required`. Human clicks **Approve next signal**. Retry succeeds; **hold on the payload** — this is the longest line, use it to let a judge read the fields and see no identity column. | C2, human click, C3 |
| 1:00 | VO-04 (14.3s) | Cut to `/studio`. New event top of Live Demand. Human: **Unlock as human** → **Build campaign from this** → **Lock campaign truth**. Agent never clicks. | — |
| 1:20 | VO-05 (10.5s) | Agent runs the five-call chain; human edits the hero heading by hand in the same canvas. 14 s of headroom here — the widest beat, spend it on the two-editors shot. | M1 |
| 1:45 | VO-06 (15.1s) | The block: 50% off rejected, red row in the proof trail with the reason, canvas unchanged, agent self-corrects to 25%. | M2 |
| 2:10 | VO-07 (15.2s) | `validate_claims` → `export_composition`; the downloaded composition plays with the disclaimer footer visible. | M3 |
| 2:35 | VO-08 (10.2s) | Landing page, repo + docs flash, supporters line. | — |

Hard cap 3:00. If you reach 2:35 behind, skip opening the downloaded HTML and cut
straight to the close — the export *result* already proved the point at 2:10.

## If the take goes wrong

Recovery lines are in `docs/DEMO-SCRIPT.md` under "Fast recovery lines". The one that
matters most: if ChatGPT explains instead of calling, say *"Do not explain yet. Call the
named page tool now."* — explaining burns runtime you cannot cut around, because the VO
bed underneath it is fixed.

Between takes: clear site data for the origin, reload both tabs, confirm the studio says
no signals and the truth is locked again. A leftover rehearsal signal in Live Demand is
the one continuity error a judge would actually notice.
