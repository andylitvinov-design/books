import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrCompletionJourney,JOURNEY_SCHEMA} from '../lib/agent-director/pr-completion-journey.mjs';

const ORIGINAL='d6488d95d3dd3d6e2c88c010f82331ec65e4d69c';
const NEW='a'.repeat(40),MERGE='b'.repeat(40);
const NOW='2026-11-17T00:40:00Z';
const ownerItem={
 requestId:'123e4567-e89b-42d3-a456-426614174000',prNumber:4811,
 requestedHeadSha:ORIGINAL,headSha:ORIGINAL,status:'QUEUED',
 createdAt:'2026-11-17T00:08:07Z',firstAttemptAt:null,
 updatedAt:'2026-11-17T00:08:07Z',leaseUntil:null,
 lastCheckedAt:null,dispatchAttemptedAt:null,dispatchAccepted:false,checkedCount:0,
 reasonCode:'REQUEST_ACCEPTED_NOT_DISPATCHED'
};
const pr={
 number:4811,state:'open',merged:false,merge_commit_sha:null,merged_at:null,
 head:{sha:ORIGINAL,repo:{full_name:'andylitvinov-design/books'}},
 base:{ref:'codex/public-book-library',repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:'hh:repair-needed'}]
};
const checked=(sha=ORIGINAL,conclusion='failure')=>({
 name:'core-lint-types-build',status:'completed',conclusion,head_sha:sha,
 started_at:'2026-11-16T22:26:29Z',completed_at:'2026-11-16T22:27:48Z',
 html_url:'https://github.com/andylitvinov-design/books/actions/runs/43970060136/job/133659541593'
});
const bot={user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
 performed_via_github_app:{slug:'github-actions',id:15368},created_at:'2026-11-16T22:28:50Z'};
const signed=(marker,sha=ORIGINAL)=>({...bot,
 body:'<!-- '+marker+' '+sha+' -->\nConfirmed exact-HEAD source failure'});
const evidence={
 pr,checksComplete:true,checks:[checked()],
 commentsComplete:true,comments:[signed('HH_PR_10MIN_SOURCE_REPAIR_V1')]
};
function byId(what,id){return what.stages.find(s=>s.id===id)}

test('PR #4811: first bottleneck is unclaimed Watchdog despite independently failed Core',()=>{
 const result=buildPrCompletionJourney({item:ownerItem,github:evidence,observedAt:NOW});
 assert.equal(result.schema,JOURNEY_SCHEMA);
 assert.equal(result.requestId,ownerItem.requestId);
 assert.equal(result.prNumber,4811);
 assert.equal(result.currentStage,'watchdog');
 assert.equal(result.stalled,true);
 assert.match(result.attention,/Watchdog/);
 assert.equal(result.minutesSinceRequest,31);
 assert.equal(byId(result,'watchdog').state,'attention');
 assert.equal(byId(result,'diagnostics').state,'attention');
 assert.match(byId(result,'diagnostics').detail,/failure/);
 assert.equal(byId(result,'handoff').state,'waiting');
 assert.equal(byId(result,'runner').state,'unknown');
 assert.equal(byId(result,'model').state,'unknown');
 assert.equal(byId(result,'merge').state,'waiting');
 assert.equal(byId(result,'live').state,'unknown');
});

test('expired lease is visible as an expired Watchdog handoff, not worker started',()=>{
 const item={...ownerItem,status:'LEASED',
  firstAttemptAt:'2026-11-17T00:09:00Z',
  leaseUntil:'2026-11-17T00:13:00Z'};
 const r=buildPrCompletionJourney({item,github:evidence,observedAt:NOW});
 assert.equal(r.currentStage,'watchdog');
 assert.equal(r.stalled,true);
 assert.match(byId(r,'watchdog').detail,/истекла/);
 assert.notEqual(byId(r,'runner').state,'done');
});

test('fresh owner claim is acknowledged but never proof of running AI',()=>{
 const item={...ownerItem,status:'LEASED',
  firstAttemptAt:'2026-11-17T00:39:00Z',
  leaseUntil:'2026-11-17T00:43:00Z'};
 const r=buildPrCompletionJourney({item,github:evidence,observedAt:NOW});
 assert.equal(byId(r,'watchdog').state,'done');
 assert.equal(byId(r,'runner').state,'unknown');
 assert.equal(byId(r,'model').state,'unknown');
 assert.equal(r.stalled,false);
});

test('signed actual runner shows only runner, not unproved model or source patch',()=>{
 const item={...ownerItem,status:'WATCHING',firstAttemptAt:'2026-11-17T00:15:00Z',
  dispatchAccepted:true,checkedCount:1};
 const proof={...evidence,comments:[...evidence.comments,signed('HH_EXECUTION_RUNNER_V1')]};
 const r=buildPrCompletionJourney({item,github:proof,observedAt:NOW});
 assert.equal(byId(r,'handoff').state,'done');
 assert.equal(byId(r,'runner').state,'done');
 assert.equal(byId(r,'model').state,'unknown');
 assert.equal(byId(r,'commit').state,'waiting');
 assert.equal(r.currentStage,'commit');
});

