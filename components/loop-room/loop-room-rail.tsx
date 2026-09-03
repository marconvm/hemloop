import { Check } from 'lucide-react';

import type { StationCard } from '@/lib/proofframe/loop-room';

export function LoopRoomRail({ stations }: { stations: StationCard[] }) {
  return (
    <nav className="hlr-rail" aria-label="Loop progress">
      <div className="hlr-rail-line" aria-hidden="true" />
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
              <b>{station.label}</b>
              <small>
                {station.state === 'done'
                  ? 'Updated'
                  : station.state === 'current'
                    ? 'Now'
                    : 'Next'}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
