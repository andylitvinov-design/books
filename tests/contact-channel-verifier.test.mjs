import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { openContactChannelChooser, assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs';
import * as enquiries from '../lib/whatsapp-enquiry.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
function mountChooser(locale, fault) {
  let open = fault === 'initially open', choice = 'session', externalClicks = 0;
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useId: () => 'panel', useState: () => [open, update => { if (fault !== 'blocked trigger') open = update(open); }] },
    'lucide-react': Object.fromEntries(['ChevronDown', 'MessageCircle', 'Send', 'ShoppingBag'].map(name => [name, () => null])),
    '@/components/acquisition-event-link': { AcquisitionEventLink: ({ attributes, ...props }) => jsx('a', { ...props, ...attributes }) },
    '@/lib/whatsapp-enquiry': enquiries,
    './contact-channel-chooser.module.css': { default: {} },
  };
  const exports = {};
  const compiled = ts.transpileModule(read('components/contact-channel-chooser.tsx'), { fileName: 'chooser.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  function nodes() {
    const message = choice === 'session' ? 'Personal session 60 minutes €100' : 'Questions 30 minutes €50';
    const tree = exports.ContactChannelChooser({ locale, whatsappUrl: enquiries.whatsappEnquiryUrl({ locale, service: 'Consultation', request: message, pagePath: '/' + locale + '/services/psychohomeopathy?private=never-share' }), attributes: { 'data-consultation-action': choice } });
    const result = [];
    function visit(node, hidden = false) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(child => visit(child, hidden)); return; }
      const invisible = hidden || Boolean(node.props.hidden);
      if (!(fault === 'missing telegram' && node.props['data-contact-channel'] === 'telegram')) result.push({ ...node, hidden: invisible });
      visit(node.props.children, invisible);
    }
    visit(tree);
    const wa = result.find(node => node.props['data-contact-channel'] === 'whatsapp');
    const tg = result.find(node => node.props['data-contact-channel'] === 'telegram');
    if (fault === 'duplicate channel') result.push({ ...wa });
    if (fault === 'wrong recipient') wa.props.href = wa.props.href.replace('14376066502', '10000000000');
    if (fault === 'wrong host') tg.props.href = tg.props.href.replace('https://t.me', 'https://evil.example');
    if (fault === 'extra query') wa.props.href += '&private=secret';
    if (fault === 'empty message') wa.props.href = 'https://wa.me/14376066502?text=';
    if (fault === 'changed telegram message') tg.props.href = 'https://t.me/AndyTherapist?text=other';
    if (fault === 'missing safety rel') wa.props.rel = 'noreferrer';
    if (fault === 'same tab') tg.props.target = '_self';
    if (fault === 'hidden after open' && open) tg.hidden = true;
    return result;
  }
  function locator(selector) {
    const match = selector.match(/^(a|button)?\[([\w-]+)(?:="([^"]+)")?\]$/);
    assert.ok(match, selector);
    const selected = () => nodes().filter(node => (!match[1] || node.type === match[1]) && Object.hasOwn(node.props, match[2]) && (match[3] === undefined || node.props[match[2]] === match[3]));
    return { locator, selected, async getAttribute(name) { const values = selected(); assert.equal(values.length, 1); return values[0].props[name] ?? null; }, async click() {
      const values = selected(); assert.equal(values.length, 1);
      if (values[0].type === 'a') { externalClicks++; assert.fail('Acceptance must not click external contact links'); }
      values[0].props.onClick();
    } };
  }
  const expect = actual => ({
    async toHaveCount(n) { assert.equal(actual.selected().length, n); },
    async toBeVisible() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, false); },
    async toBeHidden() { assert.equal(actual.selected().length, 1); assert.equal(actual.selected()[0].hidden, true); },
    async toHaveAttribute(name, value) {
      const raw = await actual.getAttribute(name); const actualValue = raw == null ? null : String(raw);
      if (value instanceof RegExp) assert.match(actualValue, value); else assert.equal(actualValue, value);
    },
  });
  return { scope: { locator }, expect, choose: value => { choice = value; }, externalClicks: () => externalClicks };
}

for (const locale of ['en', 'ru', 'es']) test(locale + ' actual chooser opens exactly two safe channels and updates both prepared requests', async () => {
  const mounted = mountChooser(locale);
  const chooser = await openContactChannelChooser(mounted.scope, mounted.expect);
  const first = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(first.whatsappUrl.searchParams.get('text'), /60 minutes €100/);
  assert.doesNotMatch(first.whatsappUrl.searchParams.get('text'), /private|never-share/);
  mounted.choose('questions');
  const next = await assertPreparedContactChannels(chooser, mounted.expect);
  assert.match(next.whatsappUrl.searchParams.get('text'), /30 minutes €50/);
  assert.notEqual(next.whatsappUrl.href, first.whatsappUrl.href);
  for (const link of [next.whatsapp, next.telegram]) assert.equal(await link.getAttribute('data-consultation-action'), 'questions');
  mounted.choose('session');
  assert.equal((await assertPreparedContactChannels(chooser, mounted.expect)).whatsappUrl.href, first.whatsappUrl.href);
  assert.equal(mounted.externalClicks(), 0);
});
for (const fault of ['initially open', 'blocked trigger', 'missing telegram', 'duplicate channel', 'wrong recipient', 'wrong host', 'extra query', 'empty message', 'changed telegram message', 'missing safety rel', 'same tab', 'hidden after open']) {
  test('chooser acceptance rejects ' + fault, async () => {
    const mounted = mountChooser('en', fault);
    await assert.rejects(openContactChannelChooser(mounted.scope, mounted.expect));
    assert.equal(mounted.externalClicks(), 0);
  });
}

