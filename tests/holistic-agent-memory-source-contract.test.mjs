import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261029193000_hh_agent_memory_opt_in_v1.sql");
const store=read("lib/holistic-support/agent-memory-store.js");
const route=read("app/api/app/agent-memory/route.js");
test("private owner-scoped RLS, no Data API grants",()=>{
 for(const table of ["agent_memory_item","agent_memory_consent"]){
  assert.match(sql,new RegExp("alter table app_private\\."+table+" enable row level security"));
  assert.match(sql,new RegExp("alter table app_private\\."+table+" force row level security"));
  for(const op of ["select","insert","update","delete"])
   assert.match(sql,new RegExp(table+"_owner_"+op));
 }
 assert.match(sql,/from public,anon,authenticated,hh_app_inbox,hh_crm_backend/);
 assert.match(sql,/account_id\s*=\s*\(select auth\.uid\(\)\)/);
 assert.match(sql,/app_private\.account_active/);
 assert.doesNotMatch(sql,/security definer/i);
});
test("server verified account, same-origin protected writes and AES-GCM envelope",()=>{
 assert.match(route,/await auth\.verified\(\)/);
 assert.match(route,/requireSameOrigin\(request,config\)/);
 assert.match(route,/x-hh-memory-owner/);
 assert.match(route,/HH_AGENT_MEMORY_ENABLED/);
 assert.match(route,/readBody\(request,2048\)/);
 assert.match(store,/seal\(validated,secretContext/);
 assert.match(store,/openSealed\(row.value_ciphertext/);
 assert.match(store,/consentToAgentMemory/);
 assert.match(store,/eraseAllOwnAgentMemory/);
 assert.doesNotMatch(route,/service_role|user_metadata/);
});
test("revocation deletes memory while consent row is locked",()=>{
 for(const fn of ["consentToAgentMemory","eraseAllOwnAgentMemory"]){
  const part=store.slice(store.indexOf("export async function "+fn));
  const next=part.indexOf("\nexport async function ",5);
  const body=next>0?part.slice(0,next):part;
  assert.match(body,/agent_memory_consent[\s\S]*for update/);
  assert.match(body,/delete from app_private\.agent_memory_item/);
 }
 assert.match(sql,/use_in_dialogue boolean not null default false/);
});

test("browser memory panel is remounted and stale account reads cannot repopulate it",()=>{
 const conversation=read("components/holistic-language-conversation.tsx");
 const panel=read("components/holistic-agent-memory-panel.tsx");
 assert.match(conversation,/setMemoryPanelRevision\(revision=>revision\+1\)/);
 assert.match(conversation,/<HolisticAgentMemoryPanel key=\{memoryPanelRevision\}/);
 assert.match(conversation,/currentOwnerMatchesMemory\(latest,memoryOwner\)/);
 assert.match(conversation,/turnMemoryEpoch!==memoryEpoch.current/);
 assert.match(panel,/const epoch=\+\+readEpoch.current/);
 assert.match(panel,/useEffect\(\(\)=>\(\)=>\{readEpoch.current\+=1;\},\[\]\)/);
 assert.match(panel,/if\(epoch!==readEpoch.current\)return/);
});
