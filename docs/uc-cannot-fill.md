# What the merchant cannot fill

Demand that arrives as clicks does not carry a size. Demand that arrives as a stated request does.

The Demand panel groups incoming requests by category and size, and scores each group against the
**per-merchant locked stock**:

- **can offer** — category and size are in stock.
- **size out of stock** — category matches, that size is qty 0.
- **other category** — import a product in that category to answer it.

Five sample merchants sit in the market scan. One request in; a verdict table out; one store answers.
No merchant's cost or floor is shown to another merchant or to the shopper.

![Demand grouped and scored against locked stock: XXL size out of stock](img/studio-cannot-fill.jpg)

<div class="flow-diagram" role="img" aria-label="Market scan: one request in, five verdicts, one store answers">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" font-family="DM Sans, system-ui, sans-serif">
  <rect width="640" height="280" fill="#f4f0e6" rx="12"/>
  <rect x="20" y="100" width="100" height="56" rx="10" fill="#b9f227"/>
  <text x="70" y="124" text-anchor="middle" fill="#17211c" font-size="12" font-weight="800">Request</text>
  <text x="70" y="142" text-anchor="middle" fill="#17211c" font-size="10">hoodie · M</text>
  <path d="M120 128 H160" stroke="#183e30" stroke-width="2.5"/>
  <rect x="160" y="40" width="300" height="200" rx="14" fill="#fff" stroke="rgba(23,33,28,0.13)"/>
  <text x="310" y="68" text-anchor="middle" fill="#183e30" font-size="13" font-weight="800">Market scan</text>
  <text x="200" y="100" fill="#17211c" font-size="12">Northlight</text>
  <text x="400" y="100" fill="#346b45" font-size="12" font-weight="700">can offer</text>
  <text x="200" y="124" fill="#17211c" font-size="12">Harborview</text>
  <text x="400" y="124" fill="#346b45" font-size="12" font-weight="700">can offer</text>
  <text x="200" y="148" fill="#17211c" font-size="12">Ridgeline</text>
  <text x="400" y="148" fill="#ee6f4d" font-size="12" font-weight="700">size out</text>
  <text x="200" y="172" fill="#17211c" font-size="12">Denim Supply</text>
  <text x="400" y="172" fill="#687169" font-size="12" font-weight="700">other category</text>
  <text x="200" y="196" fill="#17211c" font-size="12">Overland</text>
  <text x="400" y="196" fill="#346b45" font-size="12" font-weight="700">can offer</text>
  <text x="310" y="224" text-anchor="middle" fill="#687169" font-size="10">same predicates as propose_offer</text>
  <path d="M460 128 H500" stroke="#183e30" stroke-width="2.5"/>
  <rect x="500" y="100" width="120" height="56" rx="10" fill="#17211c"/>
  <text x="560" y="124" text-anchor="middle" fill="#b9f227" font-size="12" font-weight="800">One store</text>
  <text x="560" y="142" text-anchor="middle" fill="#fff" font-size="10">answers</text>
</svg>
</div>

## Why the verdict can be trusted

The verdict runs the **same two checks the matcher refuses on** (category, then size). The panel
cannot promise an offer that `propose_offer` would decline. The merchant's agent reads the same rows
with `get_demand`.
