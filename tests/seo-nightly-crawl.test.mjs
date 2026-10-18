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
