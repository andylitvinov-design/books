import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const uuid='11111111-1111-4111-8111-111111111111'

test('real public enquiry alerts are opt-in, owner-only, at-most-once and privacy-safe',()=>{
 const route=read('app/api/service-enquiries/route.js')
 const dispatch=read('lib/app/public-enquiry-telegram.js')
 const sql=read('supabase/migrations/20261025181314_hh_owner_telegram_public_enquiry_pilot_20261025.sql')
 const bot=read('lib/app/client-telegram-transport.js')
 const policy=read('lib/app/client-telegram-policy.js')
 assert.match(route,/result.saved === true && result.contactPending === false/)
 assert.match(route,/after\(async \(\) =>/)
 assert.match(route,/dispatchPublicServiceEnquiryTelegram\(config, result.id\)/)
 assert.match(route,/HH_PUBLIC_ENQUIRY_OWNER_TG_UNCONFIRMED/)
 assert.match(dispatch,/telegramOwnerPilotReady\(env\)/)
 assert.match(dispatch,/\[enquiryId,PRACTITIONER_ID\]/)
 assert.match(dispatch,/notification_tg_public_enquiry_claim/)
 assert.match(dispatch,/notification_tg_public_enquiry_allowed/)
 assert.match(dispatch,/notification_tg_public_enquiry_finish/)
 assert.match(dispatch,/consumeRate\(config,\{scope:'hh-owner-telegram-real-enquiry'/)
 assert.match(sql,/force row level security/i)
 assert.match(sql,/on conflict do nothing/i)
 assert.match(sql,/e.contact_ciphertext is not null/i)
 assert.match(sql,/e.created_at>now\(\)-interval '15 minutes'/)
 assert.match(sql,/n.topics->>'booking'='true'/)
 assert.match(sql,/n.consent_version='hh-messenger-contact-v1'/)
 assert.match(sql,/l.consent_version='hh-tg-message-alerts-v1'/)
 assert.match(sql,/from public,anon,authenticated,hh_app_inbox,hh_crm_backend/)
 assert.match(bot,/event==='enquiry'/)
 assert.match(bot,/app\/practice\?panel=requests/)
 assert.doesNotMatch(bot.slice(bot.indexOf('export async function sendOwnerTelegramEventMessage')),/free.?text|prescription|diagnos|contact_ciphertext/i)
 assert.match(policy,/HH_CLIENT_TG_OWNER_PILOT_ENABLED==='true'/)
 assert.doesNotMatch(policy,/HH_CLIENT_TG_SEND_APPROVED='true'/)
})

function fixture({ready=true,targets=[{target_account_id:'owner',target_chat_hash:'hash',target_ciphertext:'cipher',target_locale:'ru'}],allowed=true,throttled=false}={}){
 const events=[]
 const source=read('lib/app/public-enquiry-telegram.js').replace(/^import .*$/gm,'').replace(/export /g,'')+'; dispatchPublicServiceEnquiryTelegram'
 const transaction=async(_config,_actor,fn)=>fn({query:async(query,args)=>{
  if(query.includes('notification_tg_public_enquiry_claim'))return {rows:targets}
  if(query.includes('notification_tg_public_enquiry_allowed'))return {rows:[{allowed}]}
  if(query.includes('notification_tg_public_enquiry_finish')){events.push(['finish',args[1]]);return {rows:[{ok:true}]}}
  throw new Error('unexpected query')
 }})
 const fn=runInNewContext(source,{
  transaction,consumeRate:async()=>{if(throttled)throw Object.assign(new Error('throttle'),{code:'RATE_LIMITED'})},
  openSealed:()=>({chatId:'123456789'}),requireUUID:()=>{},PRACTITIONER_ID:'official-master',
  telegramOwnerPilotReady:()=>ready,
  sendOwnerTelegramEventMessage:async args=>{events.push(['send',args.event]);return {providerMessageId:'42',accepted:true}},
  process:{env:{}},
 })
 return {fn,events}
}

test('off gate or missing/deduplicated target never reaches provider',async()=>{
 for(const input of [{ready:false},{targets:[]}]){
  const x=fixture(input)
  const result=await x.fn({},uuid)
  assert.equal(result.attempted,0)
  assert.deepEqual(x.events,[])
 }
})
test('verified consent recheck precedes a single fixed owner message',async()=>{
 const a=fixture(),r=await a.fn({},uuid)
 assert.equal(r.accepted,1)
 assert.deepEqual(a.events,[['send','enquiry'],['finish','accepted']])
 const b=fixture({allowed:false}),s=await b.fn({},uuid)
 assert.equal(s.attempted,0)
 assert.deepEqual(b.events,[['finish','suppressed']])
})
test('volume limit suppresses provider activity without duplicate retry',async()=>{
 const a=fixture({throttled:true}),r=await a.fn({},uuid)
 assert.equal(r.accepted,0)
 assert.deepEqual(a.events,[['finish','suppressed']])
})
