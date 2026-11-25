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
test('durable claim before transport and finite date range are wired',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261125201000_hh_reiki_hints_30_day.sql',import.meta.url),'utf8')
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
 assert.match(entry,/my-coaching-plan#reiki-hints/)
})
