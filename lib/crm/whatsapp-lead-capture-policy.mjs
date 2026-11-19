// Eligibility only. The caller must verify Meta's webhook HMAC before use.
// No customer text, photo, link token or marketing consent is persisted here.
const STOP=/^(?:\/?stop|стоп|остановить|parar|detener|unsubscribe|отписаться)$/iu;
export function whatsappCrmInboundCandidate(event,env=process.env,now=Date.now()){
  if(event?.type!=='incoming'||event.stop===true||
    STOP.test(String(event.rawText||'').trim())||
    !/^[1-9][0-9]{7,14}$/.test(String(event.userId||''))||
    !/^wa:[A-Za-z0-9._:=+/-]{10,256}$/.test(String(event.eventId||''))||
    !/^wa:[A-Za-z0-9._:=+/-]{10,256}$/.test(String(event.messageId||''))||
    !/^\d{5,25}$/.test(String(event.accountId||''))||
    String(event.accountId)!==String(env.HH_CRM_MSG_WHATSAPP_PHONE_ID||'')||
    !Number.isSafeInteger(event.sentAt))return false;
  const age=now-event.sentAt;
  // Meta can retry delayed signed events. Capture old but valid enquiries;
  // the separate CRM reply policy still enforces the 23-hour service window.
  return age>=-60_000&&age<7*24*60*60_000;
}
