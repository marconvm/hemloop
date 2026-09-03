import { Plus, Shirt } from 'lucide-react';

import type {
  ClosetRow,
  LoopRoomView,
  ShopperProfileKey,
} from '@/lib/proofframe/loop-room';

const VISIBLE_ROWS = 3;

function categoryLabel(category: string): string {
  return category.replaceAll('_', ' ');
}

export function ClosetStack({
  rows,
  profiles,
  onAddGarments,
  onSelectProfile,
}: {
  rows: ClosetRow[];
  profiles: LoopRoomView['profiles'];
  onAddGarments?: () => void;
  onSelectProfile?: (profile: ShopperProfileKey) => void;
}) {
  const visible = rows.slice(0, VISIBLE_ROWS);
  const hiddenCount = Math.max(0, rows.length - visible.length);

  return (
    <section className="hlr-closet" aria-label="Active shopper closet">
      <fieldset className="hlr-profile-switch">
        <legend>Shopping for</legend>
        <div className="hlr-profile-options">
          {profiles.options.map((profile) => (
            <button
              aria-pressed={profiles.active === profile.key}
              className={
                profiles.active === profile.key ? 'is-active' : undefined
              }
              key={profile.key}
              onClick={() => onSelectProfile?.(profile.key)}
              type="button"
            >
              {profile.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="hlr-closet-head">
        <div>
          <b>{rows.length} garments</b>
          <span>Stored on this page</span>
        </div>
        {onAddGarments ? (
          <button
            aria-label="Add five garments to this closet"
            onClick={onAddGarments}
            type="button"
          >
            <Plus aria-hidden="true" />
            <span>Add five</span>
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <ul className="hlr-closet-stack">
          {visible.map((row) => (
            <li className={row.isNew ? 'is-new' : undefined} key={row.id}>
              {row.image ? (
                // oxlint-disable-next-line next/no-img-element -- validated catalog asset; no image loader configured
                <img
                  src={row.image}
                  alt={`${row.brand} ${categoryLabel(row.category)}, size ${row.size}`}
                />
              ) : (
                <span className="hlr-garment-placeholder" aria-hidden="true">
                  <Shirt />
                </span>
              )}
              <span className="hlr-garment-caption">
                <b>{row.brand}</b>
                <small>
                  {categoryLabel(row.category)} · {row.size}
                </small>
              </span>
              {row.isNew ? <em>New</em> : null}
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="hlr-closet-more">+{hiddenCount}</li>
          ) : null}
        </ul>
      ) : (
        <div className="hlr-closet-empty">
          <Shirt aria-hidden="true" />
          No garments for this profile yet.
        </div>
      )}
    </section>
  );
}
