# Shopping for someone else

Maya buys for herself, for her partner, and for her kid. Three wardrobes, three size charts, and a
gift is a different request from a replacement.

The **Shopping for** switch on the closet scopes the wardrobe and every closet tool to **Me**,
**Partner** or **Kid**. `find_gaps` on the kid's profile finds the kid's gaps; `get_my_sizes` returns
the kid's sizes; a request sent from that profile carries the right size.

![The wardrobe with real brands, scoped to one profile](img/closet-real-brands.jpg)

## What travels at each sharing level

At level 1 the request carries category, size, and need or want. **Whose** wardrobe it came from
does not travel.

At level 2 Context, the request can carry `for: partner` or `for: kid`, and an `occasion`: gift,
event, season, everyday. That is the shopper choosing to say "this is a gift for my partner", so the
merchant can time and cut the offer for it. A gift request shortens the offer's validity window to a
week, because a gift has a date.

The payload preview shows exactly which of those fields would leave before Maya presses Approve.
Nothing about the profile itself, its rows, or its purchase history goes anywhere.

## Why this matters for the merchant

A gift buyer and a replacement buyer want different things from the same product page. One needs
the offer to land before a date; the other needs the right size in stock. Knowing which, without
knowing who, is enough to shape the offer, and it is all the merchant gets.
