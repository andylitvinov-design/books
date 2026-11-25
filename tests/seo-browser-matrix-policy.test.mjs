import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/verify-public-tests-mobile.mjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/hh-live-seo-audit.yml', import.meta.url), 'utf8');

test('PR validates source SEO while production keeps full EN/RU/ES 3x3 browser acceptance', () => {
  assert.match(script,/const locales = \["en", "ru", "es"\]/);
  assert.match(script,/const widths = fastPr \? \[390\] : \[320, 390, 430\]/);
  assert.match(script,/if \(fastPr && origin === canonicalOrigin\)/);
  assert.match(script,/focused-PR-3/);
  assert.match(script,/full-release-9/);
  assert.match(script,/unexpected|canonical/i);
  assert.match(workflow,/Validate source SEO and public-test mobile contracts before merge/);
  assert.match(workflow,/if: github.event_name == 'pull_request'/);
  assert.match(workflow,/node --test tests\/public-tests-seo-landing\.test\.mjs tests\/seo-browser-matrix-policy\.test\.mjs/);
  assert.doesNotMatch(workflow,/npx next dev --hostname 127\.0\.0\.1 --port 3182/,
    'PR may not start a redundant local browser server');
  assert.match(workflow,/Validate nine EN\/RU\/ES public test browser cases at 320\/390\/430px after merge/);
  assert.match(workflow,/if: github.event_name != 'pull_request'/);
  assert.match(workflow,/run: node scripts\/verify-public-tests-mobile\.mjs/);
  assert.match(workflow,/playwright install --with-deps chromium/);
  assert.match(workflow,/\n  push:/);
  assert.match(workflow,/\n  workflow_dispatch:/);
  assert.match(workflow,/node --test tests\/seo-localized-books\.test\.mjs tests\/seo-nightly-crawl\.test\.mjs tests\/public-tests-seo-landing\.test\.mjs tests\/seo-browser-matrix-policy\.test\.mjs/);
  assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
