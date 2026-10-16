import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const css = readFileSync(new URL('../components/consultation-choice-capture.module.css', import.meta.url), 'utf8');
const verifier = readFileSync(new URL('../scripts/verify-home-locale-switch.mjs', import.meta.url), 'utf8');

function assertHomeCtaReadability(styles, browserVerifier) {
  const root = postcss.parse(styles);
  const homeActions = [];
  root.walkRules('.homeCapture .action', rule => homeActions.push(rule));
  assert.equal(homeActions.length, 2, 'Keep exactly the desktop and mobile homepage-only CTA rules');
  const [desktop, mobile] = homeActions;
  const declarations = rule => Object.fromEntries(rule.nodes.map(node => [node.prop, node.value]));
  assert.equal(desktop.parent.type, 'root', 'Desktop home CTA must keep its home-only scope');
  assert.equal(mobile.parent.name, 'media');
  assert.equal(mobile.parent.params, '(max-width:760px)', 'Preserve the existing mobile breakpoint');
  assert.deepEqual(declarations(desktop), {
    'min-height': '48px', 'margin-top': '11px', padding: '10px 13px',
    'border-radius': '12px', background: '#762e4c', color: 'white',
    'box-shadow': 'none', 'font-size': '14px',
  }, 'Desktop CTA keeps its existing design with a readable 14px label');
  assert.deepEqual(declarations(mobile), {
    'min-height': '46px', padding: '10px', 'font-size': '14px',
  }, 'Mobile CTA keeps its existing touch target and spacing with a readable 14px label');
  const sharedActions = [];
  root.walkRules('.action', rule => sharedActions.push(rule));
  assert.equal(sharedActions.length, 2, 'Do not broaden a homepage override to shared captures');
  assert.equal(declarations(sharedActions[0]).font, '800 15px/1.35 Arial,Helvetica,sans-serif');
  assert.equal(sharedActions[1].parent.params, '(max-width:640px)');
  assert.equal(declarations(sharedActions[1])['font-size'], '14px');
  assert.match(browserVerifier, /assert\.ok\(size\.height >= 46 && size\.font >= 14,/, 'Keep the real-browser 46px touch-target and 14px readability guard');
}

test('homepage free CTA labels meet the browser font guard on desktop and mobile without shared style changes', () => {
  assertHomeCtaReadability(css, verifier);
});

const desktop = '.homeCapture .action{min-height:48px;margin-top:11px;padding:10px 13px;border-radius:12px;background:#762e4c;color:white;box-shadow:none;font-size:14px}';
const mobile = '.homeCapture .action{min-height:46px;padding:10px;font-size:14px}';
for (const [name, before, after] of [
  ['13px desktop label', desktop, desktop.replace('font-size:14px', 'font-size:13px')],
  ['12px mobile label', mobile, mobile.replace('font-size:14px', 'font-size:12px')],
  ['unscoped desktop override', desktop, desktop.replace('.homeCapture .action', '.action')],
  ['unscoped mobile override', mobile, mobile.replace('.homeCapture .action', '.action')],
  ['changed mobile breakpoint', '@media(max-width:760px)', '@media(max-width:640px)'],
  ['shorter mobile target', mobile, mobile.replace('min-height:46px', 'min-height:44px')],
  ['changed desktop design', desktop, desktop.replace('background:#762e4c', 'background:#000')],
  ['changed shared CTA font', 'font:800 15px/1.35', 'font:800 14px/1.35'],
]) test(`readability regression rejects ${name}`, () => {
  assert.ok(css.includes(before), 'Mutation must change the real source');
  assert.throws(() => assertHomeCtaReadability(css.replace(before, after), verifier));
});
for (const [name, before, after] of [
  ['lowered font guard', 'size.font >= 14', 'size.font >= 12'],
  ['lowered height guard', 'size.height >= 46', 'size.height >= 44'],
]) test(`readability regression rejects ${name}`, () => {
  assert.ok(verifier.includes(before), 'Mutation must change the actual browser verifier');
  assert.throws(() => assertHomeCtaReadability(css, verifier.replace(before, after)));
});
