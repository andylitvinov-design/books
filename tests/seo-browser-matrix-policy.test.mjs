import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/verify-public-tests-mobile.mjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/hh-live-seo-audit.yml', import.meta.url), 'utf8');

test('PR: all EN/RU/ES at 390px on isolated exact-head app; production: full 3x3', () => {
  assert.match(script,/const locales = \["en", "ru", "es"\]/);
  assert.match(script,/const widths = fastPr \? \[390\] : \[320, 390, 430\]/);
  assert.match(script,/if \(fastPr && origin === canonicalOrigin\)/);
  assert.match(script,/focused-PR-3/);
  assert.match(script,/full-release-9/);
  assert.match(script,/unexpected|canonical/i);
  assert.match(workflow,/HH_SEO_QA_FAST_PR=1 HH_SEO_AUDIT_ORIGIN=http:\/\/127\.0\.0\.1:3182 node scripts\/verify-public-tests-mobile\.mjs/);
  assert.match(workflow,/\n\s+node scripts\/verify-public-tests-mobile\.mjs\n/);
  assert.match(workflow,/\n  push:/);
  assert.match(workflow,/\n  workflow_dispatch:/);
  assert.match(workflow,/node --test tests\/seo-localized-books\.test\.mjs tests\/seo-nightly-crawl\.test\.mjs tests\/public-tests-seo-landing\.test\.mjs tests\/seo-browser-matrix-policy\.test\.mjs/);
  assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
