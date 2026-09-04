'use client';

// The Loop Room: Codex's presentational components over Hemloop's real state.
//
// This page owns both halves of the loop (the closet's private rows and the
// merchant's locked campaign), registers all 21 WebMCP tools, and builds a
// LoopRoomView from bridge rows and real tool results. The boundaries live in
// the callbacks, not here: report_demand_gap still only leaves through
// emitSignal, and no studio callback can reach the wardrobe.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  LoopRoom,
  type LoopCreative,
  type ProcessingView,
  type RuntimeToolView,
} from '@/components/loop-room';
import { SiteHeader } from '@/components/site-header';
import { BRAND } from '@/lib/proofframe/brand';
import {
  buyingPattern,
  consentFieldsForRequest,
  findGaps,
  garmentsForProfile,
  guessCategory,
  randomGarments,
  readPreferences,
  readPurchases,
  readWardrobe,
  seedPreferences,
  seedPurchases,
  seedWardrobe,
  writePurchases,
  writeWardrobe,
  GARMENT_CATEGORIES,
  MAX_CLOSET_ROWS,
  type DemandSignal,
  type Garment,
  type GarmentCategory,
  type Preferences,
  type Purchase,
  type ShopperProfile,
  type Wardrobe,
} from '@/lib/proofframe/closet';
import {
  currentStation,
  loopRoomFlags,
  patternLabel,
  stationOrder,
  stationStates,
  type ClosetRow,
  type LoopRoomView,
  type StationCard,
  type StationKey,
} from '@/lib/proofframe/loop-room';
import { demandInsight, slug, toDemandSignalLike } from '@/lib/proofframe/offers';
import { SAMPLE_RECEIPTS } from '@/lib/proofframe/receipts';
import {
  readActiveMerchantId,
  readCampaign,
  seedCampaign,
  writeActiveMerchantId,
  writeCampaign,
} from '@/lib/proofframe/seed';
import { marketScan, seedMerchants } from '@/lib/proofframe/merchants';
import type { MarketRow } from '@/lib/proofframe/loop-room';
import { demoCatalog, makeCatalogImporter } from '@/lib/proofframe/shopify';
import {
  appendSignal,
  purchaseFromOffer,
  readConsentLevel,
  readOffers,
  readOutcomes,
  readSignals,
  recordOutcome,
  subscribeOffers,
  subscribeOutcomes,
  subscribeSignals,
  upsertOffer,
  type PersonalOffer,
  type SignalOutcome,
} from '@/lib/proofframe/signal-bridge';
import type { CampaignFacts, CampaignState, Scene } from '@/lib/proofframe/types';
import {
  buildTools,
  getModelContext,
  registerAll,
  type ProofFrameCallbacks,
  type SceneInput,
  type ToolContent,
} from '@/lib/proofframe/webmcp';
import { buildClosetTools, type ClosetCallbacks, type GarmentInput } from '@/lib/proofframe/webmcp-closet';

/** Which station a tool advances. Anything else lands on the current one. */
const STATION_OF: Partial<Record<string, StationKey>> = {
  import_receipt: 'item',
  find_gaps: 'gap',
  report_demand_gap: 'approved',
  get_demand: 'offer',
  propose_offer: 'offer',
  get_offers: 'bought',
};

/** The acts no tool can perform. Shown in the manifest as absent by design. */
const HUMAN_ONLY = ['approve_next_request', 'approve_offer', 'mark_bought', 'lock_facts', 'set_sharing_level'];

const PROFILES: { key: ShopperProfile; label: string }[] = [
  { key: 'self', label: 'Me' },
  { key: 'partner', label: 'Partner' },
  { key: 'kid', label: 'Kid' },
];

const CONSENT_LABEL: Record<0 | 1 | 2 | 3, string> = { 0: 'Private', 1: 'Basics', 2: 'Context', 3: 'Taste' };

type Ran = Record<StationKey, string[]>;

function emptyRan(): Ran {
  return { item: [], gap: [], approved: [], offer: [], bought: [], learned: [], again: [] };
}

type LastCall = { name: string; ok: boolean; message: string | null };
type LastRan = { station: StationKey; tools: string[] } | null;

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function catalogProductFor(facts: CampaignFacts) {
  const match = demoCatalog.products.find((p) => p.title === facts.productName);
  return {
    handle: match?.handle ?? slug(facts.productName),
    title: match?.title ?? facts.productName,
    image: match?.image ?? facts.productImage,
    sizesInStock: facts.sizesInStock,
  };
}

