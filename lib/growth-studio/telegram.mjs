// Dedicated public-channel Telegram publisher. No client/private messages or silent reposts.
import {GrowthStudioError,publicCampaignLink,isSavedGrowthPost} from './model.mjs'

const TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,100}$/
const CHAT = /^@[A-Za-z][A-Za-z0-9_]{4,31}$|^-100\d{8,16}$/
const USERNAME = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/
const URL_PREFIX = 'https://api.telegram.org/bot'
const failure=code=>new GrowthStudioError(code)

export function telegramConfig(environment=process.env){
  const token=environment.HH_GROWTH_TELEGRAM_BOT_TOKEN
  const chatId=environment.HH_GROWTH_TELEGRAM_CHAT_ID
  const enabled=environment.HH_GROWTH_TELEGRAM_ENABLED==='true'
  const valid=enabled && typeof token==='string' && TOKEN.test(token) &&
    typeof chatId==='string' && CHAT.test(chatId)
  return valid?{token,chatId,ready:true}:{ready:false}
}
export function telegramPublicStatus(environment=process.env){
  const config=telegramConfig(environment)
  return {ready:config.ready,channel:config.ready&&config.chatId.startsWith('@')?config.chatId:null}
}
function telegramMediaType(url) {
  if (!url) return 'text'
  const path=new URL(url).pathname.toLowerCase()
  if (/\.(?:jpg|jpeg|png)$/.test(path))return 'photo'
  if (/\.mp4$/.test(path))return 'video'
  return 'unsupported'
}
export function telegramPayload(post,chatId){
  if (!isSavedGrowthPost(post)||post.brand!=='holistic_house'||post.channel!=='telegram'||
      !['approved','planned_manual'].includes(post.status)||
      typeof chatId!=='string'||!CHAT.test(chatId))throw failure('telegram_invalid_post')
  const url=publicCampaignLink(post)
  const copy=[post.caption,url].filter(Boolean).join('\n\n').trim()
  if (!copy)throw failure('telegram_invalid_post')
  const media=telegramMediaType(post.mediaUrl)
  if (media==='unsupported')throw failure('telegram_media_unsupported')
  if (media==='text'){
    if ([...copy].length>4096)throw failure('telegram_text_too_long')
    return {method:'sendMessage',body:{
      chat_id:chatId,text:copy,link_preview_options:{is_disabled:true},
    }}
  }
  // Telegram captions are shorter than regular messages: fail, never silently cut.
  if ([...copy].length>1024)throw failure('telegram_text_too_long')
  return {method:media==='photo'?'sendPhoto':'sendVideo',
    body:{chat_id:chatId,[media]:post.mediaUrl,caption:copy}}
}
function targetMatches(result,chatId) {
  const chat=result?.chat
  if (!chat || chat.type!=='channel' || !Number.isSafeInteger(result.message_id) || result.message_id<=0)return false
  if (chatId.startsWith('@'))return typeof chat.username==='string'&&
    ('@'+chat.username).toLowerCase()===chatId.toLowerCase()
  return String(chat.id)===chatId
}
// Read-only channel preflight before taking a send claim. Prevents accidental DMs.
export async function verifyTelegramChannel({environment=process.env,fetchFn=fetch}={}){
  const config=telegramConfig(environment)
  if(!config.ready)throw failure('telegram_unconfigured')
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),8000)
  try{
    const response=await fetchFn(URL_PREFIX+config.token+'/getChat',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:config.chatId}),
      credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
    })
    if(!response.ok)throw failure('telegram_channel_unverified')
    const body=await response.json()
    if(body?.ok!==true||body.result?.type!=='channel')throw failure('telegram_channel_unverified')
    const actual=body.result
    if(config.chatId.startsWith('@')){
      if(typeof actual.username!=='string'||('@'+actual.username).toLowerCase()!==config.chatId.toLowerCase())
        throw failure('telegram_channel_unverified')
    }else if(String(actual.id)!==config.chatId)throw failure('telegram_channel_unverified')
    return true
  }catch{throw failure('telegram_channel_unverified')}
  finally{clearTimeout(timeout)}
}
// No automatic retry after an unknown outcome. A transport timeout may have sent a post.
export async function sendTelegramPost(post,{environment=process.env,fetchFn=fetch}={}){
  const config=telegramConfig(environment)
  if (!config.ready)throw failure('telegram_unconfigured')
  const payload=telegramPayload(post,config.chatId)
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),12000)
  let data
  try{
    const response=await fetchFn(URL_PREFIX+config.token+'/'+payload.method,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload.body),redirect:'error',cache:'no-store',
      credentials:'omit',signal:controller.signal,
    })
    if (!response.ok)throw failure('telegram_delivery_unknown')
    data=await response.json()
  }catch{
    throw failure('telegram_delivery_unknown')
  }finally{clearTimeout(timeout)}
  if (data?.ok!==true||!targetMatches(data.result,config.chatId))
    throw failure('telegram_delivery_unknown')
  const messageId=data.result.message_id
  const handle=data.result.chat?.username
  return {
    provider:'telegram',messageId,publishedAt:new Date().toISOString(),
    ...(typeof handle==='string'&&USERNAME.test('@'+handle)
      ?{url:'https://t.me/'+handle+'/'+messageId}:{}),
  }
}
