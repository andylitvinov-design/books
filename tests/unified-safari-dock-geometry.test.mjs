import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mobileVisualBottomGap} from '../lib/mobile-visual-bottom.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('unified six-tab dock clears iPhone Safari expanded toolbar and settles after collapse',()=>{
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:720}),124)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:720,visualOffsetTop:40}),84)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:844}),0)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:420}),320)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:NaN}),0)
 const dock=read('components/unified-mobile-dock.tsx')
 const css=read('components/unified-mobile-dock.module.css')
 const layout=read('app/unified-mobile-dock.css')
 assert.match(dock,/mobileVisualBottomGap\(/)
 assert.match(dock,/document\.body\.style\.setProperty\("--hh-unified-viewport-inset"/)
 assert.match(dock,/resetDockCorrection\(\)/)
 assert.match(css,/bottom:max\(0px,var\(--hh-unified-viewport-inset,0px\),calc\(100vh - 100dvh\)\)/)
 assert.match(css,/transform:translate3d\(-50%,0,0\)/)
 assert.match(layout,/calc\(100vh - 100dvh\)/)
 assert.match(layout,/--hh-unified-viewport-inset/)
 assert.match(dock,/hideForKeyboard/)
 assert.match(dock,/window\.addEventListener\("pageshow"/)
 assert.match(dock,/viewport\?\.addEventListener\("resize"/)
 assert.doesNotMatch(dock,/translation \+=/)
})
