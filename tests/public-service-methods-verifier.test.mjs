import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as videoModel from '../lib/site-videos/model.js';
import { assertPublicServiceMethods } from '../scripts/helpers/public-service-methods-verifier.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const styles = new Proxy({}, { get: (_, name) => String(name) });
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const modules = {
  react: { useState: initial => [initial, () => {}], useEffect: () => {}, useId: () => 'fixture-id', useRef: () => ({ current: null }) },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  'next/link': { default: props => jsx('a', props) },
  'next/image': { default: props => jsx('img', props) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '@/lib/site-videos/model': videoModel,
  '@/components/static-portrait': { StaticPortrait: props => jsx('img', props) },
  '@/components/services-about-entry': { ServicesAboutEntry: () => null },
  '@/components/home-testimonial-more': { HomeTestimonialMore: () => null },
};
function compile(path) {
  const exports = {};
  const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  runInNewContext(compiled, { exports, URLSearchParams, require: name => {
    if (name.endsWith('.css')) return { default: styles };
    assert.ok(Object.hasOwn(modules, name), 'Explicit component dependency: ' + name);
    return modules[name];
  } });
  return exports;
}
const player = compile('components/site-video-player.tsx');
modules['@/components/site-video-player'] = player;
// Only managed video retrieval is fixture data. The real player, outer methods,
// showcase and testimonials components render their actual default DOM.
const video = { youtubeId: 'OkLEN8Zb-sY', language: 'en', title: 'Synthetic managed method video' };
modules['@/components/page-video'] = { PageVideo: ({ slot, locale }) => jsx('section', {
  'data-video-slot': slot, 'data-video-locale': locale, children: jsx(player.SiteVideoPlayer, { video, locale }),
}) };
modules['@/data/service-video-library'] = { getServiceVideoMedia: () => ({ video, general: false }) };
modules['@/components/service-video-showcase'] = compile('components/service-video-showcase.tsx');
const { ServicesMethodVideos } = compile('components/services-studio-extras.tsx');
const { PersonalTestimonials } = compile('components/personal-testimonials.tsx');
function mount(locale) {
  const roots = [ServicesMethodVideos({ locale }), PersonalTestimonials({ locale, variant: 'services' })];
  const nodes = [];
  function visit(node, parent = null) {
    if (Array.isArray(node)) { node.forEach(child => visit(child, parent)); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'fragment') { visit(node.props.children, parent); return; }
    node.parent = parent; nodes.push(node); visit(node.props.children, node);
  }
  visit(roots);
  const descendants = (node, ancestor) => { for (let p = node.parent; p; p = p.parent) if (p === ancestor) return true; return false; };
  const attribute = (node, name) => name === 'class' ? node.props.className : node.props[name];
  const matches = (node, selector) => {
    const tag = selector.match(/^[a-z]+/)?.[0];
    if (tag && node.type !== tag) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && node.props.id !== id) return false;
    const cls = selector.match(/\.([\w-]+)/)?.[1];
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
  return { page, expect, nodes };
}

test('actual EN/RU/ES component trees keep two method posters open, archive separate/collapsed and embeds lazy', async () => {
  // Execute the real components without a browser or network. Managed video data
  // and React hooks use explicit initial-state fixtures, not full hydration.
  for (const locale of ['en', 'ru', 'es']) {
    const mounted = mount(locale);
    await assertPublicServiceMethods(mounted.page, mounted.expect, locale);
    assert.equal(mounted.nodes.filter(node => node.type === 'iframe').length, 0);
  }
});

test('method verifier rejects disclosure, poster, autoplay and testimonial regressions', async () => {
  const mutations = [
    ['collapsed method posters', m => { m.page.locator('#method-videos').selected[0].props.open = false; }],
    ['open nested archive', m => { m.page.locator('#method-videos').locator(':scope > div > details').selected[0].props.open = true; }],
    ['missing method poster', m => { m.page.locator('[data-video-slot="method-hypnotherapy"]').locator('img').selected[0].props.className = ''; }],
    ['hidden method play control', m => { m.page.locator('[data-video-slot="method-hypnotherapy"]').locator('.site-video-play').selected[0].props.hidden = true; }],
    ['eager method embed', m => { m.nodes.push({ type: 'iframe', props: {}, parent: m.page.locator('#method-videos').selected[0] }); }],
    ['expanded extra testimonials', m => { m.page.locator('[data-more-services-testimonials]').selected[0].props.open = true; }],
    ['eager testimonial embed', m => { m.nodes.push({ type: 'iframe', props: {}, parent: m.page.locator('[data-personal-testimonials]').selected[0] }); }],
  ];
  for (const [label, mutate] of mutations) {
    const mounted = mount('ru'); mutate(mounted);
    await assert.rejects(assertPublicServiceMethods(mounted.page, mounted.expect, 'ru'), label);
  }
});

test('public verifier checks all method locales and never clicks Play or re-collapses the product', () => {
  const verifier = read('scripts/verify-public-services-production.mjs');
  assert.match(verifier, /assertPublicServiceMethods\(page, expect, locale\)/);
  assert.match(verifier, /assertPublicServiceMethods\(page, expect, "es"\)/);
  assert.doesNotMatch(verifier, /Extended method videos stay collapsed by default/);
  const helper = read('scripts/helpers/public-service-methods-verifier.mjs');
  assert.doesNotMatch(helper, /\.click\(|\.evaluate\(|setAttribute|removeAttribute/);
});
