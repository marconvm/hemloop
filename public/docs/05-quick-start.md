# Quick start and implementation

## Try it in three minutes

No account, no login. State lives in your browser, so an incognito window is a clean install.

1. Open [hemloop.app/closet](https://hemloop.app/closet) in Chrome 149+ (this origin carries a
   WebMCP origin-trial token, so no flag is needed) or in ChatGPT's in-app browser. The badge should
   read **9 WebMCP tools live**.
2. Ask the agent: *Check my closet. What am I missing, and is anything worn out?*
3. Ask: *Tell the store I need a hoodie in size M.* It is **refused**: human approval required.
4. Press **Approve next request**, ask again. It succeeds and returns the exact payload sent. Ask a
   third time: refused again, because one press releases one event.
5. Open [hemloop.app/studio](https://hemloop.app/studio) (badge: **12 WebMCP tools live**). Ask:
   *What demand has come in? Group it and tell me what we can actually fill.* Then: *Propose an
   offer for that request, inside our locked rules.* Press **Approve**.
6. Back on the closet: *Any offers for me?* Press **Bought**. The purchase records the offer that
   won it.
7. To see the safety boundary, ask the studio agent: *Update the hero to say fifty per cent off,
   guaranteed.* Rejected against the locked 25%, with a reason the agent corrects itself from.

Reset any time with **Clear wardrobe, purchases and requests**, or a new incognito window.

## Run it locally

```sh
git clone https://github.com/marconvm/hemloop
cd hemloop
npm install
npm run dev        # landing on /, studio on /studio, closet on /closet
npm test           # the full suite
```

Node 22+. On a Chrome build without the origin trial, enable
`chrome://flags/#enable-webmcp-testing`, press Relaunch, reopen the URL. Note that
`crypto.randomUUID()` needs a secure context, so use `localhost`, not a LAN address.

## How it is built

```
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

              lib/proofframe/signal-bridge.ts (localStorage + storage events:
              signals, consent level, outcomes, purchases, personal offers)
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

**The bridge.** The two surfaces are routes of one origin, so the demo bridge runs over
`localStorage` and storage events. Storage is treated as a client-integrity boundary, not an
authenticated one: everything read back is re-parsed into an exact shape, and a stored record can
never claim more consent fields than its level grants.

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
