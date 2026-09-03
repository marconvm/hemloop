'use client';

import { ArrowRight, Lock, Radio, Shirt, Sparkles, Store } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BRAND } from '@/lib/proofframe/brand';

type ToolRow = {
  surface: 'Closet' | 'Studio' | 'Both';
  tool: string;
  kind: 'read' | 'write' | 'none';
  what: string;
  guarantee: string;
  strong?: boolean;
};

const CLOSET_ROWS: ToolRow[] = [
  {
    surface: 'Closet',
    tool: 'get_wardrobe',
    kind: 'read',
    what: 'Returns the garment rows on the page',
    guarantee: 'readOnlyHint, untrustedContentHint, never returns a shopper id',
  },
  {
    surface: 'Closet',
    tool: 'get_my_sizes',
    kind: 'read',
    what: 'Sizes owned, optionally by brand',
    guarantee: 'readOnlyHint',
  },
  {
    surface: 'Closet',
    tool: 'find_gaps',
    kind: 'read',
    what: 'Categories missing or thin',
    guarantee: 'readOnlyHint',
  },
  {
    surface: 'Closet',
    tool: 'check_fit',
    kind: 'read',
    what: 'Size advice for a catalog item from what is owned',
    guarantee: 'readOnlyHint, reads the public catalog only',
  },
  {
    surface: 'Closet',
    tool: 'get_preferences',
    kind: 'read',
    what: "Reads the shopper's stated preferences: fit, colour family, materials to avoid, price ceiling, liked brands",
    guarantee: 'readOnlyHint, closet_data fence, a field travels only if the sharing level allows it',
  },
  {
    surface: 'Closet',
    tool: 'add_garment',
    kind: 'write',
    what: 'Adds one garment to the local wardrobe',
    guarantee: 'Enum-validated category, bounded strings, never leaves the page',
  },
  {
    surface: 'Closet',
    tool: 'report_demand_gap',
    kind: 'write',
    what: 'The only tool that can send anything to a merchant',
    guarantee:
      'Rejects with human-approval-required until the person approves one request, consumes that approval after one event, can emit only the DemandSignal shape, returns the exact payload sent',
    strong: true,
  },
];

const STUDIO_ROWS: ToolRow[] = [
  {
    surface: 'Studio',
    tool: 'get_campaign_state',
    kind: 'read',
    what: 'Facts, scenes, timing',
    guarantee: 'readOnlyHint',
  },
  {
    surface: 'Studio',
    tool: 'validate_claims',
    kind: 'read',
    what: 'Dry run of the claim validator',
    guarantee: 'Never mutates',
  },
  {
    surface: 'Studio',
    tool: 'export_composition',
    kind: 'read',
    what: 'Hands finished HTML to the page for download',
    guarantee: 'Refuses while any violation stands',
  },
  {
    surface: 'Studio',
    tool: 'get_offer',
    kind: 'read',
    what: 'Returns the locked offer as structured data for a shopping agent: product, prices, code, dates, disclaimer, purchase link',
    guarantee: 'readOnlyHint; returns the facts with whether a human has locked them, so an agent can tell a locked offer from a draft',
  },
  {
    surface: 'Studio',
    tool: 'set_brief',
    kind: 'write',
    what: 'Sets the creative brief',
    guarantee: 'Brief is never rendered copy, so it cannot become a claim',
  },
  {
    surface: 'Studio',
    tool: 'add_scene / update_scene',
    kind: 'write',
    what: 'Writes rendered copy',
    guarantee: 'Claim-validated before the state changes, rejected atomically',
  },
  {
    surface: 'Studio',
    tool: 'reorder_scenes',
    kind: 'write',
    what: 'Reorders the timeline',
    guarantee: 'Permutation-checked',
  },
  {
    surface: 'Studio',
    tool: 'seek_preview',
    kind: 'write',
    what: 'Moves the preview playhead',
    guarantee: 'Clamped to length, deterministic',
  },
  {
    surface: 'Studio',
    tool: 'import_product',
    kind: 'write',
    what: 'Pulls a product into the facts',
    guarantee: 'untrustedContentHint, blocked while facts are locked',
  },
];

