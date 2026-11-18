import test from 'node:test';
import assert from 'node:assert/strict';
import {appendActivityDigest,appendRunDigest,syncRecentRunDigests,appendCiDigest,listAgentDigests,recallAgentDigests,inspectAgentDigest,canonicalChatProject} from '../supabase/functions/agent-commander-private-store-v1/agent-memory-store.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='99999999-9999-4999-8999-999999999999';
const chat='33333333-3333-4333-8333-333333333333',task='22222222-2222-4222-8222-222222222222',run='44444444-4444-4444-8444-444444444444';
const digestRows=new Map();
const queries=[];
const db={async unsafe(sql,args){queries.push([sql,args]);
  if(sql.includes('from business_brain.commander_chats'))return args[0]===owner?[{chat_id:chat,task_id:task,payload:{project:'commander'}}]:[];
  if(sql.includes('insert into business_brain.commander_chat_events')){
    if(digestRows.has(args[0]))return[];
    const d=JSON.parse(args[3]);digestRows.set(args[0],{owner:args[2],chat:args[1],payload:d});return[{event_id:args[0]}];
  }
  if(sql.includes('from business_brain.commander_execution_runs'))return[];
  if(sql.includes('from business_brain.commander_chat_events'))return [...digestRows.values()].filter(x=>x.owner===args[0]).map(x=>({payload:x.payload}));
  return[];}};
test('only known public project alias maps to private canonical project',()=>{
 assert.equal(canonicalChatProject({project:'commander'}),'agent-commander');assert.equal(canonicalChatProject({project:'other'}),null);
});
test('real run receipt is attributable, redacted, idempotent, isolated by owner',async()=>{
 const record={run_id:run,chat_id:chat,executor:'openrouter',status:'COMPLETED',created_at:'2026-11-12T20:00:00Z',completed_at:'2026-11-12T20:01:00Z',reason_code:'OPENROUTER_RESPONSE_VERIFIED',receipt:{schema:'HH_OPENROUTER_WORKER_RECEIPT_V1',status:'COMPLETED',runId:run,agentStarted:true,executionVerified:true,zeroCostVerified:true,costUsd:0,answerSha256:'a'.repeat(64),sourceWrite:null}};
 const first=await appendRunDigest(db,owner,record),second=await appendRunDigest(db,owner,record);
 assert.equal(first.saved,true);assert.equal(second.duplicate,true);assert.equal(digestRows.get(first.digestId).payload.verification,'verified');
 await assert.rejects(()=>appendRunDigest(db,other,record),/DIGEST_OWNER_CHAT_NOT_FOUND/);
 const unknown=await appendRunDigest(db,owner,{...record,run_id:'55555555-5555-4555-8555-555555555555',receipt:{}});
 assert.notEqual(digestRows.get(unknown.digestId).payload.verification,'verified');
 assert.ok(queries.some(([sql,args])=>sql.includes('commander_chats')&&sql.includes('owner_id=')&&args[0]===owner));
});
test('same owner new agent recall from existing event ledger and no arbitrary external instruction',async()=>{
 const found=await recallAgentDigests(db,owner,{projectKey:'agent-commander',chatId:chat,taskId:task});
 assert.equal(found.length,2);assert.ok(found.every(r=>r.result.length<200));
 const none=await recallAgentDigests(db,other,{projectKey:'agent-commander',chatId:chat,taskId:task});assert.deepEqual(none,[]);
 await assert.rejects(()=>recallAgentDigests(db,owner,{projectKey:'holistic-house',chatId:'unknown'}),/INVALID_DIGEST_RECALL_SCOPE/);
});
test('read API constraints, project and owner access in SQL, and no raw owner speech',async()=>{
 const listed=await listAgentDigests(db,owner,{projectKey:'agent-commander',limit:5});
 assert.ok(listed.digests.length>0);assert.equal(listed.briefing.scope,'returned_page_only');
 const first=listed.digests[0];assert.ok(JSON.stringify(first).length<4000);
 const detail=await inspectAgentDigest(db,owner,first.digestId);assert.ok(detail);
 assert.ok(queries.some(([s,a])=>s.includes("payload->>'projectKey'")&&a.includes('agent-commander')));
 await assert.rejects(()=>listAgentDigests(db,owner,{projectKey:'../private'}),/INVALID_DIGEST_FILTER/);
});
test('no signed CI event is matched to a foreign owner chat',async()=>{
 const e={workflow_run_id:100,run_attempt:1,pr_number:4,head_sha:'a'.repeat(40),source_run_created_at:'2026-11-12T20:00:00Z',run_url:'https://github.com/andylitvinov-design/books/actions/runs/100',category:'TYPESCRIPT'};
 const a=await appendCiDigest(db,owner,task,e);assert.equal(a.saved,true);
 const b=await appendCiDigest(db,other,task,e);assert.equal(b.saved,false);
});
