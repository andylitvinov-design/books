import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as redirects from '../lib/canonical-redirect.js';
import { assertUnsupportedSpanishPrivateLocale } from '../scripts/helpers/es-private-denial-verifier.mjs';

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require('next/server');
const { notFound } = require('next/dist/client/components/not-found.js');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const target = 'https://holistichouse.vercel.app/es/client/not-a-real-client-id';
const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props };
const runtime = { 'react/jsx-runtime': { jsx, jsxs: jsx } };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
const text = tree => tree == null ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree.props.children);
function load(path, modules) {
  const exports = {};
  const compiled = ts.transpileModule(read(path), { fileName: path.replace(/\.js$/, '.jsx'), compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  runInNewContext(compiled, { exports, Headers, crypto: globalThis.crypto, process: { env: { NODE_ENV: 'test' } }, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected dependency: ' + name);
    return modules[name];
  } });
  return exports;
}
const { middleware } = load('middleware.ts', { 'next/server': { NextResponse }, './lib/canonical-redirect': redirects });

function denialHeaders() {
  // A contrary cookie and spoofed request header must lose to the Spanish URL.
  const response = middleware(new NextRequest(target, { headers: {
    'x-public-page-locale': 'ru', cookie: 'holistic_house_ui_locale=ru; holistic_house_public_locale=en',
  } }));
  assert.equal(response.headers.get('location'), null);
  const forwarded = new Headers();
  for (const name of response.headers.get('x-middleware-override-headers').split(',')) {
    forwarded.set(name, response.headers.get('x-middleware-request-' + name));
  }
  assert.equal(forwarded.get('x-public-page-locale'), 'es');
  assert.equal(forwarded.get('x-csp-class'), 'private');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  assert.match(response.headers.get('content-security-policy'), /frame-src 'none'/);
  return { forwarded, response };
}

async function deniedRoute() {
  let privateReads = 0;
  const forbidden = () => { privateReads++; assert.fail('Private record access is forbidden in this locale-denial test'); };
  const modules = { ...runtime, 'next/navigation': { notFound } };
  for (const [path, name] of [
    ['@/lib/clients/assessments', 'clientAssessmentSummary'], ['@/lib/app/legacy-document', 'legacyDocumentProjection'],
    ['@/lib/documents/recommendation', 'recommendationItemType'], ['@/components/prescription-access-gate', 'PrescriptionAccessGate'],
    ['@/components/client-cabinet', 'ClientCabinet'], ['@/lib/clients/session', 'authorizeCabinetRequest'],
    ['@/lib/clients/delivery-model', 'deliveryEnabled'], ['@/lib/app/config', 'getAppConfig'],
    ['@/lib/clients/session-delivery-service', 'listClientSessions'],
  ]) modules[path] = { [name]: forbidden };
  const route = load('app/[locale]/client/[selector]/page.js', modules);
  await assert.rejects(route.default({ params: Promise.resolve({ locale: 'es', selector: 'not-a-real-client-id' }),
    searchParams: { then: forbidden },
  }), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404');
  assert.equal(privateReads, 0);
  assert.equal(route.metadata.robots.index, false);
  assert.equal(route.metadata.robots.follow, false);
  return route;
}

async function scenario({ status = 404, fault } = {}) {
  const { forwarded, response: middlewareResponse } = denialHeaders();
  const route = await deniedRoute();
  if (fault === 'wrong localized content') forwarded.set('x-public-page-locale', 'en');
  const { default: NotFound } = load('app/not-found.tsx', {
    ...runtime, 'next/headers': { headers: async () => forwarded }, 'next/link': { default: props => jsx('a', props) },
  });
  const main = await NotFound();
  // The page wrapper models Next's document/robots plumbing; all visible
  // denial content, title and links below come from the unchanged real JSX.
  const robots = jsx('meta', { name: 'robots', content: route.metadata.robots.index === false ? 'noindex, nofollow' : 'index' });
  const html = jsx('html', { lang: 'es', children: [robots, main] });
  const all = () => nodes(html);
  const find = type => all().find(node => node.type === type);
  const recovery = all().find(node => node.type === 'nav');
  const language = all().filter(node => node.type === 'nav')[1];
  let url = target;
  const headers = Object.fromEntries(middlewareResponse.headers);
  if (fault === 'redirected URL') url = target.replace('/es/', '/en/');
  if (fault === 'wrong document language') html.props.lang = 'en';
  if (fault === 'wrong main language') main.props.lang = 'ru';
  if (fault === 'wrong title') find('title').props.children = 'Holistic House';
  if (fault === 'missing heading') find('h1').type = 'p';
  if (fault === 'hidden heading') find('h1').props.hidden = true;
  if (fault === 'duplicate heading') main.props.children.push(jsx('h1', { children: 'Página no encontrada' }));
  if (fault === 'wrong intro') all().find(node => node.type === 'p' && text(node).startsWith('Es posible')).props.children = 'This page could not be found.';
  if (fault === 'missing visible 404') all().find(node => node.type === 'p' && text(node).startsWith('404')).props.children = 'Holistic House';
  if (fault === 'wrong recovery label') recovery.props.children[0].props.children = 'Home';
  if (fault === 'wrong recovery destination') recovery.props.children[1].props.href = '/en/services';
  if (fault === 'private recovery destination') recovery.props.children[0].props.href = '/es/client/not-a-real-client-id';
  if (fault === 'extra recovery destination') recovery.props.children.push(jsx('a', { href: '/en/app', children: 'Cabinet' }));
  if (fault === 'hidden recovery link') recovery.props.children[0].props.hidden = true;
  if (fault === 'wrong language destination') language.props.children[0].props.href = '/en';
  if (fault === 'wrong language attribute') language.props.children[2].props.lang = 'en';
  if (fault === 'missing language link') language.props.children.pop();
  if (fault === 'missing robots meta') robots.props.name = 'description';
  if (fault === 'indexable robots meta') robots.props.content = 'index, follow';
  if (fault === 'noindex substring') robots.props.content = 'not-noindex';
  if (fault === 'missing noindex header') delete headers['x-robots-tag'];
  if (fault === 'indexable header') headers['x-robots-tag'] = 'index, follow';
  if (fault === 'noindex header substring') headers['x-robots-tag'] = 'not-noindex';
  if (['client-cabinet', 'prescription-access-gate', 'client-entry-form'].includes(fault)) main.props.children.push(jsx('div', { className: fault }));

  function locator(selected) {
    const scope = () => selected().flatMap(nodes);
    return {
      selected,
      locator(selector) { return locator(() => scope().filter(node => selector.split(',').some(raw => {
        const part = raw.trim();
        if (part.startsWith('.')) return String(node.props.className || '').split(/\s+/).includes(part.slice(1));
        if (part === 'meta[name="robots"]') return node.type === 'meta' && node.props.name === 'robots';
        assert.ok(['html', 'main', 'a'].includes(part), 'Unsupported test selector: ' + part);
        return node.type === part;
      }))); },
      getByRole(role, options = {}) { return locator(() => scope().filter(node => {
        const matchesRole = role === 'heading' ? /^h[1-6]$/.test(node.type) && (!options.level || node.type === 'h' + options.level)
          : node.type === ({ navigation: 'nav', link: 'a' })[role];
        if (!matchesRole) return false;
        if (options.name === undefined) return true;
        assert.equal(options.exact, true);
        return (node.props['aria-label'] || text(node)) === options.name;
      })); },
      getByText(value, { exact }) { assert.equal(exact, true); return locator(() => scope().filter(node => text(node) === value)); },
      async evaluateAll(callback) { return callback(selected().map(node => ({ getAttribute: name => node.props[name] ?? null }))); },
    };
  }
  const page = { ...locator(() => [html]), url: () => url, title: () => text(find('title')) };
  const expect = actual => ({
    async toHaveURL(value) { assert.equal(actual.url(), value); },
    async toHaveTitle(value) { assert.equal(actual.title(), value); },
    async toHaveCount(count) { assert.equal(actual.selected().length, count); },
    async toHaveAttribute(name, value) { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].props[name], value); },
    async toBeVisible() { assert.equal(actual.selected().length, 1); assert.notEqual(actual.selected()[0].props.hidden, true); },
  });
  expect.poll = callback => ({ async toBe(value) { assert.equal(await callback(), value); } });
  const response = fault === 'missing response' ? null : { status: () => status, headers: () => headers };
  return assertUnsupportedSpanishPrivateLocale(page, response, target, expect);
}

