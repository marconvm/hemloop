'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  UnlockKeyhole,
  WandSparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompositionScene } from '@/components/composition/scene';
import { MerchantDemandPanel } from '@/components/merchant-demand-panel';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SurfaceTabs } from '@/components/surface-tabs';
import { useSurfaceTab } from '@/components/use-surface-tab';
import { BRAND } from '@/lib/proofframe/brand';

import '@/app/studio.css';
import {
  demandInsight,
  matchOffer,
  slug,
  toDemandSignalLike,
  type DemandGroup,
  type PersonalOffer,
} from '@/lib/proofframe/offers';
import {
  readActiveMerchantId,
  readCampaign,
  seedCampaign,
  writeActiveMerchantId,
  writeCampaign,
} from '@/lib/proofframe/seed';
import { seedMerchants } from '@/lib/proofframe/merchants';
import { demoCatalog, makeCatalogImporter } from '@/lib/proofframe/shopify';
import type { DemandSignal } from '@/lib/proofframe/closet';
import { readSignals, subscribeSignals } from '@/lib/proofframe/signal-bridge';
// Namespace import so this component compiles even before a sibling branch
// adds readOutcomes/subscribeOutcomes to signal-bridge — accessed only
// through the defensive helpers below.
import * as signalBridgeModule from '@/lib/proofframe/signal-bridge';
import {
  PLACEMENTS,
  formatForPlacement,
  type CampaignFacts,
  type CampaignState,
  type Placement,
  type Scene,
} from '@/lib/proofframe/types';
import { validateCampaign } from '@/lib/proofframe/validator';
import {
  buildTools,
  COMPLETENESS_CHECKS,
  computeCompleteness,
  getModelContext,
  instrumentTools,
  registerAll,
  type ProofFrameCallbacks,
  type SceneInput,
  type ToolContent,
} from '@/lib/proofframe/webmcp';

// Optional fields another agent may add to CampaignFacts; treated as optional
// here so this component compiles standalone regardless of merge order.
type FactsView = CampaignFacts & { purchaseUrl?: string; productImage?: string };

// Optional fields a sibling agent may add to DemandSignal (consent dial,
// occasion, who-for, taste). All optional and read defensively: this
// component must compile and render correctly whether or not they exist yet.
type SignalView = DemandSignal & {
  level?: 'need' | 'want';
  occasion?: 'everyday' | 'season' | 'gift' | 'event';
  for?: 'self' | 'partner' | 'kid';
  consent?: { level: 0 | 1 | 2 | 3; fields: string[] };
  pattern?: {
    discountSensitivity: 'code' | 'percent' | 'none';
    spendBand: 'under-50' | '50-100' | '100-plus';
    brandLoyalty: 'loyal' | 'switcher';
  };
};

const STUDIO_TABS = [
  { id: 'demand', label: 'Demand' },
  { id: 'offer', label: 'Offer and rules' },
  { id: 'composition', label: 'Composition' },
] as const;

type StudioTab = (typeof STUDIO_TABS)[number]['id'];

const STUDIO_TAB_IDS: readonly StudioTab[] = STUDIO_TABS.map((t) => t.id);

const DEMAND_TOOLS = new Set(['get_demand']);
const OFFER_TOOLS = new Set([
  'get_offer',
  'propose_offer',
  'import_product',
  'get_campaign_state',
]);
const COMPOSITION_TOOLS = new Set([
  'set_brief',
  'add_scene',
  'update_scene',
  'reorder_scenes',
  'seek_preview',
  'validate_claims',
  'export_composition',
]);

const SENSITIVITY_LABEL: Record<string, string> = {
  code: 'code-sensitive',
  percent: 'percent-sensitive',
  none: 'not discount-sensitive',
};

const CONSENT_LEVEL_LABEL: Record<number, string> = {
  0: 'Level 0, Private: nothing leaves the page.',
  1: 'Level 1, Basics: category, size, need or want.',
  2: 'Level 2, Context: adds occasion and fit preference.',
  3: 'Level 3, Taste: adds colour family, materials to avoid, price ceiling.',
};

/** A purchase-or-not outcome reported back for one demand signal. Optional
 * bridge export — same defensive-access pattern as the fields above. */
type SignalOutcome = { signalId: string; outcome: 'bought' | 'passed'; at: string };

function readOutcomesSafe(): SignalOutcome[] {
  const mod = signalBridgeModule as unknown as {
    readOutcomes?: () => SignalOutcome[];
  };
  return typeof mod.readOutcomes === 'function' ? mod.readOutcomes() : [];
}

function subscribeOutcomesSafe(onChange: () => void): () => void {
  const mod = signalBridgeModule as unknown as {
    subscribeOutcomes?: (cb: () => void) => () => void;
  };
  return typeof mod.subscribeOutcomes === 'function'
    ? mod.subscribeOutcomes(onChange)
    : () => {};
}

