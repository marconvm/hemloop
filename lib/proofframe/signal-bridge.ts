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

export function readSignals(): DemandSignal[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DemandSignal[]) : [];
  } catch {
    return [];
  }
}

export function appendSignal(signal: DemandSignal): void {
  if (!hasWindow()) return;
  try {
    const next = [signal, ...readSignals()].slice(0, MAX_STORED);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // storage unavailable (private mode etc.) - the closet still works,
    // the merchant just receives nothing.
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
