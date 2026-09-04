# The handoff to a shopping agent

The merchant locked the offer. A human approved the personal offer for Maya's request. A third-party
shopping agent — outside Hemloop — wants to act on it.

`get_offer` returns the locked offer as structured data: product, prices, promo code, dates,
disclaimer, sizes in stock, purchase link, and an **offer-completeness** meter. Pass `requestId` to
read one approved personal offer instead.

![A proposal with its margin check, waiting for a human](img/studio-proposal-approve.jpg)

<div class="flow-diagram" role="img" aria-label="Locked facts and completeness unlock what a shopping agent can do">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" font-family="DM Sans, system-ui, sans-serif">
  <rect width="640" height="180" fill="#f4f0e6" rx="12"/>
  <rect x="20" y="36" width="120" height="56" rx="10" fill="#fff" stroke="#ee6f4d" stroke-width="2"/>
  <text x="80" y="60" text-anchor="middle" fill="#ee6f4d" font-size="11" font-weight="800">Human lock</text>
  <text x="80" y="78" text-anchor="middle" fill="#17211c" font-size="10">offer facts</text>
  <path d="M140 64 H180" stroke="#183e30" stroke-width="2"/>
  <rect x="180" y="36" width="120" height="56" rx="10" fill="#fff" stroke="rgba(23,33,28,0.13)"/>
  <text x="240" y="60" text-anchor="middle" fill="#17211c" font-size="12" font-weight="800">get_offer</text>
  <text x="240" y="78" text-anchor="middle" fill="#687169" font-size="10">structured JSON</text>
  <path d="M300 64 H340" stroke="#183e30" stroke-width="2"/>
  <rect x="340" y="36" width="140" height="56" rx="10" fill="#b9f227"/>
  <text x="410" y="60" text-anchor="middle" fill="#17211c" font-size="12" font-weight="800">Shopping agent</text>
  <text x="410" y="78" text-anchor="middle" fill="#17211c" font-size="10">compare · pick · link</text>
  <path d="M480 64 H520" stroke="#183e30" stroke-width="2"/>
  <rect x="520" y="36" width="100" height="56" rx="10" fill="#17211c"/>
  <text x="570" y="60" text-anchor="middle" fill="#b9f227" font-size="11" font-weight="800">Checkout</text>
  <text x="570" y="78" text-anchor="middle" fill="#fff" font-size="10">merchant site</text>
  <text x="20" y="120" fill="#687169" font-size="11">Completeness names what each missing fact unlocks. get_offer cannot lock, change price, or approve.</text>
  <text x="20" y="142" fill="#687169" font-size="11">Claims were claim-checked before they existed — the structured offer and the creative cannot disagree.</text>
</svg>
</div>

## What stays human

Buying is still a press on the merchant's own store. Hemloop made the offer true and legible; it is
not in the transaction.
