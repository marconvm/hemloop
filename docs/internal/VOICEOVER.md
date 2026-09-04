# Demo Voiceover Script v5 (for TTS generation)

Eight segments matching the seven steps of the Hemloop page plus the close, and the timings in
[../../video/CUE-SHEET.md](../../video/CUE-SHEET.md). The two files must agree; if you change a beat,
change both. Generate each segment as a separate audio file so the edit can retime freely.

Target voice: warm, confident, mid-pace (about 150 words per minute). **No em dashes anywhere in
this file**: the clone reads them as a hard stop. Numbers are spelled out for the same reason.

Spoken total is about 2:05 inside a 2:50 runtime. The air between segments is where the real tool
calls land and where Marco presses the three buttons. Do not fill it.

Generation, unchanged from v4: the script reads the segments out of this file.

```sh
video/generate-vo.sh elevenlabs-clone   # -> video/vo-clone/  (Marco's cloned voice; spends credits)
for f in video/vo-clone/vo-*.mp3; do printf "%-22s " "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"; done
```

Then put the measured lengths into `video/CUE-SHEET.md`.

## VO-01 a purchase lands (0:00, ~16s)

This is Hemloop. One request, all the way round, inside the agent's own browser. Maya drops a receipt into the chat. Her agent reads it and calls one tool on this page. The purchase lands in her closet, and nothing about it leaves.

## VO-02 what should I buy next (0:20, ~15s)

She asks what she should buy next. The agent reads the closet through WebMCP and finds a hoodie she does not own, and a pair of sneakers due for replacement twenty one months after she bought them. The wardrobe itself never leaves this page.

## VO-03 the human gate (0:40, ~20s)

She tells the store she needs a hoodie in size medium. The agent is refused: human approval required. One press by Maya, and one reply, releases exactly one event. Category, size, need or want. No name, no account, no wardrobe rows. Then the approval is spent, and the very next call is refused again.

## VO-04 only the right store answers (1:05, ~19s)

Five stores see the same packet, and only the rules decide. One has the size sold out. One sells the wrong category. One cannot clear its own margin floor. One is priced above what she would pay. One can answer, at a price its locked rules allow, and a human approves before Maya ever sees it.

## VO-05 the shopper decides (1:30, ~9s)

The offer comes back addressed to the request, never to a person. Nothing here can buy for her. She decides.

## VO-06 the loop closes (1:45, ~14s)

And this is the part that pays for the whole thing. The purchase records the offer that won it. The merchant learns their offer worked without ever learning who she is. Both sides gained. Nobody gained a profile.

## VO-07 again, sharper (2:05, ~13s)

A receipt from a rival lands in the same closet. Cycle two starts with a sharper picture of what she buys and how, and still not one row has crossed the line.

## VO-08 close (2:25, ~11s)

Twenty one tools an agent can call. Three buttons only a person can press. A private closet, real demand, an offer that cannot lie, and a sale the merchant can attribute. Hemloop, built on WebMCP.

---

## What changed from v4

v4 opened on the gap and cut between two pages. v5 opens on the receipt, the first of seven steps
on the Hemloop page, stays on one page, adds the market scan (VO-04) and the restart (VO-07), and
names the handshake after the press ("one reply"). The closing count is twenty one tools and three
human buttons, both true at HEAD.
