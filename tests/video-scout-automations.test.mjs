import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latestScoutSlot,scoutSlotsThrough,commonsSearchUrl,chooseScoutSearches,
  normalizeCommonsPage,searchCommons,performScoutCycle,
  SCOUT_TASK_ID,SCOUT_POLICY_VERSION,
} from '../lib/automations/video-scout.mjs';
import {claimVideoScout,settleVideoScout,changeScoutTaskState} from '../lib/automations/scout-db.mjs';
import {authorizeAutomationWorker,invokeExternalAutomationWorker} from '../lib/automations/worker-adapters.mjs';

const samplePage=(id=123456)=>({ns:6,pageid:id,title:`File:Quiet_forest_${id}.webm`,
 imageinfo:[{mime:'video/webm',size:1250000,width:1280,height:720,sha1:'f'.repeat(40),
  url:'http://127.0.0.1/private',extmetadata:{
    Artist:{value:'<a href="https://external.example">Photographer</a>'},
    LicenseShortName:{value:'CC BY-SA 4.0'},
    LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'},
  }}]});
const publicReply=(pages,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>JSON.stringify({query:{pages}})});

function fakeDb(){
 const state={enabled:true,run:null,candidates:new Set(),events:new Set(),inserted:0};
 return {state,async query(sql,args=[]){
   if(sql.startsWith('update app_private.ai_automation_runs_v2 set state=\'failed\''))
     return {rows:[]};
   if(sql.startsWith('insert into app_private.ai_automation_runs_v2')){
     if(!state.enabled||state.run)return {rows:[]};
     state.run={run_id:'22222222-2222-4222-8222-222222222222',claim_generation:1,
       state:'running',slot_utc:args[1]};
     return {rows:[state.run]};
   }
   if(sql.startsWith('insert into app_private.ai_automation_events_v2')){
     if(sql.includes('on conflict (operation_id)')){
       if(state.events.has(args[0]))return {rows:[]};
       state.events.add(args[0]);return {rows:[{event_id:'event'}]};
     }
     return {rows:[{event_id:'event'}]};
   }
   if(sql.startsWith('select enabled from app_private.ai_automation_tasks_v2'))
     return {rows:[{enabled:state.enabled}]};
   if(sql.startsWith('select run_id from app_private.ai_automation_runs_v2'))
     return {rows:state.run?.state==='running'&&state.run.claim_generation===args[2]
       ?[{run_id:state.run.run_id}]:[]};
   if(sql.startsWith('insert into app_private.video_source_candidates_v2')){
     const key=args[0]+':'+args[1];
     if(state.candidates.has(key))return {rows:[]};
     state.candidates.add(key);state.inserted++;
     return {rows:[{candidate_id:'id'}]};
   }
   if(sql.startsWith('update app_private.ai_automation_runs_v2 set state=$4')){
     state.run.state=args[3];return {rows:[]};
   }
   if(sql.startsWith('update app_private.ai_automation_tasks_v2')){
     state.enabled=args[0];return {rows:[{enabled:state.enabled}]};
   }
   throw Error('UNHANDLED_FAKE_SQL '+sql.slice(0,100));
 }};
}

test('stable hourly UTC slots, including midnight and leap day',()=>{
 assert.equal(latestScoutSlot('2026-11-06T18:30:00Z'),'2026-11-06T18:17:00.000Z');
 assert.equal(latestScoutSlot('2026-11-06T18:16:59Z'),'2026-11-06T17:17:00.000Z');
 assert.equal(latestScoutSlot('2028-03-01T00:15:00Z'),'2028-02-29T23:17:00.000Z');
 const slots=scoutSlotsThrough('2026-11-06T18:18:00Z',24);
 assert.equal(slots.length,24);assert.equal(new Set(slots).size,24);
 assert(slots.every(s=>s.endsWith(':17:00.000Z')));
});

test('bounded allowlisted Wikimedia queries cannot fetch arbitrary URLs',()=>{
 const chosen=chooseScoutSearches({sourcingQueue:[
  {categoryId:'love-relationships',optionsShortOfFour:4},
  {categoryId:'stress-anxiety',optionsShortOfFour:3},
 ]},'2026-11-06T18:17:00.000Z');
 assert(chosen.length<=2&&chosen.length>0);
 for(const s of chosen){
   const u=new URL(commonsSearchUrl(s.term));
   assert.equal(u.hostname,'commons.wikimedia.org');
   assert.equal(u.pathname,'/w/api.php');
   assert.equal(u.searchParams.get('gsrnamespace'),'6');
   assert.equal(u.searchParams.get('maxlag'),'5');
 }
 assert.throws(()=>commonsSearchUrl('http://169.254.169.254/latest/meta-data'));
});

test('Commons metadata is evidence only and never produces an approved asset',()=>{
 const p=samplePage();const found=normalizeCommonsPage(p,{category:'nature',term:'quiet forest'});
 assert.equal(found.sourceId,'123456');
 assert.equal(found.provider,'wikimedia_commons');
 assert.equal(found.reviewState,'research_only');
 assert.equal(found.rightsState,'unverified');
 assert.equal(found.mime,'video/webm');
 assert(!found.sourcePage.includes('127.0.0.1'));
 assert.equal(found.creator,'Photographer');
 assert(!found.creator.includes('<'));
 assert.equal(found.sha1Claim,'f'.repeat(40));
 assert.equal(normalizeCommonsPage({...p,title:'File:Forest.jpg'},{category:'nature',term:'forest'}),null);
 assert.equal(normalizeCommonsPage({...p,ns:0},{category:'nature',term:'forest'}),null);
 assert.equal(normalizeCommonsPage({...p,imageinfo:[{mime:'audio/ogg'}]},{category:'nature',term:'forest'}),null);
});

