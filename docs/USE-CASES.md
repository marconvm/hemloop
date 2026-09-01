# Hemloop Use Cases

Concrete scenarios showing where the loop earns its place. Personas are synthetic; every product, price and shopper is fictional.

## Primary loop

### UC-1 — The shopper who will not upload her closet

**Actor:** Priya, a shopper with a browser agent.
**Trigger:** "Help me fill the gaps in my winter wardrobe from this store, but don't share my closet."
**Flow:**
1. Priya's agent calls `find_gaps` and `get_my_sizes` on `/closet` — reasoning over her wardrobe locally.
2. It finds she has no hoodie, checks fit against the store catalogue with `check_fit`, and recommends starting from her known size.
3. It calls `report_demand_gap`. The tool refuses: `human-approval-required`.
4. Priya reads the exact payload the agent wants to send (category, size, product — no name, no id, no wardrobe), presses **Approve next signal** once, and the agent retries successfully.
**Outcome:** the store learns "someone nearby wants a hoodie in M" and nothing else. Priya never uploaded a thing.
**Why WebMCP:** the agent operates the wardrobe as structured tools on her own page; the identity boundary is a property of the tool schema, not a promise.

### UC-2 — The merchant who finally sees owned-inventory demand

**Actor:** a Hemloop merchant.
**Trigger:** a hoodie demand event lands in the studio's Live Demand panel.
**Flow:**
1. The merchant clicks "Build campaign from this"; the signalled product's facts load from the catalogue.
2. They lock the campaign truth (price, 25% offer, code, dates, disclaimer).
3. Their agent storyboards a 9:16 promo through the WebMCP tools; the merchant tweaks a headline by hand in the same canvas.
4. Export produces a compliant, renderable composition.
**Outcome:** demand that used to be invisible offline becomes a same-day campaign — provably accurate.
**Why WebMCP:** the creative tools that agents cannot click become a typed contract; the trust boundary is enforced in code.

### UC-3 — The agent that tries to oversell

**Actor:** the merchant's agent, over-eager.
**Trigger:** "Make the offer pop — say 50% off, guaranteed lowest price."
**Flow:** the tool call is validated against the locked 25% offer and the banned-phrase list; it is rejected before anything changes, with a machine-readable reason; the agent rewrites its own copy to the true 25%.
**Outcome:** the non-compliant frame never exists. The proof trail shows the block for auditors.
**Why WebMCP:** validation lives inside the tool layer, so "the agent cannot publish a false claim" is structural.

## Secondary and edge

- **UC-4 Plain-editor fallback:** with no WebMCP runtime, both surfaces work as ordinary single-user editors (preview mode). No agent, no dead app.
- **UC-5 Private-mode shopper:** localStorage blocked — the closet still functions; the bridge simply delivers nothing, no crash.
- **UC-6 Auditor review:** a compliance reviewer opens the studio proof trail and reads every accepted and rejected agent action with reasons.
- **UC-7 Catalogue refresh:** the merchant regenerates the product snapshot with one CLI command when the store changes.

## Out of scope (deliberately)

- Real payment, checkout, or account creation.
- Cross-merchant identity graphs or any persistent shopper profile.
- Live Storefront API calls (the importer interface already matches, but the demo uses a committed snapshot).
- Server-side video rendering (the export is a renderable file; rendering to MP4 is roadmap).

## Roadmap use cases

- **k-anonymity floor:** a merchant sees a demand cell only after N distinct shoppers contribute to it.
- **Per-merchant fact schemas:** regional pricing and legal-copy templates as locked facts.
- **Signal relay:** the localStorage bridge becomes a hosted queue (same `DemandSignal` contract).
