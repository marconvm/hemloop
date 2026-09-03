import {
  Bot,
  CheckCircle2,
  Clipboard,
  LoaderCircle,
  Wrench,
} from 'lucide-react';

import type {
  StationCard as StationCardModel,
  StationKey,
} from '@/lib/proofframe/loop-room';

import { GateButton } from './gate-button';
import type { ProcessingView } from './types';

export function StationCard({
  station,
  processing,
  onCopySay,
  onHumanGate,
}: {
  station: StationCardModel;
  processing?: ProcessingView | null;
  onCopySay?: (prompt: string) => void;
  onHumanGate?: (station: StationKey) => void;
}) {
  const prompt = station.say;

  return (
    <article className="hlr-station" key={station.key}>
      <div className="hlr-station-heading">
        <div>
          <p>
            {station.state === 'done'
              ? 'Step updated'
              : station.state === 'current'
                ? 'Working now'
                : 'Coming next'}
          </p>
          <h2>{station.title}</h2>
        </div>
        <span className={`hlr-station-state is-${station.state}`}>
          {processing ? (
            <LoaderCircle className="is-spinning" />
          ) : station.state === 'done' ? (
            <CheckCircle2 />
          ) : (
            <Bot />
          )}
          {processing ? 'Processing' : station.state}
        </span>
      </div>

      {prompt ? (
        <div className="hlr-say">
          <span>Say this to the agent</span>
          <blockquote>“{prompt}”</blockquote>
          <button type="button" onClick={() => onCopySay?.(prompt)}>
            <Clipboard aria-hidden="true" />
            Copy prompt
          </button>
        </div>
      ) : null}

      <div className="hlr-result-grid">
        <section>
          <span className="hlr-slot-label">
            <Wrench aria-hidden="true" />
            Tool that ran
          </span>
          {processing ? (
            <div className="hlr-processing">
              <LoaderCircle className="is-spinning" />
              <code>{processing.tool}</code>
              <small>{processing.label}</small>
            </div>
          ) : station.toolsRan.length ? (
            <div className="hlr-tool-chips">
              {station.toolsRan.map((tool) => (
                <code key={tool}>{tool}</code>
              ))}
            </div>
          ) : (
            <p className="hlr-empty">Waiting for a real call.</p>
          )}
        </section>
        <section>
          <span className="hlr-slot-label">
            <CheckCircle2 aria-hidden="true" />
            What updated
          </span>
          {station.updated.length ? (
            <dl className="hlr-updated-list">
              {station.updated.map((fact) => (
                <div key={`${fact.label}-${fact.value}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="hlr-empty">Nothing changes until the call lands.</p>
          )}
        </section>
      </div>

      {station.humanGate ? (
        <GateButton
          station={station.key}
          label={station.humanGate.label}
          hint={station.humanGate.hint}
          onApprove={onHumanGate}
        />
      ) : null}
    </article>
  );
}
