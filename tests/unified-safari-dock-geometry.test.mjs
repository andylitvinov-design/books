import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileVisualBottomGap,visualKeyboardOpen} from '../lib/mobile-visual-bottom.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the six-button bottom dock is CSS-fixed, not re-positioned on Safari scroll',()=>{
 const dock=read('components/unified-mobile-dock.tsx');
 const css=read('components/unified-mobile-dock.module.css');
 const global=read('app/unified-mobile-dock.css');
 assert.match(css,/position:fixed;z-index:58;bottom:0;/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/translate3d\(-50%,0,0\)/);
 assert.match(dock,/visualKeyboardOpen\(/);
 assert.match(dock,/viewport\?\.addEventListener\("resize"/);
 assert.doesNotMatch(dock,/visualDockBottomCorrection\(|mobileVisualBottomGap\(/);
 assert.doesNotMatch(dock,/--hh-unified-viewport-inset/);
 assert.doesNotMatch(css,/--hh-unified-viewport-inset|100vh\s*-\s*100dvh/);
 assert.doesNotMatch(global,/--hh-unified-viewport-inset/);
 assert.doesNotMatch(dock,/addEventListener\("scroll", update/);
 assert.match(dock,/data-keyboard-open=\{keyboardOpen \|\| undefined\}/);
});

test('keyboard visibility is detected from real focused viewport loss, not browser chrome',()=>{
 assert.equal(visualKeyboardOpen({editing:false,layoutHeight:844,visualHeight:420,lastUnfocusedVisualHeight:844}),false);
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:844,visualHeight:420,lastUnfocusedVisualHeight:844}),true);
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:844,visualHeight:780,lastUnfocusedVisualHeight:844}),false);
 // The old pure helper remains available to other clients but must not drive the dock.
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:720}),124);
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:844}),0);
});
