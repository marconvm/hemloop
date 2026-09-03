# Demo Voiceover Script v4 (for TTS generation)

Eight segments matching the v4 beats in [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) and the timings in
[../video/CUE-SHEET.md](../video/CUE-SHEET.md). Those three files must agree; if you change a beat,
change all three. Generate each segment as a separate audio file so the edit can retime freely.

Target voice: warm, confident, mid-pace (about 150 words per minute). **No em dashes anywhere in
this file**: the clone reads them as a hard stop. Numbers are spelled out for the same reason.

Spoken total is about 2:01 inside a 2:40 runtime, which leaves roughly 39 seconds of air for tool
calls to land and for the two human clicks. That air is deliberate. Do not fill it.

Generation (media-use skill, once the voice CLI is authed):

```sh
for i in 01 02 03 04 05 06 07 08; do
  node ~/.claude/skills/media-use/scripts/resolve.mjs --type voice \
    --intent "$(sed -n "/^## VO-$i/,/^## /p" docs/VOICEOVER.md | tail -n +2 | sed '/^## /d')" \
    --project ~/projects/proofframe-webmcp/video
done
```

## VO-01 the gap (0:00, about 18s)

This is Hemloop. Watch one request go all the way round. Maya's agent reads her closet through WebMCP and finds the missing hoodie, and a pair of sneakers due for replacement twenty one months after she bought them. The wardrobe itself never leaves this page.

## VO-02 the approval gate (0:20, about 19s)

The agent cannot decide to share. Its first call is refused: human approval required. One press by Maya releases exactly one event. Category, size, need or want. No name, no account, no wardrobe rows. Then the approval is spent, and the very next call is refused again.

## VO-03 the merchant sees demand (0:50, about 16s)

It arrives grouped, with no shopper identifier anywhere in it, and scored against the stock this merchant actually locked. This is intent their own sales data cannot show them. Someone who owns the thing already, and wore it out.

## VO-04 the answer, inside locked rules (1:10, about 17s)

The merchant locked price, offer, code, dates and a margin floor first. Their agent proposes inside those rules and can do nothing else. A human approves before the shopper ever sees it, and there is no tool that can approve for them.

## VO-05 the shopper decides (1:30, about 9s)

The offer comes back addressed to the request, never to a person. Nothing here can buy for her. She decides.

## VO-06 the loop closes (1:50, about 13s)

And this is the part that pays for the whole thing. The purchase records the offer that won it. The merchant learns their offer worked without ever learning who she is.

## VO-07 the trust proof (2:05, about 21s)

One more thing, because the offer that reaches her has to be true. The agent tries fifty per cent off against a locked twenty five. Rejected before anything changes, with a reason it can correct itself from. The wrong frame never existed, and the export refuses to exist while any claim is wrong.

## VO-08 close (2:35, about 10s)

One request. A private closet, real demand, an offer that cannot lie, and a sale the merchant can attribute. Hemloop, built on WebMCP.

---

## What changed from v3, and why it mattered

v3 had nine segments built around the export as the climax, and the actual loop close was not in the
narration at all. VO-05 also still said the merchant's agent had "nine typed tools" when the studio
registers twelve. Both were stale enough that recording against v3 would have produced a video that
contradicted the live app.
