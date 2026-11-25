// Pure admission policy for WhatsApp's manual-reply pause. The webhook must
// verify Meta HMAC before invoking the server-side owner/CRM lookup.
// STOP must continue to the existing suppression workflow, not be swallowed.
const STOP=/^(?:\/?stop|стоп|остановить|parar|detener|unsubscribe|отписаться)$/iu;
export function whatsappHumanTakeoverCandidate(event,env=process.env,now=Date.now()){
  if(event?.type!=='incoming'||event.stop===true||
     STOP.test(String(event.rawText||'').trim())||
     !/^[1-9][0-9]{7,14}$/.test(String(event.userId||''))||
     !/^\d{5,25}$/.test(String(event.accountId||''))||
     String(event.accountId)!==String(env.HH_CRM_MSG_WHATSAPP_PHONE_ID||'')||
     !/^wa:[A-Za-z0-9._:=+/-]{10,256}$/.test(String(event.eventId||''))||
     !Number.isSafeInteger(event.sentAt))return false;
  return Math.abs(now-event.sentAt)<=10*60_000;
}
