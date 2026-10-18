import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getPublicServiceDetailHref } from '../lib/practitioners/public-service-links.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Andrey legacy Homeopathy consultation opens the approved new psycho-homeopathy landing', () => {
  assert.equal(getPublicServiceDetailHref('en', 'andy-litvinov', 'homeopathy-consultation'), '/en/services/alchemy-of-soul');
  assert.equal(getPublicServiceDetailHref('ru', 'andy-litvinov', 'homeopathy-consultation'), '/ru/services/alchemy-of-soul');
  // Spanish now uses the same unified Alchemy of the Soul landing.
  assert.equal(getPublicServiceDetailHref('es', 'andy-litvinov', 'homeopathy-consultation'), '/es/services/alchemy-of-soul');
});

test('all unrelated and non-owner services retain their real moderated service URLs', () => {
  for (const locale of ['en', 'ru', 'es']) {
    assert.equal(getPublicServiceDetailHref(locale, 'another-practitioner', 'homeopathy-consultation'),
      `/${locale}/services/another-practitioner/homeopathy-consultation`);
    assert.equal(getPublicServiceDetailHref(locale, 'andy-litvinov', 'free-wu-xing-diagnostic'),
      `/${locale}/services/andy-litvinov/free-wu-xing-diagnostic`);
    assert.equal(getPublicServiceDetailHref(locale, 'andy-litvinov', 'personal-constellation-session'),
      `/${locale}/services/andy-litvinov/personal-constellation-session`);
  }
});

test('My Practice and Services listing card destinations use the shared canonical URL', () => {
  const practice = read('components/app/practice-workspace.jsx');
  const listing = read('components/master-network-explorer.tsx');
  assert.match(practice, /href=\{getPublicServiceDetailHref\(locale,item\.practitionerSlug,item\.slug\)\}/);
  assert.match(listing, /const detailsHref = getPublicServiceDetailHref\(locale, service\.practitionerSlug, service\.slug\)/);
  assert.match(listing, /getPublicServiceDetailHref\(locale, master\.slug, master\.services\[0\]\.slug\)/);
});

test('legacy deep links redirect permanently only after published-service authorization check', () => {
  const page = read('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx');
  const guardIndex = page.indexOf('if(!value)notFound();');
  const redirectIndex = page.indexOf('permanentRedirect(canonicalHref)');
  assert.ok(guardIndex >= 0 && redirectIndex > guardIndex, 'publishing gate must run before redirect');
  assert.match(page, /getPublicServiceDetailHref\(locale,practitionerSlug,serviceSlug\)/);
  assert.match(page, /alternates:\{canonical:getPublicServiceDetailHref/);
  const alchemy = read('components/alchemy-soul-landing.tsx');
  assert.match(alchemy, /id="reviews" data-alchemy-panel="reviews"/);
  const spanish = read('app/[locale]/services/psychohomeopathy/page.tsx');
  assert.match(spanish, /permanentRedirect\("\/" \+ locale \+ "\/services\/alchemy-of-soul"\)/);
});
