import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8');
test('404 includes localized titles and useful recovery links',()=>{
  const s=read('app/not-found.tsx');
  for(const heading of ['Page not found','Страница не найдена','Página no encontrada'])
    assert.ok(s.includes(heading));
  assert.match(s,/c\.heading} \| Holistic House/);
  assert.match(s,/client\/tests/);
  assert.match(s,/services\/free-situation-review/);
});
test('live sitemap monitor differentiates rate limit and en ru es missing page titles',()=>{
  const s=read('scripts/verify-live-sitemap.mjs');
  assert.match(s,/statuses\.rateLimited/);
  assert.match(s,/translatedNotFound/);
});

test('public media crawler retries transport failures and validates remote HTTP 404',()=>{
  const script=read('scripts/verify-public-assets.mjs'), academy=read('data/academy/catalog.ts');
  assert.match(script,/requestWithRetry/);
  assert.match(script,/attempt < 3/);
  assert.match(script,/but GET/);
  assert.match(script,/networkUnverified/);
  assert.match(script,/passed_with_warnings/);
  assert.match(script,/result.rateLimited\+\+/);
  assert.match(academy,/unavailablePublicYouTubeIds/);
  assert.match(academy,/OrdMvKn2Zg8/);
  assert.match(academy,/!unavailablePublicYouTubeIds.has/);
});

test('Lighthouse measures key public mobile routes, captures screenshots and reports lab thresholds without inventing field INP',()=>{
  const workflow=read('.github/workflows/hh-lighthouse.yml');
  const script=read('scripts/report-hh-lighthouse.mjs');
  const screenshots=read('scripts/export-hh-lighthouse-screenshots.mjs');
  assert.match(workflow,/lighthouse-services-mobile\.json/);
  assert.match(workflow,/lighthouse-remedy-mobile\.json/);
  assert.match(workflow,/export-hh-lighthouse-screenshots/);
  assert.match(script,/maxLcpMs: 2500, maxCls: 0\.1/);
  assert.match(script,/mobileThresholds/);
  assert.match(script,/INP/);
  assert.match(screenshots,/final-screenshot/);
});

test('all public remedy lead images reserve a square layout box and are discovery-prioritized',()=>{
  const standard=read('components/remedy-page.tsx');
  const spanish=read('app/es/homeopathy/remedies/[slug]/page.tsx');
  const css=read('app/globals.css');
  for(const source of [standard,spanish]){
    assert.match(source,/width=\{800\} height=\{800\}/);
    assert.match(source,/fetchPriority="high" loading="eager"/);
    assert.match(source,/decoding="async"/);
    assert.match(source,/remedy\.primary_image/);
  }
  assert.match(css,/\.remedy-primary-image \{[^\n]*aspect-ratio: 1 \/ 1;/);
  assert.match(css,/\.remedy-primary-image img \{[^\n]*object-contain;[^\n]*height: 100%/);
  assert.match(standard,/supportingImages\.map/);
  assert.match(standard,/loading="lazy" decoding="async"/);
});

test('public test landing stays indexable and the live auditor no longer expects its former private redirect',()=>{
  const crawler=read('scripts/verify-live-sitemap.mjs');
  const workflow=read('.github/workflows/hh-live-seo-audit.yml');
  const mobile=read('scripts/verify-public-tests-mobile.mjs');
  assert.match(crawler, /"\/en\/tests", "\/ru\/tests", "\/es\/tests"/);
  assert.doesNotMatch(crawler, /\["\/en\/tests", "\/en\/client\/tests"\]/);
  assert.match(crawler, /Public tests unexpectedly noindex/);
  assert.match(crawler, /Public tests .* hreflang mismatch/);
  assert.match(crawler, /Public test CTA missing/);
  assert.match(workflow, /verify-public-tests-mobile\.mjs/);
  assert.match(workflow, /app\/\[locale\]\/tests/);
  assert.match(mobile, /widths = \[320, 390, 430\]/);
  assert.match(mobile, /"x-default"/);
  assert.match(mobile, /Horizontal overflow/);
  assert.match(mobile, /primaryHeight >= 44/);
  assert.match(mobile, /No login/);
});
