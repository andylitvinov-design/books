import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const library = readFileSync('.github/workflows/library-public-feed.yml', 'utf8');
const services = readFileSync('.github/workflows/hh-public-services-production.yml', 'utf8');

test('Library uses the same pinned Playwright browser image as verified Public Services', () => {
  const image = 'mcr.microsoft.com/playwright:v1.63.0-noble';
  assert.ok(services.includes('image: ' + image), 'shared browser image must stay independently verified');
  assert.match(library, /runs-on: ubuntu-24\.04\n\s+#[^\n]+\n\s+#[^\n]+\n\s+container:\n\s+image: mcr\.microsoft\.com\/playwright:v1\.63\.0-noble/);
  assert.match(library, /@playwright\/test@1\.63\.0/);
  assert.doesNotMatch(library, /playwright install --with-deps|sudo apt|sudo tee/);
});

test('Library cannot silently skip real Chromium/WebKit and localized mobile journeys', () => {
  assert.match(library, /const \{chromium, webkit\} = require\('/);
  assert.match(library, /await engine\.launch\(\{headless:true, timeout:15000\}\)/);
  assert.match(library, /node scripts\/verify-ideas-mobile-browser\.mjs/);
  assert.match(library, /node scripts\/verify-unified-six-dock-browser\.mjs/);
  assert.match(library, /Library pinned browser ready:/);
  assert.match(library, /tests\/library-playwright-runner\.test\.mjs/);
  assert.match(library, /\.github\/workflows\/library-public-feed\.yml/);
  assert.match(library, /cancel-in-progress:/);
  assert.match(library, /persist-credentials: false/);
});
