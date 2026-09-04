# Hemloop judge review 3: Wave 5 replay (Codex, 2026-09-03)

Reviewed against `origin/main` after the multi-merchant and Batch 4 merges. This was an independent source review plus hostile in-memory `localStorage` replays; no production state was used. Codex changed only its assigned presentation lane. The fixes below that name `lib/*` or full-surface components are recommendations for Claude.

## Verdicts

| Area                               | Verdict         | Severity | Why                                                                                                                                                                                                            |
| ---------------------------------- | --------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored campaign boundary           | **CHANGE**      |     High | `readCampaign()` projects known keys, but accepts unbounded and impossible campaign values while preserving an attacker-written `factsLocked: true`. It does not meet the `toSignal()` / `toOffer()` boundary. |
| Stored wardrobe boundary           | **CHANGE**      |   Medium | `get_wardrobe` remains budget-safe, but `readWardrobe()` returns partially checked original rows; an arbitrary image URL reaches a rendered `<img src>`.                                                       |
| Restart, ordering and human gates  | **KEEP**        |        — | Real tool calls cannot press any of the three gates, and later evidence cannot skip an earlier visible step. Restart requires an attributed closed loop plus a successful receipt import.                      |
| Manifest guarantees                | **CHANGE copy** |      Low | The 21 annotations and gate guarantees survived trimming, but two descriptions call mutable/unlocked facts “human-locked”. Successful-result `next` fields do not invite unnecessary calls.                    |
| Hydration before tool registration | **KEEP**        |        — | Hydration microtasks are queued by earlier effects; `registerAll()` defers every registration to later microtasks. The current ordering exposes no registered tool before the stored refs load.                |

## 1. Stored campaign: client-integrity boundary

### Replay

A `hemloop.campaigns.northlight` record containing 10,000-character strings, 100 scenes, negative durations, `regularPrice: -99`, `discountPercent: 900`, `purchaseUrl: "javascript:alert(1)"`, an external `productImage`, negative format dimensions/fps and `factsLocked: true` was accepted by `readCampaign()`.

Observed:

```text
briefLen=10000  productLen=10000  sceneCount=100
regularPrice=-99  discountPercent=900  firstDuration=-100
format={width:-1,height:1000000000000,fps:-30,placement:"story"}
purchaseUrl="javascript:alert(1)"  factsLocked=true
```

The positive part is real: `parseCampaign()` rebuilds the top-level object and `parseScene()` rebuilds each scene, so injected extra keys were dropped (`lib/proofframe/seed.ts:188-205,232-252`). `exportComposition()` also rejected invalid campaigns and, in a valid-shape replay, reduced `url(javascript:...)` colours to hardcoded safe colours; no `javascript:` reached the exported HTML (`lib/proofframe/exporter.ts:24-49,57-72`).

The remaining boundary is still weaker than `toSignal()` and `toOffer()`: `parseFacts`, `parseScene`, `parseFormat` and `parseStyle` check primitive types but not useful bounds/ranges/protocols (`lib/proofframe/seed.ts:125-229`). A same-origin write can therefore claim a human lock that never occurred, force external image requests in the live preview, and place unsafe checkout data into downstream state. This is a client-integrity boundary, not authentication, but the UI must not describe arbitrary storage as human-verified truth.

### Minimal out-of-lane fix

At `lib/proofframe/seed.ts:125-252`, rebuild an exact, bounded campaign:

- reuse the existing scene-count, total-duration and per-scene validation limits;
- bound brief, ids, headings, bodies, disclaimers, phrase arrays and stock sizes;
- require non-negative prices, percentages in range, valid date order and a known format preset;
- allow only safe colour tokens;
- allow `https:` checkout URLs and vetted same-origin product image paths;
- if any invariant fails, drop the stored merchant campaign and return its seed.

Do not treat the stored `factsLocked` bit as proof of who pressed the UI control. The honest guarantee is that WebMCP tools cannot change locked facts, not that same-origin storage is authenticated.

## 2. Stored wardrobe and UI image path

### Replay

`readWardrobe()` accepted a row with a 5,000-character brand, numeric size, object colour, `for: "intruder"`, a hostile retailer, an extra key, and `image: "https://tracker.invalid/pixel"`. The returned row retained every field because the filter checks only object, string id and category, then returns the original object (`lib/proofframe/closet.ts:824-838`).

The WebMCP projection held: 60 such rows produced a 1,356-character `get_wardrobe` result, reported 48 truncated rows, and emitted neither retailer nor image. It did stringify the malformed colour as `[object Object]`, but did not throw. The row cap and narrow projection at `lib/proofframe/webmcp-closet.ts:96-132` are **KEEP**.

The UI path is not safe: `components/loop-room-page.tsx:966-975` copies `g.image`, and `components/loop-room/closet-stack.tsx:67-76` renders it directly as `<img src>`. That permits a passive request to an arbitrary origin and unbounded `data:` payloads on page load. The full `/closet` surface consumes the same stored wardrobe.

### Minimal out-of-lane fix

