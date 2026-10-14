import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { startOrResumeCourseFinalRetest } from '../lib/app/course-test-flow.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { mount, findPart, deferred, dailyView, nodes, findButton } from './helpers/course-ui-harness.mjs'
import { buildFinalCourseRetest, compareFinalCourseTests } from '../lib/inner-growth/course-final-retest.js'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const base = {
  definitionKey:'hh-weekly-pulse',definitionVersion:'v1',instrumentLocale:'en',
  scoringKey:'weekly-key',scoringVersion:'v1',
}
const dims = value => [
  {key:'weekly.tension',value,min:0,max:10,direction:'higher_is_more_difficult'},
  {key:'weekly.resource',value:10-value,min:0,max:10,direction:'higher_is_more_resource'},
]
const result = (id,at,value,over={}) => ({
  id,measurementAt:at,dimensions:dims(value),...base,...over,
})
const meta=[{key:'hh-weekly-pulse',version:'v1',title:'Weekly Pulse',startable:true,
  rightsStatus:'cleared',suggestedRepeatDays:7,scaleLabels:{'weekly.tension':'Tension'}}]
const period={testKeys:['hh-weekly-pulse'],metadata:meta,
  startedAt:'2026-10-13T12:00:00Z',completedAt:'2026-10-26T18:00:00Z'}

test('exact original selected test is re-offered after day 14, using a fixed before-cycle result',()=>{
  const results=[
    result('older','2026-10-10T10:00:00Z',9),
    result('baseline','2026-10-13T11:59:00Z',8),
    result('during','2026-10-20T10:00:00Z',5),
    result('final','2026-10-26T19:30:00Z',3),
  ]
  const out=buildFinalCourseRetest({...period,results})
  assert.equal(out.ready,true)
  assert.equal(out.completedCount,1)
  assert.equal(out.totalCount,1)
  assert.equal(out.fullyRetested,true)
  assert.equal(out.tests[0].baselineResultId,'baseline')
  assert.equal(out.tests[0].instrumentLocale,'en')
  assert.equal(out.tests[0].afterResultId,'final')
  assert.deepEqual(out.tests[0].comparison[0],{key:'weekly.tension',from:8,to:3,delta:-5,min:0,max:10,
    direction:'higher_is_more_difficult',label:'Tension'})
})

test('before cycle, during practice and uncompleted tests are not confused with a final retest',()=>{
 const out=buildFinalCourseRetest({...period,results:[
   result('baseline','2026-10-11T10:00:00Z',0),
   result('during','2026-10-24T18:00:00Z',9),
 ]})
 assert.equal(out.tests[0].completed,false)
 assert.equal(out.tests[0].baselineResultId,'baseline')
 assert.equal(out.tests[0].canRepeat,true)
 assert.equal(out.completedCount,0)
 assert.equal(out.tests[0].afterDate,null)
 const empty=buildFinalCourseRetest({...period,completedAt:null,results:[]})
 assert.equal(empty.ready,false)
})

test('version/scoring and min-max scale mismatches do not generate a progress claim',()=>{
 const before=result('a','2026-10-11T10:00:00Z',6)
 assert.equal(compareFinalCourseTests(before,result('b','2026-10-27T10:00:00Z',4,{scoringVersion:'v2'})),null)
 const newScale=result('c','2026-10-27T10:00:00Z',2)
 newScale.dimensions[0].max=100
 assert.deepEqual(compareFinalCourseTests(before,newScale),[
   {key:'weekly.resource',from:4,to:8,delta:4,min:0,max:10,direction:'higher_is_more_resource'},
 ])
 const out=buildFinalCourseRetest({...period,results:[before,
   result('d','2026-10-27T10:00:00Z',4,{definitionVersion:'v2'})]})
 assert.equal(out.tests[0].versionChanged,true)
 assert.equal(out.tests[0].completed,false)
 assert.equal(out.tests[0].afterResultId,null)
})

