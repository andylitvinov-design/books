import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyReleasePosters } from '../scripts/helpers/release-services-poster-verifier.mjs';

const component = readFileSync(new URL('../components/personal-testimonials.tsx', import.meta.url), 'utf8');
const records = component.match(/const testimonialVideos = (\{[\s\S]*?\}) as const;/)?.[1];
assert.ok(records, 'Use the actual source testimonial catalogue');
const catalog = new Function('return ' + records)();
const remote = new Set(['m9RfDgK76PU', '5oj0BIbLT4w']);

async function scenario({ locale = 'en', path = '/' + locale + '/services', initiallyOpen = false, fault } = {}) {
  const ids = catalog[locale].map(item => item.id);
  const calls = [];
  let open = initiallyOpen;
  const services = /^\/(en|ru|es)\/services$/.test(path);
  const doc = { visibilityState: 'visible', baseURI: 'http://127.0.0.1:3123/' };
  const images = ids.map((id, index) => {
    const source = remote.has(id) ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '/images/holistic-house/testimonial-posters/' + id + '.webp';
    const el = {
      isConnected: true, ownerDocument: doc, src: fault === 'wrong source' && index === 4 ? '/wrong.webp' : source,
      getAttribute(name) { return name === 'src' ? this.src : null; },
      get complete() { return (!services || open || index < 4) && !(fault === 'not loaded' && index === 4); },
      get naturalWidth() { return this.complete && !(fault === 'zero width' && index === 4) ? 480 : 0; },
      get naturalHeight() { return this.complete && !(fault === 'zero height' && index === 4) ? 360 : 0; },
      get currentSrc() { return this.complete ? 'http://127.0.0.1:3123' + this.src : ''; },
      async decode() {
        calls.push(['decode', id]);
        if (fault === 'decode rejects' && index === 4) throw new Error('strict decode failed');
        if (fault === 'changed during decode' && index === 4) this.src = '/replacement.webp';
      },
    };
    return {
      el,
      async evaluate(fn, arg) {
        const previous = globalThis.document;
        globalThis.document = doc;
        try { return await fn(el, arg); } finally { globalThis.document = previous; }
      },
      async scrollIntoViewIfNeeded() { calls.push(['scroll', id]); },
      async dispose() { calls.push(['dispose', id]); },
    };
  });
  const nodes = values => values.map(id => ({ getAttribute: name => { assert.equal(name, 'data-testimonial-video-id'); return id; } }));
  const summary = {
    kind: 'summary',
    count: fault === 'missing summary' ? 0 : fault === 'duplicate summary' ? 2 : 1,
    visible: fault !== 'hidden summary',
    async click() {
      calls.push(['click', open ? 'close' : 'open']);
      if (fault === 'does not open') return;
      if (fault === 'does not close' && open) return;
      open = !open;
      if (fault === 'changed on open' && open) images[4].el.src = '/replacement.webp';
      if (fault === 'detached on open' && open) images[4].el.isConnected = false;
    },
  };
  const disclosure = {
    kind: 'disclosure',
    count: fault === 'missing disclosure' ? 0 : fault === 'duplicate disclosure' ? 2 : 1,
    getAttribute: async name => { assert.equal(name, 'open'); return open ? '' : null; },
    locator(selector) {
      if (selector === ':scope > summary') return summary;
      assert.equal(selector, '[data-testimonial-video-id]');
      return { evaluateAll: async fn => fn(nodes(fault === 'wrong extra set' ? ids.slice(3) : ids.slice(4))) };
    },
  };
  const section = {
    kind: 'section',
    count: fault === 'missing section' ? 0 : fault === 'duplicate section' ? 2 : 1,
    attrs: { lang: locale },
    locator(selector) {
      if (selector === 'details[data-more-services-testimonials]') return disclosure;
      if (selector === '[data-testimonial-video-id]') return {
        kind: 'cards',
        count: fault === 'missing card' ? ids.length - 1 : ids.length,
        evaluateAll: async fn => fn(nodes(fault === 'wrong card order' ? [...ids].reverse() : ids)),
      };
      const id = selector.match(/^\[data-testimonial-video-id="([\w-]{11})"\] \.site-video-poster$/)?.[1];
      assert.ok(id, 'No unreviewed testimonial selector: ' + selector);
      const image = images[ids.indexOf(id)];
      return { kind: 'card poster', count: fault === 'missing card poster' && id === ids[4] ? 0 : fault === 'duplicate card poster' && id === ids[4] ? 2 : 1, getAttribute: async name => image.el.getAttribute(name) };
    },
  };
  const posters = {
    kind: 'all posters',
    get count() { return images.length - Number(fault === 'removed on open' && open); },
    async elementHandles() { calls.push(['snapshot', open]); return images; },
  };
  const page = { locator(selector) {
    if (selector === '.site-video-poster') return posters;
    assert.equal(selector, '[data-personal-testimonials="services"]');
    calls.push(['services-scope']);
    return section;
  } };
  const expect = target => ({
    async toHaveCount(count) { assert.equal(target.count, count, 'Expected ' + target.kind + ' count'); },
    async toBeVisible() { assert.equal(target.visible, true, 'Expected ' + target.kind + ' visible'); },
    async toHaveAttribute(name, value) { assert.equal(target.getAttribute ? await target.getAttribute(name) : target.attrs[name], value, 'Expected ' + target.kind + ' ' + name); },
    not: { async toHaveAttribute(name, value) { assert.notEqual(await target.getAttribute(name), value, 'Expected ' + target.kind + ' absence of ' + name); } },
  });
  expect.poll = callback => ({ async toBe(value) { assert.equal(await callback(), value, 'strict load readiness'); } });
  let error;
  try { await verifyReleasePosters(page, { path, locale }, expect); } catch (caught) { error = caught; }
  if (fault) {
    assert.ok(error, 'Fault must be rejected: ' + fault);
    assert.match(error.message, faultDiagnostics[fault], 'Reject the injected fault, not an unrelated earlier failure: ' + fault);
  } else if (error) throw error;
  if (fault !== 'does not close') assert.equal(open, initiallyOpen, 'Restore initial disclosure state even on failure');
  for (const id of ids) assert.ok(calls.some(([kind, value]) => kind === 'dispose' && value === id), 'Every snapshot handle is released');
  if (!fault) {
    assert.deepEqual(calls.filter(([kind]) => kind === 'decode').map(([, id]) => id), ids, 'Strict decode runs for all original images');
    assert.equal(calls[0][0], 'snapshot');
    assert.equal(calls[0][1], initiallyOpen, 'Capture originals before disclosure manipulation');
    assert.deepEqual(calls.filter(([kind]) => kind === 'click'), services && !initiallyOpen ? [['click', 'open'], ['click', 'close']] : []);
    if (!services) assert.equal(calls.filter(([kind]) => kind === 'services-scope').length, 0);
  }
}

