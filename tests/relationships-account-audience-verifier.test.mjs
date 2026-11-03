import { openAccountTestPicker } from '../scripts/helpers/account-picker-disclosure-verifier.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source=readFileSync(new URL('../scripts/verify-relationships-assessments.mjs',import.meta.url),'utf8')
const origin='http://127.0.0.1:3100'
function extract(name,next){
 const start=source.indexOf('async function '+name+'('),end=source.indexOf('async function '+next+'(',start)
 assert.ok(start>=0&&end>start,name+' must be the actual executable verifier helper')
 return source.slice(start,end)
}
const openSource=extract('openAccountRelationshipPicker','relationshipChoice')
const choiceSource=extract('relationshipChoice','saveAccountRelationshipSelection')
const saveSource=extract('saveAccountRelationshipSelection','launchPublicRelationshipGuest')
const publicSource=extract('launchPublicRelationshipGuest','fill')
const load=(text,name,dependencies)=>new Function(...Object.keys(dependencies),text+';return '+name)(...Object.values(dependencies))
const clone=value=>structuredClone(value)
const definitions=[{key:'hh-love-affection',id:'love-en',version:'v1',instrumentLocale:'en',contentHash:'love-content-hash',questions:[{text:'First exact relationship item'},{text:'Second exact relationship item'}]},{key:'hh-trust-openness',id:'trust-en',version:'v1',instrumentLocale:'en'}]
const preferences={focus:['resources'],problems:[],details:[],axes:[],areas:[],styles:[],kinds:[],lengths:[],depth:'balanced',maxMinutes:0,language:'any',tracking:'any',freeOnly:false}

async function openScenario({openCount=1,wrongAudience=false,wrongRemoval=false,unchanged=false,duplicateChoice=false,duplicatePicker=false}={}){
 let opened=false,browsed=false,customized=false,reset=false,back=false,selected=['First suggestion','Second suggestion']
 const checked={evaluateAll:async()=>[...selected]}
 const summary={get count(){return selected.length}}
 const picker={count:duplicatePicker?2:1,get visible(){return back},locator:selector=>{assert.equal(selector,'[data-public-selected-tests] [data-selected-test-key]');return summary}}
 const customizer={isVisible:async()=>customized,getByRole(role,options){
  assert.equal(role,'button');assert.deepEqual(options,{name:'Reset filters',exact:true})
  return {count:1,click:async()=>{assert.equal(customized,true);reset=true}}
 }}
 const explorer={count:1,get visible(){return opened},isVisible:async()=>opened,locator(selector){
  if(selector==='#hh-test-customizer')return customizer
  if(selector==='button[aria-controls="hh-test-customizer"]')return {count:1,click:async()=>{assert.equal(browsed,true);customized=true}}
  if(selector==='article input[type="checkbox"]:checked')return checked
  assert.equal(selector,'[data-prelogin-test-picker]');return picker
 },getByRole(role,{name,exact,checked:onlyChecked}){
  assert.equal(exact,true)
  if(role==='checkbox'){
   assert.equal(onlyChecked,true)
   return {get count(){return selected.includes(name)?(duplicateChoice?2:1):0},click:async()=>{assert.equal(reset,true);if(!unchanged)selected=selected.filter(value=>value!==(wrongRemoval?'Second suggestion':name))}}
  }
  assert.equal(role,'button')
  if(name==='Browse full database')return {count:1,click:async()=>{assert.equal(opened,true);browsed=true}}
  assert.equal(name,'← Back to easy selection')
  return {count:1,click:async()=>{assert.equal(reset,true);assert.deepEqual(selected,[]);back=true}}
 }}
 const toggle={count:openCount,visible:true,getAttribute:async key=>key==='aria-controls'?'my-test-explorer':String(opened),click:async()=>{opened=true}}
 const dashboard={count:1,visible:true,locator:selector=>{assert.ok(['#my-tests-picker-toggle','#my-test-explorer'].includes(selector));return selector==='#my-tests-picker-toggle'?toggle:explorer}}
 const target={locator:selector=>(assert.equal(selector,'[data-my-tests-dashboard]'),dashboard)}
 const navigate=async(page,url)=>{assert.equal(page,target);assert.equal(url,origin+'/en/app/tests')}
 const expect=locator=>({toHaveURL:async url=>{assert.equal(url,origin+'/en/app/tests');assert.equal(wrongAudience,false)},toBeVisible:async()=>assert.equal(locator.visible,true),toBeHidden:async()=>assert.equal(opened,false),toHaveCount:async n=>assert.equal(locator===checked?selected.length:locator.count,n),toHaveAttribute:async(key,value)=>assert.equal(await locator.getAttribute(key),value),toHaveAccessibleName:async expected=>{const name=opened?'Hide test picker Tap to collapse the selection panel':'Choose matching tests Topics, concerns & recommended tests';if(expected instanceof RegExp)assert.match(name,expected);else assert.equal(name,expected)}})
 expect.poll=fn=>({toEqual:async expected=>assert.deepEqual(await fn(),expected)})
 const result=await load(openSource,'openAccountRelationshipPicker',{navigate,origin,expect,openAccountTestPicker})(target)
 assert.equal(result,picker);assert.equal(opened&&browsed&&reset&&back,true)
}
test('actual relationship verifier opens authenticated My Tests and clears only its draft through real controls',()=>openScenario())
for(const option of ['wrongAudience','wrongRemoval','unchanged','duplicateChoice','duplicatePicker'])test('account picker rejects '+option,async()=>{await assert.rejects(openScenario({[option]:true}))})
for(const count of [0,2])test('account picker rejects '+count+' opening controls',async()=>{await assert.rejects(openScenario({openCount:count}))})

