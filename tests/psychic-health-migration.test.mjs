import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const file = new URL(
  '../supabase/migrations/20261005173000_psychic_health_monitoring_r1.sql',
  import.meta.url,
)

test('psychic monitoring migration creates private mood stores with explicit RLS/grants', async () => {
  const sql = await readFile(file, 'utf8')
  const flat = sql.replace(/\s+/g, '')
  assert.match(sql, /create table app\.mood_checkins/)
  assert.match(sql, /alter table app\.mood_checkins enable row level security/)
  assert.match(sql, /create policy own_mood_checkins_read/)
  assert.match(sql, /create policy own_mood_checkins_create/)
  assert.ok(flat.includes('revokeallonapp.mood_checkinsfrompublic,anon,authenticated,hh_app_inbox'))
  assert.match(sql, /create table app_private\.guest_mood_checkins/)
  assert.match(sql, /alter table app_private\.guest_mood_checkins enable row level security/)
  assert.match(sql, /create policy guest_mood_backend_all/)
  assert.ok(
    flat.includes(
      'revokeallonapp_private.guest_mood_checkinsfrompublic,anon,authenticated,hh_app_inbox',
    ),
  )
})

test('psychic monitoring migration pins all launch definition hashes', async () => {
  const sql = await readFile(file, 'utf8')
  for (const key of [
    '"key":"phq-4"',
    '"key":"k6"',
    '"key":"phq-9"',
    '"key":"gad-7"',
    '"key":"hh-weekly-pulse"',
    '"key":"hh-resource-pulse"',
    '"key":"hh-monthly-profile"',
  ])
    assert.ok(sql.includes(key), key)
  assert.equal((sql.match(/"contentHash":"sha256:/g) || []).length, 10)
})