// Same defensive-access pattern for the wave-3 personal-offer store: another
// agent is adding readOffers/upsertOffer/subscribeOffers to signal-bridge.ts,
// so this component must compile and render correctly whether or not that
// landed yet.
function readOffersSafe(): PersonalOffer[] {
  const mod = signalBridgeModule as unknown as {
    readOffers?: () => PersonalOffer[];
  };
  return typeof mod.readOffers === 'function' ? mod.readOffers() : [];
}

function subscribeOffersSafe(onChange: () => void): () => void {
  const mod = signalBridgeModule as unknown as {
    subscribeOffers?: (cb: () => void) => () => void;
  };
  return typeof mod.subscribeOffers === 'function'
    ? mod.subscribeOffers(onChange)
    : () => {};
}

function upsertOfferSafe(offer: PersonalOffer): boolean {
  const mod = signalBridgeModule as unknown as {
    upsertOffer?: (o: PersonalOffer) => boolean;
  };
  return typeof mod.upsertOffer === 'function' ? mod.upsertOffer(offer) : false;
}

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
    title: 'Locked the offer facts',
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

/** Prefer the sibling branch's explicit `level` field when present; fall
 * back to the existing `kind` heuristic ('want' vs everything else). */
function demandLevel(signal: DemandSignal): 'need' | 'want' {
  const level = (signal as SignalView).level;
  if (level === 'need' || level === 'want') return level;
  return signal.kind === 'want' ? 'want' : 'need';
}

function demandLabel(signal: DemandSignal): 'Need' | 'Want' {
  return demandLevel(signal) === 'want' ? 'Want' : 'Need';
}

/** The catalog product behind the locked facts. Pure, so both render (the
 * inventory insight) and the agent callbacks can use it. */
function catalogProductFor(facts: CampaignFacts) {
  const f = facts as FactsView;
  const match = demoCatalog.products.find((p) => p.title === f.productName);
  return {
    handle: match?.handle ?? slug(f.productName),
    title: match?.title ?? f.productName,
    image: match?.image ?? f.productImage,
    sizesInStock: f.sizesInStock,
    vendor: match?.vendor ?? BRAND.name,
    productType: match?.productType ?? 'Apparel',
  };
}

const VERDICT_LABEL: Record<DemandGroup['verdict'], string> = {
  'can-offer': 'can offer',
  'size-not-in-stock': 'size out of stock',
  'category-mismatch': 'other category',
};

/** The grouped view the panel renders is the same one `get_demand` returns:
 * one tested function in offers.ts, so the merchant and their agent can never
 * be looking at different demand. */
function aggregateSignals(
  signals: DemandSignal[],
  outcomeById: Map<string, SignalOutcome['outcome']>,
  facts: CampaignFacts,
  catalogProduct?: { handle: string; title: string; sizesInStock?: string[] },
): DemandGroup[] {
  const bought: string[] = [];
  for (const [signalId, outcome] of outcomeById) {
    if (outcome === 'bought') bought.push(signalId);
  }
  return demandInsight(
    signals.map((s) => ({
      signalId: s.signalId,
      category: s.category,
      size: s.size,
      kind: s.kind,
      level: demandLevel(s),
      at: s.at,
    })),
    facts,
    catalogProduct,
    bought,
  );
}

/** Need rows first, newest-first order preserved within each group
 * (Array.prototype.sort is stable). */
function sortNeedsFirst(signals: DemandSignal[]): DemandSignal[] {
  return [...signals].sort((a, b) => {
    const aNeed = demandLevel(a) === 'need';
    const bNeed = demandLevel(b) === 'need';
    if (aNeed === bNeed) return 0;
    return aNeed ? -1 : 1;
  });
}

