import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {REIKI_HINTS_COUNT,reikiHintsCard,validateReikiHintsRequest,REIKI_HINTS_CONSENT_VERSION} from '../lib/app/reiki-hints-catalog.mjs'
test('30 distinct fixed slots and photos, bounded localized captions',()=>{
 assert.equal(REIKI_HINTS_COUNT,30)
 for(const locale of ['ru','en','es']){
  const cards=Array.from({length:30},(_,i)=>reikiHintsCard(i+1,locale))
  assert.equal(new Set(cards.map(x=>x.id)).size,30)
  assert.equal(new Set(cards.map(x=>x.photoUrl)).size,30)
  for(const [i,c] of cards.entries()){
   assert.ok(c.caption.startsWith('Reiki Hints · '+(i+1)+'/30'))
   assert.ok(c.caption.length<=1000)
   assert.equal(new URL(c.photoUrl).origin,'https://images.pexels.com')
  }
 }
 for(const day of [-1,0,31,1.5])assert.throws(()=>reikiHintsCard(day,'en'))
})
test('explicit consent, valid time and zone, no arbitrary recipient or topic',()=>{
 const good={enabled:true,permissionAccepted:true,consentVersion:REIKI_HINTS_CONSENT_VERSION,locale:'en',dailyAt:'09:00',timezone:'America/Toronto'}
 assert.equal(validateReikiHintsRequest(good).dailyAt,'09:00')
 assert.deepEqual(validateReikiHintsRequest({enabled:false}),{enabled:false})
 for(const patch of [{permissionAccepted:false},{timezone:'no-zone'},{dailyAt:'25:00'},{chatId:'123456'},{consentVersion:'wrong'}])assert.throws(()=>validateReikiHintsRequest({...good,...patch}))
})
test('durable claim before transport and finite date range are wired',async()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261125195701_hh_reiki_hints_30_day.sql',import.meta.url),'utf8')
 assert.match(sql,/primary key\(account_id,local_day\),unique\(account_id,slot\)/)
 assert.match(sql,/between 0 and 29/)
 assert.match(sql,/p\.stopped_at is null/)
 assert.match(sql,/l\.verified_at=p\.link_verified_at/)
 assert.match(sql,/force row level security/)
 const worker=readFileSync(new URL('../lib/app/reiki-hints-dispatch.js',import.meta.url),'utf8')
 assert.ok(worker.indexOf('reiki_hints_claim')<worker.indexOf('reiki_hints_ready'))
 assert.ok(worker.indexOf('reiki_hints_ready')<worker.lastIndexOf('sendReikiHintsTelegramMessage'))
 const cron=readFileSync(new URL('../app/api/internal/direct-message-push/route.js',import.meta.url),'utf8')
 assert.match(cron,/HH_REIKI_HINTS_SEND_APPROVED==='true'/)
 const entry=readFileSync(new URL('../components/energywork-ai-learner.tsx',import.meta.url),'utf8')
 assert.match(entry,/slide\.id === "flight-hints" \? <ReikiHintsSlide/)
 const {energyworkSequence}=await import("../data/academy/energywork-ai-schema.js")
 const seq=energyworkSequence();assert.equal(seq[seq.indexOf("flight-done")-1],"flight-hints")
})

test('confirmed Telegram link is atomic and does not depend on a browser returning',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const ui=read('components/app/reiki-hints-slide.jsx')
 assert.doesNotMatch(ui,/sessionStorage/)
 assert.match(ui,/action:'confirm'/)
 const route=read('app/api/app/reiki-hints/route.js')
 assert.match(route,/crmNoticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION/)
 const webhook=read('lib/app/client-telegram-webhook.js')
 assert.match(webhook,/notification_tg_consume_with_crm/)
 const sql=read('supabase/migrations/20261125201500_hh_telegram_confirm_crm_intent.sql')
 assert.match(sql,/c.token_hash=p_token_hash/)
 assert.match(sql,/c.expires_at>now\(\)/)
 assert.match(sql,/notification_tg_consume\(p_token_hash,p_account_id,p_chat_hash,p_ciphertext\)/)
 assert.match(sql,/grant execute on function[\s\S]*to hh_app_inbox/i)
 assert.match(sql,/p.chat_hash is null and p.stopped_at is null/)
})
