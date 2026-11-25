import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Home offers three Samir intents, one composer and seven stages',()=>{
 const source=read('components/home-dialogue-entry.tsx');
 const css=read('components/home-dialogue-entry.module.css');
 for(const fragment of ['data-home-focus-grid','data-home-intent-composer','data-home-send-to-ali',
 'data-home-intent-option="talk"','data-home-stage-scroll','data-home-stage-option={index+1}'])
  assert.ok(source.includes(fragment),fragment);
 assert.doesNotMatch(source,/data-home-mode-button=/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.composerButtons \.send\{width:47px;min-width:47px;height:47px\}/);
 assert.match(css,/scroll-snap-type:x mandatory/);
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
