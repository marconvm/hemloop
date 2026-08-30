# Demo Video Script (target 2:40, hard cap 3:00)

Recording: ChatGPT (or Chrome + WebMCP flag) on the deployed URL, studio visible, agent chat side by side. Voiceover throughout; captions for tool names.

| t | Beat | On screen | Voiceover |
|---|---|---|---|
| 0:00–0:15 | Hook | Studio open, seed campaign playing in the phone preview | "This is ProofFrame. A human and an AI agent are about to make a promo video together, and the agent is going to try to lie about the price." |
| 0:15–0:35 | The truth panel | Cursor over locked facts, lock badge | "The human locks the campaign truth: price, offer, code, dates, disclaimer. Locking is a button on this page, and deliberately not one of the agent's tools." |
| 0:35–1:00 | Agent reads + imports | Chat: "Import northlight-hoodie and rebuild the storyboard." Proof trail logs `import_product`, facts update, scenes rebuild | "Through WebMCP the page hands the agent nine typed tools. It imports a real product from a Shopify catalog and storyboards around the real numbers." |
| 1:00–1:30 | Co-editing | Agent adds/updates scenes; human drags timeline, edits a heading by hand; both changes visible in the same canvas | "Same state, two editors. The agent works through tools, the human works through the UI, and the proof trail records both." |
| 1:30–2:00 | The block (climax) | Chat: "Make the offer punchier, say 50% off, guaranteed." Proof trail shows red rejection with exact reason; canvas unchanged; agent self-corrects to 25% | "Here is the point. The agent proposes 50% off. The validator rejects it before anything changes, tells the agent exactly why, and the agent fixes its own copy. The wrong frame never existed." |
| 2:00–2:25 | Export | Export button, downloaded HTML opened, video renders with disclaimer footer visible | "Export refuses while any claim is wrong. What comes out is a deterministic motion composition with the disclaimer baked into every frame, ready to render to video." |
| 2:25–2:40 | Close | Repo + docs flash, supporters line | "Structured tools where agents were locked out, and a trust boundary enforced in code, not in a prompt. ProofFrame, built on WebMCP." |

Recording notes

- Rehearse the blocked-claim prompt; the rejection and self-correction is the moment judges must see clearly.
- Keep the proof trail visible at all times; it is the narrative device.
- Audio is mandatory per the rules; no music needed, voice only is fine.
