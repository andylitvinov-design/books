import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('components/services-assist-homeopathy.tsx');
const css = read('components/services-assist-homeopathy.module.css');
const assist = read('components/services-assist-mobile.tsx');

test('three authentic educational remedy links have distinct original images', () => {
  for (const slug of ['gelsemium', 'ignatia-amara', 'nux-vomica']) {
    assert.match(source, new RegExp('slug: "' + slug + '"'));
    assert.match(source, new RegExp('/media/remedies/' + slug + '/message'));
  }
  assert.match(source, /homeopathy\/remedies\/" \+ item\.slug/);
  assert.match(source, /locale === "es" \? "en" : locale/);
});
test('the source and consultation CTA use existing page elements only', () => {
  assert.match(source, /href="#consultation"/);
  assert.match(source, /\/images\/holistic-house\/andy-about.png/);
  assert.match(source, /confirmed before booking/);
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|axios/);
});
test('homeopathy is explicitly educational and does not replace care', () => {
  assert.match(source, /not personalised prescriptions/);
  assert.match(source, /lacks reliable evidence/);
  assert.match(source, /не имеет надёжных доказательств/);
  assert.doesNotMatch(source, /\bdosage\b|\bpotency\b|mg\b/);
});
test('the approved mobile layout preserves keyboard focus and 320px width', () => {
  assert.match(css, /grid-template-columns:92px minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(source, /aria-labelledby="assist-homeopathy-title"/);
  assert.match(source, /data-assist-remedy/);
});
test('Assist inserts the panel only inside non-crisis suggestions', () => {
  assert.match(assist, /import \{ ServicesAssistHomeopathy \} from "\.\/services-assist-homeopathy";/);
  const crisis = assist.indexOf('{crisis?<p role="alert"');
  const homeopathy = assist.indexOf('<ServicesAssistHomeopathy locale={locale} />');
  const recommendations = assist.indexOf('<div className={styles.recommendations}>');
  assert.ok(crisis !== -1 && homeopathy > crisis && recommendations > homeopathy);
});
