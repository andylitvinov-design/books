import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {daybookMessage} from '../lib/app/daybook-daily-copy.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const ddl=read('supabase/migrations/20261122235900_daybook_daily_random_30day.sql')
const runner=read('lib/app/daybook-daily-dispatch.js')
const goalId='550e8400-e29b-41d4-a716-446655440000'
test('SQL atomically reserves random published phrase for one local day',()=>{
 assert.match(ddl,/ADD COLUMN IF NOT EXISTS phrase_id text/)
 assert.match(ddl,/ADD COLUMN IF NOT EXISTS focus_axis text/)
 assert.match(ddl,/CREATE OR REPLACE FUNCTION app_private.daybook_daily_claim/)
 assert.match(ddl,/FOR UPDATE OF p/)
 assert.match(ddl,/ON CONFLICT\(account_id,local_day\) DO NOTHING/)
 assert.match(ddl,/FROM public.hh_ideas_aphorisms c/)
 assert.match(ddl,/c.is_published=true/)
 assert.match(ddl,/ORDER BY pg_catalog.random\(\)/)
 assert.match(ddl,/IF v_phrase_id IS NULL THEN RETURN false/)
})
test('rolling 30 previous LOCAL dates, including unknown, and all axes/languages',()=>{
 assert.match(ddl,/h.account_id=p_account AND h.phrase_id=c.id/)
 assert.match(ddl,/h.local_day>=p_day-30 AND h.local_day<p_day/)
 assert.doesNotMatch(ddl,/h.status='accepted'/)
 assert.match(ddl,/daybook_daily_attempts\(account_id,local_day,goal_id,phrase_id,focus_axis\)/)
 assert.match(ddl,/d.focus_axis=p.focus_axis/)
 assert.match(ddl,/d.goal_id=p.goal_id/)
 for(const axis of ['anchor','connection','freedom','agency','love','dignity','realization','recognition'])
  assert.match(ddl,new RegExp("WHEN '"+axis+"' THEN c.topic=ANY"))
 for(const language of ['ru','en','es'])
  assert.match(ddl,new RegExp("COALESCE\\(c.text_"+language+",''\\)"))
})
test('runtime MUST use database reserved phrase, no preview rotation fallback',()=>{
 assert.match(runner,/daybook_daily_selected_phrase/)
 assert.match(runner,/selectedPhrase:selected.phrase_text/)
 assert.match(runner,/if\(!selected\|\|typeof selected.phrase_text/)
 assert.match(runner,/daybook_daily_claim/)
 assert.doesNotMatch(runner,/daybookPhrase\(/)
})
test('message includes selected published text and goal, checks content',()=>{
 for(const locale of ['ru','en','es']){
  const text='Подходящее сообщение из подтверждённого каталога.'
  const message=daybookMessage({axis:'love',locale,localDay:'2026-11-22',
   accountId:goalId,goal:'Уделять время отношениям',
   profileUrl:'https://holistichouse.vercel.app/ru/app/my-coaching-plan?goal='+goalId,selectedPhrase:text})
  assert.equal(message.phrase,text)
  assert.ok(message.message.includes(text))
  assert.throws(()=>daybookMessage({axis:'love',locale,localDay:'2026-11-22',
   accountId:goalId,goal:'Цель',
   profileUrl:'https://holistichouse.vercel.app/ru/app/my-coaching-plan?goal='+goalId,
   selectedPhrase:'\nshort'}))
 }
})
test('worker read is protected, separate production and Telegram gates retained',()=>{
 assert.match(ddl,/daybook_daily_worker_authorized\(\)/)
 assert.match(ddl,/REVOKE ALL ON FUNCTION app_private.daybook_daily_selected_phrase/)
 assert.match(ddl,/FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend/)
 assert.match(runner,/HH_DAYBOOK_DAILY_SEND_APPROVED==='true'/)
 assert.match(runner,/telegramClientSendReady/)
})
