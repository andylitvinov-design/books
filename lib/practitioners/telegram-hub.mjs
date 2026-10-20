// One canonical Telegram BotFather token and numeric owner chat in Holistic House
// Vercel Production. No bot token is forwarded to GitHub Actions or AI Council.
import {createHash,timingSafeEqual} from 'node:crypto'

const EXPECTED_BOT='andydotbot',EXPECTED_OWNER='andytherapist'
const BOT_TOKEN=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const NUMERIC_CHAT=/^-?\d{1,20}$/
const MAX_REPORT=85000
export function ownerBotCredentials(env={}){
  const token=env.HH_PRACTICE_TG_BOT_TOKEN||'',chat=env.HH_PRACTICE_TG_CHAT_ID||''
  if(!BOT_TOKEN.test(token)||!NUMERIC_CHAT.test(chat))return null
  return {token,chat}
}
export function matchGatewayKey(presented,expected){
  if(typeof presented!=='string'||typeof expected!=='string'||
      presented.length<32||expected.length<32||presented.length>256||expected.length>256)
    return false
  const digest=s=>createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(presented),digest(expected))
}
export function validateGatewayPayload(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
      !Object.keys(input).every(k=>['mode','markdown','title','sources'].includes(k)))
    return 'INVALID_PAYLOAD'
  if(input.mode==='probe')return Object.keys(input).length===1?null:'INVALID_PROBE'
  if(input.mode!=='report')return 'INVALID_MODE'
  if(typeof input.markdown!=='string'||input.markdown.trim().length<3||
      input.markdown.length>MAX_REPORT)return 'INVALID_REPORT'
  if(typeof input.title!=='string'||input.title.length>120)return 'INVALID_TITLE'
  if(!Array.isArray(input.sources)||input.sources.length>6||
      input.sources.some(x=>typeof x!=='string'||x.length>100))return 'INVALID_SOURCES'
  return null
}
async function apiGet(token,method,chat,fetcher){
  const uri='https://api.telegram.org/bot'+token+'/'+method+
    (method==='getChat'?'?chat_id='+encodeURIComponent(chat):'')
  const response=await fetcher(uri,{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)
  })
  if(!response.ok)throw Error('TELEGRAM_PREFLIGHT_HTTP_'+response.status)
  const answer=await response.json().catch(()=>null)
  if(answer?.ok!==true||!answer.result)throw Error('TELEGRAM_PREFLIGHT_FAILED')
  return answer.result
}
export async function verifyOwnerTelegram(env=process.env,fetcher=fetch){
  const auth=ownerBotCredentials(env)
  if(!auth)return {configured:false,verified:false}
  const [bot,owner,webhook]=await Promise.all([
    apiGet(auth.token,'getMe',auth.chat,fetcher),
    apiGet(auth.token,'getChat',auth.chat,fetcher),
    apiGet(auth.token,'getWebhookInfo',auth.chat,fetcher),
  ])
  const botVerified=bot.is_bot===true&&
    String(bot.username||'').toLowerCase()===EXPECTED_BOT
  const chatVerified=owner.type==='private'&&
    String(owner.id||'')===String(auth.chat)&&
    String(owner.username||'').toLowerCase()===EXPECTED_OWNER
  return {configured:true,verified:botVerified&&chatVerified,
    botVerified,chatVerified,hasWebhook:Boolean(webhook.url)}
}
export async function sendOwnerDocument(payload,env=process.env,fetcher=fetch){
  if(validateGatewayPayload(payload))throw Error('TELEGRAM_PAYLOAD_INVALID')
  const auth=ownerBotCredentials(env)
  if(!auth||env.HH_PRACTICE_TG_ENABLED!=='true')
    throw Error('TELEGRAM_DISABLED')
  const identity=await verifyOwnerTelegram(env,fetcher)
  if(!identity.verified)throw Error('TELEGRAM_IDENTITY_MISMATCH')
  const form=new FormData()
  form.set('chat_id',auth.chat)
  form.set('document',new Blob([payload.markdown],{type:'text/markdown; charset=utf-8'}),
    'holistic-house-council-report.md')
  form.set('caption',('Holistic House · '+payload.title).slice(0,160)+
    '\nИсточники: '+payload.sources.join(', ').slice(0,650))
  const response=await fetcher('https://api.telegram.org/bot'+auth.token+'/sendDocument',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),body:form
  })
  if(!response.ok)throw Error('TELEGRAM_SEND_HTTP_'+response.status)
  const answer=await response.json().catch(()=>null)
  if(answer?.ok!==true||String(answer.result?.chat?.id||'')!==String(auth.chat))
    throw Error('TELEGRAM_WRONG_RECIPIENT')
  return {ok:true,accepted:true,notice:'Telegram API accepted delivery; read receipt not available'}
}
