// The demand-signal bridge between the closet page and the merchant studio.
// Both routes are served from the same origin, so localStorage carries the
// signals: cross-tab via the native 'storage' event, same-tab via a custom
// event. Only zero-ID DemandSignal objects travel through here.
// ponytail: localStorage bridge; production would be a queue/API - the
// payload contract (DemandSignal) is the part that matters.
import {
  GARMENT_CATEGORIES,
  type ConsentField,
  type DemandSignal,
  type GarmentCategory,
  type Occasion,
  type ShopperProfile,
} from './closet';

const KEY = 'proofframe-demand-signals';
const EVENT = 'proofframe-signal';
const MAX_STORED = 50;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

const KINDS = new Set(['gap', 'fit', 'want']);
const CATEGORIES = new Set(GARMENT_CATEGORIES);
const LEVELS = new Set(['need', 'want']);
const OCCASIONS = new Set(['everyday', 'season', 'gift', 'event']);
const PROFILES = new Set(['self', 'partner', 'kid']);
const CONSENT_LEVELS = new Set([0, 1, 2, 3]);
const CONSENT_FIELDS = new Set<string>([
  'category',
  'size',
  'level',
  'handle',
  'occasion',
  'for',
  'fitPreference',
  'colourFamily',
  'avoidMaterials',
  'priceCeiling',
]);

/** Rebuild a bounded, exact-key DemandSignal from untrusted storage, or null.
 * Extra keys (e.g. an injected shopperId) are dropped, enums enforced,
 * strings bounded, and the timestamp must parse. Wave-2 fields (level,
 * consent, occasion, for, context, taste) get the same treatment: level and
 * consent are required, so a malformed one drops the whole record; the rest
 * are optional and are simply omitted when malformed. */
function toSignal(x: unknown): DemandSignal | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length > 64) return null;
  if (typeof s.kind !== 'string' || !KINDS.has(s.kind)) return null;
  if (typeof s.category !== 'string' || !CATEGORIES.has(s.category as GarmentCategory)) return null;
  if (typeof s.at !== 'string' || Number.isNaN(Date.parse(s.at))) return null;
  if (typeof s.level !== 'string' || !LEVELS.has(s.level)) return null;
  if (typeof s.consent !== 'object' || s.consent === null) return null;
  const rawConsent = s.consent as Record<string, unknown>;
  if (typeof rawConsent.level !== 'number' || !CONSENT_LEVELS.has(rawConsent.level)) return null;
  const rawFields = Array.isArray(rawConsent.fields) ? rawConsent.fields : [];
  const fields = rawFields.filter(
    (f): f is ConsentField => typeof f === 'string' && CONSENT_FIELDS.has(f),
  );

  const size = typeof s.size === 'string' && s.size.length <= 20 ? s.size : null;
  const handle = typeof s.handle === 'string' && s.handle.length <= 80 ? s.handle : null;

  const signal: DemandSignal = {
    signalId: s.signalId,
    kind: s.kind as DemandSignal['kind'],
    category: s.category as GarmentCategory,
    size,
    handle,
    at: s.at,
    level: s.level as DemandSignal['level'],
    consent: { level: rawConsent.level as 0 | 1 | 2 | 3, fields },
  };

  if (typeof s.occasion === 'string' && OCCASIONS.has(s.occasion)) {
    signal.occasion = s.occasion as Occasion;
  }
  if (typeof s.for === 'string' && PROFILES.has(s.for)) {
    signal.for = s.for as ShopperProfile;
  }
  if (typeof s.context === 'object' && s.context !== null) {
    const c = s.context as Record<string, unknown>;
    if (typeof c.fitPreference === 'string' && c.fitPreference.length <= 40) {
      signal.context = { fitPreference: c.fitPreference };
    }
  }
  if (typeof s.taste === 'object' && s.taste !== null) {
    const t = s.taste as Record<string, unknown>;
    const taste: NonNullable<DemandSignal['taste']> = {};
    if (typeof t.colourFamily === 'string' && t.colourFamily.length <= 60) {
      taste.colourFamily = t.colourFamily;
    }
    if (
      Array.isArray(t.avoidMaterials) &&
      t.avoidMaterials.every((m) => typeof m === 'string')
    ) {
      taste.avoidMaterials = (t.avoidMaterials as string[])
        .slice(0, 10)
        .filter((m) => m.length <= 40);
    }
    if (typeof t.priceCeiling === 'number' && Number.isFinite(t.priceCeiling)) {
      taste.priceCeiling = t.priceCeiling;
    }
    if (Object.keys(taste).length > 0) signal.taste = taste;
  }

  return signal;
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

