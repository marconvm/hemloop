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
