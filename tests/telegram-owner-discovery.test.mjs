import test from 'node:test'
import assert from 'node:assert/strict'
import {discoverOwnerPrivateChat,findRecentOwnerStart} from '../lib/practitioners/telegram-owner-discovery.mjs'

const token='12345678:ABCDEFGHIJKLMNOPQRSTUVXYZ12345678'
const env={HH_PRACTICE_TG_BOT_TOKEN:token}
const now=new Date('2026-10-20T14:00:00Z')
const start=(override={})=>({update_id:42,message:{
  date:Math.floor(now.getTime()/1000)-60,text:'/start',
  from:{id:123456,username:'AndyTherapist',is_bot:false},
  chat:{id:123456,username:'AndyTherapist',type:'private'},...override
}})
function mock({webhook='',updates=[start()],bot='Andydotbot',chat='AndyTherapist'}={}){
  const seen=[]
  return {seen,fetcher:async url=>{
    const u=String(url);seen.push(u)
    if(u.endsWith('/getMe'))return Response.json({ok:true,result:{is_bot:true,username:bot,id:99999}})
    if(u.endsWith('/getWebhookInfo'))return Response.json({ok:true,result:{url:webhook}})
    if(u.includes('/getUpdates?'))return Response.json({ok:true,result:updates})
    if(u.includes('/getChat?'))return Response.json({ok:true,result:{type:'private',id:123456,username:chat}})
    throw Error('Unexpected Telegram endpoint')
  }}
}
test('recent exact /start from owner private chat is required',()=>{
  assert.equal(findRecentOwnerStart([start()],now)?.chatId,'123456')
  assert.equal(findRecentOwnerStart([start({text:'hello'})],now),null)
  assert.equal(findRecentOwnerStart([start({chat:{id:123456,type:'supergroup'}})],now),null)
  assert.equal(findRecentOwnerStart([start({from:{id:1,username:'OtherUser'}})],now),null)
  assert.equal(findRecentOwnerStart([start({date:Math.floor(now.getTime()/1000)-90000})],now),null)
})
test('never getUpdates when an existing webhook is configured',async()=>{
  const m=mock({webhook:'https://other.example/webhook'})
  assert.equal((await discoverOwnerPrivateChat(env,m.fetcher,now)).status,'webhook_active')
  assert.ok(m.seen.some(x=>x.endsWith('/getWebhookInfo')))
  assert.ok(!m.seen.some(x=>x.includes('/getUpdates')))
  assert.ok(!m.seen.some(x=>x.includes('deleteWebhook')||x.includes('setWebhook')))
})
test('owner identity is rechecked by getChat and is not guessed',async()=>{
  const ok=mock()
  const result=await discoverOwnerPrivateChat(env,ok.fetcher,now)
  assert.equal(result.status,'verified')
  assert.equal(result.chatId,'123456')
  assert.equal(ok.seen.some(x=>x.includes('offset=')),false)
  assert.equal((await discoverOwnerPrivateChat(env,mock({chat:'WrongUser'}).fetcher,now)).status,'chat_identity_unverified')
  assert.equal((await discoverOwnerPrivateChat(env,mock({bot:'OtherBot'}).fetcher,now)).status,'wrong_bot')
  assert.equal((await discoverOwnerPrivateChat(env,mock({updates:[]}).fetcher,now)).status,'awaiting_new_start')
})
test('no BotFather token returns no external network call',async()=>{
  const result=await discoverOwnerPrivateChat({},async()=>assert.fail('must not fetch'),now)
  assert.equal(result.status,'token_missing')
})
