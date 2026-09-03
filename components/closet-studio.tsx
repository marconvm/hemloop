'use client';

import {
  Pencil,
  Radio,
  Shirt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { BRAND } from '@/lib/proofframe/brand';
import {
  consentFieldsForRequest,
  findGaps,
  garmentsForProfile,
  readPreferences,
  seedPreferences,
  seedWardrobe,
  sizesOwned,
  writePreferences,
  type ConsentField,
  type DemandSignal,
  type Garment,
  type Preferences,
  type ShopperProfile,
  type Wardrobe,
} from '@/lib/proofframe/closet';
import {
  appendSignal,
  clearSignals,
  readConsentLevel,
  readOutcomes,
  readSignals,
  recordOutcome,
  subscribeOutcomes,
  subscribeSignals,
  writeConsentLevel,
  type SignalOutcome,
} from '@/lib/proofframe/signal-bridge';
import {
  getModelContext,
  instrumentTools,
  registerAll,
  type ToolContent,
} from '@/lib/proofframe/webmcp';
import {
  buildClosetTools,
  type ClosetCallbacks,
  type GarmentInput,
} from '@/lib/proofframe/webmcp-closet';

// Optional fields another agent may add to Garment; treated as optional here
// so this component compiles standalone regardless of merge order.
type GarmentView = Garment & {
  image?: string;
  price?: number;
  currency?: string;
  retailer?: string;
  material?: string;
  purchasedAt?: string;
};

type Trail = {
  id: number;
  actor: 'AI' | 'ME';
  title: string;
  detail: string;
};

type WebMcpStatus = 'checking' | 'active' | 'preview' | 'error';

function demandLabel(kind: DemandSignal['kind']): 'Need' | 'Want' {
  return kind === 'want' ? 'Want' : 'Need';
}

// Verbatim from docs/GAP-ANALYSIS.md, "opt-in and consent as the product
// mechanic": the four sharing levels, what leaves the page at each, and
// what the shopper gains for it.
const CONSENT_LEVELS: {
  level: 0 | 1 | 2 | 3;
  label: string;
  leaves: string;
  gains: string;
}[] = [
  {
    level: 0,
    label: 'Private',
    leaves: 'nothing',
    gains: 'fit checks and gap finding stay local',
  },
  {
    level: 1,
    label: 'Basics',
    leaves: 'category, size, need or want',
    gains: 'offers in the right size',
  },
  {
    level: 2,
    label: 'Context',
    leaves: '+ occasion (season, gift, event), fit preference',
    gains: 'offers timed and cut for the occasion',
  },
  {
    level: 3,
    label: 'Taste',
    leaves: '+ colour family, materials to avoid, price ceiling',
    gains: 'creatives that match, no wasted offers',
  },
];

const FIELD_LABEL: Record<ConsentField, string> = {
  category: 'Category',
  size: 'Size',
  level: 'Need or want',
  handle: 'Product handle',
  occasion: 'Occasion',
  for: 'Shopping for',
  fitPreference: 'Fit preference',
  colourFamily: 'Colour family',
  avoidMaterials: 'Materials to avoid',
  priceCeiling: 'Price ceiling',
};

const PROFILE_LABEL: Record<ShopperProfile, string> = {
  self: 'Me',
  partner: 'Partner',
  kid: 'Kid',
};

const PROFILES: ShopperProfile[] = ['self', 'partner', 'kid'];

const FIT_PREFERENCES: Preferences['fitPreference'][] = [
  'slim',
  'regular',
  'relaxed',
  'oversized',
];

export function ClosetStudio() {
  const [wardrobe, setWardrobe] = useState<Wardrobe>(seedWardrobe);
  const wardrobeRef = useRef(wardrobe);
  const [trail, setTrail] = useState<Trail[]>([
    {
      id: 1,
      actor: 'ME',
      title: 'Wardrobe seeded',
      detail: '8 garments, private to this page.',
    },
  ]);
  const [signals, setSignals] = useState<DemandSignal[]>([]);
  const [webMcpStatus, setWebMcpStatus] = useState<WebMcpStatus>('checking');
  const [toolCount, setToolCount] = useState(0);
  const [toolCallCount, setToolCallCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [shareApproved, setShareApproved] = useState(false);
  const shareApprovedRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState('');
  const [editColour, setEditColour] = useState('');

  // Consent dial: 0 Private .. 3 Taste. Read once on mount (browser-only
  // storage), default 1 Basics.
  const [consentLevel, setConsentLevel] = useState<0 | 1 | 2 | 3>(1);
  const consentLevelRef = useRef<0 | 1 | 2 | 3>(1);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = readConsentLevel();
      consentLevelRef.current = stored;
      setConsentLevel(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Shopping-for profile switch. In-memory only; default 'self'.
  const [activeProfile, setActiveProfile] = useState<ShopperProfile>('self');
  const activeProfileRef = useRef<ShopperProfile>('self');

  // Preferences card. Deterministic seed on first render (SSR-safe), then
  // swapped for anything already stored in this browser once mounted.
  const [preferences, setPreferences] = useState<Preferences>(seedPreferences);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setPreferences(readPreferences());
    });
    return () => {
      active = false;
    };
  }, []);

  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([]);

  // Row ids that just appeared, so the GA-debugger flash plays once and only
  // once (never re-derived from a ref read during render).
  const prevSignalIdsRef = useRef<Set<string> | null>(null);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(new Set());
  const [newTrailIds, setNewTrailIds] = useState<Set<number>>(new Set());

  const pushTrail = useCallback((entry: Omit<Trail, 'id'>) => {
    const id = Date.now() + Math.random();
    setTrail((current) => [{ ...entry, id }, ...current].slice(0, 6));
    setNewTrailIds((current) => new Set(current).add(id));
  }, []);

  const addGarment = useCallback(
    (input: GarmentInput): Garment => {
      const garment: Garment = {
        id: `g-${Date.now().toString(36)}`,
        ...input,
        for: activeProfileRef.current,
      };
      const next = {
        ...wardrobeRef.current,
        garments: [...wardrobeRef.current.garments, garment],
      };
      wardrobeRef.current = next;
      setWardrobe(next);
      pushTrail({
        actor: 'AI',
        title: `Added ${input.category} to the wardrobe`,
        detail: `${input.brand} · ${input.size} · ${input.colour}`,
      });
      return garment;
    },
    [pushTrail],
  );

  const emitSignal = useCallback(
    (signal: DemandSignal) => {
      const delivered = appendSignal(signal);
      pushTrail({
        actor: 'AI',
        title: delivered
          ? 'Sent an approved zero-ID request'
          : 'Request approved but storage rejected it',
        detail: delivered
          ? `${signal.kind} · ${signal.category}${signal.size ? ` · ${signal.size}` : ''}`
          : 'Bridge unavailable; nothing was delivered.',
      });
      return delivered;
    },
    [pushTrail],
  );

  const consumeShareApproval = useCallback(() => {
    if (!shareApprovedRef.current) return false;
    shareApprovedRef.current = false;
    setShareApproved(false);
    return true;
  }, []);

  const callbacks = useMemo<ClosetCallbacks>(
    () => ({
      getWardrobe: () => wardrobeRef.current,
      addGarment,
      consumeShareApproval,
      emitSignal,
      getActiveProfile: () => activeProfileRef.current,
      getConsentLevel: () => consentLevelRef.current,
      getPreferences: () => preferencesRef.current,
    }),
    [addGarment, consumeShareApproval, emitSignal],
  );

  const handleToolCall = useCallback((name: string, result: ToolContent) => {
    setToolCallCount((n) => n + 1);
    const okValue = (result as { ok?: boolean }).ok;
    if (okValue === false) setBlockedCount((n) => n + 1);
    if (okValue === true && name === 'report_demand_gap') {
      setSentCount((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tools = instrumentTools(buildClosetTools(callbacks), handleToolCall);
    registerAll(getModelContext(), tools)
      .then((result) => {
        if (!active) return;
        setToolCount(
          result.registered.length > 0 ? result.registered.length : tools.length,
        );
        if (result.rejected.length > 0) {
          console.error('WebMCP registration rejected', result.rejected);
        }
        setWebMcpStatus(
          result.registered.length > 0
            ? 'active'
            : result.rejected.length > 0
              ? 'error'
              : 'preview',
        );
      })
      .catch((error) => {
        if (!active) return;
        console.error('WebMCP registration failed', error);
        setWebMcpStatus('error');
      });
    return () => {
      active = false;
    };
  }, [callbacks, handleToolCall]);

  const applySignals = useCallback((next: DemandSignal[]) => {
    const prev = prevSignalIdsRef.current;
    setNewSignalIds(
      prev === null
        ? new Set()
        : new Set(
            next.filter((s) => !prev.has(s.signalId)).map((s) => s.signalId),
          ),
    );
    prevSignalIdsRef.current = new Set(next.map((s) => s.signalId));
    setSignals(next);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) applySignals(readSignals());
    });
    const unsubscribe = subscribeSignals(() => applySignals(readSignals()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySignals]);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (active) setOutcomes(readOutcomes());
    };
    queueMicrotask(load);
    const unsubscribe = subscribeOutcomes(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setProfile = useCallback(
    (profile: ShopperProfile) => {
      if (profile === activeProfileRef.current) return;
      activeProfileRef.current = profile;
      setActiveProfile(profile);
      pushTrail({
        actor: 'ME',
        title: `Shopping for: ${PROFILE_LABEL[profile]}`,
        detail: 'Wardrobe, gaps, sizes and fit checks now scope to this profile.',
      });
    },
    [pushTrail],
  );

  const setConsent = useCallback(
    (level: 0 | 1 | 2 | 3) => {
      if (level === consentLevelRef.current) return;
      consentLevelRef.current = level;
      setConsentLevel(level);
      writeConsentLevel(level);
      const entry = CONSENT_LEVELS[level];
      pushTrail({
        actor: 'ME',
        title: `Sharing level set to ${level} (${entry.label})`,
        detail: `Leaves: ${entry.leaves}. Gains: ${entry.gains}.`,
      });
    },
    [pushTrail],
  );

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        writePreferences(next);
        return next;
      });
    },
    [],
  );

  const recordSignalOutcome = useCallback(
    (signal: DemandSignal, outcome: SignalOutcome['outcome']) => {
      const stamped: SignalOutcome = {
        signalId: signal.signalId,
        outcome,
        at: new Date().toISOString(),
      };
      const delivered = recordOutcome(stamped);
      if (delivered) setOutcomes((current) => [stamped, ...current]);
      pushTrail({
        actor: 'ME',
        title: delivered ? `Marked ${outcome}` : `Could not record ${outcome}`,
        detail: `${signal.category}${signal.size ? ` · ${signal.size}` : ''} · event #${signal.signalId.slice(0, 8)}`,
      });
    },
    [pushTrail],
  );

  const profileWardrobe = useMemo(
    () => garmentsForProfile(wardrobe, activeProfile),
    [wardrobe, activeProfile],
  );
  const gaps = useMemo(() => findGaps(profileWardrobe), [profileWardrobe]);
  const sizes = useMemo(() => sizesOwned(profileWardrobe), [profileWardrobe]);
  const outcomeBySignal = useMemo(() => {
    const map = new Map<string, SignalOutcome>();
    for (const o of outcomes) if (!map.has(o.signalId)) map.set(o.signalId, o);
    return map;
  }, [outcomes]);
  const previewFields = useMemo(
    () =>
      consentFieldsForRequest(consentLevel, {
        hasSize: true,
        hasHandle: true,
        hasOccasion: true,
      }),
    [consentLevel],
  );
  const statusLabel =
    webMcpStatus === 'active'
      ? `${toolCount} WebMCP tools live`
      : webMcpStatus === 'error'
        ? 'WebMCP registration rejected'
        : webMcpStatus === 'checking'
        ? 'Checking WebMCP…'
        : `${toolCount} tools · preview mode`;

  const startEdit = (g: Garment) => {
    setEditingId(g.id);
    setEditSize(g.size);
    setEditColour(g.colour);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const size = editSize.trim();
    const colour = editColour.trim();
    const next = {
      ...wardrobeRef.current,
      garments: wardrobeRef.current.garments.map((g) =>
        g.id === editingId
          ? { ...g, size: size || g.size, colour: colour || g.colour }
          : g,
      ),
    };
    wardrobeRef.current = next;
    setWardrobe(next);
    pushTrail({
      actor: 'ME',
      title: 'Edited a garment',
      detail: `${size || '(unchanged)'} · ${colour || '(unchanged)'}`,
    });
    setEditingId(null);
  };

  const deleteGarment = (id: string) => {
    const removed = wardrobeRef.current.garments.find((g) => g.id === id);
    const next = {
      ...wardrobeRef.current,
      garments: wardrobeRef.current.garments.filter((g) => g.id !== id),
    };
    wardrobeRef.current = next;
    setWardrobe(next);
    if (editingId === id) setEditingId(null);
    pushTrail({
      actor: 'ME',
      title: 'Deleted a garment',
      detail: removed ? `${removed.category} · ${removed.brand}` : id,
    });
  };

  const clearAll = () => {
    const empty: Wardrobe = { garments: [] };
    wardrobeRef.current = empty;
    setWardrobe(empty);
    clearSignals();
    setSignals([]);
    setEditingId(null);
    pushTrail({
      actor: 'ME',
      title: 'Cleared wardrobe and signal log',
      detail: 'Both were removed from this browser only.',
    });
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="brand-lockup">
          <div className="brand-mark closet-mark" aria-hidden="true">
            {BRAND.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Private shopper surface</p>
            <h1>Your Closet</h1>
          </div>
        </div>

        <div className="campaign-title">
          <span className="status-dot" aria-hidden="true" />
          Demo shopper · outbound sharing is human-gated
          <Badge className="status-badge">Synthetic demo</Badge>
        </div>

        <div className="header-actions">
          <Badge
            variant="outline"
            className={`webmcp-badge status-${webMcpStatus}`}
            title="WebMCP lets a browser agent call tools this page registers directly. No server, no account, no OAuth."
          >
            <Sparkles data-icon="inline-start" />
            {statusLabel}
          </Badge>
          <a className="cross-link" href="/studio">
            <Store data-icon="inline-start" aria-hidden="true" />
            Merchant studio
          </a>
        </div>
      </header>

      <section
        className="studio-grid closet-grid"
        aria-label="Closet workspace"
      >
        <aside className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Private</p>
              <h2>Wardrobe · {profileWardrobe.garments.length}</h2>
            </div>
            <Shirt aria-hidden="true" />
          </div>
          <p className="panel-intro">
            What you own. The agent can use these rows for this task; the
            merchant bridge has no field that can carry them.
          </p>
          <fieldset className="profile-switch">
            <legend className="profile-switch-label">
              <Users aria-hidden="true" />
              Shopping for
            </legend>
            {PROFILES.map((profile) => (
              <button
                key={profile}
                type="button"
                className={`profile-tab ${activeProfile === profile ? 'active' : ''}`}
                onClick={() => setProfile(profile)}
                aria-pressed={activeProfile === profile}
                title={`Show wardrobe, gaps, sizes and fit checks for ${PROFILE_LABEL[profile]}.`}
              >
                {PROFILE_LABEL[profile]}
              </button>
            ))}
          </fieldset>
          <div className="garment-list">
            {profileWardrobe.garments.map((g) => {
              const gv = g as GarmentView;
              const isEditing = editingId === g.id;
              const forTag = g.for && g.for !== 'self' ? PROFILE_LABEL[g.for] : null;
              return (
                <div className="garment-card" key={g.id}>
                  {gv.image ? (
                    // oxlint-disable-next-line next/no-img-element -- static demo asset, no next/image loader configured
                    <img
                      src={gv.image}
                      alt={`${g.category} ${g.brand}`}
                      className="garment-thumb"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="garment-cat">
                    {g.category}
                    {forTag ? <span className="for-tag">{forTag}</span> : null}
                  </span>
                  {isEditing ? (
                    <div className="garment-edit-form">
                      <label>
                        <span>Size</span>
                        <input
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Colour</span>
                        <input
                          value={editColour}
                          onChange={(e) => setEditColour(e.target.value)}
                        />
                      </label>
                      <div className="garment-edit-actions">
                        <button type="button" onClick={saveEdit}>
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <strong>{g.brand}</strong>
                      <span className="garment-meta">
                        Size: {g.size} · Colour: {g.colour}
                      </span>
                      <div className="garment-row-actions">
                        <button
                          type="button"
                          className="garment-icon-button"
                          onClick={() => startEdit(g)}
                          aria-label={`Edit ${g.brand} ${g.category}`}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="garment-icon-button danger"
                          onClick={() => deleteGarment(g.id)}
                          aria-label={`Delete ${g.brand} ${g.category}`}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="panel-heading preferences-heading">
            <div>
              <p className="eyebrow">Private</p>
              <h2>Preferences</h2>
            </div>
            <SlidersHorizontal aria-hidden="true" />
          </div>
          <p className="panel-intro">
            What kind of thing you like. Stays on this page unless the
            sharing level lets a field travel with a request.
          </p>
          <div className="preferences-card">
            <label className="preference-chip">
              <span title="How close-fitting you like clothes to be.">Fit</span>
              <select
                value={preferences.fitPreference}
                onChange={(e) =>
                  updatePreferences({
                    fitPreference: e.target.value as Preferences['fitPreference'],
                  })
                }
              >
                {FIT_PREFERENCES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="preference-chip">
              <span>Colour family</span>
              <input
                value={preferences.colourFamily}
                onChange={(e) => updatePreferences({ colourFamily: e.target.value })}
              />
            </label>
            <label className="preference-chip">
              <span>Materials to avoid</span>
              <input
                value={preferences.avoidMaterials.join(', ')}
                onChange={(e) =>
                  updatePreferences({
                    avoidMaterials: e.target.value
                      .split(',')
                      .map((m) => m.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label className="preference-chip">
              <span>Price ceiling</span>
              <input
                type="number"
                min={0}
                value={preferences.priceCeiling}
                onChange={(e) =>
                  updatePreferences({ priceCeiling: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="preference-chip">
              <span>Brands liked</span>
              <input
                value={preferences.likedBrands.join(', ')}
                onChange={(e) =>
                  updatePreferences({
                    likedBrands: e.target.value
                      .split(',')
                      .map((b) => b.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        </aside>

        <section className="panel" aria-label="Fit and gaps">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">What to shop for</p>
              <h2>Missing and thin</h2>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="gap-list">
            {gaps.length === 0 ? (
              <p className="panel-intro">
                No gaps, the wardrobe covers every essential.
              </p>
            ) : (
              gaps.map((gap) => (
                <div className="gap-card" key={gap.category}>
                  <strong>{gap.category}</strong>
                  <span>{gap.reason}</span>
                </div>
              ))
            )}
          </div>
          <div className="sizes-table">
            <p className="eyebrow">Sizes on file</p>
            {sizes.map((row) => (
              <div
                className="size-row"
                key={`${row.brand}-${row.category}-${row.size}`}
              >
                <span>{row.brand}</span>
                <span>{row.category}</span>
                <strong>{row.size}</strong>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">What leaves this page</p>
              <h2>Requests sent</h2>
              <p
                className="tool-counter"
                title="A tool call is one request from a browser agent to a WebMCP tool registered on this page, accepted or blocked."
              >
                {toolCallCount} tool call{toolCallCount === 1 ? '' : 's'} ·{' '}
                {sentCount} sent · {blockedCount} blocked
              </p>
            </div>
            <Radio aria-hidden="true" />
          </div>
          <p className="panel-intro">
            Only one request at a time can leave, and only after you approve
            it. Each entry below is the complete{' '}
            <span title="The exact data sent in one message, nothing more.">
              payload
            </span>
            .
          </p>

          <fieldset className="consent-dial">
            <legend className="sr-only">Sharing level</legend>
            {CONSENT_LEVELS.map((entry) => (
              <button
                key={entry.level}
                type="button"
                className={`consent-segment ${consentLevel === entry.level ? 'active' : ''}`}
                onClick={() => setConsent(entry.level)}
                aria-pressed={consentLevel === entry.level}
                title={`Level ${entry.level} ${entry.label}. Leaves: ${entry.leaves}. Gains: ${entry.gains}.`}
              >
                {entry.level} {entry.label}
              </button>
            ))}
          </fieldset>
          <div className="consent-copy">
            <div>
              <p className="eyebrow">What leaves</p>
              <p>{CONSENT_LEVELS[consentLevel].leaves}</p>
            </div>
            <div>
              <p className="eyebrow">What you gain</p>
              <p>{CONSENT_LEVELS[consentLevel].gains}</p>
            </div>
          </div>

          <div className="payload-preview">
            <p className="eyebrow">Payload preview</p>
            {previewFields.length === 0 ? (
              <p className="panel-intro">Nothing. Sharing is set to Private.</p>
            ) : (
              <ul>
                {previewFields.map((f) => (
                  <li key={f}>{FIELD_LABEL[f]}</li>
                ))}
              </ul>
            )}
          </div>

          {consentLevel === 0 ? (
            <>
              <button type="button" className="share-approval" disabled>
                <ShieldCheck aria-hidden="true" />
                Approve next request (level 0)
              </button>
              <p className="human-only-note">
                Sharing is set to Private. Raise the level above to approve a
                request.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`share-approval ${shareApproved ? 'armed' : ''}`}
                onClick={() => {
                  shareApprovedRef.current = !shareApprovedRef.current;
                  setShareApproved(shareApprovedRef.current);
                  pushTrail({
                    actor: 'ME',
                    title: shareApprovedRef.current
                      ? 'Approved the next request'
                      : 'Cancelled share approval',
                    detail: shareApprovedRef.current
                      ? `One report_demand_gap call may now cross the bridge at level ${consentLevel}.`
                      : 'Agent sharing is blocked again.',
                  });
                }}
              >
                <ShieldCheck aria-hidden="true" />
                {shareApproved
                  ? `Next request approved (level ${consentLevel})`
                  : `Approve next request (level ${consentLevel})`}
              </button>
              <p className="human-only-note">
                One-shot human approval · no WebMCP tool can arm it
              </p>
            </>
          )}
          <div className="activity-list" aria-live="polite">
            {signals.length === 0 ? (
              <p className="panel-intro">
                Nothing sent yet. Ask your agent to report a demand gap after a
                fit check.
              </p>
            ) : (
              signals.map((s) => {
                const isNew = newSignalIds.has(s.signalId);
                const outcome = outcomeBySignal.get(s.signalId);
                return (
                  <div
                    className={`activity-item ${isNew ? 'is-new' : ''}`}
                    key={s.signalId}
                  >
                    <span
                      className={`activity-marker ${s.kind === 'want' ? 'want-marker' : 'need-marker'}`}
                      title={
                        s.kind === 'want'
                          ? 'Want: the shopper likes it but does not need it.'
                          : 'Need: a gap or a fit check found this missing.'
                      }
                    >
                      {demandLabel(s.kind)}
                    </span>
                    <div>
                      <strong>
                        Category: {s.category}
                        {s.size ? ` · Size: ${s.size}` : ''}
                      </strong>
                      <p>
                        {s.handle
                          ? `Product: ${s.handle}`
                          : 'No product attached'}
                        {s.occasion ? ` · Occasion: ${s.occasion}` : ''}
                        {s.for && s.for !== 'self' ? ` · For: ${PROFILE_LABEL[s.for]}` : ''}
                      </p>
                      <small>
                        event #{s.signalId.slice(0, 8)} · sharing level {s.consent.level}{' '}
                        · no shopper ID or wardrobe rows
                      </small>
                      <div className="outcome-row">
                        {outcome ? (
                          <span className={`outcome-label outcome-${outcome.outcome}`}>
                            {outcome.outcome === 'bought' ? 'Bought' : 'Passed'}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="outcome-button outcome-bought"
                              onClick={() => recordSignalOutcome(s, 'bought')}
                            >
                              <ThumbsUp aria-hidden="true" />
                              Bought
                            </button>
                            <button
                              type="button"
                              className="outcome-button outcome-passed"
                              onClick={() => recordSignalOutcome(s, 'passed')}
                            >
                              <ThumbsDown aria-hidden="true" />
                              Passed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="activity-list closet-trail">
            <p className="eyebrow">Activity log</p>
            {trail.map((item) => {
              const isNew = newTrailIds.has(item.id);
              return (
                <div
                  className={`activity-item ${isNew ? 'is-new' : ''}`}
                  key={item.id}
                >
                  <span
                    className={`activity-marker ${item.actor === 'AI' ? 'agent-marker' : 'human-marker'}`}
                  >
                    {item.actor}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="clear-all-button" onClick={clearAll}>
            <Trash2 aria-hidden="true" />
            Clear wardrobe and signal log
          </button>
          <p className="human-only-note">
            Wardrobe rows and the signal log live in this browser only.
            Nothing is stored on a server. Clearing removes both.
          </p>
        </aside>
      </section>
    </main>
  );
}
