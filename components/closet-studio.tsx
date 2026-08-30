'use client';

import { Radio, Shirt, ShieldCheck, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';
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
  readSignals,
  subscribeSignals,
} from '@/lib/proofframe/signal-bridge';
import {
  buildClosetTools,
  registerClosetTools,
  type ClosetCallbacks,
  type GarmentInput,
} from '@/lib/proofframe/webmcp-closet';

type Trail = {
  id: number;
  actor: 'AI' | 'ME';
  title: string;
  detail: string;
};

type WebMcpStatus = 'checking' | 'active' | 'preview';

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
  const [shareApproved, setShareApproved] = useState(false);
  const shareApprovedRef = useRef(false);

  const pushTrail = useCallback((entry: Omit<Trail, 'id'>) => {
    setTrail((current) =>
      [{ ...entry, id: Date.now() + Math.random() }, ...current].slice(0, 6),
    );
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
      appendSignal(signal);
      pushTrail({
        actor: 'AI',
        title: 'Sent an approved zero-ID signal',
        detail: `${signal.kind} · ${signal.category}${signal.size ? ` · ${signal.size}` : ''}`,
      });
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

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const result = registerClosetTools(callbacks);
      setToolCount(
        result.registered.length > 0
          ? result.registered.length
          : buildClosetTools(callbacks).length,
      );
      setWebMcpStatus(result.registered.length > 0 ? 'active' : 'preview');
    });
    return () => {
      active = false;
    };
  }, [callbacks]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setSignals(readSignals());
    });
    const unsubscribe = subscribeSignals(() => setSignals(readSignals()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const gaps = useMemo(() => findGaps(wardrobe), [wardrobe]);
  const sizes = useMemo(() => sizesOwned(wardrobe), [wardrobe]);
  const statusLabel =
    webMcpStatus === 'active'
      ? `${toolCount} WebMCP tools live`
      : webMcpStatus === 'checking'
        ? 'Checking WebMCP…'
        : `${toolCount} tools · preview mode`;

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
          >
            <Sparkles data-icon="inline-start" />
            {statusLabel}
          </Badge>
          <Link className="cross-link" href="/studio">
            <Store data-icon="inline-start" aria-hidden="true" />
            Merchant studio
          </Link>
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
            What you own. The agent can use these rows for this task;
            Hemloop&apos;s merchant bridge has no field that can carry them.
          </p>
          <div className="garment-list">
            {wardrobe.garments.map((g) => (
              <div className="garment-card" key={g.id}>
                <span className="garment-cat">{g.category}</span>
                <strong>{g.brand}</strong>
                <span className="garment-meta">
                  {g.size} · {g.colour}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel" aria-label="Fit and gaps">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">What to shop for</p>
              <h2>Gaps &amp; sizes</h2>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="gap-list">
            {gaps.length === 0 ? (
              <p className="panel-intro">
                No gaps - the wardrobe covers every essential.
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
              <p className="eyebrow">The privacy bridge</p>
              <h2>Signals sent</h2>
            </div>
            <Radio aria-hidden="true" />
          </div>
          <p className="panel-intro">
            The bridge accepts only zero-ID demand events, and only after you
            approve one share. Each entry below is the complete payload.
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
                  ? 'Approved the next signal'
                  : 'Cancelled share approval',
                detail: shareApprovedRef.current
                  ? 'One report_demand_gap call may now cross the bridge.'
                  : 'Agent sharing is blocked again.',
              });
            }}
          >
            <ShieldCheck aria-hidden="true" />
            {shareApproved ? 'Next signal approved' : 'Approve next signal'}
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
              signals.map((s) => (
                <div className="activity-item" key={s.signalId}>
                  <span className="activity-marker agent-marker">
                    {s.kind.toUpperCase()}
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
              ))
            )}
          </div>
          <div className="activity-list closet-trail">
            <p className="eyebrow">Closet trail</p>
            {trail.map((item) => (
              <div className="activity-item" key={item.id}>
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
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
