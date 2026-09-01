// The demand-signal bridge between the closet page and the merchant studio.
// Both routes are served from the same origin, so localStorage carries the
// signals: cross-tab via the native 'storage' event, same-tab via a custom
// event. Only zero-ID DemandSignal objects travel through here.
// ponytail: localStorage bridge; production would be a queue/API - the
// payload contract (DemandSignal) is the part that matters.
import type { DemandSignal } from './closet';

const KEY = 'proofframe-demand-signals';
const EVENT = 'proofframe-signal';
const MAX_STORED = 50;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function isSignalShaped(x: unknown): x is DemandSignal {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.signalId === 'string' &&
    typeof s.kind === 'string' &&
    typeof s.category === 'string' &&
    typeof s.at === 'string'
  );
}

export function readSignals(): DemandSignal[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    // Validate shape on readback: corrupt same-origin storage must not
    // crash consumers or smuggle non-signal objects into the UI.
    return Array.isArray(parsed) ? parsed.filter(isSignalShaped) : [];
  } catch {
    return [];
  }
}

/** Append and VERIFY. Returns true only when the signal is actually
 * readable back from storage — callers must not report delivery otherwise. */
export function appendSignal(signal: DemandSignal): boolean {
  if (!hasWindow()) return false;
  try {
    const next = [signal, ...readSignals()].slice(0, MAX_STORED);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    const delivered = readSignals().some((s) => s.signalId === signal.signalId);
    if (delivered) window.dispatchEvent(new CustomEvent(EVENT));
    return delivered;
  } catch {
    // storage unavailable (private mode etc.) - the closet still works,
    // the merchant just receives nothing. Approval stays consumed
    // (privacy fail-closed); the tool reports the failure honestly.
    return false;
  }
}

export function clearSignals(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/** Subscribe to signal changes from either tab. Returns an unsubscribe fn. */
export function subscribeSignals(onChange: () => void): () => void {
  if (!hasWindow()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}
