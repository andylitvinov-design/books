import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
test('server cron enforces bearer authorization and does not return credentials',()=>{
 const handler=readFileSync('app/api/internal/notification-dispatch/route.js','utf8')
 assert.match(handler,/timingSafeEqual/)
 assert.match(handler,/CRON_SECRET/)
 assert.doesNotMatch(handler,/endpoint:/)
 assert.doesNotMatch(handler,/privateKey/)
})
test('idempotent same-device local-day claim and explicit opt-in with active course',()=>{
 const migration=readFileSync('supabase/migrations/20261013174000_hh_push_dispatch.sql','utf8')
 assert.match(migration,/unique\(subscription_id,local_day\)/)
 assert.match(migration,/p.enabled and p.course_reminders/)
 assert.match(migration,/c.status='active'/)
 assert.match(migration,/not exists \(/)
 assert.match(migration,/revoke all on function/)
 assert.match(migration,/to hh_app_backend/)
 assert.doesNotMatch(migration,/grant.*to authenticated/i)
})
