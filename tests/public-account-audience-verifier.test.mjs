import { openAccountTestPicker } from '../scripts/helpers/account-picker-disclosure-verifier.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
const origin='http://127.0.0.1:3100'
function extract(name,next){return source.slice(source.indexOf('async function '+name+'('),source.indexOf(next,source.indexOf('async function '+name+'(')))}
const guestHelper=extract('launchPublicGuestWithoutAccountWrite','async function enterTest(')
const accountHelper=extract('chooseSingleAccountTest','// A public launch')
const definition={id:'mini-ipip-20:1:en',key:'mini-ipip-20',questions:[{text:'First exact item'},{text:'Second exact item'}]}
const runId='22222222-2222-4222-8222-222222222222'
async function guestScenario({write=false,changed=false,changedKey='activeTestPlan',wrongGuest=false,wrongURL=false,authenticated=true,embedded=false,missingQuick=false,wrongQuestionCount=false,wrongQuestions=false,hiddenQuestion=false,staleMode=false,staleConsent=false,wrongRun=false,transientURL=false,leakedQuery=false,leakedHash=false,wrongAccount=false,visibleBanner=false,visibleNavigation=false}={}){
 let callback,removed=false,reads=0,starts=0
 let path=embedded?'/en/client':'/en/client/tests'
 const questions={count:wrongQuestionCount?1:definition.questions.length,first:()=>({visible:!hiddenQuestion})}
 const quick={visible:!missingQuick,locator:selector=>{assert.equal(selector,'.cabinet-quick-question');return questions},getByRole(role,{level}){
  assert.equal(role,'heading');assert.equal(level,3)
  return {texts:wrongQuestions?['Wrong item','Second exact item']:definition.questions.map(item=>item.text)}
 }}
 const guest={visible:true,locator:selector=>{
  if(selector==='.hh-test-mode-picker')return {count:staleMode?1:0}
  assert.equal(selector,'.cabinet-quick-form');return quick
 },getByRole(role,{name,exact}){
  assert.equal(role,'heading');assert.equal(name,'Before you start');assert.equal(exact,true)
  return {count:staleConsent?1:0}
 }}
 const target={on:(event,fn)=>{assert.equal(event,'request');callback=fn},off:(event,fn)=>{assert.equal(event,'request');assert.equal(fn,callback);removed=true},
  locator:selector=>{
   if(selector==='[data-sitewide-personal-review-banner]')return {visible:visibleBanner}
   if(selector==='.ia222-bottom-navigation')return {visible:visibleNavigation}
   assert.equal(selector,'#cabinet-tests');return guest
  },
  getByRole:(role,{name,exact})=>{assert.equal(role,'button');assert.equal(name,'Start free monitoring');assert.equal(exact,true);return {first(){return this},click:async()=>{
   starts++
   callback({url:()=>origin+'/api/app/guest/runs',method:()=> 'POST'})
   if(write)callback({url:()=>origin+'/api/app/test-plans',method:()=> 'POST'})
   path=wrongURL?'/en/app/tests?plan=bad':transientURL?'/en/client?startTests=mini-ipip-20':'/en/client?run='+(wrongRun?'33333333-3333-4333-8333-333333333333':runId)+(leakedQuery?'&answers=private':'')+(leakedHash?'#private':'')
  }}}
 }
 const expect=target=>({toBeVisible:async()=>assert.equal(target.visible,true),toBeHidden:async()=>assert.equal(target.visible,false),toHaveCount:async count=>assert.equal(target.count,count),toHaveText:async texts=>assert.deepEqual(target.texts,texts),toHaveURL:async predicate=>assert.equal(predicate(new URL(origin+path)),true)})
 const api=async(path,body,ctx)=>{
  assert.equal(ctx,'context')
  if(path==='guest/bootstrap')return {status:200,data:{runs:[{id:runId,definitionId:wrongGuest?'wrong':definition.id}]}}
  assert.equal(path,'bootstrap');reads++
  if(!authenticated)return {status:401}
  const data={account:{id:wrongAccount&&reads===2?'other':'b'},activeTestPlan:{id:'saved',definitionIds:['original']},latestTestPlan:null,runs:[],results:[]}
  if(changed&&reads===2)data[changedKey]={changed:true}
  return {status:200,data}
 }
 try{await new Function('assert','expect','api',guestHelper+';return launchPublicGuestWithoutAccountWrite')(assert,expect,api)(target,'context',definition)}finally{assert.equal(removed,true)}
 assert.equal(starts,1)
}
test('public direct Quick launch proves exact questions, persisted run URL and unchanged authenticated account',()=>guestScenario())
test('embedded public direct Quick launch reaches the exact persisted guest run',()=>guestScenario({embedded:true}))
test('public direct Quick launch remains unauthenticated without Google cookies',()=>guestScenario({authenticated:false}))
for(const option of ['write','changed','wrongGuest','wrongURL','missingQuick','wrongQuestionCount','wrongQuestions','hiddenQuestion','staleMode','staleConsent','wrongRun','transientURL','leakedQuery','leakedHash','wrongAccount','visibleBanner','visibleNavigation'])test('public audience proof rejects '+option,async()=>{await assert.rejects(guestScenario({[option]:true}))})
for(const changedKey of ['latestTestPlan','runs','results'])test('public launch rejects changed account '+changedKey,async()=>{await assert.rejects(guestScenario({changed:true,changedKey}))})

