// Server-only use: pure transport adapter for tests, never import from client UI.
// The recipient is configured in protected server environment, never in request body.
const BOT_RE=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const CHAT_RE=/^-?\d{1,20}$/
export function practiceTelegramConfigured(env={}){
  return env.HH_PRACTICE_TG_ENABLED==='true'&&
    BOT_RE.test(env.HH_PRACTICE_TG_BOT_TOKEN||'')&&
    CHAT_RE.test(env.HH_PRACTICE_TG_CHAT_ID||'')
}
export async function telegramSendMessage(message,env={},fetcher=fetch){
  if(!practiceTelegramConfigured(env))throw Error('TELEGRAM_NOT_CONFIGURED')
  if(typeof message!=='string'||!message||message.length>3900)throw Error('DIGEST_INVALID')
  const response=await fetcher('https://api.telegram.org/bot'+env.HH_PRACTICE_TG_BOT_TOKEN+'/sendMessage',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:env.HH_PRACTICE_TG_CHAT_ID,text:message,
      disable_web_page_preview:true}),
  })
  if(!response.ok)throw Error('TELEGRAM_HTTP_'+response.status)
  const data=await response.json().catch(()=>null)
  if(!data||data.ok!==true||
      String(data.result?.chat?.id||'')!==String(env.HH_PRACTICE_TG_CHAT_ID))
    throw Error('TELEGRAM_NOT_ACCEPTED')
  return true
}
