import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const uuid='11111111-1111-4111-8111-111111111111'
const migration='supabase/migrations/20261025181838_hh_owner_telegram_live_message_pilot_20261025.sql'

test('live owner pilot is source-gated to actual client messages and server-verified first-party master',()=>{
 const code=read('lib/app/client-telegram-dispatch.js')
 const sql=read(migration)
 assert.match(code,/telegramOwnerPilotReady\(env\)/)
 assert.match(code,/notification_tg_owner_pilot_target\(\$1,\$2\)/)
 assert.match(code,/\[messageId,PRACTITIONER_ID\]/)
 assert.match(code,/ownerTarget=!generalApproved/)
 assert.match(code,/item.target_account_id!==ownerTarget/)
 assert.match(code,/stillOwner!==ownerTarget/)
 assert.match(code,/scope:'hh-owner-telegram-live-message'/)
 assert.match(code,/event:'message'/)
 assert.match(code,/sendClientTelegramMessage/)
 assert.match(sql,/m.author_role='client' and m.visibility='participants'/)
 assert.match(sql,/p.id=p_practitioner_id/)
 assert.match(sql,/m.author_account_id=r.account_id/)
 assert.match(sql,/m.author_account_id<>p.trusted_auth_user_id/)
 assert.match(sql,/r.remote_booking is not null/)
 assert.match(sql,/revoke all on function app_private.notification_tg_owner_pilot_target/)
 assert.match(sql,/to hh_app_backend/)
})
function fixture({pilot=true,broad=false,owner='owner',target='owner',allowed=true,duplicate=false,throttle=false}={}){
 let sends=[],claims=0,finishes=[]
 const code=read('lib/app/client-telegram-dispatch.js').replace(/^import .*$/gm,'').replace(/export /g,'')+'; dispatchClientTelegramNotification'
 const transaction=async(_config,_actor,action)=>action({query:async(q,args)=>{
  if(q.includes('notification_tg_owner_pilot_target'))return {rows:[{account_id:owner}]}
  if(q.includes('notification_tg_message_claim')){claims++;return {rows:duplicate?[]:[{
   target_account_id:target,target_ciphertext:'cipher',target_locale:'en',
   target_chat_hash:'hash',target_request_id:uuid}]}}
  if(q.includes('notification_tg_dispatch_allowed'))return {rows:[{allowed}]}
  if(q.includes('notification_tg_dispatch_finish')){finishes.push(args[1]);return {rows:[{}]}}
  throw Error('unexpected SQL')
 }})
 const fn=runInNewContext(code,{
  transaction,consumeRate:async()=>{if(throttle)throw Object.assign(Error('limit'),{code:'RATE_LIMITED'})},
  openSealed:()=>({chatId:'123456789'}),PRACTITIONER_ID:'official',
  telegramClientSendReady:()=>broad,telegramOwnerPilotReady:()=>pilot,
  sendClientTelegramMessage:async()=>{sends.push('client');return {providerMessageId:'42'}},
  sendOwnerTelegramEventMessage:async payload=>{sends.push(payload.event);return {providerMessageId:'43'}},
  process:{env:{}},
 })
 return {fn,sends,finishes,get claims(){return claims}}
}
test('off gate and ineligible owner never claim a private notification',async()=>{
 const disabled=fixture({pilot:false})
 assert.equal((await disabled.fn({},uuid)).attempted,0)
 assert.equal(disabled.claims,0)
 const other=fixture({owner:null})
 assert.equal((await other.fn({},uuid)).attempted,0)
 assert.equal(other.claims,0)
})
test('owner-only pilot delivers once; duplicates, changed recipients, revocation fail closed',async()=>{
 const own=fixture(),result=await own.fn({},uuid)
 assert.equal(result.accepted,1)
 assert.deepEqual(own.sends,['message'])
 assert.deepEqual(own.finishes,['accepted'])
 const duplicate=fixture({duplicate:true})
 assert.equal((await duplicate.fn({},uuid)).attempted,0)
 assert.deepEqual(duplicate.sends,[])
 const foreign=fixture({target:'other'})
 assert.equal((await foreign.fn({},uuid)).attempted,0)
 assert.deepEqual(foreign.sends,[])
 assert.deepEqual(foreign.finishes,['suppressed'])
 const revoked=fixture({allowed:false})
 assert.equal((await revoked.fn({},uuid)).attempted,0)
 assert.deepEqual(revoked.sends,[])
})
test('rate cap fails closed, general customer delivery remains a separate gated path',async()=>{
 const throttle=fixture({throttle:true}),out=await throttle.fn({},uuid)
 assert.equal(out.accepted,0)
 assert.deepEqual(throttle.finishes,['suppressed'])
 const general=fixture({broad:true,pilot:false})
 assert.equal((await general.fn({},uuid)).accepted,1)
 assert.deepEqual(general.sends,['client'])
})
