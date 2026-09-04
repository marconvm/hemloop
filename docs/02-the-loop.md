# The loop, and what each side gets out of it

Hemloop's claim is not two dashboards. It is that **one request has a complete lifecycle**, and that
every time it completes, both sides come out sharper without either side accumulating a profile of
the other. The home page is the **Loop Room** (`/`): seven stations in one shared space. The full
shopper and merchant surfaces live at `/closet` and `/studio`.

## One request, end to end

```
        SHOPPER (private)                                 MERCHANT (locked)
        ─────────────────                                 ────────────────

   0. New item — a purchase lands in the closet
      (import_receipt, or Bought)                          cost price · margin floor
   wardrobe · sizes · purchase dates                       max discount · offer facts
   preferences · buying pattern                                      │
              │                                                      │
              │ 1. Local demand — find_gaps                          │
              ▼                                                      │
     "no hoodie · size M"                                            │
     "sneakers due, 21 months"                                       │
              │                                                      │
              │ 2. Approved request                                  │
              │    report_demand_gap  ┌──────────────┐               │
              │    REFUSED ───────────│ HUMAN GATE   │               │
              │                       │ Approve next │               │
              │    one press ────────▶│   request    │               │
              │    then "Yes, send it"└──────────────┘               │
              ▼                                                      ▼
        ┌───────────────────────────────────────────────────────────────┐
        │  category · size · need-or-want · consent level                │
        │  NO name · NO account · NO hash · NO wardrobe rows             │
        └───────────────────────────────────────────────────────────────┘
              │                                                      │
              │                              3. Matched offer ───────┤
              │                                 get_demand           │
              │                                 propose_offer        │
              │                        ┌──────────────┐│             │
              │                        │ HUMAN GATE   ││             │
              │                        │ Approve offer│◀┘            │
              │                        └──────────────┘              │
              │  4. Bought — get_offers ◀────────────┘               │
              ▼                                                      │
        ┌──────────────┐                                             │
        │ HUMAN GATE   │                                             │
        │   Bought     │                                             │
        └──────────────┘                                             │
              │ 5. Learned — purchase records the OFFER ID           │
              ▼                                                      ▼
      pattern sharpens locally                      demand picture sharpens
              │                                                      │
              │ 6. Again — a rival receipt, cycle N+1                │
              └───────────────▶ next loop is better ◀────────────────┘
                        and neither side learned who the other is
```

The rail across the Loop Room (and under the header on `/closet` and `/studio`) shows where one
request is: **New item · Local demand · Approved request · Matched offer · Bought · Learned ·
Again**.

![The shopper's closet with the rail under the header](img/closet-real-brands.jpg)

## What the customer gets

- The right item, in her size, at a price shaped by how she actually shops, without handing over
  her wardrobe, her history, or her name.
- A visible packet, before anything leaves, showing exactly what would go.
- An offer she can act on or ignore. Nothing on the page can buy for her.
- Over time, an agent that negotiates better on her behalf, because her own purchase log sharpens
  the pattern it reasons from.

## What the merchant gets

- Stated intent, grouped by category and size, scored against the stock they actually locked.
  Intent their own sales data cannot show them: someone who owns the thing already and wore it out.
- An offer their agent built **inside** their rules, not around them. The margin floor is enforced
  in code, and the proposal says which rules shaped it.
- An attributable sale: the purchase carries the id of the offer that won it.
- Restock and assortment intelligence: which category and size combinations they persistently
  cannot fill.

![The merchant's proposal, with its margin check, waiting for a human to approve](img/studio-proposal-approve.jpg)

## Only the right store answers

A request is scored against every merchant's locked rules at once. The market scan returns a
verdict per store: `can-offer`, `size-not-in-stock`, `category-mismatch`, `margin-floor`, or
`over-ceiling`. Only a `can-offer` merchant may propose. The Loop Room shows the whole market so
the point is visible; the studio is one merchant's desk with a switcher for which store you are.

Five sample merchants make the refusals concrete on a hoodie · M request. At Basics (no price
ceiling) Northlight and Overland can answer; Harborview cannot clear its margin floor, Ridgeline
is out of M, Denim Supply is the wrong category. At Taste, with the shopper's ceiling of 60,
only Northlight remains — Overland's capped price sits above the ceiling and its rule cannot go
deeper. The sharing dial changes who can answer. Market rows carry verdict and price only; no
merchant ever sees another's cost or floor.

## Run it three times: the compounding

**Loop one.** Maya's pattern is thin, so the offer is generic: the merchant's standard 25%.

**Loop two.** Her purchase log now shows most category buys went through without a promo code. Her
discount sensitivity reads `none`, and the matcher caps her discount at 15%. She still buys. **The
merchant kept ten points of margin they would have given away**, because the shopper's own behaviour
said the discount was not what closed her. An ad platform would have served the bigger discount,
because a conversion is a conversion.

**Loop three.** She buys a competing brand. Her pattern flips to `switcher`, and the next offer comes
in at the maximum the merchant permits, because winning her back is worth more than the margin on one
sale. That is not a bid. It is the merchant's own positioning deciding what she is worth, executed
automatically.

If any of those moves would break the floor, the offer trims its own discount in five-point steps
until the margin holds, and says so.

**What accumulated:** on her side, a sharper local picture of how she actually shops. On theirs, a
sharper picture of what they cannot fill. **What did not accumulate: any profile of Maya anywhere.**

Ad platforms compound by knowing more about the person. This compounds by both sides getting better
at their own half.
