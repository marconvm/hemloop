'use client';

import type { CSSProperties, ReactNode } from 'react';

import type { CampaignState, Scene } from '@/lib/proofframe/types';

interface CompositionSceneProps {
  campaign: CampaignState;
  scene: Scene;
  playhead: number;
  merchantName: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sceneStart(campaign: CampaignState, sceneId: string) {
  let cursor = 0;
  for (const scene of campaign.scenes) {
    if (scene.id === sceneId) return cursor;
    cursor += scene.durationSec;
  }
  return 0;
}

function entranceProgress(campaign: CampaignState, scene: Scene, playhead: number) {
  const elapsed = playhead - sceneStart(campaign, scene.id);
  const linear = clamp(elapsed / 0.7, 0, 1);
  return 1 - (1 - linear) ** 3;
}

function money(value: number | null | undefined, currency: string) {
  if (value == null || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function humanDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function PricePair({ campaign }: { campaign: CampaignState }) {
  const regular = money(campaign.facts.regularPrice, campaign.facts.currency);
  const sale = money(
    campaign.facts.salePrice ?? campaign.facts.regularPrice,
    campaign.facts.currency,
  );
  const hasReduction =
    campaign.facts.salePrice != null &&
    campaign.facts.salePrice < campaign.facts.regularPrice;

  return (
    <p className="composition-price" aria-label={hasReduction ? `${regular}, now ${sale}` : (sale ?? undefined)}>
      <strong>{sale}</strong>
      {hasReduction ? <del>{regular}</del> : null}
    </p>
  );
}

function Copy({ children, progress }: { children: ReactNode; progress: number }) {
  return (
    <div
      className="composition-copy"
      style={
        {
          transform: `translate3d(0, ${((1 - progress) * 12).toFixed(2)}px, 0)`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function CompositionScene({
  campaign,
  scene,
  playhead,
  merchantName,
}: CompositionSceneProps) {
  const facts = campaign.facts;
  const brand = merchantName;
  const progress = entranceProgress(campaign, scene, playhead);
  const imageScale = 1.04 - progress * 0.04;
  const preferredSize = facts.sizesInStock?.includes('L')
    ? 'L'
    : facts.sizesInStock?.[0];
  const sceneStyle = {
    background: scene.style?.background ?? campaign.style.background,
    color: scene.style?.ink ?? campaign.style.ink,
    '--composition-accent': scene.style?.accent ?? campaign.style.accent,
  } as CSSProperties;

  return (
    <article
      className={`phone-preview composition-scene kind-${scene.kind} placement-${campaign.format.placement}`}
      data-kind={scene.kind}
      data-placement={campaign.format.placement}
      style={sceneStyle}
      aria-label={`${scene.kind} scene: ${scene.heading}`}
    >
      {facts.productImage ? (
        // oxlint-disable-next-line next/no-img-element -- composition frames use the campaign's validated image URL
        <img
          className="composition-photo"
          src={facts.productImage}
          alt={facts.productName}
          loading="eager"
          style={{ transform: `scale(${imageScale.toFixed(4)})` }}
        />
      ) : (
        <div className="composition-photo-fallback" aria-hidden="true" />
      )}
      <div className="composition-scrim" aria-hidden="true" />

      {scene.kind === 'hero' ? (
        <Copy progress={progress}>
          <p className="composition-kicker">{brand}</p>
          <h3>{scene.heading}</h3>
          <p className="composition-body">{scene.body}</p>
        </Copy>
      ) : null}

      {scene.kind === 'product' ? (
        <Copy progress={progress}>
          <p className="composition-kicker">Matched product</p>
          <h3>{facts.productName}</h3>
          <p className="composition-body">{scene.heading}</p>
          <PricePair campaign={campaign} />
          <div className="composition-chip-row">
            {preferredSize ? <span>{preferredSize} in stock</span> : null}
            {facts.discountPercent != null ? (
              <span>{facts.discountPercent}% verified</span>
            ) : null}
          </div>
          <div className="composition-verification" aria-label="Verified facts">
            {facts.sizesInStock?.length ? <span>Stock checked</span> : null}
            {facts.marginFloorPercent != null ? <span>Margin protected</span> : null}
          </div>
        </Copy>
      ) : null}

      {scene.kind === 'offer' ? (
        <>
          <Copy progress={progress}>
            <p className="composition-kicker">Verified offer</p>
            <h3>
              {facts.discountPercent != null
                ? `${facts.discountPercent}% off`
                : scene.heading}
            </h3>
            <p className="composition-body">{scene.body}</p>
            <PricePair campaign={campaign} />
            {facts.promoCode ? (
              <p className="composition-code">Use {facts.promoCode}</p>
            ) : null}
          </Copy>
          <p className="composition-disclaimer">{facts.disclaimer}</p>
        </>
      ) : null}

      {scene.kind === 'cta' ? (
        <Copy progress={progress}>
          <p className="composition-kicker">{brand}</p>
          <h3>{scene.heading}</h3>
          <p className="composition-body">{scene.body}</p>
          {facts.purchaseUrl ? (
            <p className="composition-url">Shop now</p>
          ) : null}
          <p className="composition-dates">Until {humanDate(facts.endDate)}</p>
        </Copy>
      ) : null}
    </article>
  );
}
