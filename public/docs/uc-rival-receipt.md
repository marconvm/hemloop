# A receipt from a rival

Maya buys a crew tee from Harborview Basics, a store that has nothing to do with Northlight. She
pastes the order email into the closet.

`import_receipt` parses it locally: no OCR, no network, the pasted text is never echoed back or
sent anywhere. The purchase joins her log, the tee joins her wardrobe with its purchase date, and
her **buying pattern** for tees recomputes.

## What the pattern is, and what it is not

`buyingPattern()` derives three coarse facts per category from the purchase log:

| fact | values | what it means |
|---|---|---|
| discount sensitivity | `code` / `percent` / `none` | does she redeem codes, buy on percent-off, or buy at full price |
| spend band | `under-50` / `50-100` / `100-plus` | what she actually pays in this category |
| brand loyalty | `loyal` / `switcher` | does she stay with one brand or move |

That is all that ever travels, only at sharing level 3, and only the derived shape. The purchases
themselves, the rival's name, the prices she paid: none of it leaves her browser.

## What it does to the next offer

Her tee pattern now reads `switcher`. The next time she sends a tee request at level 3, the matcher
sees that and gives Northlight's **maximum permitted discount**, because winning her back from the
rival is worth more to Northlight than the margin on one sale. The proposal says so in its reasons:
*Offered a stronger discount to win you over from another brand.*

Northlight never learns which rival, or what she bought there. It learns that she switches, and it
decides what that is worth under its own locked rules. If that discount would break the margin floor,
the offer trims itself until it holds.

This is the loop compounding on the shopper's side: a purchase the merchant never saw still sharpens
the offer the merchant makes.
