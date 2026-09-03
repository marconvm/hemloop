# What the merchant cannot fill

Demand that arrives as clicks does not carry a size. Demand that arrives as a stated request does.

Northlight's panel groups the incoming requests by category and size, and scores each group against
the stock the merchant actually locked:

- **Hoodie L**, four requests, three of them replacing one they own: **can offer**.
- **Hoodie XXL**, six requests: **size out of stock**. Restock it, or add the size to the offer facts
  before locking.
- **Footwear 10**, one request: **other category**. Import a product in that category to answer it.

![Demand grouped and scored against locked stock](img/studio-demand-insight.jpg)

## Why the verdict can be trusted

The verdict runs the **same two checks the matcher itself refuses on**, category first, then size.
So the panel can never promise an offer that `propose_offer` would then decline, and the merchant's
agent reads the same rows with `get_demand` and takes the request ids straight from them.

## What this is, commercially

Restock and assortment intelligence drawn from stated intent rather than from a forecast. Six people
asking for a size the merchant does not carry is not a lost sale in a report three months later. It
is a row on the screen today, with a count, and with no shopper identifier anywhere in it.

Over time the same panel shows which category and size combinations the merchant **persistently**
cannot fill. That is the merchant's half of the loop compounding: every request sharpens the picture
of what they should stock, and none of it required knowing who asked.
