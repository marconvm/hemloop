'use client';

import { useEffect, useMemo, useState } from 'react';

import { LockedInventoryTableForMerchant } from '@/components/locked-inventory-table';
import type { DemandSignal } from '@/lib/proofframe/closet';
import {
  demandInsight,
  slug,
  toDemandSignalLike,
  type DemandGroup,
  type PersonalOffer,
} from '@/lib/proofframe/offers';
import {
  marketScan,
  type Merchant,
} from '@/lib/proofframe/merchants';
import type { MarketRow } from '@/lib/proofframe/loop-room';
import { demoCatalog } from '@/lib/proofframe/shopify';
import {
  readOffers,
  readOutcomes,
  readSignals,
  subscribeOffers,
  subscribeOutcomes,
  subscribeSignals,
  type SignalOutcome,
} from '@/lib/proofframe/signal-bridge';
import type { CampaignFacts } from '@/lib/proofframe/types';

const CONSENT_LABEL: Record<number, string> = {
  0: 'Private',
  1: 'Basics',
  2: 'Context',
  3: 'Taste',
};

const VERDICT_LABEL: Record<DemandGroup['verdict'], string> = {
  'can-offer': 'Can offer',
  'size-not-in-stock': 'Size out of stock',
  'category-mismatch': 'Other category',
};

const MARKET_VERDICT_LABEL: Record<MarketRow['verdict'], string> = {
  'can-offer': 'Can offer',
  'size-not-in-stock': 'Size out of stock',
  'category-mismatch': 'Other category',
  'margin-floor': 'Margin floor',
  'over-ceiling': 'Over ceiling',
};