/** A photo for a garment that has none (receipt imports, Bought): the catalog
 * product in the same category, from the same vendor when there is one. */
function imageForCategory(category: GarmentCategory, vendor?: string): string | undefined {
  const same = demoCatalog.products.filter((p) => guessCategory(p) === category);
  return (same.find((p) => p.vendor === vendor) ?? same[0])?.image;
}

/** Offer ids are `handle:code:validTo:hash`; the hash is the short, unique part. */
function shortOfferId(offerId: string | null | undefined): string {
  return offerId?.split(':').pop() ?? '';
}

function sayImport(sample: { text: string }): string {
  return `Import this receipt:\n${sample.text}`;
}

export function LoopRoomPage() {
  // ----- Closet side: private rows, human gates -----
  const [wardrobe, setWardrobe] = useState<Wardrobe>(seedWardrobe);
  const wardrobeRef = useRef(wardrobe);
  const [purchases, setPurchases] = useState<Purchase[]>(seedPurchases);
  const purchasesRef = useRef(purchases);
  const preferencesRef = useRef<Preferences>(seedPreferences());
  const [consentLevel, setConsentLevel] = useState<0 | 1 | 2 | 3>(1);
  const consentRef = useRef<0 | 1 | 2 | 3>(1);
  const [shareArmed, setShareArmed] = useState(false);
  const shareArmedRef = useRef(false);
  const [activeProfile, setActiveProfile] = useState<ShopperProfile>('self');
  const activeProfileRef = useRef<ShopperProfile>('self');
  const seqRef = useRef(0);
  const hydratedRef = useRef(false);
  // Garment ids added during this session, so the stack can flag them new.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // ----- Merchant side: per-merchant campaign -----
  // Active merchant's campaign is what the 12 studio tools read/write.
  const merchants = useMemo(() => seedMerchants(), []);
  const [activeMerchantId, setActiveMerchantId] = useState('northlight');
  const activeMerchantIdRef = useRef(activeMerchantId);
  const [campaign, setCampaign] = useState<CampaignState>(() => seedCampaign('northlight'));
  const campaignRef = useRef(campaign);
  const campaignHydratedRef = useRef(false);

  // ----- The bridge -----
  const [signals, setSignals] = useState<DemandSignal[]>([]);
  const signalsRef = useRef<DemandSignal[]>([]);
  const [offers, setOffers] = useState<PersonalOffer[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([]);

  // ----- This session's loop -----
  const [ran, setRan] = useState<Ran>(emptyRan);
  const [lastRan, setLastRan] = useState<LastRan>(null);
  const [loop, setLoop] = useState<{ number: number; startedAt: string | null }>({ number: 1, startedAt: null });
  const [lastCall, setLastCall] = useState<LastCall | null>(null);
  const [processing, setProcessing] = useState<ProcessingView | null>(null);
  const [runtime, setRuntime] = useState({ live: false, toolCount: 0 });
  const closedRef = useRef(false);
  const currentRef = useRef<StationKey>('item');

  useEffect(() => {
    let active = true;
    const loadBridge = () => {
      if (!active) return;
      const next = readSignals();
      signalsRef.current = next;
      setSignals(next);
      setOffers(readOffers());
      setOutcomes(readOutcomes());
    };
    queueMicrotask(() => {
      if (!active) return;
      const storedWardrobe = readWardrobe();
      wardrobeRef.current = storedWardrobe;
      setWardrobe(storedWardrobe);
      hydratedRef.current = true;
      const storedPurchases = readPurchases();
      purchasesRef.current = storedPurchases;
      setPurchases(storedPurchases);
      preferencesRef.current = readPreferences();
      const level = readConsentLevel();
      consentRef.current = level;
      setConsentLevel(level);
      loadBridge();
    });
    const unsubscribe = [subscribeSignals(loadBridge), subscribeOffers(loadBridge), subscribeOutcomes(loadBridge)];
    return () => {
      active = false;
      for (const u of unsubscribe) u();
    };
  }, []);

  // One wardrobe for every page: written after the stored one is read, so
  // the seed never overwrites what /closet already holds.
  useEffect(() => {
    if (hydratedRef.current) writeWardrobe(wardrobe);
  }, [wardrobe]);

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

  const switchMerchant = useCallback((merchantId: string) => {
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
  }, []);

  const addGarments = useCallback((rows: Garment[]) => {
    if (rows.length === 0) return;
    const next = { ...wardrobeRef.current, garments: [...wardrobeRef.current.garments, ...rows] };
    wardrobeRef.current = next;
    setWardrobe(next);
    setNewIds((current) => {
      const out = new Set(current);
      for (const g of rows) out.add(g.id);
      return out;
    });
  }, []);

  const insertGarment = useCallback(
    (input: GarmentInput): Garment => {
      seqRef.current += 1;
      const garment: Garment = {
        id: `g-${Date.now().toString(36)}-${seqRef.current}`,
        ...input,
        for: activeProfileRef.current,
      };
      addGarments([garment]);
      return garment;
    },
    [addGarments],
  );

  const addPurchases = useCallback((rows: Purchase[]) => {
    if (rows.length === 0) return;
    const next = [...rows, ...purchasesRef.current];
    purchasesRef.current = next;
    setPurchases(next);
    writePurchases(next);
  }, []);

  // Every callback reads a ref, so both sets are built once and the tools
  // register once; a re-registration would reject on duplicate names.
  const closetCallbacks = useMemo<ClosetCallbacks>(
    () => ({
      getWardrobe: () => wardrobeRef.current,
      addGarment: insertGarment,
      consumeShareApproval: () => {
        if (!shareArmedRef.current) return false;
        shareArmedRef.current = false;
        setShareArmed(false);
        return true;
      },
      emitSignal: appendSignal,
      getActiveProfile: () => activeProfileRef.current,
      getConsentLevel: () => consentRef.current,
      getPreferences: () => preferencesRef.current,
      getPurchases: () => purchasesRef.current,
      addPurchases,
    }),
    [addPurchases, insertGarment],
  );

  const studioCallbacks = useMemo<ProofFrameCallbacks>(() => {
    const commit = (transform: (c: CampaignState) => CampaignState) => {
      const next = transform(campaignRef.current);
      campaignRef.current = next;
      setCampaign(next);
    };
    return {
      getState: () => campaignRef.current,
      setBrief: (brief) => commit((c) => ({ ...c, brief })),
      addScene: (input: SceneInput) => {
        const ids = new Set(campaignRef.current.scenes.map((s) => s.id));
        let n = campaignRef.current.scenes.length + 1;
        let id = `scene-${n}`;
        while (ids.has(id)) id = `scene-${++n}`;
        const scene: Scene = { id, ...input };
        commit((c) => ({ ...c, scenes: [...c.scenes, scene] }));
        return scene;
      },
      updateScene: (id, patch) =>
        commit((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      reorderScenes: (orderedIds) =>
        commit((c) => ({
          ...c,
          scenes: orderedIds
            .map((id) => c.scenes.find((s) => s.id === id))
            .filter((s): s is Scene => Boolean(s)),
        })),
      // ponytail: no preview canvas on this page; the studio owns playback.
      seekPreview: () => {},
      importProduct: (handle) => {
        if (campaignRef.current.factsLocked) {
          throw new Error('Offer facts are locked. Ask the merchant to unlock them in the studio before importing a product.');
        }
        const facts = makeCatalogImporter(() => campaignRef.current.facts)(handle);
        commit((c) => ({ ...c, facts }));
        return facts;
      },
      deliverExport: (html) => {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${BRAND.name.toLowerCase()}-composition.html`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      getRequests: () => signalsRef.current,
      getOffers: () => readOffers(),
      stageOffer: (offer) => {
        upsertOffer(offer);
      },
      getCatalogProduct: () => catalogProductFor(campaignRef.current.facts),
      getBoughtRequestIds: () =>
        readOutcomes()
          .filter((o) => o.outcome === 'bought')
          .map((o) => o.signalId),
    };
  }, []);

  const onToolResult = useCallback((name: string, result: ToolContent) => {
    const okValue = (result as { ok?: boolean }).ok !== false;
    const message = (result as { message?: unknown }).message;
    setLastCall({ name, ok: okValue, message: typeof message === 'string' ? message : null });
    if (!okValue) return;
    // A closed loop plus a new receipt is the restart: the next loop starts now.
    if (name === 'import_receipt' && closedRef.current) {
      closedRef.current = false;
      setLoop((l) => ({ number: l.number + 1, startedAt: new Date().toISOString() }));
      setRan({ ...emptyRan(), item: ['import_receipt'], again: ['import_receipt'] });
      setLastRan({ station: 'item', tools: ['import_receipt'] });
      return;
    }
    const station = STATION_OF[name] ?? currentRef.current;
    setRan((r) => {
      const tools = r[station].includes(name) ? r[station] : [...r[station], name];
      setLastRan({ station, tools });
      return { ...r, [station]: tools };
    });
  }, []);

  // Built in the effect, not during render: the callbacks close over refs.
  const [manifest, setManifest] = useState<RuntimeToolView[]>([]);

  useEffect(() => {
    let active = true;
    const built = [...buildClosetTools(closetCallbacks), ...buildTools(studioCallbacks)];
    const tools = built.map((t) => ({
      ...t,
      execute: async (args: Record<string, unknown>, options?: { signal?: AbortSignal }) => {
        if (active) setProcessing({ tool: t.name, label: 'Real WebMCP call, landing on this page' });
        try {
          const result = await t.execute(args, options);
          if (active) onToolResult(t.name, result);
          return result;
        } finally {
          if (active) setProcessing(null);
        }
      },
    }));
    registerAll(getModelContext(), tools)
      .then((result) => {
        if (!active) return;
        setManifest(
          built.map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            readOnly: Boolean(t.annotations?.readOnlyHint),
          })),
        );
        if (result.rejected.length > 0) console.error('WebMCP registration rejected', result.rejected);
        setRuntime({
          live: result.registered.length > 0,
          toolCount: result.registered.length > 0 ? result.registered.length : tools.length,
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error('WebMCP registration failed', error);
        setRuntime({ live: false, toolCount: tools.length });
      });
    return () => {
      active = false;
    };
  }, [closetCallbacks, studioCallbacks, onToolResult]);

  // ----- Derived: this loop's rows -----
  const since = useCallback((at: string) => loop.startedAt === null || at >= loop.startedAt, [loop.startedAt]);
  const loopSignals = useMemo(() => signals.filter((s) => since(s.at)), [signals, since]);
  const sentIds = useMemo(() => new Set(loopSignals.map((s) => s.signalId)), [loopSignals]);
  const loopOffers = useMemo(
    () => offers.filter((o) => sentIds.has(o.requestId) && since(o.proposedAt)),
    [offers, sentIds, since],
  );
  const approvedOffer = loopOffers.find((o) => o.status === 'approved') ?? null;
  const proposedOffer = loopOffers.find((o) => o.status === 'proposed') ?? null;
  const latestOffer = approvedOffer ?? proposedOffer;
  const boughtOutcome =
    outcomes.find((o) => o.outcome === 'bought' && since(o.at) && sentIds.has(o.signalId)) ?? null;
  const attributedPurchase =
    purchases.find((p) => p.offerId != null && loopOffers.some((o) => o.offerId === p.offerId)) ?? null;
  const latestImport = purchases.find((p) => p.id.startsWith('import-')) ?? null;
  const profileWardrobe = useMemo(() => garmentsForProfile(wardrobe, activeProfile), [wardrobe, activeProfile]);
  const gaps = useMemo(() => findGaps(profileWardrobe), [profileWardrobe]);
  const garmentCount = profileWardrobe.garments.length;
  const lastSignal = loopSignals[0] ?? null;
  const market: MarketRow[] | null = useMemo(() => {
    if (!lastSignal) return null;
    const request = toDemandSignalLike(lastSignal);
    if (!request) return null;
    const ceiling =
      typeof lastSignal.taste?.priceCeiling === 'number' ? lastSignal.taste.priceCeiling : null;
    const live = merchants.map((m) =>
      m.id === activeMerchantId ? { ...m, facts: campaign.facts } : m,
    );
    return marketScan(request, live, ceiling);
  }, [lastSignal, merchants, activeMerchantId, campaign.facts]);

  // When a request lands, the right store answers: switch to the first can-offer
  // if the active merchant cannot.
  useEffect(() => {
    if (!market || !campaignHydratedRef.current) return;
    const activeRow = market.find((r) => r.merchantId === activeMerchantId);
    if (activeRow?.verdict === 'can-offer') return;
    const first = market.find((r) => r.verdict === 'can-offer');
    if (first) switchMerchant(first.merchantId);
  }, [market, activeMerchantId, switchMerchant]);

  const activeMerchant = merchants.find((m) => m.id === activeMerchantId) ?? merchants[0];
  const groups = useMemo(
    () =>
      demandInsight(
        loopSignals.map(toDemandSignalLike).filter((r): r is NonNullable<typeof r> => r !== null),
        campaign.facts,
        catalogProductFor(campaign.facts),
        outcomes.filter((o) => o.outcome === 'bought').map((o) => o.signalId),
      ),
    [loopSignals, campaign.facts, outcomes],
  );

  const ranOk = useMemo(() => new Set(Object.values(ran).flat()), [ran]);
  const flags = loopRoomFlags({
    ran: ranOk,
    hasImportedPurchase: latestImport !== null,
    signals,
    offers,
    outcomes,
    purchases,
    loopStartedAt: loop.startedAt,
  });
  const states = stationStates(flags, loop.number);
  const current = currentStation(states);
  useEffect(() => {
    closedRef.current = flags.attributed;
    currentRef.current = current;
  }, [flags.attributed, current]);

  // Pattern before and after this loop's attributable purchase, for the category it answered.
  const patternCategory: GarmentCategory =
    attributedPurchase?.category ?? lastSignal?.category ?? latestImport?.category ?? 'hoodie';
  const patternAfter = patternLabel(buyingPattern(purchases, patternCategory));
  const patternBefore = patternLabel(
    buyingPattern(
      purchases.filter((p) => p !== attributedPurchase),
      patternCategory,
    ),
  );

  const gapForRequest = gaps.find((g) => g.due) ?? gaps[0] ?? null;
  const importSample = SAMPLE_RECEIPTS[loop.number > 1 ? 1 : 0];
  const profileLabel = PROFILES.find((p) => p.key === activeProfile)?.label ?? 'Me';
  const lastPurchase = [...purchases].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  const previewFields = consentFieldsForRequest(consentLevel, { hasSize: true, hasHandle: false, hasOccasion: false });
  const ownedByCategory = GARMENT_CATEGORIES.map(
    (c) => `${c} ${profileWardrobe.garments.filter((g) => g.category === c).length}`,
  ).join(' · ');
  const request = gapForRequest
    ? `${gapForRequest.category}${gapForRequest.due ? `, size ${gapForRequest.due.size}` : ''}`
    : 'hoodie, size M';
  const stationCards: StationCard[] = stationOrder().map((key) => {
    const state = states[key];
    const base = { key, state, toolsRan: ran[key] };
    switch (key) {
      case 'item':
        return {
          ...base,
          label: 'New item',
          eyebrow: 'A purchase, privately',
          title: loop.number > 1 ? 'A rival receipt lands in the closet' : 'A purchase lands in the closet',
          say: sayImport(importSample),
          facts: [
            { label: 'Closet', value: `${garmentCount} garments for ${profileLabel}, private to this page` },
            { label: 'Purchases logged', value: `${purchases.length} across every store` },
            ...(lastPurchase ? [{ label: 'Last purchase', value: `${lastPurchase.title} · ${lastPurchase.merchant}` }] : []),
          ],
          updated: latestImport
            ? [
                { label: 'Purchase logged', value: `${latestImport.title} · ${latestImport.merchant} · ${latestImport.size}` },
                { label: 'Pattern', value: `${latestImport.category}: ${patternLabel(buyingPattern(purchases, latestImport.category))}` },
              ]
            : [],
          shopperSees: 'The receipt parsed here: a purchase row and a garment appeared. Nothing was sent anywhere.',
          merchantSees: 'Nothing. A purchase is private until the shopper approves a request.',
          humanGate: null,
        };
      case 'gap':
        return {
          ...base,
          label: 'Local demand',
          eyebrow: 'What is true in the closet',
          title: 'What the closet has, then what it is missing',
          say: 'What should I buy next?',
          facts: [
            { label: 'Owned', value: ownedByCategory },
            ...(gaps.find((g) => g.due)
              ? [{ label: 'Oldest', value: `${gaps.find((g) => g.due)!.category} bought ${gaps.find((g) => g.due)!.due!.lastBoughtAt}, size ${gaps.find((g) => g.due)!.due!.size}` }]
              : []),
          ],
          updated:
            state === 'done'
              ? gaps.slice(0, 3).map((g) => ({ label: g.due ? `${g.category} · worn out` : `${g.category} · missing`, value: g.reason }))
              : [],
          shopperSees: 'Gaps computed from wardrobe rows and purchase dates. The dates never leave.',
          merchantSees: 'Nothing yet. A gap is a private fact until one request is approved.',
          humanGate: null,
        };
      case 'approved': {
        const refused = lastCall && lastCall.name === 'report_demand_gap' && !lastCall.ok ? lastCall : null;
        return {
          ...base,
          label: 'Approved request',
          eyebrow: 'One human gate',
          title: 'Refused, one human press, then exactly one packet leaves',
          say: shareArmed ? `Yes, send it. Tell the store I need ${request}` : `Tell the store I need ${request}`,
          facts: [
            { label: 'Sharing level', value: `${consentLevel} · ${CONSENT_LABEL[consentLevel]}` },
            { label: 'Would travel', value: previewFields.length ? previewFields.join(', ') : 'nothing' },
            { label: 'Would not', value: 'shopper id, wardrobe rows, purchase log, household profile' },
          ],
          updated: [
            ...(refused ? [{ label: 'Refused', value: refused.message ?? 'Human approval required' }] : []),
            ...(lastSignal
              ? [
                  { label: 'Sent', value: `${lastSignal.kind} · ${lastSignal.category} · ${lastSignal.size ?? 'any size'} · sharing level ${lastSignal.consent.level}` },
                  { label: 'Fields that crossed', value: lastSignal.consent.fields.join(', ') },
                ]
              : []),
          ],
          shopperSees:
            consentLevel === 0
              ? 'Sharing is set to Private on the closet page. Nothing can leave until it is raised.'
              : shareArmed
                ? 'Approved. The agent is waiting for your go-ahead in the chat: reply "Yes, send it".'
                : 'The agent is refused until you press Approve. One press releases one event.',
          merchantSees: lastSignal
            ? 'One event: category, size, need or want. No shopper id, no wardrobe row.'
            : 'Nothing yet.',
          humanGate:
            state === 'done' || consentLevel === 0
              ? null
              : {
                  label: shareArmed ? 'Approved · now reply "Yes, send it"' : 'Approve next request',
                  hint: `One press releases one event at sharing level ${consentLevel}. No tool can press it.`,
                },
        };
      }
      case 'offer':
        return {
          ...base,
          label: 'Matched offer',
          eyebrow: 'Inside locked rules',
          title: 'Grouped demand, a proposal inside locked rules, one human approval',
          say: 'Which store can fill this, and what can it offer inside its rules?',
          facts: [
            ...(market ?? []).map((row) => ({
              label: row.name,
              value: `${row.verdict}${row.price != null ? ` · ${money(row.price, row.currency)}` : ''} · ${row.reason}`,
            })),
            { label: 'Answering', value: activeMerchant.name },
          ],
          updated: [
            ...(groups.length > 0
              ? [{ label: 'Demand', value: `${groups.length} group${groups.length === 1 ? '' : 's'} · ${groups[0].category} ${groups[0].size} · ${groups[0].verdict}` }]
              : []),
            ...(latestOffer
              ? [
                  { label: 'Proposal', value: `${money(latestOffer.price, latestOffer.currency)} (${latestOffer.discountPercent}% off) · margin ${latestOffer.marginCheck.resultingMarginPercent}% vs floor ${latestOffer.marginCheck.floorPercent}%` },
                  { label: 'Reasons', value: latestOffer.reasons.join('; ') },
                  { label: 'Status', value: latestOffer.status },
                ]
              : []),
          ],
          shopperSees: approvedOffer
            ? 'An offer addressed to the request id, never to a person.'
            : 'Nothing yet. A proposal stays on the merchant side until a human approves it.',
          merchantSees: `${activeMerchant.name} is answering. Demand scored against locked facts; a proposal checked against the margin floor.`,
          humanGate:
            proposedOffer && !approvedOffer
              ? { label: 'Approve offer', hint: 'The shopper cannot see a proposal until a merchant approves it.' }
              : null,
        };
      case 'bought':
        return {
          ...base,
          label: 'Bought',
          eyebrow: 'The shopper decides',
          title: 'The offer returns to the request; a human buys',
          say: 'Any offers for me?',
          facts: approvedOffer
            ? [
                { label: 'Merchant', value: activeMerchant.name },
                { label: 'Offer', value: `${approvedOffer.title} · ${approvedOffer.size ?? 'any size'} · ${money(approvedOffer.price, approvedOffer.currency)}` },
                { label: 'Code', value: approvedOffer.promoCode ?? 'none, price already applied' },
                { label: 'Valid to', value: approvedOffer.validTo },
              ]
            : [],
          updated: boughtOutcome ? [{ label: 'Outcome', value: `bought · ${new Date(boughtOutcome.at).toLocaleTimeString()}` }] : [],
          shopperSees: approvedOffer ? 'Price, code, validity and a checkout link. Bought or Passed is yours alone.' : 'No offer yet.',
          merchantSees: boughtOutcome
            ? `${activeMerchant.name}: one request came back bought. Still no shopper id.`
            : 'Waiting on the shopper.',
          humanGate:
            approvedOffer && !boughtOutcome
              ? { label: 'Bought', hint: 'No tool can buy for the shopper. This press logs the purchase in the closet.' }
              : null,
        };
      case 'learned':
        return {
          ...base,
          label: 'Learned',
          eyebrow: 'Both sides gained',
          title: 'Both sides gained. Nobody gained a profile.',
          say: null,
          facts: [
            { label: 'Merchant', value: activeMerchant.name },
            { label: 'Pattern before', value: `${patternCategory}: ${patternBefore}` },
          ],
          updated: attributedPurchase
            ? [
                { label: 'Purchase', value: `${attributedPurchase.title} · offer #${shortOfferId(attributedPurchase.offerId)}` },
                { label: 'Pattern after', value: `${patternCategory}: ${patternAfter}` },
              ]
            : [],
          shopperSees: 'The purchase carries the offer that won it. The next offer is shaped by a sharper pattern.',
          merchantSees: `${activeMerchant.name}: an attributable sale and demand it could not see before.`,
          humanGate: null,
        };
      case 'again':
        return {
          ...base,
          label: 'Again',
          eyebrow: 'The loop runs again',
          title: 'A rival receipt starts the next loop',
          say: sayImport(SAMPLE_RECEIPTS[1]),
          facts: [{ label: 'Cycle', value: `${loop.number} · ${purchases.length} purchases logged` }],
          updated: loop.number > 1 ? [{ label: 'Loop', value: `cycle ${loop.number} started` }] : [],
          shopperSees: 'A rival purchase lands in the same closet. The pattern sharpens; nothing about it leaves.',
          merchantSees: 'Nothing, until the next approved request.',
          humanGate: null,
        };
    }
  });

  const closet: ClosetRow[] = [...profileWardrobe.garments].reverse().map((g) => ({
    id: g.id,
    category: g.category,
    brand: g.brand,
    size: g.size,
    image: g.image ?? imageForCategory(g.category, g.brand),
    isNew: newIds.has(g.id),
  }));

  const view: LoopRoomView = {
    stations: stationCards,
    current,
    closet,
    profiles: { active: activeProfile, options: PROFILES },
    lastRan,
    // Multi-merchant market scan; Codex renders view.market in the room.
    market,
    activeMerchant: { id: activeMerchant.id, name: activeMerchant.name },
    progress: stationCards.filter((s) => s.state === 'done').length,
    loopNumber: loop.number,
    packet: lastSignal
      ? {
          kind: lastSignal.kind,
          category: lastSignal.category,
          size: lastSignal.size,
          level: lastSignal.level,
          occasion: lastSignal.occasion ?? null,
          shoppingFor: lastSignal.for ?? null,
          sharingLevel: lastSignal.consent.level,
          fields: lastSignal.consent.fields.join(', '),
        }
      : null,
    proposal: latestOffer
      ? {
          price: latestOffer.price,
          regularPrice: latestOffer.regularPrice,
          discountPercent: latestOffer.discountPercent,
          promoCode: latestOffer.promoCode,
          marginPercent: latestOffer.marginCheck.resultingMarginPercent,
          marginFloor: latestOffer.marginCheck.floorPercent,
          reasons: latestOffer.reasons,
          status: latestOffer.status === 'approved' ? 'approved' : 'proposed',
        }
      : null,
    offer: approvedOffer
      ? {
          title: approvedOffer.title,
          price: approvedOffer.price,
          currency: approvedOffer.currency,
          purchaseUrl: approvedOffer.purchaseUrl,
          image: approvedOffer.image,
        }
      : null,
    outcome:
      flags.attributed && approvedOffer && attributedPurchase
        ? {
            customerGained: [
              `${approvedOffer.title}${approvedOffer.size ? ` in size ${approvedOffer.size}` : ''}, the gap it asked about`,
              `${money(approvedOffer.price, approvedOffer.currency)} instead of ${money(approvedOffer.regularPrice, approvedOffer.currency)}`,
              'No account, no profile, no tracking left behind',
            ],
            merchantGained: [
              `One attributable sale: the purchase carries offer #${shortOfferId(approvedOffer.offerId)}`,
              `Demand it could not see: ${groups.length} group${groups.length === 1 ? '' : 's'} by category and size`,
              'A sharper buying pattern for the next offer',
            ],
            patternBefore,
            patternAfter,
            nobodyGained: 'Wardrobe rows, identity, household profile and the purchase log stayed on this page.',
          }
        : null,
    runtime: { live: runtime.live, toolCount: runtime.toolCount, absent: HUMAN_ONLY },
  };

  const offerScene = campaign.scenes.find((s) => s.kind === 'offer');
  let creative: LoopCreative | null = null;
  if ((current === 'item' || current === 'gap') && latestImport) {
    creative = {
      kind: 'product',
      image: imageForCategory(latestImport.category, latestImport.brand),
      kicker: 'New in the closet',
      title: latestImport.title,
      detail: `${latestImport.merchant} · ${latestImport.size} · ${money(latestImport.price, latestImport.currency)}`,
    };
  } else if (current === 'offer' && latestOffer) {
    creative = {
      kind: 'composition',
      image: latestOffer.image ?? campaign.facts.productImage,
      kicker: 'Composition preview',
      title: offerScene?.heading ?? latestOffer.title,
      detail: offerScene?.body ?? campaign.facts.disclaimer,
    };
  } else if (current === 'offer' && groups.length > 0) {
    creative = {
      kind: 'product',
      image: campaign.facts.productImage,
      kicker: 'Locked offer',
      title: campaign.facts.productName,
      detail: campaign.facts.disclaimer,
    };
  } else if (current === 'bought' && approvedOffer) {
    creative = {
      kind: 'checkout',
      image: approvedOffer.image ?? campaign.facts.productImage,
      kicker: 'Checkout',
      title: approvedOffer.title,
      detail: `${money(approvedOffer.price, approvedOffer.currency)}${approvedOffer.promoCode ? ` · code ${approvedOffer.promoCode}` : ''}`,
      href: approvedOffer.purchaseUrl,
    };
  } else if ((current === 'learned' || current === 'again') && attributedPurchase) {
    creative = {
      kind: 'product',
      image: approvedOffer?.image ?? imageForCategory(attributedPurchase.category, attributedPurchase.brand),
      kicker: 'Now in the closet',
      title: attributedPurchase.title,
      detail: `${attributedPurchase.merchant} · offer #${shortOfferId(attributedPurchase.offerId)}`,
    };
  }

  const onHumanGate = useCallback(
    (station: StationKey) => {
      if (station === 'approved') {
        shareArmedRef.current = !shareArmedRef.current;
        setShareArmed(shareArmedRef.current);
        return;
      }
      if (station === 'offer' && proposedOffer && !approvedOffer) {
        upsertOffer({ ...proposedOffer, status: 'approved', approvedAt: new Date().toISOString() });
        return;
      }
      if (station === 'bought' && approvedOffer && !boughtOutcome) {
        const at = new Date().toISOString();
        if (!recordOutcome({ signalId: approvedOffer.requestId, outcome: 'bought', at })) return;
        seqRef.current += 1;
        const purchase = purchaseFromOffer(approvedOffer, `offer-${Date.now().toString(36)}-${seqRef.current}`, at);
        addPurchases([purchase]);
        insertGarment({
          category: purchase.category,
          brand: purchase.brand,
          size: purchase.size,
          colour: 'unspecified',
          purchasedAt: at.slice(0, 10),
        });
      }
    },
    [addPurchases, approvedOffer, boughtOutcome, insertGarment, proposedOffer],
  );

  const onAddGarments = useCallback(() => {
    addGarments(randomGarments(5, wardrobeRef.current, activeProfileRef.current));
  }, [addGarments]);

  const onSelectProfile = useCallback((profile: ShopperProfile) => {
    activeProfileRef.current = profile;
    setActiveProfile(profile);
  }, []);

  const onCopySay = useCallback((prompt: string) => {
    navigator.clipboard?.writeText(prompt).catch(() => {});
  }, []);

  return (
    <>
      <SiteHeader
        active="loop"
        status={runtime.live ? `${runtime.toolCount} WebMCP tools live` : `${runtime.toolCount} tools · preview mode`}
      />
      <LoopRoom
        view={view}
        tools={manifest}
        processing={processing}
        creative={creative}
        onCopySay={onCopySay}
        onHumanGate={onHumanGate}
        onAddGarments={garmentCount < MAX_CLOSET_ROWS ? onAddGarments : undefined}
        onSelectProfile={onSelectProfile}
      />
    </>
  );
}
