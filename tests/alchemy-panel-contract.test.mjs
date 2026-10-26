import test from 'node:test'
import assert from 'node:assert/strict'
import { ALCHEMY_PANEL_IDS, assertAlchemyPanelOrder } from '../scripts/helpers/alchemy-panel-contract.mjs'

const panels = ids => ids.map(name => ({name,height:500,max:764}))
test('accepts exact ten ordered panels without altering geometry', () => {
  const measurements=panels(ALCHEMY_PANEL_IDS)
  const before=structuredClone(measurements)
  assertAlchemyPanelOrder(measurements)
  assert.deepEqual(measurements,before)
})
for (const id of ALCHEMY_PANEL_IDS) {
  test('rejects missing panel '+id, () => assert.throws(() =>
    assertAlchemyPanelOrder(panels(ALCHEMY_PANEL_IDS.filter(name => name!==id)))))
}
test('rejects duplicate panel even with count ten', () => {
  const ids=[...ALCHEMY_PANEL_IDS];ids[0]='hero'
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects wrong panel with count ten', () => {
  const ids=[...ALCHEMY_PANEL_IDS];ids[0]='unknown'
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects changed order with all correct IDs', () => {
  const ids=[...ALCHEMY_PANEL_IDS];[ids[0],ids[1]]=[ids[1],ids[0]]
  assert.throws(()=>assertAlchemyPanelOrder(panels(ids)))
})
test('rejects extra panel', () => assert.throws(()=>
  assertAlchemyPanelOrder(panels([...ALCHEMY_PANEL_IDS,'extra']))))
test('source integration retains ordered panels, expanded payments and DAO verifier', async () => {
  const {readFile}=await import('node:fs/promises')
  const script=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
  assert.match(script,/assertAlchemyPanelOrder\(measurements\)/)
  assert.match(script,/await assertAlchemyPaymentsExpanded\(servicePage,expect,width\)/)
  assert.match(script,/await verifyDaoLeadJourney\(servicePage,expect,locale\)/)
})

// Execute only the actual collapsed-panel assertion block. No browser/DOM or
// application startup is imported; hosted Chromium/WebKit are still required.
const script=await (await import('node:fs/promises')).readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
async function assertCollapsedGeometry(source, measurements, capture = async () => {}) {
  const start='     assertAlchemyPanelOrder(measurements)\n'
  const end='     await assertAlchemyPaymentsExpanded(servicePage,expect,width)'
  assert.equal(source.split(start).length,2,'One actual ordered-panel assertion block')
  assert.equal(source.split(end).length,2,'One following expanded-payment journey')
  const from=source.indexOf(start),to=source.indexOf(end,from)
  assert.ok(to>from,'The collapsed budget precedes expanded payment checks')
  return new AsyncFunction('assert','assertAlchemyPanelOrder','measurements','captureAlchemyPanelOverflow',
    'servicePage','output','locale','width','console',source.slice(from,to))(
      assert,assertAlchemyPanelOrder,measurements,capture,Object.freeze({}),
      'artifacts/unit-alchemy','en',1280,{error:()=>{}})
}
const measured=reviewHeight=>ALCHEMY_PANEL_IDS.map(name=>({name,height:name==='reviews'?reviewHeight:740,max:764}))
for(const height of [4075,4225]) test('actual main verifier admits the approved twelve-video reviews height '+height,async()=>{
  const values=measured(height),before=structuredClone(values)
  await assertCollapsedGeometry(script,values)
  assert.deepEqual(values,before,'The verifier never clamps or edits measured geometry')
})
for(const name of ALCHEMY_PANEL_IDS.filter(name=>name!=='reviews')) test('actual main verifier rejects overflow of non-review panel '+name,async()=>{
  const values=measured(4225);values.find(panel=>panel.name===name).height=765
  await assert.rejects(assertCollapsedGeometry(script,values),error=>error.code==='ERR_ASSERTION'&&error.message.includes('must fit one phone screen'))
})
test('actual main verifier preserves the inclusive exact budget for all nine other panels',async()=>{
  const values=measured(4225);for(const panel of values)if(panel.name!=='reviews')panel.height=panel.max
  await assertCollapsedGeometry(script,values)
})
for(const [name,change] of [
  ['missing reviews',values=>values.filter(panel=>panel.name!=='reviews')],
  ['renamed reviews',values=>values.map(panel=>panel.name==='reviews'?{...panel,name:'reviews-extra'}:panel)],
  ['duplicated reviews',values=>values.map(panel=>panel.name==='formats'?{...panel,name:'reviews'}:panel)],
  ['changed order',values=>[values[1],values[0],...values.slice(2)]],
]) test('actual budget cannot hide panel identity violation: '+name,async()=>{
  await assert.rejects(assertCollapsedGeometry(script,change(measured(4225))),error=>error.code==='ERR_ASSERTION'&&error.message.includes('exactly ten unique panels'))
})
for(const [name,before,after,values] of [
  ['all-panel exemption',"x.name!=='reviews'&&x.height>x.max",'false',()=>{const values=measured(4225);values[0].height=765;return values}],
  ['wrong identity exempted',"x.name!=='reviews'","x.name!=='formats'",()=>measured(4225)],
  ['inverse height predicate','x.height>x.max','x.height<x.max',()=>measured(4225)],
  ['strict boundary regression','x.height>x.max','x.height>=x.max',()=>measured(4225).map(panel=>panel.name==='reviews'?panel:{...panel,height:764})],
]) test('geometry oracle rejects meaningful verifier mutant: '+name,async()=>{
  // Mutate the original acceptance assertion, never the diagnostic-only predicate.
  const from=script.indexOf('     assert.deepEqual(measurements.filter(')
  const to=script.indexOf('     await assertAlchemyPaymentsExpanded(servicePage,expect,width)',from)
  assert.ok(from>=0&&to>from)
  const acceptance=script.slice(from,to)
  assert.equal(acceptance.split(before).length,2,'Mutation targets the one original acceptance predicate')
  const mutant=script.slice(0,from)+acceptance.replace(before,after)+script.slice(to)
  if(name==='all-panel exemption') {
    await assert.rejects(assert.rejects(assertCollapsedGeometry(mutant,values())),
      error=>error.code==='ERR_ASSERTION'&&error.message.includes('Missing expected rejection'))
  } else {
    await assert.rejects(assertCollapsedGeometry(mutant,values()),
      error=>error.code==='ERR_ASSERTION'&&error.message.includes('must fit one phone screen'))
  }
})
for(const throwing of [false,true]) test('diagnostic mutation cannot replace the original assertion, throwing='+throwing,async()=>{
  const values=measured(7325);values.find(panel=>panel.name==='formats').height=890
  const before=structuredClone(values)
  await assert.rejects(assertCollapsedGeometry(script,values,async({panelHeights})=>{
    panelHeights.find(panel=>panel.name==='formats').height=0
    if(throwing)throw new Error('synthetic diagnostic failure')
  }),error=>{
    assert.equal(error.code,'ERR_ASSERTION')
    assert.ok(error.message.includes('must fit one phone screen'))
    assert.deepEqual(error.actual,[{name:'formats',height:890,max:764}])
    assert.deepEqual(error.expected,[])
    return true
  })
  assert.deepEqual(values,before,'Diagnostic changes cannot mutate the original measurement array')
})

