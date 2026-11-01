import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {nextGrowthPost} from '../lib/growth-studio/model.mjs'
import {
 GROWTH_DRY_RUN_FLAG,createDryRunJob,isValidDryRunJob,
 createMemoryGrowthDryRunQueueStore,createGrowthDryRunQueueStore,simulateDueDryRunJobs,
} from '../lib/growth-studio/dry-run-queue.mjs'

const now=new Date('2026-11-10T12:00:00.000Z')
const scheduledAt='2026-11-11T12:00:00.000Z'
const sourceFields={
 brand:'holistic_house',channel:'telegram',locale:'ru',title:'Public introduction',
 caption:'Public course introduction. No client information.',
 sourceUrl:'/ru/academy',campaign:'education_public',scheduledAt:'',
 mediaUrl:'',mediaAlt:'',
}
function approvedSource(){
 const draft=nextGrowthPost({action:'save',id:randomUUID(),fields:sourceFields,now})
 return nextGrowthPost({action:'approve',current:draft,now})
}
const makeJob=(src,options={})=>createDryRunJob(src,{
 expectedRevision:src.revision,scheduledAt,now,...options,
})
test('dry-run queue produces validated hashed metadata and never pretends an actual provider receipt',()=>{
 const source=approvedSource(),job=makeJob(source)
 assert.ok(isValidDryRunJob(job))
 assert.equal(job.deliveryMode,'dry_run_only')
 assert.equal(job.state,'queued')
 assert.equal(job.postId,source.id)
 assert.equal(job.postRevision,source.revision)
 assert.ok(!Object.hasOwn(job,'caption')&&!Object.hasOwn(job,'token'))
 assert.ok(!Object.hasOwn(job,'delivery')&&!Object.hasOwn(job,'providerPostId'))
 assert.match(job.payloadHash,/^[a-f0-9]{64}$/)
 assert.equal(GROWTH_DRY_RUN_FLAG,'HH_GROWTH_QUEUE_DRY_RUN_ENABLED')
 assert.deepEqual(makeJob(source),job)
})
test('unapproved, expired revisions, invalid clock and impossible future dates fail closed',()=>{
 const src=approvedSource()
 assert.throws(()=>makeJob({...src,status:'draft'}),/invalid_queue_request/)
 assert.throws(()=>makeJob(src,{expectedRevision:src.revision-1}),/invalid_queue_request/)
 assert.throws(()=>makeJob(src,{scheduledAt:'2026-11-10T11:59:00.000Z'}),/invalid_queue_time/)
 assert.throws(()=>makeJob(src,{scheduledAt:'2027-12-31T12:00:00.000Z'}),/invalid_queue_time/)
 assert.throws(()=>makeJob(src,{scheduledAt:'2026-11-11T12:00:00-05:00'}),/invalid_queue_request/)
 assert.throws(()=>makeJob(src,{occurrenceId:'bad/../../private'}),/invalid_queue_request/)
 assert.throws(()=>makeJob(src,{now:new Date('bad')}),/invalid_queue_request/)
})
test('repeated enqueue is idempotent; same source revision and time makes only one job',async()=>{
 const source=approvedSource()
 const store=createMemoryGrowthDryRunQueueStore({getSource:async()=>source})
 const job=makeJob(source)
 assert.equal((await store.enqueue(job)).reused,false)
 assert.equal((await store.enqueue(job)).reused,true)
 assert.equal((await store.list()).length,1)
 assert.deepEqual((await store.get(job.id)).postId,source.id)
})
test('simulation processes a due job once without a Telegram or any other provider call',async()=>{
 const source=approvedSource(),store=createMemoryGrowthDryRunQueueStore({getSource:async()=>source})
 const job=makeJob(source)
 await store.enqueue(job)
 const before=await simulateDueDryRunJobs(store,{now,limit:5})
 assert.equal(before.length,0)
 assert.equal((await store.get(job.id)).state,'queued')
 const atDue=new Date(scheduledAt)
 const simulated=await simulateDueDryRunJobs(store,{now:atDue,limit:5})
 assert.equal(simulated.length,1)
 assert.equal(simulated[0].state,'simulated')
 assert.equal(simulated[0].attempts,1)
 assert.equal(simulated[0].deliveryMode,'dry_run_only')
 assert.equal(simulated[0].simulatedAt,scheduledAt)
 assert.ok(!Object.hasOwn(simulated[0],'delivery'))
 assert.deepEqual(await simulateDueDryRunJobs(store,{now:atDue,limit:5}),[])
 assert.equal((await store.list()).length,1)
})
test('changed approval/revision is invalidated at claim and never simulated',async()=>{
 const source=approvedSource(),job=makeJob(source)
 let current=source
 const store=createMemoryGrowthDryRunQueueStore({getSource:async()=>current})
 await store.enqueue(job)
 current=nextGrowthPost({action:'reopen',current:source,now:new Date('2026-11-10T12:01:00.000Z')})
 const simulated=await simulateDueDryRunJobs(store,{now:new Date(scheduledAt)})
 assert.equal(simulated.length,0)
 assert.equal((await store.get(job.id)).state,'needs_review')
})
test('a claimed job rejects an old token and a cancelled queued job cannot be processed',async()=>{
 const source=approvedSource(),job=makeJob(source,{occurrenceId:'cancel'})
 const store=createMemoryGrowthDryRunQueueStore({getSource:async()=>source})
 await store.enqueue(job)
 await assert.rejects(store.cancel(job.id,2),/conflict/)
 const cancelled=await store.cancel(job.id,1)
 assert.equal(cancelled.state,'cancelled')
 await assert.rejects(store.cancel(job.id,1),/conflict/)
 assert.deepEqual(await simulateDueDryRunJobs(store,{now:new Date(scheduledAt)}),[])
 const job2=makeJob(source,{occurrenceId:'lease'})
 await store.enqueue(job2)
 const claimed=await store.claimDue(new Date(scheduledAt))
 await assert.rejects(store.finish(job2.id,randomUUID(),new Date(scheduledAt)),/conflict/)
 const complete=await store.finish(job2.id,claimed.leaseToken,new Date(scheduledAt))
 assert.equal(complete.state,'simulated')
 await assert.rejects(store.finish(job2.id,claimed.leaseToken,new Date(scheduledAt)),/conflict/)
})
test('stale dry-run lease can safely be simulated again; no external side effects exist',async()=>{
 const source=approvedSource(),job=makeJob(source)
 const store=createMemoryGrowthDryRunQueueStore({getSource:async()=>source})
 await store.enqueue(job)
 const claimed=await store.claimDue(new Date(scheduledAt))
 assert.equal(claimed.attempts,1)
 const recovered=await store.claimDue(new Date(Date.parse(scheduledAt)+60_001))
 assert.equal(recovered.attempts,2)
 assert.notEqual(recovered.leaseToken,claimed.leaseToken)
 await assert.rejects(store.finish(claimed.id,claimed.leaseToken,new Date(scheduledAt)),/conflict/)
 const completed=await store.finish(recovered.id,recovered.leaseToken,new Date(Date.parse(scheduledAt)+60_001))
 assert.equal(completed.state,'simulated')
})
test('Redis queue writes use atomic source-revision checks, isolated keys and no provider API',async()=>{
 const source=approvedSource(),job=makeJob(source)
 let sent=null
 const environment={
  PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic-redis.example',
  PRESCRIPTIONS_KV_REST_API_TOKEN:'test-only-token',
 }
 const store=createGrowthDryRunQueueStore({environment,fetchFn:async(url,opts)=>{
  sent={url,opts,command:JSON.parse(opts.body)}
  return {ok:true,json:async()=>({result:1})}
 }})
 assert.ok(store)
 const saved=await store.enqueue(job)
 assert.equal(saved.reused,false)
 assert.equal(sent.url,'https://synthetic-redis.example')
 assert.equal(sent.command[0],'EVAL')
 assert.equal(sent.command[1].includes("source.revision ~= tonumber(ARGV[2])"),true)
 assert.equal(sent.command[1].includes("source.status ~= 'approved'"),true)
 assert.equal(sent.command[1].includes("redis.call('ZADD'"),true)
 assert.equal(sent.command[3],'holistic-house:growth-studio:editorial:v1')
 assert.equal(sent.command[4],'holistic-house:growth-studio:dry-run-queue:v1')
 assert.equal(sent.command[5],'holistic-house:growth-studio:dry-run-due:v1')
 assert.equal(sent.opts.cache,'no-store')
 assert.equal(sent.opts.credentials,'omit')
 assert.equal(sent.opts.headers.Authorization,'Bearer test-only-token')
})
test('server actions are owner-only, flag-off and do not import social providers or publish',()=>{
 const source=readFileSync(new URL('../app/admin/growth-studio/dry-run-actions.js',import.meta.url),'utf8')
 assert.match(source,/requireAdminRequest\(\)/)
 assert.match(source,/process\.env\[GROWTH_DRY_RUN_FLAG\]!=='true'/)
 assert.match(source,/dry_run_disabled/)
 assert.match(source,/externalPublishing:false/)
 assert.match(source,/simulateDueDryRunJobs/)
 assert.doesNotMatch(source,/sendTelegramPost|publishGrowthTelegramNowAction|MetaGraph|fetch\(['"]https:\/\/api\./)
})