At `lib/proofframe/closet.ts:824-838`, replace the filter with an exact `toGarment()` rebuild: bounded strings, category/profile enums, finite non-negative numeric fields, canonical dates, a total-row cap, and image omitted unless it is a vetted same-origin `/products/...` asset. Drop malformed rows rather than passing their original objects through.

Adjacent defence-in-depth: `toOffer()` bounds `purchaseUrl` and `image` but does not validate their protocols (`lib/proofframe/signal-bridge.ts:354-428`). The same shared URL/path policy should cover campaign, garment and offer readback.

## 3. Loop wiring: restart, scoping and three gates

### Evidence ordering: KEEP

`stationStates()` walks the seven keys in order and marks a step done only while every earlier raw flag is true (`lib/proofframe/loop-room.ts:147-173`). Replays with only later flags set leave the first missing step current; later steps remain todo.

The evidence mapping also holds (`lib/proofframe/loop-room.ts:207-230`):

- item: successful `import_receipt` this session, or a first-loop imported purchase;
- gap/request: a successful call or a stored request row;
- offer: an approved offer tied to a request in this loop;
- bought: a bought outcome tied to that approved request;
- learned: a purchase carrying that approved offer id.

A request row is deliberately accepted as proof that a gap/request exists even if `find_gaps` ran in another tab. That is not a bypass; it is the documented evidence rule at lines 222-224.

### Human gates: KEEP

The three controls are only reachable through `onHumanGate()` (`components/loop-room-page.tsx:1097-1138`):

1. share approval toggles the one-shot `shareArmedRef`;
2. offer approval changes a proposed stored offer to approved;
3. Bought writes the outcome, purchase and garment.

No tool callback receives `onHumanGate`. `report_demand_gap` can only consume an already armed approval; `propose_offer` only stages; `get_offers` only reads. Calling tools in a different order can create later evidence, but cannot make the visible sequence skip the first unmet step.

### Restart and time scope: KEEP for real calls, harden later

`onToolResult()` restarts only when `import_receipt` returned ok and `closedRef.current` already reflects an attributed loop (`components/loop-room-page.tsx:444-476,627-630`). It clears session tool evidence, increments the cycle and scopes future signal/offer/outcome rows to the new ISO instant. A failed import returns before restart.

All app-minted timestamps are ISO strings, so lexicographic `since()` is correct on the real tool path. Storage parsers currently accept any `Date.parse`-valid spelling, though, while `since()` compares raw strings (`lib/proofframe/loop-room.ts:202-218`). When storage parsers are next hardened, canonicalize timestamps to `new Date(value).toISOString()` or compare milliseconds. This is defence-in-depth, not a demonstrated real-tool bypass.

## 4. Manifest after trimming

Built output is exactly 21 tools and 3,116 description characters. All 11 read-only tools carry `readOnlyHint`, and the manifest renders the annotation as a `Read` chip. The important behavioural guarantees remain explicit:

- `report_demand_gap`: a human press is required, one press releases one signal, level zero blocks, and no shopper id or wardrobe rows travel;
- `propose_offer`: staging only, with human approval before shopper visibility;
- `get_offers`: no tool can buy;
- `get_wardrobe`, `get_preferences`, `import_receipt`, `get_demand`: what stays local or never travels is stated.

Three successful results include `next`: `import_receipt` says no further call is needed, `get_offers` asks the shopper to decide, and `propose_offer` asks the agent to tell the merchant approval is pending. None invites an unnecessary tool call.

Two descriptions are inaccurate when the merchant UI is unlocked:

- `get_campaign_state` calls all returned facts “human-locked” (`lib/proofframe/webmcp.ts:337-342`), although it returns the current state and lock bit.
- `import_product` says imported facts become “still human-locked” (`lib/proofframe/webmcp.ts:596-607`), but both page callbacks correctly permit import only while facts are unlocked and leave them unlocked.

**CHANGE copy only:** describe `get_campaign_state` as returning facts plus their human lock state, and say `import_product` imports into the unlocked fact set; the merchant must review and lock it afterward. No schema or behaviour change is needed.

## 5. Hydration-after-mount window

**KEEP.** On `/closet`, the wardrobe hydration effect queues its microtask at `components/closet-studio.tsx:197-209`; tool registration is a later effect at lines 406-434. On `/studio`, campaign hydration queues at `components/proofframe-studio.tsx:338-358`; registration is later at lines 774-803.

`registerAll()` does not register synchronously: every `mc.registerTool()` is itself scheduled with `Promise.resolve().then(...)` (`lib/proofframe/webmcp.ts:58-72`). Therefore the earlier hydration microtask runs before any registration microtask. There is a first paint with seed UI, but no registered page tool can land in that interval and be overwritten by hydration.

This depends on effect order, so a future refactor should preserve hydration before registration or make readiness explicit. It is not a current defect and does not justify a last-minute state-machine change.

## Recommended order

1. **P0:** strict `readCampaign()` rebuild, especially lock semantics and URL/image policy.
2. **P0:** strict `readWardrobe()` rebuild and same-origin image allowlist.
3. **P1:** correct the two manifest descriptions.
4. **Post-fix:** add hostile storage regressions for bounds, protocols, row counts and canonical timestamps.