test('actual relationship choice expands its scoped five-item list before checking the exact card',async()=>{
 for(const options of [{},{duplicates:true},{missingMore:true},{neverFound:true},{stalled:true}]){
  let batches=0
  const choice={count:async()=>batches>=2&&!options.neverFound?(options.duplicates?2:1):0,visible:true}
  const list={getAttribute:async()=>String(5+batches*5)}
  const picker={locator:selector=>{if(selector==='#hh-public-recommended-tests')return list;assert.equal(selector,'[data-test-match="hh-love-affection"] input[type="checkbox"]');return choice},getByRole(role,{name}){assert.equal(role,'button');assert.equal(String(name),'/^Show \\d+ more tests$/');return {count:options.missingMore?0:1,innerText:async()=>'Show 5 more tests',click:async()=>{if(!options.stalled)batches++}}}}
  const expect=target=>({toHaveCount:async n=>assert.equal(typeof target.count==='function'?await target.count():target.count,n),toBeVisible:async()=>assert.equal(target.visible,true),toHaveAttribute:async(key,value)=>assert.equal(await target.getAttribute(key),value)})
  const run=load(choiceSource,'relationshipChoice',{expect,assert,MONITORING_CATALOG:Array(15)})(picker,'hh-love-affection')
  if(Object.keys(options).length)await assert.rejects(run);else{assert.equal(await run,choice);assert.equal(batches,2)}
 }
})

