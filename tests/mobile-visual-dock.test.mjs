import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mobileVisualBottomGap,visualDockBottomCorrection,visualDockBottomOffset,visualKeyboardOpen} from '../lib/mobile-visual-bottom.mjs'

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
test('Messages and protected Practice share one global viewport-aware dock',()=>{
 const nav=read('components/unified-mobile-dock.tsx')
 const css=read('app/unified-mobile-dock.css')
 const messageCss=read('app/[locale]/app/messages/messages-page.css')
 const route=read('app/[locale]/app/messages/page.tsx')
 assert.ok(!route.includes('MessagesBottomNavigation'))
 for(const token of ['visualKeyboardOpen','visualViewport',
   'ResizeObserver','orientationchange','pageshow',
   'messengerPage.dataset.hhMobileKeyboardOpen'])
   assert.ok(nav.includes(token),token)
 assert.ok(css.includes('--hh-unified-nav-height'))
 assert.ok(css.includes('data-keyboard-open="true"'))
 assert.ok(messageCss.includes('[data-hh-unified-dock]'))
 assert.ok(messageCss.includes('data-hh-mobile-keyboard-open="true"'))
 assert.ok(!messageCss.includes(':has(input:focus,textarea:focus)'))
})

test('keyboard detection does not mistake Safari toolbar for iOS keyboard',()=>{
 assert.equal(visualKeyboardOpen({editing:false,layoutHeight:844,visualHeight:470,lastUnfocusedVisualHeight:780}),false)
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:844,visualHeight:760,lastUnfocusedVisualHeight:780}),false)
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:844,visualHeight:720,visualOffsetTop:45,lastUnfocusedVisualHeight:775}),false)
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:844,visualHeight:510,lastUnfocusedVisualHeight:775}),true)
 // Embedded browsers can shrink both layout viewport and visual viewport.
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:470,visualHeight:470,lastUnfocusedVisualHeight:780}),true)
 assert.equal(visualKeyboardOpen({editing:true,layoutHeight:470,visualHeight:NaN,lastUnfocusedVisualHeight:780}),false)
})

test('unified seven-item dock uses idempotent signed correction for iOS Safari',()=>{
 // Modern WebKit already anchors the fixed dock to the visual viewport.
 assert.equal(visualDockBottomCorrection({dockBottom:720,visualBottom:720}),0)
 // Older Safari anchors fixed layers to the layout viewport.
 assert.equal(visualDockBottomCorrection({dockBottom:844,visualBottom:720}),124)
 // The next scroll/resize pass must NOT accumulate another 124px.
 assert.equal(visualDockBottomCorrection({dockBottom:720,visualBottom:720,currentInset:124}),124)
 // Collapsing the toolbar restores bottom:0 instead of leaving a floating bar.
 assert.equal(visualDockBottomCorrection({dockBottom:720,visualBottom:844,currentInset:124}),0)
 // Safari may switch fixed positioning strategy during toolbar animations.
 assert.equal(visualDockBottomCorrection({dockBottom:596,visualBottom:720,currentInset:124}),0)
 assert.equal(visualDockBottomCorrection({dockBottom:844,visualBottom:420}),320)
 assert.equal(visualDockBottomCorrection({dockBottom:NaN,visualBottom:720}),0)
 // The real owner bug: the fixed dock can remain ABOVE the screen bottom.
 assert.equal(visualDockBottomOffset({dockBottom:600,visualBottom:844}),-244)
 assert.equal(visualDockBottomOffset({dockBottom:844,visualBottom:844,currentOffset:-244}),-244)
 // Safari toolbar closes, or the engine reanchors to its own visual edge.
 assert.equal(visualDockBottomOffset({dockBottom:720,visualBottom:844,currentOffset:124}),0)
 assert.equal(visualDockBottomOffset({dockBottom:596,visualBottom:720,currentOffset:124}),0)
 assert.equal(visualDockBottomOffset({dockBottom:844,visualBottom:720}),124)
 assert.equal(visualDockBottomOffset({dockBottom:720,visualBottom:720,currentOffset:124}),124)
 assert.equal(visualDockBottomOffset({dockBottom:1200,visualBottom:700}),320)
 assert.equal(visualDockBottomOffset({dockBottom:200,visualBottom:700}),-320)
 assert.equal(visualDockBottomOffset({dockBottom:NaN,visualBottom:700}),0)
 const dock=read('components/unified-mobile-dock.tsx')
 const css=read('components/unified-mobile-dock.module.css')
 const reservation=read('app/unified-mobile-dock.css')
 assert.match(dock,/visualDockBottomOffset/)
 assert.doesNotMatch(dock,/--hh-unified-viewport-inset/)
 assert.match(dock,/addEventListener\("scroll", update/)
 assert.match(dock,/viewport\?\.addEventListener\("scroll", update/)
 assert.match(dock,/removeEventListener\("scroll", update/)
 assert.match(dock,/visualKeyboardOpen/)
 assert.match(dock,/getBoundingClientRect\(\)/)
 assert.match(dock,/visualViewport/)
 assert.match(dock,/data-keyboard-open/)
 assert.match(dock,/orientationchange/)
 // Remove the GPU translate3d: center without creating a transformed fixed layer.
 assert.match(css,/position:fixed;z-index:58;bottom:0;/)
 assert.match(css,/left:0;right:0;margin-inline:auto/)
 assert.doesNotMatch(css,/translate3d/)
 assert.match(css,/safe-area-inset-bottom/)
 assert.doesNotMatch(css,/--hh-unified-viewport-inset/)
 assert.doesNotMatch(css,/100vh\s*-\s*100dvh|bottom:max\(/)
 assert.doesNotMatch(reservation,/100vh\s*-\s*100dvh|--hh-unified-viewport-inset/)
 assert.match(reservation,/--hh-unified-nav-height/)
 assert.match(reservation,/data-keyboard-open="true"/)
})


test('signed visual dock helper has matching TypeScript declaration',()=>{
 const declaration=read('lib/mobile-visual-bottom.d.mts')
 const implementation=read('lib/mobile-visual-bottom.mjs')
 assert.match(declaration,/export interface VisualDockBottomOffsetInput/)
 for(const field of ['dockBottom?: number;','visualBottom?: number;','currentOffset?: number;'])
   assert.ok(declaration.includes(field),'typed visual dock offset '+field)
 assert.match(declaration,/export declare function visualDockBottomOffset\(input\?: VisualDockBottomOffsetInput\): number;/)
 assert.match(implementation,/export function visualDockBottomOffset\(/)
});