for (const status of [200, 404]) test('actual Spanish not-found JSX passes the denial verifier with HTTP ' + status, () => scenario({ status }));
for (const status of [201, 204, 301, 302, 307, 308, 401, 403, 500, 503]) test('denial verifier rejects HTTP ' + status, () => assert.rejects(scenario({ status })));
for (const fault of [
  'missing response', 'redirected URL', 'wrong document language', 'wrong main language', 'wrong localized content',
  'wrong title', 'missing heading', 'hidden heading', 'duplicate heading', 'wrong intro', 'missing visible 404',
  'wrong recovery label', 'wrong recovery destination', 'private recovery destination', 'extra recovery destination', 'hidden recovery link',
  'wrong language destination', 'wrong language attribute', 'missing language link',
  'missing robots meta', 'indexable robots meta', 'noindex substring', 'missing noindex header', 'indexable header', 'noindex header substring',
  'client-cabinet', 'prescription-access-gate', 'client-entry-form',
]) test('denial verifier rejects ' + fault, () => assert.rejects(scenario({ fault })));

test('Spanish release verifier invokes the tested helper and preserves the exact synthetic route', () => {
  const source = read('scripts/verify-es-public-site.mjs');
  assert.match(source, /import \{ assertUnsupportedSpanishPrivateLocale \} from '\.\/helpers\/es-private-denial-verifier\.mjs'/);
  assert.match(source, /const target=origin\+'\/es\/client\/not-a-real-client-id'/);
  assert.match(source, /await assertUnsupportedSpanishPrivateLocale\(denialPage,response,target,expect\)/);
  assert.doesNotMatch(source, /This page could not be found\./);
});