test('GitHub new HEAD alone does not prove AI wrote commit or CI went green',()=>{
 const item={...ownerItem,status:'WATCHING',firstAttemptAt:'2026-11-17T00:15:00Z',checkedCount:2};
 const gh={pr:{...pr,head:{...pr.head,sha:NEW}},checksComplete:true,checks:[checked(NEW,'failure')],
  commentsComplete:true,comments:[]};
 const r=buildPrCompletionJourney({item,github:gh,observedAt:NOW});
 assert.equal(byId(r,'commit').state,'done');
 assert.match(byId(r,'commit').detail,/авторство AI не подтверждается/);
 assert.equal(byId(r,'model').state,'unknown');
 assert.equal(byId(r,'recheck').state,'attention');
});

test('MERGED and LIVE are independent: GitHub merge proof cannot certify deployment',()=>{
 const item={...ownerItem,status:'MERGED',mergeSha:MERGE};
 const gh={pr:{...pr,state:'closed',merged:true,merge_commit_sha:MERGE,merged_at:NOW},
  checks:[checked(ORIGINAL,'success')],checksComplete:true,commentsComplete:false};
 const r=buildPrCompletionJourney({item,github:gh,observedAt:NOW});
 assert.equal(r.currentStage,'live');
 assert.equal(byId(r,'merge').state,'done');
 assert.equal(byId(r,'live').state,'unknown');
 assert.equal(r.stalled,false);
});

test('forged bot and incomplete comment pages cannot prove runner',()=>{
 const forged={...signed('HH_EXECUTION_RUNNER_V1'),
  user:{login:'github-actions[bot]',id:1,type:'Bot'}};
 const item={...ownerItem,status:'WATCHING',dispatchAccepted:true};
 const one=buildPrCompletionJourney({item,github:{...evidence,comments:[forged]},observedAt:NOW});
 assert.equal(byId(one,'runner').state,'waiting');
 const two=buildPrCompletionJourney({item,github:{...evidence,commentsComplete:false,
  comments:[signed('HH_EXECUTION_RUNNER_V1')]},observedAt:NOW});
 assert.equal(byId(two,'runner').state,'waiting');
});

test('unavailable GitHub and wrong PR identity do not get fake Core or merge proof',()=>{
 const item={...ownerItem,status:'MERGED',mergeSha:MERGE};
 for(const github of [{},{pr:{...pr,number:800}}]){
  const r=buildPrCompletionJourney({item,github,observedAt:NOW});
  assert.equal(r.githubVerified,false);
  assert.equal(byId(r,'merge').state,'waiting');
  assert.equal(byId(r,'diagnostics').state,'unknown');
  assert.equal(byId(r,'live').state,'unknown');
 }
});

test('details are on demand, owner authenticated, and mobile timeline expandable',()=>{
 const route=readFileSync(new URL('../app/api/app/commander/pr-completion/route.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../app/commander/pr/PrCompletionClient.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/commander/pr/pr-timeline.css',import.meta.url),'utf8');
 const edge=readFileSync(new URL('../supabase/functions/agent-commander-pr-completion-v1/index.ts',import.meta.url),'utf8');
 assert.match(route,/await auth\.verified\(\)/);
 assert.match(route,/detailsRequested/);
 assert.match(route,/githubJourneyEvidence\(detailsPr\)/);
 assert.match(route,/OWNER_PR_NOT_IN_QUEUE/);
 assert.match(route,/filter=latest/);
 assert.match(client,/aria-expanded/);
 assert.match(client,/Детали/);
 assert.match(client,/journey\.stages\.map/);
 assert.match(client,/details=1/);
 assert.match(css,/@media\(max-width:430px\)/);
 for(const field of ['firstAttemptAt','leaseUntil','checkedCount','dispatchAttemptedAt'])
  assert.ok(edge.includes(field),'owner-only status supplies '+field);
 assert.doesNotMatch(client,/dangerouslySetInnerHTML|openrouter|localStorage|GITHUB_TOKEN/);
});

test('real GitHub merge supersedes stale BLOCKED owner queue without inventing LIVE',()=>{
 const item={...ownerItem,status:'BLOCKED',reasonCode:'EXISTING_HOLD_NO_OVERRIDE',
  firstAttemptAt:'2026-11-17T00:09:00Z',leaseUntil:'2026-11-17T00:13:00Z'};
 const gh={pr:{...pr,state:'closed',merged:true,merge_commit_sha:MERGE,merged_at:NOW,
   head:{...pr.head,sha:NEW},labels:[]},
  checks:[checked(NEW,'success')],checksComplete:true,commentsComplete:false};
 const result=buildPrCompletionJourney({item,github:gh,observedAt:NOW});
 assert.equal(result.githubVerified,true);
 assert.equal(result.currentStage,'live');
 assert.equal(result.stalled,false);
 assert.equal(result.attention,null);
 assert.equal(result.currentHeadSha,NEW);
 assert.equal(byId(result,'merge').state,'done');
 assert.match(byId(result,'merge').detail,/GitHub подтвердил merge SHA/);
 assert.equal(byId(result,'live').state,'unknown');
});
test('without independently verified merge a stale BLOCKED remains stalled',()=>{
 const item={...ownerItem,status:'BLOCKED',reasonCode:'EXISTING_HOLD_NO_OVERRIDE'};
 const result=buildPrCompletionJourney({item,github:evidence,observedAt:NOW});
 assert.equal(result.stalled,true);
 assert.equal(result.currentStage,'handoff');
 assert.equal(byId(result,'merge').state,'waiting');
 assert.equal(byId(result,'live').state,'unknown');
});