test('two metadata calls deduplicate and commit only once',async()=>{
 let calls=0,commits=0;
 const fetcher=async()=>{calls++;return publicReply([samplePage(123456),samplePage(123457)])};
 const result=await performScoutCycle({
   slotUtc:'2026-11-06T18:17:00.000Z',coverage:{sourcingQueue:[]},fetcher,
   commit:async payload=>{commits++;assert.equal(payload.items.length,2);
     assert.equal(payload.duplicateWithinBatch,2);
     assert.equal(payload.sourceCalls,2);return {status:'succeeded',payload};},
 });
 assert.equal(result.status,'succeeded');assert.equal(calls,2);assert.equal(commits,1);
});

test('empty findings are no-change, 429 pauses subsequent API calls',async()=>{
 const empty=await searchCommons({term:'quiet forest',category:'nature'},async()=>publicReply([]));
 assert.equal(empty.status,'ok');assert.equal(empty.received,0);
 let calls=0;
 const done=await performScoutCycle({slotUtc:'2026-11-06T18:17:00.000Z',coverage:{},
   fetcher:async()=>{calls++;return {ok:false,status:429}},commit:async x=>x});
 assert.equal(calls,1);assert.equal(done.requestedStatus,'quota_paused');
 assert.equal(done.items.length,0);
});

test('claim unique slot + durable insert + repeated candidate does not duplicate',async()=>{
 const db=fakeDb(),slotUtc='2026-11-06T18:17:00.000Z';
 const claim=await claimVideoScout(db,{slotUtc});
 assert.equal(claim.claimed,true);
 const simultaneous=await claimVideoScout(db,{slotUtc});
 assert.equal(simultaneous.claimed,false);
 const candidate=normalizeCommonsPage(samplePage(),{category:'nature',term:'quiet forest'});
 const receipt=await settleVideoScout(db,claim,{items:[candidate],requestedStatus:'ok',
   sourceCalls:1,received:1,rejected:0,warnings:[],duplicateWithinBatch:0});
 assert.equal(receipt.status,'succeeded');
 assert.equal(receipt.receipt.counters.inserted,1);
 assert.equal(receipt.receipt.counters.vaultPublished,0);
 assert.equal(db.state.inserted,1);
});

test('revocation denies writes, stale generation denies settlement',async()=>{
 const db=fakeDb(),slotUtc='2026-11-06T18:17:00.000Z';
 const claim=await claimVideoScout(db,{slotUtc});
 const idem='11111111-1111-4111-8111-111111111111';
 const paused=await changeScoutTaskState(db,{enabled:false,operationId:idem});
 assert.equal(paused.enabled,false);
 const replay=await changeScoutTaskState(db,{enabled:true,operationId:idem});
 assert.equal(replay.status,'replayed');assert.equal(db.state.enabled,false);
 const denied=await settleVideoScout(db,claim,{items:[],requestedStatus:'ok'});
 assert.equal(denied.status,'revoked');
 db.state.enabled=true;
 const stale=await settleVideoScout(db,{...claim,generation:99},{items:[],requestedStatus:'ok'});
 assert.equal(stale.status,'stale');
});

test('external harness is fail-closed; only typed built-in capabilities allowed',async()=>{
 assert.equal(authorizeAutomationWorker({kind:'builtin',capability:'candidate.research.insert',enabled:true}),true);
 assert.equal(authorizeAutomationWorker({kind:'builtin',capability:'shell.exec',enabled:true}),false);
 assert.equal(authorizeAutomationWorker({kind:'hermes',capability:'shell.exec',enabled:true}),false);
 assert.equal(authorizeAutomationWorker({kind:'openclaw',capability:'source.wikimedia.metadata.read',enabled:true}),false);
 assert.deepEqual(await invokeExternalAutomationWorker(),{status:'disabled',reason:'NO_APPROVED_EXTERNAL_RUNTIME'});
 assert.equal(SCOUT_TASK_ID,'video-scout-hourly');assert.equal(SCOUT_POLICY_VERSION,'hh-video-scout-l0-v1');
});


test('a second hourly observation of the same video is no_change, not a new asset',async()=>{
 const db=fakeDb(),candidate=normalizeCommonsPage(samplePage(),{category:'nature',term:'quiet forest'});
 const a=await claimVideoScout(db,{slotUtc:'2026-11-06T18:17:00.000Z'});
 await settleVideoScout(db,a,{items:[candidate],requestedStatus:'ok',sourceCalls:1,received:1});
 db.state.run=null;
 const b=await claimVideoScout(db,{slotUtc:'2026-11-06T19:17:00.000Z'});
 const result=await settleVideoScout(db,b,{items:[candidate],requestedStatus:'ok',sourceCalls:1,received:1});
 assert.equal(result.status,'no_change');
 assert.equal(result.receipt.counters.duplicate,1);
 assert.equal(db.state.inserted,1);
});

test('migration preserves private research-only boundary and explicit disable',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sql=await readFile(new URL('../sql/ai-council-automations-v2-20261106.sql',import.meta.url),'utf8');
 assert(sql.includes('ENABLE ROW LEVEL SECURITY'));
 assert(sql.includes('FORCE ROW LEVEL SECURITY'));
 assert(sql.includes('TO hh_app_backend'));
 assert(sql.includes('FROM PUBLIC, anon, authenticated'));
 assert(sql.includes("rights_state='unverified'"));
 assert(sql.includes("'17 * * * *',false"));
 assert(!sql.includes('grant select on table app_private.video_source_candidates_v2 to anon'));
});
