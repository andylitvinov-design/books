import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261029193000_hh_agent_memory_opt_in_v1.sql");
const store=read("lib/holistic-support/agent-memory-store.js");
const route=read("app/api/app/agent-memory/route.js");
const model=read("public/holistic-mind/webllm-worker.mjs");
test("RLS enforced for both memory and consent, owner checks for every statement",()=>{
 for(const table of ["agent_memory_item","agent_memory_consent"]){
  assert.match(sql,new RegExp("alter table app_private\\."+table+" enable row level security"));
  assert.match(sql,new RegExp("alter table app_private\\."+table+" force row level security"));
  for(const cmd of ["select","insert","update","delete"])
   assert.match(sql,new RegExp(table+"_owner_"+cmd));
 }
 assert.match(sql,/to hh_app_backend/u);
 assert.match(sql,/account_id\s*=\s*\(select auth\.uid\(\)\)/u);
 assert.match(sql,/app_private\.account_active/u);
 assert.match(sql,/revoke all on app_private\.agent_memory_item from public,anon,authenticated/u);
});
test("memory is encrypted and never saved from conversation text",()=>{
 assert.match(store,/seal\(validated,secretContext/u);
 assert.match(store,/openSealed\(row\.value_ciphertext/u);
 assert.match(store,/readMyAgentMemory/u);
 assert.match(store,/consentToAgentMemory/u);
 assert.match(store,/eraseAllOwnAgentMemory/u);
 assert.doesNotMatch(store,/rawUtterance|rawConversation|assessmentResult/u);
});
test("API uses server verified user, origin and owner RLS transaction",()=>{
 assert.match(route,/createRequestAuth\(request,config\)/u);
 assert.match(route,/await auth\.verified\(\)/u);
 assert.match(route,/requireSameOrigin\(request,config\)/u);
 assert.match(route,/HH_AGENT_MEMORY_ENABLED/u);
 assert.match(route,/readBody\(request,2048\)/u);
 assert.match(route,/PRIVATE_HEADERS/u);
 assert.doesNotMatch(route,/service_role|clientUserId/u);
});
test("local worker has no remote inference call or tool execution",()=>{
 assert.match(model,/CreateMLCEngine/u);
 assert.match(model,/browser-local|in-browser|on-device/i);
 assert.doesNotMatch(model,/OPENAI_API_KEY|ANTHROPIC_API_KEY|service_role|supabase\.from\(/u);
});

test("separate use-in-dialogue permission is durable and never implicit",()=>{
 assert.match(sql,/use_in_dialogue boolean not null default false/u);
 assert.match(store,/configureOwnAgentMemoryUse/u);
 assert.match(store,/accepted=true returning use_in_dialogue/u);
 assert.match(route,/body\.action==="use"/u);
 assert.match(route,/body\.enabled/u);
 assert.match(store,/useInDialogue:/u);
});
