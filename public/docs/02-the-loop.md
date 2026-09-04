# The loop, and what each side gets

Hemloop's claim is not two dashboards. It is that **one request has a complete lifecycle**, and that
every time it completes, both sides come out sharper without either side accumulating a profile of
the other. The home page is **Hemloop** (`/`): seven stations in one shared space. The full shopper
and merchant surfaces live at `/closet` and `/studio`.

## Seven stations

| Station | What happens |
|---|---|
| **New item** | A purchase lands in the closet (`import_receipt`, or Bought). |
| **Local demand** | `find_gaps` — missing categories and worn-out items from purchase dates. |
| **Approved request** | `report_demand_gap` is refused until a human presses **Approve next request**, then the shopper replies **Yes, send it**. One press → one event. |
| **Matched offer** | Merchant `get_demand` + `propose_offer` inside locked rules; human presses **Approve offer**. |
| **Bought** | Shopper `get_offers`; human presses **Bought**. |
| **Learned** | Purchase records the offer id; local pattern sharpens. |
| **Again** | A rival receipt (or another new item) starts the next cycle. |

<div class="flow-diagram" role="img" aria-label="End-to-end loop with two human gates marked in coral">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" font-family="DM Sans, system-ui, sans-serif">
  <rect width="640" height="320" fill="#f4f0e6" rx="12"/>
  <text x="24" y="28" fill="#687169" font-size="11" font-weight="700" letter-spacing="0.08em">SHOPPER · CLOSET</text>
  <text x="360" y="28" fill="#687169" font-size="11" font-weight="700" letter-spacing="0.08em">MERCHANT · STUDIO</text>
  <!-- shopper column -->
  <rect x="24" y="44" width="200" height="36" rx="10" fill="#fff" stroke="rgba(23,33,28,0.13)"/>
  <text x="124" y="66" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">New item → Local demand</text>
  <path d="M124 80 v14" stroke="#346b45" stroke-width="2"/>
  <rect x="24" y="94" width="200" height="44" rx="10" fill="#fff" stroke="#ee6f4d" stroke-width="2.5"/>
  <text x="124" y="112" text-anchor="middle" fill="#ee6f4d" font-size="11" font-weight="800">HUMAN GATE</text>
  <text x="124" y="128" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">Approve next request</text>
  <text x="124" y="152" text-anchor="middle" fill="#687169" font-size="11">then “Yes, send it”</text>
  <path d="M124 158 v16" stroke="#346b45" stroke-width="2"/>
  <rect x="24" y="174" width="200" height="36" rx="10" fill="#b9f227" stroke="rgba(23,33,28,0.13)"/>
  <text x="124" y="196" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">Request on the bridge</text>
  <!-- bridge -->
  <path d="M224 192 H360" stroke="#183e30" stroke-width="2.5" stroke-dasharray="5 4"/>
  <text x="292" y="184" text-anchor="middle" fill="#687169" font-size="10">no shopper id</text>
  <!-- merchant -->
  <rect x="360" y="44" width="256" height="36" rx="10" fill="#fff" stroke="rgba(23,33,28,0.13)"/>
  <text x="488" y="66" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">Locked stock · margin floor</text>
  <path d="M488 80 v14" stroke="#346b45" stroke-width="2"/>
  <rect x="360" y="94" width="256" height="36" rx="10" fill="#fff" stroke="rgba(23,33,28,0.13)"/>
  <text x="488" y="116" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">get_demand → propose_offer</text>
  <path d="M488 130 v14" stroke="#346b45" stroke-width="2"/>
  <rect x="360" y="144" width="256" height="44" rx="10" fill="#fff" stroke="#ee6f4d" stroke-width="2.5"/>
  <text x="488" y="162" text-anchor="middle" fill="#ee6f4d" font-size="11" font-weight="800">HUMAN GATE</text>
  <text x="488" y="178" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">Approve offer</text>
  <path d="M360 192 H224" stroke="#183e30" stroke-width="2.5"/>
  <!-- bought -->
  <path d="M124 210 v16" stroke="#346b45" stroke-width="2"/>
  <rect x="24" y="226" width="200" height="44" rx="10" fill="#fff" stroke="#ee6f4d" stroke-width="2.5"/>
  <text x="124" y="244" text-anchor="middle" fill="#ee6f4d" font-size="11" font-weight="800">HUMAN GATE</text>
  <text x="124" y="260" text-anchor="middle" fill="#17211c" font-size="12" font-weight="700">Bought</text>
  <text x="24" y="300" fill="#687169" font-size="11">Coral outline = human-only. No WebMCP tool can press a gate.</text>
</svg>
</div>

![The shopper's closet with real wardrobe brands](img/closet-real-brands.jpg)

## The “Yes, send it” handshake

1. The agent calls `report_demand_gap` and is refused: `human-approval-required`. Nothing has left.
2. The shopper reads the **next-request preview** (exact fields that would travel at the current
   sharing level) and presses **Approve next request**.
3. The shopper replies **Yes, send it** in the chat. The retry succeeds once.
4. A third send is refused again — one press releases one event.

## What the customer gets

- The right item, in her size, at a price shaped by how she shops, without handing over wardrobe,
  history, or a name.
- A visible packet before anything leaves.
- An offer she can act on or ignore. Nothing on the page can buy for her.

## What the merchant gets

- Stated intent, grouped by category and size, scored against **per-merchant locked stock**.
- An offer built **inside** locked rules (cost, margin floor, max discount).
- An attributable sale: the purchase carries the offer id.
- Restock intelligence: which category · size combinations they cannot fill.

## Five merchants and the market scan

Hemloop ships five sample merchants (Northlight, Harborview Basics, Ridgeline, Denim Supply,
Overland). A market scan takes one request and returns a **verdict table** — who can answer, who is
size-out, who is category-mismatch — and routes the answering store. Verdicts and prices only; no
merchant's cost or floor leaves toward another merchant or the shopper.

## Composition

On Studio → Composition, locked facts feed scene templates; every claim is checked before export.
See Quick start for the pipeline map.
