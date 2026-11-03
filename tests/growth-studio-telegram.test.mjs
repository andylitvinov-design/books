import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {nextGrowthPost} from '../lib/growth-studio/model.mjs'
import {telegramConfig,telegramPayload,telegramPublicStatus,verifyTelegramChannel,verifyTelegramPostingPermissions,sendTelegramPost} from '../lib/growth-studio/telegram.mjs'

const env={
 HH_GROWTH_TELEGRAM_ENABLED:'true',
 HH_GROWTH_TELEGRAM_BOT_TOKEN:'123456789:'+ 'a'.repeat(40),
 HH_GROWTH_TELEGRAM_CHAT_ID:'@HolisticHouseChannel',
}
function approved(overrides={}){
  const id=randomUUID()
  const fields={
    brand:'holistic_house',channel:'telegram',locale:'en',
    title:'Course invitation',caption:'Read an educational course',
    sourceUrl:'/en/academy',campaign:'intro_202610',scheduledAt:'',
    mediaUrl:'',mediaAlt:'',...overrides,
  }
  const draft=nextGrowthPost({action:'save',id,fields})
  return nextGrowthPost({current:draft,action:'approve'})
}
test('only dedicated opt-in bot/channel config enables Telegram',()=>{
  assert.equal(telegramConfig({}).ready,false)
  assert.equal(telegramConfig({...env,HH_GROWTH_TELEGRAM_ENABLED:'false'}).ready,false)
  assert.equal(telegramConfig({...env,HH_GROWTH_TELEGRAM_BOT_TOKEN:'other'}).ready,false)
  assert.equal(telegramConfig({...env,HH_GROWTH_TELEGRAM_CHAT_ID:'123456789'}).ready,false)
  assert.equal(telegramConfig(env).ready,true)
  assert.deepEqual(telegramPublicStatus(env),{ready:true,channel:'@HolisticHouseChannel'})
})
test('approved Telegram post prepares public UTM content for the exact configured channel',()=>{
  const result=telegramPayload(approved(),env.HH_GROWTH_TELEGRAM_CHAT_ID)
  assert.equal(result.method,'sendMessage')
  assert.equal(result.body.chat_id,env.HH_GROWTH_TELEGRAM_CHAT_ID)
  assert.match(result.body.text,/utm_source=telegram/)
  assert.match(result.body.text,/utm_campaign=intro_202610/)
  assert.equal(result.body.link_preview_options.is_disabled,true)
})
test('raw drafts, wrong platform, malformed channel and unsafe private links cannot send',()=>{
  const approvedPost=approved()
  assert.throws(()=>telegramPayload({...approvedPost,status:'draft'},env.HH_GROWTH_TELEGRAM_CHAT_ID),/telegram_invalid_post/)
  assert.throws(()=>telegramPayload({...approvedPost,channel:'instagram'},env.HH_GROWTH_TELEGRAM_CHAT_ID),/telegram_invalid_post/)
  assert.throws(()=>telegramPayload({...approvedPost,brand:'toronto_tantra'},env.HH_GROWTH_TELEGRAM_CHAT_ID),/telegram_invalid_post/)
  assert.throws(()=>telegramPayload(approvedPost,'@x'),/telegram_invalid_post/)
  assert.throws(()=>approved({sourceUrl:'/en/client/private'}),/invalid_post/)
})
test('photo and video are explicit; unsupported media and oversize caption fail without truncation',()=>{
  const photo=approved({mediaUrl:'/images/public.jpg',mediaAlt:'Bookshelf'})
  assert.equal(telegramPayload(photo,env.HH_GROWTH_TELEGRAM_CHAT_ID).method,'sendPhoto')
  const video=approved({mediaUrl:'/videos/intro.mp4'})
  assert.equal(telegramPayload(video,env.HH_GROWTH_TELEGRAM_CHAT_ID).method,'sendVideo')
  const webp=approved({mediaUrl:'/images/public.webp',mediaAlt:'Poster'})
  assert.throws(()=>telegramPayload(webp,env.HH_GROWTH_TELEGRAM_CHAT_ID),/telegram_media_unsupported/)
  const long=approved({mediaUrl:'/images/public.jpg',mediaAlt:'Poster',caption:'a'.repeat(1100)})
  assert.throws(()=>telegramPayload(long,env.HH_GROWTH_TELEGRAM_CHAT_ID),/telegram_text_too_long/)
})
test('preflight only accepts a real matching public channel, never a user or wrong account',async()=>{
  let checks=0
  const verified=await verifyTelegramChannel({environment:env,fetchFn:async(url,request)=>{
    checks++
    assert.match(url,/\/getChat$/)
    assert.deepEqual(JSON.parse(request.body),{chat_id:'@HolisticHouseChannel'})
    return {ok:true,json:async()=>({ok:true,result:{type:'channel',id:-1001234567890,username:'HolisticHouseChannel'}})}
  }})
  assert.equal(verified,true)
  assert.equal(checks,1)
  for(const actual of [
    {type:'private',username:'HolisticHouseChannel'},
    {type:'channel',username:'NotOurChannel'},
    null,
  ])await assert.rejects(verifyTelegramChannel({environment:env,fetchFn:async()=>({
    ok:true,json:async()=>({ok:true,result:actual}),
  })}),/telegram_channel_unverified/)
})