test('short retest intervals are guidance, not an invented hard contraindication',()=>{
 const m=[{...meta[0],suggestedRepeatDays:90}]
 const out=buildFinalCourseRetest({...period,metadata:m,results:[result('a','2026-10-13T11:00:00Z',5)]})
 assert.equal(out.tests[0].repeatSuggestedLater,true)
 assert.equal(out.tests[0].canRepeat,true)
 assert.equal(out.tests[0].suggestedRepeatDays,90)
})

test('private daily read, server day lock and final-test link are required',()=>{
 const source=read('lib/app/growth-daily.js')
 const legacy=read('lib/app/growth-course.js')
 const today=read('components/app/course-today.jsx')
 const player=read('components/app/course-slide-player.jsx')
 const workspace=read('components/app/app-workspace.jsx')
 const flow=read('lib/app/course-test-flow.js')
 assert.match(source,/growth_sessions where account_id=\$1 and cycle_id=\$2/)
 assert.match(source,/finalSaved/)
 assert.match(source,/COURSE_NEXT_DAY_ONLY/)
 assert.match(legacy,/body\.day !== courseDay\(row\.started_at, row\.duration_days\)/)
 assert.match(source,/today\.date<=dateString\(finalSaved\.local_date\)/)
 assert.match(source,/if\(!Number\.isInteger\(input\.day\)\|\|input\.day!==today\.day\)/)
 assert.match(source,/on conflict\(cycle_id,day_number\) do nothing/)
 assert.match(source,/finalSession && \(dayInfo\.day===14 \|\| dayInfo\.isAfterCycle\)/)
 assert.match(source,/provenance->>'definitionKey'=any\(\$2::text\[\]\)/)
 assert.match(today,/<CourseFinalRetest/)
 assert.match(player,/data-course-post-lesson-promo/)
 assert.match(player,/finalRetestReady/)
 assert.match(player,/promotion\.show && earned/)
 assert.match(player,/const title = promoOpen && promotion\.show \? words\.promoTitle/)
 assert.match(workspace,/searchParams\.get\('course'\) === 'retest'/)
 assert.match(flow,/startOrResumeCourseFinalRetest/)
 assert.match(flow,/if \(!today\?\.finalRetest\?\.ready \|\| !item\?\.canRepeat\)/)
 assert.doesNotMatch(player + today + flow,/localStorage|sessionStorage|sendBeacon|dangerouslySetInnerHTML/)
})

