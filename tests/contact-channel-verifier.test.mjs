import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertPreparedContactChannels } from '../scripts/helpers/contact-channel-verifier.mjs';

// The retired TSX VM harness expected WhatsApp/Telegram links before consent.
// The current UI stores a consented enquiry before offering those channels.
// Keep genuine Playwright registration acceptance in Public Services; test
// actual link-verifier invariants and the current consent-first source here.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const message = 'Personal session 60 minutes €100';
const prepared = (base, text = message) => {
  const url = new URL(base);
  url.searchParams.set('text', text);
  return url.toString();
};

function fixture(mutate = () => {}) {
  const elements = [
    { tag: 'button', attrs: { 'data-contact-order': '', 'aria-expanded': 'true' }, visible: true },
    { tag: 'a', attrs: { 'data-contact-channel': 'whatsapp', href: prepared('https://wa.me/14376066502'), target: '_blank', rel: 'noopener noreferrer' }, visible: true },
    { tag: 'a', attrs: { 'data-contact-channel': 'telegram', href: prepared('https://t.me/AndyTherapist'), target: '_blank', rel: 'noopener noreferrer' }, visible: true },
  ];
  mutate(elements);
  const matching = (selector, node) => {
    const match = /^([a-z]+)\[([\w-]+)(?:="([^"]+)")?\]$/.exec(selector);
    assert.ok(match, 'Unexpected locator: ' + selector);
    return node.tag === match[1] && Object.hasOwn(node.attrs, match[2]) &&
      (match[3] === undefined || node.attrs[match[2]] === match[3]);
  };
  const locator = entries => ({
    entries,
    locator(selector) { return locator(elements.filter(node => matching(selector, node))); },
    async getAttribute(name) {
      assert.equal(entries.length, 1, 'Attribute requires exactly one element');
      return entries[0].attrs[name] ?? null;
    },
  });
  const expect = target => ({
    async toHaveCount(count) { assert.equal(target.entries.length, count); },
    async toBeVisible() { assert.equal(target.entries.length, 1); assert.equal(target.entries[0].visible, true); },
    async toHaveAttribute(name, expected) {
      const value = await target.getAttribute(name);
      if (expected instanceof RegExp) assert.match(value ?? '', expected);
      else assert.equal(value, expected);
    },
  });
  return { chooser: locator([{ tag: 'section', attrs: {} }]), expect };
}

test('registered messenger receipt accepts two equal, explicit, safe prepared messages', async () => {
  const { chooser, expect } = fixture();
  const links = await assertPreparedContactChannels(chooser, expect);
  assert.equal(links.whatsappUrl.searchParams.get('text'), message);
  assert.equal(links.telegramUrl.searchParams.get('text'), message);
});

test('registered messenger receipt rejects tampering, other recipients and unsafe URLs', async () => {
  const change = (channel, field, value) => elements => {
    elements.find(node => node.attrs['data-contact-channel'] === channel).attrs[field] = value;
  };
  const cases = [
    change('whatsapp', 'href', prepared('https://wa.me/10000000000')),
    change('whatsapp', 'href', prepared('https://evil.invalid/14376066502')),
    change('telegram', 'href', prepared('https://t.me/EvilRecipient')),
    change('whatsapp', 'href', prepared('https://wa.me/14376066502', '')),
    change('telegram', 'href', prepared('https://t.me/AndyTherapist', 'different message')),
    change('whatsapp', 'href', prepared('https://wa.me/14376066502') + '&private=secret'),
    change('whatsapp', 'href', prepared('https://user:secret@wa.me/14376066502')),
    change('telegram', 'href', prepared('https://t.me/AndyTherapist') + '#private'),
    change('telegram', 'rel', 'noreferrer'),
    change('whatsapp', 'target', '_self'),
    elements => { elements.find(node => node.attrs['data-contact-channel'] === 'telegram').visible = false; },
    elements => { elements.splice(2, 1); },
  ];
  for (const [index, alter] of cases.entries()) {
    const { chooser, expect } = fixture(alter);
    await assert.rejects(assertPreparedContactChannels(chooser, expect), undefined, 'Unsafe mutation ' + index + ' passed');
  }
});

test('current consent-first form preserves real EN/RU/ES browser registration verification', () => {
  const component = read('components/contact-channel-chooser.tsx');
  const helper = read('scripts/helpers/contact-channel-verifier.mjs');
  const browser = read('scripts/verify-public-services-production.mjs');
  assert.match(component, /if \(!consent\) \{/);
  assert.match(component, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(component, /contactConsent: consent, website/);
  assert.match(component, /setSaved\(\{ saved: true, referenceCode: data\.referenceCode \}\)/);
  assert.match(component, /\{!saved \? \(\s*<form/);
  assert.match(component, /<div className=\{styles\.choices\}/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(helper, /export async function openRegisteredContactChannelChooser/);
  assert.match(helper, /await expect\(chooser\.locator\('a\[data-contact-channel\]'\)\)\.toHaveCount\(0\)/);
  assert.match(helper, /await expect\(submit\)\.toBeDisabled\(\)/);
  assert.match(helper, /assert\.equal\(data\.contactConsent,true\)/);
  assert.match(helper, /assert\.doesNotMatch\(prepared\.whatsappUrl\.searchParams/);
  assert.ok((browser.match(/openRegisteredContactChannelChooser\(/g) || []).length >= 3,
    'Real browsers must verify registration and consent on independent service routes');
});
