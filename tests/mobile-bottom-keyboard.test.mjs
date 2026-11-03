import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

test('mobile bottom navigation keeps the normal six-item layout and safe-area anchor', () => {
  const bottom = readFileSync('app/holistic-house-home.css', 'utf8');
  assert.match(bottom, /\.mobile-bottom-navigation \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;[\s\S]*?grid-template-columns: repeat\(6, minmax\(0,1fr\)\);/);
  assert.match(css, /\.ia222-bottom-navigation \{ height: auto; grid-template-columns: repeat\(6,minmax\(0,1fr\)\); \}/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
