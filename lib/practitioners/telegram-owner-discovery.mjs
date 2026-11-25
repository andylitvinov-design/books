// Official Telegram Bot API, read-only owner pairing discovery.
// Never consumes updates with offset, drops a webhook or scans unrelated chats.
const BOT_TOKEN=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const BOT='andydotbot'
const OWNER='andytherapist'
const MAX_AGE=24*60*60
async function telegramGet(token,method,params={},fetcher=fetch){
  const url=new URL('https://api.telegram.org/bot'+token+'/'+method)
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value))
  const response=await fetcher(url.toString(),{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)
  })
  if(!response.ok)throw Error('TELEGRAM_API_HTTP_'+response.status)
  const data=await response.json().catch(()=>null)
  if(data?.ok!==true||data.result===undefined)throw Error('TELEGRAM_API_INVALID')
  return data.result
}
export function findRecentOwnerStart(updates,now=new Date()){
  if(!Array.isArray(updates)||!Number.isFinite(now.getTime()))return null
  const current=Math.floor(now.getTime()/1000)
  const matches=updates.filter(x=>{
    const m=x?.message
    if(!m||m.chat?.type!=='private'||m.from?.is_bot===true)return false
    if(!/^\d+$/.test(String(m.chat.id||'')) ||
      String(m.from.id)!==String(m.chat.id))return false
    if(String(m.from.username||'').toLowerCase()!==OWNER)return false
    if(typeof m.text!=='string'||
      !/^\/start(?:@Andydotbot)?(?:\s+[A-Za-z0-9_-]{1,64})?\s*$/i.test(m.text))return false
    if(!Number.isSafeInteger(m.date)||m.date<current-MAX_AGE||m.date>current+300)return false
    return true
  })
  if(!matches.length)return null
  matches.sort((a,b)=>b.message.date-a.message.date)
  const m=matches[0].message
  return {chatId:String(m.chat.id),userId:String(m.from.id),startDate:m.date}
}
export async function discoverOwnerPrivateChat(env=process.env,fetcher=fetch,now=new Date()){
  const token=env.HH_PRACTICE_TG_BOT_TOKEN||''
  if(!BOT_TOKEN.test(token))return {status:'token_missing'}
  try{
    const me=await telegramGet(token,'getMe',{},fetcher)
    if(me.is_bot!==true||String(me.username||'').toLowerCase()!==BOT)
      return {status:'wrong_bot'}
    const hook=await telegramGet(token,'getWebhookInfo',{},fetcher)
    // GETUPDATES MUST NEVER run while ANY existing webhook is configured.
    // This workflow doesn't delete or reassign webhooks from other apps.
    if(typeof hook.url==='string'&&hook.url.trim())
      return {status:'webhook_active'}
    const updates=await telegramGet(token,'getUpdates',{limit:100,timeout:0},fetcher)
    const match=findRecentOwnerStart(updates,now)
    if(!match)return {status:'awaiting_new_start'}
    const chat=await telegramGet(token,'getChat',{chat_id:match.chatId},fetcher)
    if(chat.type!=='private'||String(chat.id)!==match.chatId||
      String(chat.username||'').toLowerCase()!==OWNER)
      return {status:'chat_identity_unverified'}
    return {status:'verified',chatId:match.chatId,userId:match.userId,
      botId:String(me.id),startDate:match.startDate}
  }catch{
    // Do not expose BotFather token, provider payload, raw updates or chat IDs.
    return {status:'telegram_unavailable'}
  }
}