test('release retains explicit paid selection, free internal action, reset, privacy and separate footer Telegram checks', () => {
  const source = read('scripts/verify-release-reaudit.mjs');
  const paid = source.slice(source.indexOf("await check('paid-consultation-safe-handoff'"), source.indexOf("if (width === 390)"));
  assert.match(paid, /openContactChannelChooser\(capture, expect\)/);
  assert.match(paid, /assertPreparedContactChannels\(chooser, expect\)/);
  assert.match(paid, /\[data-consultation-action\]'\)\)\.toHaveCount\(2\)/);
  assert.match(paid, /for \(const action of \[whatsapp, telegram\]\)/);
  assert.match(paid, /assertPaidUrl\('session', '60', '€100'\)/);
  assert.match(paid, /assertPaidUrl\('questions', '30', '€50'\)/);
  assert.match(paid, /\[data-contact-channel-chooser\]'\)\)\.toHaveCount\(0\)/);
  assert.match(paid, /await expect\(action\)\.toHaveCount\(1\)/);
  assert.match(paid, /assert.equal\(freeUrl.href, origin \+ `\/\$\{locale\}\/services\/free-situation-review`\)/);
  assert.match(paid, /Reset must restore the exact paid request/);
  assert.match(paid, /telegram"\]:not\(\[data-consultation-action\]\)/);
  assert.match(paid, /No private intake fields/);
  assert.match(source, /assert\.deepEqual\(cspErrors, \[\]/);
});

test('both core-service scripts explicitly open the uniquely scoped chooser without changing unrelated direct handoffs', () => {
  const app = read('scripts/verify-app-r1.mjs');
  assert.match(app, /data-sitewide-capture="core-service"/);
  assert.match(app, /openContactChannelChooser\(capture,expect\)/);
  assert.match(app, /message.includes\(names\[locale\]\)/);
  assert.match(app, /const whatsapp=ready.locator\('a\[data-contact-channel="whatsapp"\]'\)/);
  assert.match(app, /const order=promo.locator\('a\[data-contact-channel="whatsapp"\]'\)/);
  const production = read('scripts/verify-public-services-production.mjs');
  assert.match(production, /main.locator\('section:has\(> details\)'\)/);
  assert.match(production, /assert.equal\(await capture.count\(\), 1/);
  assert.match(production, /openContactChannelChooser\(capture, expect\)/);
  assert.match(production, /Prepared request must retain the selected service/);
  assert.match(production, /alternative starts collapsed/);
  assert.match(production, /Only|isolated loopback server/);
  assert.match(production, /require\(\(process.env.HH_PLAYWRIGHT_PACKAGE \|\| "playwright"\) \+ "\/test"\)/);
  const loader = production.match(/const \{ expect \} = require\([^;]+;/)?.[0];
  assert.ok(loader, 'Execute the real override-aware assertion loader');
  for (const override of [undefined, '/tmp/isolated-tools/node_modules/playwright']) {
    const calls = [];
    const sentinel = () => {};
    const loaded = new Function('require', 'process', loader + '; return expect;')(path => {
      calls.push(path);
      return { expect: sentinel };
    }, { env: { HH_PLAYWRIGHT_PACKAGE: override } });
    assert.equal(loaded, sentinel);
    assert.deepEqual(calls, [(override || 'playwright') + '/test']);
  }
});

test('actual core JSX has one footer section with one chooser and the matching service draft', () => {
  const exports = {};
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': { default: () => null },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowUpRight', 'Check', 'ShieldCheck'].map(name => [name, () => null])),
    '@/components/contact-channel-chooser': { ContactChannelChooser: props => jsx('contact-chooser', props) },
    '@/components/service-video-showcase': { ServiceVideoShowcase: () => null },
    './core-service-detail.module.css': { default: {} },
  };
  const compiled = ts.transpileModule(read('components/core-service-detail.tsx'), { fileName: 'core.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
  for (const locale of ['en', 'ru']) for (const kind of ['dao', 'alchemy', 'hypnotherapy']) {
    const tree = exports.CoreServiceDetail({ locale, kind });
    const footer = nodes(tree).filter(node => node.type === 'section' && [node.props.children].flat().some(child => child?.type === 'details'));
    assert.equal(footer.length, 1, 'section:has(> details) selects exactly the footer');
    const choosers = nodes(footer).filter(node => node.type === 'contact-chooser');
    assert.equal(choosers.length, 1, 'footer scope excludes the hero chooser');
    const title = nodes(tree).find(node => node.type === 'h1').props.children;
    assert.ok(new URL(choosers[0].props.whatsappUrl).searchParams.get('text').includes(title));
  }
});
