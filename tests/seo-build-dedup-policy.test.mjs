import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const seo = readFileSync('.github/workflows/hh-live-seo-audit.yml', 'utf8');
const core = readFileSync('.github/workflows/hh-pr-core-release.yml', 'utf8');

test('SEO avoids duplicate production PR build while preserving nonproduction validation and browser coverage', () => {
  const source = seo.split('  source-build:')[1].split('  audit:')[0];
  const guard = "github.event.pull_request.base.ref != 'codex/public-book-library'";
  for (const name of ['Install dependencies for nonproduction PRs', 'Verify TypeScript after localized book migration', 'Verify Next.js production build']) {
    const step = source.split(`- name: ${name}`)[1]?.split('\n      - ')[0];
    assert.ok(step?.includes(guard), `${name} must run on nonproduction PRs only`);
  }
  assert.match(source, /node --test tests\/seo-build-dedup-policy\.test\.mjs/);
  // Core moved to ONE type-checked Next production build in #2741;
  // an old explicit-tsc oracle would incorrectly block every SEO PR.
  assert.match(core, /Exact proposed release production build and TypeScript check/);
  assert.match(core, /run: npm run build/);
  const nextConfig = readFileSync('next.config.ts', 'utf8');
  assert.doesNotMatch(nextConfig, /ignoreBuildErrors\\s*:\\s*true/);
  assert.match(seo, /node scripts\/verify-public-tests-mobile\.mjs/);
});
