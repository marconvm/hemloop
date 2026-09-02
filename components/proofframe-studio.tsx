'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Shirt,
  Sparkles,
  UnlockKeyhole,
  WandSparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/proofframe/brand';
import { exportComposition } from '@/lib/proofframe/exporter';
import { seedCampaign } from '@/lib/proofframe/seed';
import { makeCatalogImporter } from '@/lib/proofframe/shopify';
import type { DemandSignal } from '@/lib/proofframe/closet';
import { readSignals, subscribeSignals } from '@/lib/proofframe/signal-bridge';
import type { CampaignState, Scene } from '@/lib/proofframe/types';
import { validateCampaign } from '@/lib/proofframe/validator';
import {
  buildTools,
  registerProofFrameTools,
  type ProofFrameCallbacks,
  type SceneInput,
} from '@/lib/proofframe/webmcp';

type Activity = {
  id: number;
  actor: 'AI' | 'MC' | 'PF';
  title: string;
  detail: string;
  status: 'agent' | 'human' | 'blocked' | 'system';
  at: string;
};

type WebMcpStatus = 'checking' | 'active' | 'preview' | 'error';

const initialActivity: Activity[] = [
  {
    id: 1,
    actor: 'AI',
    title: 'Drafted a four-scene storyboard',
    detail: 'Used the synthetic brief and product facts.',
    status: 'agent',
    at: 'READY',
  },
  {
    id: 2,
    actor: 'MC',
    title: 'Locked campaign truth',
    detail: 'Agents can use these facts but cannot rewrite them.',
    status: 'human',
    at: 'HUMAN ONLY',
  },
];

