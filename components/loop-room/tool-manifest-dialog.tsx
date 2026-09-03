'use client';

import { LockKeyhole, X } from 'lucide-react';
import { useRef } from 'react';

import type { RuntimeToolView } from './types';

export function ToolManifestDialog({
  live,
  tools,
  absent,
}: {
  live: boolean;
  tools: RuntimeToolView[];
  absent: string[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className="hlr-runtime-pill"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className={live ? 'is-live' : 'is-preview'} aria-hidden="true" />
        <span>{live ? 'WebMCP room live' : 'Tool map'}</span>
        <b>{tools.length} tools</b>
      </button>
      <dialog
        aria-labelledby="hlr-tool-dialog-title"
        className="hlr-tool-dialog"
        ref={dialogRef}
      >
        <div className="hlr-dialog-card">
          <header>
            <div>
              <p>Runtime contract</p>
              <h2 id="hlr-tool-dialog-title">What the agent can actually do</h2>
            </div>
            <button
              type="button"
              aria-label="Close tool manifest"
              onClick={() => dialogRef.current?.close()}
            >
              <X />
            </button>
          </header>
          <p className="hlr-dialog-intro">
            Read from this page&apos;s WebMCP runtime. Human approval controls
            are deliberately absent.
          </p>
          <div className="hlr-manifest-list">
            {tools.length ? (
              tools.map((tool) => (
                <article key={tool.name}>
                  <span className={tool.readOnly ? 'is-read' : 'is-write'}>
                    {tool.readOnly ? 'Read' : 'Act'}
                  </span>
                  <div>
                    <code>{tool.name}</code>
                    <p>{tool.description}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="hlr-manifest-empty">
                No runtime tools were reported by this browser.
              </p>
            )}
          </div>
          <div className="hlr-absent-tools">
            <LockKeyhole aria-hidden="true" />
            <span>
              <b>Human-only by design</b>
              {absent.length
                ? absent.map((name) => <code key={name}>{name}</code>)
                : 'No approval tools exposed.'}
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
