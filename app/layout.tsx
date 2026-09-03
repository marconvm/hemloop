import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';

import { BRAND, WEBMCP_ORIGIN_TRIAL_TOKENS } from '@/lib/proofframe/brand';

import './globals.css';

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const displayFont = Manrope({
  subsets: ['latin'],
  variable: '--font-display',
});

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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {WEBMCP_ORIGIN_TRIAL_TOKENS.map((token) => (
          <meta key={token.slice(0, 12)} httpEquiv="origin-trial" content={token} />
        ))}
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
