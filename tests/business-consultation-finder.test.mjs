import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {
  BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_OUTCOMES, BUSINESS_FINDER_FORMATS,
  suggestBusinessConsultation,
} from '../lib/business-consulting/consultation-finder.js'
import * as questionGuide from '../lib/business-consulting/question-guide.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('approved editorial matching retains existing CRM formats',()=>{
  const expected = {gentle:'free','one-step':'express',deeper:'full',ongoing:'mentoring'}
  for(const [area,issues] of Object.entries(BUSINESS_FINDER_ISSUES)){
    for(const issue of issues)for(const outcome of BUSINESS_FINDER_OUTCOMES){
      const format = suggestBusinessConsultation({area,issue,outcome})
      assert.ok(BUSINESS_FINDER_FORMATS.includes(format))
      if(!['team','partnership'].includes(issue)||outcome!=='one-step')
        assert.equal(format,expected[outcome])
    }
  }
  assert.equal(suggestBusinessConsultation({area:'money',issue:'not-real'}),null)
  assert.equal(suggestBusinessConsultation({area:'medical',issue:'diagnosis'}),null)
})

test('business questions map to the existing truthful free and paid consultation paths',()=>{
  assert.equal(suggestBusinessConsultation({area:'business',issue:'decisions'}),'express')
  assert.equal(suggestBusinessConsultation({area:'money',issue:'income'}),'express')
  assert.equal(suggestBusinessConsultation({area:'project',issue:'stuck'}),'full')
})

