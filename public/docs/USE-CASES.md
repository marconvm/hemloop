# Hemloop Use Cases

Concrete scenarios showing where the loop earns its place. Personas are synthetic; every product, price and shopper is fictional.

## Primary loop

### UC-1: the shopper who will not upload her closet (a Need)

**Actor:** Priya, a shopper with a browser agent.
**Trigger:** "Help me fill the gaps in my winter wardrobe from this store, but don't share my closet."
**Flow:**
1. Priya's agent calls `find_gaps` and `get_my_sizes` on `/closet`, reasoning over her wardrobe locally.
2. It finds she has no hoodie (a gap, labelled **Need** in the UI), checks fit against the store catalogue with `check_fit`, and recommends starting from her known size.
3. It calls `report_demand_gap`. The tool refuses: `human-approval-required`.
4. Priya reads the exact payload the agent wants to send (category, size, product, no name, no id, no wardrobe), presses **Approve next request** once, and the agent retries successfully.
**Outcome:** the store learns "someone nearby needs a hoodie in M" and nothing else. Priya never uploaded a thing.
**Why WebMCP:** the agent operates the wardrobe as structured tools on her own page; the identity boundary is a property of the tool schema, not a promise.

### UC-2: the shopper who wants something she does not need (a Want)

**Actor:** Priya, later the same week.
**Trigger:** "I already own three jackets, but I like the look of the new Northlight colourway. Let the store know I'm interested, without sending my closet."
**Flow:**
1. Priya's agent calls `get_wardrobe` and confirms jacket is not a gap; this is a stated preference, not a missing category.
2. It calls `report_demand_gap` with `kind: "want"` and the product handle. The tool refuses: `human-approval-required`, same as any other event.
3. Priya presses **Approve next request**, and the agent retries successfully; the event is labelled **Want** everywhere it appears.
**Outcome:** the merchant sees a Want alongside any Needs, grouped separately by category and size, so "four people need a hoodie in M" and "one person wants a jacket colourway" read as two different kinds of demand, not one undifferentiated list.
**Why WebMCP:** the same tool and the same schema carry both levels of demand; the `kind` field, not a separate tool, is what tells the merchant which one they are looking at.

### UC-2b: the shopper buying a gift, at level 2 Context (a Need)

**Actor:** Priya, shopping for her partner.
**Trigger:** "My partner needs a hoodie for a trip next week. Ask the store, but keep it at Context level, don't send colour or budget."
**Flow:**
1. Priya switches the closet's **Shopping for** control to Partner; her agent now reads and reasons over the partner's wardrobe rows only.
2. It calls `find_gaps` on that profile and confirms hoodie is missing, then `get_my_sizes` for the partner's known size.
3. Priya raises her sharing level to 2 Context (from the default 1 Basics) and sets the request's occasion to "gift" when asked; the payload preview shows exactly six fields: category, level, size, for, fitPreference, occasion, no colour, no price ceiling.
4. The agent calls `report_demand_gap` with `occasion: "gift"`; the tool refuses `human-approval-required` until Priya presses **Approve next request (level 2)**.
5. She approves once; the retry succeeds and the requests-sent list shows the exact payload, `for: "partner"` included, no name, id or wardrobe rows.
**Outcome:** the merchant learns "a gift-occasion hoodie, size L, for a partner profile" and nothing about who Priya or her partner are; a level below (1 Basics) could not have carried occasion or the for field at all.
**Why WebMCP:** the sharing level and the sub-profile switch are both human-only state the tool schema reads, never something the agent can raise or widen itself.

### UC-3: the merchant who finally sees owned-inventory demand

**Actor:** a Hemloop merchant.
**Trigger:** a hoodie demand event lands in the studio's Incoming requests panel, grouped with others as "hoodie · M · 4 requests".
**Flow:**
1. The merchant clicks "Answer this request"; the requested product's facts load from the catalogue.
2. They lock the offer facts (price, 25% offer, code, dates, disclaimer).
3. Their agent storyboards a 9:16 promo through the WebMCP tools; the merchant tweaks a headline by hand in the same canvas.
4. Export produces a compliant, renderable composition; `get_offer` makes the same locked facts available as structured data with a purchase link, for any shopping agent that wants to act on it directly.
**Outcome:** demand that used to be invisible offline becomes a same-day campaign, provably accurate, and consumable by a shopping agent once it exists.
**Why WebMCP:** the creative tools that agents cannot click become a typed contract; the trust boundary is enforced in code.

### UC-4: the agent that tries to oversell

