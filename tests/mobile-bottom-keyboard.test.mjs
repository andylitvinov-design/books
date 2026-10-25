import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {getCompactNavigation} from '../lib/site-navigation-model.js';

const css = readFileSync('app/ia-v2.css', 'utf8');

// WebKit anchors position:fixed bars to the reduced visual viewport while
// its software keyboard is shown. Editing controls must not leave the bar
// floating over the page; it returns when focus leaves the control.
test('mobile navigation hides while a text field or editor is focused', () => {
  assert.match(css, /@media \(max-width: 767px\) \{/);
  assert.match(css, /body:has\(:is\([\s\S]*?textarea,[\s\S]*?select,[\s\S]*?input:not\(\[type="checkbox"\]\)[\s\S]*?\[contenteditable="true"\][\s\S]*?\):focus\) \.ia222-bottom-navigation \{\s*display: none !important;/);
  assert.match(css, /body:has\(:is\([\s\S]*?\):focus\) \{\s*--ia222-bottom-height: 0px !important;/);
  for (const type of ['checkbox','radio','range','button','submit','reset','hidden']) {
    assert.ok(css.includes(':not([type="' + type + '"])'), 'do not hide the bar when a non-editing ' + type + ' control is focused');
  }
});

function assertSevenItemLayout(bottom, currentCss) {
  assert.match(bottom, /\.mobile-bottom-navigation \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;[\s\S]*?grid-template-columns: repeat\(7, minmax\(0,1fr\)\);/);
  assert.match(currentCss, /\.ia222-bottom-navigation \{ height: auto; grid-template-columns: repeat\(7,minmax\(0,1fr\)\); \}/);
  assert.match(currentCss, /env\(safe-area-inset-bottom\)/);
}

test('mobile bottom navigation keeps the current seven-item layout and safe-area anchor', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const items = getCompactNavigation(locale);
    assert.deepEqual(items.map(item => item.id), ['home', 'analysis', 'courses', 'profile', 'coaching', 'pro', 'temple']);
    assert.equal(new Set(items.map(item => item.href)).size, 7);
    assert.ok(items.every(item => !item.external && item.ariaLabel));
  }
  assertSevenItemLayout(readFileSync('app/holistic-house-home.css', 'utf8'), css);
});

for (const [name, mutateBottom, mutateCss] of [
  ['legacy six-column shell', value => value.replace('repeat(7, minmax(0,1fr))', 'repeat(6, minmax(0,1fr))'), value => value],
  ['legacy six-column override', value => value, value => value.replace('repeat(7,minmax(0,1fr))', 'repeat(6,minmax(0,1fr))')],
  ['missing bottom safe-area', value => value, value => value.replaceAll('env(safe-area-inset-bottom)', '0px')],
]) test('mobile layout rejects ' + name, () => {
  const bottom = readFileSync('app/holistic-house-home.css', 'utf8');
  const nextBottom = mutateBottom(bottom), nextCss = mutateCss(css);
  assert.ok(nextBottom !== bottom || nextCss !== css, 'Mutation must change the actual CSS');
  assert.throws(() => assertSevenItemLayout(nextBottom, nextCss), {code: 'ERR_ASSERTION'});
});