test('Business hero uses a private question composer and keeps the existing consent-bound CRM handoff',()=>{
  const source=read('components/business-consultation-finder.tsx')
  const selector=read('components/topic-journey-selector.tsx')
  const css=read('components/business-consultation-finder.module.css')
  const enquiry=read('components/business-website-enquiry.tsx')
  assert.match(selector,/<BusinessConsultationFinder locale=\{language\}/)
  assert.match(source,/data-business-consultation-finder/)
  assert.match(source,/data-business-finder-step="question"/)
  assert.match(source,/data-business-question-input/)
  assert.match(source,/data-business-question-submit/)
  assert.match(source,/maxLength=\{400\}/)
  assert.match(source,/data-business-quick-idea/)
  assert.match(source,/data-business-finder-result/)
  assert.match(source,/data-business-finder-reset/)
  assert.match(source,/href="#business-direct-request"/)
  assert.match(source,/services\/free-situation-review\?topic=business/)
  assert.match(source,/data-business-result-path="free"/)
  assert.match(source,/data-business-result-path="paid"/)
  assert.match(source,/data-business-direct-option/)
  assert.match(source,/data-business-finder-context/)
  assert.match(source,/businessConsultingCopy\[locale\]\.offers/)
  assert.match(enquiry,/data-business-finder-context/)
  assert.match(enquiry,/contactConsent:consent/)
  assert.match(enquiry,/type="checkbox" required/)
  assert.match(enquiry,/\/api\/services\/business-consulting/)
  assert.match(css,/\.questionInput\{/)
  assert.match(css,/\.submit\{/)
  assert.match(css,/\.primary\{/)
  assert.match(css,/\.freePrimary\{/)
  assert.match(css,/\.ways\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(source,/fetch\(|localStorage|sessionStorage|accountId|clientId|testResults|diagnose\(/)
  for(const locale of ['en','ru','es'])assert.match(source,new RegExp('\\b'+locale+': \\{'))
})

const compiled = ts.transpileModule(read('components/business-consultation-finder.tsx'),{
  fileName:'business-consultation-finder.tsx',compilerOptions:{
    jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  },
}).outputText
const nodes = tree => !tree||typeof tree!=='object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree,...nodes(tree.props?.children)]

function mount(locale){
  const values=[];let index=0,tree
  const offers=['free','express','full'].map((kind,i)=>({
    name:kind,price:i===0?'Free':i===1?'€50':'€100',description:kind,
  }))
  const mocks=Object.fromEntries(['en','ru','es'].map(l=>[l,{
    offers,mentorTitle:'mentoring',mentorText:'mentoring',
  }]))
  const deps={
    react:{useState(initial){const i=index++;if(!(i in values))values[i]=initial
      return [values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next}]}},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'lucide-react':new Proxy({}, {get:(_,name)=>name}),
    '@/components/acquisition-event-link':{AcquisitionEventLink:'TrackedLink'},
    '@/data/business-consulting-copy':{businessConsultingCopy:mocks},
    '@/lib/business-consulting/consultation-finder':{BUSINESS_FINDER_FORMATS,suggestBusinessConsultation},
    '@/lib/business-consulting/question-guide':questionGuide,
    './business-consultation-finder.module.css':{default:new Proxy({}, {get:(_,name)=>name})},
  }
  const ctx={exports:{},require:name=>{assert.ok(deps[name],name);return deps[name]}}
  vm.runInNewContext(compiled,ctx)
  const render=()=>{index=0;tree=ctx.exports.BusinessConsultationFinder({locale})}
  render()
  return{render,get tree(){return tree},
    find:(attribute,value)=>nodes(tree).find(n=>n.props?.[attribute]===value),
    many:attribute=>nodes(tree).filter(n=>attribute in (n.props||{})),
  }
}

for(const locale of ['en','ru','es']){
  test('question leads to contextual idea plus real free and paid paths ('+locale+')',()=>{
    for(const [question,expected,topic] of [
      ['I procrastinate and cannot focus','express','focus'],
      ['I need a more stable income','express','money'],
      ['I want to launch a business','full','start'],
    ]){
      const h=mount(locale)
      assert.ok(h.find('data-business-finder-step','question'))
      assert.equal(h.many('data-business-need').length,0)
      assert.equal(h.find('data-business-finder-result',true),undefined)
      h.find('data-business-question-input',true).props.onChange({target:{value:question}})
      h.render()
      h.find('data-business-finder-step','question').props.onSubmit({preventDefault(){}})
      h.render()
      assert.ok(h.find('data-business-finder-result',true))
      assert.ok(h.find('data-business-quick-idea',true))
      assert.equal(h.find('data-business-finder-step','question'),undefined)
      assert.deepEqual(h.many('data-business-result-path').map(n=>n.props['data-business-result-path']),['free','paid'])
      const free=nodes(h.tree).find(n=>n.props?.attributes?.['data-business-finder-start']==='free-review')
      assert.equal(free.props.href,'/'+locale+'/services/free-situation-review?topic=business')
      assert.equal(free.props.attributes['data-business-direct-option'],undefined)
      const paid=nodes(h.tree).find(n=>n.props?.attributes?.['data-business-finder-start']==='website-form')
      assert.equal(paid.props.href,'#business-direct-request')
      assert.equal(paid.props.attributes['data-business-direct-option'],expected)
      assert.ok(paid.props.attributes['data-business-finder-context'].length>8)
      assert.ok(!paid.props.attributes['data-business-finder-context'].includes(question))
      const alternate=expected==='express'?'full':'express'
      h.find('data-business-format-choice',alternate).props.onClick()
      h.render()
      const changed=nodes(h.tree).find(n=>n.props?.attributes?.['data-business-finder-start']==='website-form')
      assert.equal(changed.props.attributes['data-business-direct-option'],alternate)
      assert.equal(h.many('data-business-result-path').length,2)
      h.find('data-business-finder-reset',true).props.onClick()
      h.render()
      assert.equal(typeof h.find('data-business-finder-step','question').props.onSubmit,'function')
      assert.equal(h.find('data-business-question-input',true).props.value,question)
      assert.equal(h.find('data-business-finder-result',true),undefined)
      assert.ok(questionGuide.BUSINESS_QUESTION_TOPICS.includes(topic))
    }
  })
  test('too-short question displays an inline error without submitting or routing ('+locale+')',()=>{
    const h=mount(locale)
    h.find('data-business-finder-step','question').props.onSubmit({preventDefault(){}})
    h.render()
    assert.ok(nodes(h.tree).some(n=>n.props?.role==='alert'))
    assert.equal(h.find('data-business-finder-result',true),undefined)
  })
}
