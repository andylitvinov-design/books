import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-contact-channel-chooser-browser.mjs');
const start = source.indexOf('            await page.goto(origin + "/en/academy/temple-studies"');
const end = source.indexOf('\n          }', start);
assert.ok(start > 0 && end > start);
const templeBranch = source.slice(start, end);

test('Temple browser branch uses normal receipt flow after explicit selection, not an in-place messenger', async () => {
  const actions = [], results = [], origin = 'http://127.0.0.1:3100';
  const temple = { locator(selector) {
    if (selector === '[data-contact-channel-chooser]') return { async waitFor(options) { assert.deepEqual(options, {state:'visible'}); actions.push('chooser-visible'); } };
    assert.match(selector, /^\[data-temple-step="(?:tradition|deity|initiation)"\] button$/);
    return { first: () => ({ async click() { actions.push(selector); } }) };
  } };
  const page = {
    async goto(url) { assert.equal(url, origin + '/en/academy/temple-studies'); actions.push('navigate'); },
    locator(selector) {
      if (selector === '[data-temple-initiation-chooser]') return temple;
      assert.equal(selector, '[data-service-thank-you]');
      return { async screenshot(options) { assert.equal(options.path, 'output/chromium-en-390-temple-receipt.png'); actions.push('receipt-screenshot'); } };
    },
  };
  const expect = Symbol('expect');
  const receipt = async (scope, assertion, actualPage, options) => {
    assert.equal(scope, temple); assert.equal(assertion, expect); assert.equal(actualPage, page);
    assert.deepEqual(options, {locale:'en',sourcePath:'/en/academy/temple-studies',serviceTitle:'Temple Studies'});
    assert.deepEqual(actions, ['navigate','[data-temple-step="tradition"] button','[data-temple-step="deity"] button','[data-temple-step="initiation"] button','chooser-visible']);
    actions.push('receipt-verified'); return {request:{},referenceCode:'HH-ABCD1234EF56'};
  };
  await new Function('page','origin','expect','assertRegisteredEnquiryReceipt','results','output','name','locale','width', `return (async()=>{${templeBranch}})()`)(page,origin,expect,receipt,results,'output','chromium','en',390);
  assert.deepEqual(actions.slice(-2), ['receipt-verified','receipt-screenshot']);
  assert.deepEqual(results, [{name:'chromium',locale:'en',width:390,templeReceipt:true,referenceCode:'HH-ABCD1234EF56',contactSubmitted:true}]);
  assert.doesNotMatch(templeBranch, /verifyChooser|data-contact-channel="(?:whatsapp|telegram)"|force\s*:/);
});

test('source keeps deliberate in-place Academy cases distinct from default Temple redirect', () => {
  for (const path of ['components/academy-course-capture.tsx','components/yggdrasil-initiation-form.tsx','components/tantra-initiation-form.tsx']) {
    const component = read(path);
    const choosers = [...component.matchAll(/<ContactChannelChooser\b([^>]+)>?/g)];
    assert.ok(choosers.length);
    for (const [, props] of choosers) assert.match(props, /\bstayAfterSave\b/);
  }
  const temple = read('components/temple-initiation-chooser.tsx');
  assert.match(temple, /service: "Temple Studies"/);
  assert.doesNotMatch(temple.match(/<ContactChannelChooser\b([^>]+)>?/)?.[1] || '', /stayAfterSave/);
  assert.match(source, /await verifyChooser\(page,items\.nth\(i\)/);
  assert.match(source, /await submitSyntheticForm\(page,chooser,locale,submissions\)/);
  assert.match(source, /trial:true/);
  assert.match(source, /await assertCompactLeadRequest\(page,dao/);
});

function daoContract(value) {
  assert.ok(value.includes("dao.locator('[data-compact-lead-form] input[type=\"checkbox\"][required]')).toHaveCount(1)"));
  assert.ok(value.includes("dao.locator('[data-contact-channel-chooser]')).toHaveCount(0)"));
  assert.ok(value.includes('compactDaoRequest:true,syntheticReceipt:true'));
}
test('canonical Dao keeps exactly one required consent and no parallel messenger funnel', () => {
  daoContract(source);
  for (const changed of [source.replace('[type="checkbox"][required]', '[type="checkbox"]'), source.replace("dao.locator('[data-contact-channel-chooser]')).toHaveCount(0)", "dao.locator('[data-contact-channel-chooser]')).toHaveCount(1)")]) assert.throws(() => daoContract(changed));
});
