import {
  CheckCircle2,
  Clipboard,
  ListChecks,
  LoaderCircle,
  Wrench,
} from 'lucide-react';
import { useRef, useState } from 'react';

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
  onCopySay?: (prompt: string) => Promise<boolean>;
  onHumanGate?: (station: StationKey) => void;
}) {
  const prompt = station.say;
  const hasPromptDetails = Boolean(prompt?.includes('\n'));
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const copyResetRef = useRef<number | null>(null);

  const handleCopy = async () => {
    if (!prompt) return;
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
    const ok = onCopySay ? await onCopySay(prompt) : false;
    if (ok) {
      setCopyState('copied');
      copyResetRef.current = window.setTimeout(() => {
        setCopyState('idle');
        copyResetRef.current = null;
      }, 1500);
      return;
    }
    if (hasPromptDetails) setPromptExpanded(true);
    const el = quoteRef.current;
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setCopyState('failed');
  };

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Select and copy'
        : `Copy${hasPromptDetails ? ' full prompt' : ' prompt'}`;

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
          <blockquote
            ref={quoteRef}
            className={
              hasPromptDetails && !promptExpanded ? 'is-collapsed' : undefined
            }
          >
            “{prompt}”
          </blockquote>
          <div className="hlr-say-actions">
            {hasPromptDetails ? (
              <button
                aria-expanded={promptExpanded}
                className="hlr-prompt-toggle"
                type="button"
                onClick={() => setPromptExpanded((current) => !current)}
              >
                {promptExpanded ? 'Show less' : 'Show all'}
              </button>
            ) : null}
            <button
              className="hlr-copy-prompt"
              type="button"
              aria-live="polite"
              onClick={() => {
                void handleCopy();
              }}
            >
              <Clipboard aria-hidden="true" />
              {copyLabel}
            </button>
          </div>
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
