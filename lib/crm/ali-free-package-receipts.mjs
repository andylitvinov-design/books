import {createHmac} from 'node:crypto';
/**
 * Signed, consent-gated Ali Free Diagnostic package receipts.
 * Pure local decisions. Owner-facing events contain only neutral stage
 * codes, never customer answers, image bytes or Telegram identifiers.
 */
export const ALI_FREE_PACKAGE_VERSION='ali-free-package-v1';
export const FREE_MEDIA_BYTES=5*1024*1024;
export function freePackageCaseReference(contextId,config){
 if(typeof contextId!=='string'||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(contextId)||
    !Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
   throw new Error('FREE_CASE_REFERENCE_UNAVAILABLE');
 return 'FR-'+createHmac('sha256',config.encryptionKey)
   .update('ali-free-owner-case:'+contextId).digest('hex').slice(0,10).toUpperCase();
}
const FILE_ID=/^[A-Za-z0-9_-]{10,256}$/;
const PHOTO_STEPS=new Set(['portrait','drawing']);
const RECEIPT_STATES=new Set(['received','skipped']);
const CODE=new Set(['answers','goal','challenge','situation','impact','attempts','support','portrait','drawing','portrait_skipped','drawing_skipped','form_pending','form','complete']);
const LANG=new Set(['ru','en','es']);
const COPY={
 ru:{
  portrait:'Ответы сохранились в защищённой беседе. По желанию пришлите одно личное фото до 5 МБ для вашего индивидуального разбора. Оно не используется для определения здоровья или характера. Если не хотите — нажмите «Пропустить фото».',
  drawing:'Спасибо. Теперь нарисуйте, пожалуйста, от руки небольшую схему «Я — цель — вызов» и пришлите её фото (до 5 МБ). Если вы не готовы, можно пропустить этот шаг.',
  portraitAccepted:'Личное фото проверено и сохранено. Спасибо!',
  drawingAccepted:'Фото рисунка проверено и сохранено. Спасибо!',
  portraitSkipped:'Хорошо, личное фото пропустим.',
  drawingSkipped:'Хорошо, рисунок пропустим.',
  portraitRetry:'Не удалось подтвердить получение личного фото. Пожалуйста, отправьте ещё раз изображение JPG/PNG до 5 МБ или выберите «Пропустить фото».',
  drawingRetry:'Не удалось подтвердить получение фото рисунка. Попробуйте отправить изображение JPG/PNG до 5 МБ ещё раз или выберите «Пропустить рисунок».',
  verifying:'Проверяю полученное изображение. Пожалуйста, дождитесь подтверждения перед следующим шагом.',
  review:'Материалы учтены. Теперь можно проверить резюме и подтвердить передачу запроса мастеру. Нажмите «Завершить интервью».',
  missingAnswers:'Пока не хватает описания вашей ситуации. Можно рассказать своими словами, что важно, или завершить позже.',
  pendingForm:'Запрос записан. Для полного комплекта ещё нужна коучинговая анкета. Откройте защищённую ссылку и нажмите «Отправить ответы» после заполнения. Если ссылка устарела — напишите /form.',
  formAccepted:'Коучинговая анкета проверена и сохранена. Спасибо! Остался последний шаг — личное фото, если хотите его приложить.',
  completed:'Спасибо! Все этапы учтены в CRM; пропущенные материалы отмечены отдельно.',
  formRetry:'Анкета пока не подтверждена. Проверьте, нажали ли «Отправить ответы». Если ссылка устарела, напишите /form, и я выдам новую.',
  received:'получено',missing:'не получено',skipped:'пропущено',
  headings:{answers:'Цель · вызов · ситуация',drawing:'Фото схемы от руки',portrait:'Личное фото',form:'Коучинг-анкета',handoff:'Запрос передан мастеру'},
  label:'Состояние материалов для бесплатного разбора:',
  owner:{answers:'ответы на диагностические вопросы',goal:'цель',challenge:'трудность',situation:'текущая ситуация',impact:'влияние на жизнь',attempts:'предыдущие попытки',support:'источники поддержки',portrait:'личное фото',drawing:'фото схемы',form:'ответы коучинговой анкеты'}
 },
 en:{
  portrait:"Your answers are stored in the protected conversation. If you'd like, send one personal photo (JPG/PNG, under 5 MB) for your personal review. A photo cannot establish your health or personality. You can choose “Skip photo”.",
  drawing:'Thank you. Please draw a simple hand-made “Me — Goal — Challenge” sketch and send a photo (under 5 MB). You can skip if you prefer.',
  portraitAccepted:'Your personal photo has been verified and saved. Thank you!',
  drawingAccepted:'Your drawing photo has been verified and saved. Thank you!',
  portraitSkipped:"Of course, we'll skip the personal photo.",
  drawingSkipped:"Of course, we'll skip the drawing.",
  portraitRetry:"I couldn't confirm receipt of your photo. Please resend a JPG/PNG image under 5 MB, or choose “Skip photo”.",
  drawingRetry:"I couldn't confirm receipt of your drawing. Please resend a JPG/PNG image under 5 MB, or choose “Skip drawing”.",
  verifying:'I am checking the image. Please wait for confirmation before the next step.',
  review:'The materials are accounted for. You can now review your summary and approve sending the request. Choose “Finish interview”.',
  missingAnswers:"I don't yet have a description of your situation. You can tell me what's important in your own words, or finish later.",
  pendingForm:"Your request is saved. The coaching questionnaire is still missing from the package. Open the secure link and press “Send answers” when finished. If it expires, send /form for a fresh link.",
  formAccepted:'Your coaching questionnaire has been verified and saved. Thank you! One final optional step is your personal photo.',
  completed:'Thank you! All stages are recorded in the protected CRM, with any skipped items clearly marked.',
  formRetry:"I can't confirm the questionnaire yet. Please check whether you pressed “Send answers”. If the link expired, send /form for a new one.",
  received:'received',missing:'not received',skipped:'skipped',
  headings:{answers:'Goal · challenge · situation',drawing:'Hand-drawn sketch photo',portrait:'Personal photo',form:'Coaching questionnaire',handoff:'Request sent to practitioner'},
  label:'Free review package status:',
  owner:{answers:'diagnostic answers',goal:'desired outcome',challenge:'obstacle',situation:'current situation',impact:'daily impact',attempts:'previous attempts',support:'available support',portrait:'personal photo',drawing:'drawing photo',form:'coaching questionnaire'}
 },
 es:{
  portrait:'Tus respuestas están guardadas. Si quieres, envía una foto personal JPG/PNG de menos de 5 MB para la revisión individual. La imagen no sirve para determinar tu salud ni personalidad. Puedes elegir «Omitir foto».',
  drawing:'Gracias. Si quieres, dibuja a mano «Yo — Meta — Reto» y envía una foto (menos de 5 MB). También puedes omitirlo.',
  portraitAccepted:'La foto personal se ha comprobado y guardado. ¡Gracias!',
  drawingAccepted:'La foto del dibujo se ha comprobado y guardado. ¡Gracias!',
  portraitSkipped:'De acuerdo, omitimos la foto personal.',
  drawingSkipped:'De acuerdo, omitimos el dibujo.',
  portraitRetry:'No pude confirmar la foto personal. Envíala otra vez como JPG/PNG de menos de 5 MB o pulsa «Omitir foto».',
  drawingRetry:'No pude confirmar la foto del dibujo. Envíala de nuevo como JPG/PNG de menos de 5 MB o pulsa «Omitir dibujo».',
  verifying:'Estoy comprobando la imagen. Espera a la confirmación antes de continuar.',
  review:'Los materiales están registrados. Ahora puedes revisar tu resumen. Pulsa «Terminar entrevista».',
  missingAnswers:'Aún falta una descripción de la situación. Cuéntame lo más importante con tus palabras.',
  pendingForm:'La solicitud se ha guardado. Falta el formulario de coaching. Ábrelo, complétalo y pulsa «Enviar respuestas». Si caduca, escribe /form.',
  formAccepted:'El formulario se ha comprobado y guardado. ¡Gracias! Solo queda la foto personal, si deseas compartirla.',
  completed:'¡Gracias! Todas las etapas están registradas en el CRM y las omisiones están indicadas.',
  formRetry:'Todavía no puedo confirmar el formulario. Comprueba si pulsaste «Enviar respuestas»; envía /form para renovar el enlace.',
  received:'recibido',missing:'no recibido',skipped:'omitido',
  headings:{answers:'Meta · reto · situación',drawing:'Foto del dibujo a mano',portrait:'Foto personal',form:'Formulario de coaching',handoff:'Solicitud enviada al profesional'},
  label:'Estado de materiales para la revisión:',
  owner:{answers:'respuestas del diagnóstico',goal:'objetivo',challenge:'dificultad',situation:'situación actual',impact:'efectos',attempts:'intentos previos',support:'apoyos',portrait:'foto personal',drawing:'dibujo',form:'formulario de coaching'}
 }
};
const local=locale=>LANG.has(locale)?locale:'en';
export const freePackageCopy=(locale='en')=>COPY[local(locale)];
export function validFreeMedia(event){
 return typeof event?.photoFileId==='string'&&FILE_ID.test(event.photoFileId)&&
  (event.photoBytes==null||(Number.isSafeInteger(event.photoBytes)&&
    event.photoBytes>0&&event.photoBytes<=FREE_MEDIA_BYTES))&&
  typeof event?.messageId==='string'&&event.messageId.length>=8&&
  event.messageId.length<=180;
}
export function safeFreeMediaReceipt({fileId,bytes,messageId}={}){
 if(!FILE_ID.test(String(fileId||''))||!Number.isSafeInteger(bytes)||
   bytes<=0||bytes>FREE_MEDIA_BYTES||typeof messageId!=='string'||
   messageId.length<8||messageId.length>180)return null;
 return {status:'received',fileId,bytes,messageId};
}
export function acceptedFreeMedia(ctx,step,proof){
 if(!PHOTO_STEPS.has(step)||!proof)return null;
 const receipts={...(ctx.mediaReceipts||{}),[step]:proof};
 return {...ctx,mediaReceipts:receipts,
   mediaStep:step==='drawing'?'review':ctx.formReceipt?.status==='received'?'complete':'review',
   mediaPending:null};
}
export function skippedFreeMedia(ctx,step){
 if(!PHOTO_STEPS.has(step))return null;
 return {...ctx,mediaReceipts:{...(ctx.mediaReceipts||{}),[step]:{status:'skipped'}},
   mediaStep:step==='drawing'?'review':ctx.formReceipt?.status==='received'?'complete':'review',mediaPending:null};
}
/** A summary never counts as all three required client-authored answers. */
export function freeMissingCoreAnswers(ctx={}){
 const slots=ctx?.intakeSlots||{};
 return ['goal','challenge','situation'].filter(key=>
   typeof slots[key]!=='string'||slots[key].trim().length<2);
}
export function freeCoreAnswersReady(ctx={}){return freeMissingCoreAnswers(ctx).length===0;}
export function freeCoreQuestion(ctx={},locale='en'){
 const missing=freeMissingCoreAnswers(ctx)[0];
 if(!missing)return null;
 const questions={
   ru:{goal:'Спасибо! Что именно вы хотели бы изменить или понять?',
     challenge:'Что сейчас мешает вам приблизиться к этой цели?',
     situation:'Что происходит сейчас и как давно это началось?'},
   en:{goal:'Thank you. What would you most like to change or understand?',
     challenge:'What is making that goal difficult right now?',
     situation:'What is happening now, and when did it start?'},
   es:{goal:'Gracias. ¿Qué te gustaría comprender o cambiar?',
     challenge:'¿Qué te dificulta avanzar hacia esa meta?',
     situation:'¿Qué ocurre ahora y cuándo empezó?'}
 };
 return questions[local(locale)][missing];
}
export function reviewPackageStatus(ctx={}){
 const slots=ctx.intakeSlots||{};
 const answers=['goal','challenge','situation'].every(key=>
   typeof slots[key]==='string'&&slots[key].trim().length>=2);
 const photoStatus=key=>RECEIPT_STATES.has(ctx.mediaReceipts?.[key]?.status)
   ?ctx.mediaReceipts[key].status:'missing';
 return {
   answers:answers?'received':'missing',
   drawing:photoStatus('drawing'),
   form:ctx.formReceipt?.status==='received'?'received':'missing',
   portrait:photoStatus('portrait'),
   handoff:['form_pending','portrait','complete'].includes(ctx.mediaStep)?'received':'missing',
 };
}
export function freePackageStatusMessage(ctx={},locale='en'){
 const l=local(locale),copy=freePackageCopy(l),states=reviewPackageStatus(ctx);
 const completed=Object.values(states).filter(status=>status==='received'||status==='skipped').length;
 const progress=l==='ru'?'Пройдено шагов: ':l==='es'?'Etapas registradas: ':'Stages accounted for: ';
 return copy.label+'\n'+progress+completed+'/5\n'+Object.entries(copy.headings)
   .map(([key,title])=>title+': '+copy[states[key]]).join('\n');
}
export function freePackageOwnerNotice(stage,locale='en'){
 if(!CODE.has(stage))return null;
 const c=freePackageCopy(locale);
 if(stage==='complete')return locale==='ru'
   ?'Holistic House · Бесплатный разбор: комплект проверен, пропуски отмечены.\nhttps://holistichouse.vercel.app/ru/app/messages?tab=chats'
   :locale==='es'
     ?'Holistic House · Revisión gratuita: etapas verificadas, omisiones registradas.\nhttps://holistichouse.vercel.app/es/app/messages?tab=chats'
     :'Holistic House · Free review: stages verified, skipped items recorded.\nhttps://holistichouse.vercel.app/en/app/messages?tab=chats';
 if(stage==='form_pending')
   return locale==='ru'
     ?'Holistic House · Бесплатный разбор: коучинговая анкета ещё не получена.\nhttps://holistichouse.vercel.app/ru/app/messages?tab=chats'
     :locale==='es'
       ?'Holistic House · Revisión gratuita: falta el formulario de coaching.\nhttps://holistichouse.vercel.app/es/app/messages?tab=chats'
       :'Holistic House · Free review: coaching questionnaire not yet received.\nhttps://holistichouse.vercel.app/en/app/messages?tab=chats';
 if(stage==='portrait_skipped'||stage==='drawing_skipped'){
   const subject=stage==='portrait_skipped'?'portrait':'drawing';
   return (locale==='ru'?'Holistic House · Бесплатный разбор: ':
     locale==='es'?'Holistic House · Revisión gratuita: ':
     'Holistic House · Free review: ')+c.owner[subject]+
     (locale==='ru'?' пропущено по желанию клиента.':
      locale==='es'?' omitido por elección del cliente.':
      ' skipped by the client.')+'\n'+
     'https://holistichouse.vercel.app/'+local(locale)+'/app/messages?tab=chats';
 }
 const prefix=locale==='ru'?'Holistic House · Бесплатный разбор: ':
   locale==='es'?'Holistic House · Revisión gratuita:':
   'Holistic House · Free review:';
 const suffix=locale==='ru'?' подтверждены и сохранены.':
   locale==='es'?' comprobado y guardado.':' verified and saved.';
 return prefix+' '+c.owner[stage]+suffix+'\n'+
  'https://holistichouse.vercel.app/'+local(locale)+'/app/messages?tab=chats';
}
export function freePhotoStepButtons(locale,step){
 if(!PHOTO_STEPS.has(step))return [];
 const name=local(locale)==='ru'
  ?step==='portrait'?'⏭ Без личного фото':'⏭ Без рисунка':
  local(locale)==='es'
    ?step==='portrait'?'⏭ Sin foto personal':'⏭ Sin dibujo':
    step==='portrait'?'⏭ No personal photo':'⏭ No drawing photo';
 return [[name]];
}
/** Client-authored verification questions. Neither intent can create a
 * receipt: replies are derived from signed server state only. */
export function freePackageStatusIntent(text){
 const raw=typeof text==='string'?text.trim():'';
 if(raw.length>130)return false;
 return /^(?:всё получено\??|что (?:вы )?получили\??|проверь(?:те)? (?:статус|получение|материалы)|какие материалы получены\??|статус(?: заявки)?\??|did you receive everything\??|have you got everything\??|what have you received\??|check (?:the )?(?:status|materials)\??|package status\??|¿(?:recibieron todo|qué recibieron)\??|estado de la solicitud\??)$/iu.test(raw)||
   /^(?:вы (?:получили|видите)\s+(?:(?:моё|мое|мой|мою)\s+)?(?:фото|рисунок|схему)\??|(?:моё|мое|мой|моя)\s+(?:фото|рисунок|схема)\s+(?:дошл[оа]|получен[ао]?)\??|(?:did you|have you)\s+(?:get|got|receive|received)\s+(?:my|the)\s+(?:photo|picture|drawing)\??|has my\s+(?:photo|picture|drawing)\s+arrived\??)$/iu.test(raw);
}
export function freeFormReceiptIntent(text){
 const raw=typeof text==='string'?text.trim():'';
 return raw.length<=130&&/^(?:я (?:уже )?(?:отправил[а]?|заполнил[а]?) (?:анкету|форму|ответы)|анкету (?:отправил[а]?|заполнил[а]?)|форму отправил[а]?|вы получили (?:форму|анкету)\??|is my form received\??|did you get (?:my|the) (?:form|questionnaire)\??|i (?:have |already )?(?:sent|submitted|completed) (?:the|my) (?:form|questionnaire)|form sent|he enviado (?:el formulario|mis respuestas)|¿recibieron (?:el formulario|mis respuestas)\??)[!.\s]*$/iu.test(raw);
}
export function freeProgressStepTransition(ctx,action){
 if(action==='skipportrait'&&ctx.mediaStep==='portrait')
  return skippedFreeMedia(ctx,'portrait');
 if(action==='skipdrawing'&&ctx.mediaStep==='drawing')
  return skippedFreeMedia(ctx,'drawing');
 return null;
}
