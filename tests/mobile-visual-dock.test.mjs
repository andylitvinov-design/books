import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mobileVisualBottomGap} from '../lib/mobile-visual-bottom.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('iPhone Safari toolbar geometry repositions a fixed dock only into the visible viewport',()=>{
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:720}),124)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:720,visualOffsetTop:40}),84)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:844}),0)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:866}),0)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:420}),320)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:NaN}),0)
 assert.equal(mobileVisualBottomGap({layoutHeight:0,visualHeight:700}),0)
 assert.equal(mobileVisualBottomGap({layoutHeight:844,visualHeight:700,visualOffsetTop:-200}),144)
})
test('Messages and protected Practice share one viewport-aware dock rather than extra overlay menus',()=>{
 const nav=read('components/app/messages-bottom-navigation.jsx')
 const css=read('app/[locale]/app/[[...path]]/workspace.css')
 const messageCss=read('app/[locale]/app/messages/messages-page.css')
 assert.match(nav,/use client/)
 assert.match(nav,/mobileVisualBottomGap/)
 assert.match(nav,/visualViewport/)
 assert.match(nav,/ResizeObserver/)
 assert.match(nav,/orientationchange/)
 assert.match(nav,/pageshow/)
 assert.match(nav,/--hh-app-visual-bottom-inset/)
 assert.match(nav,/--hh-app-mobile-nav-height/)
 assert.match(css,/--hh-app-dock-usable-inset/)
 assert.match(css,/calc\(100vh - 100dvh\)/)
 assert.match(css,/bottom:var\(--hh-app-dock-usable-inset\)/)
 assert.match(css,/data-editor-focused/)
 assert.match(messageCss,/--hh-app-dock-usable-inset/)
 assert.match(messageCss,/data-detail-open="true"/)
 assert.match(messageCss,/input:focus,textarea:focus/)
})
