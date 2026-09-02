import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const configUrl = new URL('../dist/server/wrangler.json', import.meta.url);
const configPath = fileURLToPath(configUrl);
const config = JSON.parse(await readFile(configUrl, 'utf8'));

let changed = false;

if (Object.hasOwn(config, 'legacy_env')) {
  delete config.legacy_env;
  changed = true;
  console.log(`Removed unsupported legacy_env from ${configPath}`);
}

// Custom domains: the zone lives in the same Cloudflare account, so Wrangler
// creates the DNS records and certificates on deploy. workers.dev stays live.
const customDomains = ['hemloop.app', 'www.hemloop.app'];
const routes = customDomains.map((pattern) => ({ pattern, custom_domain: true }));
if (JSON.stringify(config.routes) !== JSON.stringify(routes) || config.workers_dev !== true) {
  config.routes = routes;
  // Adding routes silently disables workers.dev unless it is set explicitly.
  config.workers_dev = true;
  changed = true;
  console.log(`Set custom domains: ${customDomains.join(', ')}`);
}

if (changed) {
  await writeFile(configUrl, `${JSON.stringify(config)}\n`);
} else {
  console.log(`Worker config already compatible: ${configPath}`);
}