**Actor:** the merchant's agent, over-eager.
**Trigger:** "Make the offer pop, say 50% off, guaranteed lowest price."
**Flow:** the tool call is validated against the locked 25% offer and the banned-phrase list; it is rejected before anything changes, with a machine-readable reason and a `next` instruction telling the agent what the compliant retry looks like; the agent rewrites its own copy to the true 25%.
**Outcome:** the non-compliant frame never exists. The agent activity log shows the block for auditors.
**Why WebMCP:** validation lives inside the tool layer, so "the agent cannot publish a false claim" is structural.

### UC-4b: the merchant who fills the missing fact to unlock an agent action

**Actor:** the Hemloop merchant, mid-campaign.
**Trigger:** a shopping agent calls `get_offer` and the result shows `completeness: { locked: 8, total: 9, missing: ["sizesInStock"] }`.
**Flow:**
1. The merchant checks the studio's completeness meter, "8 of 9 facts locked", and reads the one entry left in the missing list: "Sizes in stock, unlocks: agents can skip sizes you cannot fill."
2. They unlock the offer facts, add the sizes currently in stock, and lock the facts again.
3. The next `get_offer` call returns `sizesInStock: ["S", "M", "L"]` and `completeness: { locked: 9, total: 9, missing: [] }`.
**Outcome:** the one missing fact was named in the tool's own output before the merchant went looking for it, and filling it is what turns "agents can skip sizes you cannot fill" from a locked-out action into a live one.
**Why WebMCP:** `get_offer` and the studio's completeness meter share one `computeCompleteness` function, so what an agent sees as missing and what a human sees as missing can never drift apart.

### UC-4c: the gift hoodie that closes the loop, auto-proposed, approved, bought, attributed

**Actors:** Priya, shopping for her partner; a Hemloop merchant, with Auto-propose switched on.
**Trigger:** "My partner needs a hoodie for a trip next week." Same request as UC-2b, but this time the merchant has already turned on Auto-propose, and the offer rules (cost 24, margin floor 35%, max discount 30%) are locked.
**Flow:**
1. Priya's agent confirms the gap and her sharing level is 2 Context; she sets occasion to "gift" and approves once. `report_demand_gap` sends category, size, occasion and the `for: "partner"` field, no colour, no price ceiling, no purchase history.
2. The request lands in the studio's Incoming requests. Because Auto-propose is on, `matchOffer` runs automatically: category matches, the size is in stock, and because the occasion is "gift" the offer's `validTo` shortens to 7 days out. The margin holds at the full discount, so nothing is trimmed. The proposal appears under the request, status `proposed`, `proposedBy: "auto"`.
3. The merchant reads the proposal's price, reasons and margin check, and presses **Approve**. The offer's status becomes `approved`; no WebMCP tool could have done this step.
4. Back on the closet page, the approved offer appears in **Offers for your requests** (the same thing `get_offers` would return to Priya's agent). Priya presses **Bought**.
5. The purchase is recorded in the **Purchases across stores** panel with `source: "offer"` and `offerId` set to the offer's id, so the row that answered the request and the row it produced are linked.
**Outcome:** a gift-occasion request became a personal offer inside the merchant's margin, without a human writing a single number by hand, and a human still made both consequential decisions, approving the offer and buying it. The next `buyingPattern` computed for hoodies now includes this purchase.
**Why WebMCP:** every step an agent could take (matching, proposing, reading the approved offer back) is a typed tool; the two decisions that matter, approve and buy, stay off the tool surface entirely.

## Secondary and edge

- **UC-5 Plain-editor fallback:** with no WebMCP runtime, both surfaces work as ordinary single-user editors (preview mode). No agent, no dead app.
- **UC-6 Private-mode shopper:** localStorage blocked, the closet still functions; the bridge simply delivers nothing, no crash.
- **UC-7 Auditor review:** a compliance reviewer opens the studio's agent activity log and reads every accepted and rejected agent action with reasons.
- **UC-8 Catalogue refresh:** the merchant regenerates the product snapshot with one CLI command when the store changes.

## Out of scope (deliberately)

- Real payment, checkout, or account creation.
- Cross-merchant identity graphs or any persistent shopper profile.
- Live Storefront API calls (the importer interface already matches, but the demo uses a committed snapshot).
- Server-side video rendering (the export is a renderable file; rendering to MP4 is roadmap).

## Roadmap use cases

- **k-anonymity floor:** a merchant sees a demand cell only after N distinct shoppers contribute to it.
- **Per-merchant fact schemas:** regional pricing and legal-copy templates as locked facts.
- **Request relay:** the localStorage bridge becomes a hosted queue (same `DemandSignal` contract).
