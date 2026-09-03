# Cue sheet: one request end to end, 2:40

> ## ⚠️ The v4 audio does not exist yet. Read this before cutting.
>
> `video/vo-clone/` holds **eight rendered segments totalling 1:58**, and they are the **v3**
> narration, rendered 2026-09-03 02:22, before `docs/VOICEOVER.md` was rewritten for v4. Cutting the
> v4 picture against that audio will not line up.
>
> The per-segment lengths in the table below are **word-count estimates at 150 wpm, not measurements**.
> They were written that way by mistake: the numbers they replaced had been measured off the v3 files.
>
> One command fixes it, and it reads the v4 text straight out of `docs/VOICEOVER.md`:
>
> ```sh
> video/generate-vo.sh elevenlabs-clone     # needs ELEVENLABS_VOICE_ID, already in ~/.config/hemloop-video/env
> for f in video/vo-clone/vo-*.mp3; do printf "%s " "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"; done
> ```
>
> Then replace the estimates below with what it prints. Until that is done, treat every duration in
> this file as approximate. **This costs ElevenLabs credits, so it is left for Marco to run.**
>
> Measured v3 lengths, for reference: 9.15 / 11.33 / 22.20 / 15.37 / 10.68 / 17.18 / 18.76 / 13.65 s.


## Preflight, run 2026-09-02 on the live deployment, all green

Chrome 151 with `chrome://flags/#enable-webmcp-testing`, after the dead-code removal:

| check | result |
|---|---|
| `/closet` badge | **9 WebMCP tools live** |
| loop rail | present on both surfaces, **Gap** current, next-line visible |
| closet tools registered | `add_garment`, `check_fit`, `find_gaps`, `get_my_sizes`, `get_offers`, `get_preferences`, `get_wardrobe`, `import_receipt`, `report_demand_gap` |
| `/studio` badge | **12 WebMCP tools live** |
| studio tools registered | `add_scene`, `export_composition`, `get_campaign_state`, `get_demand`, `get_offer`, `import_product`, `propose_offer`, `reorder_scenes`, `seek_preview`, `set_brief`, `update_scene`, `validate_claims` |
| clean state | `localStorage` empty · closet "Nothing sent yet" · studio "No signals yet" |
| sharing level | set to **1 Basics**, **Shopping for: Me** (v4 sends at level 1; the dial is an optional beat, not the spine) |
| gates | campaign truth **locked** · **Approve next request (level 1)** visible and NOT yet armed |
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

The v4 script ESTIMATES at 2:00 across a 2:40 timeline: about 39 s of headroom over eight beats, so
every line lands inside its slot with room for the action to breathe. Never type
live: paste, and cut the wait.

| t | VO (len) | On screen | Paste |
|---|---|---|---|
| 0:00 | VO-01 (~18.0s est) | Cold open **already on `/closet`**, live badge visible, first call firing. No title card. `find_gaps` returns **three** rows: no hoodie, only one jacket, footwear due at twenty one months. The narration names two of them and does not claim a count. Loop rail under the header: **Gap** lit, four steps ahead. | C1 |
| 0:20 | VO-02 (~18.8s est) | Payload preview visible **before any click**. `report_demand_gap` returns `human-approval-required` and sends nothing. Human clicks **Approve next request (level 1)**. Retry succeeds: **hold on the returned payload** so a judge can read every field and see there is no identity column. Third call refused again, on screen, proving the approval was consumed. Rail advances to **Approved request**. | C2, human click, C3, C4 |
| 0:50 | VO-03 (~15.6s est) | Cut to `/studio`. `get_demand` returns the grouped row with its verdict against locked stock. Human clicks **Answer this request**. | M1 |
| 1:10 | VO-04 (~16.8s est) | `propose_offer` with the request id from `get_demand`. Proposal shows price, reasons, and the margin check against the locked floor. Human clicks **Approve**. Rail advances to **Matched offer**. | M2, human click |
| 1:30 | VO-05 (~8.0s est) | Cut to `/closet`. `get_offers` returns it. Human clicks **Bought**. Shortest line in the take: about 12 s of air, spend it on the click and the row changing. | C5, human click |
| 1:50 | VO-06 (~12.4s est) | Purchases row appears carrying the **offer id**, garment lands in the wardrobe, request shows its outcome. Rail reaches **Learned**; the next-line reads **Loop closed**. Cut to `/studio`: its rail is 5/5 too. | n/a |
| 2:05 | VO-07 (~21.2s est) | The block: fifty per cent off rejected, red row in the activity log with its machine readable reason, canvas unchanged, agent self-corrects to twenty five. Three second flash of the export refusing while a violation stands. | M3, M4 |
| 2:35 | VO-08 (~9.2s est) | Both surfaces side by side, both rails 5/5. Repo and docs flash. | n/a |

