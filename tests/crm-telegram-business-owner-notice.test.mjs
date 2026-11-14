import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
const source=readFileSync(new URL('../lib/crm/telegram-business-owner-notice.mjs',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/^export /gm,'')+'\n; notifyConfirmedTelegramBusinessOwner'
const env={HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'}
function fixture({intent='Confirm',session=true,match=true,ready=true,bot='andydotbot',verified=true}={}){
 const events=[]
 const message={update_id:42,business_message:{business_connection_id:'connection-1',chat:{id:123456789,type:'private'},from:{id:123456789,is_bot:false},text:intent,message_id:4}}
 const ctx=vm.createContext({
  process:{env},
  telegramBusinessMessageFromUpdate:u=>u.business_message?{text:u.business_message.text,connectionId:u.business_message.business_connection_id,chatId:u.business_message.chat.id,updateId:u.update_id}:null,
  telegramBusinessClientChoice:t=>t==='Confirm'?{kind:'confirm'}:t==='/stop'?{kind:'stop'}:null,
  operationHash:({scope})=>scope==='hh-tg-business-connection'?'a'.repeat(64):'b'.repeat(64),
  webhookTransaction:async(c,fn)=>fn({query:async(sql,args)=>{
   events.push('session_lookup'); assert.ok(sql.includes("stage='submitted'"));
   assert.equal(args.at(-1),42)
   return {rows:session?[{operation_id:'11111111-1111-4111-8111-111111111111',reference_code:'HH-AB12CD34EF56'}]:[]}
  }}),
  transaction:async(c,actor,fn)=>fn({query:async(sql,args)=>{
   if(sql.includes('set_config')){events.push('operation_scope');return {rows:[]}}
   if(sql.includes('app.public_service_enquiries')){events.push('validate_enquiry');return {rows:match?[{id:'22222222-2222-4222-8222-222222222222',owner_id:'33333333-3333-4333-8333-333333333333'}]:[]}}
   if(sql.includes('notification_public_enquiry_intents')){events.push('intent');return {rowCount:1,rows:[]}}
   throw new Error('Unexpected SQL '+sql.slice(0,45))
  }}),
  telegramOwnerPilotReady:()=>ready,telegramClientBotUsername:()=>bot,
  verifyClientBot:async()=>{events.push('verify_bot');if(!verified)throw Error('unverified');return {username:'andydotbot'}},
  dispatchPublicServiceEnquiryTelegram:async(c,id,op,env)=>{events.push('dispatch');return {attempted:1,accepted:1}},
  PRACTITIONER_ID:'44444444-4444-4444-8444-444444444444',String,
 },{codeGeneration:{strings:false,wasm:false}})
 const fn=vm.runInContext(source,ctx,{timeout:2000})
 return {events,message,fn}
}
test('only a committed client-confirmed enquiry can enqueue an owner notice',async()=>{
 const x=fixture()
 assert.equal((await x.fn({},x.message,env)).accepted,1)
 assert.deepEqual(x.events,['session_lookup','operation_scope','validate_enquiry','intent','verify_bot','dispatch'])
})
test('unconfirmed, STOP, incomplete/foreign session and missing CRM row are silent',async()=>{
 for(const data of [{intent:'unrelated'},{intent:'/stop'},{session:false},{match:false}]){
  const x=fixture(data),result=await x.fn({},x.message,env)
  assert.equal(result.accepted,0);assert.ok(!x.events.includes('dispatch'))
 }
})
test('unready, wrong bot or invalid bot identity saves intent but cannot send',async()=>{
 for(const data of [{ready:false},{bot:'another_bot'},{verified:false}]){
  const x=fixture(data),result=await x.fn({},x.message,env)
  assert.equal(result.attempted,0);assert.ok(x.events.includes('intent'));assert.ok(!x.events.includes('dispatch'))
 }
})
test('privacy: no client text/identity forwarded in owner notification request',()=>{
 assert.doesNotMatch(source,/sendMessage\s*\(|sendOneMessengerMessage\s*\(|console\.log\(/)
 assert.match(source,/telegramBusinessClientChoice\(event\.text\)\?\.kind!=='confirm'/)
 assert.match(source,/stage='submitted'/)
 assert.match(source,/app_private\.notification_public_enquiry_intents/)
 assert.match(source,/dispatchPublicServiceEnquiryTelegram/)
})

test('signed webhook schedules a post-commit owner notification, without changing client reply',()=>{
 const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8')
 const signed=route.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')
 const committed=route.indexOf('processTelegramBusinessConversation(body,config)')
 const notice=route.indexOf('notifyConfirmedTelegramBusinessOwner(config,body)')
 assert.ok(signed>0&&committed>signed&&notice>committed)
 assert.match(route,/if\(business\.terminal\)after\(async\(\)=>\{/);
 assert.match(route,/HH_TG_BUSINESS_OWNER_NOTICE_UNCONFIRMED/);
 assert.match(route,/sendHolisticBusinessRequestReply/);
})


test('all 15 approved Telegram service labels are permitted in neutral owner notices',()=>{
 const catalogue=readFileSync(new URL('../lib/analytics/enquiry-public-catalog.mjs',import.meta.url),'utf8')
 const fixed=readFileSync(new URL('../lib/assist/telegram-business-request.mjs',import.meta.url),'utf8')
 const labels=[...fixed.matchAll(/(?:homeopathy|coaching|reiki|constellations|business):'([^']+)'/g)].map(x=>x[1])
 assert.equal(labels.length,15)
 for(const label of labels)
  assert.ok(catalogue.includes("'"+label+"'"),'Missing verified public title: '+label)
})
