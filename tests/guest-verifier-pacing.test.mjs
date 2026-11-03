import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createGuestVerifierPacer } from '../scripts/helpers/guest-verifier-pacing.mjs'
import { PERSONALITY_TYPE_DEFINITIONS } from '../data/assessments/personality-types-original-2026.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const definitions=PERSONALITY_TYPE_DEFINITIONS.filter(d=>d.instrumentLocale==='en')
// Canonical dev/StrictMode flow: plan POST + two mount bootstrap GETs +
// plan GET + run POST, then answer/Next saves, submit, plan read/advance,
// report bootstrap and verifier bootstrap. One guest owns all four scenarios.
function scenarioPaths(definition,index) {
 return [
  '/guest/test-plans','/guest/bootstrap','/guest/bootstrap','/guest/test-plans/id','/guest/runs',
  ...definition.questions.flatMap((_,question)=>['/guest/runs/id/save',
   ...(index%2===0&&question<definition.questions.length-1?['/guest/runs/id/save']:[])]),
  '/guest/runs/id/submit','/guest/test-plans/id','/guest/test-plans/id/advance','/guest/bootstrap','/guest/bootstrap',
 ]
}
// Model the existing SQL fixed-window counter, including denied attempts.
function quota() {
 let attempts=0, expiresAt=0
 return (path,now)=>{if(now>=expiresAt){attempts=0;expiresAt=now+60_000}attempts++;return {attempts,allowed:attempts<=(path.endsWith('/save')?240:120)}}
}
test('production guest quota and negative rate-limit cases remain unchanged',()=>{
 assert.match(read('app/api/app/[...path]/route.js'),/\{ op: 'guest', guest: credential.id \},\s+joined.includes\('\/save'\) \? 240 : 120,\s+60/)
 const sql=read('supabase/migrations/20261002164037_hh_app_r1_foundation.sql')
 assert.match(sql,/attempts\+1/);assert.match(sql,/return n<=p_limit/)
 const check=quota();for(let i=1;i<=120;i++)assert.equal(check('/guest/bootstrap',0).allowed,true)
 assert.equal(check('/guest/bootstrap',0).allowed,false)
 const saves=quota();for(let i=1;i<=240;i++)assert.equal(saves('/guest/runs/id/save',0).allowed,true)
 assert.equal(saves('/guest/runs/id/save',0).allowed,false)
})
test('unpaced same-guest source request budget reproduces119 then120 then rejected121',()=>{
 const paths=definitions.map(scenarioPaths)
 assert.deepEqual(paths.map(items=>items.length),[73,46,49,26])
 const check=quota();let last
 for(const path of [...paths[0],...paths[1]]){last=check(path,0);assert.equal(last.allowed,true)}
 assert.equal(last.attempts,119)
 assert.deepEqual(check(paths[2][0],0),{attempts:120,allowed:true})
 assert.deepEqual(check(paths[2][1],0),{attempts:121,allowed:false})
 assert.equal(paths[2][1],'/guest/bootstrap')
})
test('real-window pacing preserves same guest and permits all four complete request sequences',async()=>{
 let clock=0;const sleeps=[],events=[];const check=quota()
 const pacer=createGuestVerifierPacer({now:()=>clock,sleep:async ms=>{sleeps.push(ms);clock+=ms},log:e=>events.push(e)})
 const completed=[]
 for(const [i,definition] of definitions.entries()){
  await pacer.beforeScenario(definition.key)
  for(const path of scenarioPaths(definition,i)){
   pacer.record(path)
   assert.equal(check(path,clock).allowed,true,definition.key+' '+path)
   clock+=100
  }
  pacer.settled()
  completed.push(definition.key)
 }
 // The unchanged final assertion reads the same guest's four saved results.
 pacer.record('/guest/bootstrap');assert.equal(check('/guest/bootstrap',clock).allowed,true)
 assert.deepEqual(completed,definitions.map(d=>d.key))
 assert.equal(completed.length,4);assert.equal(sleeps.length,3)
 assert.ok(sleeps.every(ms=>ms===61_000))
 assert.deepEqual(events.filter(e=>e.event==='scenario').map(e=>e.totalRequests),[0,73,119,168])
 assert.equal(events.filter(e=>e.event==='request').length,195)
})
test('pacer waits from latest activity and logs no synthetic private identifiers',async()=>{
 let clock=0;let first=true;const events=[];let pacer
 pacer=createGuestVerifierPacer({now:()=>clock,log:e=>events.push(e),sleep:async ms=>{clock+=ms;if(first){first=false;pacer.record('/guest/bootstrap')}}})
 pacer.record('/api/app/guest/runs/00000000-0000-4000-8000-000000000001/save','POST')
 await pacer.beforeScenario('second')
 assert.equal(clock,122_000)
 assert.equal(events.filter(e=>e.event==='wait').length,2)
 assert.equal(events[0].endpoint,'/api/app/guest/runs/:id/save')
 assert.equal(events[0].method,'POST')
})
test('typology verifier keeps one guest, all instrument assertions and bounded request diagnostics',()=>{
 const source=read('scripts/verify-personality-types.mjs')
 assert.equal((source.match(/api\(guest,'guest\/session'/g)||[]).length,1)
 assert.match(source,/for\(const \[i,base\] of defs.entries\(\)\)/)
 assert.match(source,/await guestPacer.beforeScenario\(d.key\)/)
 assert.match(source,/guest.on\('request'/)
 assert.match(source,/await page.close\(\)\n\s+guestPacer.settled\(\)/)
 assert.match(source,/TYPOLOGY_GUEST_RATE_LIMIT/)
 assert.match(source,/assert.deepEqual\(guestResults.map\(result=>result.definitionKey\).sort\(\),defs.map\(d=>d.key\).sort\(\)\)/)
 assert.match(source,/assert.deepEqual\(errors,\[\]\)/)
})

test('last request completion/page idle extends quiet window beyond dispatch',async()=>{
 let clock=0;const waits=[]
 const pacer=createGuestVerifierPacer({now:()=>clock,log:()=>{},sleep:async ms=>{waits.push(ms);clock+=ms}})
 pacer.record('/guest/bootstrap');clock=30_000;pacer.settled();await pacer.beforeScenario('next')
 assert.deepEqual(waits,[61_000]);assert.equal(clock,91_000)
})
