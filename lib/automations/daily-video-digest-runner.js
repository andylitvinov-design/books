import 'server-only';
import {getAppConfig} from '../app/config.js';
import {transaction} from '../app/database.js';
import {resolvedOwnerTelegramEnv} from '../practitioners/telegram-owner-pairing.js';
import {practiceTelegramConfigured,telegramSendMessage} from '../practitioners/daily-telegram-transport.mjs';
import {latestScoutSlot} from './video-scout.mjs';
import {videoDigestDue,formatVideoDigestMessage} from './daily-video-digest.mjs';
import {claimDailyVideoDigest,readVideoDigestStats,settleDailyVideoDigest}
 from './daily-video-digest-store.mjs';

/** At-most-once owner-only Telegram summary, OFF until an explicit server flag+task gate. */
export async function runDailyVideoDigest({config=getAppConfig(),env=process.env,
  now=new Date(),fetcher=fetch}={}){
  if(env.VERCEL_ENV!=='production'||env.HH_VIDEO_SCOUT_DIGEST_ENABLED!=='true')
    return {status:'disabled'};
  const slotUtc=latestScoutSlot(now);
  if(!videoDigestDue(slotUtc))return {status:'not_due'};
  const recipient=await resolvedOwnerTelegramEnv(config,env);
  if(!practiceTelegramConfigured(recipient))return {status:'recipient_not_configured'};
  const claim=await transaction(config,null,db=>claimDailyVideoDigest(db,slotUtc),{server:true});
  if(!claim.claimed)return {status:claim.status};
  try{
    const stats=await transaction(config,null,readVideoDigestStats,{server:true});
    const message=formatVideoDigestMessage(stats,{date:now});
    // Single unrepeatable attempt. Never automatically resend after any ambiguous error.
    await telegramSendMessage(message,recipient,fetcher);
    try{return await transaction(config,null,db=>settleDailyVideoDigest(db,claim,{accepted:true}),{server:true});}
    catch{return {status:'unconfirmed',reason:'SENT_BUT_RECEIPT_UNAVAILABLE'};}
  }catch{
    try{await transaction(config,null,db=>settleDailyVideoDigest(db,claim,{accepted:false,
      error:'TELEGRAM_DELIVERY_UNCONFIRMED'}),{server:true});}
    catch{return {status:'unconfirmed',reason:'FAILED_RECEIPT_UNAVAILABLE'};}
    return {status:'failed',reason:'OWNER_DIGEST_NOT_CONFIRMED'};
  }
}
