# Demo Voiceover Script (for TTS generation)

Nine segments matching DEMO-SCRIPT.md beats. Generate each as a separate audio file so the edit can retime freely. Target voice: warm, confident, mid-pace (~150 wpm). Total spoken ≈ 2:20, leaving air for tool-call pauses.

Generation (media-use skill, once HeyGen CLI is authed):

```sh
for i in 01 02 03 04 05 06 07 08 09; do
  node ~/.claude/skills/media-use/scripts/resolve.mjs --type voice \
    --intent "$(sed -n "/^## VO-$i/,/^## /p" docs/VOICEOVER.md | tail -n +2 | sed '/^## /d')" \
    --project ~/projects/proofframe-webmcp/video
done
```

## VO-01 hook (0:00)

This is Hemloop. A shopper's agent is about to tell a store exactly what to sell them, without telling the store anything about them.

## VO-02 closet (0:12)

The wardrobe lives on the shopper's own page. Their agent reads it through WebMCP tools, no merchant ever sees this list. And it finds the gap: no hoodie.

## VO-03 approval gate (0:35)

Now watch. The agent tries to send that request, and the page refuses. Sharing needs a human. One click arms a single approval, the retry goes through, and the tool shows the entire payload it sent: a category, a size, a product. No name. No I-D. No wardrobe. And the approval? Already spent.

## VO-04 demand lands (1:00)

On the merchant side, that request just arrived, with exactly what the shopper agreed to share and nothing else. The merchant pulls the product in and locks the offer facts. Locking is a button. Deliberately not a tool.

## VO-05 co-editing (1:20)

Now the merchant's agent produces: nine typed tools on the same live state the human is editing. Two editors. One canvas. Every action on the record.

## VO-06 the block (1:45)

And here's the trust boundary. The agent tries fifty per cent off, rejected before anything changes, with a machine-readable reason: the locked offer is twenty-five. The agent fixes its own copy. The wrong frame never existed.

## VO-07 export (2:10)

Export refuses while any claim is wrong. What comes out is a deterministic motion composition, the disclaimer baked into every frame, as an element no tool can remove. The video is one output. The loop is the product.

## VO-08 close (2:35)

Shoppers keep their data. Merchants finally see what is missing. And everything produced in response is provably true. Hemloop, built on WebMCP.

## VO-09 spare / alt hook (unused buffer)

What if your agent could shop from your closet without ever uploading it?
