/**
 * Ali's signed cross-channel review linking is opt-in. The client must type
 * /link HH-... in the verified official Telegram bot AFTER approved Free
 * Diagnostic Send. Source/reference text does not verify Telegram identity.
 */
export const ALI_VERIFIED_REVIEW_LINK_VERSION='ali-tg-business-link-v1';
const REF=/^HH-[A-F0-9]{12}$/;
const MATCH=/^\/link\s+(HH-[A-F0-9]{12})$/i;
export function aliBusinessLinkReference(value){
 if(typeof value!=='string'||value.length>80)return null;
 const ref=MATCH.exec(value.trim())?.[1]?.toUpperCase();
 return ref&&REF.test(ref)?ref:null;
}
export function aliBusinessLinkCopy(locale='en',status='unverified',ref=null){
 const l=['ru','en','es'].includes(locale)?locale:'en';
 if(status==='linked'&&typeof ref==='string'&&REF.test(ref)){
   return l==='ru'?'Подтверждено. Диагностический разбор связан с вашим запросом '+ref+
     '. Специалист увидит номер связи в защищённой переписке.':
     l==='es'?'Confirmado. La revisión está vinculada a tu solicitud '+ref+
       '. El profesional verá la referencia en su conversación privada.':
       'Confirmed. Your diagnostic review is linked to your request '+ref+
       '. The practitioner can see the reference in the protected conversation.';
 }
 if(status==='already'&&typeof ref==='string'&&REF.test(ref)){
   return l==='ru'?'Этот разбор уже связан с вашим запросом '+ref+'.':
     l==='es'?'Esta revisión ya está vinculada a tu solicitud '+ref+'.':
     'This review is already linked to your request '+ref+'.';
 }
 if(status==='other'){
   return l==='ru'?'Этот разбор уже связан с другой подтверждённой заявкой. Для исправления обратитесь к специалисту.':
     l==='es'?'Esta revisión ya está vinculada a otra solicitud confirmada. Contacta al profesional para corregirlo.':
       'This review is already linked to another confirmed request. Please contact the practitioner to correct it.';
 }
 if(status==='format'){
   return l==='ru'?'Укажите команду полностью: /link HH-XXXXXXXXXXXX (номер вашей заявки).':
     l==='es'?'Escribe el comando completo: /link HH-XXXXXXXXXXXX (referencia de tu solicitud).':
       'Use the full command: /link HH-XXXXXXXXXXXX (your request reference).';
 }
 return l==='ru'?'Не удалось подтвердить связь с этой заявкой. Проверьте номер и используйте тот же Telegram-аккаунт, с которого вы оформляли заказ.':
   l==='es'?'No pude confirmar el vínculo. Comprueba la referencia y usa la misma cuenta de Telegram que hizo la solicitud.':
     "I couldn't verify the link. Check the reference and use the same Telegram account that sent the original request.";
}