test('course promotions reuse authoritative billing status and matching provider tokens without a second fetch',()=>{
 const src=read('components/app/use-course-promotion.js')
 assert.match(src,/useSubscription/)
 assert.match(src,/canShowHousePromotion\(status, phase\)/)
 assert.match(src,/!status.sandbox && canStartCheckout\(status, phase, 'advanced'\)/)
 assert.match(src,/offerScope\?\.accountId === accountId/)
 assert.match(src,/offerScope\?\.courseId === courseId/)
 assert.match(src,/offerKey === key/)
 assert.doesNotMatch(src,/fetch\(|404|localStorage|sessionStorage/)
})

const entry=buildExplorerEntries({locale:'en',audience:'account'}).find(row=>row.key==='hh-weekly-pulse'&&row.selectable)
const retestPlan={ready:true,tests:[{key:entry.key,canRepeat:true,definitionVersion:entry.definitionVersion,instrumentLocale:entry.definition.instrumentLocale}]}
const retestToday=()=>dailyView('course-a','cycle-a',{finalRetest:retestPlan})
const scoped={key:entry.key,locale:'ru',accountId:'owner-a',courseId:'course-a',cycleId:'cycle-a',isCurrent:()=>true}

test('final retest binds all reads and writes to owner and selected course and retains original instrument language',async()=>{
 const calls=[]
 const run=await startOrResumeCourseFinalRetest({...scoped,request:async(path,body,method,options)=>{
  calls.push({path,body,options})
  if(path.startsWith('course/today'))return retestToday()
  if(path==='bootstrap')return {account:{id:'owner-a'},runs:[]}
  return {id:'run-a'}
 }})
 assert.equal(run.id,'run-a')
 assert.match(calls[0].path,/locale=ru&courseId=course-a$/)
 assert.ok(calls.every(call=>call.options.accountId==='owner-a'))
 assert.equal(calls[2].body.instrumentLocale,entry.definition.instrumentLocale)
 assert.equal(calls[2].body.definitionVersion,entry.definition.version)
})

test('final retest rejects wrong owner/course/cycle and read-only state before run creation',async()=>{
 for(const change of [{courseId:'course-b'},{cycle:{id:'cycle-b'}},{readOnly:true},{finalRetest:{ready:false}}]){
  const calls=[]
  await assert.rejects(startOrResumeCourseFinalRetest({...scoped,request:async(path)=>{calls.push(path);return {...retestToday(),...change}}}),/COURSE_(SELECTION_CHANGED|RETEST_NOT_AVAILABLE)/)
  assert.equal(calls.length,1)
 }
 const calls=[]
 await assert.rejects(startOrResumeCourseFinalRetest({...scoped,request:async path=>{calls.push(path);return path==='bootstrap'?{account:{id:'owner-b'},runs:[]}:retestToday()}}),/ACCOUNT_CHANGED/)
 assert.equal(calls.length,2)
 await assert.rejects(startOrResumeCourseFinalRetest({key:entry.key,request:async()=>{throw Error('must not request')}}),/COURSE_SELECTION_REQUIRED/)
})

test('final retest abandons stale scope after each await and cannot issue a later request or expose a stale run',async()=>{
 for(let holdAt=0;holdAt<3;holdAt++){
  const slow=deferred(),calls=[];let current=true
  const values=[retestToday(),{account:{id:'owner-a'},runs:[]},{id:'run-a'}]
  const pending=startOrResumeCourseFinalRetest({...scoped,isCurrent:()=>current,request:async(path)=>{
   const at=calls.length;calls.push(path);return at===holdAt?slow.promise:values[at]
  }})
  for(let i=0;i<10;i++)await Promise.resolve()
  assert.equal(calls.length,holdAt+1)
  current=false;slow.resolve(values[holdAt])
  await assert.rejects(pending,/COURSE_SELECTION_CHANGED/)
  assert.equal(calls.length,holdAt+1)
 }
})

test('final retest reuses an existing ordinary run without writing',async()=>{
 const calls=[]
 const run=await startOrResumeCourseFinalRetest({...scoped,request:async path=>{
  calls.push(path);return path==='bootstrap'?{account:{id:'owner-a'},runs:[{id:'existing',definitionId:entry.definition.id,status:'in_progress'}]}:retestToday()
 }})
 assert.equal(run.id,'existing');assert.equal(calls.length,2)
})

test('daily final retest serializes clicks and returns with the exact selected course and cycle',async()=>{
 const slow=deferred()
 const h=mount('course-today',{props:{locale:'en',accountId:'owner-a',courseId:'course-a'},fetcher:path=>{
  if(path==='bootstrap')return slow.promise
  if(path==='runs')return {id:'run-a'}
  return retestToday()
 }})
 await h.settle()
 const start=findPart(h.tree,'CourseFinalRetest').props.onStart
 const pending=start(entry.key);start(entry.key);await h.settle()
 assert.equal(h.calls.filter(call=>call.path==='bootstrap').length,1)
 slow.resolve({account:{id:'owner-a'},runs:[]});await pending;await h.settle()
 assert.deepEqual(h.navigations,['/en/app/runs/run-a?mode=guided&course=retest&courseId=course-a&cycleId=cycle-a'])
 h.unmount()
})

test('daily retest cannot navigate after owner/course switches or unmount',async()=>{
 for(const change of ['owner','course','unmount']){
  const slow=deferred()
  const h=mount('course-today',{props:{accountId:'owner-a',courseId:'course-a'},fetcher:path=>path==='bootstrap'?slow.promise:retestToday()})
  await h.settle()
  const pending=findPart(h.tree,'CourseFinalRetest').props.onStart(entry.key);await h.settle()
  if(change==='unmount')h.unmount()
  else h.render({accountId:change==='owner'?'owner-b':'owner-a',courseId:change==='course'?'course-b':'course-a'})
  await h.settle();slow.resolve({account:{id:'owner-a'},runs:[]});await pending;await h.settle()
  assert.equal(h.navigations.length,0);assert.equal(h.calls.filter(call=>call.path==='runs').length,0)
  h.unmount()
 }
})

test('runner retest completion and exit retain selected-course navigation and lifecycle checks',()=>{
 const workspace=read('components/app/app-workspace.jsx')
 assert.match(workspace,/returnFromFinalRetest\(true\)/)
 assert.match(workspace,/course'\) === 'retest'\) \{ await returnFromFinalRetest\(\)/)
 assert.match(workspace,/today\?\.cycle\?\.id !== scope\.cycleId/)
 assert.match(workspace,/fresh\?\.account\?\.id !== scope\.accountId/)
 assert.match(workspace,/router\.push\(root \+ '\/course\?courseId=' \+ encodeURIComponent\(scope\.courseId\)/)
 assert.match(workspace,/courseMode=\{searchParams\.get\('course'\) === '1'\}/)
})

test('saved retest callback becomes invalid when the same selected course hydrates a new cycle',async()=>{
 const slow=deferred(), initial={...retestToday(),cycle:{id:'cycle-a',day:14,status:'completed',revision:1,durationDays:14,preferences:{}},continuationGoals:['calm_regulation']}
 const h=mount('course-today',{props:{accountId:'owner-a',courseId:'course-a'},extraModules:{
  '@/lib/inner-growth/course-model':{GROWTH_GOALS:{calm_regulation:{title:{en:'Calm'}}}},
 },fetcher:(path,_options,body)=>path==='bootstrap'?slow.promise:body?dailyView('course-a','cycle-new'):initial})
 await h.settle()
 const oldStart=findPart(h.tree,'CourseFinalRetest').props.onStart
 const pending=oldStart(entry.key);await h.settle()
 const details=nodes(h.tree).find(node=>node.type==='button'&&node.props['aria-pressed']===false&&String(node.props.children).includes('Details'))
 assert.ok(details);details.props.onClick();await h.settle()
 nodes(h.tree).find(node=>node.type==='input'&&node.props.maxLength===160).props.onChange({target:{value:'Synthetic next focus'}})
 await h.settle();await findButton(h.tree,'Start another 14-day cycle').props.onClick();await h.settle()
 slow.resolve({account:{id:'owner-a'},runs:[]});await pending;await h.settle()
 assert.equal(h.navigations.length,0);assert.equal(h.calls.filter(call=>call.path==='runs').length,0)
 const count=h.calls.length;await oldStart(entry.key);assert.equal(h.calls.length,count)
 h.unmount()
})

function returnFixture(){
 const workspace=read('components/app/app-workspace.jsx')
 const source=workspace.slice(workspace.indexOf('  async function returnFromFinalRetest('),workspace.indexOf('  async function completePlan('))
 const renderedRetestScope={accountId:'owner-a',page:'runs',recordId:'run-a',courseId:'course-a',cycleId:'cycle-a'}
 const retestScope={current:{...renderedRetestScope}},retestLifetime={current:{mounted:true,epoch:1}}
 const calls=[],navigations=[],updates=[]
 let responder=async path=>path==='bootstrap'?{account:{id:'owner-a'}}:retestToday()
 const fn=new Function('renderedRetestScope','renderedRetestEpoch','retestScope','retestLifetime','appFetch','router','setData','setState','locale','root',source+';return returnFromFinalRetest')(renderedRetestScope,1,retestScope,retestLifetime,async(...args)=>{calls.push(args);return responder(...args)},{push:value=>navigations.push(value)},value=>updates.push(value),()=>{},'en','/en/app')
 return {fn,calls,navigations,updates,retestScope,retestLifetime,setResponder(value){responder=value}}
}

test('retained Runner return callbacks cannot adopt a later owner, course, cycle or route',async()=>{
 for(const change of [{accountId:'owner-b'},{courseId:'course-b'},{cycleId:'cycle-b'},{recordId:'run-b'},{page:'tests'}]){
  const f=returnFixture();Object.assign(f.retestScope.current,change);await f.fn(true)
  assert.equal(f.calls.length,0);assert.equal(f.navigations.length,0)
 }
 const f=returnFixture();f.retestLifetime.current.epoch++;await f.fn();assert.equal(f.calls.length,0)
})

test('Runner retest return checks scope after both awaits and preserves the selected course on success',async()=>{
 for(let holdAt=0;holdAt<2;holdAt++){
  const f=returnFixture(),slow=deferred();let at=0
  f.setResponder(async path=>at++===holdAt?slow.promise:path==='bootstrap'?{account:{id:'owner-a'}}:retestToday())
  const pending=f.fn(true);for(let i=0;i<10;i++)await Promise.resolve()
  f.retestScope.current.courseId='course-b';slow.resolve(holdAt?{account:{id:'owner-a'}}:retestToday());await pending
  assert.equal(f.calls.length,holdAt+1);assert.equal(f.navigations.length,0);assert.equal(f.updates.length,0)
 }
 for(const completed of [false,true]){
  const f=returnFixture();await f.fn(completed)
  assert.deepEqual(f.navigations,['/en/app/course?courseId=course-a'+(completed?'&retest=updated':'')])
  assert.ok(f.calls.every(call=>call[3].accountId==='owner-a'))
 }
})

test('one selected primary state outcome is distinct from screeners and stable profiles',()=>{
  const p=buildFinalCourseRetest({...period,
    testKeys:['hh-weekly-pulse','ipip-50','gad-7'],primaryTestKey:'hh-weekly-pulse',
    metadata:[...meta,{key:'ipip-50',version:'v1',startable:true,rightsStatus:'cleared'},
      {key:'gad-7',version:'v1',startable:true,rightsStatus:'cleared'}],
    results:[
      result('p','2026-10-13T11:00:00Z',5),
      result('s','2026-10-13T11:00:00Z',5,{definitionKey:'ipip-50'}),
      result('g','2026-10-13T11:00:00Z',5,{definitionKey:'gad-7'}),
    ]})
  assert.equal(p.tests[0].role,'primary_outcome')
  assert.equal(p.tests[1].role,'stable_profile')
  assert.equal(p.tests[1].canRepeat,false)
  assert.equal(p.tests[2].role,'symptom_screening')
  assert.equal(p.totalCount,2)
})

test('a suggested retest date is calculated from actual as-of time, not a frozen final-day interval',()=>{
  const args={...period,metadata:[{...meta[0],suggestedRepeatDays:30}],
    results:[result('a','2026-10-13T11:00:00Z',6)]}
  const early=buildFinalCourseRetest({...args,now:'2026-10-27T10:00:00Z'})
  assert.equal(early.tests[0].repeatSuggestedLater,true)
  assert.equal(early.tests[0].nextSuggestedAt,'2026-11-12T11:00:00.000Z')
  assert.equal(early.tests[0].canRepeat,true)
  const later=buildFinalCourseRetest({...args,now:'2026-11-20T11:00:00Z'})
  assert.equal(later.tests[0].repeatSuggestedLater,false)
})
