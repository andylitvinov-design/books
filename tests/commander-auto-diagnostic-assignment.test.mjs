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
