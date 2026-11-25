import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {isUnifiedMobileDockAppPath,isUnifiedMobileDockPath,unifiedMobileDockActive} from '../lib/unified-mobile-dock.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('standalone vectors and public tests use the existing cabinet skin',()=>{
 assert.match(read('app/[locale]/development-vectors/page.jsx'),/cabinet-theme\.css/)
 assert.match(read('app/[locale]/client/layout.jsx'),/cabinet-theme\.css/)
 assert.match(read('app/[locale]/tests/page.tsx'),/cabinet-theme\.css/)
 assert.match(read('components/app/development-vectors.jsx'),/data-daybook-vectors data-cabinet-theme="daybook"/)
 assert.match(read('components/app/development-vectors.jsx'),/className=\{styles\.stageLink\}/)
 assert.match(read('app/[locale]/client/tests/page.tsx'),/className="client-entry-shell" data-cabinet-theme="daybook"/)
 const theme=read('app/[locale]/app/cabinet-theme.css')
 assert.match(theme,/main\.client-entry-shell/)
 assert.match(theme,/main\[data-free-entry-landing="tests"\]/)
 assert.match(theme,/\[data-hh-ihelp-trigger\]/)
 assert.match(read('components/app/development-vectors.module.css'),/\.stageLink,\.save\{display:flex/)
 assert.match(read('components/app/development-vector-wheel.module.css'),/--hh-cabinet-card/)
})
test('use one existing profile dock on the exact vectors route; do not include private documents or immersive test runs',()=>{
 for(const locale of ['en','ru','es']){
  const path='/'+locale+'/development-vectors'
  assert.equal(isUnifiedMobileDockAppPath(path),true)
  assert.equal(unifiedMobileDockActive(path),'profile')
  assert.equal(isUnifiedMobileDockPath(path),true)
  assert.equal(isUnifiedMobileDockPath('/'+locale+'/development-vectors/invalid'),false)
  for(const suffix of ['tests','client','client/tests'])assert.equal(unifiedMobileDockActive('/'+locale+'/'+suffix),null)
  assert.equal(isUnifiedMobileDockPath('/'+locale+'/client/private-record'),false)
  assert.equal(isUnifiedMobileDockPath('/'+locale+'/app/runs'),false)
 }
})

test('legacy balance and life-context panels inherit the approved private theme',()=>{
 for(const path of ['components/app/my-inner-balance-preview.module.css','components/app/client-life-context-editor.module.css']){
   const css=read(path)
   assert.ok(css.includes('[data-cabinet-theme="daybook"]'),path)
   assert.ok(css.includes('var(--hh-cabinet-card)'),path)
   assert.ok(css.includes('var(--hh-cabinet-border)'),path)
   assert.ok(css.includes('var(--hh-cabinet-primary)'),path)
 }
})