for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' reveals all six source-bound testimonial posters then restores closed state', () => scenario({ locale }));
  test(locale + ' preserves an already-open disclosure', () => scenario({ locale, initiallyOpen: true }));
}
test('non-Services pages retain strict poster verification without disclosure interaction', () => scenario({ path: '/en/about' }));
const faultDiagnostics = {
  'missing section': /Expected section count/,
  'duplicate section': /Expected section count/,
  'missing card': /Expected cards count/,
  'wrong card order': /Preserve the complete ordered Services testimonial set/,
  'missing disclosure': /Expected disclosure count/,
  'duplicate disclosure': /Expected disclosure count/,
  'wrong extra set': /Only the exact additional testimonials belong to this disclosure/,
  'missing summary': /Expected summary count/,
  'duplicate summary': /Expected summary count/,
  'hidden summary': /Expected summary visible/,
  'missing card poster': /Expected card poster count/,
  'duplicate card poster': /Expected card poster count/,
  'wrong source': /Expected card poster src/,
  'does not open': /Expected disclosure open/,
  'does not close': /Expected disclosure absence of open/,
  'changed on open': /Opening the disclosure must not replace an original poster source/,
  'detached on open': /Poster document\/element is no longer active/,
  'removed on open': /Expected all posters count/,
  'not loaded': /strict load readiness/,
  'zero width': /strict load readiness/,
  'zero height': /strict load readiness/,
  'decode rejects': /strict decode failed/,
  'changed during decode': /Poster identity\/readiness changed during decode/,
};
assert.equal(Object.keys(faultDiagnostics).length, 23, 'Retain every original fault case');
for (const fault of Object.keys(faultDiagnostics)) {
  test('strict Services poster contract rejects ' + fault, async () => {
    await scenario(); // Prove the same harness passes before this isolated mutation.
    await scenario({ fault });
  });
}
test('source still renders the exact additional set in a closed lazy disclosure', () => {
  assert.match(component, /<details className=\{styles\.moreVideos\} data-more-services-testimonials>/);
  assert.match(component, /renderVideoCards\(testimonialVideos\[locale\]\.slice\(4\)\)/);
  const player = readFileSync(new URL('../components/site-video-player.tsx', import.meta.url), 'utf8');
  assert.match(player, /className="site-video-poster site-video-fallback-poster"[^\n]*loading="lazy"/);
});