test('provider success returns only real channel-confirmed message ID and URL',async()=>{
  const post=approved()
  let calls=0
  const receipt=await sendTelegramPost(post,{environment:env,fetchFn:async(url,request)=>{
    calls++
    assert.match(url,/^https:\/\/api\.telegram\.org\/bot123456789:/)
    const body=JSON.parse(request.body)
    assert.equal(body.chat_id,'@HolisticHouseChannel')
    assert.equal(request.method,'POST')
    return {ok:true,json:async()=>({ok:true,result:{chat:{type:'channel',username:'HolisticHouseChannel'},message_id:223}})}
  }})
  assert.equal(calls,1)
  assert.equal(receipt.messageId,223)
  assert.equal(receipt.provider,'telegram')
  assert.equal(receipt.url,'https://t.me/HolisticHouseChannel/223')
  assert.equal(Object.keys(receipt).includes('token'),false)
})
test('timeouts, wrong-channel receipts or missing confirmation return delivery-unknown, never fake success',async()=>{
  for(const result of [
    ()=>{throw new Error('network timeout')},
    ()=>({ok:false}),
    ()=>({ok:true,json:async()=>({ok:true,result:{chat:{username:'Different'},message_id:1}})}),
    ()=>({ok:true,json:async()=>({ok:true,result:{chat:{username:'HolisticHouseChannel'},message_id:0}})}),
  ]){
    let calls=0
    await assert.rejects(sendTelegramPost(approved(),{environment:env,fetchFn:async()=>{
      calls++
      return result()
    }}),/telegram_delivery_unknown/)
    assert.equal(calls,1)
  }
})
test('no configured bot means no network access',async()=>{
  let count=0
  await assert.rejects(sendTelegramPost(approved(),{environment:{},fetchFn:async()=>{count++;return {}}}),/telegram_unconfigured/)
  assert.equal(count,0)
})


test('Telegram connection test validates exact channel, bot identity and administrator posting permissions',async()=>{
 const methods=[]
 const fetchFn=async(url,req)=>{
   const method=url.split('/').at(-1)
   methods.push(method)
   if(method==='getChat')return {ok:true,json:async()=>({ok:true,result:{type:'channel',id:-1001234567890,username:'HolisticHouseChannel'}})}
   if(method==='getMe')return {ok:true,json:async()=>({ok:true,result:{id:123456789,is_bot:true,username:'HolisticHousePublisher'}})}
   if(method==='getChatMember'){
     assert.deepEqual(JSON.parse(req.body),{chat_id:'@HolisticHouseChannel',user_id:123456789})
     return {ok:true,json:async()=>({ok:true,result:{status:'administrator',can_post_messages:true}})}
   }
   throw new Error('UNEXPECTED_ENDPOINT')
 }
 const result=await verifyTelegramPostingPermissions({environment:env,fetchFn})
 assert.equal(result.verified,true)
 assert.equal(result.channel,'@HolisticHouseChannel')
 assert.deepEqual(methods,['getChat','getMe','getChatMember'])
})
test('Telegram connection fails closed for bot without channel posting rights',async()=>{
 for(const rights of [
  {status:'member'},{status:'administrator',can_post_messages:false},
  {status:'restricted',can_post_messages:true},
 ]){
   await assert.rejects(verifyTelegramPostingPermissions({environment:env,fetchFn:async(url)=>{
     const method=url.split('/').at(-1)
     const result=method==='getChat'?{type:'channel',id:-1001234567890,username:'HolisticHouseChannel'}:
       method==='getMe'?{id:123456789,is_bot:true}:rights
     return {ok:true,json:async()=>({ok:true,result})}
   }}),/telegram_permission_unverified/)
 }
})
test('posting-permission check does not attempt to send or post content',async()=>{
 let calls=0
 const fetchFn=async(url)=>{
   assert.ok(url.endsWith('/getChat')||url.endsWith('/getMe')||url.endsWith('/getChatMember'))
   calls++
   const method=url.split('/').at(-1)
   return {ok:true,json:async()=>({ok:true,result:method==='getChat'?{type:'channel',username:'HolisticHouseChannel',id:-1001234567890}:
     method==='getMe'?{id:123456789,is_bot:true}:{status:'administrator',can_post_messages:true}})}
 }
 await verifyTelegramPostingPermissions({environment:env,fetchFn})
 assert.equal(calls,3)
})
