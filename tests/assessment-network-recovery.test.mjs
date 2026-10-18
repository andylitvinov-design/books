import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { randomUUID } from 'node:crypto'
const account=fs.readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
const guest=fs.readFileSync(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
const extract=(src,start,end)=>src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)))
const error=code=>Object.assign(new Error(code),{code})
function accountContext(failure='submit') {
 const server={revision:2,status:'in_progress',submittedRevision:null};const calls=[]
 const ctx={run:{revision:2},id:'synthetic-run',index:5,context:{},def:{questions:Array(5)},operation:{current:null},inflight:{current:false},completion:{current:null},finishing:{current:false},c:{},crypto:{randomUUID},calls,error:null,delivered:[],attempts:0,
 setBusy(){},setError(e){ctx.error=e},setStatus(){},setRun(v){ctx.run=v},setContext(){},setSafetyAcknowledged(){},offerAfterCompletion(){},
 onComplete(r,d){ctx.attempts++;if(failure==='navigation'&&ctx.attempts===1)throw error('SERVICE_UNAVAILABLE');ctx.delivered.push({r,d})},
 async appFetch(path,payload){calls.push({path,payload});if(path.endsWith('/save')){if(server.status==='completed')throw error('IMMUTABLE_RUN');assert.equal(payload.expectedRevision,server.revision);server.revision++;return {revision:server.revision}}
 if(path.endsWith('/submit')){if(server.status==='completed'){assert.equal(payload.expectedRevision,server.submittedRevision);return {id:'result',runId:'synthetic-run'}}server.submittedRevision=payload.expectedRevision;server.status='completed';if(failure==='submit')throw new TypeError('lost response');return {id:'result',runId:'synthetic-run'}}}}
 vm.createContext(ctx);vm.runInContext(extract(account,'  async function save(answers','  async function chooseAnswer')+extract(account,'  async function finish(destination','  async function exit()'),ctx);return ctx
}
for(const failure of ['submit','navigation'])test(`account recovers ${failure} failure without editing completed attempt`,async()=>{const ctx=accountContext(failure);await ctx.finish('next');await ctx.finish('report');assert.equal(ctx.delivered.length,1);assert.equal(ctx.delivered[0].d,'next');assert.equal(ctx.calls.filter(x=>x.path.endsWith('/save')).length,1);assert.equal(ctx.calls.filter(x=>x.path.endsWith('/submit')).length,failure==='submit'?2:1)})
test('account repeated synchronous finish dispatches once',async()=>{const ctx=accountContext('none');await Promise.all([ctx.finish(),ctx.finish()]);assert.equal(ctx.calls.filter(x=>x.path.endsWith('/submit')).length,1);assert.equal(ctx.delivered.length,1)})
function guestContext() {
 const server={revision:0,answers:{},last:null};const calls=[]
 const ctx={runLifetime:{current:0},replaceGuestRoute(){},run:{id:'synthetic-run',revision:0,answers:{}},busy:false,answers:{},question:{id:'q1'},mode:'quick',definition:{questions:[{id:'q1'}]},index:0,c:{error:'save failed'},crypto:{randomUUID},error:null,saveOperation:{current:null},saving:{current:false},completion:{current:null},submitting:{current:false},recoveryPending:false,
 setAnswers(v){ctx.answers=v},setBusy(){},setSaveState(){},setError(e){ctx.error=e},setRun(v){ctx.run=v},setContext(){},
 async guestFetch(path,payload){calls.push({path,payload});if(server.last?.operationId===payload.operationId){assert.equal(JSON.stringify(payload),JSON.stringify(server.last));return {id:ctx.run.id,revision:server.revision,answers:{...server.answers}}}if(payload.expectedRevision!==server.revision)throw error('REVISION_CONFLICT');server.revision++;Object.assign(server.answers,payload.answers);server.last=payload;throw new TypeError('lost response')}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function saveGuestRun(','  async function saveTraumaContext()')+extract(guest,'  async function choose(value','  async function submitResult'),ctx);return {ctx,calls,server}
}
test('guest lost autosave retries identical operation, revision and zero answer',async()=>{const {ctx,calls,server}=guestContext();await ctx.choose(0);assert.equal(ctx.answers.q1,undefined);assert.equal(server.answers.q1,0);assert.ok(ctx.saveOperation.current);await ctx.retryGuestSave();assert.equal(ctx.run.revision,1);assert.equal(ctx.answers.q1,0);assert.equal(ctx.saveOperation.current,null);assert.equal(calls.length,2);assert.equal(JSON.stringify(calls[0]),JSON.stringify(calls[1]))})
test('guest save guard blocks synchronous overlapping answer writes',async()=>{const {ctx,calls}=guestContext();await Promise.all([ctx.choose(0),ctx.choose(1)]);assert.equal(calls.length,1)})
test('guest completion reuses exact submission and fresh already-credited plan',async()=>{
 const calls=[];let fail=true;const ctx={runLifetime:{current:0},replaceGuestRoute(){},completion:{current:null},activePlan:{id:'plan',status:'active',revision:0},setGuestResult(){},setActivePlan(p){ctx.activePlan=p},setPlanResults(){},setPhase(p){ctx.phase=p},setActive(){},setRun(){},setMode(){},getDefinitionById(){throw Error('unexpected next')},startRun(){throw Error('unexpected next')},
 async guestFetch(path,body){calls.push({path,body});if(path.endsWith('/submit')){if(fail){fail=false;throw Error('lost submit response')}return{id:'result',runId:'run'}}if(path==='guest/test-plans/plan')return{id:'plan',status:'completed',revision:1,completedRunIds:['run']};if(path==='guest/bootstrap')return{results:[]};throw Error('must not advance credited run')}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function submitSavedRun(','  async function choose(value'),ctx)
 const run={id:'run',revision:7};await assert.rejects(ctx.submitSavedRun(run,'report'));await ctx.submitSavedRun(run,'next');assert.equal(ctx.phase,'result');assert.equal(ctx.completion.current,null);const submits=calls.filter(x=>x.path.endsWith('/submit'));assert.equal(submits.length,2);assert.deepEqual(submits[0],submits[1]);assert.ok(!calls.some(x=>x.path.endsWith('/advance')))
})
test('account plan credits and recovery UI are explicit',()=>{assert.match(account,/plan\.completedRunIds\?\.includes\(result\.runId\) \? plan/);assert.match(account,/completion\.current \? finish\(completion\.current\.destination\) : save\(\)/);assert.match(guest,/completion\.current \? submitResult\(completion\.current\.run, completion\.current\.destination\) : retryGuestSave\(\)/)})
test('guest late save response cannot replace a new run after reset',async()=>{
 const {ctx}=guestContext();let release;ctx.guestFetch=()=>new Promise(resolve=>{release=resolve})
 const pending=ctx.choose(0);assert.equal(ctx.saving.current,true)
 ctx.runLifetime.current++;ctx.saveOperation.current=null;ctx.saving.current=false;ctx.run={id:'new-run',revision:0,answers:{}};ctx.answers={};ctx.error='new-state'
 release({id:'synthetic-run',revision:1,answers:{q1:0}});await pending
 assert.equal(ctx.run.id,'new-run');assert.deepEqual(ctx.answers,{});assert.equal(ctx.saveOperation.current,null);assert.equal(ctx.error,'new-state')
})
test('guest late submit response cannot expose a prior run result after reset',async()=>{
 let release;let published=0;const ctx={runLifetime:{current:0},replaceGuestRoute(){},completion:{current:null},activePlan:null,setGuestResult(){published++},guestFetch:()=>new Promise(resolve=>{release=resolve})}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function submitSavedRun(','  async function choose(value'),ctx)
 const pending=ctx.submitSavedRun({id:'old',revision:4});ctx.runLifetime.current++;ctx.completion.current=null
 release({id:'old-result',runId:'old'});await assert.rejects(pending,/RUN_CHANGED/);assert.equal(published,0);assert.equal(ctx.completion.current,null)
})
test('account completion blocks all later saves until an explicit successful reload',async()=>{
 const ctx=accountContext();await ctx.finish();const count=ctx.calls.length;assert.equal(await ctx.save({q:0},0),null);assert.equal(ctx.calls.length,count)
 const runner=extract(account,'function Runner({','\nfunction ')
 assert.match(runner,/operation\.current = null\n\s+completion\.current = null\n\s+setRun\(value\)/)
 assert.match(runner,/disabled=\{busy \|\| index === 0 \|\| Boolean\(operation\.current\) \|\| Boolean\(completion\.current\)\}/)
 assert.match(runner,/<textarea[\s\S]*?disabled=\{busy \|\| Boolean\(operation\.current\) \|\| Boolean\(completion\.current\)\}/)
})
test('guest successful next-test creation hands busy state to new run',async()=>{
 const ctx={runLifetime:{current:0},replaceGuestRoute(){},completion:{current:null},saveOperation:{current:null},saving:{current:false},submitting:{current:false},busy:false,run:{id:'old',revision:3},activePlan:{id:'plan'},crypto:{randomUUID},
 setBusy(v){ctx.busy=v},setError(){},setRun(v){ctx.run=v},setAnswers(){},setContext(){},setIndex(){},setMode(){},setPhase(v){ctx.phase=v},setGuestResult(){},setActivePlan(v){ctx.activePlan=v},setPlanResults(){},setActive(){},
 getDefinitionById(){return{id:'next-definition',key:'next',version:'v1',instrumentLocale:'ru',questions:[{id:'q'}]}},
 async guestFetch(path){if(path.endsWith('/submit'))return{id:'result',runId:'old'};if(path==='guest/test-plans/plan')return{id:'plan',status:'active',revision:1,completedRunIds:['old'],definitionIds:['first','next-definition'],currentIndex:1};if(path==='guest/bootstrap')return{results:[]};if(path==='guest/runs')return{id:'new',revision:0,answers:{}};throw Error(path)}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function startRun(','  async function begin(')+extract(guest,'  async function submitSavedRun(','  async function choose(value')+extract(guest,'  async function submitResult(','  async function next()'),ctx)
 await ctx.submitResult(ctx.run,'next');assert.equal(ctx.run.id,'new');assert.equal(ctx.phase,'questions');assert.equal(ctx.busy,false);assert.equal(ctx.submitting.current,false);assert.equal(ctx.completion.current,null)
})
test('guest old next-test response cannot clear newer completion recovery',async()=>{
 let release;const newer={run:{id:'new'},result:null};const ctx={runLifetime:{current:0},replaceGuestRoute(){},completion:{current:null},activePlan:{id:'plan'},setGuestResult(){},setActivePlan(){},setPlanResults(){},setActive(){},getDefinitionById(){return{key:'next'}},startRun:()=>new Promise(resolve=>{release=resolve}),
 async guestFetch(path){if(path.endsWith('/submit'))return{id:'result',runId:'old'};if(path==='guest/test-plans/plan')return{id:'plan',status:'active',completedRunIds:['old'],definitionIds:['first','next'],currentIndex:1};return{results:[]}}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function submitSavedRun(','  async function choose(value'),ctx)
 const pending=ctx.submitSavedRun({id:'old',revision:4},'next');await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof release,'function','next-run creation must begin');ctx.runLifetime.current++;ctx.completion.current=newer;release();await pending;assert.equal(ctx.completion.current,newer)
})
test('guest plan resume pins instrument version and language independently of UI labels',()=>{
 const en={id:'registered-en-v1',key:'hh-weekly-pulse',version:'v1',instrumentLocale:'en',questions:[{id:'weekly.mood',text:'Mood'}]}
 const ru={id:'registered-ru-v2',key:'hh-weekly-pulse',version:'v2',instrumentLocale:'ru',questions:[{id:'weekly.mood',text:'Настроение'}]}
 const line=extract(guest,'  const definition = useMemo(','  const question =')
 const ctx={run:{definitionId:en.id},active:en.key,locale:'ru',useMemo:fn=>fn(),getDefinitionById:id=>{assert.equal(id,en.id);return en},definitionFor:()=>ru}
 vm.createContext(ctx);vm.runInContext(line+'; globalThis.displayed=definition',ctx)
 assert.equal(ctx.displayed,en);assert.equal(ctx.displayed.instrumentLocale,'en');assert.equal(ctx.displayed.version,'v1');assert.equal(ctx.locale,'ru')
 const fresh={...ctx,run:null};vm.createContext(fresh);vm.runInContext(line+'; globalThis.displayed=definition',fresh);assert.equal(fresh.displayed,ru)
 assert.match(extract(guest,'  async function begin(','  async function beginGuestBattery('),/setRun\(null\)\n\s+setActive\(id\)/)
})

test('guest missing or unknown persisted definition fails closed without locale substitution',()=>{
 const code=extract(guest,'  const definition = useMemo(','  const question =')
 for(const run of [{id:'missing'},{id:'unknown',definitionId:'unknown-id'}]) {
  let fallback=0
  const ctx={run,active:'hh-weekly-pulse',locale:'ru',useMemo:fn=>fn(),getDefinitionById(){throw Error('UNKNOWN_INSTRUMENT')},definitionFor(){fallback++;return {id:'substitute'}}}
  vm.createContext(ctx);vm.runInContext(code+';globalThis.displayed=definition',ctx)
  assert.equal(ctx.displayed,null);assert.equal(fallback,0)
 }
 assert.match(guest,/run && !definition && <div[^>]+role="alert"/)
 assert.match(guest,/This saved test version is currently unavailable/)
})

test('guest missing-version recovery guards question header and context form',()=>{
 assert.match(guest,/phase === 'questions' && definition \? \(/)
 assert.match(guest,/phase === 'questions' && definition && question && run && traumaContextReady/)
 assert.match(guest,/phase === 'context' && definition\?\.optionalContext\?\.length > 0/)
})

test('guest bootstrap returns the verified session expiry even before any runs exist',async()=>{
 const repository=fs.readFileSync(new URL('../lib/app/guest-repository.js',import.meta.url),'utf8')
 const credential={id:'synthetic-session',secretHash:'synthetic-hash'},config={},calls=[]
 const expiresAt=new Date('2026-10-23T12:00:00.000Z')
 const db={async query(sql,params){calls.push(sql);assert.deepEqual(Array.from(params),[credential.id]);return{rows:[]}}}
 const ctx={config,iso:value=>value.toISOString(),
  async withResultInterpretations(actualDb,results){assert.equal(actualDb,db);assert.equal(results.length,0);return results},
  async sessionRow(actualDb,actualCredential){assert.equal(actualDb,db);assert.equal(actualCredential,credential);return{id:credential.id,expires_at:expiresAt}},
  async transaction(actualConfig,accountId,read,options){assert.equal(actualConfig,config);assert.equal(accountId,null);assert.equal(options.server,true);return read(db)},
  guestRunView(){assert.fail('No synthetic run exists')},guestResultView(){assert.fail('No synthetic result exists')},moodView(){assert.fail('No synthetic mood exists')},testPlanView(){assert.fail('No synthetic plan exists')},
 }
 const methods=vm.runInNewContext('({'+extract(repository,'    async bootstrap(credential)','    async createTestPlan(')+'})',ctx)
 const result=await methods.bootstrap(credential)
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{expiresAt:'2026-10-23T12:00:00.000Z',runs:[],results:[],moodCheckins:[],activeTestPlan:null})
 assert.equal(calls.length,4)
 for(const sql of calls){assert.match(sql,/^select /);assert.match(sql,/guest_session_id=\$1/)}
})

function batteryContext() {
 const first={id:'first-en-v1',key:'first',version:'v1',instrumentLocale:'en',questions:[{id:'q'}]}
 const second={id:'second-en-v1',key:'second',version:'v1',instrumentLocale:'en',questions:[{id:'q'}]}
 const expiresAt='2026-10-23T12:00:00.000Z'
 const ctx={runLifetime:{current:0},replaceGuestRoute(){},saving:{current:false},submitting:{current:false},saveOperation:{current:{old:true}},completion:{current:{old:true}},run:{id:'old'},locale:'ru',pendingMood:null,pendingGuestDefinitions:[],definition:first,adult:true,necessary:true,c:{error:'failed'},crypto:{randomUUID},localZone:()=> 'UTC',calls:[],definitions:[first,second],
 definitionFor:key=>[first,second].find(d=>d.key===key),getDefinitionById:id=>{const d=[first,second].find(d=>d.id===id);if(!d)throw Error('unknown');return d},
 async guestFetch(path,body){ctx.calls.push({path,body});if(path==='guest/bootstrap'){
    if(ctx.guestSessionMissing)throw Object.assign(new Error('GUEST_SESSION_REQUIRED'),{status:401,code:'GUEST_SESSION_REQUIRED'});
    return {expiresAt,runs:[],results:[],moodCheckins:[],activeTestPlan:null}
  }
  if(path==='guest/session'){ctx.guestSessionMissing=false;return{expiresAt}};if(path==='guest/test-plans')return{id:'plan',status:'active',currentIndex:1,definitionIds:[first.id,second.id]};if(path==='guest/runs')return{id:'new-'+body.definitionKey,definitionId:[first,second].find(d=>d.key===body.definitionKey).id};throw Error(path)}}
 for(const name of ['Busy','Run','Active','GuestResult','Error','SaveState','SessionExpires','LatestGuestMood','Answers','Context','Index','Mode','Phase','ActivePlan','PlanResults','PendingGuestDefinitions'])ctx['set'+name]=value=>{ctx[name[0].toLowerCase()+name.slice(1)]=value}
 vm.createContext(ctx)
 vm.runInContext(extract(guest,'  async function startRun(','  async function saveGuestRun(')+extract(guest,'  function resetToCatalog()','  return (\n    <>'),ctx)
 return ctx
}
const tick=()=>new Promise(resolve=>setImmediate(resolve))
for(const stage of ['guest/bootstrap','guest/test-plans','guest/runs'])for(const transition of ['reset','new launch'])test(`guest battery ignores delayed ${stage} after ${transition}`,async()=>{
 const ctx=batteryContext();const fetch=ctx.guestFetch;let release;let held=true
 ctx.guestFetch=async(path,body)=>{if(held&&path===stage){held=false;return new Promise(resolve=>{release=()=>resolve(fetch(path,body))})}return fetch(path,body)}
 const old=ctx.beginGuestBattery([{key:'first'},{key:'second'}]);await tick();assert.equal(typeof release,'function')
 assert.equal(ctx.saveOperation.current,null);assert.equal(ctx.completion.current,null);assert.equal(ctx.run,null)
 if(transition==='reset')ctx.resetToCatalog();else await ctx.beginGuestBattery([{key:'first'}])
 const expected={run:ctx.run,active:ctx.active,phase:ctx.phase,busy:ctx.busy,plan:ctx.activePlan,error:ctx.error,expiresAt:ctx.sessionExpires}
 release();await old
 assert.deepEqual({run:ctx.run,active:ctx.active,phase:ctx.phase,busy:ctx.busy,plan:ctx.activePlan,error:ctx.error,expiresAt:ctx.sessionExpires},expected)
})
test('guest CTA creates one session automatically and honors pinned plan instrument',async()=>{
 const ctx=batteryContext();ctx.guestSessionMissing=true
 await ctx.beginGuestBattery([{key:'first'},{key:'second'}])
 const session=ctx.calls.filter(c=>c.path==='guest/session')
 assert.equal(session.length,1)
 assert.deepEqual(JSON.parse(JSON.stringify(session[0].body)),{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
 assert.equal(ctx.sessionExpires,'2026-10-23T12:00:00.000Z')
 const call=ctx.calls.find(c=>c.path==='guest/runs')
 assert.equal(call.body.definitionKey,'second');assert.equal(call.body.instrumentLocale,'en');assert.equal(call.body.definitionVersion,'v1')
 assert.equal(ctx.locale,'ru');assert.equal(ctx.phase,'questions');assert.equal(ctx.busy,false)
})
test('existing guest starts directly without creating another temporary session',async()=>{
 const ctx=batteryContext()
 await ctx.beginGuestBattery([{key:'first'},{key:'second'}])
 assert.equal(ctx.calls.filter(c=>c.path==='guest/session').length,0)
 assert.equal(ctx.sessionExpires,'2026-10-23T12:00:00.000Z')
 assert.equal(ctx.phase,'questions')
})
test('guest completed battery goes to saved summary with no extra run',async()=>{
 const ctx=batteryContext();const fetch=ctx.guestFetch
 ctx.guestFetch=(path,body)=>path==='guest/test-plans'?Promise.resolve({id:'plan',status:'completed',completedRunIds:[]}):fetch(path,body)
 await ctx.beginGuestBattery([{key:'first'},{key:'second'}])
 assert.equal(ctx.phase,'summary');assert.equal(ctx.busy,false);assert.equal(ctx.calls.filter(c=>c.path==='guest/runs').length,0)
})
for(const stage of ['guest/session','guest/test-plans','guest/runs'])test(`guest direct start ignores delayed ${stage} after reset`,async()=>{
 const ctx=batteryContext();ctx.guestSessionMissing=stage==='guest/session'
 const fetch=ctx.guestFetch;let release
 ctx.guestFetch=(path,body)=>path===stage?new Promise(resolve=>{release=()=>resolve(fetch(path,body))}):fetch(path,body)
 const pending=ctx.beginGuestBattery([{key:'first'},{key:'second'}])
 await tick();assert.equal(typeof release,'function');ctx.resetToCatalog();const expiresAt=ctx.sessionExpires;release();await pending
 assert.equal(ctx.phase,'catalog');assert.equal(ctx.run,null);assert.equal(ctx.activePlan,null);assert.equal(ctx.busy,false)
 assert.equal(ctx.sessionExpires,expiresAt,'A stale launch must not replace the current session expiry')
})
test('failed guest bootstrap does not silently create a guest session',async()=>{
 const ctx=batteryContext(),fetch=ctx.guestFetch
 ctx.guestFetch=(path,body)=>path==='guest/bootstrap'?Promise.reject(Object.assign(new Error('SERVICE_UNAVAILABLE'),{status:503,code:'SERVICE_UNAVAILABLE'})):fetch(path,body)
 await ctx.beginGuestBattery([{key:'first'},{key:'second'}])
 assert.equal(ctx.calls.filter(c=>c.path==='guest/session').length,0)
 assert.equal(ctx.error,'failed')
})
test('guest continue uses plan definition even when UI locale differs',async()=>{
 const ctx=batteryContext();ctx.activePlan={id:'plan',status:'active',currentIndex:1,definitionIds:ctx.definitions.map(d=>d.id)}
 ctx.definitionFor=()=>{throw Error('must not substitute current UI definition')}
 await ctx.continuePlan();assert.equal(ctx.run.definitionId,'second-en-v1');assert.equal(ctx.activePlan.id,'plan');assert.equal(ctx.busy,false)
})

const routeIds = {
 plan: '11111111-1111-4111-8111-111111111111',
 run: '22222222-2222-4222-8222-222222222222',
 result: '33333333-3333-4333-8333-333333333333',
 other: '44444444-4444-4444-8444-444444444444',
}
function routeContext() {
 const ctx = batteryContext()
 Object.assign(ctx, {
  selfGuestRoute: { current: null }, initialLaunchRef: { current: null },
  planId: null, requestedGuestRun: null, requestedGuestResult: null, requestedGuestTests: null,
  effects: [], routes: [],
  useEffect(fn) { ctx.effects.push(fn) },
  isGuestReference: value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  replaceGuestRoutePath(selection) { ctx.routes.push(selection) },
 })
 vm.runInContext(extract(guest, '  function replaceGuestRoute(', '  async function signIn('), ctx)
 ctx.mountCleanup = ctx.effects[0]()
 ctx.navigate = ({planId = null, runId = null, resultId = null} = {}) => {
  ctx.routeCleanup?.()
  Object.assign(ctx, { planId, requestedGuestRun: runId, requestedGuestResult: resultId })
  ctx.routeCleanup = ctx.effects[1]()
 }
 return ctx
}
const routeSnapshot = ctx => ({
 run: ctx.run, active: ctx.active, phase: ctx.phase, result: ctx.guestResult,
 plan: ctx.activePlan, busy: ctx.busy, error: ctx.error, routes: [...ctx.routes],
})

test('guest URL restores only the same-cookie saved result and its completed set', async () => {
 const ctx = routeContext()
 const saved = {id: routeIds.result, runId: routeIds.run, definitionKey: 'first', dimensions: [{value: 0}]}
 ctx.guestFetch = async () => ({ results: [saved], runs: [], activeTestPlan: {id: routeIds.plan, status: 'completed', completedRunIds: [routeIds.run]} })
 ctx.navigate({resultId: routeIds.result}); await tick()
 assert.equal(ctx.guestResult, saved)
 assert.equal(ctx.phase, 'result')
 assert.equal(ctx.run, null)
 assert.equal(ctx.activePlan.id, routeIds.plan)
 assert.deepEqual([...ctx.planResults], [saved])
})

test('guest URL cannot expose an unavailable result or keep the previous result visible', async () => {
 const ctx = routeContext(); ctx.guestResult = {id: 'previous'}
 ctx.navigate({resultId: routeIds.result}); await tick()
 assert.equal(ctx.guestResult, null)
 assert.equal(ctx.run, null)
 assert.equal(ctx.phase, 'catalog')
 assert.ok(ctx.error)
})

test('guest run URL pins saved version, instrument language, progress and zero answer', async () => {
 const ctx = routeContext()
 const existing = { id: routeIds.run, definitionId: ctx.definitions[1].id, answers: {q: 0}, progress: 999 }
 ctx.guestFetch = async () => ({ runs: [existing], results: [] })
 ctx.definitionFor = () => { throw Error('must not use UI locale to replace saved definition') }
 ctx.navigate({runId: routeIds.run}); await tick()
 assert.equal(ctx.run, existing)
 assert.equal(ctx.active, 'second')
 assert.equal(ctx.answers.q, 0)
 assert.equal(ctx.index, 0)
 assert.equal(ctx.phase, 'questions')
 assert.equal(ctx.locale, 'ru')
})

for (const definitionId of [undefined, 'unregistered']) test(`guest URL fails closed for ${definitionId || 'missing'} saved version`, async () => {
 const ctx = routeContext()
 ctx.guestFetch = async () => ({ runs: [{id: routeIds.run, definitionId}], results: [] })
 ctx.navigate({runId: routeIds.run}); await tick()
 assert.equal(ctx.run, null)
 assert.equal(ctx.active, null)
 assert.equal(ctx.phase, 'catalog')
 assert.ok(ctx.error)
})

test('guest URL refuses a run that is not the selected plan current definition', async () => {
 const ctx = routeContext()
 ctx.guestFetch = async path => path === 'guest/bootstrap'
  ? {runs: [{id: routeIds.run, definitionId: ctx.definitions[0].id}], results: []}
  : {id: routeIds.plan, status: 'active', currentIndex: 1, definitionIds: ctx.definitions.map(d => d.id)}
 ctx.navigate({planId: routeIds.plan, runId: routeIds.run}); await tick()
 assert.equal(ctx.run, null)
 assert.equal(ctx.activePlan, null)
 assert.equal(ctx.phase, 'catalog')
 assert.ok(ctx.error)
})

for (const route of [{runId: 'invalid'}, {runId: routeIds.run, resultId: routeIds.result}, {planId: 'invalid'}]) test(`guest malformed URL stays closed before bootstrap: ${JSON.stringify(route)}`, async () => {
 const ctx = routeContext()
 ctx.navigate(route); await tick()
 assert.equal(ctx.calls.length, 0)
 assert.equal(ctx.run, null)
 assert.equal(ctx.guestResult, null)
 assert.ok(ctx.error)
})

for (const stage of ['guest/bootstrap', 'guest/test-plans/' + routeIds.plan, 'guest/runs']) {
 for (const transition of ['reset', 'new result route', 'unmount']) test(`guest route ignores delayed ${stage} after ${transition}`, async () => {
  const ctx = routeContext()
  const plan = {id: routeIds.plan, status: 'active', currentIndex: 1, definitionIds: ctx.definitions.map(d => d.id), completedRunIds: []}
  const result = {id: routeIds.result, runId: routeIds.other, definitionKey: 'first'}
  let release, held = true
  const fetch = async path => {
   if (path === 'guest/bootstrap') return {runs: [], results: [result]}
   if (path === 'guest/test-plans/' + routeIds.plan) return plan
   if (path === 'guest/runs') return {id: routeIds.run, definitionId: ctx.definitions[1].id, revision: 0, answers: {}}
   throw Error(path)
  }
  ctx.guestFetch = (path, body) => {
   if (held && path === stage) { held = false; return new Promise(resolve => { release = () => resolve(fetch(path, body)) }) }
   return fetch(path, body)
  }
  ctx.navigate({planId: routeIds.plan}); await tick()
  assert.equal(typeof release, 'function')
  if (transition === 'reset') ctx.resetToCatalog()
  else if (transition === 'new result route') { ctx.navigate({resultId: routeIds.result}); await tick(); assert.equal(ctx.guestResult, result) }
  else { ctx.routeCleanup?.(); ctx.mountCleanup() }
  const expected = routeSnapshot(ctx)
  release(); await tick()
  assert.deepEqual(routeSnapshot(ctx), expected)
 })
}

test('guest route ignores a late bootstrap failure after a newer result loads', async () => {
 const ctx = routeContext(); let reject
 ctx.guestFetch = () => new Promise((_, fail) => { reject = fail })
 ctx.navigate({runId: routeIds.run})
 const result = {id: routeIds.result, definitionKey: 'first'}
 ctx.guestFetch = async () => ({results: [result], runs: []})
 ctx.navigate({resultId: routeIds.result}); await tick()
 reject(Error('expired old request')); await tick()
 assert.equal(ctx.guestResult, result)
 assert.equal(ctx.error, '')
})

test('guest own URL update preserves run lifetime, zero answers and pending recovery', () => {
 const ctx = routeContext()
 const pending = {runId: routeIds.run, body: {answers: {q: 0}, expectedRevision: 3, operationId: 'same-operation'}}
 ctx.run = {id: routeIds.run, revision: 3}; ctx.answers = {q: 0}
 ctx.saveOperation.current = pending; ctx.busy = true; ctx.phase = 'questions'
 const epoch = ctx.runLifetime.current
 ctx.replaceGuestRoute({runId: routeIds.run})
 ctx.navigate({runId: routeIds.run})
 assert.equal(ctx.runLifetime.current, epoch)
 assert.equal(ctx.saveOperation.current, pending)
 assert.equal(ctx.answers.q, 0)
 assert.equal(ctx.phase, 'questions')
 assert.equal(ctx.busy, true)
 assert.equal(ctx.calls.length, 0)
})

test('guest external result route invalidates a pending answer save without dropping the newer result', async () => {
 const ctx = routeContext(); let release
 Object.assign(ctx, {question: {id: 'q'}, mode: 'quick', index: 0, answers: {}, busy: false, recoveryPending: false})
 ctx.run = {id: routeIds.run, revision: 0, answers: {}}
 ctx.completion.current = null; ctx.saveOperation.current = null
 vm.runInContext(extract(guest, '  async function saveGuestRun(', '  async function saveTraumaContext()') + extract(guest, '  async function choose(value', '  async function submitResult'), ctx)
 ctx.guestFetch = () => new Promise(resolve => { release = resolve })
 const pending = ctx.choose(0)
 const result = {id: routeIds.result, definitionKey: 'second'}
 ctx.guestFetch = async () => ({runs: [], results: [result]})
 ctx.navigate({resultId: routeIds.result}); await tick()
 release({id: routeIds.run, revision: 1, answers: {q: 0}}); await pending
 assert.equal(ctx.run, null)
 assert.equal(ctx.guestResult, result)
 assert.equal(ctx.phase, 'result')
 assert.equal(ctx.saveOperation.current, null)
 assert.equal(ctx.error, '')
})

test('guest new single selection cannot retain an old matching plan from the render closure', async () => {
 const ctx = batteryContext(); const routes = []
 // React state setters do not change the values captured by this render.
 ctx.activePlan = {id: routeIds.plan, status: 'active', currentIndex: 0, definitionIds: ctx.definitions.map(d => d.id)}
 ctx.setActivePlan = value => { ctx.nextActivePlan = value }
 ctx.replaceGuestRoute = value => { routes.push(value) }
 await ctx.beginGuestBattery([{key: 'first'}])
 assert.equal(ctx.nextActivePlan, null)
 assert.equal(routes.length, 1)
 assert.equal(routes[0].planId, null)
 assert.equal(ctx.run.definitionId, ctx.definitions[0].id)
})

test('guest selection URL can relaunch the same test after its prior route was cleared', () => {
 const ctx = routeContext(); const launches = []
 ctx.beginGuestBattery = entries => { launches.push(entries.map(entry => entry.key)) }
 ctx.requestedGuestTests = 'first'; ctx.effects[2]()
 ctx.requestedGuestTests = null; ctx.requestedGuestRun = routeIds.run; ctx.effects[2]()
 ctx.requestedGuestTests = 'first'; ctx.requestedGuestRun = null; ctx.effects[2]()
 assert.deepEqual(launches.map(items => [...items]), [['first'], ['first']])
})
