// Eligibility only. No customer text, identifiers or consent inferred from a message.
const OPT_OUT=/^(?:\/(?:stop|unsubscribe|unsubnews|cancel)(?:@[a-z0-9_]+)?|stop|стоп|отписаться от новостей|unsubscribe from updates|cancelar noticias)$/i;
export function telegramLeadMessageEligible(text,stopped=false){
  return !stopped&&!OPT_OUT.test(String(text||'').trim());
}
export function telegramBotLeadCandidate(event){
  return event?.type==='incoming'&&!event.callbackId&&
    /^\d{1,25}$/.test(String(event.userId||''))&&
    telegramLeadMessageEligible(event.rawText,event.stop===true);
}
export function telegramBusinessLeadCandidate(update,now=Date.now()){
  const m=update?.business_message;
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||
    !m||m.chat?.type!=='private'||!Number.isSafeInteger(m.chat?.id)||
    m.chat.id<1||!Number.isSafeInteger(m.from?.id)||m.from.id!==m.chat.id||
    m.from.is_bot!==false||m.sender_business_bot!=null||m.forward_origin!=null||
    m.is_automatic_forward===true||!Number.isSafeInteger(m.message_id)||
    m.message_id<1||!Number.isSafeInteger(m.date))return null;
  const age=now-m.date*1000;
  if(age< -300000||age>=23*60*60*1000)return null;
  const id=m.business_connection_id;
  if(typeof id!=='string'||id.length<4||id.length>256||
    /[\s\u0000-\u001f]/.test(id))return null;
  const original=typeof m.text==='string'?m.text:
    typeof m.caption==='string'?m.caption:'';
  if(original.length>4096)return null;
  // A sticker, symbol, location, caption or voice note is still one signed
  // inbound message. Keep only neutral metadata until explicit chat consent.
  const media=Boolean(m.voice||m.photo||m.document||m.video_note||m.audio||
    m.sticker||m.video||m.animation||m.contact||m.location||m.venue||m.poll||m.dice);
  if(!original&&!media)return null;
  if(!telegramLeadMessageEligible(original))return null;
  return {connectionId:id,chatId:String(m.chat.id),
    text:original.slice(0,800),updateId:update.update_id,messageId:m.message_id};
}

/**
 * A signed Telegram customer message must reach its normal reply handler even
 * when optional CRM first-contact capture is unavailable (e.g. missing role
 * privileges). Never claim a lead was saved on failure. Do not expose the
 * underlying DB error, message, user ID or webhook secret in logs.
 */
export async function captureTelegramLeadBestEffort(capture,onFailure){
 try{return await capture()}
 catch{
  try{onFailure?.()}catch{}
  return {created:false,unavailable:true}
 }
}
