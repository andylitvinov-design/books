import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createGuestVerifierPacer } from '../scripts/helpers/guest-verifier-pacing.mjs'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
import { COMPASSION_DEFINITIONS } from '../data/assessments/compassion-2026.js'
import { provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('scripts/verify-relationships-assessments.mjs')
const start=source.indexOf(' // One consented guest owns all eight result journeys.')
const end=source.indexOf(' assert.deepEqual(errors,[])',start)
assert.ok(start>0&&end>start,'Exercise the real verifier guest block, not a parallel implementation')
const block=source.slice(start,end)
const definitions=RELATIONSHIPS_INTIMACY_DEFINITIONS.filter(d=>d.instrumentLocale==='en')
const localized=(key,locale)=>RELATIONSHIPS_INTIMACY_DEFINITIONS.find(d=>d.key===key&&d.instrumentLocale===locale)
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
function quota(limit,windowMs){
 let attempts=0,expiresAt=0
 return (now,requestLimit=limit)=>{if(now>=expiresAt){attempts=0;expiresAt=now+windowMs}return ++attempts<=requestLimit}
}

test('workflow session accounting includes the separate signed-in public Relationships guest',()=>{
 const workflow=read('.github/workflows/hh-app-browser.yml')
 const suites=Object.fromEntries([...workflow.matchAll(/(core|extended)\) scripts="([^"]+)"/g)].map(match=>[match[1],match[2].split(' ')]))
 assert.deepEqual(suites,{
  core:['verify-document-hydration','verify-app-r1','verify-compassion-assessments','verify-relationships-assessments'],
  extended:['verify-document-hydration','verify-mhc-sf','verify-asrs6','verify-asrs6-pdf','verify-personality-types','verify-account-status-filters','verify-bach-personal-report-browser'],
 })
 const primary=read('scripts/verify-app-r1.mjs')
 assert.equal([...primary.matchAll(/await launchPublicGuestWithoutAccountWrite\(/g)].length,2)
 assert.equal(COMPASSION_DEFINITIONS.length,2)
 assert.equal([...source.matchAll(/await launchPublicRelationshipGuest\(/g)].length,1)
 assert.equal(definitions.length,8)
 const before=[2,2,1,8,1,1],after=[2,2,1,1,1,1]
 assert.equal(before.reduce((a,b)=>a+b),15)
 assert.equal(after.reduce((a,b)=>a+b),8)
 assert.equal(after.slice(0,4).reduce((a,b)=>a+b),6,'Core job session count')
 assert.equal(after.slice(4).reduce((a,b)=>a+b),2,'Extended job session count')
 const oldBudget=quota(12,3_600_000)
 for(let i=0;i<5+7;i++)assert.equal(oldBudget(0),true)
 assert.equal(oldBudget(0),false,'The eighth Relationships result guest is same-IP request 13')
 const fixedBudget=quota(12,3_600_000)
 for(const sessions of after)for(let i=0;i<sessions;i++)assert.equal(fixedBudget(0),true)
 for(const path of ['scripts/verify-mhc-sf.mjs','scripts/verify-personality-types.mjs'])assert.equal([...read(path).matchAll(/await api\(guest,'guest\/session'/g)].length,1)
 for(const path of ['scripts/verify-document-hydration.mjs','scripts/verify-asrs6-pdf.mjs','scripts/verify-account-status-filters.mjs','scripts/verify-bach-personal-report-browser.mjs'])assert.doesNotMatch(read(path),/guest\/session/)
 // ASRS already has three fixed, explicit TEST-NET fixtures. Do not rotate or
 // extend them to repair this failure: 12 + one expected rejection; 1; 1.
 const asrs=read('scripts/verify-asrs6.mjs')
 assert.match(asrs,/\['192\.0\.2\.61', '192\.0\.2\.62', '192\.0\.2\.63'\]/)
 assert.match(asrs,/attempt < 12/);assert.match(asrs,/assert.equal\(rejected.status\(\), 429\)/)
 assert.match(asrs,/guestSessions: 14, guestJourneySessions: 1, rateControlSessions: 13/)
 assert.doesNotMatch(source,/X-Forwarded-For|192\.0\.2\.|extraHTTPHeaders|clearCookies/)
})

test('production guest quotas and actual SQL counter remain unchanged',()=>{
 const route=read('app/api/app/[...path]/route.js')
 assert.match(route,/op: 'guest-session'[\s\S]*?\},\s+12,\s+3600/)
 assert.match(route,/\{ op: 'guest', guest: credential.id \},\s+joined.includes\('\/save'\) \? 240 : 120,\s+60/)
 const sql=read('supabase/migrations/20261002164037_hh_app_r1_foundation.sql')
 assert.match(sql,/attempts\+1/);assert.match(sql,/return n<=p_limit/)
 const rate=quota(120,60_000)
 for(let i=0;i<120;i++)assert.equal(rate(0),true)
 assert.equal(rate(0),false)
 assert.equal(rate(60_000),true)
})

async function exercise(options={}){
 let now=0,sessionCount=0,contextCount=0,plan=null,run=null,contextClosed=false
 const results=[],plans=[],runs=[],pages=[],ctas=[],checks=[],waits=[],events=[],requests=[]
 const handlers=new Map(),guestRate=quota(120,60_000)
 let guestPacer=createGuestVerifierPacer({now:()=>now,sleep:async ms=>{waits.push(ms);now+=ms},log:event=>events.push(event)})
 if(options.unpaced)guestPacer={record(){},settled(){},async beforeScenario(){}}
 const guest={on:(event,handler)=>handlers.set(event,handler),close:async()=>{assert.ok(pages.every(p=>p.closed));contextClosed=true}}
 const origin='http://127.0.0.1:3100'
 function request(path,method='GET',browser=false){
  assert.ok(guestRate(now,path.endsWith('/save')?240:120),'unchanged same-guest quota rejects request '+path)
  requests.push({path,method,at:now})
  if(browser)handlers.get('request')?.({url:()=>origin+'/api/app/'+path,method:()=>method})
  else guestPacer.record('/api/app/'+path,method)
 }
 const browser={newContext:async configuration=>{contextCount++;assert.equal(configuration.serviceWorkers,'block');assert.deepEqual(configuration.viewport,{width:390,height:844});return guest}}
 const api=async(context,path,body)=>{
  assert.equal(context,guest)
  if(path==='guest/session'){sessionCount++;assert.equal(sessionCount,1);assert.deepEqual(body,{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'});return {id:randomUUID()}}
  request(path,body?'POST':'GET')
  if(path==='guest/bootstrap')return {runs:run&&run.status!=='completed'?[structuredClone(run)]:[],results:structuredClone(results),activeTestPlan:plan?.status==='active'?structuredClone(plan):null}
  if(path==='guest/test-plans'){
   assert.ok(!plan||plan.status==='completed','Do not abandon a previous unfinished plan')
   assert.equal(body.items.length,1);assert.match(body.operationId,/^[0-9a-f-]{36}$/)
   const item=body.items[0],definition=localized(item.definitionKey,item.instrumentLocale)
   assert.equal(item.definitionVersion,definition.version)
   plan={id:options.repeatPlan&&plans.length?plans[0].id:randomUUID(),definitionIds:[definition.id],completedRunIds:[],status:'active'}
   plans.push(plan);return structuredClone(plan)
  }
  assert.equal(path,'guest/test-plans/'+plan.id)
  return {...structuredClone(plan),...(options.incompletePlan?{status:'active'}:{})}
 }
 const diagnosticPage=async(context,label)=>{
  assert.equal(context,guest);assert.ok(pages.every(p=>p.closed),'Only one guest page can remain active')
  const result={closed:false,idle:false,label,mode:null,waitForLoadState:async state=>{assert.equal(state,'networkidle');result.idle=true},close:async()=>{assert.equal(result.idle,true);result.closed=true}}
  pages.push(result);return result
 }
 const navigate=async(target,url)=>{
  assert.equal(target,pages.at(-1));assert.equal(new URL(url).searchParams.get('plan'),plan.id)
  const definition=RELATIONSHIPS_INTIMACY_DEFINITIONS.find(d=>d.id===plan.definitionIds[0])
  assert.equal(new URL(url).pathname,'/'+definition.instrumentLocale+'/client')
  for(const path of ['guest/bootstrap','guest/bootstrap','guest/test-plans/'+plan.id,'guest/runs'])request(path,path==='guest/runs'?'POST':'GET',true)
  run={id:options.repeatRun&&runs.length?runs[0].id:randomUUID(),...provenance(definition),answers:{},progress:0,status:'draft'}
  if(options.dirtyRun)run.answers={q1:2}
  if(options.wrongRunLocale)run.instrumentLocale=definition.instrumentLocale==='ru'?'en':'ru'
  runs.push(run)
 }
 const expect=()=>({toBeVisible:async()=>{}})
 const enterGuestQuestionnaireMode=async(target,_expect,{mode,definition})=>{
  assert.equal(target,pages.at(-1));assert.equal(_expect,expect)
  assert.equal(definition.id,run.definitionId)
  assert.equal(mode,pages.length%2?'guided':'quick')
  target.mode=mode
 }
 const fill=async(target,definition,mode,isGuest,locale)=>{
  assert.equal(target,pages.at(-1));assert.equal(isGuest,true);assert.equal(locale,definition.instrumentLocale);assert.equal(target.mode,mode)
  for(let i=0;i<definition.questions.length;i++){
   request('guest/runs/'+run.id+'/save','POST',true)
   if(mode==='guided'&&i<definition.questions.length-1)request('guest/runs/'+run.id+'/save','POST',true)
  }
  for(const path of ['guest/runs/'+run.id+'/submit','guest/test-plans/'+plan.id,'guest/test-plans/'+plan.id+'/advance','guest/bootstrap'])request(path,path.endsWith('/submit')||path.endsWith('/advance')?'POST':'GET',true)
  const answers=Object.fromEntries(definition.questions.map((q,i)=>[q.id,[0,1,4,4,2,0][i]]))
  const result={id:options.repeatResult&&results.length?results[0].id:randomUUID(),runId:run.id,...scoreAssessment(definition,answers)}
  if(options.staleResult)result.runId='prior-unrelated-run'
  if(options.wrongVersion)result.definitionVersion='v0'
  if(options.wrongResultLocale)result.instrumentLocale=locale==='ru'?'en':'ru'
  if(options.wrongHash)result.contentHash='wrong-hash'
  results.push(result);if(options.duplicateResult)results.push(structuredClone(result))
  run.status='completed';plan.status='completed';plan.completedRunIds=[run.id]
 }
 const assertGuestScaleResult=async(target,_expect,result,locale)=>{assert.equal(target,pages.at(-1));assert.equal(result.runId,run.id);assert.equal(locale,result.instrumentLocale);ctas.push(result.id)}
 const dependencies={browser,api,origin,guestPacer,defs:definitions,localized,diagnosticPage,navigate,expect,enterGuestQuestionnaireMode,fill,assertGuestScaleResult,passed:check=>checks.push(check),navigationMarker(){},randomUUID,assert}
 const execute=new AsyncFunction(...Object.keys(dependencies),'let pacedGuestContext=null,page;'+block+';return {guestResults,guestJourneys,guestPlanIds,guestRunIds,guestResultIds}')
 const outcome=await execute(...Object.values(dependencies))
 assert.equal(contextCount,1);assert.equal(sessionCount,1);assert.equal(contextClosed,true)
 assert.equal(ctas.length,8);assert.equal(new Set(ctas).size,8);assert.equal(checks.length,8)
 assert.equal(outcome.guestJourneys.length,8);assert.equal(outcome.guestResults.length,8)
 assert.equal(waits.length,7);assert.ok(waits.every(ms=>ms===61_000));assert.equal(now,427_000)
 assert.equal(events.filter(event=>event.event==='scenario').length,8)
 return {outcome,requests}
}

test('actual verifier retains one consented guest, eight fresh plans/runs/results, both locales and every optional CTA',async()=>{
 const {outcome,requests}=await exercise()
 assert.deepEqual(outcome.guestJourneys.map(row=>row.definitionKey),definitions.map(d=>d.key))
 assert.deepEqual(outcome.guestJourneys.map(row=>row.instrumentLocale),['ru','en','ru','en','ru','en','ru','en'])
 assert.equal(Math.max(...requests.map(item=>item.at)),427_000)
})

test('removing real-window pacing reproduces unchanged per-guest rate denial',async()=>{
 await assert.rejects(exercise({unpaced:true}),/unchanged same-guest quota rejects/)
})
for(const option of ['repeatPlan','repeatRun','dirtyRun','wrongRunLocale','repeatResult','staleResult','duplicateResult','wrongVersion','wrongResultLocale','wrongHash','incompletePlan'])test('real guest verifier rejects '+option,async()=>{
 await assert.rejects(exercise({[option]:true}))
})

test('verifier keeps the real item-scoped CTA rejection and strict page-error gates',()=>{
 assert.match(block,/await assertGuestScaleResult\(page,expect,result,locale\)/)
 assert.match(block,/await page.waitForLoadState\('networkidle'\)[\s\S]*await page.close\(\)\n\s+guestPacer.settled\(\)/)
 assert.match(source,/assert.deepEqual\(errors,\[\]\)/)
 const helper=read('scripts/helpers/guest-scale-verifier.mjs')
 assert.match(helper,/status: 409/);assert.match(helper,/assertGuestSaveIntent\(captured, result\)/)
 assert.match(helper,/assertGuestProbeIntercept\(intercepted, observed.status\(\)\)/)
})
