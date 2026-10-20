import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {
  BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_OUTCOMES, BUSINESS_FINDER_FORMATS,
  suggestBusinessConsultation,
} from '../lib/business-consulting/consultation-finder.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('existing editorial matching remains valid for all original approved formats', () => {
  const expected = {gentle:'free','one-step':'express',deeper:'full',ongoing:'mentoring'}
  for(const [area,issues] of Object.entries(BUSINESS_FINDER_ISSUES)){
    for(const issue of issues) for(const outcome of BUSINESS_FINDER_OUTCOMES){
      const format = suggestBusinessConsultation({area,issue,outcome})
      assert.ok(BUSINESS_FINDER_FORMATS.includes(format))
      if(!['team','partnership'].includes(issue) || outcome!=='one-step')
        assert.equal(format,expected[outcome])
    }
  }
  assert.equal(suggestBusinessConsultation({area:'money',issue:'not-real'}),null)
  assert.equal(suggestBusinessConsultation({area:'medical',issue:'diagnosis'}),null)
})

test('one simple public choice uses only existing legitimate business intake formats',()=>{
  assert.equal(suggestBusinessConsultation({area:'business',issue:'decisions'}),'express')
  assert.equal(suggestBusinessConsultation({area:'money',issue:'income'}),'express')
  assert.equal(suggestBusinessConsultation({area:'project',issue:'stuck'}),'full')
})

test('Business first-screen finder reuses consent-bound CRM handoff in all locales',()=>{
  const source=read('components/business-consultation-finder.tsx')
  const selector=read('components/topic-journey-selector.tsx')
  const css=read('components/business-consultation-finder.module.css')
  const enquiry=read('components/business-website-enquiry.tsx')
  assert.match(selector,/<BusinessConsultationFinder locale=\{language\}/)
  assert.match(source,/data-business-consultation-finder/)
  assert.match(source,/data-business-finder-step="need"/)
  assert.match(source,/data-business-need=\{key\}/)
  assert.match(source,/data-business-finder-result/)
  assert.match(source,/data-business-finder-reset/)
  assert.match(source,/href="#business-direct-request"/)
  assert.match(source,/data-business-direct-option/)
  assert.match(source,/data-business-finder-context/)
  assert.match(source,/businessConsultingCopy\[locale\]\.offers/)
  assert.match(enquiry,/data-business-finder-context/)
  assert.match(enquiry,/contactConsent:consent/)
  assert.match(enquiry,/type="checkbox" required/)
  assert.match(enquiry,/\/api\/services\/business-consulting/)
  assert.match(css,/\.choice\{/)
  assert.match(css,/\.primary\{/)
  assert.doesNotMatch(source,/fetch\(|localStorage|sessionStorage|accountId|clientId|testResults|diagnose\(/)
  for(const locale of ['en','ru','es']) assert.match(source,new RegExp('\\b'+locale+': \\{'))
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
  const aliases={
    react:{useState(initial){const i=index++;if(!(i in values))values[i]=initial
      return [values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next}]}},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'lucide-react':new Proxy({}, {get:(_,name)=>name}),
    '@/components/acquisition-event-link':{AcquisitionEventLink:'TrackedLink'},
    '@/data/business-consulting-copy':{businessConsultingCopy:mocks},
    '@/lib/business-consulting/consultation-finder':{BUSINESS_FINDER_FORMATS,suggestBusinessConsultation},
    './business-consultation-finder.module.css':{default:new Proxy({}, {get:(_,name)=>name})},
  }
  const context={exports:{},require:name=>{assert.ok(aliases[name],name);return aliases[name]}}
  vm.runInNewContext(compiled,context)
  const render=()=>{index=0;tree=context.exports.BusinessConsultationFinder({locale})}
  render()
  return {render,get tree(){return tree},
    find:(attribute,value)=>nodes(tree).find(n=>n.props?.[attribute]===value),
    many:attribute=>nodes(tree).filter(n=>attribute in (n.props||{})),
  }
}

for(const locale of ['en','ru','es']){
  test('one tap gives a real business offer; user can change format and restart ('+locale+')',()=>{
    for(const [choice,expected] of [['clarity','express'],['income','express'],['growth','full']]){
      const h=mount(locale)
      assert.equal(h.many('data-business-need').length,3)
      assert.ok(h.find('data-business-finder-step','need'))
      assert.equal(h.find('data-business-finder-result',true),undefined)
      h.find('data-business-need',choice).props.onClick()
      h.render()
      assert.ok(h.find('data-business-finder-result',true))
      assert.equal(h.find('data-business-finder-step','need'),undefined)
      const cta=nodes(h.tree).find(n=>n.props?.attributes?.['data-business-finder-start']==='website-form')
      assert.equal(cta.props.href,'#business-direct-request')
      assert.equal(cta.props.attributes['data-business-direct-option'],expected)
      assert.ok(cta.props.attributes['data-business-finder-context'].length>8)
      h.find('data-business-format-choice','free').props.onClick()
      h.render()
      const changed=nodes(h.tree).find(n=>n.props?.attributes?.['data-business-finder-start']==='website-form')
      assert.equal(changed.props.attributes['data-business-direct-option'],'free')
      h.find('data-business-finder-reset',true).props.onClick()
      h.render()
      assert.equal(h.many('data-business-need').length,3)
      assert.equal(h.find('data-business-finder-result',true),undefined)
    }
  })
}
