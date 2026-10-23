import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/business-service-browser.tsx')
const compiled=ts.transpileModule(source,{fileName:'business-service-browser.tsx',
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)
  ?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)]

function mount(locale){
  const values=[];let index=0,tree
  const offers=['free','express','full'].map((name,i)=>({
    name,price:i===0?'Free':i===1?'€50':'€100',description:name+' description',
  }))
  const mock=Object.fromEntries(['en','ru','es'].map(l=>[l,{
    offers,mentorTitle:'Goals Mentoring',mentorText:'Ongoing sessions by agreement',
  }]))
  const deps={
    react:{useState(initial){const i=index++;if(!(i in values))values[i]=initial
      return [values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next}]}},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'lucide-react':new Proxy({}, {get:(_,name)=>name}),
    'next/image':{default:'NextImage'},
    '@/components/acquisition-event-link':{AcquisitionEventLink:'TrackedLink'},
    '@/data/business-consulting-copy':{businessConsultingCopy:mock},
    './business-service-browser.module.css':{default:new Proxy({}, {get:(_,name)=>name})},
  }
  const context={exports:{},require:name=>{assert.ok(deps[name],name);return deps[name]}}
  vm.runInNewContext(compiled,context)
  const render=()=>{index=0;tree=context.exports.BusinessServiceBrowser({locale})}
  render()
  return{render,get tree(){return tree},
    find:(attribute,value)=>nodes(tree).find(n=>n.props?.[attribute]===value),
    many:attribute=>nodes(tree).filter(n=>attribute in (n.props||{})),
  }
}

test('catalog reuses legitimate service titles and excludes invented price promises',()=>{
  assert.match(source,/businessConsultingCopy\[locale\]\.offers/)
  assert.match(source,/format:'free'/)
  assert.match(source,/format:'express'/)
  assert.match(source,/format:'full'/)
  assert.match(source,/format:'mentoring'/)
  assert.match(source,/services\/systemic-constellations/)
  assert.match(source,/services\/imagery-therapy/)
  assert.doesNotMatch(source,/guaranteed revenue|instant healing|checkout|payment_received|lead_created/)
})

for(const locale of ['en','ru','es']){
  test('collapsed filter, three cards, next three, reset and correct handoffs ('+locale+')',()=>{
    const h=mount(locale)
    assert.equal(h.find('data-business-service-filter',true).props.open,false)
    assert.equal(h.many('data-business-service-card').length,3)
    assert.ok(h.find('data-business-service-card','free'))
    assert.ok(h.find('data-business-service-card','express'))
    assert.ok(h.find('data-business-service-card','full'))
    const buttons=nodes(h.tree).filter(n=>n.props?.attributes?.['data-business-direct-option'])
    assert.deepEqual(buttons.map(b=>b.props.attributes['data-business-direct-option']),['free','express','full'])
    assert.ok(buttons.every(b=>b.props.href==='#business-direct-request'))
    h.find('data-business-show-more',true).props.onClick()
    h.render()
    assert.equal(h.many('data-business-service-card').length,6)
    assert.ok(h.find('data-business-service-card','mentoring'))
    assert.ok(h.find('data-business-service-card','constellations'))
    assert.ok(h.find('data-business-service-card','imagery'))
    const detail=nodes(h.tree).filter(n=>n.props?.attributes?.['data-business-service-details'])
    assert.equal(detail.length,2)
    assert.ok(detail.every(x=>x.props.href.startsWith('/'+locale+'/services/')))
    h.find('data-service-filter-topic','income').props.onClick()
    h.render()
    assert.equal(h.many('data-business-service-card').length,2)
    h.find('data-service-filter-format','other').props.onClick()
    h.render()
    assert.equal(h.many('data-business-service-card').length,0)
    assert.ok(nodes(h.tree).some(n=>n.props?.role==='status'))
    h.find('data-service-filter-topic','all').props.onClick()
    h.render()
    assert.equal(h.many('data-business-service-card').length,2)
    h.find('data-service-filter-format','all').props.onClick()
    h.render()
    assert.equal(h.many('data-business-service-card').length,3)
    assert.ok(h.find('data-business-show-more',true))
  })
}

test('photo-left compact service selection keeps the first three offers visible and accessible',()=>{
  const css=read('components/business-service-browser.module.css')
  assert.match(css,/\.cardMedia\{position:relative/)
  assert.match(css,/height:clamp\(122px,19svh,170px\)/)
  assert.match(css,/height:clamp\(108px,17svh,125px\)/)
  assert.match(css,/@media\(max-width:760px\)/)
  assert.match(css,/\.titleSmall\{display:inline\}/)
  assert.match(css,/\.kicker\{display:none\}/)
  for(const locale of ['en','ru','es']){
    const h=mount(locale)
    const photos=['free','express','full'].map(kind=>h.find('data-business-service-photo',kind))
    assert.ok(photos.every(Boolean))
    assert.deepEqual(photos.map(photo=>nodes(photo).find(node=>node.type==='NextImage')?.props?.alt),['','',''])
    const actions=nodes(h.tree).filter(n=>n.props?.attributes?.['data-business-direct-option'])
    assert.ok(actions.every(link=>link.props.href==='#business-direct-request'))
    assert.ok(actions.every(link=>nodes(link).some(node=>node.props?.['aria-hidden']===true)))
  }
  assert.match(source,/compactOffers\[locale\]/)
  assert.match(source,/servicePhotos\[item\.id\]/)
  assert.match(source,/andy-384-37fe593841e3\.webp/)
  assert.match(source,/loading="lazy" unoptimized/)
  assert.doesNotMatch(source,/lead_created|payment_received|contact_whatsapp_click/)
})
