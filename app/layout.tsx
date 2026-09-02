import type { Metadata } from 'next';

import { BRAND, WEBMCP_ORIGIN_TRIAL_TOKENS } from '@/lib/proofframe/brand';

import './globals.css';

export const metadata: Metadata = {
  title: 'Hemloop: the closet stays private, the demand gets through',
  description: BRAND.sub,
  // Pre-submission stealth: no indexing until the challenge closes.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Pre-submission stealth; vinext does not render metadata.robots yet */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {WEBMCP_ORIGIN_TRIAL_TOKENS.map((token) => (
          <meta key={token.slice(0, 12)} httpEquiv="origin-trial" content={token} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
