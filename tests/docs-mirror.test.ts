/** Public docs mirror: every markdown file served from public/docs must match
 * its twin under docs/ (README mirrors from the repo root). Internal process
 * files live under docs/internal/ and must not appear in public/docs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PUBLIC_DOCS = join(ROOT, 'public', 'docs');
const DOCS = join(ROOT, 'docs');

const INTERNAL_BASENAMES = new Set([
  'GAP-ANALYSIS.md',
  'DEVPOST-CHECKLIST.md',
  'DEVPOST-SUBMISSION.md',
  'WRITEUP.md',
  'TEST-PLAN.md',
  'VERIFICATION.md',
  'PRD.md',
  'VOICEOVER.md',
  'DEMO-SCRIPT.md',
]);

function publicMarkdownFiles(): string[] {
  return readdirSync(PUBLIC_DOCS).filter((name) => name.endsWith('.md')).sort();
}

void test('public/docs mirrors only the public docs set (byte-identical)', () => {
  const published = publicMarkdownFiles();
  assert.ok(published.includes('README.md'), 'README.md is mirrored from the repo root');
  for (const name of published) {
    assert.equal(
      INTERNAL_BASENAMES.has(name),
      false,
      `${name} is internal and must not be under public/docs`,
    );
    const source =
      name === 'README.md' ? join(ROOT, 'README.md') : join(DOCS, name);
    assert.ok(existsSync(source), `missing source for public/docs/${name}: ${source}`);
    const a = readFileSync(source);
    const b = readFileSync(join(PUBLIC_DOCS, name));
    assert.equal(
      Buffer.compare(a, b),
      0,
      `public/docs/${name} differs from ${name === 'README.md' ? 'README.md' : `docs/${name}`}`,
    );
  }
});

void test('docs/internal holds the process files and they are not published', () => {
  const internalDir = join(DOCS, 'internal');
  assert.ok(existsSync(internalDir), 'docs/internal/ exists');
  for (const name of INTERNAL_BASENAMES) {
    assert.ok(
      existsSync(join(internalDir, name)),
      `docs/internal/${name} should exist`,
    );
    assert.equal(
      existsSync(join(PUBLIC_DOCS, name)),
      false,
      `public/docs/${name} must be absent`,
    );
    assert.equal(
      existsSync(join(DOCS, name)),
      false,
      `docs/${name} should have moved into docs/internal/`,
    );
  }
});
