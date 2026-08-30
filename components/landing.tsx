'use client';

import { ArrowRight, Lock, Radio, Shirt, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { BRAND } from '@/lib/proofframe/brand';

const SHOPPER_TOOLS = [
  'get_wardrobe',
  'get_my_sizes',
  'find_gaps',
  'check_fit',
  'add_garment',
  'report_demand_gap',
];

const MERCHANT_TOOLS = [
  'get_campaign_state',
  'validate_claims',
  'export_composition',
  'set_brief',
  'add_scene',
  'update_scene',
  'reorder_scenes',
  'seek_preview',
  'import_product',
];

export function Landing() {
  useEffect(() => {
    // From-state is applied here, not in CSS: with JS unavailable (or reduced
    // motion) the page renders complete and static.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = Array.from(document.querySelectorAll('[data-reveal]'));
    for (const el of elements) el.classList.add('pre-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -18% 0px' },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing container-lines">
      <header className="landing-nav content">
        <span className="landing-mark">{BRAND.name}</span>
        <span className="landing-challenge">{BRAND.challenge}</span>
      </header>

      <section className="landing-hero content">
        <h1 data-reveal>{BRAND.tagline}</h1>
        <p className="landing-sub" data-reveal>
          {BRAND.sub}
        </p>
        <div className="landing-ctas" data-reveal>
          <Link className="landing-cta primary" href="/closet">
            <Shirt aria-hidden="true" />
            Open the shopper closet
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link className="landing-cta" href="/studio">
            <Store aria-hidden="true" />
            Open the merchant studio
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="landing-loop content" aria-label="How the loop works">
        <div className="loop-step" data-reveal>
          <span className="loop-index">01</span>
          <Shirt aria-hidden="true" />
          <h2>A closet that never uploads</h2>
          <p>
            The shopper&apos;s wardrobe, sizes and gaps live on their own page. Their agent shops
            with six WebMCP tools; no merchant ever sees the list.
          </p>
        </div>
        <div className="loop-step" data-reveal>
          <span className="loop-index">02</span>
          <Radio aria-hidden="true" />
          <h2>Demand, hashed at the source</h2>
          <p>
            Want something the store should know about? The one outbound tool sends a demand signal
            hashed locally before it leaves, the way ad platforms hash conversions. A hash, a
            category, a size. Nothing else exists to leak.
          </p>
        </div>
        <div className="loop-step" data-reveal>
          <span className="loop-index">03</span>
          <Lock aria-hidden="true" />
          <h2>An answer that cannot lie</h2>
          <p>
            Merchants see live demand they never had, and respond through a truth-locked workflow:
            agent-built campaigns where every claim is validated against human-locked facts before
            it applies. A promo video is one output; the trust machinery is the product.
          </p>
        </div>
      </section>

      <section className="landing-agent content" data-reveal>
        <h2>
          <Sparkles data-icon="inline-start" aria-hidden="true" /> Bring your agent
        </h2>
        <p>
          Chrome 149+: enable <code>chrome://flags/#enable-webmcp-testing</code> and reload — or
          open this site inside ChatGPT&apos;s browser. Each surface registers its tools
          automatically; the header badge shows when they are live.
        </p>
        <div className="tool-columns">
          <div>
            <h3>Shopper · 6 tools</h3>
            <ul>
              {SHOPPER_TOOLS.map((tool) => (
                <li key={tool}>
                  <code>{tool}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Merchant · 9 tools</h3>
            <ul>
              {MERCHANT_TOOLS.map((tool) => (
                <li key={tool}>
                  <code>{tool}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="landing-footer content">
        <p>
          Built on WebMCP with Shopify catalog data · Chrome · ChatGPT · Cloudflare · Netlify ·
          Render
        </p>
        <p>
          Synthetic demo — every brand, product and shopper is fictional. Open source under MIT.
        </p>
      </footer>
    </main>
  );
}
