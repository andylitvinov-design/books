import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('components/app/emotional-avatar.module.css');
const chat=read('components/holistic-agent-chat.module.css');
const avatar=read('components/app/emotional-avatar.tsx');
for(const width of [320,375,390,430]){
  test(`mobile ${width}px respects in-flow geometry and keyboard gate`,()=>{
    assert.match(css,/\.root\{flex:none;/);
    assert.match(css,/@media\(max-width:760px\)/);
    assert.match(css,/@media\(max-width:375px\)/);
    assert.match(css,/data-hh-mobile-keyboard-open/);
    assert.match(css,/data-keyboard-open/);
    assert.match(avatar,/window\.visualViewport/);
    assert.match(chat,/\.root\[data-compact\]>\.thread\{/);
    assert.match(chat,/order:4;flex:none/);
    assert.doesNotMatch(css,/position\s*:\s*(?:fixed|absolute)/);
    assert.ok(width>=320&&width<=430);
  });
}
test('reduced motion + keyboard + explicit hide do not obstruct text controls',()=>{
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.root\[data-keyboard-hidden="true"\]\{display:none\}/);
  assert.match(avatar,/data-hh-emotional-avatar-hidden/);
  assert.match(avatar,/aria-expanded=\{expanded\}/);
  assert.match(avatar,/focusable="false" aria-hidden="true"/);
});
