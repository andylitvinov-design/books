import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Home practitioner CTA is native before hydration, while menu keeps Next soft history',()=>{
 const link=src('components/acquisition-event-link.tsx');
 const home=src('components/holistic-house-home.tsx');
 const release=src('scripts/verify-release-reaudit.mjs');
 const probe=src('scripts/csp-history-provenance-probe.mjs');
 assert.ok(link.includes('nativeNavigation?: boolean'));
 assert.ok(link.includes('if (nativeNavigation) return <a'));
 assert.ok(home.includes('event="practitioner_view" nativeNavigation'));
 assert.ok(release.includes("Both CDN and full Home must open About in a fresh document"));
 assert.ok(probe.includes('.site-main-menu-more [data-nav-item="about"]'));
 assert.ok(probe.includes('await ready(\'/en/about\')'));
 assert.ok(release.includes("assert.equal(await cspPage.evaluate(() => window.__cspDocumentProbe), undefined"));
});
