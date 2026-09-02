// The demand-signal bridge between the closet page and the merchant studio.
// Both routes are served from the same origin, so localStorage carries the
// signals: cross-tab via the native 'storage' event, same-tab via a custom
// event. Only zero-ID DemandSignal objects travel through here.
// ponytail: localStorage bridge; production would be a queue/API - the
// payload contract (DemandSignal) is the part that matters.
import { GARMENT_CATEGORIES, type DemandSignal, type GarmentCategory } from './closet';

const KEY = 'proofframe-demand-signals';
const EVENT = 'proofframe-signal';
const MAX_STORED = 50;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

const KINDS = new Set(['gap', 'fit', 'want']);
const CATEGORIES = new Set(GARMENT_CATEGORIES);

/** Rebuild a bounded, exact-key DemandSignal from untrusted storage, or null.
 * Extra keys (e.g. an injected shopperId) are dropped, enums enforced,
 * strings bounded, and the timestamp must parse. */
function toSignal(x: unknown): DemandSignal | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length > 64) return null;
  if (typeof s.kind !== 'string' || !KINDS.has(s.kind)) return null;
  if (typeof s.category !== 'string' || !CATEGORIES.has(s.category as GarmentCategory)) return null;
  if (typeof s.at !== 'string' || Number.isNaN(Date.parse(s.at))) return null;
  const size = typeof s.size === 'string' && s.size.length <= 20 ? s.size : null;
  const handle = typeof s.handle === 'string' && s.handle.length <= 80 ? s.handle : null;
  return {
    signalId: s.signalId,
    kind: s.kind as DemandSignal['kind'],
    category: s.category as GarmentCategory,
    size,
    handle,
    at: s.at,
  };
}

export function readSignals(): DemandSignal[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    // Validate shape on readback: corrupt same-origin storage must not
    // crash consumers or smuggle non-signal objects into the UI.
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toSignal).filter((s): s is DemandSignal => s !== null);
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
