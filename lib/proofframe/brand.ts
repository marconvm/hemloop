// Product brand. ONE place to change when the name is finalised - internal
// code namespace stays `proofframe` regardless (see TECH-GUIDE).
export const BRAND = {
  name: 'Hemloop',
  tagline: 'The closet stays private. The demand gets through.',
  sub: 'A two-sided, agent-native commerce loop: shoppers share demand without an identifier, merchants see the gap, and every promotion traces back to human-locked facts.',
  challenge: 'OpenAI WebMCP Challenge entry',
} as const;

// Chrome origin-trial tokens for WebMCP (Chrome 149+, trial ends Nov 16 2026).
// Let judges use the live site without flipping chrome://flags. One token per
// origin — the token is bound to scheme+host+port. Registered 2026-09-02 at
// https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241
// Tokens are public by design (they ship in the HTML), so committing them is fine.
export const WEBMCP_ORIGIN_TRIAL_TOKENS = [
  // https://hemloop.marcoatwill.workers.dev
  'ArJrc8xOlGFP0G5J9CkIrxpbbbqesM8cze7S3CmVC3beb+dxfjgKmBQuAGRyJ7HkL/I8QI11leErNu1U3YIZ7wYAAABfeyJvcmlnaW4iOiJodHRwczovL2hlbWxvb3AubWFyY29hdHdpbGwud29ya2Vycy5kZXY6NDQzIiwiZmVhdHVyZSI6IldlYk1DUCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=',
  // https://hemloop.app
  'ArhT9FIX3tve7C4Fd7cgCTF9DhqHl8azu+72C6CO4Wgv09ooQZWurKTtKfwz2bnF8WZUt0iX9DhbWJHZ552STAkAAABLeyJvcmlnaW4iOiJodHRwczovL2hlbWxvb3AuYXBwOjQ0MyIsImZlYXR1cmUiOiJXZWJNQ1AiLCJleHBpcnkiOjE3OTQ4NzM2MDB9',
] as const;
