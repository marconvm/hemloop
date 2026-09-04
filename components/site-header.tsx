import type { ReactNode } from 'react';

import { BRAND } from '@/lib/proofframe/brand';

export type SiteSection = 'loop' | 'closet' | 'studio' | 'docs';

export interface SiteHeaderProps {
  active: SiteSection;
  status?: ReactNode;
  actions?: ReactNode;
}

const LINKS: { key: SiteSection; label: string; href: string }[] = [
  { key: 'loop', label: 'Hemloop', href: '/' },
  { key: 'closet', label: 'Closet', href: '/closet' },
  { key: 'studio', label: 'Studio', href: '/studio' },
  { key: 'docs', label: 'Docs', href: '/docs/' },
];

/** Persistent navigation shared by every Hemloop surface.
 *
 * The page supplies runtime status and contextual actions. The header owns
 * only identity and navigation, so it never reaches into bridge or tool state.
 * Four links are the sitemap (see docs/internal/coordination/SITEMAP.md).
 */
export function SiteHeader({ active, status, actions }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="site-brand" href="/" aria-label={`${BRAND.name} home`}>
        {/* oxlint-disable-next-line next/no-img-element -- animated SVG mark; next/image would freeze SMIL/CSS */}
        <img
          className="site-brand-logo"
          src="/logo.svg"
          alt=""
          width={31}
          height={31}
          aria-hidden="true"
        />
        <span>{BRAND.name.toLowerCase()}</span>
      </a>

      <nav className="site-nav" aria-label="Hemloop surfaces">
        {LINKS.map((link) => (
          <a
            aria-current={active === link.key ? 'page' : undefined}
            className={active === link.key ? 'is-active' : undefined}
            href={link.href}
            key={link.key}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="site-header-meta">
        {status ? <div className="site-header-status">{status}</div> : null}
        {actions ? <div className="site-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
