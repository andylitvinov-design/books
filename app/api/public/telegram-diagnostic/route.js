import { NextResponse } from 'next/server'
import { channelTransportReady } from '@/lib/crm/messenger-policy'
import { telegramDiagnosticPublicUrl, telegramDaoPublicUrl } from '@/lib/crm/telegram-diagnostic.mjs'
import {telegramDirectChatPublicUrl} from '@/lib/crm/telegram-direct-chat.mjs'
import {v3CanStart,v3ServiceIntakeReady} from '@/lib/crm/telegram-ai-diagnostic-v3.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// Unauthenticated readiness contains no secrets, client identity or lead data.
// An absent flag, dedicated provider token or owner-approved public rollout
// means NO public handoff, rather than a broken chatbot link.
export async function GET(){
  const env=process.env
  const available=channelTransportReady('telegram',env)
  // Advertise the human-first route only after the signed Business intake is enabled.
  // This is server configuration, not proof of a physical provider reply.
  const businessAutoReplyAvailable=available&&env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED==='true'
  const urls=available ? Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,telegramDiagnosticPublicUrl(locale,env)])) : null
  const daoUrls=available ? Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,telegramDaoPublicUrl(locale,env)])) : null
  const daoReady=!!(daoUrls?.en&&daoUrls?.ru&&daoUrls?.es)
  // Direct messages are a distinct opt-in route, not the longer six-step
  // diagnostic. It is advertised only after explicitly activated.
  const directUrls=available ? Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,telegramDirectChatPublicUrl(locale,env)])) : null
  return NextResponse.json(available&&urls?.en&&urls?.ru&&urls?.es
    ? {available:true,url:urls.en.split('?')[0],urls,
       ...(daoReady?{daoUrls}:{}),
       aiInterviewAvailable:env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'&&v3CanStart(env),
       serviceInterviewAvailable:v3ServiceIntakeReady(env),
       businessAutoReplyAvailable,
       directAvailable:!!(directUrls?.en&&directUrls?.ru&&directUrls?.es),
       ...(directUrls?.en&&directUrls?.ru&&directUrls?.es?{directUrls}:{})}
    : {available:false,directAvailable:false,businessAutoReplyAvailable:false},
  {headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}})
}
