import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('mobile navigation display uses the same 760px breakpoint as desktop hiding', () => {
  const css = postcss.parse(read('app/[locale]/app/[[...path]]/workspace.css'))
  const visibleRules=[]
  css.walkRules(rule => {
    if (rule.selector !== '.hh-app .hh-mobile-app-nav' && rule.selector !== '.hh-mobile-app-nav') return
    rule.walkDecls('display', decl => {
      if (decl.value === 'none') return
      assert.equal(rule.parent.type, 'atrule')
      assert.equal(rule.parent.name, 'media')
      assert.match(rule.parent.params, /^\(max-width:\s*760px\)$/)
      visibleRules.push(rule)
    })
  })
  assert.ok(visibleRules.length >= 2)
  assert.match(css.toString(), /@media\(max-width:760px\)\{[^}]+\}[^}]*\.hh-app \.hh-nav\{display:none!important\}/)
})
test('rating star sizes override generic account-button padding without clipping content', () => {
  const css=postcss.parse(read('components/app/test-rating-card.module.css'))
  const rules=[];css.walkRules(rule=>rules.push(rule))
  const star=rules.find(rule=>rule.selector === '.stars .star')
  assert.ok(star,'two-class selector wins over the generic .hh-app button rule')
  const values=Object.fromEntries(star.nodes.map(n=>[n.prop,n.value]))
  assert.equal(values.padding,'0');assert.equal(values.width,'42px');assert.equal(values.flex,'0 0 42px')
  assert.ok(Number.parseFloat(values['min-height'])>=44)
  const row=rules.find(rule=>rule.selector === '.stars')
  assert.ok(row.nodes.some(n=>n.prop==='flex-wrap'&&n.value==='wrap'))
  assert.ok(row.nodes.some(n=>n.prop==='max-width'&&n.value==='100%'))
  assert.doesNotMatch(css.toString(), /overflow\s*:\s*(?:hidden|clip)/)
})
test('isolated database includes the existing social-proof migration after foundational fixture setup', () => {
  const source=read('tests/helpers/app-db-setup.mjs')
  const name='20261017183000_hh_test_catalog_social_proof.sql'
  assert.equal(source.split(name).length-1,1)
  assert.ok(source.indexOf(name)>source.indexOf('assertIsolated()'))
  assert.ok(source.indexOf(name)>source.indexOf('20261017122000_hh_practitioner_service_funnel_daily.sql'))
})
test('homepage marketing destinations load on explicit navigation, not speculative RSC fetches', async () => {
 const ts = (await import('typescript')).default
 for(const file of ['components/holistic-house-home.tsx','components/services-solutions.tsx']){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length,0)
  let links=0
  function visit(node){
   if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&['Link','AcquisitionEventLink'].includes(node.tagName.getText(ast))){
    const attribute=node.attributes.properties.find(item=>item.name?.getText(ast)==='prefetch')
    assert.ok(attribute,file+' link must explicitly disable speculative fetching')
    assert.equal(attribute.initializer.getText(ast),'{false}');links++
   }
   ts.forEachChild(node,visit)
  }
  visit(ast);assert.ok(links>=4)
 }
})
