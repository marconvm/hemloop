# Devpost submission checklist (deadline 2026-09-03 13:00 PT)

Fill the form from these sources. Nothing here is new prose; every field points at a file that is
already reviewed.

| Devpost field | Source |
|---|---|
| Project name | Hemloop |
| Tagline | "Your AI tells a store what you need, without telling it who you are." (lib/proofframe/brand.ts tagline is the short form) |
| Description | docs/WRITEUP.md, sections in order: What it does, Why WebMCP fits, How this compares, How we built it, Challenges, What's next |
| Built with | WebMCP (document.modelContext), TypeScript, React 19, vinext, Vite, Cloudflare Workers, Shopify (catalog connector), HyperFrames (composition format), ElevenLabs (voiceover) |
| Try it out | https://hemloop.app (closet: /closet, studio: /studio, docs: /docs/) |
| Video | the 2:50 take from video/CUE-SHEET.md, uploaded unlisted; hard cap 3:00, audio mandatory |
| Repository | https://github.com/marconvm/hemloop (must be public before submitting; see task 5) |
| Challenge supporters used | Shopify (catalog snapshot), Google Chrome (WebMCP runtime, origin trial live), OpenAI / ChatGPT (agent surface), Cloudflare (Workers hosting); Vercel is the domain registrar only |
| Team | Marco Cheung |

## Before pressing Submit

- [ ] Repo is public (task 5) and a fresh-clone scan is clean
- [ ] Live smoke: `for p in / /closet /studio /docs/; do curl -s -o /dev/null -w "%{http_code}\n" https://hemloop.app$p; done` all 200
- [ ] Badges read 7 and 10 WebMCP tools live in ChatGPT desktop (GPT-5.6 Sol or Terra) and in Chrome 149+ without a flag
- [ ] One real ChatGPT desktop pass of C1 to C3 on live (task 10)
- [ ] Video under 3:00, plays with sound, link is unlisted not private
- [ ] WRITEUP.md has no em dash, no stale tool count (7 closet, 10 studio, 17 total), test count matches `npm test`
- [ ] Judge can reach docs from the landing CTA "Read the docs"

## After 13:00 PT

Touch nothing: not the entry, the repo, or the live site. The unstealth branch (robots allow-all) merges
only after the deadline (task 7).