function timeLabel() {
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function sceneAtTime(scenes: Scene[], time: number) {
  let cursor = 0;
  for (const scene of scenes) {
    if (time < cursor + scene.durationSec) return scene;
    cursor += scene.durationSec;
  }
  return scenes.at(-1);
}

function sceneStart(scenes: Scene[], id: string) {
  let cursor = 0;
  for (const scene of scenes) {
    if (scene.id === id) return cursor;
    cursor += scene.durationSec;
  }
  return 0;
}

function money(value: number | null, currency: string) {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(value);
}

export function ProofFrameStudio() {
  const [campaign, setCampaign] = useState<CampaignState>(seedCampaign);
  const campaignRef = useRef(campaign);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [selectedId, setSelectedId] = useState(campaign.scenes[0]?.id ?? '');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [webMcpStatus, setWebMcpStatus] = useState<WebMcpStatus>('checking');
  const [registeredCount, setRegisteredCount] = useState(0);
  const [signals, setSignals] = useState<DemandSignal[]>([]);

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

  const pushActivity = useCallback((entry: Omit<Activity, 'id' | 'at'>) => {
    setActivity((current) =>
      [
        { ...entry, id: Date.now() + Math.random(), at: timeLabel() },
        ...current,
      ].slice(0, 6),
    );
  }, []);

  const commit = useCallback(
    (transform: (current: CampaignState) => CampaignState) => {
      const next = transform(campaignRef.current);
      campaignRef.current = next;
      setCampaign(next);
    },
    [],
  );

  const agentSetBrief = useCallback(
    (brief: string) => {
      commit((current) => ({ ...current, brief }));
      pushActivity({
        actor: 'AI',
        title: 'Updated the creative brief',
        detail: brief,
        status: 'agent',
      });
    },
    [commit, pushActivity],
  );

  const agentAddScene = useCallback(
    (input: SceneInput) => {
      const ids = new Set(campaignRef.current.scenes.map((scene) => scene.id));
      let suffix = campaignRef.current.scenes.length + 1;
      let id = `scene-${suffix}`;
      while (ids.has(id)) id = `scene-${++suffix}`;
      const scene: Scene = { id, ...input };
      commit((current) => ({ ...current, scenes: [...current.scenes, scene] }));
      setSelectedId(id);
      pushActivity({
        actor: 'AI',
        title: `Added ${input.kind} scene`,
        detail: input.heading,
        status: 'agent',
      });
      return scene;
    },
    [commit, pushActivity],
  );

  const agentUpdateScene = useCallback(
    (id: string, patch: Partial<SceneInput>) => {
      commit((current) => ({
        ...current,
        scenes: current.scenes.map((scene) =>
          scene.id === id ? { ...scene, ...patch } : scene,
        ),
      }));
      setSelectedId(id);
      pushActivity({
        actor: 'AI',
        title: `Updated scene “${id}”`,
        detail: 'The validated change is visible in the canvas.',
        status: 'agent',
      });
    },
    [commit, pushActivity],
  );

  const agentReorderScenes = useCallback(
    (orderedIds: string[]) => {
      commit((current) => ({
        ...current,
        scenes: orderedIds
          .map((id) => current.scenes.find((scene) => scene.id === id))
          .filter((scene): scene is Scene => Boolean(scene)),
      }));
      pushActivity({
        actor: 'AI',
        title: 'Reordered the storyboard',
        detail: orderedIds.join(' → '),
        status: 'agent',
      });
    },
    [commit, pushActivity],
  );

  const agentSeekPreview = useCallback(
    (tSec: number) => {
      setPlayhead(tSec);
      const scene = sceneAtTime(campaignRef.current.scenes, tSec);
      if (scene) setSelectedId(scene.id);
      pushActivity({
        actor: 'AI',
        title: `Seeked preview to ${tSec.toFixed(1)}s`,
        detail: 'Deterministic seek: the same time returns the same scene.',
        status: 'agent',
      });
    },
    [pushActivity],
  );

  const agentImportProduct = useCallback(
    (handle: string) => {
      if (campaignRef.current.factsLocked) {
        throw new Error(
          'Campaign truth is locked. Ask the human to unlock it before importing a product.',
        );
      }
      const facts = makeCatalogImporter(() => campaignRef.current.facts)(
        handle,
      );
      commit((current) => ({ ...current, facts }));
      pushActivity({
        actor: 'AI',
        title: `Imported “${facts.productName}” from the store snapshot`,
        detail:
          facts.salePrice === null
            ? `${facts.currency} ${facts.regularPrice.toFixed(2)}`
            : `${facts.currency} ${facts.regularPrice.toFixed(2)} → ${facts.salePrice.toFixed(2)} (${facts.discountPercent}% off)`,
        status: 'agent',
      });
      return facts;
    },
    [commit, pushActivity],
  );

  const callbacks = useMemo<ProofFrameCallbacks>(
    () => ({
      getState: () => campaignRef.current,
      setBrief: agentSetBrief,
      addScene: agentAddScene,
      updateScene: agentUpdateScene,
      reorderScenes: agentReorderScenes,
      seekPreview: agentSeekPreview,
      importProduct: agentImportProduct,
    }),
    [
      agentAddScene,
      agentImportProduct,
      agentReorderScenes,
      agentSeekPreview,
      agentSetBrief,
      agentUpdateScene,
    ],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const result = registerProofFrameTools(callbacks);
        setRegisteredCount(
          result.registered.length > 0
            ? result.registered.length
            : buildTools(callbacks).length,
        );
        setWebMcpStatus(result.registered.length > 0 ? 'active' : 'preview');
      } catch (error) {
        console.error('WebMCP registration failed', error);
        setWebMcpStatus('error');
      }
    });
    return () => {
      active = false;
    };
  }, [callbacks]);

  const totalDuration = useMemo(
    () => campaign.scenes.reduce((sum, scene) => sum + scene.durationSec, 0),
    [campaign.scenes],
  );
  const violations = useMemo(() => validateCampaign(campaign), [campaign]);
  const activeScene =
    campaign.scenes.find((scene) => scene.id === selectedId) ??
    sceneAtTime(campaign.scenes, playhead) ??
    campaign.scenes[0];
  const progress =
    totalDuration > 0 ? Math.min(playhead / totalDuration, 1) : 0;

  useEffect(() => {
    if (!playing || totalDuration <= 0) return;
    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + 0.1;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        const scene = sceneAtTime(campaignRef.current.scenes, next);
        if (scene) setSelectedId(scene.id);
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, totalDuration]);

  const updateFact = useCallback(
    <K extends keyof CampaignState['facts']>(
      key: K,
      value: CampaignState['facts'][K],
    ) => {
      if (campaignRef.current.factsLocked) return;
      commit((current) => ({
        ...current,
        facts: { ...current.facts, [key]: value },
      }));
    },
    [commit],
  );

  const toggleTruthLock = () => {
    const willLock = !campaign.factsLocked;
    commit((current) => ({ ...current, factsLocked: willLock }));
    pushActivity({
      actor: 'MC',
      title: willLock ? 'Locked campaign truth' : 'Unlocked campaign truth',
      detail: willLock
        ? 'Agent tools still cannot alter these source facts.'
        : 'Only the human UI can edit source facts.',
      status: 'human',
    });
  };

  const updateSceneAsHuman = (patch: Partial<Scene>) => {
    if (!activeScene) return;
    commit((current) => ({
      ...current,
      scenes: current.scenes.map((scene) =>
        scene.id === activeScene.id ? { ...scene, ...patch } : scene,
      ),
    }));
  };

  const selectScene = (scene: Scene) => {
    setSelectedId(scene.id);
    setPlayhead(sceneStart(campaign.scenes, scene.id));
    setPlaying(false);
  };

  const runBlockedDemo = async () => {
    const tool = buildTools(callbacks).find(
      (candidate) => candidate.name === 'update_scene',
    );
    if (!tool) return;
    const response = await tool.execute({
      id:
        campaign.scenes.find((scene) => scene.kind === 'offer')?.id ??
        selectedId,
      heading: '50% off everything — guaranteed lowest price',
    });
    const payload = JSON.parse(response.content[0]?.text ?? '{}') as {
      ok?: boolean;
      violations?: { message: string }[];
    };
    pushActivity({
      actor: 'PF',
      title: payload.ok
        ? 'Safety demo unexpectedly passed'
        : 'Blocked an agent claim',
      detail:
        payload.violations?.[0]?.message ??
        'The proposed copy contradicted human-locked facts. Nothing changed.',
      status: payload.ok ? 'system' : 'blocked',
    });
  };

  const applySignalToCampaign = (signal: DemandSignal) => {
    if (campaignRef.current.factsLocked || !signal.handle) return;
    try {
      const facts = makeCatalogImporter(() => campaignRef.current.facts)(
        signal.handle,
      );
      commit((current) => ({
        ...current,
        facts,
        brief: `Answer live demand: ${signal.category}${signal.size ? ` in ${signal.size}` : ''} (signal #${signal.signalId}). ${current.brief}`,
      }));
      pushActivity({
        actor: 'MC',
        title: `Campaign re-aimed at demand signal #${signal.signalId}`,
        detail: `${facts.productName} pulled from the catalog. Lock the truth, then let the agent rebuild.`,
        status: 'human',
      });
    } catch (error) {
      pushActivity({
        actor: 'PF',
        title: 'Signal import failed',
        detail: error instanceof Error ? error.message : String(error),
        status: 'system',
      });
    }
  };

  const downloadComposition = () => {
    if (violations.length > 0) return;
    const html = exportComposition(campaign);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${BRAND.name.toLowerCase()}-composition.html`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushActivity({
      actor: 'MC',
      title: 'Exported a validated composition',
      detail:
        'Standalone HyperFrames HTML is ready for deterministic rendering.',
      status: 'human',
    });
  };

  const statusLabel =
    webMcpStatus === 'active'
      ? `${registeredCount} WebMCP tools live`
      : webMcpStatus === 'error'
        ? 'WebMCP registration error'
        : webMcpStatus === 'checking'
          ? 'Checking WebMCP…'
          : `${registeredCount} tools · preview mode`;

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            {BRAND.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Agent-native campaign studio</p>
            <h1>{BRAND.name}</h1>
          </div>
        </div>

        <div className="campaign-title">
          <span className="status-dot" aria-hidden="true" />
          Aurora Threads / Back to school
          <Badge className="status-badge">Synthetic demo</Badge>
        </div>

        <div className="header-actions">
          <Link className="cross-link" href="/closet">
            <Shirt data-icon="inline-start" aria-hidden="true" />
            Shopper closet
          </Link>
          <Badge
            variant="outline"
            className={`webmcp-badge status-${webMcpStatus}`}
          >
            <Sparkles data-icon="inline-start" />
            {statusLabel}
          </Badge>
          <Button
            className="export-button"
            onClick={downloadComposition}
            disabled={violations.length > 0}
          >
            <Download data-icon="inline-start" />
            Export
          </Button>
        </div>
      </header>

      <section
        className="studio-grid"
        aria-label={`${BRAND.name} campaign workspace`}
      >
        <aside className="truth-panel panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Human control</p>
              <h2>Campaign truth</h2>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>

          <p className="panel-intro">
            Source facts are controlled here, never through agent tools. Lock
            them before asking an agent to compose.
          </p>

          <div className="truth-list">
            <label className="truth-row">
              <span>Product</span>
              <input
                value={campaign.facts.productName}
                disabled={campaign.factsLocked}
                onChange={(event) =>
                  updateFact('productName', event.target.value)
                }
              />
              {campaign.factsLocked ? (
                <LockKeyhole aria-label="Locked fact" />
              ) : (
                <UnlockKeyhole aria-label="Editable fact" />
              )}
            </label>
            <label className="truth-row truth-pair">
              <span>Regular / sale price</span>
              <span className="inline-inputs">
                <input
                  type="number"
                  step="0.01"
                  value={campaign.facts.regularPrice}
                  disabled={campaign.factsLocked}
                  aria-label="Regular price"
                  onChange={(event) =>
                    updateFact('regularPrice', Number(event.target.value))
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  value={campaign.facts.salePrice ?? ''}
                  disabled={campaign.factsLocked}
                  aria-label="Sale price"
                  onChange={(event) =>
                    updateFact(
                      'salePrice',
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                    )
                  }
                />
              </span>
              {campaign.factsLocked ? (
                <LockKeyhole aria-label="Locked fact" />
              ) : (
                <UnlockKeyhole aria-label="Editable fact" />
              )}
            </label>
            <label className="truth-row truth-pair">
              <span>Discount / promo code</span>
              <span className="inline-inputs">
                <input
                  type="number"
                  value={campaign.facts.discountPercent ?? ''}
                  disabled={campaign.factsLocked}
                  aria-label="Discount percent"
                  onChange={(event) =>
                    updateFact(
                      'discountPercent',
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                    )
                  }
                />
                <input
                  value={campaign.facts.promoCode ?? ''}
                  disabled={campaign.factsLocked}
                  aria-label="Promo code"
                  onChange={(event) =>
                    updateFact('promoCode', event.target.value || null)
                  }
                />
              </span>
              {campaign.factsLocked ? (
                <LockKeyhole aria-label="Locked fact" />
              ) : (
                <UnlockKeyhole aria-label="Editable fact" />
              )}
            </label>
            <label className="truth-row">
              <span>End date</span>
              <input
                type="date"
                value={campaign.facts.endDate}
                disabled={campaign.factsLocked}
                onChange={(event) => updateFact('endDate', event.target.value)}
              />
              {campaign.factsLocked ? (
                <LockKeyhole aria-label="Locked fact" />
              ) : (
                <UnlockKeyhole aria-label="Editable fact" />
              )}
            </label>
          </div>

          <div className="asset-card">
            <div className="asset-art" aria-hidden="true">
              <span className="textile-swatch swatch-one" />
              <span className="textile-swatch swatch-two" />
              <span className="textile-swatch swatch-three" />
            </div>
            <div>
              <span>Approved direction</span>
              <strong>Warm fleece / cobalt</strong>
              <small>Abstract · synthetic demo</small>
            </div>
            <CheckCircle2 aria-label="Approved" />
          </div>

          <Button
            variant={campaign.factsLocked ? 'outline' : 'default'}
            className="brief-button"
            onClick={toggleTruthLock}
          >
            {campaign.factsLocked ? (
              <UnlockKeyhole data-icon="inline-start" />
            ) : (
              <LockKeyhole data-icon="inline-start" />
            )}
            {campaign.factsLocked ? 'Unlock as human' : 'Lock campaign truth'}
          </Button>
          <p className="human-only-note">
            Human-only control · deliberately absent from WebMCP
          </p>
        </aside>

        <section className="canvas-panel panel" aria-label="Campaign preview">
          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">Live composition</p>
              <h2>9:16 · {totalDuration.toFixed(1)} seconds</h2>
            </div>
            <div className="toolbar-controls">
              <Button
                variant="ghost"
                size="icon"
                aria-label={playing ? 'Pause preview' : 'Play preview'}
                onClick={() => setPlaying((current) => !current)}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <span>{playhead.toFixed(1).padStart(4, '0')}s</span>
            </div>
          </div>

          <div className="preview-stage">
            {activeScene ? (
              <div
                className={`phone-preview dynamic-preview kind-${activeScene.kind}`}
                style={
                  {
                    background:
                      activeScene.style?.background ??
                      campaign.style.background,
                    color: activeScene.style?.ink ?? campaign.style.ink,
                    '--scene-accent':
                      activeScene.style?.accent ?? campaign.style.accent,
                  } as React.CSSProperties
                }
              >
                <div className="preview-grain" aria-hidden="true" />
                <p className="preview-kicker">
                  {activeScene.kind} / {campaign.facts.productName}
                </p>
                <div className="preview-signal" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="dynamic-copy">
                  <span>
                    Scene{' '}
                    {String(campaign.scenes.indexOf(activeScene) + 1).padStart(
                      2,
                      '0',
                    )}
                  </span>
                  <h3>{activeScene.heading}</h3>
                  <p>{activeScene.body}</p>
                </div>
                <div className="preview-price">
                  <strong>{campaign.facts.discountPercent}% off</strong>
                  <span>
                    {money(campaign.facts.salePrice, campaign.facts.currency)}
                  </span>
                </div>
                <p className="preview-footnote">{campaign.facts.disclaimer}</p>
              </div>
            ) : (
              <div className="empty-preview">Ask the agent to add a scene.</div>
            )}
          </div>

          <div className="timeline" aria-label="Storyboard timeline">
            <input
              className="timeline-slider"
              type="range"
              min="0"
              max={totalDuration || 1}
              step="0.1"
              value={Math.min(playhead, totalDuration)}
              aria-label="Preview time"
              onChange={(event) => {
                const next = Number(event.target.value);
                setPlayhead(next);
                const scene = sceneAtTime(campaign.scenes, next);
                if (scene) setSelectedId(scene.id);
              }}
            />
            <div className="timeline-rail">
              <span
                className="timeline-progress"
                style={{ width: `${progress * 100}%` }}
              />
              <span
                className="timeline-playhead"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            <div
              className="scene-grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(campaign.scenes.length, 1)}, minmax(112px, 1fr))`,
              }}
            >
              {campaign.scenes.map((scene, index) => (
                <button
                  className={`scene-card ${scene.id === activeScene?.id ? 'active' : ''}`}
                  type="button"
                  key={scene.id}
                  onClick={() => selectScene(scene)}
                >
                  <span className="scene-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="scene-swatch"
                    style={{
                      background:
                        scene.style?.background ?? campaign.style.background,
                    }}
                  />
                  <span>
                    <small>{scene.kind}</small>
                    <strong>{scene.heading}</strong>
                  </span>
                </button>
              ))}
            </div>
            {activeScene && (
              <div className="scene-inspector">
                <label>
                  <span>Heading</span>
                  <input
                    value={activeScene.heading}
                    onChange={(event) =>
                      updateSceneAsHuman({ heading: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Body</span>
                  <input
                    value={activeScene.body}
                    onChange={(event) =>
                      updateSceneAsHuman({ body: event.target.value })
                    }
                  />
                </label>
                <label className="duration-input">
                  <span>Seconds</span>
                  <input
                    type="number"
                    min="0.5"
                    max="30"
                    step="0.5"
                    value={activeScene.durationSec}
                    onChange={(event) =>
                      updateSceneAsHuman({
                        durationSec: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
            )}
          </div>
        </section>

        <aside className="proof-panel panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Human + agent</p>
              <h2>Proof trail</h2>
            </div>
            <WandSparkles aria-hidden="true" />
          </div>

          <div
            className={`validation-card ${violations.length === 0 ? 'success-card' : 'error-card'}`}
          >
            <div className="validation-icon">
              {violations.length === 0 ? <CheckCircle2 /> : <AlertTriangle />}
            </div>
            <div>
              <span>Current status</span>
              <strong>
                {violations.length === 0
                  ? 'All claims trace to locked facts'
                  : `${violations.length} claim issue${violations.length === 1 ? '' : 's'}`}
              </strong>
              <p>
                {violations[0]?.message ??
                  `${campaign.scenes.length} scenes checked · safe to export`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="safety-demo"
            onClick={runBlockedDemo}
          >
            <ShieldCheck data-icon="inline-start" />
            Try unsafe agent claim
          </Button>

          <div className="demand-list" aria-live="polite">
            <p className="eyebrow">
              <Radio data-icon="inline-start" aria-hidden="true" /> Live demand
              · zero-ID events
            </p>
            {signals.length === 0 ? (
              <p className="panel-intro">
                No signals yet. Shopper agents can report a human-approved,
                schema-limited demand event from the closet page.
              </p>
            ) : (
              signals.slice(0, 4).map((signal) => (
                <div className="demand-item" key={signal.signalId}>
                  <strong>
                    {signal.category}
                    {signal.size ? ` · ${signal.size}` : ''}
                    {signal.handle ? ` · ${signal.handle}` : ''}
                  </strong>
                  <small>
                    {signal.kind} · event #{signal.signalId.slice(0, 8)} · no
                    shopper ID or wardrobe rows
                  </small>
                  {signal.handle && (
                    <button
                      type="button"
                      className="demand-use"
                      disabled={campaign.factsLocked}
                      title={
                        campaign.factsLocked
                          ? 'Unlock campaign truth first (human-only)'
                          : 'Pull this product into the campaign facts'
                      }
                      onClick={() => applySignalToCampaign(signal)}
                    >
                      {campaign.factsLocked
                        ? 'Unlock truth to use'
                        : 'Build campaign from this'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="activity-list" aria-live="polite">
            {activity.map((item) => (
              <div
                className={`activity-item ${item.status === 'blocked' ? 'blocked-item' : ''}`}
                key={item.id}
              >
                <span className={`activity-marker ${item.status}-marker`}>
                  {item.actor}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.at}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="tool-card">
            <div>
              <span className="tool-pulse" />
              {webMcpStatus === 'active'
                ? 'WebMCP connected'
                : 'WebMCP contract ready'}
            </div>
            <code>navigator.modelContext</code>
            <p>
              Ask a browser agent to read, draft, reorder, seek, validate, or
              export. Every accepted mutation appears here; rejected claims
              change nothing.
            </p>
          </div>

          <footer className="support-strip">
            Shopify merchant use case · Chrome WebMCP · deployed on Cloudflare Workers
          </footer>
        </aside>
      </section>
    </main>
  );
}
