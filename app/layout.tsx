import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'ProofFrame — Agent-native campaign studio',
  description:
    'Build motion campaigns with your browser agent while human-locked product facts keep every claim true.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