export function ProofFrameStudio() {
  const [tab, setTab] = useSurfaceTab<StudioTab>(STUDIO_TAB_IDS, 'demand');
  const merchants = useMemo(() => seedMerchants(), []);
  const [activeMerchantId, setActiveMerchantId] = useState('northlight');
  const activeMerchantIdRef = useRef(activeMerchantId);
  const activeMerchant = useMemo(
    () => merchants.find((m) => m.id === activeMerchantId) ?? merchants[0],
    [merchants, activeMerchantId],
  );
  const [campaign, setCampaign] = useState<CampaignState>(() => seedCampaign('northlight'));
  const campaignRef = useRef(campaign);
  const campaignHydratedRef = useRef(false);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [selectedId, setSelectedId] = useState(campaign.scenes[0]?.id ?? '');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [webMcpStatus, setWebMcpStatus] = useState<WebMcpStatus>('checking');
  const [registeredCount, setRegisteredCount] = useState(0);
  const [signals, setSignals] = useState<DemandSignal[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([]);
  const [offers, setOffers] = useState<PersonalOffer[]>([]);
  const [autoPropose, setAutoPropose] = useState(false);
  const [toolCallCount, setToolCallCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const merchantId = readActiveMerchantId();
      activeMerchantIdRef.current = merchantId;
      setActiveMerchantId(merchantId);
      const stored = readCampaign(merchantId);
      campaignRef.current = stored;
      setCampaign(stored);
      setSelectedId((current) =>
        stored.scenes.some((scene) => scene.id === current)
          ? current
          : (stored.scenes[0]?.id ?? ''),
      );
      campaignHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (campaignHydratedRef.current) writeCampaign(activeMerchantId, campaign);
  }, [campaign, activeMerchantId]);
  useEffect(() => {
    activeMerchantIdRef.current = activeMerchantId;
  }, [activeMerchantId]);

  // A stable, always-current view of `signals` for the getRequests callback
  // handed to WebMCP tools, so a tool registered once still sees fresh
  // incoming requests without re-registering every time a signal arrives.
  const signalsRef = useRef<DemandSignal[]>([]);
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  // Row ids that just appeared, so the GA-debugger flash plays once and only
  // once (never re-derived from a ref read during render).
  const prevSignalIdsRef = useRef<Set<string> | null>(null);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(new Set());
  const [newActivityIds, setNewActivityIds] = useState<Set<number>>(new Set());

  const handleToolCall = useCallback((name: string, result: ToolContent) => {
    setToolCallCount((n) => n + 1);
    if ((result as { ok?: boolean }).ok === false) {
      setBlockedCount((n) => n + 1);
    }
    if (DEMAND_TOOLS.has(name)) setTab('demand');
    else if (OFFER_TOOLS.has(name)) setTab('offer');
    else if (COMPOSITION_TOOLS.has(name)) setTab('composition');
  }, [setTab]);

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
    queueMicrotask(() => {
      if (active) setOutcomes(readOutcomesSafe());
    });
    const unsubscribe = subscribeOutcomesSafe(() => setOutcomes(readOutcomesSafe()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setOffers(readOffersSafe());
    });
    const unsubscribe = subscribeOffersSafe(() => setOffers(readOffersSafe()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Auto-propose is human-only and lives only in this browser, same as the
  // consent dial (hemloop.consent) and outcomes.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setAutoPropose(window.localStorage.getItem('hemloop.autoPropose') === '1');
      } catch {
        /* ignore */
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleAutoPropose = useCallback(() => {
    setAutoPropose((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('hemloop.autoPropose', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const pushActivity = useCallback((entry: Omit<Activity, 'id' | 'at'>) => {
    const id = Date.now() + Math.random();
    setActivity((current) =>
      [{ ...entry, id, at: timeLabel() }, ...current].slice(0, 6),
    );
    setNewActivityIds((current) => new Set(current).add(id));
  }, []);

  const switchMerchant = useCallback(
    (merchantId: string) => {
      if (merchantId === activeMerchantIdRef.current) return;
      if (campaignHydratedRef.current) {
        writeCampaign(activeMerchantIdRef.current, campaignRef.current);
      }
      activeMerchantIdRef.current = merchantId;
      setActiveMerchantId(merchantId);
      writeActiveMerchantId(merchantId);
      const next = readCampaign(merchantId);
      campaignRef.current = next;
      setCampaign(next);
      setSelectedId(next.scenes[0]?.id ?? '');
      pushActivity({
        actor: 'PF',
        title: `Switched desk to ${seedMerchants().find((m) => m.id === merchantId)?.name ?? merchantId}`,
        detail: "Facts, lock and scenes are this merchant's stored campaign.",
        status: 'system',
      });
    },
    [pushActivity],
  );

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
          'Offer facts are locked. Ask the merchant to unlock them before importing a product.',
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

  // Shared by the human Export button and the agent's export_composition tool:
  // the file lands the same way whoever asked for it.
  const saveComposition = useCallback((html: string) => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${BRAND.name.toLowerCase()}-composition.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  // The catalog product behind the current campaign facts: matched by
  // product name against the demo catalog snapshot, falling back to a
  // synthetic product built from the facts alone. Reads campaignRef.current
  // directly so it stays correct even if this function is captured once.
  const getCatalogProductForCampaign = useCallback(
    () => catalogProductFor(campaignRef.current.facts),
    [],
  );

  // Called only by the propose_offer WebMCP tool: an agent staged a
  // proposal. A human still has to approve it before a shopper sees it.
  const stageOfferFromAgent = useCallback(
    (offer: PersonalOffer) => {
      upsertOfferSafe(offer);
      pushActivity({
        actor: 'AI',
        title: `Proposed an offer for request #${offer.requestId.slice(0, 8)}`,
        detail: `${offer.discountPercent}% off, ${money(offer.price, offer.currency)}. Waiting for merchant approval.`,
        status: 'agent',
      });
    },
    [pushActivity],
  );

  // Human-initiated: the "Propose offer" button on one incoming request row.
  const proposeOfferAsHuman = useCallback(
    (signal: DemandSignal) => {
      const request = toDemandSignalLike(signal);
      if (!request) return;
      const result = matchOffer({
        request,
        facts: campaignRef.current.facts,
        catalogProduct: getCatalogProductForCampaign(),
      });
      if (!('offerId' in result)) {
        pushActivity({
          actor: 'MC',
          title: 'Could not propose an offer',
          detail: result.reason,
          status: 'human',
        });
        return;
      }
      const offer: PersonalOffer = { ...result, proposedBy: 'human' };
      upsertOfferSafe(offer);
      pushActivity({
        actor: 'MC',
        title: `Proposed an offer for request #${signal.signalId.slice(0, 8)}`,
        detail: `${offer.discountPercent}% off, ${money(offer.price, offer.currency)}.`,
        status: 'human',
      });
    },
    [getCatalogProductForCampaign, pushActivity],
  );

  const approveOffer = useCallback(
    (offer: PersonalOffer) => {
      const approved: PersonalOffer = {
        ...offer,
        status: 'approved',
        approvedAt: new Date().toISOString(),
      };
      upsertOfferSafe(approved);
      pushActivity({
        actor: 'MC',
        title: `Approved the offer for request #${offer.requestId.slice(0, 8)}`,
        detail: `${offer.discountPercent}% off, ${money(offer.price, offer.currency)}, valid to ${offer.validTo}.`,
        status: 'human',
      });
    },
    [pushActivity],
  );

  const declineOffer = useCallback(
    (offer: PersonalOffer) => {
      upsertOfferSafe({ ...offer, status: 'declined' });
      pushActivity({
        actor: 'MC',
        title: `Declined the offer for request #${offer.requestId.slice(0, 8)}`,
        detail: 'The proposal will not be shown to the shopper.',
        status: 'human',
      });
    },
    [pushActivity],
  );

  // Auto-propose: when the human-only toggle is on, every incoming request
  // that has no offer yet gets a matched proposal, proposedBy 'auto'. The
  // merchant still has to approve it before a shopper sees anything.
  useEffect(() => {
    if (!autoPropose) return;
    const alreadyOffered = new Set(readOffersSafe().map((o) => o.requestId));
    for (const signal of signals) {
      if (alreadyOffered.has(signal.signalId)) continue;
      const request = toDemandSignalLike(signal);
      if (!request) continue;
      const result = matchOffer({
        request,
        facts: campaignRef.current.facts,
        catalogProduct: getCatalogProductForCampaign(),
      });
      if (!('offerId' in result)) continue;
      const offer: PersonalOffer = { ...result, proposedBy: 'auto' };
      upsertOfferSafe(offer);
      pushActivity({
        actor: 'PF',
        title: `Auto-proposed an offer for request #${signal.signalId.slice(0, 8)}`,
        detail: `${offer.discountPercent}% off, ${money(offer.price, offer.currency)}. Waiting for merchant approval.`,
        status: 'system',
      });
    }
  }, [autoPropose, signals, getCatalogProductForCampaign, pushActivity]);

  const callbacks = useMemo<ProofFrameCallbacks>(
    () => ({
      getState: () => campaignRef.current,
      setBrief: agentSetBrief,
      addScene: agentAddScene,
      updateScene: agentUpdateScene,
      reorderScenes: agentReorderScenes,
      seekPreview: agentSeekPreview,
      importProduct: agentImportProduct,
      deliverExport: saveComposition,
      getRequests: () => signalsRef.current,
      getOffers: () => readOffersSafe(),
      stageOffer: stageOfferFromAgent,
      getCatalogProduct: getCatalogProductForCampaign,
      getBoughtRequestIds: () =>
        readOutcomesSafe()
          .filter((o) => o.outcome === 'bought')
          .map((o) => o.signalId),
    }),
    [
      agentAddScene,
      agentImportProduct,
      saveComposition,
      agentReorderScenes,
      agentSeekPreview,
      agentSetBrief,
      agentUpdateScene,
      getCatalogProductForCampaign,
      stageOfferFromAgent,
    ],
  );

  useEffect(() => {
    let active = true;
    const tools = instrumentTools(buildTools(callbacks), handleToolCall);
    registerAll(getModelContext(), tools)
      .then((result) => {
        if (!active) return;
        // Count confirmed registrations, not the list we tried to register.
        setRegisteredCount(
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
  const facts = campaign.facts as FactsView;
  const completeness = useMemo(() => computeCompleteness(campaign.facts), [campaign.facts]);
  const missingChecks = useMemo(
    () => COMPLETENESS_CHECKS.filter((c) => completeness.missing.includes(c.key)),
    [completeness],
  );
  const sortedSignals = useMemo(() => sortNeedsFirst(signals), [signals]);
  const outcomeById = useMemo(
    () => new Map(outcomes.map((o) => [o.signalId, o.outcome])),
    [outcomes],
  );
  const aggregatedSignals = useMemo(
    () =>
      aggregateSignals(
        signals,
        outcomeById,
        campaign.facts,
        catalogProductFor(campaign.facts),
      ),
    [signals, outcomeById, campaign.facts],
  );
  // The most recent offer per request (a request can be re-proposed after a
  // decline). proposedAt is an ISO timestamp, so string comparison sorts.
  const latestOfferByRequest = useMemo(() => {
    const map = new Map<string, PersonalOffer>();
    for (const o of offers) {
      const existing = map.get(o.requestId);
      if (!existing || o.proposedAt > existing.proposedAt) map.set(o.requestId, o);
    }
    return map;
  }, [offers]);

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

  // Placement is a human choice, never a WebMCP tool: it goes through the
  // same commit path as any human edit, writing format directly.
  const setPlacement = (placement: Placement) => {
    commit((current) => ({ ...current, format: formatForPlacement(placement) }));
  };

  const toggleTruthLock = () => {
    const willLock = !campaign.factsLocked;
    commit((current) => ({ ...current, factsLocked: willLock }));
    pushActivity({
      actor: 'MC',
      title: willLock ? 'Locked the offer facts' : 'Unlocked the offer facts',
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
      heading: '50% off everything, guaranteed lowest price',
    });
    handleToolCall('update_scene', response as ToolContent);
    const payload = response as {
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
        title: `Campaign re-aimed at request #${signal.signalId}`,
        detail: `${facts.productName} pulled from the catalog. Lock the facts, then let the agent rebuild.`,
        status: 'human',
      });
    } catch (error) {
      pushActivity({
        actor: 'PF',
        title: 'Request import failed',
        detail: error instanceof Error ? error.message : String(error),
        status: 'system',
      });
    }
  };

  const statusLabel =
    webMcpStatus === 'active'
      ? `${registeredCount} WebMCP tools live`
      : webMcpStatus === 'error'
        ? 'WebMCP registration error'
        : webMcpStatus === 'checking'
          ? 'Checking WebMCP…'
          : `${registeredCount} tools · preview mode`;

  const catalogProduct = catalogProductFor(campaign.facts);
  const sellPrice = campaign.facts.salePrice ?? campaign.facts.regularPrice;
  const computedMargin =
    campaign.facts.costPrice !== undefined && sellPrice > 0
      ? Math.round(
          ((sellPrice - campaign.facts.costPrice) / sellPrice) * 1000,
        ) / 10
      : null;

  return (
    <main className="studio-shell">
      <SiteHeader
        active="studio"
        status={
          <Badge
            variant="outline"
            className={`webmcp-badge status-${webMcpStatus}`}
            title="WebMCP lets a browser agent call tools this page registers directly. No server, no account, no OAuth."
          >
            <Sparkles data-icon="inline-start" />
            {statusLabel}
          </Badge>
        }
      />

      <SurfaceTabs
        tabs={[...STUDIO_TABS]}
        active={tab}
        onChange={setTab}
        label="Studio sections"
      />

      <div
        id="panel-demand"
        role="tabpanel"
        aria-labelledby="tab-demand"
        hidden={tab !== 'demand'}
        className="tab-panel"
      >
        <div className="demand-tab-chrome">
          <label className="merchant-switcher">
            <span>Store:</span>
            <select
              value={activeMerchantId}
              onChange={(event) => switchMerchant(event.target.value)}
              aria-label="Active store"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MerchantDemandPanel
          facts={campaign.facts}
          merchants={merchants}
          activeMerchantId={activeMerchantId}
        />
      </div>

      <section
        id="panel-offer"
        role="tabpanel"
        aria-labelledby="tab-offer"
        hidden={tab !== 'offer'}
        className="tab-panel studio-grid offer-grid"
        aria-label={`${BRAND.name} offer and rules`}
      >
        <div className="polaris-offer">
          <div className="polaris-main">
            <section className="polaris-card polaris-product-card">
              <div className="polaris-product-media">
                {facts.productImage ? (
                  // oxlint-disable-next-line next/no-img-element -- static demo asset
                  <img
                    src={facts.productImage}
                    alt={facts.productName}
                    loading="lazy"
                  />
                ) : (
                  <div className="polaris-media-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="polaris-product-meta">
                <div className="polaris-product-title-row">
                  <label className="polaris-field polaris-field-grow">
                    <span className="polaris-label">Title</span>
                    <input
                      value={campaign.facts.productName}
                      disabled={campaign.factsLocked}
                      onChange={(event) =>
                        updateFact('productName', event.target.value)
                      }
                    />
                  </label>
                  <span className="polaris-status-badge">Active</span>
                </div>
                <div className="polaris-field-row">
                  <div className="polaris-field">
                    <span className="polaris-label">Vendor</span>
                    <p className="polaris-static">{catalogProduct.vendor}</p>
                  </div>
                  <div className="polaris-field">
                    <span className="polaris-label">Product type</span>
                    <p className="polaris-static">{catalogProduct.productType}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="polaris-card">
              <h3 className="polaris-card-title">Pricing</h3>
              <div className="polaris-field-row polaris-field-row-4">
                <label className="polaris-field">
                  <span className="polaris-label">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={campaign.facts.salePrice ?? ''}
                    disabled={campaign.factsLocked}
                    aria-label="Price"
                    placeholder={String(campaign.facts.regularPrice)}
                    onChange={(event) =>
                      updateFact(
                        'salePrice',
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="polaris-field">
                  <span className="polaris-label">Compare-at price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={campaign.facts.regularPrice}
                    disabled={campaign.factsLocked}
                    aria-label="Compare-at price"
                    onChange={(event) =>
                      updateFact('regularPrice', Number(event.target.value))
                    }
                  />
                </label>
                <label className="polaris-field">
                  <span className="polaris-label">Cost per item</span>
                  <input
                    type="number"
                    step="0.01"
                    value={campaign.facts.costPrice ?? ''}
                    disabled={campaign.factsLocked}
                    aria-label="Cost per item"
                    onChange={(event) =>
                      updateFact(
                        'costPrice',
                        event.target.value === ''
                          ? undefined
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
                <div className="polaris-field">
                  <span className="polaris-label">Margin</span>
                  <p className="polaris-static polaris-margin">
                    {computedMargin === null ? '—' : `${computedMargin}%`}
                  </p>
                </div>
              </div>
            </section>

            <section className="polaris-card">
              <h3 className="polaris-card-title">Inventory</h3>
              {activeMerchant ? (
                <div className="polaris-index-scroll">
                  <table className="polaris-index-table">
                    <thead>
                      <tr>
                        <th scope="col">SKU</th>
                        <th scope="col">Size</th>
                        <th scope="col">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMerchant.inventory.map((row) => (
                        <tr
                          key={row.sku}
                          className={row.qty <= 0 ? 'is-sold-out' : undefined}
                        >
                          <td>{row.sku}</td>
                          <td>{row.size}</td>
                          <td>{row.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="polaris-muted">No store selected.</p>
              )}
              {!campaign.factsLocked && !campaign.facts.sizesInStock && (
                <button
                  type="button"
                  className="tool-table-toggle"
                  title="Human-only: no WebMCP tool can write offer facts"
                  onClick={() =>
                    commit((current) => ({
                      ...current,
                      facts: {
                        ...current.facts,
                        sizesInStock: ['XS', 'S', 'M', 'L', 'XL'],
                      },
                    }))
                  }
                >
                  Add sizes in stock (XS to XL)
                </button>
              )}
            </section>

            <section
              className="polaris-card"
              title="Human-only, no WebMCP tool can read or write the offer rules. propose_offer only stays inside them."
            >
              <h3 className="polaris-card-title">Discount</h3>
              <div className="polaris-field-row">
                <label className="polaris-field">
                  <span className="polaris-label">Discount code</span>
                  <input
                    value={campaign.facts.promoCode ?? ''}
                    disabled={campaign.factsLocked}
                    aria-label="Discount code"
                    onChange={(event) =>
                      updateFact('promoCode', event.target.value || null)
                    }
                  />
                </label>
                <label className="polaris-field">
                  <span className="polaris-label">Percent off</span>
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
                </label>
              </div>
              <div className="polaris-field-row">
                <label className="polaris-field">
                  <span className="polaris-label">Max discount %</span>
                  <input
                    type="number"
                    value={campaign.facts.maxDiscountPercent ?? ''}
                    disabled={campaign.factsLocked}
                    aria-label="Max discount percent"
                    onChange={(event) =>
                      updateFact(
                        'maxDiscountPercent',
                        event.target.value === ''
                          ? undefined
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="polaris-field">
                  <span className="polaris-label">Margin floor %</span>
                  <input
                    type="number"
                    value={campaign.facts.marginFloorPercent ?? ''}
                    disabled={campaign.factsLocked}
                    aria-label="Margin floor percent"
                    onChange={(event) =>
                      updateFact(
                        'marginFloorPercent',
                        event.target.value === ''
                          ? undefined
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
              </div>
              <div className="polaris-field-row">
                <label className="polaris-field">
                  <span className="polaris-label">Active from</span>
                  <input
                    type="date"
                    value={campaign.facts.startDate}
                    disabled={campaign.factsLocked}
                    onChange={(event) =>
                      updateFact('startDate', event.target.value)
                    }
                  />
                </label>
                <label className="polaris-field">
                  <span className="polaris-label">Active until</span>
                  <input
                    type="date"
                    value={campaign.facts.endDate}
                    disabled={campaign.factsLocked}
                    onChange={(event) =>
                      updateFact('endDate', event.target.value)
                    }
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="polaris-rail" aria-label="Offer lock controls">
            <div
              className={`polaris-lock-badge ${campaign.factsLocked ? 'is-locked' : 'is-open'}`}
            >
              {campaign.factsLocked ? (
                <LockKeyhole aria-hidden="true" />
              ) : (
                <UnlockKeyhole aria-hidden="true" />
              )}
              <span>{campaign.factsLocked ? 'Locked' : 'Editable'}</span>
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
              {campaign.factsLocked ? 'Unlock offer facts' : 'Lock offer facts'}
            </Button>
            <p className="human-only-note">
              Human-only control · deliberately absent from WebMCP
            </p>

            <div className="completeness-meter">
              <div className="completeness-head">
                <span>Offer completeness</span>
                <strong>
                  {completeness.locked} of {completeness.total} facts locked
                </strong>
              </div>
              <progress
                className="completeness-bar"
                aria-label="Offer completeness"
                value={completeness.locked}
                max={completeness.total}
              />
              {missingChecks.length > 0 && (
                <ul className="completeness-missing">
                  {missingChecks.map((c) => (
                    <li key={c.key}>
                      <strong>{c.label}</strong>
                      <span>Unlocks: {c.unlocks}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        <aside className="proof-panel panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Human + agent</p>
              <h2>Agent activity log</h2>
              <p
                className="tool-counter"
                title="A tool call is one request from a browser agent to a WebMCP tool registered on this page, accepted or blocked."
              >
                {toolCallCount} tool call{toolCallCount === 1 ? '' : 's'} ·{' '}
                {blockedCount} blocked
              </p>
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
            Try a false claim
          </Button>

          <div className="demand-list" aria-live="polite">
            <p className="eyebrow">
              <Radio data-icon="inline-start" aria-hidden="true" /> Incoming
              requests
            </p>
            <p className="panel-subtitle">
              No shopper identifier, one per approval.
            </p>
            <label
              className="auto-propose-toggle"
              title="Human-only, no WebMCP tool can flip this."
            >
              <input
                type="checkbox"
                checked={autoPropose}
                onChange={toggleAutoPropose}
              />
              Auto-propose incoming requests
            </label>
            {aggregatedSignals.length > 0 && (
              <div className="demand-aggregate">
                {aggregatedSignals.map((row) => (
                  <div
                    className={`aggregate-row verdict-${row.verdict}`}
                    key={row.key}
                  >
                    <strong>
                      {row.category} · {row.size}
                    </strong>
                    <span>
                      {row.total} request{row.total === 1 ? '' : 's'} (
                      {row.need} need{row.need === 1 ? '' : 's'}, {row.want}{' '}
                      want{row.want === 1 ? '' : 's'})
                      {row.replace > 0
                        ? ` · ${row.replace} replacing one they own`
                        : ''}
                      {row.bought > 0
                        ? ` · ${row.bought} bought`
                        : ''}
                    </span>
                    <span className="aggregate-verdict" title={row.action}>
                      {VERDICT_LABEL[row.verdict]}
                    </span>
                  </div>
                ))}
                <p className="panel-subtitle">
                  Inventory insight: demand scored against the stock you locked.
                  The same rows your agent reads with get_demand.
                </p>
              </div>
            )}
            {sortedSignals.length === 0 ? (
              <p className="panel-intro">
                No requests yet. Shopper agents can report a human-approved,
                schema-limited demand event from the closet page.
              </p>
            ) : (
              sortedSignals.slice(0, 4).map((signal) => {
                const isNew = newSignalIds.has(signal.signalId);
                const view = signal as SignalView;
                const outcome = outcomeById.get(signal.signalId);
                return (
                  <div
                    className={`demand-item ${isNew ? 'is-new' : ''}`}
                    key={signal.signalId}
                  >
                    <div className="demand-item-head">
                      <strong>
                        {signal.category}
                        {signal.size ? ` · ${signal.size}` : ''}
                        {signal.handle ? ` · ${signal.handle}` : ''}
                      </strong>
                      <span className="demand-item-badges">
                        <span
                          className={`kind-pill ${demandLevel(signal) === 'want' ? 'kind-want' : 'kind-need'}`}
                        >
                          {demandLabel(signal)}
                        </span>
                        {outcome && (
                          <span className={`outcome-badge outcome-${outcome}`}>
                            {outcome === 'bought' ? 'Bought' : 'Passed'}
                          </span>
                        )}
                      </span>
                    </div>
                    <small>
                      event #{signal.signalId.slice(0, 8)} · no shopper ID or
                      wardrobe rows
                    </small>
                    {view.occasion && (
                      <small className="signal-meta">Occasion: {view.occasion}</small>
                    )}
                    {view.for && <small className="signal-meta">For: {view.for}</small>}
                    {view.consent && (
                      <small
                        className="signal-meta consent-meta"
                        title={
                          CONSENT_LEVEL_LABEL[view.consent.level] ??
                          'Consent level, set by the shopper.'
                        }
                      >
                        Shared at level {view.consent.level}: {view.consent.fields.join(', ')}
                      </small>
                    )}
                    {view.pattern && (
                      <small className="signal-meta pattern-meta">
                        Buying pattern: {SENSITIVITY_LABEL[view.pattern.discountSensitivity] ?? view.pattern.discountSensitivity},{' '}
                        {view.pattern.spendBand}, {view.pattern.brandLoyalty}
                      </small>
                    )}
                    {signal.handle && (
                      <button
                        type="button"
                        className="demand-use"
                        disabled={campaign.factsLocked}
                        title={
                          campaign.factsLocked
                            ? 'Unlock offer facts first (human-only)'
                            : 'Pull this product into the campaign facts'
                        }
                        onClick={() => applySignalToCampaign(signal)}
                      >
                        {campaign.factsLocked
                          ? 'Unlock facts to use'
                          : 'Answer this request'}
                      </button>
                    )}
                    {(() => {
                      const offer = latestOfferByRequest.get(signal.signalId);
                      if (!offer) {
                        return (
                          <button
                            type="button"
                            className="propose-offer-button"
                            onClick={() => proposeOfferAsHuman(signal)}
                          >
                            Propose offer
                          </button>
                        );
                      }
                      if (offer.status === 'proposed') {
                        return (
                          <div className="offer-proposal">
                            <div className="offer-proposal-summary">
                              <strong>{money(offer.price, offer.currency)}</strong>
                              {offer.promoCode && (
                                <span className="offer-code">{offer.promoCode}</span>
                              )}
                              <span>valid to {offer.validTo}</span>
                            </div>
                            <ul className="offer-reasons">
                              {offer.reasons.map((reason, i) => (
                                // Fixed proposal, fixed order: index is a stable key here.
                                // oxlint-disable-next-line no-array-index-key
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                            <p
                              className={`offer-margin ${offer.marginCheck.ok ? 'margin-ok' : 'margin-bad'}`}
                            >
                              Margin {offer.marginCheck.resultingMarginPercent.toFixed(1)}%{' '}
                              {offer.marginCheck.ok ? 'above the floor' : 'below the floor'}
                            </p>
                            <div className="offer-actions">
                              <Button
                                size="sm"
                                className="approve-offer-button"
                                onClick={() => approveOffer(offer)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineOffer(offer)}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      if (offer.status === 'approved') {
                        return (
                          <span className="offer-badge offer-live">
                            Offer live for this request: {money(offer.price, offer.currency)},
                            valid to {offer.validTo}
                          </span>
                        );
                      }
                      return <span className="offer-badge offer-declined">Offer declined</span>;
                    })()}
                  </div>
                );
              })
            )}
          </div>

          <div className="activity-list" aria-live="polite">
            {activity.map((item) => {
              const isNew = newActivityIds.has(item.id);
              return (
                <div
                  className={`activity-item ${item.status === 'blocked' ? 'blocked-item' : ''} ${isNew ? 'is-new' : ''}`}
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
              );
            })}
          </div>

          <div className="tool-card">
            <div>
              <span className="tool-pulse" />
              {webMcpStatus === 'active'
                ? 'WebMCP connected'
                : 'WebMCP contract ready'}
            </div>
            <code title="The browser API this page registers its tools on.">
              navigator.modelContext ?? document.modelContext
            </code>
            <p>
              Ask a browser agent to read, draft, reorder, seek, validate, or
              export. Every accepted mutation appears here; rejected claims
              change nothing.
            </p>
          </div>

          <footer className="support-strip">
            Any catalog connector (this demo: a Shopify-shaped snapshot) · Chrome and ChatGPT WebMCP · deployed on Cloudflare Workers
          </footer>
        </aside>
      </section>

      <section
        id="panel-composition"
        role="tabpanel"
        aria-labelledby="tab-composition"
        hidden={tab !== 'composition'}
        className="tab-panel studio-grid composition-grid"
        aria-label={`${BRAND.name} composition`}
      >
        <section className="canvas-panel panel" aria-label="Campaign preview">
          <fieldset
            className="placement-control"
            title="Placement is a human choice, not a WebMCP tool. No agent can set it."
          >
            <legend className="placement-control-label">Placement</legend>
            {(Object.keys(PLACEMENTS) as Placement[]).map((placement) => (
              <button
                key={placement}
                type="button"
                className={`placement-option ${campaign.format.placement === placement ? 'active' : ''}`}
                aria-pressed={campaign.format.placement === placement}
                onClick={() => setPlacement(placement)}
              >
                {PLACEMENTS[placement].label} {PLACEMENTS[placement].ratio}
              </button>
            ))}
          </fieldset>

          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">Live composition</p>
              <h2>
                {PLACEMENTS[campaign.format.placement].ratio} ·{' '}
                {totalDuration.toFixed(1)} seconds
              </h2>
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
              <CompositionScene
                campaign={campaign}
                scene={activeScene}
                playhead={playhead}
              />
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
              <>
                <button
                  type="button"
                  className="inspector-toggle"
                  onClick={() => setInspectorOpen((v) => !v)}
                  aria-expanded={inspectorOpen}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={inspectorOpen ? 'chevron-open' : 'chevron-closed'}
                  />
                  {inspectorOpen ? 'Hide scene details' : 'Show scene details'}
                </button>
                <div
                  className={`scene-inspector ${inspectorOpen ? '' : 'collapsed'}`}
                >
                  <div className="scene-inspector-inner">
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
                </div>
              </>
            )}
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
