// The Loop Room: one request's whole lifecycle as one shared space.
//
// This is the props contract between the state layer (Claude) and the
// presentational components (Codex). Everything here is pure and typed;
// nothing reads the bridge or the DOM. The components receive a
// LoopRoomView and render it; the page builds the view from real bridge
// state and real tool results. No stage advances without a real call.
//
// The closet and studio rails keep using loop.ts (five steps). The room is
// a different view of the same flags with two more stations: the purchase
// that starts a loop, and the restart that proves it is a loop.

import type { LoopFlags } from './loop';

export type StationKey =
  | 'item' // a purchase lands in the closet
  | 'gap' // the agent finds what is missing or worn out
  | 'approved' // refused, one human press, sent, refused again
  | 'offer' // grouped demand, proposal inside locked rules, human approve
  | 'bought' // offer returns to the request, human buys
  | 'learned' // both sides gained; nobody gained a profile
  | 'again'; // a new item, a sharper pattern, the loop runs again

export type StationState = 'done' | 'current' | 'todo';

/** What a station card shows. Every slot is data the page already has from a
 * real call; none of it is scripted copy pretending to be a result. */
export interface StationCard {
  key: StationKey;
  /** Short label on the rail. */
  label: string;
  /** Headline above the card. */
  title: string;
  /** Kicker for the room's hero, per station: what this step is about. */
  eyebrow: string;
  /** The exact words to give the agent. Shown as a copy button. Null for
   * stations that are a human act, not an agent one. */
  say: string | null;
  /** Tool names that ran, in order, once they have. Empty until then. */
  toolsRan: string[];
  /** What is true right now, before anything runs: owned, last bought,
   * sizes, sharing level. Rendered BEFORE `updated`: facts first, then
   * what is missing or what changed. */
  facts: { label: string; value: string }[];
  /** What changed on the bridge or the page, as short labelled facts. */
  updated: { label: string; value: string }[];
  /** What each party can see at this station. */
  shopperSees: string;
  merchantSees: string;
  /** The human act this station waits on, if any. Rendered as a coral
   * button by the component; the page owns the handler. */
  humanGate: { label: string; hint: string } | null;
  state: StationState;
}

/** One row of the shopper's closet as the room shows it. Rows never leave
 * the page; this is the same data the wardrobe grid on /closet renders. */
export interface ClosetRow {
  id: string;
  category: string;
  brand: string;
  size: string;
  image?: string;
  /** Added during this session (import, Bought, or the + control). */
  isNew: boolean;
}

export type ShopperProfileKey = 'self' | 'partner' | 'kid';

/** Why one merchant can or cannot answer the request in transit. The first
 * three come from matchOffer; margin-floor is matchOffer's marginCheck.ok=false
 * (even 0% discount cannot clear the floor); over-ceiling is the offer price
 * above the ceiling the shopper let travel at sharing level 3. */
export type MarketVerdict =
  | 'can-offer'
  | 'size-not-in-stock'
  | 'category-mismatch'
  | 'margin-floor'
  | 'over-ceiling';

/** One merchant's answer in the market scan. Carries verdict and price only:
 * no merchant's cost or floor ever reaches another merchant or the shopper. */
export interface MarketRow {
  merchantId: string;
  name: string;
  verdict: MarketVerdict;
  /** One line a human reads: "M sold out", "margin 26.5% under the 30% floor". */
  reason: string;
  /** The price this merchant could offer; null unless can-offer. */
  price: number | null;
  currency: string;
}

/** Everything the room renders. */
export interface LoopRoomView {
  stations: StationCard[];
  current: StationKey;
  /** The active profile's closet, newest first. `closet.length` is the real
   * count; the stack shows "+N" only when it holds more rows than it shows. */
  closet: ClosetRow[];
  /** Who the shopper is shopping for. The page scopes closet, gaps and
   * prompts to `active`; the component renders the switch. */
  profiles: { active: ShopperProfileKey; options: { key: ShopperProfileKey; label: string }[] };
  /** The most recent station that ran tools, kept until the next call lands,
   * so "tool that ran" does not vanish the moment a station flips to done. */
  lastRan: { station: StationKey; tools: string[] } | null;
  /** Every merchant's verdict on the request in transit; null until a request
   * exists in this loop. Only the right store answers, everyone else says why not. */
  market: MarketRow[] | null;
  /** The merchant whose 12 studio tools are registered on this page. */
  activeMerchant: { id: string; name: string };
  /** 0..7, how many stations are done. */
  progress: number;
  /** Which loop this is. Goes up on restart; the outcome panel compares. */
  loopNumber: number;
  /** The packet in transit, once a request has left. Exactly what was sent. */
  packet: Record<string, string | number | null> | null;
  /** What the merchant staged, once it exists. */
  proposal: {
    price: number;
    regularPrice: number;
    discountPercent: number;
    promoCode: string | null;
    marginPercent: number;
    marginFloor: number;
    reasons: string[];
    status: 'proposed' | 'approved';
  } | null;
  /** The offer as the shopper sees it, once approved. */
  offer: { title: string; price: number; currency: string; purchaseUrl: string; image?: string } | null;
  /** Filled at 'learned'. */
  outcome: {
    customerGained: string[];
    merchantGained: string[];
    patternBefore: string | null;
    patternAfter: string | null;
    nobodyGained: string;
  } | null;
  /** Live tool registration, read from the runtime, never asserted. */
  runtime: { live: boolean; toolCount: number; absent: string[] };
}

