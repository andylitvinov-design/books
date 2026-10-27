// Owner-only Telegram UX for the existing @Andydotbot webhook.
// No external model call, destination, chat secret or personal text lives here.
// Keep the native Telegram owner menu small. Advanced legacy commands
// (/gemini, /free, /free2, /verify, /status) still work when typed.
export const OWNER_AI_COMMANDS=Object.freeze([
  {command:'all',description:'🧠 Совет ИИ: 4 аналитика + 5-й вывод'},
  {command:'audio',description:'🎙 Аудио и видео'},
  {command:'materials',description:'📚 Открыть мою аудиотеку'},
  {command:'track',description:'▶️ Готовое голосовое для пересылки'},
])
const OWNER='andytherapist'
const BOT='andydotbot'
const MAX_QUESTION=2000
const MODE_LABEL=Object.freeze({all:'Спросить всех',both:'Gemini + Mistral',duo:'Gemini + OpenRouter Free',gemini:'Gemini',mistral:'Mistral',free:'OpenRouter Free',free2:'OpenRouter Free 2'})
const CALLBACK_MODES=Object.freeze({'hh-ai:all':'all','hh-ai:both':'both','hh-ai:duo':'duo','hh-ai:gemini':'gemini','hh-ai:mistral':'mistral','hh-ai:free':'free','hh-ai:free2':'free2'})
const SECRET_RE=/(?:\b\d{6,16}:[A-Za-z0-9_-]{25,}\b|\bsk-(?:or-v1-)?[A-Za-z0-9_-]{20,}\b|\bAIza[A-Za-z0-9_-]{25,}\b|\bnvapi-[A-Za-z0-9._-]{15,}\b)/i
const PRIVATE_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\d[\d() -]{9,}\d/i

