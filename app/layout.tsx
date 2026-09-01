import type { Metadata } from 'next';

import { BRAND } from '@/lib/proofframe/brand';

import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
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
      </head>
      <body>{children}</body>
    </html>
  );
}
