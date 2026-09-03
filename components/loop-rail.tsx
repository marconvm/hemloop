'use client';

import { loopProgress, loopSteps, type LoopFlags } from '@/lib/proofframe/loop';

/** The same rail on both surfaces, so the two pages read as one workflow
 * rather than two prototypes. The current step names the next human action and
 * links to the surface where it happens. */
export function LoopRail({
  flags,
  surface,
}: {
  flags: LoopFlags;
  surface: 'closet' | 'studio';
}) {
  const steps = loopSteps(flags);
  const { done, total } = loopProgress(steps);
  const current = steps.find((s) => s.state === 'current');

  return (
    <nav
      className="loop-rail"
      aria-label={`Request lifecycle, ${done} of ${total} steps complete`}
    >
      <ol>
        {steps.map((s) => {
          const elsewhere = s.state === 'current' && s.surface !== surface;
          const body = (
            <>
              <span className="loop-dot" aria-hidden="true" />
              <span className="loop-label">{s.label}</span>
            </>
          );
          return (
            <li key={s.key} className={`loop-step is-${s.state}`}>
              {elsewhere ? (
                <a href={s.href} title={s.next}>
                  {body}
                </a>
              ) : (
                <span title={s.state === 'current' ? s.next : undefined}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="loop-next">
        {current ? (
          <>
            <strong>Next:</strong> {current.next}
          </>
        ) : (
          <>
            <strong>Loop closed.</strong> The purchase carries the offer that won it.
          </>
        )}
      </p>
    </nav>
  );
}
