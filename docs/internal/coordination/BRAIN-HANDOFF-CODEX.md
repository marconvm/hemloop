# Brain handoff: Codex takes over coordination when Claude 09 goes quiet

Written by Claude 09 (surface:107) at 02:12 EDT 2026-09-04. Claude's usage window ends soon.
Deadline: Devpost "Sep 4, 2026 @ 1:00am PDT" = **04:00 EDT**. Marco confirms the switch; until
then Claude is the brain and Codex keeps to its own track.

## Who does what

| role | who | may command | may not |
|---|---|---|---|
| brain | Codex (surface:19) after Marco says so | merges to main, gates, deploy, `cmux send` to Cursor surface:61 | flip repo visibility (Marco), submit Devpost (Marco), spend ElevenLabs credits again |
| builder | Cursor (surface:61) | its own branch | merge to main, deploy, command Codex |
| hands | Marco | the three presses on camera, the YouTube upload, the visibility flip, the Devpost form | |

Rules carried over: no `git add -A`; every merge lands with the chain below; nothing is pushed to
main without the gates green; the demo's agent calls and the three presses stay real (see
`video/CUE-SHEET.md`, section "What is real and what is not").

## State at handoff

- main `9ee6a34` live on hemloop.app (Cloudflare Workers, custom domains hemloop.app + www).
  Live smoke: `/`, `/closet`, `/studio`, `/docs/`, both receipt PNGs, `logo-loop.gif` all 200.
- PUBLIC-SCAN: GO, no history rewrite (`docs/internal/PUBLIC-SCAN.md`). Coordination log moved
  to `docs/internal/coordination/`. Repo `marconvm/hemloop` is still **PRIVATE**.
- VO: eight clone-voice segments regenerated from script v5, `video/vo-clone-track.m4a` is the
  2:50 track with every segment at its cue-sheet beat. Do not regenerate.
- Cards: `video/cards/out/cards-landscape.mp4` (intro 2.5 s + seven 1.2 s step cards) and
  `cards-portrait.mp4`.
- Devpost copy: `docs/internal/DEVPOST-SUBMISSION.md`, every field ready except the video URL
  (line "TODO: paste YouTube URL").
- In flight: Codex ChatGPT-desktop e2e report (to `docs/internal/coordination/CODEX-COORDINATION.md`);
  Cursor `cursor/devpost-gallery` (five 3:2 stills under `docs/internal/devpost/gallery/`, plus a
  Gallery list in DEVPOST-SUBMISSION.md; stretch: 20 s portrait teaser).

## Queue to 04:00, in order

1. **Marco records** (about 6 minutes of screen time; the only part nobody else can do):
   ChatGPT desktop app, built-in browser on https://hemloop.app/ light theme, localStorage cleared,
   Cmd+Shift+5 window recording at 60 fps, mic off. Paste P1 to P5 from the cue sheet, press the
   three buttons. Stop recording after the rival receipt lands (cycle 2).
2. **Edit** (Codex or Marco): assemble with ffmpeg, no timeline app.
   - Cut the capture into eight pieces at the eight beats; speed-ramp waits 8x to 20x with
     `setpts=PTS/N`; never ramp a refusal or a press.
   - Prepend the intro (first 2.5 s of `cards-landscape.mp4`), drop each step card (1.2 s) on the
     cut into that step.
   - Lay `video/vo-clone-track.m4a` at 0:00 as the only audio; export 1920x1080 H.264, under 3:00.
   - Poster frame from the outcome panel (1:45 to 2:05).
3. **Marco uploads** to YouTube, unlisted; pastes the URL into DEVPOST-SUBMISSION.md
   (Codex commits it: `git add docs/internal/DEVPOST-SUBMISSION.md`).
4. **Merge Cursor's gallery branch** with the chain, then Marco has the gallery files to upload.
5. **Marco flips visibility**: `gh repo edit marconvm/hemloop --visibility public`. Then Codex
   verifies from a fresh clone: `git clone https://github.com/marconvm/hemloop /tmp/hemloop-check &&
   cd /tmp/hemloop-check && npm ci && npm test`, and `curl -sI https://github.com/marconvm/hemloop`
   returns 200 unauthenticated.
6. **Marco submits** on Devpost from DEVPOST-SUBMISSION.md. Then nothing changes on main, live, or
   the entry until after judging starts (the `post-submission-unstealth` branch waits).

## Merge chain (unchanged)

```sh
git fetch origin && git merge --no-ff origin/<branch> -m "Merge <branch> @<sha>: <what>"
# conflicts in docs/internal/coordination/CODEX-COORDINATION.md: keep both sides, strip the markers
npm test && npx tsc --noEmit && npm run lint && npm run build
git push origin main
# only if app code or public/ changed:
npm run prepare:worker && npm run deploy:worker
```

## Fallback if the recording is not done by 03:15 EDT

Submit with an honest video rather than none: `cards-landscape.mp4` intro, then the docs stills
from `public/docs/img/` at the eight beats, the VO track underneath, and a caption on the first
frame reading "screens from the live app; agent run not captured in time". Same ffmpeg assembly,
image inputs instead of capture cuts. Under 3:00, audio present. The claim in the video then stays
true, which matters more than polish.

## If Codex also runs out

Cursor has the fewest quota problems. It gets this file and the same rules. Marco stays the only
one who flips, uploads, or submits.
