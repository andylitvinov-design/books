import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCspNavigationCancellation } from '../scripts/csp-navigation-diagnostics.mjs';
const origin = 'http://127.0.0.1:3123';
const lifecycle = [
  { type: 'init', time: 1, documentProbe: 'old', url: origin + '/en/about' },
  { type: 'navigate', time: 100, documentProbe: 'old', sameDocument: false, destination: origin + '/en/academy/reiki/tantra-reiki' },
  { type: 'pagehide', time: 140, documentProbe: 'old' },
  { type: 'init', time: 150, documentProbe: 'new', url: origin + '/en/academy/reiki/tantra-reiki' },
];
const detail = { engine: 'webkit', readiness: 'rapid-history', origin, lifecycle };
const diagnostic = (url = origin + '/?_rsc=probe', time = 125) => ({ time, stack: `Fetch API cannot load ${url} due to access control checks.\n    at fetch` });
test('only the exact old-document teardown diagnostic has a bounded classification', () => {
  assert.equal(classifyCspNavigationCancellation(diagnostic(), detail)?.kind, 'webkit-hard-navigation-fetch-cancellation');
  const privateLife = lifecycle.map(event => event.type === 'init' && event.documentProbe === 'old' ? { ...event, url: origin + '/en/client' } : event);
  assert.ok(classifyCspNavigationCancellation(diagnostic(origin + '/api/app/guest/bootstrap'), { ...detail, lifecycle: privateLife }));
});
test('stable/new documents, other engines, and loaded journeys keep identical messages fatal', () => {
  for (const variant of [
    { ...detail, lifecycle: [lifecycle[0]] },
    { ...detail, lifecycle: lifecycle.filter(event => event.type !== 'pagehide') },
    { ...detail, engine: 'chromium' },
    { ...detail, readiness: 'loaded-history' },
    { ...detail, lifecycle: lifecycle.map(event => event.type === 'navigate' ? { ...event, sameDocument: true } : event) },
    { ...detail, lifecycle: lifecycle.map(event => event.type === 'init' ? { ...event, documentProbe: 'old' } : event) },
  ]) assert.equal(classifyCspNavigationCancellation(diagnostic(), variant), null);
  for (const time of [10, 99, 141, 150, 151]) assert.equal(classifyCspNavigationCancellation(diagnostic(undefined, time), detail), null);
});
test('unknown endpoints, origins, queries, ordinary throws and uncaught rejections remain fatal', () => {
  for (const url of [origin + '/api/app/unknown', origin + '/api/admin/private', origin + '/api/app/guest/bootstrap?new=1', origin + '/', origin + '/?_rsc=x&other=y', 'https://elsewhere.test/?_rsc=x']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(url), detail), null);
  }
  assert.equal(classifyCspNavigationCancellation({ time: 125, stack: 'Error: ordinary failure' }, detail), null);
  for (const type of ['window-error', 'unhandled-rejection']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...detail, lifecycle: [...lifecycle, { type, time: 125 }] }), null);
  }
});
