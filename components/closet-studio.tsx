'use client';

import { Pencil, Radio, Shirt, ShieldCheck, Sparkles, Store, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { BRAND } from '@/lib/proofframe/brand';
import {
  findGaps,
  seedWardrobe,
  sizesOwned,
  type DemandSignal,
  type Garment,
  type Wardrobe,
} from '@/lib/proofframe/closet';
import {
  appendSignal,
  clearSignals,
  readSignals,
  subscribeSignals,
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

  const gaps = useMemo(() => findGaps(wardrobe), [wardrobe]);
  const sizes = useMemo(() => sizesOwned(wardrobe), [wardrobe]);
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
              <h2>Wardrobe · {wardrobe.garments.length}</h2>
            </div>
            <Shirt aria-hidden="true" />
          </div>
          <p className="panel-intro">
            What you own. The agent can use these rows for this task; the
            merchant bridge has no field that can carry them.
          </p>
          <div className="garment-list">
            {wardrobe.garments.map((g) => {
              const gv = g as GarmentView;
              const isEditing = editingId === g.id;
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
                  <span className="garment-cat">{g.category}</span>
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
                  ? 'One report_demand_gap call may now cross the bridge.'
                  : 'Agent sharing is blocked again.',
              });
            }}
          >
            <ShieldCheck aria-hidden="true" />
            {shareApproved ? 'Next request approved' : 'Approve next request'}
          </button>
          <p className="human-only-note">
            One-shot human approval · no WebMCP tool can arm it
          </p>
          <div className="activity-list" aria-live="polite">
            {signals.length === 0 ? (
              <p className="panel-intro">
                Nothing sent yet. Ask your agent to report a demand gap after a
                fit check.
              </p>
            ) : (
              signals.map((s) => {
                const isNew = newSignalIds.has(s.signalId);
                return (
                  <div
                    className={`activity-item ${isNew ? 'is-new' : ''}`}
                    key={s.signalId}
                  >
                    <span
                      className={`activity-marker ${s.kind === 'want' ? 'want-marker' : 'need-marker'}`}
                    >
                      {demandLabel(s.kind)}
                    </span>
                    <div>
                      <strong>
                        {s.category}
                        {s.size ? ` · ${s.size}` : ''}
                      </strong>
                      <p>
                        {s.handle
                          ? `product: ${s.handle}`
                          : 'no product attached'}
                      </p>
                      <small>
                        event #{s.signalId.slice(0, 8)} · no shopper ID or
                        wardrobe rows
                      </small>
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