Estimated spoken total 2:00 against a 2:40 runtime: about 39 s of air across the take, concentrated at 1:30
(the Bought click) and 0:20 (the refusal, the approval, the refusal again). That air is the demo.

## Optional beats, only if ahead of time

None of these has a VO track, so each runs silent or ad-libbed. Skip rather than push into the 3:00
hard cap. The v3 sheet listed the loop close here as optional; in v4 it is the spine (1:10 to 1:50)
and must never be cut.

| beat | where | costs | paste |
|---|---|---|---|
| `get_offer` handoff to a third-party shopping agent: purchase link, sizes in stock, offer completeness | studio, before the close | about 12 s | `Read the locked offer back as structured data for a shopping agent.` |
| The sharing dial: move level 1 to level 3 and watch the payload preview grow, then send a second request | closet, after C4 | about 15 s | `Send another one, this time with my taste.` |
| `import_receipt`: paste a sample order email, purchases and garments appear locally | closet, before C1 | about 15 s | use the **Paste sample** button, then `Import that receipt.` |

## Post-production rules (from the automated-demo playbook, adapted)

Source: Om Patel, "I taught Claude to record demo videos of my entire app, automatically"
(x.com/om_patel5, 2026-07-01). The full pipeline is Playwright driving the app plus Remotion editing
in code. **Hemloop must not adopt the driving half, and the reason matters** (see the recording rule
in DEMO-SCRIPT.md). The editing and structure half applies directly:

- **Never film a wait at 1x.** Every tool call has dead time while the result lands. Speed-ramp those
  stretches 8x to 20x in the edit rather than cutting them: the viewer still sees the real call
  happening, and a genuine 20 s of waiting becomes 1 s. This is what lets the take stay honest and
  still feel tight. The waits to ramp: after C1, after each `report_demand_gap`, after M1 and M2, and
  the bridge propagation between the two tabs.
- **Poster frame from real content, never black and never the title.** Pick a frame from 1:50 to 2:05
  where the purchase row carries the offer id and the rail reads Loop closed. A clip that opens on a
  black rectangle loses the click before it starts.
- **Captions narrate value, not mechanics.** "Now it scores the demand against stock it actually has",
  not "clicking get_demand". The tool name belongs in the activity log on screen, which is already
  visible; the caption should say why the step matters.
- **The two human clicks get the most on-screen weight.** Glide to them, pause before them, hold
  after. They are the only moments in the take that no tool can perform, which is the entire product.

## The 60 to 90 second cut, from the same footage

The playbook's strongest structural point is that one long walkthrough loses viewers, and that a
complex product wants **one short main-value clip a cold visitor can grasp, with longer material
underneath it**. That is also Marco's own constraint stated the other way round: Hemloop is
multi-party and cannot be flattened into a single flat display.

No second shoot is needed. Beats VO-01 to VO-06 (0:00 to 2:05) already are the whole loop. Cut them
to 60 to 90 s with the ramps above, drop VO-07's trust proof, and end on the closed rail. That gives:

| asset | length | source | what it is for |
|---|---|---|---|
| main value clip | 60 to 90 s | beats 1 to 6, ramped | the cold visitor, the landing page, the Devpost thumbnail |
| full take | 2:40 | all eight beats | the Devpost submission video, judges who want the trust proof |

Record once, cut twice.

## If the take goes wrong

Recovery lines are in `docs/DEMO-SCRIPT.md` under "Fast recovery lines". The one that
matters most: if ChatGPT explains instead of calling, say *"Do not explain yet. Call the
named page tool now."* Explaining burns runtime you cannot cut around, because the VO
bed underneath it is fixed.

Between takes: clear site data for the origin, reload both tabs, confirm the studio says
no signals and the truth is locked again. A leftover rehearsal signal in Incoming requests is
the one continuity error a judge would actually notice.
