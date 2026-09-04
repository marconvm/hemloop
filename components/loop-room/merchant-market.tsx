import type { MarketRow, MarketVerdict } from '@/lib/proofframe/loop-room';

const WAITING_MERCHANTS = [
  { id: 'northlight', name: 'Northlight Apparel' },
  { id: 'harborview', name: 'Harborview Basics' },
  { id: 'ridgeline', name: 'Ridgeline Outdoor' },
  { id: 'denim-supply', name: 'Denim Supply Co.' },
  { id: 'overland', name: 'Overland Trading Co.' },
] as const;

const VERDICT_LABEL: Record<MarketVerdict, string> = {
  'can-offer': 'Can offer',
  'size-not-in-stock': 'Size unavailable',
  'category-mismatch': 'Different category',
  'margin-floor': 'Margin protected',
  'over-ceiling': 'Above ceiling',
};

function MarketResult({ row, active }: { row: MarketRow; active: boolean }) {
  return (
    <li className={active ? 'is-answering' : undefined}>
      <div className="hlr-market-row-head">
        <b>{row.name}</b>
        {active ? <em>Answering</em> : null}
      </div>
      <div className="hlr-market-result">
        <span className={`is-${row.verdict}`}>
          {VERDICT_LABEL[row.verdict]}
        </span>
        {row.price === null ? null : (
          <strong>
            {row.currency} {row.price.toFixed(2)}
          </strong>
        )}
      </div>
      <p>{row.reason}</p>
    </li>
  );
}

function MarketResults({
  rows,
  activeMerchantId,
}: {
  rows: MarketRow[];
  activeMerchantId: string;
}) {
  return (
    <ul>
      {rows.map((row) => (
        <MarketResult
          active={row.merchantId === activeMerchantId}
          key={row.merchantId}
          row={row}
        />
      ))}
    </ul>
  );
}

export function MerchantMarket({
  market,
  activeMerchant,
}: {
  market: MarketRow[] | null;
  activeMerchant: { id: string; name: string };
}) {
  if (market === null) {
    return (
      <section className="hlr-market is-waiting" aria-label="Merchant market">
        <span className="hlr-market-label">Market scan</span>
        <ul>
          {WAITING_MERCHANTS.map((merchant) => (
            <li key={merchant.id}>
              <b>{merchant.name}</b>
              <p>Waiting for a request</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const answering =
    market.find((row) => row.merchantId === activeMerchant.id) ?? market[0];
  const others = market.filter(
    (row) => row.merchantId !== answering?.merchantId,
  );
  const otherCanOffer = others.filter(
    (row) => row.verdict === 'can-offer',
  ).length;
  const otherSummary = otherCanOffer
    ? `${others.length} others · ${otherCanOffer} could offer`
    : `${others.length} others could not`;

  return (
    <section className="hlr-market" aria-label="Merchant market">
      <span className="hlr-market-label">Market scan</span>
      <div className="hlr-market-desktop">
        <MarketResults activeMerchantId={activeMerchant.id} rows={market} />
      </div>
      <div className="hlr-market-mobile">
        {answering ? (
          <ul>
            <MarketResult active row={answering} />
          </ul>
        ) : null}
        {others.length ? (
          <details>
            <summary>{otherSummary}</summary>
            <MarketResults activeMerchantId={activeMerchant.id} rows={others} />
          </details>
        ) : null}
      </div>
    </section>
  );
}