// ---------- Outcomes: bought / passed on a sent signal (UI-only, no tool
// can write here - a shopper's purchase-or-not is never a WebMCP call). ----

export interface SignalOutcome {
  signalId: string;
  outcome: 'bought' | 'passed';
  at: string; // ISO timestamp
}

const OUTCOMES_KEY = 'hemloop.outcomes';
const OUTCOMES_EVENT = 'hemloop-outcome-signal';
const MAX_OUTCOMES = 50;

const OUTCOME_KINDS = new Set(['bought', 'passed']);

function toOutcome(x: unknown): SignalOutcome | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.signalId !== 'string' || s.signalId.length > 64) return null;
  if (typeof s.outcome !== 'string' || !OUTCOME_KINDS.has(s.outcome)) return null;
  if (typeof s.at !== 'string' || Number.isNaN(Date.parse(s.at))) return null;
  return {
    signalId: s.signalId,
    outcome: s.outcome as SignalOutcome['outcome'],
    at: s.at,
  };
}

export function readOutcomes(): SignalOutcome[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(OUTCOMES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toOutcome).filter((o): o is SignalOutcome => o !== null);
  } catch {
    return [];
  }
}

/** Append and VERIFY, mirroring appendSignal: only report success when the
 * outcome is actually readable back from storage. */
export function recordOutcome(outcome: SignalOutcome): boolean {
  if (!hasWindow()) return false;
  try {
    const next = [outcome, ...readOutcomes()].slice(0, MAX_OUTCOMES);
    window.localStorage.setItem(OUTCOMES_KEY, JSON.stringify(next));
    const delivered = readOutcomes().some(
      (o) => o.signalId === outcome.signalId && o.outcome === outcome.outcome,
    );
    if (delivered) window.dispatchEvent(new CustomEvent(OUTCOMES_EVENT));
    return delivered;
  } catch {
    return false;
  }
}

export function subscribeOutcomes(onChange: () => void): () => void {
  if (!hasWindow()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === OUTCOMES_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(OUTCOMES_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(OUTCOMES_EVENT, onChange);
  };
}

// ---------- Consent level: the sharing dial (0 Private .. 3 Taste). Stored
// only in this browser, default 1 (Basics). ----

const CONSENT_KEY = 'hemloop.consent';
const DEFAULT_CONSENT_LEVEL = 1;

function isConsentLevel(n: number): n is 0 | 1 | 2 | 3 {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

export function readConsentLevel(): 0 | 1 | 2 | 3 {
  if (!hasWindow()) return DEFAULT_CONSENT_LEVEL;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === null) return DEFAULT_CONSENT_LEVEL;
    const n = Number(raw);
    return isConsentLevel(n) ? n : DEFAULT_CONSENT_LEVEL;
  } catch {
    return DEFAULT_CONSENT_LEVEL;
  }
}

export function writeConsentLevel(level: 0 | 1 | 2 | 3): void {
  if (!hasWindow()) return;
  if (!isConsentLevel(level)) return;
  try {
    window.localStorage.setItem(CONSENT_KEY, String(level));
  } catch {
    /* ignore */
  }
}
