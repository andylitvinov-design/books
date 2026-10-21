import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { positionContactChannelForHitTest } from '../scripts/helpers/contact-channel-positioning.mjs';

const source = readFileSync(new URL('../scripts/verify-contact-channel-chooser-browser.mjs', import.meta.url), 'utf8');
// Execute the actual unchanged browser predicate, not a permissive substitute.
const predicate = source.match(/await page\.waitForFunction\((\(\{channel,panelId\}\) => \{[\s\S]*?\n    \}), \{channel,panelId\}, \{timeout: 5000\}\)\.catch/)?.[1];
assert.ok(predicate, 'The strict viewport/hit predicate must remain in the verifier');

function reachability({ top = 350, bottom = 398, missingPanel = false, missingAnchor = false,
  hitChannel = 'whatsapp', hitTag = 'a' } = {}) {
  const samples = [];
  const anchor = { getBoundingClientRect: () => ({ top, bottom, left: 56, width: 208 }) };
  const hit = { tagName: hitTag.toUpperCase(), closest(selector) {
    assert.equal(selector, 'a[data-contact-channel="whatsapp"]');
    return hitTag === 'a' && hitChannel === 'whatsapp' ? anchor : null;
  } };
  const panel = { querySelector(selector) {
    assert.equal(selector, 'a[data-contact-channel="whatsapp"]');
    return missingAnchor ? null : anchor;
  } };
  const result = runInNewContext('(' + predicate + ')(input)', {
    input: { channel: 'whatsapp', panelId: 'synthetic-panel' }, innerHeight: 844,
    document: {
      getElementById(id) { assert.equal(id, 'synthetic-panel'); return missingPanel ? null : panel; },
      elementFromPoint(x, y) { samples.push({ x, y }); return hitChannel === null ? null : hit; },
    },
  });
  return { result, samples };
}

test('readiness finishes before native center scrolling on the exact locator target', async () => {
  const calls = [];
  let ready;
  const stable = new Promise(resolve => { ready = resolve; });
  const exactAnchor = { scrollIntoView(options) { calls.push(['native-center', options]); } };
  const link = {
    async scrollIntoViewIfNeeded() { calls.push(['stable-start']); await stable; calls.push(['stable-end']); },
    async evaluate(callback) {
      calls.push(['evaluate-exact-target']);
      // No document/window/style/attribute APIs: the serialized callback can
      // only invoke the selected anchor's native scrolling operation.
      runInNewContext('(' + callback.toString() + ')(anchor)', { anchor: exactAnchor });
    },
  };
  const work = positionContactChannelForHitTest(link);
  await Promise.resolve();
  assert.deepEqual(calls, [['stable-start']], 'Centering cannot race the stable wait');
  ready();
  await work;
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['stable-start'], ['stable-end'], ['evaluate-exact-target'],
    ['native-center', { block: 'center', inline: 'nearest', behavior: 'instant' }],
  ]);
});

test('a detached/readiness failure is not bypassed by forced scrolling', async () => {
  let evaluated = false;
  await assert.rejects(positionContactChannelForHitTest({
    async scrollIntoViewIfNeeded() { throw new Error('synthetic detached target'); },
    async evaluate() { evaluated = true; },
  }), /synthetic detached target/);
  assert.equal(evaluated, false);
});

test('native center failure remains a failure, with no fallback or success rewrite', async () => {
  await assert.rejects(positionContactChannelForHitTest({
    async scrollIntoViewIfNeeded() {},
    async evaluate() { throw new Error('synthetic scroll failure'); },
  }), /synthetic scroll failure/);
});

test('the real predicate accepts a fully visible intended target at its original hit point', () => {
  const { result, samples } = reachability();
  assert.equal(result, true);
  assert.deepEqual(samples, [{ x: 160, y: 392 }]);
});

test('observed fractional clipping and larger top/bottom clipping still fail exactly', () => {
  for (const bounds of [
    { top: -0.171875, bottom: 47.828125 },
    { top: -18, bottom: 30 },
    { top: 796.171875, bottom: 844.171875 },
    { top: 800, bottom: 848 },
  ]) {
    const { result, samples } = reachability(bounds);
    assert.equal(result, false, JSON.stringify(bounds));
    assert.deepEqual(samples, [], 'Outside bounds must fail before a successful hit can excuse them');
  }
});

test('visible bounds cannot hide a real overlay, clipped hit point or wrong channel', () => {
  for (const options of [
    { hitTag: 'header', hitChannel: 'overlay' },
    { hitTag: 'div', hitChannel: 'clipping-ancestor' },
    { hitTag: 'a', hitChannel: 'telegram' },
    { hitChannel: null },
  ]) assert.equal(reachability(options).result, false, JSON.stringify(options));
});

test('missing intended panel or anchor still fails closed', () => {
  assert.equal(reachability({ missingPanel: true }).result, false);
  assert.equal(reachability({ missingAnchor: true }).result, false);
});

test('verifier positions each exact channel before unchanged size and reachability checks', () => {
  assert.match(source, /import \{ positionContactChannelForHitTest \} from "\.\/helpers\/contact-channel-positioning\.mjs";/);
  assert.match(source, /for \(const \[channel, link\] of \[\["whatsapp", wa\], \["telegram", tg\]\]\) \{\s+await positionContactChannelForHitTest\(link\);\s+const b = await link\.boundingBox\(\);/);
  assert.match(source, /b\.width >= 100 && b\.height >= 44/);
  assert.match(source, /if \(r\.top < 0 \|\| r\.bottom > innerHeight\) return false;/);
  assert.match(source, /page\.evaluate\(collectContactChannelGeometry, \{ channel, panelId \}\)/);
  assert.match(source, /throw new Error\("Messenger channel obstructed: "/);
});