function catalogProductFor(facts: CampaignFacts) {
  const match = demoCatalog.products.find((p) => p.title === facts.productName);
  return {
    handle: match?.handle ?? slug(facts.productName),
    title: match?.title ?? facts.productName,
    image: match?.image,
    sizesInStock: facts.sizesInStock,
  };
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatWhen(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Read-only demand insight panel. Same bridge + demandInsight as the old
 * /merchant page; lives as the studio's Demand tab. Shows the market scan
 * (verdict per merchant, no costs or floors) for each incoming request. */
export function MerchantDemandPanel({
  facts,
  merchants,
  activeMerchantId,
}: {
  facts: CampaignFacts;
  merchants: Merchant[];
  activeMerchantId: string;
}) {
  const catalogProduct = useMemo(() => catalogProductFor(facts), [facts]);

  const [signals, setSignals] = useState<DemandSignal[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([]);
  const [offers, setOffers] = useState<PersonalOffer[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active) return;
      setSignals(readSignals());
      setOutcomes(readOutcomes());
      setOffers(readOffers());
    };
    queueMicrotask(refresh);
    const unsubs = [
      subscribeSignals(refresh),
      subscribeOutcomes(refresh),
      subscribeOffers(refresh),
    ];
    return () => {
      active = false;
      for (const u of unsubs) u();
    };
  }, []);

  const outcomeById = useMemo(() => {
    const map = new Map<string, SignalOutcome['outcome']>();
    for (const o of outcomes) map.set(o.signalId, o.outcome);
    return map;
  }, [outcomes]);

  const boughtIds = useMemo(() => {
    const ids: string[] = [];
    for (const [signalId, outcome] of outcomeById) {
      if (outcome === 'bought') ids.push(signalId);
    }
    return ids;
  }, [outcomeById]);

  const groups = useMemo(
    () =>
      demandInsight(
        signals.map((s) => ({
          signalId: s.signalId,
          category: s.category,
          size: s.size,
          kind: s.kind,
          level: s.level,
          at: s.at,
        })),
        facts,
        catalogProduct,
        boughtIds,
      ),
    [signals, facts, catalogProduct, boughtIds],
  );

  const marketBySignal = useMemo(() => {
    const map = new Map<string, MarketRow[]>();
    const live = merchants.map((m) =>
      m.id === activeMerchantId ? { ...m, facts } : m,
    );
    for (const signal of signals) {
      const request = toDemandSignalLike(signal);
      if (!request) continue;
      const ceiling =
        typeof signal.taste?.priceCeiling === 'number' ? signal.taste.priceCeiling : null;
      map.set(signal.signalId, marketScan(request, live, ceiling));
    }
    return map;
  }, [signals, merchants, activeMerchantId, facts]);

  const cannotFill = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.verdict === 'size-not-in-stock' || g.verdict === 'category-mismatch',
      ),
    [groups],
  );

  const feed = useMemo(
    () => [...signals].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [signals],
  );

  const stats = useMemo(() => {
    const replaceFlagged = signals.filter((s) => s.kind === 'replace').length;
    const proposed = offers.filter((o) => o.status === 'proposed').length;
    const approved = offers.filter((o) => o.status === 'approved').length;
    const bought = boughtIds.length;

    const offerForBought = new Map<string, PersonalOffer>();
    const ordered = [...offers].sort((a, b) =>
      a.proposedAt < b.proposedAt ? 1 : a.proposedAt > b.proposedAt ? -1 : 0,
    );
    for (const offer of ordered) {
      if (!boughtIds.includes(offer.requestId)) continue;
      const existing = offerForBought.get(offer.requestId);
      if (!existing || (offer.status === 'approved' && existing.status !== 'approved')) {
        offerForBought.set(offer.requestId, offer);
      }
    }
    let revenue = 0;
    let currency = facts.currency || 'USD';
    for (const offer of offerForBought.values()) {
      revenue += offer.price;
      currency = offer.currency || currency;
    }

    return {
      requests: signals.length,
      replaceFlagged,
      proposed,
      approved,
      bought,
      revenue,
      currency,
    };
  }, [signals, offers, boughtIds, facts.currency]);

  const empty = signals.length === 0;
  const activeMerchant =
    merchants.find((m) => m.id === activeMerchantId) ?? merchants[0];

  return (
    <div className="merchant-body demand-tab-body">
      {activeMerchant ? (
        <LockedInventoryTableForMerchant merchant={activeMerchant} />
      ) : null}

      <section className="stat-strip" aria-label="Demand summary">
        <article className="stat-card">
          <p className="stat-label">Requests</p>
          <p className="stat-value">{stats.requests}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Replace</p>
          <p className="stat-value">{stats.replaceFlagged}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Proposed / approved</p>
          <p className="stat-value">
            {stats.proposed}
            <span className="stat-split">/</span>
            {stats.approved}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Bought</p>
          <p className="stat-value">{stats.bought}</p>
        </article>
        <article className="stat-card stat-revenue">
          <p className="stat-label">Revenue</p>
          <p className="stat-value">{money(stats.revenue, stats.currency)}</p>
        </article>
      </section>

      {empty ? (
        <section className="empty-state" aria-live="polite">
          <p className="eyebrow">Waiting on Hemloop</p>
          <h2>No requests yet</h2>
          <p>
            They arrive when a shopper presses Approve on Closet, then replies
            Yes, send it. No shopper identity travels — only the demand.
          </p>
        </section>
      ) : (
        <>
          <section className="panel demand-panel" aria-labelledby="demand-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Inventory match</p>
                <h2 id="demand-heading">Demand by category and size</h2>
              </div>
              <p className="panel-note">
                Scored with the same matcher your agent uses to propose offers.
              </p>
            </div>

            <div className="table-wrap">
              <table className="demand-table">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Size</th>
                    <th scope="col">Total</th>
                    <th scope="col">Need</th>
                    <th scope="col">Want</th>
                    <th scope="col">Replace</th>
                    <th scope="col">Bought</th>
                    <th scope="col">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.key} title={g.action}>
                      <td className="cell-strong">{g.category}</td>
                      <td>{g.size}</td>
                      <td>{g.total}</td>
                      <td>{g.need}</td>
                      <td>{g.want}</td>
                      <td>{g.replace}</td>
                      <td>{g.bought}</td>
                      <td>
                        <span
                          className={`verdict-pill verdict-${g.verdict}`}
                          title={g.action}
                        >
                          {VERDICT_LABEL[g.verdict]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel feed-panel" aria-labelledby="feed-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Live feed</p>
                <h2 id="feed-heading">Incoming requests</h2>
              </div>
              <p className="panel-note">
                Newest first. Event ids only — no shopper identifier exists on
                the bridge.
              </p>
            </div>

            <ul className="request-feed">
              {feed.map((s) => {
                const outcome = outcomeById.get(s.signalId);
                const fields = s.consent.fields.join(', ') || 'nothing';
                return (
                  <li key={s.signalId} className="request-row">
                    <div className="request-id">
                      <code title={s.signalId}>{shortId(s.signalId)}</code>
                      <time dateTime={s.at}>{formatWhen(s.at)}</time>
                    </div>
                    <div className="request-main">
                      <strong>
                        {s.category}
                        {s.size ? ` · ${s.size}` : ''}
                      </strong>
                      <span className="request-kind">{s.kind}</span>
                      <span className={`level-pill level-${s.level}`}>
                        {s.level === 'want' ? 'Want' : 'Need'}
                      </span>
                    </div>
                    <p className="request-consent">
                      Shared at level {s.consent.level} (
                      {CONSENT_LABEL[s.consent.level] ?? s.consent.level}): {fields}
                    </p>
                    <span className={`consent-pill consent-${s.consent.level}`}>
                      L{s.consent.level} · {CONSENT_LABEL[s.consent.level] ?? '—'}
                    </span>
                    {outcome ? (
                      <span className={`outcome-pill outcome-${outcome}`}>
                        {outcome === 'bought' ? 'Bought' : 'Passed'}
                      </span>
                    ) : (
                      <span className="outcome-pill outcome-open">Open</span>
                    )}
                    {(() => {
                      const market = marketBySignal.get(s.signalId) ?? [];
                      if (market.length === 0) return null;
                      return (
                        <ul className="market-rows" aria-label="Market scan">
                          {market.map((row) => (
                            <li key={row.merchantId} className="market-row">
                              <span className="market-merchant">{row.name}</span>
                              <span
                                className={`verdict-pill verdict-${row.verdict}`}
                                title={row.reason}
                              >
                                {MARKET_VERDICT_LABEL[row.verdict]}
                              </span>
                              {row.price != null ? (
                                <span className="market-price">
                                  {row.currency} {row.price.toFixed(2)}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </li>
                );
              })}
            </ul>
          </section>

          {cannotFill.length > 0 ? (
            <section className="cannot-fill" aria-labelledby="cannot-fill-heading">
              <div>
                <p className="eyebrow">Stock gap</p>
                <h2 id="cannot-fill-heading">What you cannot fill</h2>
                <p>
                  These groups fail the same checks your offer matcher uses.
                  Restock the size, or lock facts for the right category.
                </p>
              </div>
              <ul>
                {cannotFill.map((g) => (
                  <li key={g.key} title={g.action}>
                    <strong>
                      {g.category} · {g.size}
                    </strong>
                    <span>
                      {g.total} request{g.total === 1 ? '' : 's'}
                    </span>
                    <span className={`verdict-pill verdict-${g.verdict}`}>
                      {VERDICT_LABEL[g.verdict]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
