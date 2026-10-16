import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
const origin='http://127.0.0.1:3100'
function extract(name,next){return source.slice(source.indexOf('async function '+name+'('),source.indexOf(next,source.indexOf('async function '+name+'(')))}
const guestHelper=extract('launchPublicGuestWithoutAccountWrite','async function enterTest(')
const accountHelper=extract('chooseSingleAccountTest','// A public launch')
const definition={id:'mini-ipip-20:1:en',key:'mini-ipip-20'}
async function guestScenario({write=false,changed=false,wrongGuest=false,wrongURL=false,authenticated=true,embedded=false}={}){
 let callback,removed=false,reads=0,consented=false
 const mode={visible:false},consent={visible:true,or:()=>({visible:true}),isVisible:async()=>consent.visible}
 const guest={visible:true,locator:selector=>{assert.equal(selector,'.hh-test-mode-picker');return mode},getByRole(role,{name,exact}){
  assert.equal(exact,true)
  if(role==='heading'){assert.equal(name,'Before you start');return consent}
  assert.equal(name,'Continue');return {click:async()=>{consented=true;mode.visible=true;consent.visible=false}}
 },getByLabel(name,{exact}){assert.equal(exact,true);assert.ok(['I am 18 or older.','I agree to temporary private processing of my answers and result for this self-observation test.'].includes(name));return {check:async()=>{}}}}
 const target={on:(event,fn)=>{assert.equal(event,'request');callback=fn},off:(event,fn)=>{assert.equal(event,'request');assert.equal(fn,callback);removed=true},
  locator:selector=>{assert.equal(selector,'#cabinet-tests');return guest},
  getByRole:(role,{name,exact})=>{assert.equal(role,'button');assert.equal(name,'Start free monitoring');assert.equal(exact,true);return {first(){return this},click:async()=>{
   callback({url:()=>origin+'/api/app/guest/runs',method:()=> 'POST'})
   if(write)callback({url:()=>origin+'/api/app/test-plans',method:()=> 'POST'})
  }}}
 }
 const expect=target=>({toBeVisible:async()=>assert.equal(target.visible,true),toHaveURL:async predicate=>assert.equal(predicate(new URL(origin+(wrongURL?'/en/app/tests?plan=bad':embedded?'/en/client':'/en/client?startTests=mini-ipip-20'))),true)})
 const api=async(path,body,ctx)=>{
  assert.equal(ctx,'context')
  if(path==='guest/bootstrap')return {status:200,data:{runs:[{definitionId:wrongGuest?'wrong':definition.id}]}}
  assert.equal(path,'bootstrap');reads++
  return authenticated?{status:200,data:{account:{id:'b'},activeTestPlan:{id:'saved',definitionIds:[changed&&reads===2?'bad':'original']},latestTestPlan:null,runs:[],results:[]}}:{status:401}
 }
 try{await new Function('assert','expect','api',guestHelper+';return launchPublicGuestWithoutAccountWrite')(assert,expect,api)(target,'context',definition,{embedded})}finally{assert.equal(removed,true)}
 assert.equal(consented,true)
}
test('public guest launch proves exact route/run and unchanged authenticated account',()=>guestScenario())
test('embedded public guest launch stays on the exact client route',()=>guestScenario({embedded:true}))
test('public guest launch remains unauthenticated without Google cookies',()=>guestScenario({authenticated:false}))
for(const option of ['write','changed','wrongGuest','wrongURL'])test('public audience proof rejects '+option,async()=>{await assert.rejects(guestScenario({[option]:true}))})

async function accountScenario({openCount=1,wrongRoute=false,blocked=false,unchanged=false,wrongRemoval=false,duplicates=false}={}){
 let opened=false,browsed=false,selected=['Suggestion','Second'],picked=false
 const checked={evaluateAll:async()=>[...selected]}
 const explorer={isVisible:async()=>opened,locator:selector=>{assert.equal(selector,'article input[type="checkbox"]:checked');return checked},getByRole(role,{name,exact,checked:onlyChecked}){
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
 const page={goto:async url=>assert.equal(url,origin+'/en/app/tests'),locator:selector=>selector==='#my-test-explorer'?explorer:{visible:true},getByRole(role,{name}){
  assert.equal(role,'button');assert.equal(String(name),'/^(Open test filters|Review test filters)/');return {count:openCount,click:async()=>{opened=true}}
 }}
 const expect=target=>({toHaveURL:async url=>{assert.equal(url,origin+'/en/app/tests');assert.equal(wrongRoute,false)},toBeVisible:async()=>assert.equal(target===explorer?opened:target.visible,true),toHaveCount:async n=>assert.equal(target===checked?selected.length:target.count,n),toHaveAttribute:async(key,value)=>{assert.equal(key,'aria-label');assert.deepEqual(selected,[value])}})
 expect.poll=fn=>({toEqual:async expected=>assert.deepEqual(await fn(),expected)})
 const choose=async(target,name)=>{assert.equal(target,explorer);assert.equal(opened&&browsed,true);assert.deepEqual(selected,[]);selected=[name];picked=true}
 const result=await new Function('expect','origin','chooseVisibleTest',accountHelper+';return chooseSingleAccountTest')(expect,origin,choose)(page,'Personality Baseline')
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
 assert.match(source,/const repeatExplorer=await chooseSingleAccountTest\(repeatSelectionPage,'Personality Baseline'\)/)
})
