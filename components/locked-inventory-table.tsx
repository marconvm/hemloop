import type { Merchant, MerchantInventoryRow } from '@/lib/proofframe/merchants';
import type { CampaignFacts } from '@/lib/proofframe/types';

function money(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export interface LockedInventoryTableProps {
  productName: string;
  facts: CampaignFacts;
  inventory: MerchantInventoryRow[];
}

/** Compact merchant-owned stock: one row per SKU, rules columns from facts. */
export function LockedInventoryTable({
  productName,
  facts,
  inventory,
}: LockedInventoryTableProps) {
  return (
    <div className="locked-inventory">
      <div className="locked-inventory-head">
        <p className="locked-inventory-kicker">Locked stock</p>
        <h3 className="locked-inventory-title">{productName}</h3>
      </div>
      <div className="locked-inventory-scroll">
        <table className="locked-inventory-table">
          <thead>
            <tr>
              <th scope="col">SKU</th>
              <th scope="col">Size</th>
              <th scope="col">Units</th>
              <th scope="col">Cost</th>
              <th scope="col">Floor %</th>
              <th scope="col">Max disc. %</th>
              <th scope="col">Sale price</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row) => (
              <tr
                key={row.sku}
                className={row.qty <= 0 ? 'is-sold-out' : undefined}
              >
                <td>{row.sku}</td>
                <td>{row.size}</td>
                <td>{row.qty}</td>
                <td>{money(facts.costPrice, facts.currency)}</td>
                <td>{facts.marginFloorPercent ?? '—'}</td>
                <td>{facts.maxDiscountPercent ?? '—'}</td>
                <td>{money(facts.salePrice ?? facts.regularPrice, facts.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Convenience when the active merchant object is already in hand. */
export function LockedInventoryTableForMerchant({ merchant }: { merchant: Merchant }) {
  return (
    <LockedInventoryTable
      productName={merchant.facts.productName}
      facts={merchant.facts}
      inventory={merchant.inventory}
    />
  );
}
