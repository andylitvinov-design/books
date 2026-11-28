import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertHistoryProvenanceEvidence } from '../scripts/csp-history-provenance-probe.mjs';
const entry = (key, document = 'original', hash = '', pathname = '/en/about') => ({ key, document, hash, pathname, owned: true });
function evidence() {
  return { home: entry('home', 'original', '', '/'), about: entry('about'),
    repeated: [entry('home'), entry('about'), entry('home'), entry('about')],
    hashes: [entry('hash', 'original', '#hh-provenance-hash'), entry('about'), entry('hash', 'original', '#hh-provenance-hash')],
    reloadedHome: entry('home', 'fresh-home', '', '/'), foreignAbout: entry('about', 'fresh-about'),
    events: [{ type: 'popstate', document: 'fresh-home', owned: false, key: 'about', url: 'https://example.test/en/about' }], errors: [] };
}
test('native owned and foreign history evidence establishes strict acceptance', () => {
  assert.deepEqual(assertHistoryProvenanceEvidence(evidence()), { foreignHistoryReloadVerified: true, ownedHistoryVerified: true, hashHistoryVerified: true });
});
for (const [name, mutate] of [
  ['missing native keys', e => { e.home.key = null; }],
  ['ownership fallback', e => { e.about.owned = null; }],
  ['ordinary soft link reload', e => { e.about.document = 'unexpected'; }],
  ['owned history reload', e => { e.repeated[0].document = 'unexpected'; }],
  ['wrong native entry', e => { e.repeated[1].key = 'unexpected'; }],
  ['hash reload', e => { e.hashes[0].document = 'unexpected'; }],
  ['missing hash traversal', e => { e.hashes.pop(); }],
  ['foreign history stays soft', e => { e.foreignAbout.document = e.reloadedHome.document; }],
  ['missing foreign restore evidence', e => { delete e.events; }],
  ['native cross-document replacement only', e => { e.events = []; }],
  ['owned entry attributed as foreign', e => { e.events[0].owned = true; }],
  ['restore observed in a different document', e => { e.events[0].document = 'fresh-about'; }],
  ['restore to a different URL', e => { e.events[0].url = 'https://example.test/en/services'; }],
  ['restore of a different native entry', e => { e.events[0].key = 'another-entry'; }],
  ['non-persisted pageshow attributed as restore', e => { e.events[0].type = 'pageshow'; e.events[0].persisted = false; }],
  ['hidden browser error', e => { e.errors.push('ChunkLoadError'); }],
]) {
  test(`native provenance acceptance rejects ${name}`, () => {
    const value = evidence(); mutate(value); assert.throws(() => assertHistoryProvenanceEvidence(value));
  });
}

test('persisted pageshow can establish foreign restore when its document and entry match', () => {
  const value = evidence(); value.events[0].type = 'pageshow'; value.events[0].persisted = true;
  assert.equal(assertHistoryProvenanceEvidence(value).foreignHistoryReloadVerified, true);
});


test('CSP browser audit identifies the actual My Coach home and keeps visible hero and navigation assertions',()=>{
  const catalog = readFileSync(new URL('../components/my-coach-catalog.jsx',import.meta.url),'utf8');
  const helper = readFileSync(new URL('../scripts/verify-my-coach-home-entry.mjs',import.meta.url),'utf8');
  const audit = readFileSync(new URL('../scripts/verify-release-reaudit.mjs',import.meta.url),'utf8');
  const history = readFileSync(new URL('../scripts/csp-history-provenance-probe.mjs',import.meta.url),'utf8');
  assert.match(catalog,/<main[^>]*data-my-coach-catalog/);
  for (const marker of ['data-my-coach-hero', 'data-my-coach-rail', 'my-coach-heading']) {
    assert.ok(catalog.includes(marker), 'Real catalog must retain ' + marker);
    assert.ok(helper.includes(marker), 'Browser helper must verify ' + marker);
  }
  for (const check of ["page.locator('main[data-my-coach-catalog]')", "page.waitForURL(url=>url.pathname===target", "await root.count(),1", "await root.getAttribute('lang'),locale", "waitFor({state:'visible'", "data-my-coach-program-details", "data-home-dialogue-entry", "document.documentElement.scrollWidth<=innerWidth+1"]) {
    assert.ok(helper.includes(check), 'Home acceptance must retain ' + check);
  }
  for (const source of [audit,history]) {
    assert.ok(source.includes("import { verifyMyCoachHome } from './verify-my-coach-home-entry.mjs'"));
    assert.match(source,/await verifyMyCoachHome\(/);
    assert.doesNotMatch(source,/main\[data-home-design=|approved-v2/);
  }
  assert.ok(history.includes("await ready('/en/services'); result.home = await snapshot()"));
  assert.ok(history.includes("await aboutLink.click()"));
  assert.ok(history.includes("assertHistoryProvenanceEvidence(result)"));
});