function replyMode(value){
  const text=String(value||'')
  if(!text.startsWith('AI Console · '))return null
  if(text.startsWith('AI Console · Спросить всех'))return 'all'
  if(text.startsWith('AI Console · Gemini + OpenRouter Free'))return 'duo'
  if(text.startsWith('AI Console · Gemini + Mistral'))return 'both'
  if(text.startsWith('AI Console · Gemini'))return 'gemini'
  if(text.startsWith('AI Console · Mistral'))return 'mistral'
  if(text.startsWith('AI Console · OpenRouter Free 2'))return 'free2'
  if(text.startsWith('AI Console · OpenRouter Free'))return 'free'
  return null
}
export function parseOwnerAiUpdate(update,now=Date.now()){
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0)return null
  const query=update.callback_query
  const message=query?.message||update.message
  const from=query?.from||message?.from
  const chat=message?.chat
  if(chat?.type!=='private'||!Number.isSafeInteger(chat.id)||chat.id<=0||
    !Number.isSafeInteger(from?.id)||from.id!==chat.id||from.is_bot===true||
    String(from.username||'').toLowerCase()!==OWNER)return null
  const base={updateId:update.update_id,chatId:String(chat.id),userId:String(from.id)}
  if(query){
    if(message?.from?.is_bot!==true||
      String(message.from.username||'').toLowerCase()!==BOT||
      typeof query.id!=='string'||query.id.length>128)return null
    const mode=CALLBACK_MODES[query.data]
    if(mode)return {...base,action:'prompt',mode,callbackId:query.id}
    if(query.data==='hh-ai:menu')return {...base,action:'menu',callbackId:query.id}
    if(query.data==='hh-ai:status')return {...base,action:'status',callbackId:query.id}
    if(query.data==='hh-ai:verify')return {...base,action:'verify',callbackId:query.id}
    return null
  }
  if(!Number.isSafeInteger(message?.date)||
    Math.abs(now-message.date*1000)>10*60*1000)return null
  const body=typeof message.text==='string'?message.text.trim():''
  if(!body)return null
  if(/^\/(?:stop|unsubscribe)(?:@\w+)?$/i.test(body)||
    /^\/start(?:@\w+)?\s+\S+/i.test(body))return null
  if(/^\/status(?:@Andydotbot)?$/i.test(body))return {...base,action:'status'}
  if(/^\/verify(?:@Andydotbot)?$/i.test(body))return {...base,action:'verify'}
  if(/^\/(?:start|ai|help|cancel)(?:@Andydotbot)?$/i.test(body))
    return {...base,action:'menu'}
  const command=body.match(/^\/(gemini|mistral|free2|free|council|all|ai)(?:@Andydotbot)?(?:\s+([\s\S]*))?$/i)
  let mode=command?(['council','ai','all'].includes(command[1].toLowerCase())?'all':command[1].toLowerCase()):null
  const question=command?String(command[2]||'').trim():body
  if(!mode&&body.startsWith('/'))return null
  if(command&&!question)return {...base,action:'prompt',mode}
  if(!mode && message.reply_to_message?.from?.is_bot===true&&
     String(message.reply_to_message.from.username||'').toLowerCase()===BOT)
    mode=replyMode(message.reply_to_message.text)
  // Explicit /ai, /gemini, /free, /mistral, /council or reply to OUR ForceReply
  // is required. A random private chat message must never be sent to AI.
  if(!mode)return null
  if(question.length>MAX_QUESTION)return {...base,action:'too_long'}
  if(SECRET_RE.test(question)||PRIVATE_RE.test(question))
    return {...base,action:'sensitive'}
  return {...base,action:'question',mode,question}
}
// Only successful provider generation receipts (and fresh GET metadata) mark
// a model as selectable; merely possessing an API key is NOT model proof.
const MODEL_NAMES=Object.freeze({
  gemini:'Gemini',mistral:'Mistral',free:'Free AI 1',free2:'Free AI 2'
})
export const OWNER_AI_MODEL_IDS=Object.freeze(Object.keys(MODEL_NAMES))
// Strongest Free-only default council. Mistral remains an explicit legacy command,
// not an automatic participant (Studio Free repeatedly returned HTTP 429).
export const OWNER_AI_COUNCIL_IDS=Object.freeze(['free','free2','gemini'])
export function ownerAiMenu(readiness={}){
  // One task = one primary action. The provider list/technical diagnostics
  // live behind the existing explicit /status and /verify commands.
  const canAsk=readiness.five?.enough===true
  const output=[
    '🧠 Holistic House · Совет ИИ 4+1',
    '',
    'Напишите вопрос: четыре отдельные модели анализируют его,',
    'а пятая модель составляет итоговый вывод, различия и конкретный план.',
    '',
    '👇 Нажмите кнопку и напишите вопрос.',
    'Или отправьте одним сообщением: /all ваш вопрос.',
    '',
    canAsk
      ?'Предварительный каталог: '+readiness.five.available.length+'/5 моделей с ценой $0. Реальные ответы появятся только после запроса.'
      :'Каталог 4+1: '+(readiness.five?.available?.length||0)+'/5; '+String(readiness.five?.reason||'Не удалось проверить доступ').slice(0,80),
    '⚠️ Без данных клиентов, медицинских сведений и паролей.'
  ].join('\n')
  const keyboard=[[{
    text:'🧠 Совет 4+1 · задать вопрос',callback_data:'hh-ai:all'
  }]]
  if(!canAsk)keyboard.push([{
    text:'🔄 Проверить подключение',callback_data:'hh-ai:status'
  }])
  return {text:output,reply_markup:{inline_keyboard:keyboard}}
}
export function ownerAiPrompt(mode){
  if(!MODE_LABEL[mode])throw Error('INVALID_OWNER_AI_MODE')
  const guidance=mode==='all'
    ?'Напишите вопрос ответом на это сообщение. Для глубокого разбора укажите цель, ограничения и что хотите получить. Я сопоставлю доступные мнения и дам общий вывод с планом.\n\nБез клиентских данных и паролей. До 2000 символов.'
    :'Ответьте на это сообщение своим вопросом (до 2000 символов).'
  return {text:'AI Console · '+MODE_LABEL[mode]+'\n\n'+guidance,
    reply_markup:{force_reply:true,selective:true,
      input_field_placeholder:mode==='all'?'Ваш вопрос всем ИИ':('Вопрос для '+MODE_LABEL[mode])}}
}
export function ownerAiResponseItems(reviews,mode){
  if(!['all','both','duo','gemini','mistral','free','free2'].includes(mode))
    throw Error('INVALID_OWNER_AI_MODE')
  const wanted=mode==='all'?OWNER_AI_MODEL_IDS:
    mode==='both'?['gemini','mistral']:
    mode==='duo'?['gemini','free']:[mode]
  const items=[]
  for(const which of wanted){
    const value=reviews?.[which]
    if(!value&&mode==='all')continue
    const label=MODEL_NAMES[which]
    if(value?.status==='ok'&&typeof value.text==='string'&&value.text.trim()){
      const answer=Array.from(value.text.trim()).slice(0,2100).join('')
      items.push({text:'✅ '+label+' · '+String(value.model||label).slice(0,85)+
        '\n\n'+answer+'\n\nСовет ИИ, не выполненное изменение.'})
    }else{
      const reason=String(value?.reason||'UNAVAILABLE').slice(0,75)
      items.push({text:'⚠️ '+label+': реального ответа нет ('+
        String(value?.status||'unavailable')+', '+reason+'). Проверка: /verify.'})
    }
  }
  return items
}
export function ownerAiEnsembleStatus(reviews,synthesis){
  const values=OWNER_AI_MODEL_IDS.filter(id=>Object.hasOwn(reviews||{},id))
  const counts=values.filter(id=>reviews[id]?.status==='ok').length
  const failed=values.filter(id=>reviews[id]?.status!=='ok')
  return {
    text:'🧠 Все ИИ: ответы '+counts+'/'+values.length+
      (failed.length?'\nНе ответили: '+failed.map(id=>MODEL_NAMES[id]+
        ' ('+String(reviews[id]?.reason||'нет ответа').slice(0,45)+')').join('; '):'')+
      '\nАгрегатор: '+(synthesis?.status==='ok'?
        String(synthesis.model||'подтверждён'):'нет подтверждённого синтеза')+
      '\nРекомендации не являются выполненными действиями.'
  }
}
