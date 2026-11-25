import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DAYBOOK_WEEKLY_PHOTO_IDS,daybookWeeklyPhoto} from '../lib/app/daybook-weekly-photos.mjs'
import {DAYBOOK_WEEKLY_CONSENT_VERSION,validateDaybookDaily,daybookWeeklyMessage} from '../lib/app/daybook-daily-copy.mjs'
const read=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8')
const goalId='550e8400-e29b-41d4-a716-446655440000'
const weekly={enabled:true,goalId,axis:'anchor',locale:'ru',dailyAt:'09:05',frequency:'weekly',
 weekday:0,timezone:'America/Toronto',consentVersion:DAYBOOK_WEEKLY_CONSENT_VERSION,goalDisclosureAccepted:true}
test('exactly 20 distinct source photos for each of eight meaning axes',()=>{
 const sets=Object.values(DAYBOOK_WEEKLY_PHOTO_IDS)
 assert.equal(sets.length,8);assert.ok(sets.every(set=>set.length===20))
 assert.equal(new Set(sets.flat()).size,160)
 for(const axis of Object.keys(DAYBOOK_WEEKLY_PHOTO_IDS))for(let i=0;i<20;i++){
  const photo=daybookWeeklyPhoto(axis,i)
  assert.match(photo.sourcePage,/^https:\/\/www\.pexels\.com\/photo\/[0-9]+\/$/)
  assert.match(photo.imageUrl,/^https:\/\/images\.pexels\.com\/photos\/[0-9]+\//)
  assert.ok(photo.previewUrl.includes('w=540'))
 }
 assert.throws(()=>daybookWeeklyPhoto('random',0))
 assert.throws(()=>daybookWeeklyPhoto('anchor',20))
})
test('weekly subscriptions require separate consent, valid weekday, clock and time zone',()=>{
 assert.equal(validateDaybookDaily(weekly).weekday,0)
 for(const fields of [{weekday:-1},{weekday:7},{weekday:1.5},{weekday:'1'},
  {frequency:'daily'},{consentVersion:'daybook-goal-to-messenger-v1'},
  {timezone:'invalid/timezone'},{dailyAt:'22:30'},{goalDisclosureAccepted:false}]){
  assert.throws(()=>validateDaybookDaily({...weekly,...fields}))
 }
 assert.deepEqual(validateDaybookDaily({enabled:false}),{enabled:false})
})
test('weekly message is localized, concise and includes account goal + private destination',()=>{
 const url='https://holistichouse.vercel.app/ru/app/my-coaching-plan?goal='+goalId
 for(const locale of ['ru','en','es']){
  const message=daybookWeeklyMessage({axis:'anchor',locale,localDay:'2026-11-25',
   accountId:goalId,goal:'My personal goal',phraseIndex:3,profileUrl:url})
  assert.ok(message.message.includes('My personal goal'))
  assert.ok(message.message.includes(url))
  assert.ok(message.message.length<950)
 }
})
test('one weekly photo per ISO-week uses private ledger; old daily remains isolated',()=>{
 const cron=read('app/api/internal/direct-message-push/route.js')
 const transport=read('lib/app/client-telegram-transport.js')
 const worker=read('lib/app/daybook-weekly-dispatch.js')
 const migration=read('supabase/migrations/20261125191125_hh_daybook_weekly_photo_delivery_20261125.sql')
 const prefs=read('lib/app/daybook-daily-repository.js')
 const ui=read('components/app/daybook-daily-settings.jsx')
 assert.match(cron,/HH_DAYBOOK_WEEKLY_SEND_APPROVED==='true'/)
 assert.match(cron,/HH_DAYBOOK_DAILY_SEND_APPROVED==='true'/)
 assert.match(transport,/botCall\('sendPhoto'/)
 assert.match(transport,/photo\.origin!=='https:\/\/images\.pexels\.com'/)
 assert.match(worker,/daybook_weekly_claim/)
 assert.match(worker,/daybook_weekly_ready/)
 assert.match(worker,/daybook_weekly_finish/)
 assert.match(migration,/primary key\(account_id,week_start\)/)
 assert.match(migration,/force row level security/)
 assert.match(migration,/daybook_daily_worker_authorized/)
 assert.match(migration,/for update of p,l,g/)
 assert.match(migration,/p\.delivery_frequency='daily'/)
 assert.match(prefs,/delivery_weekday=excluded\.delivery_weekday/)
 assert.match(ui,/type="time"/)
 assert.match(ui,/WEEKDAYS\[lang\]\.map/)
 assert.match(ui,/DAYBOOK_WEEKLY_CONSENT_VERSION/)
})
