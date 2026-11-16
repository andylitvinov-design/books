import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8')
const sql=read('../docs/coaching/CLIENT_MEMORY_CARE_JOURNEY_DRAFT.sql')
const owner=read('../lib/app/client-memory-store.js')
const tasks=read('../lib/app/client-care-task-store.js')
const route=read('../app/api/app/client-memory/route.js')
const careRoute=read('../app/api/app/client-care-tasks/route.js')
const core=read('../lib/holistic-support/client-memory-core.mjs')
const bridge=read('../lib/app/client-memory-dialogue-bridge.js')
test('six private tables explicitly FORCE row-level security and forbid public table grants',()=>{
 for(const table of ['client_ai_memory_settings','client_ai_memory_items','client_ai_memory_shares',
   'client_care_tasks','client_care_task_events','client_ai_memory_audit']){
   assert.ok(sql.includes(`CREATE TABLE app_private.${table}`))
   assert.ok(sql.includes(`'${table}'`))
 }
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON app_private/)
 assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE|ALL) ON app_private\.\w+ TO (?:public|anon|authenticated)/i)
 // Exactly one narrowly-scoped security-definer helper prevents reciprocal RLS expansion.
 // No other privileged function may be introduced by the migration.
 assert.equal((sql.match(/SECURITY DEFINER/g)||[]).length,1)
 assert.match(sql,/CREATE FUNCTION app_private\.client_ai_share_item_valid\(/)
 assert.match(sql,/LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''/)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private\.client_ai_share_item_valid\(uuid,uuid\)/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION app_private\.client_ai_share_item_valid\(uuid,uuid\)[\s\S]*?TO hh_app_backend/)
 assert.match(sql,/p_account_id=\(SELECT auth\.uid\(\)\)/)
 assert.match(sql,/app_private\.account_active\(\)/)
})
test('master access requires current request and approved practitioner',()=>{
 assert.match(sql,/client_care_request_binding_valid/)
 assert.match(sql,/p\.trusted_auth_user_id = p_practitioner_account_id/)
 assert.match(sql,/p\.status = 'approved'/)
 assert.match(sql,/r\.account_id = p_client_account_id/)
 assert.match(tasks,/FOR SHARE OF r/)
 assert.match(tasks,/p\.trusted_auth_user_id=\$2/)
 assert.match(tasks,/p\.status='approved'/)
})
test('API requires actual server auth, origin, private headers and no client role override',()=>{
 for(const source of [route,careRoute]){
  assert.match(source,/createRequestAuth\(request,config\)/)
  assert.match(source,/auth\.verified\(\)/)
  assert.match(source,/requireSameOrigin\(request,config\)/)
  assert.match(source,/PRIVATE_HEADERS/)
  assert.match(source,/clientMemoryEnabled\(\)/)
  assert.doesNotMatch(source,/(?:actorRole|practitionerAccountId):\s*data\./)
 }
})
test('encryption uses authenticated owner-bound context; no raw private logging',()=>{
 for(const source of [owner,tasks]){
  assert.match(source,/seal\(/)
  assert.match(source,/openSealed\(/)
  assert.doesNotMatch(source,/console\.log\(/)
 }
 assert.match(owner,/context\(row.account_id, row.id\)/)
})
test('read uses consent before task replay and never writes memory by inference',()=>{
 assert.match(core,/userConfirmed!==true/)
 assert.match(core,/consent\?\.memory_enabled/)
 assert.match(owner,/if \(!settings\?\.memory_enabled\) return null/)
 assert.match(bridge,/if\(!memory\)return null/)
})
test('no external provider, new cron, workflow or dangerous logout override',()=>{
 assert.doesNotMatch(owner+tasks,/https?:\/\/|service_role|OPENAI_API_KEY|VERCEL_TOKEN|cron\.schedule/)
 assert.doesNotMatch(sql,/create extension|create schema|alter role/i)
})
test('master sharing is not accidentally blocked by owner-only settings RLS',()=>{
 const select=sql.split('CREATE POLICY client_ai_items_select')[1].split('CREATE POLICY client_ai_items_insert')[0]
 const shares=sql.split('CREATE POLICY client_ai_shares_select')[1].split('CREATE POLICY client_ai_shares_insert')[0]
 assert.doesNotMatch(select,/SELECT 1 FROM app_private\.client_ai_memory_settings/)
 assert.doesNotMatch(shares,/SELECT 1 FROM app_private\.client_ai_memory_settings/)
 assert.match(sql,/client_ai_memory_disable_revokes_shares/)
 assert.match(sql,/s\.revoked_at IS NULL/)
})
test('shared trigger dispatches by table before accessing relation-specific NEW fields',()=>{
 const fn=sql.split('CREATE FUNCTION app_private.client_memory_guard_immutable_bindings()')[1]
    .split('REVOKE ALL ON FUNCTION app_private.client_memory_guard_immutable_bindings()')[0]
 for(const table of ['client_care_tasks','client_ai_memory_shares','client_ai_memory_items']){
   assert.match(fn,new RegExp("(?:IF|ELSIF) TG_TABLE_NAME = '"+table+"' THEN"))
   assert.doesNotMatch(fn,new RegExp("TG_TABLE_NAME = '"+table+"' AND"))
 }
 assert.match(fn,/CLIENT_MEMORY_SHARE_IMMUTABLE/)
 assert.match(fn,/OLD\.revoked_at IS NOT NULL AND NEW\.revoked_at IS DISTINCT FROM OLD\.revoked_at/)
})
test('share expiry, revoked state and authenticated master bindings cannot be rewritten',()=>{
 assert.match(sql,/NEW\.expires_at IS DISTINCT FROM OLD\.expires_at/)
 assert.match(sql,/OLD\.revoked_at IS NOT NULL AND NEW\.revoked_at IS DISTINCT FROM OLD\.revoked_at/)
 assert.match(sql,/NEW\.practitioner_account_id IS DISTINCT FROM OLD\.practitioner_account_id/)
 assert.match(sql,/CREATE UNIQUE INDEX client_ai_shares_active_unique/)
})
test('master idempotent create is bound to the exact request and operation',()=>{
 assert.match(tasks,/existing\.consultation_request_id!==input\.requestId/)
 assert.match(tasks,/existing\.operation_id!==input\.operationId/)
 assert.match(tasks,/prior\.operation_id!==input\.operationId/)
})

test("a practitioner conversation cannot receive another client task records",()=>{
 assert.match(bridge,/rows\.tasks\.filter\(task=>task\.clientAccountId===actor\.id\)/)
 assert.match(bridge,/allowTaskDetails:memory\.sensitiveAllowed===true/)
})

test('care task events enforce the acting client/master and do not trust client-supplied timestamps',()=>{
 const events=sql.split('CREATE POLICY client_care_events_insert')[1].split('GRANT SELECT,INSERT ON app_private.client_ai_memory_audit')[0]
 assert.match(events,/actor_account_id=\(SELECT auth\.uid\(\)\)/)
 assert.match(events,/t\.client_account_id=\(SELECT auth\.uid\(\)\)/)
 assert.match(events,/t\.practitioner_account_id=\(SELECT auth\.uid\(\)\)/)
 assert.match(events,/event_kind IN \('offered','reviewed','requested_revision','cancelled'\)/)
 assert.match(sql,/NEW\.due_on IS DISTINCT FROM OLD\.due_on/)
 assert.match(sql,/NEW\.consent_version IS DISTINCT FROM OLD\.consent_version/)
 for(const col of ['accepted_at','self_reported_at','reviewed_at','updated_at'])
   assert.match(sql,new RegExp('NEW\\.'+col+' := now\\(\\)'))
})

test('the documented SQL candidate exactly matches the production migration source',()=>{
 const official=read('../supabase/migrations/20261106203000_hh_client_memory_care_journey_v1.sql')
 assert.equal(official,sql)
 assert.match(official,/CREATE TABLE app_private\.client_ai_memory_settings/)
 assert.match(official,/CREATE TRIGGER client_care_task_guard_transition/)
})
