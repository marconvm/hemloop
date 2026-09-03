import { BRAND } from '@/lib/proofframe/brand';

const LINKS = [
  { label: 'Loop', href: '/' },
  { label: 'Closet', href: '/closet' },
  { label: 'Studio', href: '/studio' },
  { label: 'Docs', href: '/docs/' },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="site-brand" href="/" aria-label={`${BRAND.name} loop room`}>
        <span className="site-brand-mark" aria-hidden="true">
          <span />
        </span>
        <span>{BRAND.name.toLowerCase()}</span>
      </a>
      <nav aria-label="Hemloop footer navigation">
        {LINKS.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p>
        <span aria-hidden="true" />
        Demo data, real brands
      </p>
    </footer>
  );
}
