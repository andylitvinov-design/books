import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as videoModel from '../lib/site-videos/model.js';
import * as defaults from '../lib/site-videos/defaults.js';
import { createSiteVideoStore, createMemorySiteVideoStore } from '../lib/site-videos/store.js';
import { assertPublicServiceMethods, isolatedServiceVideoFixture } from '../scripts/helpers/public-service-methods-verifier.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const styles = new Proxy({}, { get: (_, name) => String(name) });
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const builtinRecords = () => defaults.builtInSiteVideoRecords();
// VM object literals have another realm's prototype. Normalize this test-only
// boundary before calling the actual plain-object validating model functions.
const modelBridge = { ...videoModel,
  siteVideoWatchUrl: value => videoModel.siteVideoWatchUrl(structuredClone(value)),
  toPublishedSiteVideo: value => videoModel.toPublishedSiteVideo(structuredClone(value)),
};
// Expected data is independent of rendered DOM and of the public reader under test.
const published = records => Object.fromEntries(records.flatMap(record => {
  const video = videoModel.toPublishedSiteVideo(record);
  return video ? [[record.key, video]] : [];
}));
function sourceRuntime({ store, cacheFailure = false } = {}) {
  const calls = { noStore: 0, list: 0, warnings: 0 };
  const once = fn => { let result; return () => result ??= fn(); };
  const modules = {
    'server-only': {},
    react: { cache: once, useState: initial => [initial, () => {}], useEffect: () => {}, useId: () => 'fixture-id', useRef: () => ({ current: null }) },
    'next/cache': { unstable_noStore: () => { calls.noStore++; }, unstable_cache: fn => once(cacheFailure ? async () => { throw new Error('Synthetic cache failure'); } : fn) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: props => jsx('a', props) },
    'next/image': { default: props => jsx('img', props) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    './model.js': modelBridge,
    './defaults.js': defaults,
    './store.js': { getSiteVideoStore: () => store && { list: async options => {
      calls.list++; assert.equal(options.timeoutMs, 1200); return store.list(options);
    } } },
    '@/lib/site-videos/model': modelBridge,
    '@/components/static-portrait': { StaticPortrait: props => jsx('img', props) },
    '@/components/services-about-entry': { ServicesAboutEntry: () => null },
    '@/components/home-testimonial-more': { HomeTestimonialMore: () => null },
  };
  function compile(path) {
    const exports = {};
    const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    runInNewContext(compiled, { exports, URLSearchParams, console: { warn: () => { calls.warnings++; }, error: () => {} }, require: name => {
      if (name.endsWith('.css')) return { default: styles };
      assert.ok(Object.hasOwn(modules, name), 'Explicit component dependency: ' + name);
      return modules[name];
    } });
    return exports;
  }
  // Execute the actual source registry, public filtering, PageVideo, approved
  // service library, player, Services and testimonials. Only storage/React are
  // deterministic synthetic dependencies; no fabricated per-slot video markup.
  const publicVideos = compile('lib/site-videos/public.ts');
  modules['@/lib/site-videos/public'] = publicVideos;
  modules['@/components/site-video-player'] = compile('components/site-video-player.tsx');
  modules['@/components/page-video'] = compile('components/page-video.tsx');
  const library = compile('data/service-video-library.ts');
  modules['@/data/service-video-library'] = library;
  modules['@/components/service-video-showcase'] = compile('components/service-video-showcase.tsx');
  return { ...compile('components/services-studio-extras.tsx'), ...compile('components/personal-testimonials.tsx'),
    ...publicVideos, library, calls };
}
async function mount(locale, options) {
  const runtime = sourceRuntime(options);
  const roots = [runtime.ServicesIntroMedia({ locale }), runtime.ServicesMethodVideos({ locale }),
    runtime.PersonalTestimonials({ locale, variant: 'services' })];
  const nodes = [];
  async function visit(pending, parent = null) {
    const node = await pending;
    if (Array.isArray(node)) { for (const child of node) await visit(child, parent); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'fragment') { await visit(node.props.children, parent); return; }
    node.parent = parent; nodes.push(node); await visit(node.props.children, node);
  }
  await visit(roots);
  const descendants = (node, ancestor) => { for (let p = node.parent; p; p = p.parent) if (p === ancestor) return true; return false; };
  const attribute = (node, name) => name === 'class' ? node.props.className : node.props[name];
  const matches = (node, selector) => {
    const plain = selector.replace(/\[[^\]]*\]/g, '');
    const tag = plain.match(/^[a-z]+/)?.[0];
    if (tag && node.type !== tag) return false;
    const id = plain.match(/#([\w-]+)/)?.[1];
    if (id && node.props.id !== id) return false;
    const cls = plain.match(/\.([\w-]+)/)?.[1];
    if (cls && !(node.props.className || '').split(' ').includes(cls)) return false;
    for (const [, key, value] of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
      if (!Object.hasOwn(node.props, key) || (value !== undefined && node.props[key] !== value)) return false;
    }
    return true;
  };
  const visible = node => {
    if (node.props.hidden || node.props.style?.display === 'none') return false;
    for (let p = node.parent, child = node; p; child = p, p = p.parent) {
      if (p.props.hidden || (p.type === 'details' && !p.props.open && child.type !== 'summary')) return false;
    }
    return true;
  };
  function locator(selected) {
    return { selected, locator(selector) {
      if (selector === ':scope > div > details') return locator(nodes.filter(node => node.type === 'details'
        && node.parent?.type === 'div' && selected.includes(node.parent.parent)));
      return locator(nodes.filter(node => selected.some(parent => descendants(node, parent)) && matches(node, selector)));
    } };
  }
  const page = { locator: selector => locator(nodes.filter(node => matches(node, selector))) };
  const expect = target => ({
    toHaveCount: async count => assert.equal(target.selected.length, count),
    toBeVisible: async () => { assert.equal(target.selected.length, 1); assert.ok(visible(target.selected[0])); },
    toHaveAttribute: async (name, value) => { assert.equal(target.selected.length, 1); const actual = attribute(target.selected[0], name); assert.equal(actual === true ? '' : actual, value); },
    not: { toHaveAttribute: async (name, value) => { assert.equal(target.selected.length, 1); const actual = attribute(target.selected[0], name); assert.notEqual(actual === true ? '' : actual, value); } },
  });
  return { page, expect, nodes, runtime };
}
const check = (mounted, locale, expected) => assertPublicServiceMethods(mounted.page, mounted.expect, locale, expected);
const methodRecord = (slot, intent = 'publish') => videoModel.prepareVideoChange(null, {
  slot, locale: 'ru', intent, youtubeUrl: slot === 'method-hypnotherapy' ? 'https://www.youtube.com/watch?v=abcdefghijk' : 'https://www.youtube.com/watch?v=lmnopqrstuv',
  title: 'SYNTHETIC RU ' + slot, reviewed: true, transcript: 'SYNTHETIC public explanation',
}, '2026-10-20T00:00:00Z');

test('actual builtins render EN/ES two specific methods and RU one general intro, without invented RU slots', async () => {
  const expected = published(builtinRecords());
  for (const locale of ['en', 'ru', 'es']) {
    const mounted = await mount(locale);
    await check(mounted, locale, expected);
    assert.equal(mounted.nodes.filter(node => node.type === 'iframe').length, 0);
    assert.equal(mounted.runtime.calls.list, 0);
    assert.equal(mounted.runtime.calls.noStore, locale === 'es' ? 0 : 1);
    if (locale === 'ru') {
      for (const slot of ['method-hypnotherapy', 'method-constellations']) {
        assert.equal(expected[videoModel.videoKey(slot, locale)], undefined);
        assert.equal(mounted.page.locator('[data-video-slot="' + slot + '"]').selected.length, 0);
      }
      const general = mounted.runtime.library.getServiceVideoMedia('hypnotherapy', 'ru');
      assert.equal(general.general, true);
      assert.equal(general.video.youtubeId, 'Cz6SxXJNZbw');
      assert.equal(mounted.runtime.library.getServiceVideoMedia('constellations', 'ru').video.youtubeId, general.video.youtubeId);
      const intro = mounted.page.locator('[data-video-slot="services-intro"]');
      assert.equal(intro.selected[0].props['aria-label'], 'Как я выбираю подходящий метод');
      assert.equal(intro.locator('a[href="https://www.youtube.com/watch?v=Cz6SxXJNZbw"]').selected.length, 1);
    }
  }
});

test('actual published RU-specific records stay exact and mandatory, including a one-method partial registry', async () => {
  for (const slots of [['method-hypnotherapy'], ['method-constellations'], ['method-hypnotherapy', 'method-constellations']]) {
    const records = [...builtinRecords(), ...slots.map(slot => methodRecord(slot))];
    const expected = published(records);
    const mounted = await mount('ru', { store: createMemorySiteVideoStore(records) });
    await check(mounted, 'ru', expected);
    assert.equal(mounted.runtime.calls.list, 1, 'One shared public registry read for intro/methods/archive');
    for (const slot of slots) {
      const block = mounted.page.locator('[data-video-slot="' + slot + '"]').selected[0];
      assert.equal(block.props['aria-label'], 'SYNTHETIC RU ' + slot);
      block.props['data-video-slot'] = 'missing-' + slot;
      await assert.rejects(check(mounted, 'ru', expected), 'Published exact method must not become optional');
      block.props['data-video-slot'] = slot;
    }
  }
});

test('real publication filter keeps absent, hidden and draft-only RU methods absent without duplicating overview', async () => {
  for (const state of ['absent', 'hide', 'draft']) {
    const records = [...builtinRecords(), ...(state === 'absent' ? [] : [methodRecord('method-hypnotherapy', state), methodRecord('method-constellations', state)])];
    const mounted = await mount('ru', { store: createMemorySiteVideoStore(records) });
    await check(mounted, 'ru', published(records));
    assert.equal(mounted.page.locator('#method-videos').locator('.site-video-player').selected.length, 0);
    assert.equal(mounted.page.locator('[data-video-slot="services-intro"]').selected.length, 1);
    const map = await mounted.runtime.getPublishedSiteVideos();
    assert.equal(JSON.stringify(map).includes('SYNTHETIC'), false);
    await assert.rejects(check(mounted, 'ru', published([...builtinRecords(), methodRecord('method-hypnotherapy')])),
      'Absent, hidden or draft state cannot satisfy a fixture that independently requires a publication');
  }
});

test('a newer draft cannot replace the exact current published RU snapshot', async () => {
  const previous = methodRecord('method-hypnotherapy');
  const edited = videoModel.prepareVideoChange(previous, { slot: previous.slot, locale: 'ru', intent: 'draft',
    youtubeUrl: 'https://www.youtube.com/watch?v=unpublished', title: 'SYNTHETIC DRAFT MUST NOT LEAK',
  }, '2026-10-20T00:01:00Z');
  const records = [...builtinRecords(), edited];
  const mounted = await mount('ru', { store: createMemorySiteVideoStore(records) });
  await check(mounted, 'ru', published(records));
  const map = await mounted.runtime.getPublishedSiteVideos();
  assert.equal(map[previous.key].title, previous.published.title);
  assert.equal(map[previous.key].youtubeId, previous.published.youtubeId);
  assert.equal(JSON.stringify(map).includes('DRAFT MUST NOT LEAK'), false);
});

test('actual store suppresses malformed persisted overrides; missing/hidden/draft/error intro is never a pass', async () => {
  const key = videoModel.videoKey('services-intro', 'ru');
  const initial = builtinRecords();
  for (const state of ['absent', 'hide', 'draft', 'malformed', 'store-error', 'cache-error']) {
    let store, cacheFailure = false;
    if (state === 'malformed') {
      store = createSiteVideoStore({ environment: { PRESCRIPTIONS_KV_REST_API_URL: 'https://fixture.invalid', PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic' },
        initialRecords: initial, fetchFn: async (_url, request) => {
          assert.deepEqual(JSON.parse(request.body), ['HGETALL', 'holistic-house:site-videos:v1']);
          return { ok: true, json: async () => ({ result: [key, '{"not":"a valid publication"}'] }) };
        } });
    } else if (state.endsWith('error')) {
      store = { list: async () => { throw new Error('Synthetic storage failure'); } };
      cacheFailure = state === 'cache-error';
    } else {
      const records = initial.filter(record => record.key !== key);
      if (state !== 'absent') records.push(videoModel.prepareVideoChange(null, { slot: 'services-intro', locale: 'ru', intent: state,
        youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk', title: 'SYNTHETIC unpublished intro' }, '2026-10-20T00:00:00Z'));
      store = createMemorySiteVideoStore(records);
    }
    const mounted = await mount('ru', { store, cacheFailure });
    assert.equal(mounted.page.locator('[data-video-slot="services-intro"]').selected.length, 0, state);
    await assert.rejects(check(mounted, 'ru', published(initial)), state + ' must fail the required intro');
    const actual = await mounted.runtime.getPublishedSiteVideos();
    assert.equal(actual[key], undefined, state + ' must not resurrect a builtin');
    await assert.rejects(check(mounted, 'ru', actual), 'Even a missing expected intro is not permission to pass');
  }
});

test('verifier rejects missing/wrong/duplicate intro, published method, disclosure, poster and lazy-player regressions', async () => {
  const expected = published(builtinRecords());
  const mutations = [
    ['missing intro', 'ru', m => { m.page.locator('[data-video-slot="services-intro"]').selected[0].props['data-video-slot'] = 'wrong'; }],
    ['wrong intro locale', 'ru', m => { m.page.locator('[data-video-slot="services-intro"]').selected[0].props['data-video-locale'] = 'en'; }],
    ['wrong intro source', 'ru', m => { m.page.locator('a[href="https://app.heygen.com/share/79c2845577865979cd95ac40a08fc01a"]').selected[0].props.href = 'https://example.invalid'; }],
    ['unlabelled intro', 'ru', m => { m.page.locator('[data-video-slot="services-intro"]').selected[0].props['aria-label'] = ''; }],
    ['duplicate intro', 'ru', m => { m.nodes.push({ type: 'section', props: { 'data-video-slot': 'services-intro' } }); }],
    ['duplicated general showcase', 'ru', m => { m.nodes.push({ type: 'section', props: { 'data-service-video': 'hypnotherapy', 'data-video-kind': 'general' }, parent: m.page.locator('#method-videos').selected[0] }); }],
    ['unexpected RU method', 'ru', m => { m.nodes.push({ type: 'section', props: { 'data-video-slot': 'method-hypnotherapy' }, parent: m.page.locator('#method-videos').selected[0] }); }],
    ['collapsed method posters', 'en', m => { m.page.locator('#method-videos').selected[0].props.open = false; }],
    ['open nested archive', 'ru', m => { m.page.locator('#method-videos').locator(':scope > div > details').selected[0].props.open = true; }],
    ['missing EN method poster', 'en', m => { m.page.locator('[data-video-slot="method-hypnotherapy"]').locator('img').selected[0].props.className = ''; }],
    ['hidden EN play control', 'en', m => { m.page.locator('[data-video-slot="method-hypnotherapy"]').locator('.site-video-play').selected[0].props.hidden = true; }],
    ['missing ES method poster', 'es', m => { m.page.locator('[data-service-video="hypnotherapy"]').locator('img').selected[0].props.className = ''; }],
    ['wrong ES method source', 'es', m => { m.page.locator('[data-service-video="hypnotherapy"]').locator('a.site-video-watch-link').selected[0].props.href = 'https://example.invalid'; }],
    ['mislabelled ES overview', 'es', m => { m.page.locator('[data-service-video="hypnotherapy"]').selected[0].props['data-video-kind'] = 'general'; }],
    ['eager method embed', 'ru', m => { m.nodes.push({ type: 'iframe', props: {}, parent: m.page.locator('#method-videos').selected[0] }); }],
    ['eager intro embed', 'ru', m => { m.nodes.push({ type: 'iframe', props: {}, parent: m.page.locator('#meet-andrey').selected[0] }); }],
    ['expanded testimonials', 'ru', m => { m.page.locator('[data-more-services-testimonials]').selected[0].props.open = true; }],
    ['eager testimonial embed', 'ru', m => { m.nodes.push({ type: 'iframe', props: {}, parent: m.page.locator('[data-personal-testimonials]').selected[0] }); }],
  ];
  for (const [label, locale, mutate] of mutations) {
    const mounted = await mount(locale); mutate(mounted);
    await assert.rejects(check(mounted, locale, expected), label);
  }
});

test('independent builtin fixture rejects production, unknown provenance and configured storage before browser loading', async () => {
  const base = { origin: 'http://127.0.0.1:3100', environment: { CI: 'true', HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' } };
  assert.deepEqual(isolatedServiceVideoFixture(base), published(builtinRecords()));
  for (const origin of ['https://holistichouse.vercel.app', 'http://localhost.evil:3100', 'http://127.0.0.1:3100/path', 'http://127.0.0.2:3100']) {
    assert.throws(() => isolatedServiceVideoFixture({ ...base, origin }));
  }
  for (const change of [{ CI: '' }, { CI: 'false' }, { HH_PUBLIC_QA_ENQUIRY_FIXTURE: '' },
    { PRESCRIPTIONS_KV_REST_API_URL: 'https://fixture.invalid' }, { PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic' }]) {
    assert.throws(() => isolatedServiceVideoFixture({ ...base, environment: { ...base.environment, ...change } }));
  }
  const mounted = await mount('ru');
  await assert.rejects(check(mounted, 'ru', undefined), /Explicit published/);
  const verifier = read('scripts/verify-public-services-production.mjs');
  const binding = 'const expectedServiceVideos = isolatedServiceVideoFixture({ origin, environment: process.env });';
  assert.ok(verifier.includes(binding));
  assert.ok(verifier.indexOf(binding) < verifier.indexOf('const require ='));
  assert.match(verifier, /assertPublicServiceMethods\(page, expect, locale, expectedServiceVideos\)/);
  assert.match(verifier, /assertPublicServiceMethods\(page, expect, "es", expectedServiceVideos\)/);
  const helper = read('scripts/helpers/public-service-methods-verifier.mjs');
  assert.doesNotMatch(helper, /\.click\(|\.evaluate\(|setAttribute|removeAttribute/);
  assert.doesNotMatch(verifier, /Extended method videos stay collapsed by default/);
});
