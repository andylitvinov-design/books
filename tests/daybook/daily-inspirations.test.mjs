import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { eligibleDaybookIds, formatDaybookMessage, validateDaybookPreferences, daybookSendEnabled, DAYBOOK_REPEAT_DAYS } from '../../lib/daybook/inspirations-policy.mjs'

test('30 calendar days of history block a phrase including unknown/failed attempts',()=>{
 const catalog=[{id:'a',published:true},{id:'b',published:true},{id:'hidden',published:false}]
 const history=[{phraseId:'a',localDay:'2026-10-23',status:'unknown'}]
 assert.deepEqual(eligibleDaybookIds(catalog,history,'2026-11-22'),['b'])
 assert.deepEqual(eligibleDaybookIds(catalog,history,'2026-11-23'),['a','b'])
})
test('same day idempotency, local dates and leap boundaries',()=>{
 assert.deepEqual(eligibleDaybookIds([{id:'a',published:true}],
  [{phraseId:'a',localDay:'2026-11-22'}],'2026-11-22'),[])
 assert.deepEqual(eligibleDaybookIds([{id:'a',published:true}],
  [{phraseId:'a',localDay:'2024-02-29'}],'2024-03-30'),[])
 assert.deepEqual(eligibleDaybookIds([{id:'a',published:true}],
  [{phraseId:'a',localDay:'2024-02-29'}],'2024-03-31'),['a'])
 assert.equal(DAYBOOK_REPEAT_DAYS,30)
})
test('no matching approved phrases returns an empty pool rather than repeat',()=>{
 assert.deepEqual(eligibleDaybookIds([{id:'a',published:true}],
  [{phraseId:'a',localDay:'2026-11-21'}],'2026-11-22'),[])
})
test('validate locale, IANA time zone and time',()=>{
 assert.deepEqual(validateDaybookPreferences({locale:'ru',dailyAt:'09:05',timeZone:'America/Toronto'}),
  {locale:'ru',dailyAt:'09:05',timeZone:'America/Toronto'})
 for(const patch of [
  {locale:'zz',dailyAt:'09:00',timeZone:'UTC'},
  {locale:'ru',dailyAt:'99:00',timeZone:'UTC'},
  {locale:'ru',dailyAt:'09:00',timeZone:'Invalid/Zone'},
 ])assert.throws(()=>validateDaybookPreferences(patch))
})
test('production send requires separate explicit approval and verified bot',()=>{
 assert.equal(daybookSendEnabled({VERCEL_ENV:'production',HH_DAYBOOK_INSPIRATIONS_ENABLED:'true',
  HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED:'true'},true),true)
 assert.equal(daybookSendEnabled({VERCEL_ENV:'production',HH_DAYBOOK_INSPIRATIONS_ENABLED:'true',
  HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED:'false'},true),false)
 assert.equal(daybookSendEnabled({VERCEL_ENV:'preview',HH_DAYBOOK_INSPIRATIONS_ENABLED:'true',
  HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED:'true'},true),false)
 assert.equal(daybookSendEnabled({VERCEL_ENV:'production',HH_DAYBOOK_INSPIRATIONS_ENABLED:'true',
  HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED:'true'},false),false)
})
test('message body contains no private text or credentials',()=>{
 const msg=formatDaybookMessage('Сегодня можно сделать небольшой шаг.','ru')
 assert.match(msg,/Daybook/)
 assert.match(msg,/\/ru\/my-page/)
 assert.match(msg,/\/stop/)
 assert.doesNotMatch(msg,/[?]token=|chat_id=/)
})
test('SQL contract: atomic day claim, 30 days, verified link, no public execution',()=>{
 const sql=readFileSync(new URL('../../supabase/migrations/20261122233000_daybook_daily_inspirations.sql',import.meta.url),'utf8')
 assert.match(sql,/UNIQUE\(account_id,local_day\)/)
 assert.match(sql,/FOR UPDATE OF s SKIP LOCKED/)
 assert.match(sql,/h\.local_day >= day_value - 30/)
 assert.match(sql,/c\.is_published=true/)
 assert.match(sql,/notification_telegram_links/)
 assert.match(sql,/daybook_inspiration_send_allowed/)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private\.daybook_inspiration_claim_due/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
})
