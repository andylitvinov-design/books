import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const file = new URL(
  '../supabase/migrations/20261005181337_psi_monitoring_mood_weekly.sql',
  import.meta.url,
)

test('Psi-Monitoring migration keeps account mood owner-scoped and guest mood server-only', async () => {
  const sql = await readFile(file, 'utf8')
  const flat = sql.replace(/\s+/g, '')
  assert.match(sql, /create table app\.mood_checkins/)
  assert.match(sql, /alter table app\.mood_checkins enable row level security/)
  assert.match(sql, /own_mood_checkins_read/)
  assert.match(sql, /own_mood_checkins_create/)
  assert.match(sql, /own_mood_checkins_update/)
  assert.match(sql, /account_id=\(select auth\.uid\(\)\)/)
  assert.match(sql, /create table app_private\.guest_mood_checkins/)
  assert.match(sql, /revoke all on app_private\.guest_mood_checkins from public,anon,authenticated,hh_app_inbox/)
  assert.match(sql, /grant select,insert,delete on app_private\.guest_mood_checkins to hh_app_backend/)
  assert.ok(!flat.includes('grantselectonapp_private.guest_mood_checkinstoauthenticated'))
  assert.ok(!flat.includes('grantinsertonapp.mood_checkinstoauthenticated'))
})

test('Psi-Monitoring migration registers exact versioned Weekly Pulse definitions', async () => {
  const sql = await readFile(file, 'utf8')
  assert.match(sql, /hh-weekly-pulse/)
  assert.match(sql, /7dc3058b-c939-5577-9226-9c5b50aa4aee/)
  assert.match(sql, /7780802c-603b-5382-aebf-8f6c5ef3ddcc/)
  assert.match(sql, /raw-dimensions/)
  assert.match(sql, /past-7-days/)
  assert.match(sql, /on conflict\(id\) do nothing/)
  assert.match(sql, /Published Weekly Pulse EN differs from reviewed definition/)
  assert.match(sql, /Published Weekly Pulse RU differs from reviewed definition/)
})
