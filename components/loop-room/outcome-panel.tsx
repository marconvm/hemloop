import {
  CheckCircle2,
  CircleDollarSign,
  EyeOff,
  ShoppingBag,
} from 'lucide-react';

import type { LoopRoomView } from '@/lib/proofframe/loop-room';

export function OutcomePanel({
  outcome,
}: {
  outcome: NonNullable<LoopRoomView['outcome']>;
}) {
  return (
    <section className="hlr-outcome" aria-labelledby="hlr-outcome-title">
      <div className="hlr-outcome-heading">
        <span>
          <CheckCircle2 aria-hidden="true" />
          Loop closed
        </span>
        <h2 id="hlr-outcome-title">
          Both sides learned. Neither side over-shared.
        </h2>
      </div>
      <div className="hlr-outcome-columns">
        <div>
          <h3>
            <ShoppingBag aria-hidden="true" />
            Customer gained
          </h3>
          <ul>
            {outcome.customerGained.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            <CircleDollarSign aria-hidden="true" />
            Merchant gained
          </h3>
          <ul>
            {outcome.merchantGained.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {outcome.patternBefore || outcome.patternAfter ? (
        <div className="hlr-pattern-shift">
          <span>
            <small>Pattern before</small>
            {outcome.patternBefore ?? 'Not enough signal'}
          </span>
          <ArrowRightSmall />
          <span>
            <small>Pattern after</small>
            {outcome.patternAfter ?? 'No change'}
          </span>
        </div>
      ) : null}
      <p className="hlr-nobody">
        <EyeOff aria-hidden="true" />
        <b>Nobody gained:</b> {outcome.nobodyGained}
      </p>
    </section>
  );
}

function ArrowRightSmall() {
  return (
    <span aria-hidden="true" className="hlr-pattern-arrow">
      →
    </span>
  );
}