const ABSENT_ROW: ToolRow = {
  surface: 'Both',
  tool: '(absent by design)',
  kind: 'none',
  what: 'There is no lock_facts, no unlock_facts, no approve_share, no set_sharing_level',
  guarantee: 'Locking facts, releasing wardrobe data, and the consent dial are human-only acts. This row is the product.',
  strong: true,
};

const TOTAL_TOOL_COUNT = 17;

function HemLoopMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 16 H12 C12 8 22 8 22 16 C22 24 12 24 12 16 H29" />
    </svg>
  );
}

function LandingDivider() {
  return (
    <div className="landing-divider content" aria-hidden="true">
      <svg
        className="landing-divider-mark"
        viewBox="0 0 240 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        preserveAspectRatio="none"
      >
        <path d="M0 12 H100 C100 6 140 6 140 12 C140 18 100 18 100 12 H240" />
      </svg>
    </div>
  );
}

function ToolTableCols() {
  return (
    <colgroup>
      <col style={{ width: '10%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '31%' }} />
      <col style={{ width: '31%' }} />
    </colgroup>
  );
}

function ToolTableRow({ row, index }: { row: ToolRow; index: number }) {
  return (
    <tr className="tool-row" data-reveal style={{ transitionDelay: `${Math.min(index, 10) * 0.035}s` }}>
      <td data-label="Surface">{row.surface}</td>
      <td data-label="Tool">
        <code>{row.tool}</code>
      </td>
      <td data-label="Kind">{row.kind}</td>
      <td data-label="What it does">{row.strong ? <strong>{row.what}</strong> : row.what}</td>
      <td data-label="Structural guarantee">{row.guarantee}</td>
    </tr>
  );
}

export function Landing() {
  const [toolsExpanded, setToolsExpanded] = useState(false);

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
    // Studio rows are always mounted (the fold only hides them with CSS), so
    // every [data-reveal] element already exists on first render.
  }, []);

  return (
    <main className="landing container-lines">
      <header className="landing-nav content">
        <span className="landing-mark">
          <HemLoopMark size={20} className="landing-mark-icon" />
          {BRAND.name}
        </span>
        <span className="landing-challenge">{BRAND.challenge}</span>
      </header>

      <section className="landing-hero content">
        <h1 data-reveal>
          Your AI tells a store what you need, without telling it who you are.
        </h1>
        <p className="landing-sub" data-reveal>
          The store answers with an offer that cannot lie about the price. Hemloop is the loop
          between a shopper&apos;s private closet and a merchant&apos;s campaign studio, built on
          WebMCP: seventeen typed tools on two web pages, running in the shopper&apos;s and
          merchant&apos;s own browsers.
        </p>
        <p className="landing-sub" data-reveal>
          Both sides choose how much to give, and both sides get more back for giving it. Maya sets
          a sharing dial from 0 to 3; every step up buys a better offer. The store has the same dial
          in reverse: every offer fact it locks is one more thing a shopping agent can do for it.
        </p>
        <div className="landing-ctas" data-reveal>
          <a className="landing-cta primary" href="/closet">
            <Shirt aria-hidden="true" />
            Open the shopper closet
            <ArrowRight aria-hidden="true" />
          </a>
          <a className="landing-cta" href="/studio">
            <Store aria-hidden="true" />
            Open the merchant studio
            <ArrowRight aria-hidden="true" />
          </a>
          {/* eslint-disable-next-line next/no-html-link-for-pages -- /docs is a static asset, not a Next route */}
          <a className="landing-cta ghost" href="/docs/">
            Read the docs
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>


      <section className="landing-flow content" data-reveal aria-label="How a request travels">
        <svg className="flow-diagram" viewBox="0 0 960 190" role="img" aria-labelledby="flow-title">
          <title id="flow-title">Closet to studio to shopping agent, and back</title>
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="12" y="30" width="250" height="90" rx="14" />
            <rect x="355" y="30" width="250" height="90" rx="14" />
            <rect x="698" y="30" width="250" height="90" rx="14" />
            <path d="M262 75 H355" markerEnd="url(#flow-arrow)" />
            <path d="M605 75 H698" markerEnd="url(#flow-arrow)" />
            <path d="M823 120 V160 H137 V120" strokeDasharray="4 5" markerEnd="url(#flow-arrow)" />
          </g>
          <defs>
            <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <g fill="currentColor" fontSize="15" fontWeight="600">
            <text x="137" y="62" textAnchor="middle">Maya&apos;s closet</text>
            <text x="480" y="62" textAnchor="middle">Merchant studio</text>
            <text x="823" y="62" textAnchor="middle">Shopping agent</text>
          </g>
          <g fill="currentColor" fontSize="12" opacity="0.75">
            <text x="137" y="84" textAnchor="middle">7 tools, wardrobe stays here</text>
            <text x="137" y="103" textAnchor="middle">sharing dial 0 to 3</text>
            <text x="480" y="84" textAnchor="middle">10 tools inside locked offer facts</text>
            <text x="480" y="103" textAnchor="middle">false claims rejected before render</text>
            <text x="823" y="84" textAnchor="middle">reads get_offer</text>
            <text x="823" y="103" textAnchor="middle">buys on the store&apos;s own page</text>
            <text x="308" y="66" textAnchor="middle">one approved request</text>
            <text x="308" y="92" textAnchor="middle" fontSize="11">no shopper identifier</text>
            <text x="651" y="66" textAnchor="middle">structured offer</text>
            <text x="651" y="92" textAnchor="middle" fontSize="11">prices, code, dates, link</text>
            <text x="480" y="178" textAnchor="middle" fontSize="11">bought or passed, so both sides learn</text>
          </g>
        </svg>
      </section>

      <LandingDivider />

      <section className="landing-loop content" aria-label="How the loop works">
        <div className="loop-step" data-reveal>
          <span className="loop-index">01</span>
          <Shirt aria-hidden="true" />
          <h2>Maya has a closet</h2>
          <p>
            Her wardrobe, sizes and preferences stay in her own browser. Her agent can shop with
            seven WebMCP tools, but only one of those tools can talk to a store.
          </p>
        </div>
        <div className="loop-step" data-reveal>
          <span className="loop-index">02</span>
          <Radio aria-hidden="true" />
          <h2>One approved request leaves</h2>
          <p>
            At the default level: category, size, an optional product, need or want. Maya&apos;s dial
            can add occasion, who she is shopping for, and taste; the payload preview shows exactly
            what leaves. No name, no account, no wardrobe rows, at any level. The agent cannot press
            Approve, only Maya can.
          </p>
        </div>
        <div className="loop-step" data-reveal>
          <span className="loop-index">03</span>
          <Lock aria-hidden="true" />
          <h2>The store answers inside locked facts</h2>
          <p>
            The merchant locks price, offer, code, dates and disclaimer first. The
            merchant&apos;s agent builds the response with ten tools, and copy that contradicts
            the facts is rejected before it renders. The offer is also readable by shopping
            agents as structured data.
          </p>
        </div>
      </section>


      <section className="landing-dial content" data-reveal aria-label="Sharing levels">
        <h2>The dial: the more you share, the more you gain</h2>
        <p className="landing-agent-note">
          Never shared at any level: name, account, email, wardrobe rows, purchase history, income.
        </p>
        <div className="tool-table-scroll">
          <table className="tool-subtable" aria-label="Sharing levels">
            <thead>
              <tr className="tool-row tool-row-head">
                <th scope="col">Level</th>
                <th scope="col">What leaves the closet</th>
                <th scope="col">What Maya gains</th>
              </tr>
            </thead>
            <tbody>
              <tr className="tool-row"><td>0 Private</td><td>nothing</td><td>fit checks and gap finding stay local</td></tr>
              <tr className="tool-row"><td>1 Basics (default)</td><td>category, size, need or want</td><td>offers in the right size</td></tr>
              <tr className="tool-row"><td>2 Context</td><td>+ occasion, fit preference, who she is shopping for</td><td>offers timed and cut for the occasion</td></tr>
              <tr className="tool-row"><td>3 Taste</td><td>+ colour family, materials to avoid, price ceiling</td><td>creatives that match, no wasted offers</td></tr>
            </tbody>
          </table>
        </div>
        <p className="landing-agent-note">
          The store has the same dial in reverse: every offer fact it locks is one more thing a shopping agent can do for it, and the studio shows which.
        </p>
      </section>

      <LandingDivider />

      <section className="landing-tools content" data-reveal>
        <h2>What we built: {TOTAL_TOOL_COUNT} WebMCP tools, two pages</h2>
        <div className="tool-table-scroll">
          <table className="tool-table" aria-label="WebMCP tool inventory">
            <ToolTableCols />
            <thead>
              <tr className="tool-row tool-row-head">
                <th>Surface</th>
                <th>Tool</th>
                <th>Kind</th>
                <th>What it does</th>
                <th>Structural guarantee</th>
              </tr>
            </thead>
            <tbody>
              {CLOSET_ROWS.map((row, i) => (
                <ToolTableRow key={row.tool} row={row} index={i} />
              ))}
              <tr className="tool-fold-row">
                <td colSpan={5} className="tool-fold-cell" aria-label="Additional studio tools">
                  <div
                    className="tool-table-fold"
                    data-expanded={toolsExpanded}
                    id="tool-table-fold"
                    aria-hidden={!toolsExpanded}
                  >
                    <div className="tool-table-fold-inner">
                      <table className="tool-subtable" aria-label="Studio tools">
                        <ToolTableCols />
                        <tbody>
                          {STUDIO_ROWS.map((row, i) => (
                            <ToolTableRow key={row.tool} row={row} index={i} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
              <ToolTableRow row={ABSENT_ROW} index={0} />
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="tool-table-toggle"
          aria-expanded={toolsExpanded}
          aria-controls="tool-table-fold"
          onClick={() => setToolsExpanded((v) => !v)}
        >
          {toolsExpanded ? 'Show fewer tools' : `Show all ${TOTAL_TOOL_COUNT} tools`}
        </button>
      </section>

      <LandingDivider />

      <section className="landing-agent content" data-reveal>
        <h2>
          <Sparkles data-icon="inline-start" aria-hidden="true" /> Bring your agent
        </h2>
        <div className="agent-blocks">
          <div className="loop-step agent-block" data-reveal>
            <h3>ChatGPT desktop</h3>
            <p>
              Open hemloop.app inside the ChatGPT desktop app&apos;s browser (GPT-5.6 Sol or
              Terra). Site tools register automatically, nothing to enable.
            </p>
          </div>
          <div className="loop-step agent-block" data-reveal>
            <h3>Chrome 149+</h3>
            <p>
              This origin ships a WebMCP origin-trial token, so no flag is needed. On older
              builds enable <code>chrome://flags/#enable-webmcp-testing</code> and relaunch.
            </p>
          </div>
        </div>
        <p className="landing-agent-note">
          The header badge on each page turns green when its tools are live.
        </p>
      </section>

      <LandingDivider />

      <footer className="landing-footer content">
        <p>
          WebMCP tools in-page · catalog data from Shopify (one connector; any catalog with
          handle, title, price works) · agent surfaces ChatGPT and Chrome · deployed on
          Cloudflare Workers · domain registered with Vercel
        </p>
        <p>
          Synthetic demo: every brand, product and shopper is fictional. Open source under MIT. ·{' '}
          {/* eslint-disable-next-line next/no-html-link-for-pages -- /docs is a static asset, not a Next route */}
          <a href="/docs/">Documentation</a> · Photos via Unsplash
        </p>
      </footer>
    </main>
  );
}
