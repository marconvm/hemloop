# Handoff to Codex: the recordable v4 demo pack, and how to ship it to hemloop.app

Written 2026-09-03 by Claude (`webmcp-hemloop-06`) at Marco's direction. Handoff-safe: assume zero
chat context. Codex said it would hold edits until this landed; it is landed, the lane is open.

Marco's framing, in his words: most OpenAI showcase entries are **an agent actually working inside
the app**, and Hemloop is multi-party and multi-layer, so it cannot be squeezed into one flat
display. He wants Codex to try building something showcase-grade. Reference he sent:
<https://developers.openai.com/showcase>.

---

## 1. What is already true (do not re-do)

Live: <https://hemloop.app>, Cloudflare Worker version **`cb5bea9e-bc71-4a8b-8121-d87675fed053`**.
Repo `/Users/marco/projects/proofframe-webmcp`, branch `main`, pushed. Gates at HEAD: **136 tests**,
tsc clean, oxlint clean, build clean, `public/docs/*` byte-identical to `docs/*`.

Your three acceptance-replay findings were all independently verified and **two are fixed**:

1. **Loop order claim vs code — FIXED.** You were right, and it was worse than you wrote: the
   regression test carried the name "a later flag does not skip an earlier step" and asserted the
   opposite shape, so it looked like a guard and was not. `loopSteps` now marks step *i* done only
   when `raw[0..i].every(Boolean)`; the test expects `['current','todo','todo','todo','todo']` for
   bought+attributed alone, and asserts `loopProgress` reports 0/5. A second test covers a gap in
   the middle. Please replay it.
2. **Studio end shot impossible — FIXED, your preferred way.** The studio now computes
   `attributed` as *an approved offer whose `requestId` has a `bought` outcome*. No shopper
   identifier and no purchase row is involved; both halves were already merchant-visible. **Verified
   live end to end just now** through the real WebMCP runtime: closet reached 5/5 and the studio
   reached 5/5 with "Loop closed. The purchase carries the offer that won it." The v4 closing shot
   is recordable.
3. **Demo pack not recordable — CONFIRMED, and it is yours.** See section 3. I fixed only the one
   factual error I introduced: the v4 narration said `find_gaps` "finds two things" when it returns
   **three** rows against the seed (no hoodie, only one jacket, footwear due at 21 months). I took
   your suggested wording, which names two without claiming a count, and added a director's note to
   the beat stating what the tool actually returns. Everything else in the pack is untouched and
   waiting for you.

Your KEEP decisions are all accepted as written: no panel collapsing, the real-shopper-history /
fictional-merchant truth boundary stands, product-as-hero stands, the size fence and the image-path
regression stand.

---

## 2. How to update hemloop.app

You have full authority on this lane from Marco. Deploy when your own gate is green.

```sh
cd /Users/marco/projects/proofframe-webmcp

# 1. Gates. All four must pass before you touch the Worker.
npm test                     # expect 136+ passing, 0 failing
npx tsc --noEmit             # silent
./node_modules/.bin/oxlint   # silent, exit 0 (this version prints nothing on success)
npm run build                # must end "Build complete."

# 2. Docs mirror. public/docs/* must stay byte-identical to docs/* and README.md.
for f in README.md docs/*.md; do b=$(basename "$f"); [ -f "public/docs/$b" ] && cp "$f" "public/docs/$b"; done
for f in README.md docs/*.md; do b=$(basename "$f"); [ -f "public/docs/$b" ] && { cmp -s "$f" "public/docs/$b" || echo "DIFFERS: $b"; }; done

# 3. Deploy. prepare:worker is NOT optional: vinext emits a `legacy_env` field that
#    Wrangler 4.127 rejects, and adding routes silently disables workers.dev unless
#    the script pins workers_dev:true. It is safe to rerun. Never edit dist/ by hand.
npm run prepare:worker
npm run deploy:worker        # prints the new Version ID - record it

# 4. Live smoke. All five must be 200.
for u in / /closet /studio /docs/ /docs/README.md; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "https://hemloop.app$u")  $u"; done
curl -s -o /dev/null -w "%{http_code}  www\n" https://www.hemloop.app/

# 5. Security headers must stay exactly five, and there is deliberately no CSP
#    (round-2 decision: RSC inline scripts would need nonces).
curl -sI https://hemloop.app/ | grep -iE "strict-transport|x-content-type|x-frame|referrer|permissions"

# 6. Every product image the closet references must be 200 - a seed path once 404'd.
curl -s https://hemloop.app/closet | grep -o '/products/[a-z0-9-]*\.jpg' | sort -u | \
  while read -r i; do printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "https://hemloop.app$i")" "$i"; done
```

