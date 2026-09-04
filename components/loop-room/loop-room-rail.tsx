import { Check } from 'lucide-react';

import type { StationCard, StationKey } from '@/lib/proofframe/loop-room';

const SHORT_LABEL: Record<StationKey, string> = {
  item: 'Item',
  gap: 'Gap',
  approved: 'Approve',
  offer: 'Offer',
  bought: 'Bought',
  learned: 'Learned',
  again: 'Again',
};

export function LoopRoomRail({
  stations,
  processing,
}: {
  stations: StationCard[];
  processing: boolean;
}) {
  const currentIndex = stations.findIndex(
    (station) => station.state === 'current',
  );
  const focusIndex = currentIndex >= 0 ? currentIndex : stations.length - 1;
  const focused = stations[focusIndex];

  return (
    <nav className="hlr-rail" aria-label="Loop progress">
      {focused ? (
        <p className="hlr-rail-summary">
          <span className="hlr-rail-node" aria-hidden="true">
            {focused.state === 'done' ? <Check /> : focusIndex + 1}
          </span>
          <span>
            <small>
              {currentIndex >= 0
                ? `Step ${focusIndex + 1} of ${stations.length}`
                : 'Loop complete'}
            </small>
            <b>{focused.label}</b>
          </span>
          {processing ? <em>Processing</em> : null}
        </p>
      ) : null}
      <ol>
        {stations.map((station, index) => (
          <li
            aria-current={station.state === 'current' ? 'step' : undefined}
            className={`hlr-rail-step is-${station.state}`}
            key={station.key}
          >
            <span className="hlr-rail-node" aria-hidden="true">
              {station.state === 'done' ? <Check /> : index + 1}
            </span>
            <span className="hlr-rail-copy">
              <b>
                {station.state === 'todo'
                  ? SHORT_LABEL[station.key]
                  : station.label}
              </b>
              {station.state === 'done' ? <small>Done</small> : null}
              {station.state === 'current' && processing ? (
                <small>Processing</small>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
