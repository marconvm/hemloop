import { ArrowRight, ShieldCheck } from 'lucide-react';

function humanize(key: string): string {
  return key.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
}

export function PacketInTransit({
  packet,
}: {
  packet: Record<string, string | number | null>;
}) {
  return (
    <section className="hlr-packet" aria-label="Exact demand packet in transit">
      <div className="hlr-packet-route">
        <span>Shopper-approved</span>
        <ArrowRight aria-hidden="true" />
        <span>Merchant-visible</span>
      </div>
      <dl>
        {Object.entries(packet).map(([key, value]) => (
          <div key={key}>
            <dt>{humanize(key)}</dt>
            <dd>{value ?? 'not shared'}</dd>
          </div>
        ))}
      </dl>
      <p>
        <ShieldCheck aria-hidden="true" />
        Only these fields crossed the boundary.
      </p>
    </section>
  );
}
