import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Home shows Ali entry with four real choices in compact first mobile viewport',()=>{
 const source=read('components/home-dialogue-entry.tsx')
 const css=read('components/home-dialogue-entry.module.css')
 assert.match(source,/data-home-free-review/)
 assert.match(source,/data-home-focus-grid/)
 assert.match(source,/data-home-intent-composer/)
 assert.match(source,/data-home-send-to-ali/)
 assert.match(source,/data-home-mode-button="business"/)
 assert.match(css,/@media \(max-width:430px\)/)
 assert.match(css,/\.composer\{display:flex;flex-direction:row;align-items:center;/)
 assert.match(css,/\.composerButtons button\{width:44px;height:44px;/)
 assert.match(css,/\.focusCard\{min-height:72px;/)
 assert.match(css,/scroll-margin-bottom:calc\(var\(--ia222-bottom-height,100px\)/)
})
test('iHelp never obscures Home mode tabs on mobile; shared AI remains available',()=>{
 const css=read('components/sitewide-ihelp.module.css')
 const source=read('components/sitewide-ihelp.tsx')
 assert.match(css,/:global\(body:has\(\[data-home-dialogue-entry\]\)\) \.launcher\{display:none!important\}/)
 assert.match(source,/data-hh-ihelp-trigger/)
})
test('Canonical My Space maintains real photo cards and bright scenic hero',()=>{
 const css=read('components/app/profile-space-dashboard.module.css')
 const source=read('components/app/profile-space-dashboard.jsx')
 assert.match(css,/reiki-approved-sunrise-v3\.webp/)
 assert.match(css,/profile-card-photos\.webp/)
 assert.match(css,/\.cardArrow\{top:auto;right:8px;bottom:8px;/)
 for(const id of ['state','courses','reports','sessions']){
   assert.match(source,new RegExp("id: '"+id+"'"))
 }
 assert.match(source,/data-profile-my-page/)
 assert.match(source,/data-profile-settings-link/)
 assert.match(source,/data-profile-space-path/)
})
