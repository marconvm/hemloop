# Before the repo goes public (Marco, 2026-09-04)

Order matters: the history scan is last, after every other item has landed, because each item
changes what the scan sees. Nothing flips visibility except Marco, by hand, after the scan report.

| # | item | owner | state |
|---|---|---|---|
| 1 | Branch and PR cleanup: there are no PRs (every merge was direct); 22 of 27 remote branches are fully merged into main. Delete the merged ones and the `worktree-agent-*` leftovers; keep `main`, `post-submission-unstealth`, and whatever Codex or Cursor is still pushing to. | Claude | doing now |
| 2 | README rewrite for a public reader: what Hemloop is in three sentences, the four routes, how to run the demo in ChatGPT's desktop browser (the receipt image, "What should I buy next?", Approve then "Yes, send it"), the 21 tools with their guarantees (table), local dev and deploy, licence, credits. No coordination notes, no test counts that go stale. | Cursor | after RuntimeStatus |
| 3 | "No extra md file within": repo root keeps `README.md` and `LICENSE` only (true today). `docs/` keeps the five reading-order sections, the use cases, `USER-GUIDE`, `TECH-GUIDE`, `SECURITY`, `PHOTO-CREDITS`. Internal process files (`GAP-ANALYSIS`, `DEVPOST-CHECKLIST`, `DEVPOST-SUBMISSION`, `WRITEUP`, `TEST-PLAN`, `VERIFICATION`, `PRD`, `VOICEOVER`, `DEMO-SCRIPT`) and `docs/coordination/*` move to `docs/internal/` and are NOT mirrored into `public/docs` (the Claude reviewer found `GAP-ANALYSIS.md` and both `DEVPOST-*.md` served at `hemloop.app/docs/…`). The docs site index links only what stays public. | Cursor | after 2 |
| 4 | Devpost format: `docs/internal/DEVPOST-SUBMISSION.md` restructured to the Devpost fields (project name, tagline, "About the project": inspiration, what it does, how we built it, challenges, accomplishments, what we learned, what's next; built with; try-it-out links; video link placeholder). Marco pastes it. | Cursor | after 3 |
| 5 | Easter egg: something a curious judge finds and smiles at, harmless and off the demo path. Proposal: type `loop` (or the Konami code) anywhere on the Loop Room and the seven step nodes chase each other round the rail once with the "perfect loop" line; or a hidden `/humans.txt`-style credit in the tool manifest dialog ("no tool can press this button, but you can"). Codex picks; must not add a tool, must not touch a gate. | Codex | after the review |
| 6 | `repo-go-public` history scan (credentials, personal data, internal references, every blob in history), Marco reads the report and decides what to strip; verify from a fresh clone; then Marco flips visibility and the footer link goes live. | Claude, then Marco | last |

Decisions Marco still owns: whether `docs/coordination/*` stays in the public history at all (it is
in every commit since 2026-09-01; stripping it means a history rewrite, which the scan will price),
and whether the kids' stock photos stay (faces of children in a demo).
