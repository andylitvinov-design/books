import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('isolated browser database migrates the full My Course schema before starting authenticated requests', () => {
  const bootstrap=readFileSync(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8')
  const r1='20261011184000_hh_my_course_r1.sql'
  const r2='20261011203000_hh_growth_daily_r2.sql'
  assert.ok(bootstrap.includes(r1))
  assert.ok(bootstrap.includes(r2))
  assert.ok(bootstrap.indexOf(r1)<bootstrap.indexOf(r2))
  assert.ok(bootstrap.indexOf(r2)<bootstrap.indexOf('await seedApp(db)'))
  const r2sql=readFileSync(new URL('../supabase/migrations/'+r2,import.meta.url),'utf8')
  for(const table of ['growth_cycles','growth_targets','growth_checkins','growth_sessions','growth_reviews'])
    assert.match(r2sql,new RegExp('create table app_private\\.'+table))
})
