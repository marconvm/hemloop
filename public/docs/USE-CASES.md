# The loop, as a story

Personas are synthetic and the merchant, its prices and its offer are fictional; the brands and
photos in the shopper's wardrobe are real (see [PHOTO-CREDITS.md](./PHOTO-CREDITS.md)).

## The problem, in one page

A store wants to know what you need. The only machinery that currently answers that question works by
accumulating you: cookies, history, lookalikes, a profile that gets more valuable to the platform the
more of you it holds. It infers intent it could simply have been told, and it optimises for the
platform's objective rather than the merchant's. No ad system will decline to discount because the
discount would break your margin floor.

Meanwhile the shopper is sitting on the answer. She knows what she owns, what is worn out, what size
she takes and what she will not pay above. That context is far richer than anything a tracker
reconstructs, and it is exactly the context she will not hand over wholesale, correctly.

So both sides lose. The store guesses. The shopper gets offers for things she already owns.

Hemloop's bet is that the missing piece is not more data. It is a **channel narrow enough to be
safe**: one that carries a stated need instead of an inferred identity, and that lets each side keep
its own strategy private while still matching them against each other.

## Maya's loop

```
        SHOPPER (private, /closet)                    MERCHANT (locked, /studio)
        ──────────────────────────                    ──────────────────────────

   wardrobe · sizes · purchase dates                  cost price · margin floor
   preferences · buying pattern                       max discount · offer facts
              │                                                  │
              │ 1. find_gaps                                     │
              ▼                                                  │
     "no hoodie · size M"                                        │
     "sneakers due, 21 months"                                   │
              │                                                  │
              │ 2. report_demand_gap   ┌──────────────┐          │
              │    REFUSED ────────────│ HUMAN GATE   │          │
              │                        │ Approve next │          │
              │    one press ─────────▶│   request    │          │
              │                        └──────────────┘          │
              ▼                                                  ▼
        ┌───────────────────────────────────────────────────────────┐
        │  category · size · need-or-want · consent level            │
        │  NO name · NO account · NO hash · NO wardrobe rows         │
        └───────────────────────────────────────────────────────────┘
              │                                                  │
              │                              3. get_demand ──────┤
              │                                 grouped, scored  │
              │                                 against stock    │
              │                                                  │
              │                              4. propose_offer ───┤
              │                                 inside the       │
              │                                 margin floor     │
              │                                       │          │
              │                        ┌──────────────┐│         │
              │                        │ HUMAN GATE   ││         │
              │                        │   Approve    │◀┘        │
              │                        └──────────────┘          │
              │                                │                 │
              │  5. get_offers  ◀──────────────┘                 │
              ▼     addressed to the request id, never to a person│
        ┌──────────────┐                                         │
        │ HUMAN GATE   │                                         │
        │   Bought     │                                         │
        └──────────────┘                                         │
              │                                                  │
              │ 6. purchase records the OFFER ID that won it     │
              ▼                                                  ▼
      pattern sharpens locally                    demand picture sharpens
              │                                                  │
              └───────────────▶ next loop is better ◀────────────┘
                        and neither side learned who the other is
```

**One.** Maya's agent calls `find_gaps`. It returns three rows: she has no hoodie, only one jacket in
rotation, and the sneakers she bought in November 2024 are twenty-one months past a twelve-month
replacement life. The third row is the one no store could have guessed. It came from a purchase date
sitting in her own browser.

**Two.** The agent calls `report_demand_gap` and is refused: `human-approval-required`. Nothing has
left the page. Maya reads the payload preview, which shows exactly what would go, and presses
**Approve next request**. The retry succeeds and returns the precise payload sent. The agent tries
once more out of habit and is refused again, because one press releases one event.

**Three.** In Northlight's studio, the request arrives grouped with others by category and size, and
scored against the stock the merchant actually locked: **can offer**, **size out of stock**, or
**other category**. It carries no shopper identifier. What it does carry is a `replace` marker,
telling the merchant these people already own the thing and wore it out. That is timing their own
sales data cannot give them.

**Four.** The merchant's agent calls `propose_offer`. It cannot invent a price. It works inside cost
price, margin floor and maximum discount, all locked by a human, none readable or writable by any
tool. The proposal comes back at 25% off with its margin checked at 46.6% against a 35% floor, and
its reasons written out. A human presses **Approve**. Until that press, `get_offers` on Maya's page
returns nothing.

**Five.** Maya sees the offer, addressed to her request, not to her. Nothing on the page can buy for
her. She presses **Bought**.

**Six.** The purchase is written with the offer id attached. Northlight learns their offer worked.
They still do not know who she is.

## Run it three times

This is the part that makes it a loop rather than a transaction.

**Loop one.** Maya's pattern is thin, so the offer is generic: the merchant's standard 25%.

**Loop two.** Her purchase log now shows most category buys went through without a promo code.
`buyingPattern` marks her discount sensitivity `none`, and the matcher caps her discount at 15%.
She still buys. **The merchant kept ten points of margin they would have given away**, because the
shopper's own behaviour said the discount was not what closed her. An ad platform would have served
the bigger discount, because a conversion is a conversion.

**Loop three.** She buys a competing brand. Her pattern flips to `switcher`, and the next offer comes
in at the maximum the merchant permits, because winning her back is worth more to them than the
margin on one sale. That is not a bid. It is the merchant's own positioning deciding what she is
worth, executed automatically.

And if any of those moves would break the floor, the offer trims its own discount in five-point steps
until the margin holds, and says so.

**What accumulated:** on her side, a sharper local picture of how she actually shops. On theirs, a
sharper picture of what they cannot fill. **What did not accumulate: any profile of Maya anywhere.**
That is the inversion. Ad platforms compound by knowing more about the person. This compounds by both
sides getting better at their own half.

## Right time, not just right product

Maya's closet knows she owns sneakers, so they are not a gap. It also knows she bought them in
November 2024. Twenty-one months on, `find_gaps` returns footwear with a `due` block: the date, the
months elapsed, and size 10. Her agent reports it with kind `replace`, and the merchant sees demand
from someone who already owns the thing and wore it out. Nothing about where she bought them or what
she paid ever travels, and the replacement intervals are one table in the code a merchant with real
wear data should tune.

## What the merchant cannot fill

Northlight's panel groups the incoming requests. Hoodie L, four requests, three of them replacing one
they own, **can offer**. Hoodie XXL, six requests, **size out of stock**, with the reason on hover:
restock it, or add the size to the offer facts before locking. Footwear 10, one request, **other
category**: import a product in that category to answer it.

The verdict runs the same two checks the matcher itself refuses on, so the panel can never promise an
offer that `propose_offer` would then decline. The merchant's agent reads the same rows with
`get_demand` and takes the request ids straight from them. This is restock and assortment
intelligence drawn from stated intent rather than from a forecast.

## Other shapes the same loop takes

- **Shopping for someone else.** The profile switch scopes the wardrobe and every closet tool to Me,
  Partner or Kid, so a gift request carries the right size without revealing whose it is.
- **A receipt from a rival.** `import_receipt` parses a pasted order email locally, with no OCR and no
  network. The purchase joins her log and sharpens her pattern even though the merchant who sees the
  next request never made that sale.
- **The handoff to a shopping agent.** `get_offer` returns the locked offer as structured data,
  including sizes in stock, purchase link and an offer-completeness meter, so a third-party agent can
  act on it without Hemloop being in the transaction.
