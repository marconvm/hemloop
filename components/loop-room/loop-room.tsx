'use client';

import {
  ArrowRight,
  Eye,
  LockKeyhole,
  PackageCheck,
  Sparkles,
} from 'lucide-react';

import type { LoopRoomView, StationKey } from '@/lib/proofframe/loop-room';

import { LoopRoomRail } from './loop-room-rail';
import { OutcomePanel } from './outcome-panel';
import { PacketInTransit } from './packet-in-transit';
import { StationCard } from './station-card';
import { ToolManifestDialog } from './tool-manifest-dialog';
import type { LoopCreative, ProcessingView, RuntimeToolView } from './types';

export interface LoopRoomProps {
  view: LoopRoomView;
  tools: RuntimeToolView[];
  processing?: ProcessingView | null;
  creative?: LoopCreative | null;
  onCopySay?: (prompt: string) => void;
  onHumanGate?: (station: StationKey) => void;
}

export function LoopRoom({
  view,
  tools,
  processing,
  creative,
  onCopySay,
  onHumanGate,
}: LoopRoomProps) {
  const current =
    view.stations.find((station) => station.key === view.current) ??
    view.stations[0];
  if (!current) return null;

  return (
    <main className="hlr-shell">
      <section className="hlr-heading">
        <div>
          <p>A live commerce loop · cycle {view.loopNumber}</p>
          <h1>
            One real action at a time.
            <br />
            Both sides get sharper.
          </h1>
        </div>
        <div className="hlr-heading-status">
          <span>{view.progress} of 7 stations complete</span>
          <ToolManifestDialog
            live={view.runtime.live}
            tools={tools}
            absent={view.runtime.absent}
          />
        </div>
      </section>

      <LoopRoomRail stations={view.stations} />

      <section
        className={`hlr-room station-${view.current}`}
        aria-label="Hemloop shared workspace"
      >
        <div className="hlr-orbit hlr-orbit-one" aria-hidden="true" />
        <div className="hlr-orbit hlr-orbit-two" aria-hidden="true" />

        <aside className="hlr-party hlr-shopper">
          <div className="hlr-party-heading">
            <div>
              <p>Shopper side</p>
              <h2>Private closet</h2>
            </div>
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
          <figure className="hlr-closet-stack">
            {/* oxlint-disable-next-line next/no-img-element -- local demo asset; no image loader configured */}
            <img
              src="/products/bluenotes-mom-jean.jpg"
              alt="Blue denim jeans in the private closet"
            />
            {/* oxlint-disable-next-line next/no-img-element -- local demo asset; no image loader configured */}
            <img
              src="/products/white-sneaker.jpg"
              alt="White sneakers in the private closet"
            />
            <b>+28</b>
          </figure>
          <p className="hlr-boundary">
            <LockKeyhole aria-hidden="true" />
            <span>
              <b>Never leaves</b> Closet rows, identity, household profile.
            </span>
          </p>
        </aside>

        <section className="hlr-centre">
          <div className="hlr-flow-label is-outbound">
            minimum necessary data <ArrowRight />
          </div>
          <StationCard
            station={current}
            processing={processing}
            onCopySay={onCopySay}
            onHumanGate={onHumanGate}
          />
          {view.packet ? <PacketInTransit packet={view.packet} /> : null}
          {view.outcome ? <OutcomePanel outcome={view.outcome} /> : null}
          <div className="hlr-flow-label is-return">
            <ArrowRight /> useful outcome returns
          </div>
        </section>

        <aside className="hlr-party hlr-merchant">
          <div className="hlr-party-heading">
            <div>
              <p>Merchant side</p>
              <h2>Demand desk</h2>
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

          {creative ? (
            <article className={`hlr-creative is-${creative.kind}`}>
              {creative.image ? (
                // oxlint-disable-next-line next/no-img-element -- static or validated bridge asset; no next/image loader configured
                <img
                  src={creative.image}
                  alt={creative.alt ?? creative.title}
                />
              ) : (
                <div className="hlr-creative-placeholder">
                  <Sparkles aria-hidden="true" />
                </div>
              )}
              <div className="hlr-creative-shade" />
              <div className="hlr-creative-copy">
                <span>{creative.kicker}</span>
                <h3>{creative.title}</h3>
                {creative.detail ? <p>{creative.detail}</p> : null}
                {creative.href ? (
                  <a href={creative.href}>
                    Open checkout <ArrowRight />
                  </a>
                ) : null}
              </div>
            </article>
          ) : (
            <div className="hlr-creative-empty">
              <Sparkles aria-hidden="true" />
              <p>
                The real call will place its product, composition or checkout
                here.
              </p>
            </div>
          )}

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
        </aside>
      </section>
    </main>
  );
}
