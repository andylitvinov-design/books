// Pure admission contract. The call site is the already signed Meta webhook.
// Never archive customer data without one-time CRM/reply consent in the
// owner-scoped database RPC; this function only validates provider metadata.
export function whatsappAliReplyArchiveCandidate(event,text,providerId,env=process.env){
 if(event?.type!=='incoming'||event.stop===true||
   String(event.accountId)!==String(env.HH_CRM_MSG_WHATSAPP_PHONE_ID||'')||
   !/^[0-9]{5,25}$/.test(String(event.accountId||''))||
   !/^[1-9][0-9]{7,14}$/.test(String(event.userId||''))||
   typeof text!=='string'||!text.trim()||text.length>1200||
   !/^[A-Za-z0-9._:=+/-]{10,512}$/.test(String(providerId||'')))
   return false
 return true
}
