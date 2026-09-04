import { BRAND } from '@/lib/proofframe/brand';

const LINKS = [
  { label: 'Hemloop', href: '/' },
  { label: 'Closet', href: '/closet' },
  { label: 'Studio', href: '/studio' },
  { label: 'Docs', href: '/docs/' },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
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
      <nav aria-label="Hemloop footer navigation">
        {LINKS.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p>
        © 2026 Marco Cheung ·{' '}
        <a
          href="https://github.com/marconvm/hemloop"
          rel="noopener"
          target="_blank"
        >
          Source on GitHub
        </a>
      </p>
    </footer>
  );
}