async function saveScenario(options={}){
 const before={account:{id:'owner'},activeTestPlan:{id:'saved',status:'active',definitionIds:['old-one','old-two'],completedRunIds:['completed-run']},latestTestPlan:null,runs:[{id:'existing-run',answers:{q1:2}}],results:[{id:'existing-result',score:2}]}
 if(options.completed){before.latestTestPlan={...before.activeTestPlan,status:'completed'};before.activeTestPlan=null}
 const prior=before.activeTestPlan||before.latestTestPlan
 let plan={id:prior.id,status:prior.status,definitionIds:[...prior.definitionIds,...definitions.map(d=>d.id)],completedRunIds:[...prior.completedRunIds],selectionPreferences:clone(preferences)}
 let selected=definitions.map(d=>d.key),submitted={appendActive:true,replaceActive:false,items:definitions.map(d=>({definitionKey:d.key,definitionVersion:d.version,instrumentLocale:d.instrumentLocale})),selectionPreferences:clone(preferences)}
 if(options.wrongSelection)selected=['another-test',definitions[1].key]
 if(options.selectedOrder)selected.reverse()
 if(options.extraSelection)selected.push('unsolicited-test')
 if(options.wrongItems)submitted.items[0].definitionKey='other-test'
 if(options.requestOrder)submitted.items.reverse()
 if(options.replace)submitted.replaceActive=true
 if(options.notAppend)submitted.appendActive=false
 if(options.wrongPreferences)submitted.selectionPreferences.focus=['sexuality']
 if(options.wrongPlanOrder)plan.definitionIds.reverse()
 if(options.extraIntimate)plan.definitionIds.push('sexual-self-kindness-en')
 if(options.lostExisting)plan.definitionIds=plan.definitionIds.filter(id=>id!=='old-one')
 if(options.lostCompletion)plan.completedRunIds=[]
 if(options.wrongSavedPreferences)plan.selectionPreferences.focus=['relationships']
 const request={method:()=> 'POST',headers:()=>({'x-hh-account-id':options.wrongOwner?'other-owner':'owner'}),postDataJSON:()=>submitted}
 const response={url:()=>origin+(options.guestEndpoint?'/api/app/guest/test-plans':'/api/app/test-plans'),request:()=>request,ok:()=>!options.failedSave,json:async()=>clone(plan),finished:async()=>{}}
 const reloadedPlan=clone(plan);if(options.wrongReload)reloadedPlan.definitionIds.reverse()
 const readback=clone(plan);if(options.wrongReadback)readback.id='foreign-plan'
 const reloaded={url:()=>origin+'/api/app/test-plans/'+plan.id,request:()=>({method:()=> 'GET'}),ok:()=>true,json:async()=>reloadedPlan,finished:async()=>{}}
 let saved=false,reload=false,waits=0,reads=0,observer,removed=false
 const target={on:(event,fn)=>{assert.equal(event,'request');observer=fn},off:(event,fn)=>{assert.equal(event,'request');assert.equal(fn,observer);removed=true},locator:selector=>{assert.ok(['#my-test-explorer [data-prelogin-test-picker]','#my-tests-list'].includes(selector));return {count:1,visible:true}},waitForResponse(predicate){const value=++waits===1?response:reloaded;assert.equal(predicate(value),true);return Promise.resolve(value)},waitForLoadState:async state=>{assert.equal(state,'networkidle');assert.equal(saved,true)},reload:async()=>{assert.equal(saved,true);reload=true}}
 const picker={locator:selector=>{assert.equal(selector,'[data-public-selected-tests] [data-selected-test-key]');return {count:selected.length,evaluateAll:async()=>[...selected]}},getByRole(role,copy){assert.equal(role,'button');assert.deepEqual(copy,{name:'Add selected tests Save these tests to My tests',exact:true});return {count:1,enabled:true,click:async()=>{assert.equal(waits,1);saved=true;observer({url:response.url,method:()=> 'POST'});if(options.duplicateWrite)observer({url:response.url,method:()=> 'POST'});if(options.unrelatedWrite)observer({url:()=>origin+'/api/app/runs',method:()=> 'POST'})}}}}
 const expect=locator=>({toHaveURL:async url=>{assert.equal(options.wrongAudience||false,false);assert.equal(url,origin+'/en/app/tests'+(saved?'?plan=saved':''))},toHaveCount:async n=>assert.equal(locator.count,n),toBeEnabled:async()=>assert.equal(locator.enabled,true),toBeVisible:async()=>assert.equal(locator.visible,true)})
 const api=async(ctx,path)=>{
  assert.equal(ctx,'context')
  if(path==='test-plans/saved'){assert.equal(saved,true);return readback}
  assert.equal(path,'bootstrap');reads++
  if(reads===1)return clone(before)
  assert.equal(reload,true)
  const after={...clone(before),activeTestPlan:options.completed?null:clone(plan),latestTestPlan:options.completed?clone(plan):null}
  if(options.changedStored) (after.activeTestPlan||after.latestTestPlan).definitionIds=['wrong']
  if(options.changedRuns)after.runs=[]
  if(options.changedResults)after.results=[]
  if(options.changedOwner)after.account.id='different-owner'
  return after
 }
 const result=await load(saveSource,'saveAccountRelationshipSelection',{assert,expect,origin,api,navigationMarker:()=>{}})(target,'context',picker,definitions,preferences)
 assert.deepEqual(result,plan);assert.equal(reload,true);assert.equal(reads,2);assert.equal(removed,true)
}
test('actual account save verifies exact ordered append, owner, preferences, readback, reload and preserved history',()=>saveScenario())
test('actual account save can extend a completed plan without losing completed runs',()=>saveScenario({completed:true}))
for(const option of ['wrongAudience','wrongSelection','selectedOrder','extraSelection','wrongItems','requestOrder','replace','notAppend','wrongPreferences','wrongPlanOrder','extraIntimate','lostExisting','lostCompletion','wrongSavedPreferences','wrongOwner','guestEndpoint','duplicateWrite','unrelatedWrite','failedSave','wrongReadback','wrongReload','changedStored','changedRuns','changedResults','changedOwner'])test('account-save proof rejects '+option,async()=>{await assert.rejects(saveScenario({[option]:true}))})

