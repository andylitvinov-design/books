import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../components/holistic-intelligence-card.jsx',import.meta.url),'utf8')
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
const exports = {}
function resolve(name) {
  if (name.endsWith('.module.css')) return new Proxy({}, {get:(_,key)=>String(key)})
  if (name.startsWith('@/')) return require(new URL('../'+name.slice(2)+(name.endsWith('.mjs')?'':'.js'),import.meta.url).pathname)
  return require(name)
}
new Function('require','exports',js)(resolve,exports)

test('compact card begins with an explicit topic choice in each supported locale',()=>{
  for(const [locale,phrase] of [['en','Choose a topic'],['ru','Выберите тему'],['es','Elige un tema']]) {
    const html=renderToStaticMarkup(React.createElement(exports.HolisticIntelligenceCard,{locale,surface:'meditation',videos:[],publishedSourceIds:[]}))
    assert.match(html,/data-holistic-intelligence/)
    assert.ok(html.includes(phrase))
    assert.match(html,/<select[^>]*id="hh-intelligence-topic-meditation"/)
    assert.match(html,/<button[^>]*disabled/)
    assert.ok(!html.includes('I am in immediate danger'))
  }
})
test('saved coaching topic is offered only in the authenticated cabinet',()=>{
  const cabinet=renderToStaticMarkup(React.createElement(exports.HolisticIntelligenceCard,{locale:'en',surface:'cabinet'}))
  const guest=renderToStaticMarkup(React.createElement(exports.HolisticIntelligenceCard,{locale:'en',surface:'meditation',videos:[],publishedSourceIds:[]}))
  assert.ok(cabinet.includes('Use my saved coaching topic for this request'))
  assert.ok(!guest.includes('Use my saved coaching topic for this request'))
})
