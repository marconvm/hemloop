# Multi-merchant: only the right store answers (2026-09-03, Marco's ask)

Marco: "add multi merchants, to show only the right merchant with the right offer, supply, and fit
for the shopper's demand. Set samples: some with a higher margin floor, some low on stock, some with
a rule that cannot discount deeper, so our sample shopper only fits one or two merchants."

## The model, in one paragraph

A **merchant** is a set of locked facts plus offer rules (the `CampaignFacts` the studio already
locks: product, prices, code, dates, disclaimer, sizes in stock, cost, margin floor, max discount).
Today there is one, Northlight Apparel, seeded by `seedCampaign()`. There will be five. When a
shopper's request lands on the bridge, a **market scan** runs every merchant's rules against that
one request, purely, and produces a verdict per merchant. Only merchants whose verdict is
`can-offer` can propose. The Loop Room shows the whole market with every verdict, so the point
("the right store, inside its own rules, nobody else") is visible; the studio is one merchant's
desk with a switcher for which merchant you are.

## Why each sample fails or fits (request: hoodie, size M)

`matchOffer` in `lib/proofframe/offers.ts` refuses on category and size, trims the discount down to
protect the margin floor, and returns `marginCheck.ok=false` when even 0% cannot clear the floor.
It ignores the shopper's price ceiling. `marketScan` wraps it and adds the two verdicts it lacks.

| merchant | product, sizes, prices | rules | verdict at level 1 (Basics) | at level 3 (Taste, ceiling from the shopper's preferences) |
|---|---|---|---|---|
| Northlight Apparel | Northlight Hoodie, S-XL, 59.90 → 44.90 (25%) | cost 24, floor 35%, max 30% | **can-offer**, 44.90, margin 46.5% | can-offer |
| Harborview Basics (the rival) | Harbor Fleece Hoodie, XS-XL, 49.00 → 39.20 (20%) | cost 36, floor 30%, max 20% | **margin-floor**: even at 0% the margin is 26.5% | margin-floor |
| Ridgeline Outdoor | Summit Fleece Hoodie, S L XL only, 79.00 | cost 40, floor 35%, max 25% | **size-not-in-stock**: M sold out | size-not-in-stock |
| Denim Supply Co. | East Side Straight Jean, 28-36 | cost 38, floor 35%, max 20% | **category-mismatch** | category-mismatch |
| Overland Trading Co. | Fieldhouse Fleece Hoodie, S-XL, 89.00, no sale | cost 45, floor 40%, max 10% | **can-offer**, 80.10 at the 10% cap | **over-ceiling**: 80.10 is above the ceiling, and the rule cannot go deeper |

So at Basics two merchants fit; at Taste only Northlight does. The sharing dial changes who can
answer, which is the consent story told from the merchant's side. Check the seed preference
`priceCeiling` in `closet.ts` and set it so the table above holds (60 works); adjust the numbers in
the seed, never the rule, if a row does not come out as the table says, and put the actual numbers
in the test.

## Contract (published by Claude in `lib/proofframe/loop-room.ts`)

```ts
export type MarketVerdict =
  | 'can-offer' | 'size-not-in-stock' | 'category-mismatch' | 'margin-floor' | 'over-ceiling';

export interface MarketRow {
  merchantId: string;
  name: string;
  verdict: MarketVerdict;
  /** One line a human reads: "M sold out", "margin 26.5% under the 30% floor". */
  reason: string;
  /** The price this merchant could offer, null unless can-offer. */
  price: number | null;
  currency: string;
}

// on LoopRoomView:
market: MarketRow[] | null;             // null until a request exists in this loop
activeMerchant: { id: string; name: string }; // whose 12 tools are registered on this page
```

## Cursor lane (lib, page wiring, studio, tests) on `cursor/merchants`

1. `lib/proofframe/merchants.ts`: `Merchant = { id, name, facts: CampaignFacts }`,
   `seedMerchants(): Merchant[]` (the five above, images from the catalog where a product exists,
   `purchaseUrl` per merchant), and `marketScan(request: DemandInsightRequest-like, merchants,
   shopperCeiling: number | null, now?): MarketRow[]`, pure: run `matchOffer` per merchant with
   that merchant's catalog product (`catalogProductFor` as the studio does), map refusals to
   verdicts, `marginCheck.ok=false` to `margin-floor`, and price above `shopperCeiling` (only when a
   ceiling travelled, i.e. the signal carries `taste.priceCeiling`) to `over-ceiling`. Order:
   can-offer first, then the rest in seed order.
2. `lib/proofframe/seed.ts`: `seedCampaign(merchantId = 'northlight')` builds the campaign from a
   merchant. Stored state becomes per merchant: `hemloop.campaigns` (`{ [merchantId]: CampaignState }`)
   plus `hemloop.merchant` (active id). `readCampaign(merchantId)` / `writeCampaign(merchantId, s)`;
   keep the validation you wrote. Migrate the old single `hemloop.campaign` key into
   `campaigns.northlight` on first read, then remove it.
3. `components/loop-room-page.tsx`: hold `merchants` and `activeMerchantId`; `campaignRef` is the
   active merchant's campaign, so the 12 studio tools keep working unchanged. When the newest loop
   signal changes, compute `marketScan` and, if the active merchant is not `can-offer` and another
   is, switch the active merchant to the first that is (the right store answers). Fill
   `view.market` and `view.activeMerchant`. The `offer` station: `say` becomes "Which store can
   fill this, and what can it offer inside its rules?"; `facts` lists the market (name: verdict,
   reason); `updated` keeps demand and the proposal as now; `merchantSees` names the active
   merchant. `bought` and `learned` copy names the merchant that won.
4. `/studio`: a merchant switcher on the Demand tab header ("You are: Northlight Apparel ▾") that
   swaps the whole campaign (facts, lock, scenes) and persists the active id; the Demand panel
   shows the market scan for each incoming request (verdict per merchant) so a merchant sees why
   they can or cannot answer. Tools stay 12 and register once; switching merchant changes what
   `getState()` returns, nothing else.
5. Tests (`tests/proofframe.test.ts`): the five verdicts at level 1 and level 3 exactly as the
   table says (with the real numbers), `marketScan` ordering, per-merchant storage roundtrip and
   the migration from the old key. Tool count stays 21; the existing tests must keep passing.
6. Docs: one section in `docs/02-the-loop.md` ("Only the right store answers") and the market
   line in `USER-GUIDE.md`, mirrored.

## Codex lane (room presentation) on `codex/wave6`

Render `view.market` on the merchant side of the room: one row per merchant, name, verdict as a
chip (can-offer in the loop green, everything else muted), the reason, and the price when there
is one; the active merchant is marked "answering". Until `market` is non-null show the five names
greyed with "waiting for a request". At phone width the list collapses to the answering merchant
plus a "4 others could not" line that expands. `view.activeMerchant.name` replaces the static
"Merchant · Demand" heading's subtitle, not the heading itself (the name lock stands).

## What must not change

21 tools, every human gate human-only, `report_demand_gap` still emits one `DemandSignal`, no
merchant ever sees another merchant's cost or floor (the market rows carry verdict and price only),
136+ tests green, the docs mirror byte-identical.
