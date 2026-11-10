import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('commander OAuth continuation is fixed and owner-verified', () => {
  const route = read('app/api/app/[...path]/route.js')
  const session = read('app/api/app/commander/session/route.js')
  assert.match(route, /commander-monitor/)
  assert.match(route, /commander-connect\.html\?finish=1/)
  assert.match(session, /requireSameOrigin/)
  assert.match(session, /auth\.verified\(\)/)
  assert.match(session, /AGENT_COMMANDER_PRIVATE_STORE_V1/)
  assert.match(session, /data\?\.owner\s*!==\s*true/)
})

test('one-time owner token is carried in a URL fragment, not query or browser storage', () => {
  const main = read('public/commander-connect.js')
  assert.match(main, /target\.hash = 'token='/)
  assert.doesNotMatch(main, /searchParams\.set\(['"]token/)
  assert.doesNotMatch(main, /localStorage/)
  assert.match(main, /sessionStorage\.setItem\(KEY, next\)/)
})

test('private store source requires a verified Supabase user and owner ACL', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  const config = read('supabase/config.toml')
  assert.match(edge, /auth\/v1\/user/)
  assert.match(edge, /business_brain\.owner_access/)
  assert.match(edge, /can_read/)
  assert.match(edge, /can_write/)
  assert.match(edge, /assistant_unverified/)
  assert.match(edge, /executorDispatch:false/)
  assert.match(config, /verify_jwt = true/)
})

test('GET read endpoints preserve only the approved query arguments', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  assert.match(edge, /const params=new URL\(req\.url\)\.searchParams/)
  assert.match(edge, /\["issueNumber","pr","limit"\]\.includes\(key\)/)
  assert.match(edge, /DUPLICATE_QUERY_PARAMETER/)
})

test('private tables are forced-RLS and direct privileges are revoked', () => {
  const migration = read('supabase/migrations/20261108202918_agent_commander_private_store_v1_20261108.sql')
  for (const table of ['commander_tasks','commander_chats','commander_chat_events']) {
    assert.match(migration,new RegExp('alter table business_brain\\.'+table+' enable row level security'))
    assert.match(migration,new RegExp('alter table business_brain\\.'+table+' force row level security'))
    assert.match(migration,new RegExp('revoke all on business_brain\\.'+table+' from public,anon,authenticated,service_role'))
  }
})


test('blocked execution event kind matches the private database constraint', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  const migration = read('supabase/migrations/20261110044000_commander_execution_blocked_event_kind.sql')
  assert.match(edge, /kind:"execution_blocked"/)
  assert.match(edge, /sourceVerified:false/)
  assert.match(migration, /DROP CONSTRAINT IF EXISTS commander_chat_events_kind_check/)
  assert.match(migration, /ADD CONSTRAINT commander_chat_events_kind_check/)
  assert.match(migration, /'execution_blocked'/)
  assert.match(migration, /'github_report'/)
  assert.doesNotMatch(migration, /'executor_started'|'executor_completed'|'source_verified'/)
})
