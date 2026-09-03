import { ArrowRight, Sparkles } from 'lucide-react';

import type { LoopCreative } from './types';

export function CreativeCard({
  creative,
  emptyCopy,
}: {
  creative?: LoopCreative | null;
  emptyCopy: string;
}) {
  if (!creative) {
    return (
      <div className="hlr-creative-empty">
        <Sparkles aria-hidden="true" />
        <p>{emptyCopy}</p>
      </div>
    );
  }

  return (
    <article className={`hlr-creative is-${creative.kind}`}>
      {creative.image ? (
        // oxlint-disable-next-line next/no-img-element -- static or validated bridge asset; no image loader configured
        <img src={creative.image} alt={creative.alt ?? creative.title} />
      ) : (
        <div className="hlr-creative-placeholder">
          <Sparkles aria-hidden="true" />
        </div>
      )}
      <div className="hlr-creative-shade" />
      <div className="hlr-creative-copy">
        <span>{creative.kicker}</span>
        <h3>{creative.title}</h3>
        {creative.detail ? <p>{creative.detail}</p> : null}
        {creative.href ? (
          <a href={creative.href}>
            Open checkout <ArrowRight aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
