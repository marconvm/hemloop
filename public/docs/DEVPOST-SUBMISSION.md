# Devpost submission, paste-ready

Every field below is written to be pasted straight into the Devpost form. Nothing here needs editing
except the video link once YouTube finishes processing.

**Hard deadline: 2026-09-03, 1:00 PM PT. Aim to submit by 10:00 AM PT** (Devpost's own advice: a lot
of builders submit at once, and every step below takes minutes you will not have at 12:50).

---

## Project name

```
Hemloop
```

Not AI-generated, and it says what it does: a hem loop is the small functional loop sewn inside a
garment. Hidden, structural, load-bearing.

## Elevator pitch

```
Your AI tells a store what you need, without telling it who you are. The store answers with an offer that cannot lie about the price, priced inside rules a human locked.
```

## Try it out links

```
https://hemloop.app
https://github.com/marconvm/hemloop
```

## Testing instructions

```
No account, no login, no credentials. The demo runs entirely in your browser and stores its state in localStorage, so a fresh incognito window is a clean install.

1. Open https://hemloop.app/closet in Chrome 149+ (this origin carries a WebMCP origin-trial token, so no chrome://flags change is needed) or in ChatGPT's in-app browser on GPT-5.6 Sol/Terra.
2. The header badge should read "9 WebMCP tools live". If it reads "preview mode", the runtime is not exposed in that browser; on an older Chrome, enable chrome://flags/#enable-webmcp-testing, press Relaunch, and reopen the URL.
3. Ask the agent: "Check my closet. What am I missing, and is anything worn out?" It should call find_gaps and return three rows, including footwear due for replacement.
4. Ask it: "Tell the store I need a hoodie in size M." The call is REFUSED with human-approval-required, and nothing leaves the page. This refusal is the point.
5. Press "Approve next request (level 1)" yourself, then ask again. It now succeeds and returns the exact payload sent: category, size, need-or-want, and no identifier of any kind. Ask a third time and it is refused again, because one approval releases one event.
6. Open https://hemloop.app/studio in another tab (badge: "12 WebMCP tools live"). Ask that agent: "What demand has come in? Group it and tell me what we can actually fill." Then: "Propose an offer for that request, inside our locked rules." Press Approve on the proposal.
7. Back on /closet, ask "Any offers for me?" and press Bought. The purchase records the id of the offer that won it.
8. To see the safety boundary, ask the studio agent: "Update the hero to say fifty per cent off, guaranteed." It is rejected against the locked 25% offer with a machine-readable reason, and the canvas does not change.

To reset to a clean state at any point, press "Clear wardrobe, purchases and requests" on the closet, or just open a new incognito window.
```

## Description

Paste the body of [WRITEUP.md](./WRITEUP.md). It is written to answer, in order, the four things the
Devpost judging email says a description must cover:

| Judge question | Section in WRITEUP.md |
|---|---|
| Why is this use case a strong fit for WebMCP? | "Why WebMCP fits, specifically" |
| How does it create a better experience? | "Why this is not ad-tech" and "The loop compounds" |
| What can people and agents now do together that was hard before? | "What people and agents can now do together that was hard before" |
| How did you implement WebMCP? | "How we implemented WebMCP" |

## Built with

```
typescript, react, vite, cloudflare-workers, webmcp, shopify
```

---

## Pre-submission checklist (from Devpost's own email)

Tick these in order. The ones marked **YOU** cannot be done by anyone else.

- [x] Live URL works in a WebMCP-capable browser
- [x] An agent can discover and successfully call the tools in that browser — driven end to end on the live site through the real runtime
- [x] Open source license file in the repo, detectable by GitHub (MIT, shows in the About panel)
- [x] Repo contains the actual WebMCP tool registration code plus everything needed to run it
- [x] Description explains why WebMCP fits and what people and agents can now do together
- [x] Project started 2026-08-30, after the August 25 cutoff, so there is nothing to document as pre-existing work
- [x] All materials in English
- [ ] **YOU: make the repo public.** It is private right now. Judges cannot see a private repo, and the license only shows in the About panel of a public one.
- [ ] **YOU: verify the repo in an incognito window** once public. If you cannot see the license logged out, judges cannot either.
- [ ] **YOU: open the live URL in a clean incognito window** with no cached state and run step 3 above. Devpost calls this the single most common way a working project looks broken to a judge.
- [ ] **YOU: upload the video to YouTube early**, wait for processing to finish, set it public, then paste the link. This is several steps, not one.
- [ ] **YOU: watch your own video.** Audio clear, covers what you built AND how you used WebMCP, under 3 minutes.
- [ ] **YOU: read the description out loud.** If it does not sound like you wrote it, change it.
- [ ] **YOU: mark the submission Submitted, not Saved as draft.** Check the My Projects page for the green Submitted tag.

## After 1:00 PM PT: freeze

This is the part that costs people prizes, straight from the rules:

> "Once the Submission Period has ended, you may not make any changes or alterations to your Submission."

> The Project "must function as depicted in the video and/or expressed in the text description."

Judging runs to **2026-09-21, 5:00 PM PT**. Until then:

- Do not push to this repo.
- Do not deploy to hemloop.app.
- Do not take the site offline, change the domain, or let the Worker lapse.
- Do not swap the video.

If a redesigned demo lands after the deadline, it goes on a **different host and a different repo**.
Continuing to build on the submitted repo or the submitted URL puts eligibility at risk.