export interface LoopRoomFlags extends LoopFlags {
  itemAdded: boolean;
}

const ORDER: StationKey[] = ['item', 'gap', 'approved', 'offer', 'bought', 'learned', 'again'];

/** Same rule as loop.ts: a station is done only when every earlier one is.
 * 'again' is done only when a second loop has started. */
export function stationStates(flags: LoopRoomFlags, loopNumber: number): Record<StationKey, StationState> {
  const raw: Record<StationKey, boolean> = {
    item: flags.itemAdded,
    gap: flags.gapFound,
    approved: flags.requestSent,
    offer: flags.offerApproved,
    bought: flags.bought,
    learned: flags.attributed,
    again: loopNumber > 1,
  };
  const out = {} as Record<StationKey, StationState>;
  let precededByDone = true;
  let currentAssigned = false;
  for (const k of ORDER) {
    const done = precededByDone && raw[k];
    if (!done) precededByDone = false;
    if (done) out[k] = 'done';
    else if (!currentAssigned) {
      out[k] = 'current';
      currentAssigned = true;
    } else out[k] = 'todo';
  }
  return out;
}

export function currentStation(states: Record<StationKey, StationState>): StationKey {
  return ORDER.find((k) => states[k] === 'current') ?? 'again';
}

export function stationOrder(): StationKey[] {
  return [...ORDER];
}

// ---------- From evidence to flags ----------

/** What the page has that can prove a station happened. Bridge rows carry
 * their own timestamps; tool calls are session memory. Nothing here is a
 * scripted "done", every flag is derived from a real row or a real call. */
export interface LoopRoomEvidence {
  /** Tool names that returned ok on this page during this loop. */
  ran: ReadonlySet<string>;
  /** A purchase row minted by import_receipt exists (ids start `import-`). */
  hasImportedPurchase: boolean;
  signals: { signalId: string; at: string }[];
  offers: { offerId: string; requestId: string; status: string; proposedAt: string }[];
  outcomes: { signalId: string; outcome: string; at: string }[];
  purchases: { offerId?: string | null }[];
  /** ISO instant this loop started. Null for the first loop: every row counts. */
  loopStartedAt: string | null;
}

/** ISO timestamps compare as strings, so no Date parsing is needed here. */
function since(loopStartedAt: string | null, at: string): boolean {
  return loopStartedAt === null || at >= loopStartedAt;
}

export function loopRoomFlags(e: LoopRoomEvidence): LoopRoomFlags {
  const signals = e.signals.filter((s) => since(e.loopStartedAt, s.at));
  const sentIds = new Set(signals.map((s) => s.signalId));
  const offers = e.offers.filter(
    (o) => sentIds.has(o.requestId) && since(e.loopStartedAt, o.proposedAt),
  );
  const approved = offers.filter((o) => o.status === 'approved');
  const boughtIds = new Set(
    e.outcomes
      .filter((o) => o.outcome === 'bought' && since(e.loopStartedAt, o.at))
      .map((o) => o.signalId),
  );
  return {
    itemAdded:
      e.ran.has('import_receipt') || (e.loopStartedAt === null && e.hasImportedPurchase),
    // A sent request proves a gap was found, even if find_gaps ran in another tab.
    gapFound: e.ran.has('find_gaps') || signals.length > 0,
    requestSent: signals.length > 0,
    offerApproved: approved.length > 0,
    bought: approved.some((o) => boughtIds.has(o.requestId)),
    attributed: e.purchases.some(
      (p) => p.offerId != null && approved.some((o) => o.offerId === p.offerId),
    ),
  };
}

export function patternLabel(p: {
  discountSensitivity: string;
  spendBand: string;
  brandLoyalty: string;
}): string {
  return `${p.discountSensitivity} · ${p.spendBand} · ${p.brandLoyalty}`;
}
