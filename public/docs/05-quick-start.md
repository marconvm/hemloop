# Quick start and implementation

## Try it in three minutes

No account, no login. State lives in your browser, so an incognito window is a clean install.

1. Open [hemloop.app](https://hemloop.app/) (the Loop Room) in Chrome 149+ (this origin carries a
   WebMCP origin-trial token, so no flag is needed) or in ChatGPT's in-app browser. The badge should
   read **21 WebMCP tools live** once registration finishes.
2. Upload a sample receipt from `public/receipts/` in the chat, or ask the agent to import the
   sample till text. Station **New item** lights when `import_receipt` lands.
3. Ask: *What should I buy next?* (`find_gaps` on **Local demand**).
4. Ask: *Tell the store I need a hoodie in size M.* It is **refused**: human approval required.
5. Press **Approve next request**, then reply **Yes, send it** in the chat. It succeeds once; a
   third send is refused again, because one press releases one event.
6. Ask: *What demand came in, and what can we fill? Then propose an offer inside our rules for the
   newest request.* Press **Approve offer**.
7. Ask: *Any offers for me?* Press **Bought**. The purchase records the offer that won it.
8. To see the safety boundary, ask: *Update the hero to say fifty per cent off, guaranteed.*
   Rejected against the locked 25%, with a reason the agent corrects itself from.

Open `/closet` or `/studio` from the header when you want the full shopper or merchant surface
(tabs; same bridge and the same 9 or 12 tools). Reset with **Clear wardrobe, purchases and
requests** on the closet, or a new incognito window.

## Run it locally

```sh
git clone https://github.com/marconvm/hemloop
cd hemloop
npm install
npm run dev        # Loop Room on /, studio on /studio, closet on /closet
npm test           # the full suite
```

Node 22+. On a Chrome build without the origin trial, enable
`chrome://flags/#enable-webmcp-testing`, press Relaunch, reopen the URL. Note that
`crypto.randomUUID()` needs a secure context, so use `localhost`, not a LAN address.

## How it is built

```
LOOP ROOM (/)  — components/loop-room-page.tsx registers all 21 tools once
                 └▶ lib/proofframe/loop-room.ts (station props contract)

MERCHANT (/studio)                                SHOPPER (/closet)
app/studio/page.tsx                                app/closet/page.tsx
  └▶ components/proofframe-studio.tsx         └▶ components/closet-studio.tsx
        │ callbacks                                 │ callbacks
        ▼                                           ▼
   lib/proofframe/webmcp.ts (12 tools)        lib/proofframe/webmcp-closet.ts (9 tools)
        │ validates via                             │ pure logic in
        ▼                                           ▼
   validator.ts · exporter.ts                 closet.ts (gaps + replacement lifecycle, fit,
   offers.ts (matchOffer, demandInsight)       preferences, purchases, buyingPattern, makeSignal)
   shopify.ts + catalog.json ◀────────────────┘ receipts.ts (local receipt parser)
   seed.ts (shared hemloop.campaign)

              lib/proofframe/signal-bridge.ts (localStorage + storage events:
              signals, consent level, outcomes, purchases, personal offers)
              closet.ts also owns hemloop.wardrobe
```

**Design rule.** `lib/proofframe/*` is pure and framework-free: no React, no DOM at module scope.
The React surfaces own all state and pass callbacks in; the adapters own no state at all. That is
what makes the whole tool surface unit-testable without a browser.

**Registration.** Targets `document.modelContext`, probing `navigator.modelContext` first for older
drafts. Each tool is `{ name, description, inputSchema, annotations?, execute }`. `execute` returns
a plain JSON object; the browser serialises it. Registration is awaited, rejections are surfaced,
and the badge counts confirmed registrations, not the list.

```ts
// lib/proofframe/webmcp-closet.ts, abbreviated
{
  name: 'report_demand_gap',
  description: 'Send one data-minimized demand signal after the human approves the next share...',
  inputSchema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['gap', 'fit', 'want', 'replace'] },
      category: { type: 'string', enum: GARMENT_CATEGORIES },
      size: { type: 'string' },
      handle: { type: 'string' },
      occasion: { type: 'string', enum: ['everyday', 'season', 'gift', 'event'] },
    },
    required: ['category'],
    additionalProperties: false,
  },
  execute: (args) => {
    // validate strictly BEFORE consuming the one-shot approval,
    // so malformed input never burns the human's grant
    if (!cb.consumeShareApproval()) return fail('human-approval-required', ...);
    const signal = makeSignal(...);          // no identifier field exists on this shape
    return ok({ sent: signal });             // the exact payload, so the boundary is inspectable
  },
}
```

**The bridge.** The surfaces are routes of one origin, so the demo bridge runs over `localStorage`
and storage events. Storage is treated as a client-integrity boundary, not an authenticated one:
everything read back is re-parsed into an exact shape, and a stored record can never claim more
consent fields than its level grants.

**The matcher.** `matchOffer({ request, facts, catalogProduct })` is pure and deterministic. It
reads the request's buying pattern and the merchant's locked rules (`costPrice`,
`marginFloorPercent`, `maxDiscountPercent`), sets the discount, trims it in five-point steps while
the margin is below the floor, shortens validity for a gift or event, and returns a `PersonalOffer`
with its reasons and margin check, or a typed refusal. `demandInsight` scores each demand group with
the same two predicates the matcher refuses on, so the panel can never promise what the matcher
would then decline.

**Tests.** The suite includes adversarial tool-boundary replays: extra-property XSS, malformed
input, unicode claim evasion, output-budget floods, fence-marker smuggling. One test loops every
tool on both surfaces and asserts the contract Chrome's secure-tools guidance sets.

![The composition preview with the product as the hero](img/studio-product-hero.jpg)
