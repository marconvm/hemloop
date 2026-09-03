# Right time, not just right product

Maya's closet knows she owns sneakers, so they are not a gap. It also knows she bought them in
November 2024.

Twenty-one months on, `find_gaps` returns footwear with a `due` block: the date, the months elapsed,
and size 10. Her agent reports it with kind `replace`, and the merchant sees demand from someone who
**already owns the thing and wore it out**. That is timing their own sales data cannot give them,
because their sales data ends at the sale.

![The closet: three gap rows, one of them a lifecycle gap](img/closet-real-brands.jpg)

## What travels, and what does not

The due row carries the date, the months elapsed and the size to buy again. It does not carry where
she bought them, what she paid, or the brand. The purchase row stays in her browser; only the fact
that a replacement is due leaves, and only after she presses Approve.

## What the merchant does with it

The request arrives with a `replace` marker. In the studio's demand panel that shows as "replacing
one they own", and the merchant's agent sees the same flag in `get_demand`. A replacement buyer is a
different customer from a first-time buyer: she has a size, she has a brand history, and she is
buying now rather than browsing. The offer can be timed for that.

## Tuning it

The replacement intervals are one table in the code, `REPLACEMENT_MONTHS`: footwear 12, tee 18,
denim 24, hoodie 30, accessory 36, jacket 48. A merchant with real wear data should tune them. The
lifecycle logic does not change when they do.

The date comes from the garment's own purchase date, which the receipt importer and the Bought
button fill in from the purchase log. A garment with no date is never called worn out.
