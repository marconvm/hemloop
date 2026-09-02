// Product brand. ONE place to change when the name is finalised - internal
// code namespace stays `proofframe` regardless (see TECH-GUIDE).
export const BRAND = {
  name: 'Hemloop',
  tagline: 'The closet stays private. The demand gets through.',
  sub: 'A two-sided, agent-native commerce loop: shoppers share demand without an identifier, merchants see the gap, and every promotion traces back to human-locked facts.',
  challenge: 'OpenAI WebMCP Challenge entry',
} as const;

// Chrome origin-trial token for WebMCP (Chrome 149+). Lets judges use the live
// site without flipping chrome://flags. Register the origin at
// https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241
// and paste the token here; the layout emits the meta tag only when it is set.
// The token is public by design (it ships in the HTML), so committing it is fine.
export const WEBMCP_ORIGIN_TRIAL_TOKEN = '';
