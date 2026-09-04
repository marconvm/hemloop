# What is Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an
offer that cannot lie about the price, priced inside rules a human locked.

Hemloop is an E-commerce loop between a shopper's private closet and a merchant's studio, built on
WebMCP. Two web pages register **21 typed tools** in the browser itself. An agent can reason over a
wardrobe, send a store one approved request with no identity attached, and on the other side
propose an offer that a matcher keeps inside the merchant's margin. A human gate sits on each side,
and neither side ever learns who the other is.

![The loop closed on the merchant side: every station lit, the request marked bought](img/studio-loop-closed.jpg)

## This is not ads-match, and the difference is the point

On the surface it looks like the same loop: a signal arrives, something gets matched, an offer goes
out. It is the opposite shape.

| Ad platforms | Hemloop |
|---|---|
| Infer intent from surveillance, history, lookalikes | The shopper's agent **states** intent, once, deliberately |
| Target a person or a cohort | Answer a **request id**. There is no person to target |
| Personalise **which creative** to serve | Personalise **what the offer is**: discount depth, price, validity window |
| The merchant's strategy is a bid | The merchant's strategy is **locked rules**: cost price, margin floor, maximum discount |
| Optimise for the conversion | Optimise **inside the margin floor**, and decline rather than break it |
| Compound by accumulating identity | Compound by accumulating **matched outcomes**, while identity never accumulates |

The matcher is one side's buying behaviour against the other side's commercial strategy:

- A shopper whose history shows she buys **without needing a code** gets a *smaller* discount,
  capped at 15%. Spending margin on someone who would have bought anyway is waste.
- A shopper who is a **brand switcher** gets the strongest discount the merchant permits, because
  winning her back is worth more than the margin on one sale.
- If either move would break the merchant's **margin floor**, the offer trims its own discount in
  five-point steps until the margin holds, and says so in its reasons.

No ad platform performs that third move. It is the merchant's own strategy constraining the
personalisation, rather than an auction optimising past it.

## The name

A hem loop is the small functional loop sewn inside a garment. Hidden, structural, load-bearing.
So is this one.

## What is real and what is fictional

The merchant, Northlight Apparel, is fictional, and so are its catalog, prices and promo code. The
studio is the surface that makes promotional claims, so no real brand's name is attached to a
synthetic claim anywhere in this project.

The shopper's wardrobe and purchase history carry real brands and real product photography from the
author's own Shopify catalogs, used with permission. The shopper herself, her sizes and her history
are seeded and fictional.
