import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const configUrl = new URL('../dist/server/wrangler.json', import.meta.url);
const configPath = fileURLToPath(configUrl);
const config = JSON.parse(await readFile(configUrl, 'utf8'));

if (Object.hasOwn(config, 'legacy_env')) {
  delete config.legacy_env;
  await writeFile(configUrl, `${JSON.stringify(config)}\n`);
  console.log(`Removed unsupported legacy_env from ${configPath}`);
} else {
  console.log(`Worker config already compatible: ${configPath}`);
}
