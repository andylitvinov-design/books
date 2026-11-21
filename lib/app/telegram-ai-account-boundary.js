/**
 * Telegram video consent is narrower than generic CRM chat consent.
 * The CRM bot must be the exact same verified client bot, and each video
 * order requires a current account-owned /start link plus versioned opt-in.
 * Do not fall back to a guessed username, phone, chat ID or practitioner.
 */
import 'server-only'
import {sameTelegramBotToken} from './telegram-bot-token-boundary.mjs'
import {operationHash} from './crypto.js'
import {telegramClientBotMode,telegramClientLinkReady,
 telegramPersonalVideoSendReady} from './client-telegram-policy.js'

/** No private AI queue lane may use a different CRM bot identity. */
export function aiQueueClientBotIdentityReady(env=process.env){
 if(!telegramClientLinkReady(env))return false
 const mode=telegramClientBotMode(env)
 const verified=mode==='dedicated'?env.HH_CLIENT_TG_BOT_TOKEN:
   mode==='shared_practice'?env.HH_PRACTICE_TG_BOT_TOKEN:null
 return sameTelegramBotToken(env.HH_CRM_MSG_TELEGRAM_TOKEN,verified)
}
/** Personal video additionally requires explicit delivery enablement. */
export function aiVideoBotIdentityReady(env=process.env){
 return telegramPersonalVideoSendReady(env)&&aiQueueClientBotIdentityReady(env)
}
export function aiVideoClientHash(chatId,config){
 if(!/^[1-9]\d{3,19}$/.test(String(chatId||'')))throw Error('AI_VIDEO_CHAT_INVALID')
 return operationHash({scope:'hh-client-tg-chat',chatId:String(chatId)},config)
}
export async function currentAiVideoAccount(db,config,chatId,env=process.env){
 if(!aiVideoBotIdentityReady(env))return null
 const hash=aiVideoClientHash(chatId,config)
 const rows=(await db.query('select app_private.ai_video_account_for_chat($1) as account_id',
  [hash])).rows
 return rows?.[0]?.account_id||null
}
export async function verifyAiVideoBoundAccount(db,config,thread,chatId,env=process.env){
 if(!thread?.account_id||!thread?.video_chat_hash||!aiVideoBotIdentityReady(env))return false
 const hash=aiVideoClientHash(chatId,config)
 if(thread.video_chat_hash!==hash)return false
 return await currentAiVideoAccount(db,config,chatId,env)===thread.account_id
}