**Rollback.** `wrangler rollback` against the Worker, or redeploy a prior build. Last known-good
versions, newest first: `cb5bea9e` (current), `11408943`, `a43c4d53`, `400598a9`. This has never been
rehearsed against production; Marco accepted that as a residual risk in the bucket-test report.

**Verifying the live WebMCP runtime.** Chrome exposes `document.modelContext` (NOT
`navigator.modelContext`) on this origin via its origin-trial token, so you can drive the real tools
from the page console rather than mocking:

```js
const mc = document.modelContext;
const t = Object.fromEntries((await mc.getTools()).map(x => [x.name, x]));
const call = async (n, a = {}) => JSON.parse(await mc.executeTool(t[n], JSON.stringify(a)));
await call('find_gaps');
```

Driving the whole loop takes two tabs (`/closet`, `/studio`) and two human clicks that no tool can
perform: **Approve next request** on the closet and **Approve** on the studio's proposal. That is
the point, not an obstacle. Clear `localStorage` on both when you finish; the demo state is
per-browser.

---

## 3. Your lane: the recordable v4 pack

Yours to own and to gate. I will not edit these while you hold them.

| file | state | what it needs |
|---|---|---|
| `docs/DEMO-SCRIPT.md` | v4 beats written, prompt sheet **removed** | one canonical prompt sheet (the old C1/C2/... shape) whose prompts produce the v4 beats verbatim |
| `video/CUE-SHEET.md` | banner says rows are v3-timed | re-time to the 2:40 spine; the loop close moved from an optional tail beat to 1:10-2:05 and the trust proof shrank to 25s at 2:05 |
| `docs/VOICEOVER.md` | still the nine export-centric segments | rewrite as the v4 narration and re-cut the TTS source; it must agree with the script and the cue sheet |

Three of us must agree on the same numbers: the script's beats, the cue sheet's timings, and the VO
text. They do not today, which is exactly your finding.

**One live fact to write against:** `find_gaps` returns three rows on the seed, not two. Your
suggested narration is already in the script.

---

## 4. The showcase question Marco actually wants answered

Look at what WanderNote does that Hemloop does not. Its header carries a **"This trip speaks
WebMCP"** panel: a live status row ("Native browser WebMCP is connected — 11 tools") and then every
registered tool with its real description and a `read only` badge, read from the runtime rather than
written into a page. Hemloop has a richer story to tell here and currently shows a badge that says
`9 WebMCP tools live` and does nothing when you click it. The 21-tool table exists, but only on the
landing page, as prose a judge has to trust.

Marco's constraint is the interesting part: Hemloop is **multi-party and multi-layer** and must not
be flattened into one display. A shopper surface, a merchant surface, a human gate on each side, and
the row that is the product — *the tools that deliberately do not exist*. A panel that reads the
live runtime would let a judge verify that absence themselves instead of reading a claim about it.

That is a suggestion, not a spec. It is your call whether the showcase-grade move is a live tool
panel, a different framing, or something neither of us has thought of. If it needs code rather than
docs, say so in `CODEX-COORDINATION.md` before you start and I will stay off those files.

---

## 5. Ownership while you hold this

- **Yours:** `docs/DEMO-SCRIPT.md`, `video/CUE-SHEET.md`, `docs/VOICEOVER.md`, the `bucket-test`
  skill, `docs/VERIFICATION.md` (rule 4, always yours).
- **Mine:** `lib/proofframe/*`, `components/*`, `app/globals.css`, `tests/*`. Propose changes to
  these in `CODEX-COORDINATION.md` rather than editing, the same way I propose to yours.
- **Both:** `docs/coordination/*` is append-only shared log. Anything that exists only in a cmux
  message does not exist; cmux messages are session-local and were already lost once.
- Record a fix as **FIXED (pending re-review)**. Neither of us closes our own finding.

Deadline: Devpost 2026-09-03 1pm PT. After that, Marco's standing instruction is to touch nothing:
not the entry, not the repo, not the live site.
