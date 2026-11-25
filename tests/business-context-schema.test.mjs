import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../supabase/migrations/20261120110000_business_context_v1.sql',import.meta.url),'utf8')
const statusMigration=readFileSync(new URL('../supabase/migrations/20261120123000_business_context_verified_status.sql',import.meta.url),'utf8')

test('business context schema is private, account-scoped, encrypted and idempotent',()=>{
 for(const table of ['business_context_connections','business_source_records','business_call_insights','business_task_proposals','business_project_context','business_context_sync_runs']){
  assert.match(sql,new RegExp('create table if not exists app_private\\.'+table))
 }
 assert.match(sql,/execute format\('alter table app_private\.%I enable row level security',t\)/)
 assert.match(sql,/payload_ciphertext text/)
 assert.match(sql,/unique \(account_id, provider, provider_record_id, revision_hash\)/)
 assert.match(sql,/unique \(account_id, idempotency_key\)/)
 assert.match(sql,/credential_ref/)
 assert.doesNotMatch(sql,/api_key|access_token|refresh_token/i)
})

test('reviewed verified status is accepted by the forward-only migration',()=>{
 assert.match(statusMigration,/drop constraint if exists business_call_insights_kind_check/)
 assert.match(statusMigration,/verified_status/)
})
