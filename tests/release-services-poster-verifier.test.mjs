import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyReleasePosters } from '../scripts/helpers/release-services-poster-verifier.mjs';

const component = readFileSync(new URL('../components/personal-testimonials.tsx', import.meta.url), 'utf8');
const records = component.match(/const testimonialVideos = (\{[\s\S]*?\}) as const;/)?.[1];
assert.ok(records, 'Use the actual source testimonial catalogue');
const catalog = new Function('return ' + records)();
const remote = new Set(['m9RfDgK76PU', '5oj0BIbLT4w']);

async function scenario({ locale = 'en', path = '/' + locale + '/services', origin = 'http://127.0.0.1:3123', absolute = false, initiallyOpen = false, fault } = {}) {
  const ids = catalog[locale].map(item => item.id);
  const calls = [];
  let open = initiallyOpen;
  const services = /^\/(en|ru|es)\/services$/.test(path);
  const doc = { visibilityState: 'visible', baseURI: origin + '/' };
  const images = ids.map((id, index) => {
    const relative = '/images/holistic-house/testimonial-posters/' + id + '.webp';
    let source = remote.has(id) ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : (absolute ? origin : '') + relative;
    if (sourceFaults[fault] && index === (sourceFaults[fault].remote ? 0 : 4)) source = sourceFaults[fault].change(source, relative, origin);
    const el = {
      isConnected: true, ownerDocument: doc, src: fault === 'wrong source' && index === 4 ? '/wrong.webp' : source,
      srcset: null,
      getAttribute(name) { return name === 'src' ? this.src : name === 'srcset' ? this.srcset : null; },
      get complete() { return (!services || open || index < 4) && !(fault === 'not loaded' && index === 4); },
      get naturalWidth() { return this.complete && !(fault === 'zero width' && index === 4) ? 480 : 0; },
      get naturalHeight() { return this.complete && !(fault === 'zero height' && index === 4) ? 360 : 0; },
      get currentSrc() { return this.complete ? new URL(this.src, doc.baseURI).href : ''; },
      async decode() {
        calls.push(['decode', id]);
        if (fault === 'decode rejects' && index === 4) throw new Error('strict decode failed');
        if (fault === 'changed during decode' && index === 4) this.src = '/replacement.webp';
        if (fault === 'equivalent spelling changed during decode' && index === 4) this.src = absolute ? relative : origin + relative;
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
      if (fault === 'equivalent spelling changed on open' && open) images[4].el.src = absolute ? '/images/holistic-house/testimonial-posters/' + ids[4] + '.webp' : origin + images[4].el.src;
      if (fault === 'srcset changed on open' && open) images[4].el.srcset = '/replacement.webp 2x';
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
  const page = { url: () => pageFaults[fault] ? pageFaults[fault](origin, path) : origin + path, locator(selector) {
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
  try { await verifyReleasePosters(page, { path: fault === 'route locale mismatch' ? '/ru/services' : path, locale, origin: fault === 'missing origin' ? undefined : fault === 'unapproved origin' ? 'https://example.invalid' : origin }, expect); } catch (caught) { error = caught; }
  if (fault) {
    assert.ok(error, 'Fault must be rejected: ' + fault);
    assert.match(error.message, faultDiagnostics[fault] || /Preserve exact Services poster asset and audited origin/, 'Reject the injected fault, not an unrelated earlier failure: ' + fault);
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

for (const locale of ['en', 'ru', 'es']) for (const origin of ['http://127.0.0.1:3123', 'https://holistichouse.vercel.app']) for (const absolute of [false, true]) {
  const label = locale + ' ' + origin + ' ' + (absolute ? 'absolute' : 'relative');
  test(label + ' reveals all six source-bound testimonial posters then restores closed state', () => scenario({ locale, origin, absolute }));
  test(label + ' preserves an already-open disclosure', () => scenario({ locale, origin, absolute, initiallyOpen: true }));
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
  'wrong source': /Preserve exact Services poster asset and audited origin/,
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
const sourceFaults = {
  'foreign host': { change: (_s, p) => 'https://example.invalid' + p },
  'other approved origin': { change: (_s, p, o) => (o.startsWith('http:') ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3123') + p },
  'wrong port': { change: (_s, p) => 'http://127.0.0.1:3000' + p },
  'query': { change: s => s + '?v=synthetic' },
  'fragment': { change: s => s + '#synthetic' },
  'userinfo': { change: (_s, p) => 'http://synthetic@127.0.0.1:3123' + p },
  'encoded path': { change: (_s, p) => p.replace('/images/', '/%69mages/') },
  'dot segment': { change: (_s, p) => '/unused/..' + p },
  'protocol relative': { change: (_s, p, o) => o.replace(/^https?:/, '') + p },
  'backslash spelling': { change: (_s, p) => p.replace('/images/', '/images\\') },
  'wrong filename': { change: (_s, p) => p.replace('.webp', '-wrong.webp') },
  'remote protocol relative': { remote: true, change: s => s.replace('https:', '') },
  'remote HTTP': { remote: true, change: s => s.replace('https:', 'http:') },
  'remote query': { remote: true, change: s => s + '?v=synthetic' },
  'remote fragment': { remote: true, change: s => s + '#synthetic' },
  'remote audited-origin proxy': { remote: true, change: (s, _p, o) => o + new URL(s).pathname },
};
const pageFaults = {
  'page query': (o, p) => o + p + '?v=synthetic',
  'page fragment': (o, p) => o + p + '#synthetic',
  'page foreign origin': (_o, p) => 'https://example.invalid' + p,
  'page wrong locale': o => o + '/ru/services',
};
Object.assign(faultDiagnostics, {
  'missing origin': /Services posters require the exact audited origin/,
  'unapproved origin': /Services posters require the exact audited origin/,
  'route locale mismatch': /Services locale must match its audited route/,
  'equivalent spelling changed on open': /Opening the disclosure must not replace an original poster source/,
  'srcset changed on open': /Opening the disclosure must not replace an original poster source/,
  'equivalent spelling changed during decode': /Poster identity\/readiness changed during decode/,
  ...Object.fromEntries(Object.keys(pageFaults).map(name => [name, /Services posters require the exact audited page URL/])),
});
for (const fault of [...Object.keys(faultDiagnostics), ...Object.keys(sourceFaults)]) {
  test('strict Services poster contract rejects ' + fault, async () => {
    const locale = sourceFaults[fault]?.remote ? 'ru' : 'en';
    // Both exact spellings pass first. Each mutation must then fail for its
    // own diagnostic, without normalizing raw identity during open/decode.
    for (const absolute of [false, true]) await scenario({ locale, absolute });
    for (const absolute of [false, true]) await scenario({ locale, absolute, fault });
  });
}
test('caller supplies configured audit origin rather than inferring it from poster URLs', () => {
  const caller = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
  assert.match(caller, /verifyReleasePosters\(page, \{ path, locale, origin \}, expect\)/);
});
test('source still renders the exact additional set in a closed lazy disclosure', () => {
  assert.match(component, /<details className=\{styles\.moreVideos\} data-more-services-testimonials>/);
  assert.match(component, /renderVideoCards\(testimonialVideos\[locale\]\.slice\(4\)\)/);
  const player = readFileSync(new URL('../components/site-video-player.tsx', import.meta.url), 'utf8');
  assert.match(player, /className="site-video-poster site-video-fallback-poster"[^\n]*loading="lazy"/);
});
