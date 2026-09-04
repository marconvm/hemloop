'use client';

import { useRef } from 'react';

import { ToolManifestContent } from './tool-manifest-dialog';
import type { RuntimeToolView } from './types';

export function RuntimeStatus({
  live,
  toolCount,
  tools,
  absent,
  label,
}: {
  live: boolean;
  toolCount: number;
  tools: RuntimeToolView[];
  absent: string[];
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className={`hlr-header-runtime ${live ? 'is-live' : 'is-preview'}`}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="hlr-live-dot" aria-hidden="true" />
        <strong>
          {label ?? `WebMCP ${live ? 'live' : 'preview'}`}
          <span aria-hidden="true"> · </span>
        </strong>
        <b>{toolCount} tools</b>
      </button>
      <dialog
        aria-labelledby="hlr-tool-dialog-title-header"
        className="hlr-tool-dialog hlr-tool-dialog-header"
        ref={dialogRef}
      >
        <ToolManifestContent
          absent={absent}
          onClose={() => dialogRef.current?.close()}
          titleId="hlr-tool-dialog-title-header"
          tools={tools}
        />
      </dialog>
    </>
  );
}
