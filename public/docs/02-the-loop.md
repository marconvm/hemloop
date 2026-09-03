# The loop, and what each side gets out of it

Hemloop's claim is not two dashboards. It is that **one request has a complete lifecycle**, and that
every time it completes, both sides come out sharper without either side accumulating a profile of
the other.

## One request, end to end

```
        SHOPPER (private, /closet)                    MERCHANT (locked, /studio)
        ──────────────────────────                    ──────────────────────────

   0. a purchase lands in the closet
      (import_receipt, or Bought)                      cost price · margin floor
   wardrobe · sizes · purchase dates                   max discount · offer facts
   preferences · buying pattern                                  │
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
              │                              4. propose_offer ───┤
              │                                 inside the       │
              │                                 margin floor     │
              │                        ┌──────────────┐│         │
              │                        │ HUMAN GATE   ││         │
              │                        │   Approve    │◀┘        │
              │                        └──────────────┘          │
              │  5. get_offers  ◀──────────────┘                 │
              ▼     addressed to the request id, never to a person│
        ┌──────────────┐                                         │
        │ HUMAN GATE   │                                         │
        │   Bought     │                                         │
        └──────────────┘                                         │
              │ 6. purchase records the OFFER ID that won it     │
              ▼                                                  ▼
      pattern sharpens locally                    demand picture sharpens
              │                                                  │
              └───────────────▶ next loop is better ◀────────────┘
                        and neither side learned who the other is
```

The rail across the top of both surfaces shows exactly where one request is: **Gap · Approved
request · Matched offer · Bought · Learned**.

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
