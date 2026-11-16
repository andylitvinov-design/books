import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('homepage category labels are projected on the server, never bundle 256 MyTube scenes on first paint',()=>{
  const tiles=read('components/home-more-disclosure.tsx');
  const home=read('components/holistic-house-home.tsx');
  const es=read('app/es/page.tsx');
  const taxonomy=read('lib/mandala/mytube-content-taxonomy.mjs');
  const catalog=JSON.parse(read('data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json'));
  assert.match(tiles,/^"use client";/);
  assert.doesNotMatch(tiles,/mytube-content-taxonomy|mytube-video-tagging|listMyTubeCategories|mytube-content-taxonomy-4x4x4/);
  assert.match(tiles,/categories: ReadonlyArray<\{ id: string; label: string \}>/);
  assert.match(tiles,/categories\.map\(category => <Link/);
  for(const [id,slug] of Object.entries({'goals-money':'business','love-relationships':'love','energy-confidence':'energy','stress-anxiety':'stress'})){
    assert.ok(tiles.includes('"'+id+'": "'+slug+'"'));
    assert.ok(catalog.categories.some(c=>c.id===id&&c.label.en&&c.label.ru&&c.label.es));
  }
  assert.match(home,/listMyTubeCategories\(locale\)/);
  assert.match(es,/listMyTubeCategories\("es"\)/);
  assert.doesNotMatch(home,/^"use client"/m);
  assert.match(taxonomy,/import taxonomy from .*mytube-content-taxonomy-4x4x4-v2\.json/);
  assert.equal(catalog.hierarchy.totalScenarios,256);
  assert.ok(Buffer.byteLength(read('data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json'))>300000);
});

test('below-fold approved profile picture uses existing compressed AVIF instead of full WebP',()=>{
  const home=read('components/home-featured-workspace.tsx');
  assert.match(home,/"profile": "\/images\/holistic-house\/report-lighthouse-coast\.avif"/);
  assert.doesNotMatch(home,/"profile": "\/images\/holistic-house\/report-lighthouse-coast\.webp"/);
  assert.match(home,/<Image src=\{photos\[offer\.id\]\} alt="" fill unoptimized loading="lazy"/);
  const original=statSync(new URL('../public/images/holistic-house/report-lighthouse-coast.webp', import.meta.url)).size;
  const compressed=statSync(new URL('../public/images/holistic-house/report-lighthouse-coast.avif', import.meta.url)).size;
  assert.ok(original>500000&&compressed<120000&&original/compressed>5, 'keep image byte savings without new runtime optimizer');
});

test('YouTube uses existing click-to-play facade; GTM cannot load without consent',()=>{
  const player=read('components/site-video-player.tsx');
  const analytics=read('components/ga4-analytics.tsx');
  assert.match(player,/https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.match(player,/onClick|setPlaying/);
  assert.match(analytics,/if \(!PUBLIC_ANALYTICS_AVAILABLE \|\| !measurementId/);
  assert.match(analytics,/if \(!hasConsent\(\)/);
  assert.doesNotMatch(analytics,/document\.write\(/);
});
