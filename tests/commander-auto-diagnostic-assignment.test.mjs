import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../supabase/functions/agent-commander-private-store-v1/index.ts",import.meta.url),"utf8");
const section=src.slice(src.indexOf("let eligibleTriageHead=null;"),src.indexOf("const chatEventId=await stableScopeId(e.inbox_owner_id,\"github-ci-route:"));
test("classified test errors require live GitHub exact HEAD and trusted role",()=>{
 for(const text of ["fresh.head?.sha===p.headSha","fresh.draft!==true",
 "fresh.head?.repo?.full_name", "eligibleTriageHead===e.head_sha",
 'c.responsible_role==="test-triage-agent"',
 'c.execution_authorized===false','c.source_write_authorized===false'])
  assert.ok(section.includes(text),text);
});
test("assign real idempotent read-only free worker without Github write token",()=>{
 for(const text of ['"ci-auto-triage-v1:"','on conflict do nothing',
 'executor,status,reason_code,request_payload,receipt',
 'modelId:"openrouter/free",confirmGitHubWrite:false',
 '"DIAGNOSTIC_QUEUED_NOT_STARTED"',
 'sourceWriteAuthorized:false','workerStarted:false',
 'OPENROUTER_API_KEY_NOT_CONFIGURED',
 'SIGNED_CI_ASSIGNMENT_NOT_MODEL_EXECUTION'])
  assert.ok(section.includes(text),text);
 assert.ok(!section.includes("createWorkflowDispatch("));
 assert.ok(!section.includes("merge_pull_request("));
});
test("source-write protections remain intact in signed route and diagnostic payload",()=>{
 assert.ok(section.includes('c.source_write_authorized===false'));
 assert.ok(section.includes('c.execution_authorized===false'));
 assert.ok(section.includes('confirmGitHubWrite:false'));
 assert.ok(section.includes('sourceWriteAuthorized:false'));
 assert.ok(src.includes('p.dispatchAccepted>0&&!(p.category==="TYPESCRIPT"||p.category==="SOURCE_CODE")'));
 assert.ok(src.includes('UNSAFE_CATEGORY_DISPATCH_REJECTED'));
});

// Live incident PR #5874: ingestion had already recorded a diagnostic
// assignment. The second allocation collided with the non-null receipt,
// rolling back the signed route and returning HTTP 503.
test("existing intake assignment is preserved and cannot roll back routing",()=>{
 assert.match(section,/assignment_receipt is null as assignment_available[^\n]*for update/);
 assert.match(section,/if\(!prior&&e\.assignment_available===true&&eligibleTriageHead===e\.head_sha/);
 const routeWrite=section.indexOf("set route_receipt=");
 const assignGuard=section.indexOf("if(!prior&&e.assignment_available===true");
 const assignWrite=section.indexOf("set assignment_receipt=");
 assert.ok(routeWrite>=0&&routeWrite<assignGuard&&assignGuard<assignWrite);
 assert.match(section,/assignment_receipt is null returning ci_event_id/);
 const guard=section.match(/if\((!prior&&e\.assignment_available===true&&eligibleTriageHead===e\.head_sha[\s\S]*?c\.responsible_role==="test-triage-agent")\)\{/);
 assert.ok(guard);
 const canAssign=new Function("prior","e","eligibleTriageHead","p","c","return "+guard[1]);
 const e={assignment_available:true,head_sha:"a".repeat(40),category:"TEST_FAILURE"};
 const p={state:"TASK_ROUTED_TO_REVIEW",reason:"NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY",dispatchAcknowledged:false,workerStarted:false};
 const c={requires_human:false,status:"DIAGNOSTIC_ONLY",source_write_authorized:false,execution_authorized:false,responsible_role:"test-triage-agent"};
 assert.equal(canAssign(null,e,e.head_sha,p,c),true);
 for(const availability of [false,null,undefined])assert.equal(canAssign(null,{...e,assignment_available:availability},e.head_sha,p,c),false);
 assert.equal(canAssign(null,e,"b".repeat(40),p,c),false);
 assert.equal(canAssign({},e,e.head_sha,p,c),false);
 assert.equal(canAssign(null,e,e.head_sha,p,{...c,source_write_authorized:true}),false);
 assert.match(src,/if\(e\.assignment_available===true\|\|p\.dispatchAccepted===1\)\{\s*await tx\.unsafe\(\s*"update business_brain\.commander_chats set execution_state/);
});
