'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {openTotal} = require('../pr-compact-top.js');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'pr-compact-top.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'pr-compact-top.css'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'pr-two-screen-boot.js'), 'utf8');

test('all-open count comes from verified legacy GitHub count, never period flow balance', () => {
  assert.equal(openTotal('всего открыто 139'), 139);
  assert.equal(openTotal('Всего открыто 1\u00a0234'), 1234);
  assert.equal(openTotal('всего открыто 0'), 0);
  for (const text of ['всего открыто —', 'Создано 140, Merge 100', '', 'нет данных', 'всего открыто 2x']) {
    assert.equal(openTotal(text), null, text);
  }
});
test('relocates original period widget and retains its original event handlers and API', () => {
  assert.match(script, /getElementById\('hh-pr-merge-speed'\)/);
  assert.match(script, /main\.insertBefore\(section, main\.firstChild\)/);
  assert.match(script, /new MutationObserver\(keepFirst\)\.observe\(main, \{childList: true\}\)/);
  assert.match(script, /getElementById\('now-total'\)/);
  assert.doesNotMatch(script, /fetch\(|setInterval\(|setTimeout\(|workflow_dispatch|createElement\('button'\)/);
  assert.match(script, /'Создано'/);
  assert.match(script, /'Смержено'/);
  assert.match(script, /'Открыто сейчас'/);
  assert.match(script, /'P50 до merge'/);
});
test('mounts once, safely handles asynchronous scripts and narrow mobile widths', () => {
  assert.match(script, /env\.__hhPrCompactTopMounted/);
  assert.match(script, /const watch = new MutationObserver/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:359px\)/);
  assert.match(css, /\.hh-pr-speed-description \{display:none!important\}/);
  assert.match(boot, /pr-compact-top\.js\?v=20261111-top-v1/);
  assert.match(boot, /pr-compact-top\.css\?v=20261111-top-v1/);
});
