import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import postcss from 'postcss'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const css=read('components/energywork-ai-learner.module.css')
const learner=read('components/energywork-ai-learner.tsx')
const verifier=read('scripts/verify-reiki-all-slides-browser.mjs')
const {parse}=createRequire(import.meta.url)('next/dist/compiled/babel/parser')
const prefix='.page[data-course-portrait="v3"] .experienceSlide '

function shortSpacing(source){
  const result={}
  postcss.parse(source).walkRules(rule=>{
    if(![prefix+'.question',prefix+'.experienceGuidance'].includes(rule.selector))return
    if(rule.parent.type!=='atrule'||rule.parent.name!=='media'||
      rule.parent.params.replace(/\s/g,'')!=='(max-width:760px)and(max-height:700px)')return
    const name=rule.selector.endsWith('.question')?'question':'guidance'
    result[name]??={}
    for(const node of rule.nodes)if(node.type==='decl')result[name][node.prop]=node.value
  })
  return result
}
function assertShortSpacing(source){
  const spacing=shortSpacing(source)
  assert.deepEqual(spacing.question,{'margin-top':'5px',padding:'6px 10px'})
  assert.deepEqual(spacing.guidance,{padding:'4px 9px','margin-top':'4px'})
  // Ten pixels less non-text spacing than the hosted failing state: question
  // padding 16→12, guidance padding 12→8, guidance margin 6→4. This is a CSS
  // contract, not a claim that a browser has measured the patched layout.
  assert.equal(2*6+2*4+4,24)
}

test('short-phone experience panel reserves guidance space without changing text or radio sizing',()=>{
  assertShortSpacing(css)
  assert.match(learner,/<p className=\{styles\.experienceGuidance\} role="status">\{experienceGuidance\[locale\]\[answers\[slide\.id\]\]\}<\/p>/)
  assert.match(css,/\.experienceChoice:has\(input:focus-visible\)\s*\{\s*outline:3px solid/)
  assert.match(css,/\.experienceSlide \.experienceChoice \{\s*min-height: 46px;\s*padding: 6px 9px;/)
  assert.match(css,/\.experienceSlide \.experienceGuidance \{\s*margin-top: 7px; padding: 8px 10px;\s*font-size: 12\.5px; line-height: 1\.34;/)
})

for(const [name,before,after] of [
  ['old question padding','padding: 6px 10px;','padding: 8px 10px;'],
  ['old guidance padding','padding: 4px 9px;','padding: 6px 9px;'],
  ['old guidance margin','margin-top: 4px;','margin-top: 6px;'],
  ['hidden guidance','padding: 4px 9px;','padding: 4px 9px; display: none;'],
  ['shrunk guidance type','padding: 4px 9px;','padding: 4px 9px; font-size: 9px;'],
])test('short-spacing contract rejects '+name,()=>{
  assert.ok(css.includes(before))
  assert.throws(()=>assertShortSpacing(css.replaceAll(before,after)),assert.AssertionError)
})

function expectFits(source,dimensions){
  const matches=[]
  const visit=node=>{
    if(!node||typeof node!=='object')return
    if(node.type==='FunctionDeclaration'&&node.id?.name==='expectFits')matches.push(node)
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value)
  }
  visit(parse(source,{sourceType:'module'}));assert.equal(matches.length,1)
  const page={locator:()=>({evaluate:async()=>structuredClone(dimensions)})}
  const expect=()=>({toHaveAttribute:async(name,id)=>{assert.equal(name,'data-energywork-slide-id');assert.equal(id,'welcome-02')}})
  const node=matches[0]
  return new Function('page','locale','assert','expect',`return (${source.slice(node.start,node.end)})`)(page,'en',assert,expect)('welcome-02')
}
// Exact reported failing Chromium geometry from hosted d6639226,375×625.
const clipped={used:411,space:387,width:375,height:625,justify:'center',panelTop:83,panelBottom:470.25,
  lastChoice:{top:389.578,bottom:440.578,height:51},
  selectedGuidance:{top:446.578,bottom:475.328,height:28.75}}

test('unchanged native verifier rejects the actual hosted clipped selected guidance',async()=>{
  await assert.rejects(expectFits(verifier,clipped),/selected experience guidance must fit after fourth option/)
  const missing={...clipped,lastChoice:null}
  await assert.rejects(expectFits(verifier,missing),/fourth radio is present/)
  assert.match(verifier,/setViewportSize\(\{width:375,height:625\}\)/)
  assert.ok(verifier.includes(`page.locator('input[name="welcome-02"][value="master"]').check()`))
  assert.ok(verifier.includes(`page.locator('input[name="welcome-02"][value="beginner"]').check()`))
})

test('native clipping acceptance remains at the existing three-pixel boundary',async()=>{
  await expectFits(verifier,{...clipped,selectedGuidance:{...clipped.selectedGuidance,bottom:473.25}})
  await assert.rejects(expectFits(verifier,{...clipped,selectedGuidance:{...clipped.selectedGuidance,bottom:473.251}}),/selected experience guidance must fit/)
})
