# Hemloop, second judge read (2026-09-02, post-revamp)

Sources: live HTML for `/`, `/closet`, `/studio`, `/docs/` via curl; README.md, docs/{WRITEUP,USER-GUIDE,TECH-GUIDE,GAP-ANALYSIS,VERIFICATION,SECURITY,VOICEOVER,PRD}.md; components/{landing,closet-studio,proofframe-studio}.tsx; lib/proofframe/{webmcp,webmcp-closet,closet}.ts; `npm test`. No files modified.

---

## A. Cold read again

### 60 seconds on the landing and README

**What it is:** a shopper page and a merchant page, each registering WebMCP tools in the browser. The shopper's agent reads a private wardrobe; exactly one tool can speak to a store, and only after the human presses Approve. The merchant locks the offer facts, and the merchant's agent cannot write copy that contradicts them. This time I had it from the first two sentences. Last read it took until paragraph four of the README.

**Who it is for:** still not stated in words, but now inferable in one pass. The two CTAs say "Open the shopper closet" and "Open the merchant studio", so the two audiences are named by the buttons. Good enough.

**What WebMCP does:** 17 typed tools, in-page, no backend and no OAuth, and two guarantees enforced by the absence of a tool. The tool table now says this explicitly, with the "absent by design" row present on the page.

**The aha:** unchanged and now legible: the guarantee is structural, not a prompt. The "(absent by design) / no lock_facts, no unlock_facts, no approve_share, no set_sharing_level" row is the thesis and it is now on the landing page where a judge will see it.

**What I still did not get from `/`:** the consent dial. Sharing levels, the payload preview, the completeness meter, the whole "more you share, more you gain" reciprocity, none of it appears anywhere on the landing page. That is now the best mechanic in the build and the landing does not know it exists. Also, still zero images on `/` (`grep -c '<img'` on the live HTML returns 0). Four concepts, no picture.

### Devpost criteria

| Criterion | Score sense | Delta vs first review |
|---|---|---|
| Use of WebMCP | Strong, now presented strongly | Fixed. The tool table with kind, behaviour and per-tool structural guarantee is on the page; 17 tools verified in code (7 closet, 10 studio). |
| Technical execution | Strong | Slightly up. 63/63 tests pass locally; `next` remediation strings on rejections; `closet_data` fences; consent enum minted in code. |
| Design / UX | Middling, was weak | Up two notches: favicon and hem-loop mark ship, gutter fixed, product photos on `/closet` and `/studio`, flash keyframes, tool-call counters. Still no imagery at all on `/`. |
| Impact / originality | Medium-strong, still underclaimed on `/` | Up. The consent dial with a "what you gain" column is a genuinely original mechanic. It is invisible on the landing page, so the judge who reads only `/` does not score it. |
| Demo clarity | Middling, was weakest | Up, capped by the same thing: no diagram, no screenshot, no GIF on `/`, and the studio's completeness meter opens at 9 of 9 so the reciprocity never demonstrates itself. |

Net: the legibility gap from the first read is roughly 70% closed. What remains is one missing picture and one missing paragraph, both on the landing page.

---

