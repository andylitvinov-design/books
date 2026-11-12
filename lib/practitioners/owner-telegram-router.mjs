// Private owner Telegram intake: decide the destination AFTER capture.
// Pure module: no database, model, webhook, or Telegram API credentials.
export const ROUTER_TTL_HOURS = 24;
const OWNER = 'andytherapist';
const BOT = 'andydotbot';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const CHOICE = new RegExp('^hh-route:([ca]):('+UUID+')$','i');
const TOKEN = /(?:\b\d{6,16}:[A-Za-z0-9_-]{25,}\b|\bsk-(?:or-v1-)?[A-Za-z0-9_-]{20,}\b|\bAIza[A-Za-z0-9_-]{25,}\b|\bnvapi-[A-Za-z0-9._-]{15,}\b)/i;
const PRIVATE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\d[\d() -]{9,}\d/i;
const SAFE_ID = /^[A-Za-z0-9_-]{20,512}$/;

export function parseOwnerRouterUpdate(update,now=Date.now()){
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0)return null;
 const q=update.callback_query;
 const m=q?.message||update.message;
 const from=q?.from||m?.from;
 const chat=m?.chat;
 if(chat?.type!=='private'||!Number.isSafeInteger(chat.id)||chat.id<=0||
  !Number.isSafeInteger(from?.id)||from.id!==chat.id||from.is_bot===true||
  String(from.username||'').toLowerCase()!==OWNER)return null;
 const common={updateId:update.update_id,chatId:String(chat.id),userId:String(from.id)};
 if(q){
  if(typeof q.id!=='string'||q.id.length>128||
    !((m?.from?.is_bot===true&&String(m.from.username||'').toLowerCase()===BOT)||
      (m?.date===0&&m?.from==null&&Number.isSafeInteger(m?.message_id))))return null;
  const chosen=CHOICE.exec(String(q.data||''));
  if(!chosen)return null;
  return {...common,action:'route',target:chosen[1].toLowerCase()==='c'?'council':'commander',
   draftId:chosen[2].toLowerCase(),callbackId:q.id};
 }
 if(!Number.isSafeInteger(m?.date)||Math.abs(now-m.date*1000)>600000||
    !Number.isSafeInteger(m?.message_id)||m.message_id<=0)return null;
 // A ForceReply intended for /all, /audio, media or a customer must retain its
 // original handler. We never hijack existing owner bot conversations.
 if(m.reply_to_message?.from?.is_bot===true)return null;
 const text=typeof m.text==='string'?m.text.trim():'';
 if(text){
  if(/^\/(?:compose|prompt|task|question)(?:@Andydotbot)?$/i.test(text))
    return {...common,action:'help'};
  const explicit=text.match(/^\/(?:compose|prompt|task|question)(?:@Andydotbot)?\s+([\s\S]+)$/i);
  if(text.startsWith('/')&&!explicit)return null;
  const raw=explicit?explicit[1].trim():text;
  if(raw.length>2000)return {...common,action:'too_long'};
  if(raw.length<6)return {...common,action:'too_short'};
  if(TOKEN.test(raw)||PRIVATE.test(raw))return {...common,action:'sensitive'};
  return {...common,action:'intake',kind:'text',payload:{text:raw},sourceMessageId:m.message_id};
 }
 const v=m.voice;
 if(!v)return null;
 if(!SAFE_ID.test(String(v.file_id||''))||
    !Number.isSafeInteger(v.file_size)||v.file_size<100||v.file_size>2000000||
    !Number.isSafeInteger(v.duration)||v.duration<1||v.duration>60)
   return null; // Unsupported or long audio keeps its existing private Materials handler.
 return {...common,action:'intake',kind:'voice',payload:{
  note:{fileId:v.file_id,bytes:v.file_size,seconds:v.duration,mime:'audio/ogg',locale:'ru'}
 },sourceMessageId:m.message_id};
}

export function ownerRouterButtons(draftId){
 if(!new RegExp('^'+UUID+'$','i').test(String(draftId||'')))throw Error('INVALID_OWNER_ROUTER_DRAFT_ID');
 const rows=[[{text:'🧠 Совет ИИ',callback_data:'hh-route:c:'+draftId},
              {text:'🛠 Agent Commander',callback_data:'hh-route:a:'+draftId}]];
 return {inline_keyboard:rows};
}
export function ownerRouterReceipt(kind,draftId){
 return {text:kind==='voice'
  ?'Спасибо, голосовое сообщение принято. Кому отправить?\n\n🎙 После выбора запись будет расшифрована через Google Gemini Free Tier. Google может использовать её по своей политике. Не передавайте конфиденциальные сведения.'
  :'Спасибо, сообщение принято. Кому отправить?',
  reply_markup:ownerRouterButtons(draftId)};
}
export function ownerRouterTask(text){
 if(typeof text!=='string')return null;
 const value=text.trim();
 if(value.length<6||value.length>2000||TOKEN.test(value)||PRIVATE.test(value))return null;
 const first=(value.split(/\n|[.!?]\s/)[0]||'').replace(/\s+/g,' ').trim();
 const title=(first.length>=6?first:'Задача из Telegram: '+first).slice(0,140);
 const description=value.length>=10?value:'Задача из Telegram: '+value;
 // No implicit code execution. Only a manually assigned worker may implement.
 const code=/\b(fix|implement|refactor|deploy|bug|api|ci|pr)\b|(?:исправ|доработ|реализ|внедр|запрограмм|напиши код|обнови сайт|добавь функц|смерж)/iu.test(value);
 return {title,description,kind:code?'code_change':'product_spec',projectId:null,
  sourceRef:null,priority:65,autoAllowed:false};
}
