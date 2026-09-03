import {
  CheckCircle2,
  Clipboard,
  ListChecks,
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
  lastRan,
  onCopySay,
  onHumanGate,
}: {
  station: StationCardModel;
  processing?: ProcessingView | null;
  lastRan?: { label: string; tools: string[] } | null;
  onCopySay?: (prompt: string) => void;
  onHumanGate?: (station: StationKey) => void;
}) {
  const prompt = station.say;

  return (
    <article className="hlr-station">
      <div className="hlr-station-heading">
        <h2>{station.label}</h2>
        {processing || station.state === 'done' ? (
          <span className="hlr-station-state">
            {processing ? (
              <LoaderCircle className="is-spinning" />
            ) : (
              <CheckCircle2 />
            )}
            {processing ? 'Processing' : 'Done'}
          </span>
        ) : null}
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

      <div className="hlr-evidence-grid">
        <section>
          <span className="hlr-slot-label">
            <ListChecks aria-hidden="true" />
            What is true now
          </span>
          {station.facts.length ? (
            <dl className="hlr-updated-list">
              {station.facts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="hlr-empty">No facts reported for this step.</p>
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

      <section className="hlr-last-ran" aria-live="polite">
        <span className="hlr-slot-label">
          <Wrench aria-hidden="true" />
          Tool activity
        </span>
        {processing ? (
          <div className="hlr-processing">
            <LoaderCircle className="is-spinning" />
            <code>{processing.tool}</code>
            <small>{processing.label}</small>
          </div>
        ) : lastRan?.tools.length ? (
          <div className="hlr-last-ran-row">
            <small>Ran at {lastRan.label}</small>
            <div className="hlr-tool-chips">
              {lastRan.tools.map((tool) => (
                <code key={tool}>{tool}</code>
              ))}
            </div>
          </div>
        ) : (
          <p className="hlr-empty">Waiting for a real call.</p>
        )}
      </section>

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