## B. The 14 first-review items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Favicon and hem+loop mark | Resolved | Live `/`: `<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>`; `components/landing.tsx:147` `HemLoopMark` single-path loop, reused as `LandingDivider` (`:166`). |
| 2 | Left margin on numbered cards | Resolved, exactly as prescribed | `app/globals.css:1271` `--container-max: 1176px`, `:1304` `padding-inline: 28px` on `.landing .content`. |
| 3 | No em dashes in UI copy | Resolved in shipped UI | 0 em dashes in live `/` HTML; `proofframe-studio.tsx:152` keeps the legitimate null placeholder. One survives in an exported artefact title, `lib/proofframe/exporter.ts:116`. |
| 4 | ChatGPT first, Chrome second, two blocks | Resolved | `landing.tsx:376-395`, two `.agent-block` cards, ChatGPT first, origin-trial token named. |
| 5 | Footer roles, not a sponsor roll | Resolved | Live `/`: "WebMCP tools in-page · catalog data from Shopify (one connector; any catalog with handle, title, price works) · agent surfaces ChatGPT and Chrome · deployed on Cloudflare Workers · domain registered with Vercel". |
| 6 | Docs link next to the studio CTA | Resolved | `landing.tsx:269-272`, `.landing-cta ghost` "Read the docs", footer link kept. |
| 7 | Micro-animations that carry information | Resolved to the extent recommended | `globals.css:1600` `@keyframes hit`, `:1609-1611` `.activity-item.is-new/.demand-item.is-new/.garment-card.is-new`, reduced-motion guard at `:1616`. |
| 8 | Which tools exist, on which surface | Resolved, best single change in the revamp | Full table live on `/`, 17 rows plus the "(absent by design)" row; `landing.tsx:146` `TOTAL_TOOL_COUNT = 17`; fold at `:355-364`. |
| 9 | GA-debugger behaviour on the logs | Resolved | Live `/closet`: "0 tool calls · 0 sent · 0 blocked"; live `/studio`: "0 tool calls · 0 blocked"; flash classes per B7. |
| 10 | Demo data is thin | Resolved | 8 synthetic apparel products, snowboards gone; `Garment` gained `image`, `price`, `retailer`, `material`, `purchasedAt`, `for` (`lib/proofframe/closet.ts:18-31`). |
| 11 | Real product photos | Resolved on the app pages, not on `/` | 13 files in `public/products/`; 8 `<img>` on live `/closet`, 2 on `/studio`, **0 on `/`**. |
| 12 | Confusing vocabulary | Mostly resolved | Live UI now reads "Incoming requests", "Agent activity log", "Approved offer facts", "Approve next request (level N)", "Northlight Apparel". Residue: "signal log" in the shopper UI (`closet-studio.tsx:504,971,974`) beside a panel headed "Requests sent"; "campaign truth" in an agent-facing string (`lib/proofframe/webmcp.ts:585`); "Shopify merchant use case" in the studio footer (`proofframe-studio.tsx:1278`). |
| 13 | Over-coupled to Shopify | Resolved in prose | README:13 "this demo's connector is Shopify"; footer "one connector; any catalog with handle, title, price works". Exception: `proofframe-studio.tsx:1278`. |
| 14 | Third party did not get it | Partially resolved | 14.1 what/why hero: resolved (`landing.tsx:249-257`, plus the named-people line in README:9). 14.2 no picture: **not resolved**, zero images and no diagram on `/`. 14.3 vocabulary: resolved bar the residue above. 14.4 security over-investment: partially, WRITEUP.md:37 is now one short paragraph pointing at SECURITY.md. 14.5 two-surface framing: resolved, the three loop cards name Maya and the store. |

Score: 11 resolved, 2 partial (12, 14), 1 unresolved sub-item (14.2, the picture).

---

## C. The consent mechanic and merchant reciprocity

### Does "the more you share, the more you gain, on both sides" land?

**On `/closet`, yes, and it is the strongest thing in the build.** The dial is four segments (`closet-studio.tsx:796-810`), and next to "What leaves" there is a literal "What you gain" column (`:812-819`). Below it a payload preview lists the exact fields, derived from the same pure function the tool uses to fill `consent.fields` (`closet.ts:93` `consentFieldsForRequest`, called at `closet-studio.tsx:431` and at `webmcp-closet.ts` inside `report_demand_gap`). One function, two consumers, so the preview cannot drift from the payload. At level 0 the Approve button is disabled with a reason (`:836-846`) and the tool returns `sharing-disabled` with a `next` string. A stranger gets it in about ten seconds on that page.

**On `/studio`, the reciprocity is designed but does not demonstrate.** The meter reads "Offer completeness 9 of 9 facts locked" on first load, because `lib/proofframe/seed.ts` fills every fact including `purchaseUrl` and `sizesInStock`. `COMPLETENESS_CHECKS` carries a beautifully written `unlocks` string per fact (`webmcp.ts:237-290`, e.g. "agents can hand the shopper a place to buy"), and the UI renders those strings only for missing facts (`proofframe-studio.tsx:837-843`). At 9 of 9 the list is empty, so the merchant half of the argument is never shown to anyone who does not go and delete a fact.

**On `/`, it does not land at all.** The word "sharing", "consent" and "level" appear on the live landing page only inside two tool-table cells. A judge who reads the landing and watches the video never learns the mechanic exists.

### The one sentence for the landing

Place it directly under the hero subhead, before the three loop cards:

> Maya sets a dial from 0 to 3 for how much of herself travels, and every step up buys her a better offer; the store has the same dial in reverse, where every offer fact it locks is one more thing a shopping agent can do on its behalf.

If you want it shorter: *"Both sides choose how much to give, and both sides get more back for giving it. That dial is the product."*

### Privacy claims that are now overstated or contradicted by the code