async function publicScenario(options={}){
 const definition=definitions[0],before={account:{id:'owner'},activeTestPlan:{id:'saved',definitionIds:['existing']},latestTestPlan:{id:'previous'},runs:[{id:'run'}],results:[{id:'result'}]}
 let callback,removed=false,clicked=false,url,reads=0
 const quick={visible:!options.missingQuick,locator:selector=>{assert.equal(selector,'.cabinet-quick-question');return {count:options.wrongQuestionCount?1:definition.questions.length}},getByRole(role,options_){
  assert.equal(role,'heading')
  if(options_.level===3)return {texts:options.wrongQuestions?['Wrong item','Second exact relationship item']:definition.questions.map(item=>item.text)}
  assert.deepEqual(options_,{name:definition.questions[0].text,exact:true});return {visible:!options.hiddenQuestion}
 }}
 const guest={visible:true,locator:selector=>{
  if(selector==='.hh-test-mode-picker')return {count:options.staleMode?1:0}
  assert.equal(selector,'.cabinet-quick-form');return quick
 },getByRole(role,options_){assert.equal(role,'heading');assert.deepEqual(options_,{name:'Before you start',exact:true});return {count:options.staleConsent?1:0}}}
 const picker={count:1,visible:true,locator:selector=>{assert.equal(selector,'[data-public-selected-tests] [data-selected-test-key]');return {count:options.extraSelection?2:1,key:options.wrongSelection?'other-test':definition.key}},getByRole(role,copy){assert.equal(role,'button');assert.deepEqual(copy,{name:'Start free monitoring No registration required to start',exact:true});return {count:1,click:async()=>{
  clicked=true;url=origin+(options.wrongAudience?'/en/app/tests?plan=bad':options.transientURL?'/en/client?startTests='+definition.key:'/en/client?run=guest-run')
  callback({url:()=>origin+'/api/app/guest/runs',method:()=> 'POST'})
  if(options.guestPlanWrite)callback({url:()=>origin+'/api/app/guest/test-plans',method:()=> 'POST'})
  if(options.write)callback({url:()=>origin+'/api/app/test-plans',method:()=> 'POST'})
 }}}}
 const target={on:(event,fn)=>{assert.equal(event,'request');callback=fn},off:(event,fn)=>{assert.equal(event,'request');assert.equal(fn,callback);removed=true},locator:selector=>selector==='[data-prelogin-test-picker]'?picker:(assert.equal(selector,'#cabinet-tests'),guest),waitForLoadState:async state=>assert.equal(state,'networkidle')}
 const expect=locator=>({toHaveURL:async expected=>assert.equal(url,expected),toHaveText:async texts=>assert.deepEqual(locator.texts,texts),toHaveCount:async count=>assert.equal(locator.count,count),toBeVisible:async()=>assert.equal(locator.visible,true),toHaveAttribute:async(key,value)=>{assert.equal(key,'data-selected-test-key');assert.equal(locator.key,value)}})
 const navigate=async(page,destination)=>{assert.equal(page,target);assert.equal(destination,origin+'/en/client/tests?test='+definition.key);url=destination}
 const api=async(ctx,path)=>{
  assert.equal(ctx,'context')
  if(path==='guest/bootstrap'){
   const run={id:'guest-run',definitionId:options.wrongGuestRun?'other-id':definition.id,definitionKey:definition.key,definitionVersion:definition.version,instrumentLocale:definition.instrumentLocale,contentHash:definition.contentHash,answers:{},progress:0,status:'draft'}
   if(options.wrongKey)run.definitionKey='other-key'
   if(options.wrongVersion)run.definitionVersion='v9'
   if(options.wrongLocale)run.instrumentLocale='ru'
   if(options.wrongHash)run.contentHash='wrong-hash'
   if(options.nonemptyAnswers)run.answers={q1:4}
   if(options.startedProgress)run.progress=1
   if(options.wrongStatus)run.status='in_progress'
   if(options.wrongRunURL)url=origin+'/en/client?run=other-run'
   return {activeTestPlan:options.extraGuestPlan?{definitionIds:[definition.id]}:null,runs:options.extraGuestRun?[run,{definitionId:'other-id'}]:[run],results:options.extraGuestResult?[{id:'result'}]:[]}
  }
  assert.equal(path,'bootstrap');reads++
  const state=clone(before)
  if(reads===2){if(options.changedOwner)state.account.id='other';for(const key of ['activeTestPlan','latestTestPlan','runs','results'])if(options['changed_'+key])state[key]=null}
  return state
 }
 try{await load(publicSource,'launchPublicRelationshipGuest',{assert,expect,navigate,origin,api})(target,'context',definition)}finally{assert.equal(removed,true)}
 assert.equal(clicked,true)
}
test('actual signed-in public relationship launch starts the exact fresh guest run without a guest plan or account mutations',()=>publicScenario())
for(const option of ['write','wrongAudience','wrongSelection','extraSelection','missingQuick','wrongQuestionCount','wrongQuestions','hiddenQuestion','staleMode','staleConsent','transientURL','extraGuestPlan','guestPlanWrite','wrongGuestRun','extraGuestRun','wrongKey','wrongVersion','wrongLocale','wrongHash','nonemptyAnswers','startedProgress','wrongStatus','wrongRunURL','extraGuestResult','changedOwner','changed_activeTestPlan','changed_latestTestPlan','changed_runs','changed_results'])test('public relationship proof rejects '+option,async()=>{await assert.rejects(publicScenario({[option]:true}))})

