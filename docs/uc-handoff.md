# The handoff to a shopping agent

The merchant locked the offer. A human approved the personal offer for Maya's request. Now a
third-party shopping agent, one that has nothing to do with Hemloop, wants to act on it.

`get_offer` returns the locked offer as structured data: product, regular and sale price, promo
code, validity dates, disclaimer, sizes in stock, purchase link, and an **offer-completeness** meter
that says which of nine facts the merchant has locked. Called with a `requestId`, it returns the one
approved personal offer for that request instead.

![A proposal with its margin check, waiting for a human](img/studio-proposal-approve.jpg)

## Why completeness is the handoff

A shopping agent can only act on what is locked. Price alone lets it compare. Price plus sizes in
stock lets it pick. Price plus sizes plus a purchase link lets it hand the shopper a checkout. The
studio's completeness meter names, for each missing fact, exactly what locking it would unlock for
an agent, which is the merchant's version of the shopper's sharing dial: the more you lock, the more
an agent can do for you.

## What stays human

`get_offer` reads. It cannot lock a fact, change a price, or approve anything. The shopping agent
gets a truthful, structured offer and a link. Buying is still a press on the merchant's own store.
Hemloop is not in the transaction; it made the offer true and made it legible.

## The offer that reaches the agent cannot lie

Every rendered claim the merchant's agent wrote was validated against the locked facts before it
applied. "50% off" against a locked 25% was rejected before it existed. So the structured offer a
shopping agent reads and the creative a human sees say the same thing, because there is no way for
them not to.
