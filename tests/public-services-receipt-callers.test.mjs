import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-public-services-production.mjs');
function titles(text = source) {
  const start = text.indexOf('const receiptTitles = ') + 'const receiptTitles = '.length;
  assert.ok(start > 24);
  return JSON.parse(text.slice(start, text.indexOf(';', start)));
}
function module(path) {
  const exports = {};
  runInNewContext(ts.transpileModule(read(path), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports});
  return exports;
}
const personal = module('data/personal-service-pages.ts').personalServiceCopy;
const business = module('data/business-consulting-copy.ts').businessConsultingCopy;
function verifyTitles(actual) {
  for (const locale of ['en','ru','es']) {
    for (const service of ['imagery-therapy','systemic-constellations']) assert.equal(actual.personal[service][locale], personal[service][locale].orderLabel);
    assert.equal(actual.business[locale], business[locale].title);
    assert.notEqual(actual.business[locale], business[locale].headline, 'Business headline is not its registered service title');
    assert.ok(read('components/alchemy-soul-lead-form.tsx').includes('"' + actual.alchemy[locale] + '"'));
    assert.ok(read('components/free-drawing-intake.tsx').includes('questionLabel: "' + actual.drawing[locale] + '"'));
  }
}
test('receipt callers retain exact authored service identities for all locales', () => verifyTitles(titles()));
test('title proof rejects descriptive headline substituted for submitted service identity', () => {
  const altered = titles(); altered.business.en = business.en.headline;
  assert.throws(() => verifyTitles(altered));
});
function formats(text = source) {
  const start = text.indexOf('const receiptFormats = ') + 'const receiptFormats = '.length;
  assert.ok(start > 25);
  return JSON.parse(text.slice(start, text.indexOf(';', start)));
}
const expectedFormats = {
  "personal": {
    "en": "30-minute express consultation · €50",
    "ru": "Экспресс-консультация 30 минут · €50",
    "es": "Consulta exprés de 30 minutos · €50"
  },
  "business": {
    "en": "30 min · €50",
    "ru": "30 min · €50",
    "es": "30 min · €50"
  },
  "alchemy": {
    "en": "Express review · 30 min · €50",
    "ru": "Экспресс · 30 минут · €50",
    "es": "Revisión exprés · 30 minutos · €50"
  }
};
test('receipt format expectations retain exact approved paid selections', () => {
  assert.deepEqual(formats(), expectedFormats);
  for (const locale of ['en','ru','es']) {
    assert.ok(read('components/consultation-choice-capture.tsx').includes('questions: "' + expectedFormats.personal[locale] + '"'));
    assert.ok(read('components/alchemy-soul-lead-form.tsx').includes('"30": "' + expectedFormats.alchemy[locale] + '"'));
    assert.ok(read('components/business-consulting-landing.tsx').includes('"30 min · €50"'));
  }
});
const calls = [...source.matchAll(/await assertRegisteredEnquiryReceipt\((\w+), expect, page, \{([\s\S]*?)\}\);/g)];
test('five redirect callers pass exact scope, route, title and private marker checks', async () => {
  assert.equal(calls.length, 5);
  assert.deepEqual(calls.map(match => match[1]), ['target','express','pricing','capture','ready']);
  for (const locale of ['en','ru','es']) {
    const receiptTitles = titles(), receiptFormats = formats();
    const values = {
      target: {locale,sourcePath:'/' + locale + '/services/imagery-therapy',serviceTitle:personal['imagery-therapy'][locale].orderLabel,selectedFormat:expectedFormats.personal[locale]},
      express: {locale,sourcePath:'/' + locale + '/services/business-consulting',serviceTitle:business[locale].title,selectedFormat:expectedFormats.business[locale]},
      pricing: {locale,sourcePath:'/' + locale + '/services/alchemy-of-soul',serviceTitle:receiptTitles.alchemy[locale],selectedFormat:expectedFormats.alchemy[locale]},
      capture: {locale,sourcePath:'/' + locale + '/services/hypnotherapy-course',serviceTitle:'Synthetic source h1'},
      ready: {locale,sourcePath:'/' + locale + '/services/free-situation-review',serviceTitle:receiptTitles.drawing[locale],privateMarkers:['private-A','private-B']},
    };
    for (const match of calls) {
      const scope = match[1], page = {}, expect = {}, target = {};
      const slug = scope === 'pricing' ? 'alchemy-of-soul' : scope === 'ready' ? 'services/free-situation-review' : 'hypnotherapy-course';
      let invoked = 0;
      const helper = async (actualScope, actualExpect, actualPage, options) => {
        assert.equal(actualScope,target); assert.equal(actualExpect,expect); assert.equal(actualPage,page);
        assert.deepEqual(options,values[scope]); invoked++;
      };
      await new Function(scope,'expect','page','assertRegisteredEnquiryReceipt','locale','service','slug','serviceTitle','receiptTitles','receiptFormats','markerA','markerB', 'return (async()=>{' + match[0] + '})()')(target,expect,page,helper,locale,'imagery-therapy',slug,'Synthetic source h1',receiptTitles,receiptFormats,'private-A','private-B');
      assert.equal(invoked,1);
    }
  }
});
function verifyOrder(text = source) {
  assert.doesNotMatch(text, /openRegisteredContactChannelChooser|assertPreparedContactChannels/);
  const before = (first, second) => { const a = text.indexOf(first), b = text.indexOf(second); assert.ok(a >= 0 && b > a, first); };
  before('"/personal-" + locale + "-" + service + "-request-390.png"', 'await assertRegisteredEnquiryReceipt(target');
  before('"/business-" + locale + "-express-request-390.png"', 'await assertRegisteredEnquiryReceipt(express');
  before('"/alchemy-" + locale + "-request-390.png"', 'await assertRegisteredEnquiryReceipt(pricing');
  before('await alternative.locator("summary").click()', 'await assertRegisteredEnquiryReceipt(capture');
  before('"/core-" + locale + "-" + slug + "-footer-expanded-390.png"', 'await assertRegisteredEnquiryReceipt(capture');
  before('"/free-" + kind + "-" + locale + "-hero-" + width + ".png"', 'await assertRegisteredEnquiryReceipt(ready');
  assert.match(text, /choices.nth\(1\)\)\.toContainText\("€50"\)/);
  assert.match(text, /choices.nth\(1\)\)\.toContainText\("30"\)/);
  assert.match(text, /expect\(express\)\.toContainText\("€50"\)/);
  assert.match(text, /expect\(express\)\.toContainText\("30"\)/);
  assert.match(text, /\[data-alchemy-format="30"\]'\)\)\.toHaveAttribute\('aria-pressed','true'\)/);
  assert.match(text, /\[data-alchemy-format="30"\]'\)\)\.toContainText\('€50'\)/);
  assert.match(text, /const serviceTitle = await main.locator\('h1'\).innerText\(\)/);
  assert.match(read('components/core-service-detail.tsx'), /service: t.title/);
  assert.match(read('components/core-service-detail.tsx'), /<h1>\{t.title\}<\/h1>/);
}
test('selected rates and source-page evidence stay before receipt navigation', () => verifyOrder());
test('ordering proof rejects receipt navigation before alternative expansion', () => {
  assert.throws(() => verifyOrder(source.replace('await alternative.locator("summary").click()', '/* moved after receipt */') + '\nawait alternative.locator("summary").click()'));
});
test('rate proof rejects missing selected express price assertion', () => {
  assert.throws(() => verifyOrder(source.replace('await expect(choices.nth(1)).toContainText("€50");', '')));
});

test('format proof rejects a selected paid option omitted from downstream receipt assertion', () => {
  const bad = source.replace('selectedFormat: receiptFormats.personal[locale],', '');
  const match = [...bad.matchAll(/await assertRegisteredEnquiryReceipt\((\w+), expect, page, \{([\s\S]*?)\}\);/g)].find(row => row[1] === 'target');
  assert.ok(match);
  const options = new Function('locale','service','receiptTitles','receiptFormats', 'return ({' + match[2] + '})')('en','imagery-therapy',titles(),formats());
  assert.throws(() => assert.equal(options.selectedFormat,expectedFormats.personal.en));
});