test('real scenario calls the tested helpers and retains opt-in, filters, scoring, bilingual PDF and boundary gates',()=>{
 for(const text of ["const picker=await openAccountRelationshipPicker(page)","await expect(voluntary).not.toBeChecked()","await voluntary.check()","await expect(await publicTopicButton(picker,'en','Relationships')).toHaveAttribute('aria-pressed','false')","await expect(await publicTopicButton(picker,'en','Self-support')).toHaveAttribute('aria-pressed','true')","await expect(await relationshipChoice(picker,'hh-love-affection')).toBeChecked()","saveAccountRelationshipSelection(page,account,picker,[localized('hh-love-affection','en')],selectionPreferences)","launchPublicRelationshipGuest(page,account,localized('hh-love-affection','en'))","!voluntaryPlan.definitionIds.includes(localized('hh-sexual-self-kindness','en').id)","assert.deepEqual(result.dimensions.map(x=>x.value),[1.67,2])","assertGuestScaleResult(page,expect,result,locale)","'%PDF-1.4'","data-problem-key=\"boundaries\"","data-problem-key=\"consent-pressure\"","assert.deepEqual(errors,[])"])assert.ok(source.includes(text),text)
 const block=source.slice(source.indexOf(' const picker=await openAccountRelationshipPicker(page)'),source.indexOf(' const d=defs[0]',source.indexOf(' const picker=await openAccountRelationshipPicker(page)')))
 assert.doesNotMatch(block,/Start free monitoring Save your selection/)
 assert.doesNotMatch(openSource+choiceSource+saveSource+publicSource+block,/\.first\(|\.nth\(|force\s*:|waitForTimeout|timeout\s*:/)
})


test('only the guest claim-interception fixture blocks service workers',async()=>{
 const start=source.indexOf(" const guest=await browser.newContext(")
 const end=source.indexOf(" await api(guest,'guest/session'",start)
 assert.ok(start>0&&end>start)
 let options
 const browser={newContext:async value=>{options=value;return 'guest-context'}}
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
 const guest=await new AsyncFunction('i','base','localized','browser',source.slice(start,end)+';return guest')(0,{key:'fixture'},()=>({}),browser)
 assert.equal(guest,'guest-context')
 assert.deepEqual(options,{viewport:{width:390,height:844},serviceWorkers:'block'})
 assert.match(source,/const publicContext=await browser.newContext\(\{viewport:\{width:390,height:844\}\}\)/)
 assert.match(source,/const account=await browser.newContext\(\{viewport:\{width:390,height:844\}\}\)/)
 assert.equal((source.match(/serviceWorkers:'block'/g)||[]).length,1)
})


test('the real Cabinet single-definition branch starts a run directly and clears plan state',async()=>{
 const cabinet=readFileSync(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
 const start=cabinet.indexOf('    if (definitions.length === 1) {',cabinet.indexOf('  async function beginGuestBattery(entries)'))
 const end=cabinet.indexOf('    const epoch =',start)
 assert.ok(start>0&&end>start)
 const calls=[]
 const invoke=new Function('definitions','setActivePlan','begin',cabinet.slice(start,end))
 const result=invoke([{key:'hh-love-affection'}],value=>calls.push(['plan',value]),(...args)=>{calls.push(['begin',...args]);return 'direct-run'})
 assert.equal(result,'direct-run')
 assert.deepEqual(calls,[['plan',null],['begin','hh-love-affection',null]])
 assert.doesNotMatch(cabinet,/pendingGuestDefinitions|phase === 'consent'/)
 const multiple=cabinet.slice(end,cabinet.indexOf('  async function saveGuestRun(',end))
 assert.match(multiple,/const plan = await guestFetch\('guest\/test-plans'/)
 assert.match(multiple,/items: definitions\.map/)
})
