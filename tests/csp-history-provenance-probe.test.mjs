import assert from 'node:assert/strict';
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
