// The loop, as one object both surfaces can render.
//
// Hemloop's unique claim is not two dashboards, it is that ONE request has a
// complete lifecycle: a gap is found privately, one approved event leaves, a
// merchant answers it inside locked rules, a human buys, and the purchase
// carries the offer that won it. Before this, each page showed its own half and
// a visitor had to hold the join in their head (wave-4 review, Codex).
//
// Pure: no DOM, no storage, no clock. Each surface reads its own state and
// hands the flags in.

export type LoopStepKey = 'gap' | 'approved' | 'offer' | 'bought' | 'learned';
export type LoopStepState = 'done' | 'current' | 'todo';

export interface LoopFlags {
  /** The closet found something to shop for. */
  gapFound: boolean;
  /** A human approved one share and an event left the page. */
  requestSent: boolean;
  /** A human on the merchant side approved an offer for one of those requests. */
  offerApproved: boolean;
  /** The shopper marked an approved offer as Bought. */
  bought: boolean;
  /** That purchase carries the id of the offer that won it. */
  attributed: boolean;
}

export interface LoopStep {
  key: LoopStepKey;
  label: string;
  state: LoopStepState;
  /** Where the next action happens, when it is not on this surface. */
  surface: 'closet' | 'studio';
  href: string;
  /** What the person does next, shown only on the current step. */
  next: string;
}

const STEPS: {
  key: LoopStepKey;
  label: string;
  surface: 'closet' | 'studio';
  next: string;
}[] = [
  {
    key: 'gap',
    label: 'Gap',
    surface: 'closet',
    next: 'Ask the agent to call find_gaps on the closet.',
  },
  {
    key: 'approved',
    label: 'Approved request',
    surface: 'closet',
    next: 'Press Approve next request, then let the agent call report_demand_gap.',
  },
  {
    key: 'offer',
    label: 'Matched offer',
    surface: 'studio',
    next: 'In the studio, propose an offer for the request and approve it.',
  },
  {
    key: 'bought',
    label: 'Bought',
    surface: 'closet',
    next: 'Back in the closet, answer the approved offer with Bought or Passed.',
  },
  {
    key: 'learned',
    label: 'Learned',
    surface: 'closet',
    next: 'The purchase records the offer that won it; the next offer is shaped by it.',
  },
];

const HREF = { closet: '/closet', studio: '/studio' } as const;

/**
 * The five steps with their state. Steps complete in order, so a later flag
 * being true does not skip an earlier one: the first incomplete step is the
 * current one, and everything after it is still to do. When all five are done
 * there is no current step, which is what "the loop closed" looks like.
 */
export function loopSteps(flags: LoopFlags): LoopStep[] {
  const raw = [
    flags.gapFound,
    flags.requestSent,
    flags.offerApproved,
    flags.bought,
    flags.attributed,
  ];
  // A step is done only when every step before it is done too. The first
  // version read each flag independently, which let a stale or hand-written
  // storage row light steps 4 and 5 while step 1 was still current, and let
  // loopProgress report 2/5 for a loop that had not started (found by Codex on
  // acceptance replay - the comment above claimed this behaviour, the code did
  // not have it, and the regression test asserted the wrong shape under a name
  // that described the right one).
  let precededByDone = true;
  return STEPS.map((s, i) => {
    const done = precededByDone && raw[i] === true;
    if (!done) precededByDone = false;
    const state: LoopStepState = done
      ? 'done'
      : raw.slice(0, i).every(Boolean) && !raw[i]
        ? 'current'
        : 'todo';
    return { ...s, state, href: HREF[s.surface] };
  });
}

/** How far the loop got, for a progress read-out. */
export function loopProgress(steps: LoopStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.state === 'done').length, total: steps.length };
}