1. **Level 2 also sends who you are shopping for, and the summary copy does not say so.** `webmcp-closet.ts` sets `signal.for = cb.getActiveProfile()` at level >= 2, and `consentFieldsForRequest` pushes `'for'` at level >= 2 (`closet.ts:101-104`). The payload preview correctly shows "Shopping for" (`FIELD_LABEL.for`, `closet-studio.tsx:125`). But the "What leaves" line for level 2 says only "+ occasion (season, gift, event), fit preference", in four places: `closet-studio.tsx:108`, README.md consent table, docs/USER-GUIDE.md, docs/GAP-ANALYSIS.md. Two adjacent UI elements disagree about a privacy boundary, and the wrong one is the summary. This is the single fix I would make first in this section.
2. **`get_offer` "reads locked facts only" is stronger than the code.** Landing tool table: "readOnlyHint, reads locked facts only, nothing the agent invents can change them". `webmcp.ts:531-549` reads `cb.getState().facts` whatever their lock state and returns `locked: state.factsLocked`. While facts are unlocked, `import_product` (an agent tool) writes them, so an agent can influence what `get_offer` returns. The `locked` flag is returned, which is the right design; the sentence should say "returns the facts together with whether a human has locked them", not "locked facts only".
3. **Landing step 02 describes level 1 and reads as an absolute.** "Category, size, an optional product, need or want. No name, no account, no wardrobe rows." True at the default. At level 3 the payload additionally carries fit preference, colour family, materials to avoid, price ceiling and profile. Nothing on the landing says the payload grows with the dial. Combined with the missing sentence above, a judge could reasonably call this out. The fix is the same sentence.
4. **Not overstated, but worth naming:** at level 3 the field set is a quasi-identifier (size + fit + colour family + materials + price ceiling + profile). The docs already answer this with the k-anonymity roadmap item; the answer just is not near the claim. One clause in the level 3 row ("no identifier, though a rich enough grant is still a fingerprint, which is what the aggregation floor on the roadmap addresses") converts an attack into evidence of rigour.

Everything else checks out: `DemandSignal` has no identity field, `signalId` is a per-event `crypto.randomUUID()`, approval is consumed synchronously before emit, malformed input is rejected before the approval burns (`webmcp-closet.ts`, the "must not burn the approval" comment and the three bounds checks), and the "nothing is stored on a server" line matches the localStorage bridge.

---

## D. Top 5 remaining fixes, by judging value per hour

| # | Fix | Smallest concrete change | Effort |
|---|---|---|---|
| 1 | One picture on `/` | Redraw the TECH-GUIDE ASCII block as a single inline SVG, three boxes and one arrow: closet tools -> one approved event -> studio locked facts -> `get_offer`. Drop it between the hero and the loop cards, using `currentColor` so it themes for free. Nothing else on the page needs to change. | M |
| 2 | The consent sentence plus a 4-row level table on `/` | Add the Part C sentence under the hero subhead, and a fourth loop card (or a compact table below card 02) with the four levels and the "what you gain" column lifted verbatim from `CONSENT_LEVELS` in `closet-studio.tsx:88-116`. Pure copy, already written. | S |
| 3 | Fix the level 2 "what leaves" copy | Append ", who you are shopping for" to the level 2 `leaves` string in `closet-studio.tsx:108`, then mirror in README.md, docs/USER-GUIDE.md, docs/GAP-ANALYSIS.md and public/docs. Four one-line edits closing a real contradiction. | S |
| 4 | Make the completeness meter demonstrate | Ship the seed with `purchaseUrl` and `sizesInStock` empty in `lib/proofframe/seed.ts` so the studio opens at 7 of 9 with two "Unlocks: ..." lines visible, and locking them on camera is the merchant half of the story. Alternatively add a "See what is missing" toggle that renders all nine with the locked ones ticked. | S |
| 5 | Stale counts in the submission text | docs/WRITEUP.md:13 `16 WebMCP tools` -> 17; `:19` `six WebMCP tools` -> seven; `:41` `42 unit tests` -> 63. This is the text a Devpost judge reads first and it currently contradicts the landing page's own "17". Mirror to public/docs. | S |

### What I would remove before the deadline

- **`docs/VERIFICATION.md:9,17,28,30`**: quotes 41/41 tests, "Approve next signal", "Live Demand" and "9 WebMCP tools live". Line 3 honestly flags the labels as historical, but a judge who opens this doc sees numbers that contradict the README twice. Either re-run and restate at 63/63 with current labels, or cut the superseded run and keep only the current one.
- **`docs/SECURITY.md`**: the six-pass narrative with PF2/PF4/PF5 finding tables is 162 lines of internal process. Keep the finding table and the CLEAN verdict, move the pass-by-pass replay history to an appendix or drop it. It reads as diligence to an engineer and as noise to a judge.
- **`docs/internal/coordination/`**: CODEX-COORDINATION.md, the judge reviews and the surface snapshots are in the public repo. They are honest but they are working notes, and one of them narrates a bug hunt in the tool count. Not shipped to `/docs/`, but a judge who clones will find them. Consider moving to a branch.
- **`docs/VOICEOVER.md:29` and `video/audio_request.json:20`**: the recorded narration says "campaign truth" and "minimized at the source", both retired terms. `video/CUE-SHEET.md:37` already flags the mismatch and accepts it. That is a defensible call, but "minimized at the source" is exactly the privacy-engineering register item 12 asked you to drop, and it is the line spoken over the most important frame.
- **`landing.tsx` footer "domain registered with Vercel"**: honest, and it invites the reader to notice it is the smallest contribution on the list. The role list is strong without it.

