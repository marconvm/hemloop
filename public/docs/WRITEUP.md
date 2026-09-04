# Hemloop, Devpost submission text

## The one-line version

Two strategies negotiate through an agent: the shopper's buying behaviour against the merchant's
commercial rules, with a human gate on each side, and neither side ever learns who the other is.

## Inspiration

I run e-commerce and paid media for apparel retail, so I have spent years on the ad-platform side of
this problem. That machinery works one way: accumulate identity, infer intent from surveillance,
match the inferred intent to a creative, optimise for the conversion. It gets better by knowing more
about the person.

Two things about it never sat right. It guesses at intent that the shopper could simply have stated.
And it optimises for the platform's objective, not the merchant's: no ad system will decline to
discount because the discount would break your margin floor.

Meanwhile the other half of my job, promotional creative, is where agents are simultaneously most
useful and most dangerous. A wrong percentage in a promo is not a bad impression, it is a legal
problem.

WebMCP made a different shape possible. The shopper's agent can reason over rich, page-local context
that never leaves the page, while the merchant-facing action gets a deliberately tiny schema and a
human-only release. If a store does not need an identity to answer "no hoodie, size M", then do not
send one, not even a hash.

(The name: a hem loop is the small functional loop sewn inside a garment. Hidden, structural,
load-bearing. So is this one.)

## What it does

Two web pages register **21 WebMCP tools**, nine on the shopper's closet and twelve on the merchant's
studio.

The shopper's agent reads a private wardrobe: what she owns, what is missing, what is thin, and, from
purchase dates, what is **worn out**. It can send a store exactly one thing, and only after she
presses Approve: a category, a size, need or want. No name, no account, no hash, no wardrobe rows.
One press releases one event, and the approval is consumed.

The merchant's agent reads that demand grouped and scored against the stock the merchant actually
locked, proposes a personal offer **inside locked commercial rules**, and a human approves before the
shopper ever sees it. She answers Bought or Passed. Bought records the purchase with the id of the
offer that won it.

Every rendered claim the merchant's agent writes is validated against human-locked facts first. "50%
off" against a locked 25% is rejected atomically, with a machine-readable reason the agent corrects
itself from. The export refuses to exist while any claim is wrong, and the disclaimer is baked into
every frame as an element no tool can remove.

## Why this is not ad-tech, which is the whole point

This is the distinction I care most about, because on the surface it looks like the same loop.

| Ad platforms | Hemloop |
|---|---|
| Infer intent from surveillance, history, lookalikes | The shopper's agent **states** intent, once, deliberately |
| Target a person or a cohort | Answer a **request id**. There is no person to target |
| Personalise **which creative** to serve | Personalise **what the offer is**: discount depth, price, validity window |
| The merchant's strategy is a bid | The merchant's strategy is **locked rules**: cost price, margin floor, maximum discount |
| Optimise for the conversion | Optimise **inside the margin floor**, and decline rather than break it |
| Compound by accumulating identity | Compound by accumulating **matched outcomes**, while identity never accumulates |

Concretely, `matchOffer` is behaviour-strategy against commercial-strategy, not signal against ad:

- A shopper whose history shows she buys **without needing a code** gets a *smaller* discount, capped
  at 15%. Spending margin on someone who would have bought anyway is waste.
- A shopper who is a **brand switcher** gets the strongest discount the merchant permits, because
  winning her back is worth more to them than the margin on one sale.
- If either move would break the merchant's floor, the offer **trims its own discount** in 5-point
  steps until the margin holds, and says so in its reasons.

No ad platform performs that third move. It is the merchant's own strategy constraining the
personalisation, rather than an auction optimising past it.

And the behaviour that drives it never leaves the page as raw data. `buyingPattern()` derives a
coarse, category-scoped shape from the purchase log, discount sensitivity, spend band, brand loyalty,
and only that derived shape travels, only at the shopper's highest sharing level. The purchases
themselves stay in her browser.

## The loop compounds, and that is the moat

Every completed loop makes both sides sharper, and neither side gains an identity:

1. **Bought** writes a purchase carrying the offer id that won it.
2. That purchase joins the local log, so `buyingPattern` for that category sharpens: is she actually
   code-driven, what does she really spend, is she loyal or switching.
