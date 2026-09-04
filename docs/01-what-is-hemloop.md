# What is Hemloop

Your AI tells a store what you need, without telling it who you are. The store answers with an
offer priced inside rules a human locked, and every promotional claim is checked before it can
exist. Neither side accumulates a profile of the other.

Hemloop is an E-commerce loop between a shopper's private closet and a merchant's studio, built on
WebMCP. Two web pages register **21 typed tools** in the browser itself. An agent can reason over a
wardrobe, send a store one approved request with no identity attached, and on the other side
propose an offer that a matcher keeps inside the merchant's margin. Human gates sit on each side.

![The loop closed: six stations done, Bought and Learned lit, ready for the next cycle](img/studio-loop-closed.jpg)

## The product, as it stands

| Surface | Route | What it is |
|---|---|---|
| **Hemloop** | `/` | Both sides of one request in one shared space. Seven stations on the rail. All **21** WebMCP tools register here. Three coral human gates: Approve next request, Approve offer, Bought. |
| **Closet** | `/closet` | Full shopper surface (Wardrobe · Requests and offers). Nine tools. Wardrobe rows never leave the page. |
| **Studio** | `/studio` | Full merchant surface (Demand · Offer and rules · Composition). Twelve tools. Lock facts and approve proposals are human-only. |
| **Docs** | `/docs/` | This site. |

`/merchant` redirects to `/studio?tab=demand`.

## This is not ads-match

| Ad platforms | Hemloop |
|---|---|
| Infer intent from surveillance | The shopper's agent **states** intent, once, deliberately |
| Target a person or a cohort | Answer a **request id**. There is no person to target |
| Personalise which creative to serve | Personalise **what the offer is**: discount, price, validity |
| The merchant's strategy is a bid | The merchant's strategy is **locked rules** (cost, floor, max discount) |
| Optimise for the conversion | Optimise **inside the margin floor**, and decline rather than break it |
| Compound by accumulating identity | Compound by matched outcomes; identity never accumulates |

## The name

A hem loop is the small functional loop sewn inside a garment. Hidden, structural, load-bearing.
So is this one.

## What is real and what is fictional

The merchant, Northlight Apparel (and four peers in the market scan), is fictional, and so are its
catalog, prices and promo code. The studio is the surface that makes promotional claims, so no real
brand's name is attached to a synthetic claim.

The shopper's wardrobe and purchase history carry real brands and real product photography from retail
catalogs, used with permission. Kid wardrobe stills are flat-lay product
photos with no faces. The shopper herself, her sizes and her history are seeded and fictional.
