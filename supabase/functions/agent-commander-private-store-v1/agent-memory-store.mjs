// Existing business_brain commander_chat_events ledger is the durable private store.
// This module adds no job queue, cron, memory database, model provider or public transport.
import {DIGEST_SCHEMA, buildAgentDigest, selectDigestsForCapsule, proposedLessons} from './agent-memory-digest.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[a-z0-9][a-z0-9-]{0,80}$/;
const RUNCODE=/^[A-Z][A-Z0-9_]{2,79}$/;
const cleanCode=v=>typeof v==='string'&&RUNCODE.test(v)?v:null;
const toTime=v=>new Date(v).toISOString();
export const canonicalChatProject=payload=>({commander:'agent-commander',holistic:'holistic-house',video:'holistic-house'})[payload?.project]||null;
const getChat=async(db,ownerId,chatId)=>{
 if(!UUID.test(ownerId)||!UUID.test(chatId))throw Error('INVALID_DIGEST_SCOPE');
 const rows=await db.unsafe('select chat_id,task_id,payload from business_brain.commander_chats where owner_id=$1::uuid and chat_id=$2::uuid limit 1',[ownerId,chatId]);
 if(rows.length!==1)throw Error('DIGEST_OWNER_CHAT_NOT_FOUND');
 return rows[0];
};
export async function appendActivityDigest(db,ownerId,chatId,event){
 const chat=await getChat(db,ownerId,chatId);
 const projectKey=canonicalChatProject(chat.payload);
 if(!projectKey)return {saved:false,reason:'UNKNOWN_PROJECT_SCOPE'};
 const digest=await buildAgentDigest([{...event,projectKey,chatId:chat.chat_id,taskId:chat.task_id||null}],{ownerId});
 const rows=await db.unsafe(`insert into business_brain.commander_chat_events
   (event_id,chat_id,owner_id,kind,payload,source_verified)
   values($1::uuid,$2::uuid,$3::uuid,'note',$4::text::jsonb,false)
   on conflict(event_id) do nothing returning event_id`,
  [digest.digestId,chat.chat_id,ownerId,JSON.stringify(digest)]);
 return {saved:rows.length===1,digestId:digest.digestId,duplicate:rows.length===0};
}
function actualRunReceipt(r){
 const p=r.receipt||{};
 return r.status==='COMPLETED'&&p.runId===r.run_id&&p.status==='COMPLETED'&&p.agentStarted===true&&p.executionVerified===true&&p.sourceWrite===null&&(
  p.schema==='HH_OPENROUTER_WORKER_RECEIPT_V1'&&p.zeroCostVerified===true&&p.costUsd===0&&/^[a-f0-9]{64}$/.test(p.answerSha256||'') ||
  p.schema==='HH_AGENT_DIRECTOR_RUN_V1'&&p.proofLevel==='AGENT_DIRECTOR_READ_ONLY_RESPONSE');
}
export async function appendRunDigest(db,ownerId,run){
 const eventType={QUEUED:'RUN_QUEUED',BLOCKED:'RUN_BLOCKED',COMPLETED:'RUN_COMPLETED',FAILED:'RUN_FAILED',CANCELLED:'RUN_CANCELLED'}[run.status];
 if(!eventType||!UUID.test(run.run_id)||!UUID.test(run.chat_id))return {saved:false,reason:'NO_MEANINGFUL_RUN_STATE'};
 const verified=actualRunReceipt(run)||(eventType==='RUN_BLOCKED'&&run.reason_code!==''&&run.reason_code!=null);
 return await appendActivityDigest(db,ownerId,run.chat_id,{
  eventId:`run:${run.run_id}:${run.status.toLowerCase()}`,runId:run.run_id,agentId:run.executor||'manual',
  eventType,observedAt:toTime(run.completed_at||run.created_at),sourceSystem:'commander-run',
  sourceVerification:verified?'verified':'report_only',sourceRef:`commander:run:${run.run_id}`,
  reasonCode:cleanCode(run.reason_code)
 });
}
export async function syncRecentRunDigests(db,ownerId,{chatId=null,limit=12}={}){
 if(!UUID.test(ownerId)||(chatId!==null&&!UUID.test(chatId)))throw Error('INVALID_DIGEST_SCOPE');
 const rows=await db.unsafe(`select run_id,chat_id,executor,status,reason_code,receipt,created_at,completed_at
 from business_brain.commander_execution_runs
 where owner_id=$1::uuid and ($2::uuid is null or chat_id=$2::uuid)
   and status in ('QUEUED','BLOCKED','COMPLETED','FAILED','CANCELLED')
 order by updated_at desc limit $3::int`,[ownerId,chatId,Math.max(1,Math.min(20,limit))]);
 let saved=0;
 for(const r of rows){const result=await appendRunDigest(db,ownerId,r);if(result.saved)saved++;}
 return {examined:rows.length,saved};
}
export async function appendCiDigest(db,ownerId,taskId,event){
 if(!UUID.test(taskId))return {saved:false,reason:'UNMATCHED_TASK'};
 const chats=await db.unsafe('select chat_id from business_brain.commander_chats where owner_id=$1::uuid and task_id=$2::uuid limit 2',[ownerId,taskId]);
 if(chats.length!==1)return {saved:false,reason:'CHAT_NOT_UNIQUE'};
 return await appendActivityDigest(db,ownerId,chats[0].chat_id,{
  eventId:`ci:${event.workflow_run_id}:${event.run_attempt}:${event.pr_number}:${event.head_sha}`,
  agentId:'github-actions',eventType:'CI_FAILED',observedAt:toTime(event.source_run_created_at),
  sourceSystem:'github-oidc',sourceVerification:'verified',sourceRef:event.run_url,
  sourceSha:event.head_sha,expectedHeadSha:event.head_sha,reasonCode:cleanCode(event.category)
 });
}
export async function listAgentDigests(db,ownerId,filters={}){
 if(!UUID.test(ownerId))throw Error('INVALID_DIGEST_OWNER');
 const projectKey=filters.projectKey||null,agentId=filters.agentId||null,status=filters.status||null;
 const query=typeof filters.query==='string'?filters.query.slice(0,80).trim():'';
 if(projectKey!==null&&!KEY.test(projectKey)||agentId!==null&&!/^[a-z0-9:_-]{1,80}$/.test(agentId)||
  status!==null&&!['working','completed','blocked','unknown'].includes(status))throw Error('INVALID_DIGEST_FILTER');
 const count=Math.max(1,Math.min(50,Number(filters.limit)||25));
 const rows=await db.unsafe(`select event_id,created_at,payload from business_brain.commander_chat_events
  where owner_id=$1::uuid and kind='note' and payload->>'schema'=$2
   and ($3::text is null or payload->>'projectKey'=$3)
   and ($4::text is null or payload->>'agentId'=$4)
   and ($5::text is null or payload->>'status'=$5)
   and ($6::text='' or payload->>'result' ilike ('%'||$6||'%') or payload->>'agentId' ilike ('%'||$6||'%'))
  order by created_at desc,event_id desc limit $7::int`,
  [ownerId,DIGEST_SCHEMA,projectKey,agentId,status,query,count]);
 const digests=rows.map(r=>r.payload);
 const days7=Date.now()-7*86400000;
 return {schema:'HH_AGENT_MEMORY_DIGEST_LIST_V1',digests,limited:rows.length===count,
  briefing:{scope:'returned_page_only',today:digests.filter(d=>Date.parse(d.coveredUntil)>=new Date().setUTCHours(0,0,0,0)).length,
   last7Days:digests.filter(d=>Date.parse(d.coveredUntil)>=days7).length,
   blocked:digests.filter(d=>d.status==='blocked').length},storage:'SUPABASE_PRIVATE'};
}
export async function recallAgentDigests(db,ownerId,{projectKey,taskId=null,chatId,prNumbers=[]}={}){
 if(!UUID.test(ownerId)||!UUID.test(chatId)||!KEY.test(projectKey||'')||(taskId!==null&&!UUID.test(taskId)))throw Error('INVALID_DIGEST_RECALL_SCOPE');
 const rows=await db.unsafe(`select payload from business_brain.commander_chat_events
  where owner_id=$1::uuid and (chat_id=$2::uuid or payload->>'taskId'=$3::text)
   and payload->>'schema'=$4 and payload->>'projectKey'=$5
  order by created_at desc limit 25`,[ownerId,chatId,taskId,DIGEST_SCHEMA,projectKey]);
 return selectDigestsForCapsule(rows.map(r=>r.payload),{projectKey,taskId,chatId,prNumbers,limit:2,maxChars:1400});
}
export async function inspectAgentDigest(db,ownerId,digestId){
 if(!UUID.test(ownerId)||!UUID.test(digestId))throw Error('INVALID_DIGEST_ID');
 const rows=await db.unsafe('select payload from business_brain.commander_chat_events where owner_id=$1::uuid and event_id=$2::uuid and payload->>\'schema\'=$3 limit 1',[ownerId,digestId,DIGEST_SCHEMA]);
 return rows[0]?.payload||null;
}
export async function agentLessonCandidates(db,ownerId,projectKey){
 if(!UUID.test(ownerId)||!KEY.test(projectKey||''))throw Error('INVALID_DIGEST_LESSON_SCOPE');
 const rows=await db.unsafe(`select payload from business_brain.commander_chat_events
  where owner_id=$1::uuid and payload->>'schema'=$2 and payload->>'projectKey'=$3
  order by created_at desc limit 100`,[ownerId,DIGEST_SCHEMA,projectKey]);
 return {status:'REVIEW_ONLY',candidates:proposedLessons(rows.map(r=>r.payload))};
}
