import { NextResponse } from 'next/server'
import { channelTransportReady } from '@/lib/crm/messenger-policy'
import { telegramDiagnosticPublicUrl, telegramDaoPublicUrl } from '@/lib/crm/telegram-diagnostic.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// Unauthenticated readiness contains no secrets, client identity or lead data.
// An absent flag, dedicated provider token or owner-approved public rollout
// means NO public handoff, rather than a broken chatbot link.
export async function GET(){
  const env=process.env
  const available=channelTransportReady('telegram',env)
  const urls=available ? Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,telegramDiagnosticPublicUrl(locale,env)])) : null
  const daoUrls=available ? Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,telegramDaoPublicUrl(locale,env)])) : null
  return NextResponse.json(available&&urls?.en&&urls?.ru&&urls?.es&&
      daoUrls?.en&&daoUrls?.ru&&daoUrls?.es
    ? {available:true,url:urls.en.split('?')[0],urls,daoUrls}
    : {available:false},
  {headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}})
}
