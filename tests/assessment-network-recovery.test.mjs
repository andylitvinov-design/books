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
 const ctx={runLifetime:{current:0},run:{id:'synthetic-run',revision:0,answers:{}},busy:false,answers:{},question:{id:'q1'},mode:'quick',definition:{questions:[{id:'q1'}]},index:0,c:{error:'save failed'},crypto:{randomUUID},error:null,saveOperation:{current:null},saving:{current:false},completion:{current:null},submitting:{current:false},recoveryPending:false,
 setAnswers(v){ctx.answers=v},setBusy(){},setSaveState(){},setError(e){ctx.error=e},setRun(v){ctx.run=v},setContext(){},
 async guestFetch(path,payload){calls.push({path,payload});if(server.last?.operationId===payload.operationId){assert.equal(JSON.stringify(payload),JSON.stringify(server.last));return {id:ctx.run.id,revision:server.revision,answers:{...server.answers}}}if(payload.expectedRevision!==server.revision)throw error('REVISION_CONFLICT');server.revision++;Object.assign(server.answers,payload.answers);server.last=payload;throw new TypeError('lost response')}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function saveGuestRun(','  async function saveTraumaContext()')+extract(guest,'  async function choose(value','  async function submitResult'),ctx);return {ctx,calls,server}
}
test('guest lost autosave retries identical operation, revision and zero answer',async()=>{const {ctx,calls,server}=guestContext();await ctx.choose(0);assert.equal(ctx.answers.q1,undefined);assert.equal(server.answers.q1,0);assert.ok(ctx.saveOperation.current);await ctx.retryGuestSave();assert.equal(ctx.run.revision,1);assert.equal(ctx.answers.q1,0);assert.equal(ctx.saveOperation.current,null);assert.equal(calls.length,2);assert.equal(JSON.stringify(calls[0]),JSON.stringify(calls[1]))})
test('guest save guard blocks synchronous overlapping answer writes',async()=>{const {ctx,calls}=guestContext();await Promise.all([ctx.choose(0),ctx.choose(1)]);assert.equal(calls.length,1)})
test('guest completion reuses exact submission and fresh already-credited plan',async()=>{
 const calls=[];let fail=true;const ctx={runLifetime:{current:0},completion:{current:null},activePlan:{id:'plan',status:'active',revision:0},setGuestResult(){},setActivePlan(p){ctx.activePlan=p},setPlanResults(){},setPhase(p){ctx.phase=p},setActive(){},setRun(){},setMode(){},getDefinitionById(){throw Error('unexpected next')},startRun(){throw Error('unexpected next')},
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
 let release;let published=0;const ctx={runLifetime:{current:0},completion:{current:null},activePlan:null,setGuestResult(){published++},guestFetch:()=>new Promise(resolve=>{release=resolve})}
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
 const ctx={runLifetime:{current:0},completion:{current:null},saveOperation:{current:null},saving:{current:false},submitting:{current:false},busy:false,run:{id:'old',revision:3},activePlan:{id:'plan'},crypto:{randomUUID},
 setBusy(v){ctx.busy=v},setError(){},setRun(v){ctx.run=v},setAnswers(){},setContext(){},setIndex(){},setMode(){},setPhase(v){ctx.phase=v},setGuestResult(){},setActivePlan(v){ctx.activePlan=v},setPlanResults(){},setActive(){},
 getDefinitionById(){return{id:'next-definition',key:'next',version:'v1',instrumentLocale:'ru',questions:[{id:'q'}]}},
 async guestFetch(path){if(path.endsWith('/submit'))return{id:'result',runId:'old'};if(path==='guest/test-plans/plan')return{id:'plan',status:'active',revision:1,completedRunIds:['old'],definitionIds:['first','next-definition'],currentIndex:1};if(path==='guest/bootstrap')return{results:[]};if(path==='guest/runs')return{id:'new',revision:0,answers:{}};throw Error(path)}}
 vm.createContext(ctx);vm.runInContext(extract(guest,'  async function startRun(','  async function begin(')+extract(guest,'  async function submitSavedRun(','  async function choose(value')+extract(guest,'  async function submitResult(','  async function next()'),ctx)
 await ctx.submitResult(ctx.run,'next');assert.equal(ctx.run.id,'new');assert.equal(ctx.phase,'mode');assert.equal(ctx.busy,false);assert.equal(ctx.submitting.current,false);assert.equal(ctx.completion.current,null)
})
test('guest old next-test response cannot clear newer completion recovery',async()=>{
 let release;const newer={run:{id:'new'},result:null};const ctx={runLifetime:{current:0},completion:{current:null},activePlan:{id:'plan'},setGuestResult(){},setActivePlan(){},setPlanResults(){},setActive(){},getDefinitionById(){return{key:'next'}},startRun:()=>new Promise(resolve=>{release=resolve}),
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
 assert.match(extract(guest,'  async function begin(','  async function createGuestSession()'),/setRun\(null\)\n\s+setActive\(id\)/)
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
 assert.match(guest,/phase === 'mode' && definition && run && traumaContextReady/)
 assert.match(guest,/phase === 'context' && definition\?\.optionalContext\?\.length > 0/)
})
