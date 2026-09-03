import { LockKeyhole, UserRoundCheck } from 'lucide-react';

import type { StationKey } from '@/lib/proofframe/loop-room';

export function GateButton({
  station,
  label,
  hint,
  onApprove,
}: {
  station: StationKey;
  label: string;
  hint: string;
  onApprove?: (station: StationKey) => void;
}) {
  return (
    <div className="hlr-gate">
      <div className="hlr-gate-copy">
        <LockKeyhole aria-hidden="true" />
        <span>
          <b>Human decision</b>
          {hint}
        </span>
      </div>
      <button
        className="hlr-gate-button"
        type="button"
        onClick={() => onApprove?.(station)}
      >
        <UserRoundCheck aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}
