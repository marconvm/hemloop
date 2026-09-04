'use client';

import { Eye, LockKeyhole, PackageCheck } from 'lucide-react';

import type {
  LoopRoomView,
  ShopperProfileKey,
  StationKey,
} from '@/lib/proofframe/loop-room';
import { SiteFooter } from '@/components/site-footer';

import { ClosetStack } from './closet-stack';
import { CreativeCard } from './creative-card';
import { LoopRoomRail } from './loop-room-rail';
import { MerchantMarket } from './merchant-market';
import { OutcomePanel } from './outcome-panel';
import { PacketInTransit } from './packet-in-transit';
import { StationCard } from './station-card';
import type { LoopCreative, ProcessingView } from './types';

export interface LoopRoomProps {
  view: LoopRoomView;
  processing?: ProcessingView | null;
  creative?: LoopCreative | null;
  onCopySay?: (prompt: string) => Promise<boolean>;
  onHumanGate?: (station: StationKey) => void;
  /** The "+" on the closet stack: the page adds five random garments, capped
   * at twenty for the active profile. (Claude added the prop; Codex wires it.) */
  onAddGarments?: () => void;
  /** The Me / Partner / Kid switch on the shopper side. (Same note.) */
  onSelectProfile?: (profile: ShopperProfileKey) => void;
}

export function LoopRoom({
  view,
  processing,
  creative,
  onCopySay,
  onHumanGate,
  onAddGarments,
  onSelectProfile,
}: LoopRoomProps) {
  const current =
    view.stations.find((station) => station.key === view.current) ??
    view.stations[0];
  if (!current) return null;

  const lastRan = view.lastRan
    ? {
        label:
          view.stations.find((station) => station.key === view.lastRan?.station)
            ?.label ?? view.lastRan.station,
        tools: view.lastRan.tools,
      }
    : null;
  const shopperCreative =
    creative &&
    creative.kind === 'product' &&
    (current.key === 'item' ||
      current.key === 'gap' ||
      current.key === 'learned' ||
      current.key === 'again')
      ? creative
      : null;
  const merchantCreative = shopperCreative ? null : creative;

  return (
    <>
      <main className="hlr-shell">
        <section className="hlr-heading">
          <div className="hlr-hero" key={current.key}>
            <p>
              A live E-commerce loop · cycle{' '}
              <span className="hlr-cycle-count" key={view.loopNumber}>
                {view.loopNumber}
              </span>
            </p>
            <h1>
              <span>{current.eyebrow}</span>
              {current.title}
            </h1>
          </div>
          <div className="hlr-heading-status">
            <span>{view.progress} of 7 steps complete</span>
          </div>
        </section>

        <LoopRoomRail
          stations={view.stations}
          processing={Boolean(processing)}
        />

        <section
          className={`hlr-room station-${view.current}`}
          aria-label="Hemloop shared workspace"
        >
          <div className="hlr-orbit hlr-orbit-one" aria-hidden="true" />
          <div className="hlr-orbit hlr-orbit-two" aria-hidden="true" />

          <aside className="hlr-party hlr-shopper">
            <div className="hlr-party-heading">
              <h2>Shopper · Closet</h2>
              <span>
                <LockKeyhole aria-hidden="true" />
                Local
              </span>
            </div>
            <div className="hlr-party-visibility">
              <span>
                <Eye aria-hidden="true" />
                What the shopper sees now
              </span>
              <p>{current.shopperSees}</p>
            </div>
            {shopperCreative ? (
              <CreativeCard
                creative={shopperCreative}
                emptyCopy="The next private closet update will appear here."
                key={`${view.current}-${shopperCreative.title}`}
              />
            ) : null}
            <ClosetStack
              rows={view.closet}
              profiles={view.profiles}
              onAddGarments={onAddGarments}
              onSelectProfile={onSelectProfile}
            />
            <p className="hlr-boundary">
              <LockKeyhole aria-hidden="true" />
              <span>
                <b>Never leaves</b> Closet rows, identity, household profile.
              </span>
            </p>
            <a className="hlr-party-link" href="/closet">
              Open the closet
            </a>
          </aside>

          <section className="hlr-centre">
            <StationCard
              key={current.key}
              station={current}
              processing={processing}
              lastRan={lastRan}
              onCopySay={onCopySay}
              onHumanGate={onHumanGate}
            />
            {view.packet ? <PacketInTransit packet={view.packet} /> : null}
            {view.outcome ? <OutcomePanel outcome={view.outcome} /> : null}
          </section>

          <aside className="hlr-party hlr-merchant">
            <div className="hlr-party-heading">
              <div className="hlr-party-title">
                <h2>Merchant · Demand</h2>
                <small>{view.activeMerchant.name}</small>
              </div>
              <span className="is-truth">
                <PackageCheck aria-hidden="true" />
                Truth locked
              </span>
            </div>
            <div className="hlr-party-visibility">
              <span>
                <Eye aria-hidden="true" />
                What the merchant sees now
              </span>
              <p>{current.merchantSees}</p>
            </div>

            <MerchantMarket
              activeMerchant={view.activeMerchant}
              market={view.market}
            />

            <CreativeCard
              creative={merchantCreative}
              emptyCopy="Nothing arrives here until a shopper-approved packet crosses the boundary."
              key={
                merchantCreative
                  ? `${view.current}-${merchantCreative.kind}-${merchantCreative.title}`
                  : view.current
              }
            />

            {view.proposal ? (
              <dl className="hlr-proposal">
                <div>
                  <dt>Offer</dt>
                  <dd>${view.proposal.price.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Margin</dt>
                  <dd>{view.proposal.marginPercent}%</dd>
                </div>
                <div>
                  <dt>Floor</dt>
                  <dd>{view.proposal.marginFloor}%</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{view.proposal.status}</dd>
                </div>
              </dl>
            ) : null}
            <a className="hlr-party-link" href="/studio">
              Open the studio
            </a>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
