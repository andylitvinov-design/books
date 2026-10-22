'use server'

import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {ensureOwnerTelegramPairing} from '@/lib/practitioners/telegram-owner-pairing'
import {sendOwnerTelegramTest} from '@/lib/practitioners/telegram-owner-setup'
import {deliverArchivedCouncilReports} from '@/lib/practitioners/council-telegram-delivery'
import {resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'
import {
  resolvedOwnerAiEnvironment,confirmOwnerGeminiFreeTier,
  saveOwnerMistralFreeKey,disableOwnerFreeModel
} from '@/lib/practitioners/owner-ai-provider-settings'

const allow=new Set([
  'accepted','already_accepted','paired','already_configured',
  'token_missing','wrong_bot','webhook_active','awaiting_new_start',
  'chat_identity_unverified','telegram_unavailable','identity_unavailable',
  'identity_mismatch','not_paired','sender_disabled',
  'uncertain_previously_attempted','delivery_unconfirmed','already_started',
  'setup_unavailable',
  'council_sent','council_duplicate','council_missing_keys',
  'council_no_archive','council_not_paired','council_unavailable',
  'gemini_free_saved','mistral_free_saved','gemini_disabled','mistral_disabled',
  'free_setup_confirmation_required','free_setup_invalid_key',
  'free_setup_unavailable'
])
const destination=status=>'/admin/telegram-setup?result='+
  encodeURIComponent(allow.has(status)?status:'setup_unavailable')

// Next.js Server Actions automatically require the same origin (Origin vs Host).
// The admin signed HttpOnly session is checked *again* at the mutation boundary.
// No user-submitted chat IDs, bot tokens, or other request parameters are accepted.
export async function connectAndTestTelegramAction(){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(process.env.VERCEL_ENV==='preview')redirect(destination('setup_unavailable'))
  let outcome='setup_unavailable'
  try{
    const config=getAppConfig()
    const verified=await ensureOwnerTelegramPairing(config)
    if(verified.status==='paired'||verified.status==='already_configured'){
      const tested=await sendOwnerTelegramTest(config)
      outcome=tested.status
    }else outcome=verified.status
  }catch{
    outcome='setup_unavailable'
  }finally{
    await closeDatabase().catch(()=>{})
  }
  redirect(destination(outcome))
}

// A safe retryable preflight. No Telegram message is sent by this action.
export async function checkTelegramConnectionAction(){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(process.env.VERCEL_ENV==='preview')redirect(destination('setup_unavailable'))
  let outcome='setup_unavailable'
  try{
    const config=getAppConfig()
    const verified=await ensureOwnerTelegramPairing(config)
    outcome=verified.status
  }catch{outcome='setup_unavailable'}
  finally{await closeDatabase().catch(()=>{})}
  redirect(destination(outcome))
}

// Explicit owner-only on-demand delivery. Uses the SAME per-day claim/receipt
// as the scheduled Council cron: no duplicate Telegram messages or AI calls.
export async function sendDailyCouncilReportAction(){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(process.env.VERCEL_ENV==='preview')redirect(destination('council_unavailable'))
  let outcome='council_unavailable'
  try{
    const config=getAppConfig()
    const env=await resolvedOwnerTelegramEnv(config)
    // A verified ChatGPT daily report can be sent without any AI-provider
    // credentials; independent model inference is still free-mode gated.
    if(!env.HH_PRACTICE_TG_CHAT_ID)
      outcome='council_not_paired'
    else{
      const aiEnv=await resolvedOwnerAiEnvironment(config,env)
      const result=await deliverArchivedCouncilReports(config,{env:aiEnv})
      if(result.status==='accepted')outcome='council_sent'
      else if(result.status==='already_claimed')outcome='council_duplicate'
      else if(result.status==='no_archived_reports'||result.status==='model_setup_required')
        outcome='council_no_archive'
    }
  }catch{outcome='council_unavailable'}
  finally{await closeDatabase().catch(()=>{})}
  redirect(destination(outcome))
}


// One signed, admin-only, same-origin mobile form replaces owner-managed
// Vercel flag editing. It stores *explicit* Free Tier/Free mode consent.
// No provider inference, paid request, Bot API send or new bot occurs here.
export async function saveOwnerFreeProviderAction(formData){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(process.env.VERCEL_ENV==='preview')redirect(destination('free_setup_unavailable'))
  const provider=formData?.get('provider')
  const free=formData?.get('free_confirmed')==='yes'
  const unpaid=formData?.get('no_paid_billing')==='yes'
  if(!free||!unpaid||!['gemini','mistral'].includes(provider))
    redirect(destination('free_setup_confirmation_required'))
  let outcome='free_setup_unavailable'
  try{
    const config=getAppConfig()
    if(provider==='gemini'){
      outcome=(await confirmOwnerGeminiFreeTier(config)).status==='gemini_confirmed'
        ?'gemini_free_saved':'free_setup_unavailable'
    }else{
      const key=formData.get('mistral_key')
      const saved=await saveOwnerMistralFreeKey(config,key)
      outcome=saved.status==='mistral_saved'?'mistral_free_saved':'free_setup_invalid_key'
    }
  }catch{
    outcome='free_setup_unavailable'
  }finally{
    await closeDatabase().catch(()=>{})
  }
  redirect(destination(outcome))
}
export async function disableOwnerFreeProviderAction(formData){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(process.env.VERCEL_ENV==='preview')redirect(destination('free_setup_unavailable'))
  let outcome='free_setup_unavailable'
  const provider=formData?.get('provider')
  try{
    if(['gemini','mistral'].includes(provider)){
      outcome=(await disableOwnerFreeModel(getAppConfig(),provider)).status
    }
  }catch{
    outcome='free_setup_unavailable'
  }finally{
    await closeDatabase().catch(()=>{})
  }
  redirect(destination(outcome))
}
