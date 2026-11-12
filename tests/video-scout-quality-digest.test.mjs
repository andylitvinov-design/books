import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  plausibleResearchTitle,searchCommons,normalizeCommonsPage,
} from '../lib/automations/video-scout.mjs';
import {
  VIDEO_DIGEST_TASK_ID,VIDEO_DIGEST_CRON,videoDigestDue,
  safeVideoDigestStats,formatVideoDigestMessage,
} from '../lib/automations/daily-video-digest.mjs';
import {
  claimDailyVideoDigest,settleDailyVideoDigest,changeDailyDigestState,
} from '../lib/automations/daily-video-digest-store.mjs';

const row=(id,title)=>({pageid:id,ns:6,title:`File:${title}`,
  imageinfo:[{mime:'video/webm',size:92000,width:1280,height:720,
    extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'}}}]});
const response=(pages)=>({ok:true,status:200,headers:{get:()=>null},
  text:async()=>JSON.stringify({query:{pages}})});
const UTC='2026-11-07T15:17:00.000Z';

test('research relevance excludes observed search false positives',()=>{
  for(const title of [
    'Hurricane Ernesto Brings Dangerous Seas.webm',
    'Transporte de agua brigada de bomberos helicópteros Schmilka 2022.webm',
    'JPL-20211221-M2020f-0001-1920cc.webm',
    'Fast-flowing Grande Ronde rapids in Washington.webm',
  ])assert.equal(plausibleResearchTitle(title,'calm river'),false,title);
  for(const title of [
    'Two cats holding each other and hugging.webm',
    'Be Proud of Your Past, Embrace Your Future.webm',
    '2022 Virtual Event BigScience with Hugging Face.webm',
  ])assert.equal(plausibleResearchTitle(title,'people embracing'),false,title);
});
test('plausible footage is retained, still unlicensed',()=>{
  for(const [title,term] of [
    ['Peaceful Ganga River at Rishikesh.webm','calm river'],
    ['Grande Ronde Wild and Scenic River.webm','calm river'],
    ['Friends hugging at a reunion.webm','people embracing'],
    ['Couple embracing.webm','people embracing'],
    ['Mountains and rivers.webm','mountain ascent'],
  ])assert.equal(plausibleResearchTitle(title,term),true,title);
  const candidate=normalizeCommonsPage(row(232345,'The_calm_River.webm'),
    {term:'calm river',category:'stress-anxiety'});
  assert.equal(candidate.rightsState,'unverified');
  assert.equal(candidate.reviewState,'research_only');
});
test('Commons filters false positives in source response, not after DB commit',async()=>{
  let calls=0;
  const result=await searchCommons({term:'calm river',category:'stress-anxiety'},
    async()=>{calls++;return response([
      row(235456,'Hurricane_Ernesto.webm'),
      row(235457,'Riverside_evening.webm'),
      row(235458,'Quiet_river_in_spring.webm'),
    ]);});
  assert.equal(calls,1);
  assert.equal(result.received,3);
  assert.equal(result.items.length,2);
  assert(result.items.every(v=>v.rightsState==='unverified'));
});
test('daily digest is an exact once-per-day UTC slot on existing hourly route',()=>{
  assert.equal(VIDEO_DIGEST_TASK_ID,'video-scout-digest-daily');
  assert.equal(VIDEO_DIGEST_CRON,'17 15 * * *');
  assert.equal(videoDigestDue(UTC),true);
  assert.equal(videoDigestDue('2026-11-07T16:17:00.000Z'),false);
  assert.equal(videoDigestDue('2026-11-07T15:18:00.000Z'),false);
  assert.equal(videoDigestDue('bad-date'),false);
});
test('digest report uses verifiable counters only and warns about rights',()=>{
  const stats=safeVideoDigestStats({slots:'24',succeeded:'20',failed:'2',noChange:'2',inserted:'132',duplicates:'14',sourceCalls:'48'});
  assert.equal(stats.inserted,132);
  const message=formatVideoDigestMessage(stats,{date:new Date(UTC)});
  assert.match(message,/Новых исследовательских кандидатов: 132/);
  assert.match(message,/НЕ лицензированы/);
  assert.match(message,/https:\/\/holistichouse\.vercel\.app\/admin\/automations/);
  for(const privateMarker of ['chat_id','api_key','client_name','medical'])assert(!message.includes(privateMarker));
  assert.throws(()=>safeVideoDigestStats({slots:1,succeeded:2,failed:0,noChange:0,inserted:0,duplicates:0,sourceCalls:0}));
  assert.throws(()=>safeVideoDigestStats({slots:-1,succeeded:0,failed:0,noChange:0,inserted:0,duplicates:0,sourceCalls:0}));
  assert.throws(()=>safeVideoDigestStats({slots:1,succeeded:1,failed:0,noChange:0,inserted:22,duplicates:0,sourceCalls:2}));
});
function fakeDb(){
  const state={enabled:true,run:null,changes:new Set(),events:0};
  return {state,async query(sql,args=[]){
    if(sql.startsWith('insert into app_private.ai_automation_runs_v2')){
      if(!state.enabled||state.run)return {rows:[]};
      state.run={run_id:'22222222-2222-4222-8222-222222222222',claim_generation:1,state:'running'};
      return {rows:[state.run]};
    }
    if(sql.startsWith('insert into app_private.ai_automation_events_v2')){
      if(sql.includes('on conflict(operation_id)')){
        if(state.changes.has(args[0]))return {rows:[]};
        state.changes.add(args[0]);return {rows:[{event_id:'event'}]};
      }
      state.events++;return {rows:[]};
    }
    if(sql.startsWith('select enabled from app_private.ai_automation_tasks_v2'))return {rows:[{enabled:state.enabled}]};
    if(sql.startsWith('select run_id from app_private.ai_automation_runs_v2'))
      return {rows:state.run?.state==='running'?[{run_id:state.run.run_id}]:[]};
    if(sql.startsWith('update app_private.ai_automation_runs_v2')){
      state.run.state=args[3];return {rows:[]};
    }
    if(sql.startsWith('update app_private.ai_automation_tasks_v2')){
      state.enabled=args[0];return {rows:[{enabled:state.enabled}]};
    }
    throw Error('UNHANDLED_QUERY '+sql.slice(0,110));
  }};
}
test('single daily claim prevents duplicate Telegram sends',async()=>{
  const db=fakeDb();const claimed=await claimDailyVideoDigest(db,UTC);
  assert.equal(claimed.claimed,true);
  assert.equal((await claimDailyVideoDigest(db,UTC)).claimed,false);
  const result=await settleDailyVideoDigest(db,claimed,{accepted:true});
  assert.equal(result.status,'succeeded');
  assert.equal(result.delivery,'provider_accepted');
  assert.equal((await claimDailyVideoDigest(db,UTC)).claimed,false);
});
test('ambiguous provider delivery is terminal and cannot be replayed',async()=>{
  const db=fakeDb();const claimed=await claimDailyVideoDigest(db,UTC);
  const result=await settleDailyVideoDigest(db,claimed,{accepted:false,error:'TELEGRAM_DELIVERY_UNCONFIRMED'});
  assert.equal(result.status,'failed');
  assert.equal((await claimDailyVideoDigest(db,UTC)).claimed,false);
});
test('owner pause is idempotent and does not modify other tasks',async()=>{
  const db=fakeDb(),id='11111111-1111-4111-8111-111111111111';
  const result=await changeDailyDigestState(db,{enabled:false,operationId:id});
  assert.equal(result.enabled,false);
  assert.equal((await changeDailyDigestState(db,{enabled:true,operationId:id})).status,'replayed');
  assert.equal(db.state.enabled,false);
});
test('only owner-guarded controls and hourly Cron can invoke daily summary',()=>{
  const route=readFileSync(new URL('../app/api/internal/video-scout-hourly/route.js',import.meta.url),'utf8');
  assert.match(route,/cronAuthorized\(request,process\.env\)/);
  assert.match(route,/HH_VIDEO_SCOUT_DIGEST_ENABLED==='true'/);
  assert.match(route,/runDailyVideoDigest/);
  const owner=readFileSync(new URL('../app/api/admin/automations/route.js',import.meta.url),'utf8');
  assert.match(owner,/ownerMaterialRequest/);
  assert.match(owner,/OWNER_DIGEST_ROUTE_DISABLED/);
  assert.match(owner,/DIGEST_SCHEDULE_ONLY/);
  const mig=readFileSync(new URL('../sql/ai-council-video-digest-v2-20261106.sql',import.meta.url),'utf8');
  assert.match(mig,/enabled,policy_version/);
  assert.match(mig,/false,'hh-video-scout-digest-v1'/);
  assert(!mig.includes('CREATE EXTENSION'));
  assert(!mig.toLowerCase().includes('grant select to anon'));
});
