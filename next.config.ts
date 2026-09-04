import type { NextConfig } from 'next';


// Security headers agreed in the round-2 dual review (no CSP pre-submission:
// RSC inline scripts would need nonces; HSTS is a no-op on workers.dev but
// ready for the custom domain).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Round 3: the Approve and Lock buttons are human gates; never let a frame put them under a cursor.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Cache-Control', value: 'no-cache' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },};

export default nextConfig;