test('public launch uses the runtime direct Quick contract without preflight or forced clicks',()=>{
 const runtime=readFileSync(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
 assert.match(runtime,/setMode\('quick'\)\s*setPhase\('questions'\)/)
 assert.match(runtime,/className="cabinet-quick-form"/)
 assert.match(runtime,/className="cabinet-quick-question"/)
 assert.match(runtime,/replaceGuestRoute\(\{ planId: owningPlanId, runId: created.id \}\)/)
 assert.doesNotMatch(runtime,/phase === 'consent'|phase === 'mode'|hh-test-mode-picker/)
 assert.doesNotMatch(guestHelper,/\.check\(|force:\s*true|waitForTimeout|\.or\(/)
})

async function accountScenario({openCount=1,wrongRoute=false,blocked=false,unchanged=false,wrongRemoval=false,duplicates=false}={}){
 let opened=false,browsed=false,selected=['Suggestion','Second'],picked=false
 const checked={evaluateAll:async()=>[...selected]}
 const explorer={count:1,isVisible:async()=>opened,locator:selector=>{assert.equal(selector,'article input[type="checkbox"]:checked');return checked},getByRole(role,{name,exact,checked:onlyChecked}){
  if(role==='checkbox'){
   assert.equal(exact,true);assert.equal(onlyChecked,true)
   return {get count(){return selected.includes(name)?(duplicates?2:1):0},click:async()=>{
    if(blocked)throw new Error('blocked click')
    if(!unchanged)selected=selected.filter(x=>x!==(wrongRemoval?'Second':name))
   }}
  }
  if(name==='Browse full database')return {count:1,click:async()=>{browsed=true}}
  assert.equal(name,'Back to easy selection');return {visible:true}
 }}
 const toggle={count:openCount,visible:true,getAttribute:async key=>key==='aria-controls'?'my-test-explorer':String(opened),click:async()=>{opened=true}}
 const dashboard={count:1,visible:true,locator:selector=>{assert.ok(['#my-tests-picker-toggle','#my-test-explorer'].includes(selector));return selector==='#my-tests-picker-toggle'?toggle:explorer}}
 const page={goto:async url=>assert.equal(url,origin+'/en/app/tests'),locator:selector=>{assert.equal(selector,'[data-my-tests-dashboard]');return dashboard}}
 const expect=target=>({
  toHaveURL:async url=>{assert.equal(url,origin+'/en/app/tests');assert.equal(wrongRoute,false)},
  toBeVisible:async()=>assert.equal(target===explorer?opened:target.visible,true),toBeHidden:async()=>assert.equal(opened,false),
  toHaveCount:async n=>assert.equal(target===checked?selected.length:target.count,n),
  toHaveAccessibleName:async expected=>{const name=opened?'Hide test picker Tap to collapse the selection panel':'Choose matching tests Topics, concerns & recommended tests';if(expected instanceof RegExp)assert.match(name,expected);else assert.equal(name,expected)},
  toHaveAttribute:async(key,value)=>{if(target===toggle)assert.equal(await target.getAttribute(key),value);else{assert.equal(key,'aria-label');assert.deepEqual(selected,[value])}},
 })
 expect.poll=fn=>({toEqual:async expected=>assert.deepEqual(await fn(),expected)})
 const choose=async(target,name)=>{assert.equal(target,explorer);assert.equal(opened&&browsed,true);assert.deepEqual(selected,[]);selected=[name];picked=true}
 const result=await new Function('expect','origin','chooseVisibleTest','openAccountTestPicker',accountHelper+';return chooseSingleAccountTest')(expect,origin,choose,openAccountTestPicker)(page,'Personality Baseline')
 assert.equal(result,explorer);assert.equal(picked,true)
}
test('account selection navigates to My Tests, opens unique real controls and clears suggestions',()=>accountScenario())
test('account selection rejects public navigation and ambiguous opening controls',async()=>{for(const options of [{wrongRoute:true},{openCount:0},{openCount:2}])await assert.rejects(accountScenario(options))})

test('account deselection rejects blocked, unchanged, wrong-item and ambiguous clicks',async()=>{for(const option of ['blocked','unchanged','wrongRemoval','duplicates'])await assert.rejects(accountScenario({[option]:true}))})

test('Russian Stress uses the unique accessible concern group, never positional selection',async()=>{
 const start=source.indexOf(' const ruConcernTopics=');const end=source.indexOf(" await expect(ruPicker.getByRole('button',{name:'Перегрузка на работе'}))",start)
 assert.ok(start>0&&end>start)
 const fragment=source.slice(start,end)
 assert.doesNotMatch(fragment,/\.first\(|\.nth\(/)
 for(const [groups,buttons] of [[1,1],[0,1],[2,1],[1,0],[1,2]]){
  let clicked=false
  const button={count:buttons,click:async()=>{clicked=true}}
  const picker={getByRole(role,{name,exact}){assert.equal(role,'group');assert.equal(name,'Что вы хотите исследовать?');assert.equal(exact,true);return {count:groups,getByRole(role,{name,exact}){assert.equal(role,'button');assert.equal(name,'Стресс');assert.equal(exact,true);return button}}}}
  const expect=target=>({toHaveCount:async n=>assert.equal(target.count,n),toHaveAttribute:async(key,value)=>{assert.equal(key,'aria-pressed');assert.equal(value,'true');assert.equal(clicked,true)}})
  const run=new AsyncFunction('ruPicker','expect',fragment)(picker,expect)
  if(groups===1&&buttons===1)await run;else await assert.rejects(run)
 }
})
test('account exact/order/history and cross-user coverage remains in real browser acceptance',()=>{
 for(const text of ['[...savedBeforeSignout.definitionIds,newPublicTest.definition.id]','assert.deepEqual(selectedPlan.definitionIds,[personalityDefinition.id]','assert.deepEqual(selectionWrites,[201]','assert.equal(reusedPlan.id,selectedPlan.id)','assert.deepEqual(reusedPlan.completedRunIds,selectedPlan.completedRunIds)','assert.equal(afterRemove.results.length,beforeRemove.results.length','assert.equal(afterRemove.runs.length,beforeRemove.runs.length',"assert.equal((await api('results/'+first.id,null,other)).status,404)","assert.equal(beforeConsent.status,403)"])assert.ok(source.includes(text),text)
 assert.match(source,/const appendExplorer=await chooseSingleAccountTest\(page,newPublicTest.title\)/)
 assert.match(source,/const repeatExplorer=await chooseSingleAccountTest\(repeatSelectionPage,'Personality Baseline',/)
})