const reviewIds={
  en:['Dk0LBmOivQo','aUJde6A-9p0','fE6sD1zr1Js','itjo2_z2NGk','4NrryHcEF1A','hYwRNMxIMjc'],
  ru:['m9RfDgK76PU','MIVLm1GUTtM','ttQxUHopaUM','VABgpmn4ZYA','muOnIHllI7E','5oj0BIbLT4w'],
}
const reviewRows=locale=>(locale==='ru'?['ru','en']:['en','ru']).flatMap(audio=>reviewIds[audio].map(id=>({id,audio}))).map((item,index)=>({...item,top:index*300,bottom:index*300+280}))
async function assertCurrentAlchemyControlsAndMedia(source,locale,{controls=['format','topic','country'],rows=reviewRows(locale),extraVideos=[],stackWidth=320,stackScroll=320,countryLabel=locale==='ru'?'Код страны':'Country calling code'}={}){
  const start="     const form=servicePage.locator('[data-alchemy-lead-form=\"single\"]')\n"
  const end='     await verifyAlchemyEnquiryJourney(servicePage,expect,locale)'
  assert.equal(source.split(start).length,2,'One genuine Alchemy form/media block')
  assert.equal(source.split(end).length,2,'One following consent/receipt journey')
  const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(to>from)
  const actions=[],selects=controls.map(kind=>({kind,value:kind==='country'?'CA':'',label:kind==='country'?countryLabel:undefined}))
  const cards=rows.map(row=>({getAttribute:key=>key==='data-testimonial-video-id'?row.id:key==='data-testimonial-original-audio'?row.audio:assert.fail('Unknown card attribute'),getBoundingClientRect:()=>({top:row.top,bottom:row.bottom})}))
  const stack={scrollWidth:stackScroll,clientWidth:stackWidth},form={}
  function locator(nodes,name){
    const one=()=>{assert.equal(nodes.length,1,'Exact locator '+name);return nodes[0]}
    return {nodes,name,
      locator(selector){
        if(one()===form){
          if(selector==='select')return locator(selects,selector)
          if(selector==='select[id$="-format"]')return locator(selects.filter(item=>item.kind==='format'),selector)
          if(selector==='select[id$="-topic"]')return locator(selects.filter(item=>item.kind==='topic'),selector)
          if(selector==='[data-phone-country-input] select')return locator(selects.filter(item=>item.kind==='country'),selector)
          if(selector==='[data-contact-order]')return locator([{}],selector)
        }
        if(one()===stack&&selector==='[data-testimonial-video-id]')return locator(cards,selector)
        assert.fail('Unexpected nested selector '+selector)
      },
      first(){return locator(nodes.slice(0,1),name+'.first')},nth(index){return locator(nodes.slice(index,index+1),name+'.nth')},
      async scrollIntoViewIfNeeded(){one()},
      async selectOption(value){const node=one();actions.push([node.kind,value]);node.value=value},
      async evaluateAll(fn){return fn(nodes)},async evaluate(fn){return fn(one())},
    }
  }
  const servicePage={locator(selector){
    if(selector==='[data-alchemy-lead-form="single"]')return locator([form],selector)
    if(selector==='[data-testimonial-video-id]')return locator([...cards,...extraVideos],selector)
    if(selector==='[data-alchemy-review-stack]')return locator([stack],selector)
    assert.equal(selector,'a[href="/'+locale+'/services/free-situation-review"]','Retain the intended localized alternative route')
    return locator([{}],selector)
  }}
  const expect=target=>({
    async toHaveCount(count){assert.equal(target.nodes.length,count,target.name+' count')},
    async toBeVisible(){assert.equal(target.nodes.length,1,target.name+' visible')},
    async toHaveAttribute(name,value){assert.equal(target.nodes.length,1);assert.equal(name,'aria-label');assert.equal(target.nodes[0].label,value)},
    async toHaveValue(value){assert.equal(target.nodes.length,1);assert.equal(target.nodes[0].value,value)},
  })
  await new Function('servicePage','expect','locale','assert','return (async()=>{'+source.slice(from,to)+'})()')(servicePage,expect,locale,assert)
  assert.deepEqual(actions,[['format','30'],['topic','business']],'Keep both editorial actions on their actual controls, never on country')
  assert.equal(selects.find(item=>item.kind==='country').value,'CA','Editorial actions must not mutate phone country')
}
for(const locale of ['en','ru'])test('actual main Alchemy controls retain semantic actions and twelve exact original recordings: '+locale,()=>assertCurrentAlchemyControlsAndMedia(script,locale))
for(const [name,settings]of [
  ['unknown fourth select',{controls:['format','topic','country','unknown']}],
  ['missing country',{controls:['format','topic']}],
  ['duplicate format replacing country',{controls:['format','format','topic']}],
  ['wrong localized country label',{countryLabel:'Country'}],
  ['missing recording',{rows:reviewRows('en').slice(0,-1)}],
  ['duplicate recording',{rows:reviewRows('en').map((row,index)=>index===11?{...row,id:reviewIds.en[0]}:row)}],
  ['unapproved replacement',{rows:reviewRows('en').map((row,index)=>index===0?{...row,id:'unknown-video'}:row)}],
  ['wrong recording order',{rows:reviewRows('en').map((row,index,all)=>index<2?{...row,id:all[1-index].id}:row)}],
  ['wrong original language',{rows:reviewRows('en').map((row,index)=>index===0?{...row,audio:'ru'}:row)}],
  ['horizontal overflow',{stackScroll:322}],
  ['overlapping vertical cards',{rows:reviewRows('en').map((row,index)=>index===1?{...row,top:10}:row)}],
  ['unscoped extra recording',{extraVideos:[{}]}],
])test('actual main Alchemy media/control oracle rejects '+name,async()=>{
  await assert.rejects(assertCurrentAlchemyControlsAndMedia(script,'en',settings),error=>error.code==='ERR_ASSERTION')
})
for(const [name,before,after,settings]of [
  ['lost format action',"     await format.selectOption('30')",'',{}],
  ['wrong topic action',"     await topic.selectOption('business')","     await format.selectOption('business')",{}],
  ['wrong review count',"assert.equal(boxes.length,12,","assert.equal(boxes.length,3,",{}],
  ['all audio tags replaced',"audio:node.getAttribute('data-testimonial-original-audio')","audio:'en'",{}],
  ['reversed locale ordering',"locale==='ru'?['ru','en']:['en','ru']","locale==='ru'?['en','ru']:['ru','en']",{}],
])test('current Alchemy verifier mutation is rejected: '+name,async()=>{
  assert.equal(script.split(before).length,2)
  await assert.rejects(assertCurrentAlchemyControlsAndMedia(script.replace(before,after),'en',settings),error=>error.code==='ERR_ASSERTION')
})
test('exact recording oracle matches the actual retained first-party archive in both languages',async()=>{
  const ts=(await import('typescript')).default
  const source=await (await import('node:fs/promises')).readFile(new URL('../components/personal-testimonials.tsx',import.meta.url),'utf8')
  const file=ts.createSourceFile('personal-testimonials.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const values=file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>node.name.getText(file)==='testimonialVideos')
  assert.equal(values.length,1)
  const expression=values[0].initializer;assert.ok(ts.isAsExpression(expression))
  const archive=new Function('return ('+expression.expression.getText(file)+')')()
  for(const locale of ['en','ru']){
    assert.deepEqual(archive[locale].map(video=>video.id),reviewIds[locale])
    assert.ok(archive[locale].every(video=>video.language===locale))
  }
})
