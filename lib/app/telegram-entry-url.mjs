import {parseTelegramServiceDraft,telegramBusinessStrategyRequestUrl} from '../assist/telegram-business-request.mjs'
import {WHATSAPP_NUMBER} from '../whatsapp-enquiry.js'
// Safe first-party public Telegram entry selection. A bot link is an INVITATION
// to verify through Telegram; it is never itself login, consent or CRM identity.
const LOCALES=new Set(['en','ru','es'])
// Distinct from Telegram Business AI-secretary PRODUCT: the signed V3 bot
// recognizes exactly these five service codes, never ai_secretary.
const V3_SERVICES=new Set(['homeopathy','coaching','reiki','constellations','business'])
export function resolveTelegramFirstEntry(payload,locale){
 if(!LOCALES.has(locale)||!payload||typeof payload!=='object')return null
 const direct=payload.directAvailable===true
 if(!direct&&payload.available!==true)return null
 const raw=direct?payload.directUrls?.[locale]:payload.urls?.[locale]
 if(typeof raw!=='string'||raw.length>250)return null
 try{
  const url=new URL(raw)
  const bot=url.pathname.slice(1)
  const canonical=new URL(payload.url)
  const expected=(direct?'hhtalk_':'hhreview_')+locale
  if(url.origin!=='https://t.me'||canonical.origin!=='https://t.me'||
      canonical.pathname!==url.pathname||canonical.search||canonical.hash||
      canonical.username||canonical.password||!/^\/[A-Za-z0-9_]{5,32}$/.test(url.pathname)||
      !/bot$/i.test(bot)||url.username||url.password||url.hash||
      [...url.searchParams.keys()].length!==1||url.searchParams.get('start')!==expected)
    return null
  return {href:url.href,kind:direct?'direct':'review'}
 }catch{return null}
}

/** Only a trusted public service marker may request a bot readiness lookup. */
export function isTelegramServiceDraft(raw,locale){
 if(!LOCALES.has(locale)||typeof raw!=='string'||raw.length>850)return false;
 try{
  const url=new URL(raw);
  if(url.origin!=='https://t.me'||url.pathname!=='/holistichouse'||
     url.username||url.password||url.hash||
     [...url.searchParams.keys()].length!==1||!url.searchParams.has('text'))return false;
  const selected=parseTelegramServiceDraft(url.searchParams.get('text'));
  return !!selected&&selected.locale===locale&&V3_SERVICES.has(selected.service);
 }catch{return false}
}

/** A first-party handoff route eliminates the asynchronous first-click race. */
export function resolveTelegramServiceHandoffUrl(raw,locale){
 if(!isTelegramServiceDraft(raw,locale))return null;
 // Only the exact public business-page title, never arbitrary user input,
 // can request this public offer code. Reconstruct it on the server.
 if(raw===telegramBusinessStrategyRequestUrl(locale))
  return '/api/public/telegram-service-entry?service=business&locale='+locale+'&offer=business_strategy';
 try{
  const selected=parseTelegramServiceDraft(new URL(raw).searchParams.get('text'));
  return selected?'/api/public/telegram-service-entry?service='+selected.service+'&locale='+locale:null;
 }catch{return null}
}

/** Preserve the manual request unless the existing signed Telegram V3 bot is ready.
 * Only fixed public service codes may enter the URL; no client data.
 */
export function resolveTelegramServiceEntry(payload,telegramUrl,locale,offer=null){
 if(!LOCALES.has(locale)||payload?.available!==true||
    !(payload?.serviceInterviewAvailable===true||payload?.aiInterviewAvailable===true)||
    !isTelegramServiceDraft(telegramUrl,locale))return null
 try{
  const human=new URL(telegramUrl)
  if(human.origin!=='https://t.me'||human.pathname!=='/holistichouse'||
     human.username||human.password||human.hash||
     [...human.searchParams.keys()].length!==1||!human.searchParams.has('text'))return null
  const selected=parseTelegramServiceDraft(human.searchParams.get('text'))
  if(!selected||selected.locale!==locale)return null
  const bot=new URL(payload.url)
  if(bot.origin!=='https://t.me'||bot.search||bot.hash||bot.username||bot.password||
     !/^\/[A-Za-z0-9_]{5,32}$/.test(bot.pathname)||!/bot$/i.test(bot.pathname))return null
  const variant=offer==='business_strategy'&&selected.service==='business'&&
    telegramUrl===telegramBusinessStrategyRequestUrl(locale)?'business_strategy':null;
  if(offer!==null&&!variant)return null;
  return {href:bot.href+'?start=hhservice_'+(variant||selected.service)+'_'+selected.locale,kind:'service'}
 }catch{return null}
}

/** Only the canonical public free-review page may use the generic hhreview
 * bot. Unrecognized paid service enquiries remain human-channel drafts.
 * This reads a page marker, never treats it as provider identity proof.
 */
export function isOfficialFreeReviewWhatsAppDraft(raw,locale){
 if(!LOCALES.has(locale)||typeof raw!=='string'||raw.length>4000)return false;
 try{
  const url=new URL(raw);
  if(url.origin!=='https://wa.me'||url.pathname!=='/'+WHATSAPP_NUMBER||
    url.username||url.password||url.hash||!url.searchParams.has('text'))return false;
  const message=url.searchParams.get('text')||'';
  const marker={en:'Page',ru:'Страница',es:'Página'}[locale];
  const page='https://holistichouse.vercel.app/'+locale+'/services/free-situation-review';
  return message.split(/\r?\n/).includes(marker+': '+page);
 }catch{return false;}
}
