'use client';

import {
  Import,
  Pencil,
  Radio,
  Shirt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { LoopRail } from '@/components/loop-rail';
import { BRAND } from '@/lib/proofframe/brand';

import '@/app/closet.css';
import {
  consentFieldsForRequest,
  findGaps,
  garmentsForProfile,
  readPreferences,
  readPurchases,
  seedPreferences,
  seedPurchases,
  seedWardrobe,
  sizesOwned,
  writePreferences,
  writePurchases,
  type ConsentField,
  type DemandSignal,
  type Garment,
  type GarmentCategory,
  type Preferences,
  type Purchase,
  type ShopperProfile,
  type Wardrobe,
} from '@/lib/proofframe/closet';
import { SAMPLE_RECEIPTS, parseReceipt } from '@/lib/proofframe/receipts';
import {
  appendSignal,
  clearSignals,
  purchaseFromOffer,
  readConsentLevel,
  readOffers,
  readOutcomes,
  readSignals,
  recordOutcome,
  subscribeOffers,
  subscribeOutcomes,
  subscribeSignals,
  writeConsentLevel,
  type PersonalOffer,
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
    leaves: '+ occasion (season, gift, event), fit preference, who you are shopping for',
    gains: 'offers timed and cut for the occasion',
  },
  {
    level: 3,
    label: 'Taste',
    leaves:
      '+ colour family, materials to avoid, price ceiling, buying pattern (discount sensitivity, spend band, brand loyalty)',
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
  buyingPattern: 'Buying pattern',
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

  // Purchases across every merchant (including rivals). Same
  // deterministic-seed-then-swap pattern as preferences: SSR-safe seed on
  // first render, then whatever is already in this browser once mounted.
  const [purchases, setPurchases] = useState<Purchase[]>(seedPurchases);
  const purchasesRef = useRef(purchases);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = readPurchases();
      purchasesRef.current = stored;
      setPurchases(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Approved personal offers, read from the bridge like signals/outcomes.
  const [offers, setOffers] = useState<PersonalOffer[]>([]);
  const prevOfferIdsRef = useRef<Set<string> | null>(null);
  const [newOfferIds, setNewOfferIds] = useState<Set<string>>(new Set());
  // Mirrors `signals` without becoming a callback dependency, so
  // applyOffers can check "is this offer addressed to me" at call time.
  const sentSignalIdsRef = useRef<Set<string>>(new Set());

  const [receiptText, setReceiptText] = useState('');

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

  const garmentSeqRef = useRef(0);

  // Low-level insert, no trail entry - shared by the AI-attributed
  // addGarment below and any human-initiated path (receipt import, an
  // offer marked Bought) that wants its own single summary trail entry
  // instead of one per garment.
  const insertGarment = useCallback((input: GarmentInput): Garment => {
    garmentSeqRef.current += 1;
    const garment: Garment = {
      id: `g-${Date.now().toString(36)}-${garmentSeqRef.current}`,
      ...input,
      for: activeProfileRef.current,
    };
    const next = {
      ...wardrobeRef.current,
      garments: [...wardrobeRef.current.garments, garment],
    };
    wardrobeRef.current = next;
    setWardrobe(next);
    return garment;
  }, []);

  const addGarment = useCallback(
    (input: GarmentInput): Garment => {
      const garment = insertGarment(input);
      pushTrail({
        actor: 'AI',
        title: `Added ${input.category} to the wardrobe`,
        detail: `${input.brand} · ${input.size} · ${input.colour}`,
      });
      return garment;
    },
    [insertGarment, pushTrail],
  );

  const addPurchases = useCallback((newPurchases: Purchase[]) => {
    if (newPurchases.length === 0) return;
    const next = [...newPurchases, ...purchasesRef.current];
    purchasesRef.current = next;
    setPurchases(next);
    writePurchases(next);
  }, []);

  const emitSignal = useCallback(
    (signal: DemandSignal) => {
      const delivered = appendSignal(signal);
      pushTrail({
        actor: 'AI',
        title: delivered
          ? 'Sent an approved request (no shopper identifier)'
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
      getPurchases: () => purchasesRef.current,
      addPurchases,
    }),
    [addGarment, addPurchases, consumeShareApproval, emitSignal],
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

  useEffect(() => {
    sentSignalIdsRef.current = new Set(signals.map((s) => s.signalId));
  }, [signals]);

  const applyOffers = useCallback(
    (next: PersonalOffer[]) => {
      const prev = prevOfferIdsRef.current;
      const fresh =
        prev === null ? [] : next.filter((o) => !prev.has(o.offerId));
      setNewOfferIds(
        prev === null ? new Set() : new Set(fresh.map((o) => o.offerId)),
      );
      prevOfferIdsRef.current = new Set(next.map((o) => o.offerId));
      setOffers(next);
      if (prev !== null) {
        for (const o of fresh) {
          if (o.status === 'approved' && sentSignalIdsRef.current.has(o.requestId)) {
            pushTrail({
              actor: 'AI',
              title: 'Offer received for one of your requests',
              detail: `${o.title}${o.size ? ` · ${o.size}` : ''} · ${o.discountPercent}% off`,
            });
          }
        }
      }
    },
    [pushTrail],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) applyOffers(readOffers());
    });
    const unsubscribe = subscribeOffers(() => applyOffers(readOffers()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyOffers]);

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

  const importReceiptText = useCallback(
    (text: string) => {
      const parsed = parseReceipt(text);
      if (!parsed) {
        pushTrail({
          actor: 'ME',
          title: 'Could not import',
          detail:
            'Paste the receipt or order email text as-is, including the merchant name and item lines.',
        });
        return false;
      }
      const looksLikeEmail =
        /^order\s*#/im.test(text) || /thank you for your order/i.test(text);
      const source: Purchase['source'] = looksLikeEmail ? 'order-email' : 'receipt';
      const stamp = Date.now().toString(36);
      const newPurchases: Purchase[] = parsed.items.map((item, i) => ({
        id: `import-${stamp}-${i}`,
        at: parsed.at,
        merchant: parsed.merchant,
        brand: parsed.merchant,
        title: item.title,
        category: (item.category ?? 'accessory') as GarmentCategory,
        size: item.size ?? 'OS',
        price: item.price,
        currency: parsed.currency,
        promoCode: parsed.promoCode,
        source,
      }));
      addPurchases(newPurchases);
      let garmentsAdded = 0;
      for (const item of parsed.items) {
        if (!item.category) continue;
        insertGarment({
          category: item.category,
          brand: parsed.merchant,
          size: item.size ?? 'OS',
          colour: 'unspecified',
          purchasedAt: parsed.at.slice(0, 10),
        });
        garmentsAdded++;
      }
      pushTrail({
        actor: 'ME',
        title: `Imported ${parsed.items.length} item${parsed.items.length === 1 ? '' : 's'} from ${parsed.merchant}`,
        detail: `${newPurchases.length} purchase${newPurchases.length === 1 ? '' : 's'} logged, ${garmentsAdded} added to the wardrobe.`,
      });
      return true;
    },
    [addPurchases, insertGarment, pushTrail],
  );

  const handleImportSubmit = useCallback(() => {
    const text = receiptText.trim();
    if (!text) return;
    const imported = importReceiptText(text);
    if (imported) setReceiptText('');
  }, [receiptText, importReceiptText]);

  const recordOfferOutcome = useCallback(
    (offer: PersonalOffer, outcome: SignalOutcome['outcome']) => {
      const at = new Date().toISOString();
      const stamped: SignalOutcome = { signalId: offer.requestId, outcome, at };
      const delivered = recordOutcome(stamped);
      if (delivered) setOutcomes((current) => [stamped, ...current]);
      if (outcome === 'bought') {
        garmentSeqRef.current += 1;
        const purchase = purchaseFromOffer(
          offer,
          `offer-${Date.now().toString(36)}-${garmentSeqRef.current}`,
          at,
        );
        addPurchases([purchase]);
        insertGarment({
          category: purchase.category,
          brand: purchase.brand,
          size: purchase.size,
          colour: 'unspecified',
          purchasedAt: purchase.at.slice(0, 10),
        });
      }
      pushTrail({
        actor: 'ME',
        title: delivered
          ? outcome === 'bought'
            ? 'Marked bought from an offer'
            : 'Passed on an offer'
          : `Could not record ${outcome}`,
        detail: `${offer.title}${offer.size ? ` · ${offer.size}` : ''} · offer #${offer.offerId.slice(0, 8)}`,
      });
    },
    [addPurchases, insertGarment, pushTrail],
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
  const sortedPurchases = useMemo(
    () => [...purchases].sort((a, b) => b.at.localeCompare(a.at)),
    [purchases],
  );
  const loopFlags = useMemo(
    () => ({
      gapFound: gaps.length > 0,
      requestSent: signals.length > 0,
      offerApproved: offers.some((o) => o.status === 'approved'),
      bought: outcomes.some((o) => o.outcome === 'bought'),
      // Scoped to the offers this page currently knows about: the seed ships a
      // past purchase that already carries an offerId, and counting that would
      // light the last step before the first four had happened.
      attributed: purchases.some(
        (p) => p.offerId !== undefined && p.offerId !== null && offers.some((o) => o.offerId === p.offerId),
      ),
    }),
    [gaps, signals, offers, outcomes, purchases],
  );
  const sentSignalIdSet = useMemo(
    () => new Set(signals.map((s) => s.signalId)),
    [signals],
  );
  const myOffers = useMemo(
    () => offers.filter((o) => o.status === 'approved' && sentSignalIdSet.has(o.requestId)),
    [offers, sentSignalIdSet],
  );
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
    purchasesRef.current = [];
    setPurchases([]);
    writePurchases([]);
    clearSignals();
    setSignals([]);
    setEditingId(null);
    setReceiptText('');
    pushTrail({
      actor: 'ME',
      title: 'Cleared wardrobe, purchases and requests sent',
      detail: 'All three were removed from this browser only.',
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
          <Badge className="status-badge">Demo data, real brands</Badge>
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
          {/* Every surface reaches every other one. Before this the closet
              could only reach the studio and the studio only the closet, so
              the two pages read as separate prototypes (wave-4 review). */}
          <nav className="surface-nav" aria-label="Hemloop surfaces">
            <a href="/">Home</a>
            <a href="/docs/">Docs</a>
          </nav>
        </div>
      </header>

      <LoopRail surface="closet" flags={loopFlags} />

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
                      // A card with no image is a normal state here (anything
                      // added by hand or from a receipt has none), so a broken
                      // path degrades into that state instead of showing the
                      // browser's broken-image icon.
                      onError={(e) => {
                        e.currentTarget.hidden = true;
                      }}
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

          <div className="panel-heading preferences-heading">
            <div>
              <p className="eyebrow">Private</p>
              <h2>Purchases across stores · {purchases.length}</h2>
            </div>
            <Tag aria-hidden="true" />
          </div>
          <p className="panel-intro">
            What you bought, from any merchant, including{' '}
            <span title="A rival store, seeded here to show the log works across brands, not just this one.">
              rivals
            </span>
            . Never leaves this page as a raw row - only a{' '}
            <span title="A summary derived from these rows: how you tend to get a discount, how much you tend to spend, whether you stick to one brand. Only travels at sharing level 3.">
              buying pattern
            </span>{' '}
            can, at sharing level 3.
          </p>
          <div className="purchases-table">
            {sortedPurchases.length === 0 ? (
              <p className="panel-intro">No purchases logged yet.</p>
            ) : (
              sortedPurchases.map((p) => (
                <div className="purchase-row" key={p.id}>
                  <div>
                    <strong>{p.title}</strong>
                    <span className="purchase-meta">
                      {p.merchant} · {p.size} · {p.currency} {p.price.toFixed(2)}
                      {p.promoCode ? ` · code ${p.promoCode}` : ''}
                      {p.offerId ? ` · offer #${p.offerId.slice(0, 8)}` : ''}
                    </span>
                  </div>
                  <span
                    className={`source-badge source-${p.source}`}
                    title="How this purchase entered the log: a pasted till receipt, a pasted order email, added by hand, a catalog lookup, or an approved personal offer."
                  >
                    {p.source}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel-heading preferences-heading">
            <div>
              <p className="eyebrow">Human path</p>
              <h2>Import a receipt or order email</h2>
            </div>
            <Import aria-hidden="true" />
          </div>
          <p className="panel-intro">
            Paste a till receipt or an order-confirmation email. Parsed on
            this page, no OCR, no network - it adds purchases and, for
            recognised items, garments to the wardrobe.
          </p>
          <div className="import-form">
            <textarea
              className="import-textarea"
              value={receiptText}
              onChange={(e) => setReceiptText(e.target.value)}
              placeholder="Paste receipt or order email text here"
              maxLength={4000}
              aria-label="Receipt or order email text"
            />
            <div className="import-actions">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  className="import-sample-button"
                  onClick={() => setReceiptText(sample.text)}
                >
                  Paste sample: {sample.label}
                </button>
              ))}
              <button
                type="button"
                className="import-submit-button"
                onClick={handleImportSubmit}
                disabled={receiptText.trim().length === 0}
              >
                <Import aria-hidden="true" />
                Import
              </button>
            </div>
          </div>
        </aside>

        <section className="panel" aria-label="Fit and gaps">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">What to shop for</p>
              <h2>Missing, thin and worn out</h2>
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
                <div
                  className={`gap-card${gap.due ? ' is-due' : ''}`}
                  key={gap.category}
                >
                  <strong>
                    {gap.category}
                    {gap.due ? (
                      <span
                        className="gap-due-tag"
                        title="From the purchase dates on this page: you own one, and it is past its typical replacement life. The dates never leave."
                      >
                        due · size {gap.due.size}
                      </span>
                    ) : null}
                  </strong>
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

          <div className="panel-heading preferences-heading">
            <div>
              <p className="eyebrow">Merchant approved</p>
              <h2>Offers for your requests · {myOffers.length}</h2>
            </div>
            <Tag aria-hidden="true" />
          </div>
          <p className="panel-intro">
            A human on the merchant side approved these for one of your
            requests. Nothing here can buy for you.
          </p>
          <div className="activity-list">
            {myOffers.length === 0 ? (
              <p className="panel-intro">
                No approved offers yet. They will appear here once a request
                is answered.
              </p>
            ) : (
              myOffers.map((o) => {
                const outcome = outcomeBySignal.get(o.requestId);
                const isNew = newOfferIds.has(o.offerId);
                return (
                  <div className={`activity-item ${isNew ? 'is-new' : ''}`} key={o.offerId}>
                    <span
                      className="activity-marker want-marker"
                      title="A personal offer a human approved on the merchant side, answering one of your requests."
                    >
                      Offer
                    </span>
                    <div>
                      <strong>
                        {o.title}
                        {o.size ? ` · Size: ${o.size}` : ''}
                      </strong>
                      <p>
                        {o.currency} {o.price.toFixed(2)}
                        {o.regularPrice > o.price
                          ? ` (was ${o.currency} ${o.regularPrice.toFixed(2)})`
                          : ''}
                        {o.promoCode ? ` · code ${o.promoCode}` : ''}
                      </p>
                      <small>
                        Valid until {new Date(o.validTo).toLocaleDateString()} · offer #
                        {o.offerId.slice(0, 8)}
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
                              onClick={() => recordOfferOutcome(o, 'bought')}
                            >
                              <ThumbsUp aria-hidden="true" />
                              Bought
                            </button>
                            <button
                              type="button"
                              className="outcome-button outcome-passed"
                              onClick={() => recordOfferOutcome(o, 'passed')}
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
            Clear wardrobe, purchases and requests
          </button>
          <p className="human-only-note">
            Wardrobe rows, purchases and the request log live in this browser only.
            Nothing is stored on a server. Clearing removes all three.
          </p>
        </aside>
      </section>
    </main>
  );
}