---

## E. Copy sweep

### Em dashes

| Location | Note |
|---|---|
| Live `/`, `/closet`, `/studio` HTML | Clean, zero em dashes. |
| `lib/proofframe/exporter.ts:116` | `<title>${productName} — ${BRAND.name} promo</title>` in the exported composition, a user-visible artefact. |
| `components/proofframe-studio.tsx:152` | `return '—'` null placeholder. Legitimate typography, leave it. |
| `docs/SECURITY.md:9,10,17,120,138`, `docs/VERIFICATION.md:17`, `docs/VOICEOVER.md:17,21,25,29,37,41,45`, `video/audio_request.json:20` | Prose and narration em dashes in shipped docs. |
| `lib/proofframe/{exporter,brand,types,shopify}.ts`, `components/proofframe-studio.tsx:29,75` | Code comments only. |

### Stale counts

| file:line | Says | Should say |
|---|---|---|
| docs/WRITEUP.md:13 | "register 16 WebMCP tools" | 17 |
| docs/WRITEUP.md:19 | "six WebMCP tools" on `/closet` | seven |
| docs/WRITEUP.md:41 | "42 unit tests" | 63 (`npm test` returns `# pass 63`) |
| docs/GAP-ANALYSIS.md:9 | "register 15 WebMCP tools" | 17 |
| docs/VERIFICATION.md:9 | "41/41 tests pass" | 63/63 |
| docs/VERIFICATION.md:17 | "Re-verified 2026-09-02 at HEAD ... 41/41 tests" | 63/63, and HEAD has moved since |
| docs/VERIFICATION.md:30 | "`/studio` showed `9 WebMCP tools live`" | 10 |
| docs/SECURITY.md:121,125 | "33/33 tests" | historical run, acceptable if dated, currently is not |
| docs/SECURITY.md:162 | "Gates: 41/41 tests" | 63/63 |
| public/docs/{WRITEUP,GAP-ANALYSIS,VERIFICATION,SECURITY}.md | Same lines, mirrored | Mirror after fixing |

### Old brand or retired labels still visible

| file:line | String | Note |
|---|---|---|
| lib/proofframe/webmcp.ts:585 | "Confirm campaign truth is unlocked ..." | Agent-facing remediation string. The UI says "offer facts". |
| components/closet-studio.tsx:504 | "Cleared wardrobe and signal log" | Panel is headed "Requests sent". |
| components/closet-studio.tsx:971 | "Clear wardrobe and signal log" | Same, and docs/USER-GUIDE.md calls this button "Clear wardrobe and requests sent", so the guide and the button disagree. |
| components/closet-studio.tsx:974 | "Wardrobe rows and the signal log live in this browser only." | Same. |
| components/proofframe-studio.tsx:1278 | "Shopify merchant use case · Chrome WebMCP · deployed on Cloudflare Workers" | The only over-coupled-to-Shopify string left in shipped UI. |
| docs/VERIFICATION.md:14, public/docs/VERIFICATION.md:14 | "the studio editor and proof trail render" | "proof trail" retired. |
| docs/VERIFICATION.md:28,30 (and public mirror) | "Approve next signal", "Live Demand panel" | Retired labels, flagged as historical at line 3. |
| docs/VOICEOVER.md:29, public/docs/VOICEOVER.md:29, video/audio_request.json:20 | "locks the campaign truth", "minimized at the source" | In the recorded narration. |
| video/CUE-SHEET.md:28,29,64 | "campaign truth locked", "proof trail" | Cue sheet, line 37 acknowledges the mismatch. |
| README.md:13, docs/PRD.md:5,18, lib/proofframe/signal-bridge.ts:4, lib/proofframe/closet.ts:376, lib/proofframe/webmcp-closet.ts:4,76, components/closet-studio.tsx:251, tests/closet.test.ts:113 | "zero-ID" | Now always glossed as "no shopper identifier (zero-ID)" on first use in prose, which is what was asked. The UI string at closet-studio.tsx:251 ("Sent an approved zero-ID request") is the one place the hyphenate appears unglossed to a human. |

Not found anywhere outside the archived first review: Aurora Threads, Northgate, Field Supply, AURORA25. All three fictional brands were replaced (Northlight Apparel, Denim Supply Co., Ridgeline Outdoor) and marked "(a demo brand)" on first use in README:9 and WRITEUP:15.
