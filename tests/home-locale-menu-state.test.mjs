import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8')
const helper=source.match(/async function chooseHomeLocale\(page, locale\) \{[\s\S]*?\n\}/)?.[0]
assert.ok(helper)
for(const initialOpen of [false,true])test('language selection respects restored native menu open='+initialOpen,async()=>{
 let open=initialOpen, toggles=0, clicks=0
 const trigger={async click(){toggles++;open=!open}}
 const link={async click(){assert.equal(open,true);clicks++}}
 const menu={async evaluate(fn){return fn({open})},locator(selector){return selector==='.site-language-menu-trigger'?trigger:link}}
 const page={locator(selector){assert.equal(selector,'.site-language-menu');return menu}}
 const expect=target=>({async toHaveCount(n){assert.equal(n,1)},async toHaveAttribute(name,value){if(target===menu){assert.equal(name,'open');assert.equal(open,true)}else{assert.equal(name,'href');assert.equal(value,'/')}}})
 const run=new Function('expect','homePath',helper+';return chooseHomeLocale')(expect,locale=>locale==='en'?'/':'/ru')
 await run(page,'en');assert.equal(toggles,initialOpen?0:1);assert.equal(clicks,1)
})