3. A sharper pattern shapes a better next offer: the right discount depth, the right validity window,
   without the merchant learning anything new about her.
4. On the merchant's side, each request sharpens `get_demand`: which category and size combinations
   they persistently **cannot fill**. That is restock and assortment intelligence drawn from real
   stated intent, not from a forecast.
5. Run it long enough and the shopper's agent negotiates well on her behalf while the merchant's
   rules stay in force. Both sides get better. **Neither side accumulated a profile of the other.**

The rail across the top of both pages shows one request's position in that loop: Gap, Approved
request, Matched offer, Bought, Learned.

## What people and agents can now do together that was hard before

- A shopper's agent can tell a store what she needs **without the store learning who asked**, and the
  store can answer that specific person's need anyway. Previously the store either knew nothing, or
  knew everything.
- A merchant can let an agent set an actual **price** rather than pick a creative, because the
  agent's freedom is bounded by rules the merchant locked and no tool can touch.
- A merchant's agent can write promotional copy that is **checked against locked facts before it
  applies**, so the wrong claim never exists rather than being caught in review.
- A shopper can see, before approving, the exact payload that would leave her page, and can watch the
  same tool be refused before and after her single approval.

## Why WebMCP fits, specifically

Both surfaces need tools that operate on **live page state in the user's own session**: the wardrobe
on her page, the composition on his. WebMCP registers typed tools in the page itself, so there is no
backend, no OAuth, no credential grant, and the human watches every agent action land in the UI they
are already looking at.

It also lets the trust boundaries be **structural rather than conventional**. The closet's only
outbound tool physically cannot include wardrobe rows or an identifier: it can emit one shape. The
studio has no tool that can touch locked facts, and there is deliberately **no `lock_facts`, no
`unlock_facts`, no `approve_share`, no `set_sharing_level` and no `approve_offer`**. That absence is
the product. An agent cannot do those things because the tools do not exist, not because it was asked
nicely.

## How we implemented WebMCP

Registration targets `document.modelContext`, probing `navigator.modelContext` first for older
drafts. Each tool is `{ name, description, inputSchema, annotations?, execute }`, schemas closed with
`additionalProperties: false`, `readOnlyHint` on every reader and `untrustedContentHint` wherever
user or catalog text flows through.

The core is pure and framework-free: claim validator, composition exporter, wardrobe and fit logic,
receipt parser, replacement-lifecycle scan, offer matcher, demand insight, and two WebMCP adapters,
with **136 unit tests** including adversarial tool-boundary replays: extra-property XSS, malformed
input, unicode claim evasion, output-budget floods, and fence-marker smuggling. React surfaces own
all state and pass callbacks in, which is why the whole tool surface is testable without a browser.

One test loops **every** tool on both surfaces and asserts the contract Chrome's secure-tools guidance
sets: name charset and length, description under 500 characters, closed schemas, and `readOnlyHint`
exactly on the readers. Results are bounded to the ~1.5K output budget by measuring the serialised
size as rows are added, not by trusting a fixed row count.

The two surfaces are routes of one origin, so the demo bridge runs over `localStorage` and storage
events with no dependency on multi-tab agent behaviour. Storage is treated as a client-integrity
boundary, not an authenticated one: everything read back is re-parsed into an exact shape, and a
stored record can never claim more consent fields than its level grants.

## Challenges

The hardest one was resisting my own instinct. Every time a feature got hard, the ad-platform answer
was right there: just send an identifier, just let the agent optimise freely, just cache the shopper.
Each of those would have made the build easier and the point disappear.

The second was that a defensive re-parse is worthless if it is weaker than the parse it backs up. An
independent review found ours was, and that a tool result could blow its output budget on ordinary
data long before any attacker showed up.

## What's next

Aggregation before disclosure, so a demand cell only becomes visible once enough distinct shoppers
have contributed to it. Consent receipts a shopper can export. Per-merchant sharing levels. And
writing the outcome back into the merchant's own reporting, rather than only displaying it.

## Built with

TypeScript, React 19, Vite, Cloudflare Workers, WebMCP, and a Shopify catalog snapshot as the demo's
E-commerce connector.
