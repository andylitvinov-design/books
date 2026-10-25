// Owner-only Telegram UX for the existing @Andydotbot webhook.
// No external model call, destination, chat secret or personal text lives here.
export const OWNER_AI_COMMANDS=Object.freeze([
  {command:'audio',description:'Аудио → Мои материалы · добавить запись'},
  {command:'materials',description:'Открыть мою аудиотеку'},
  {command:'ai',description:'AI Console — выбрать помощника'},
  {command:'status',description:'Проверить доступность AI'},
  {command:'gemini',description:'Спросить Gemini'},
  {command:'free',description:'Спросить доступный бесплатный AI'},
  {command:'council',description:'Спросить Gemini и Free AI'},
  {command:'cancel',description:'Вернуться в меню AI Console'},
])
const OWNER='andytherapist'
const BOT='andydotbot'
const MAX_QUESTION=2000
const MODE_LABEL=Object.freeze({both:'Gemini + Mistral',duo:'Gemini + OpenRouter Free',gemini:'Gemini',mistral:'Mistral',free:'OpenRouter Free'})
const CALLBACK_MODES=Object.freeze({'hh-ai:both':'both','hh-ai:duo':'duo','hh-ai:gemini':'gemini','hh-ai:mistral':'mistral','hh-ai:free':'free'})
const SECRET_RE=/(?:\b\d{6,16}:[A-Za-z0-9_-]{25,}\b|\bsk-(?:or-v1-)?[A-Za-z0-9_-]{20,}\b|\bAIza[A-Za-z0-9_-]{25,}\b|\bnvapi-[A-Za-z0-9._-]{15,}\b)/i
const PRIVATE_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\d[\d() -]{9,}\d/i

function replyMode(value){
  const text=String(value||'')
  if(!text.startsWith('AI Console · '))return null
  if(text.startsWith('AI Console · Gemini + OpenRouter Free'))return 'duo'
  if(text.startsWith('AI Console · Gemini + Mistral'))return 'both'
  if(text.startsWith('AI Console · Gemini'))return 'gemini'
  if(text.startsWith('AI Console · Mistral'))return 'mistral'
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
    return null
  }
  if(!Number.isSafeInteger(message?.date)||
    Math.abs(now-message.date*1000)>10*60*1000)return null
  const body=typeof message.text==='string'?message.text.trim():''
  if(!body)return null
  if(/^\/(?:stop|unsubscribe)(?:@\w+)?$/i.test(body)||
    /^\/start(?:@\w+)?\s+\S+/i.test(body))return null
  if(/^\/status(?:@Andydotbot)?$/i.test(body))return {...base,action:'status'}
  if(/^\/(?:start|ai|help|cancel)(?:@Andydotbot)?$/i.test(body))
    return {...base,action:'menu'}
  const command=body.match(/^\/(gemini|mistral|free|council|ai)(?:@Andydotbot)?(?:\s+([\s\S]*))?$/i)
  let mode=command?(command[1].toLowerCase()==='council'?'duo':command[1].toLowerCase()==='ai'?'both':command[1].toLowerCase()):null
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
// The menu is built only from authenticated provider GET preflights.
// GET readiness does not prove a successful model answer, which is stated here.
export function ownerAiMenu(readiness={}){
  const gemini=readiness.gemini||{},free=readiness.free||{},mistral=readiness.mistral||{}
  const describe=(name,value)=>value.ready
    ?'✅ '+name+' · API/модель доступны для проверки'
    :'⚠️ '+name+' · '+String(value.reason||'не проверено').slice(0,65)
  const keyboard=[[{text:'🎙 Аудио → Мои материалы',callback_data:'hh-audio:help'}]]
  if(gemini.ready&&free.ready)keyboard.push([
    {text:'✨ Gemini + Free AI',callback_data:'hh-ai:duo'}])
  if(gemini.ready&&mistral.ready)keyboard.push([
    {text:'Gemini + Mistral',callback_data:'hh-ai:both'}])
  const single=[]
  if(gemini.ready)single.push({text:'Gemini',callback_data:'hh-ai:gemini'})
  if(free.ready)single.push({text:'Free AI',callback_data:'hh-ai:free'})
  if(mistral.ready)single.push({text:'Mistral',callback_data:'hh-ai:mistral'})
  if(single.length)keyboard.push(single)
  keyboard.push([{text:'🔎 Обновить статус',callback_data:'hh-ai:status'}])
  return {
    text:'🤖 AI Console · Holistic House\n\n'+
      'Выберите помощника: доступны только модели с проверенным бесплатным API. '+
      'Статус GET ещё не подтверждает ответ модели.\n\n'+
      [describe('Gemini',gemini),describe('OpenRouter Free',free),
        describe('Mistral',mistral)].join('\n')+
      '\n\n⚠️ Только обезличенные рабочие вопросы. Не пересылайте данные клиентов, анализы, результаты тестов и пароли. ИИ не изменяют сайт.',
    reply_markup:{inline_keyboard:keyboard}
  }
}
export function ownerAiPrompt(mode){
  if(!MODE_LABEL[mode])throw Error('INVALID_OWNER_AI_MODE')
  return {text:'AI Console · '+MODE_LABEL[mode]+'\n\nОтветьте на это сообщение своим вопросом (до 2000 символов).',
    reply_markup:{force_reply:true,selective:true,input_field_placeholder:'Ваш вопрос для '+MODE_LABEL[mode]}}
}
export function ownerAiResponseItems(reviews,mode){
  if(!['both','duo','gemini','mistral','free'].includes(mode))
    throw Error('INVALID_OWNER_AI_MODE')
  const wanted=mode==='both'?['gemini','mistral']:
    mode==='duo'?['gemini','free']:[mode]
  const items=[]
  for(const which of wanted){
    const value=reviews?.[which]
    const label=which==='gemini'?'Gemini':
      which==='mistral'?'Mistral':'OpenRouter Free'
    if(value?.status==='ok'&&typeof value.text==='string'&&value.text.trim()){
      const answer=Array.from(value.text.trim()).slice(0,2800).join('')
      items.push({text:'✅ '+label+' · '+String(value.model||label).slice(0,90)+'\n\n'+answer+
        '\n\nПодсказка ИИ; не подтверждение изменений на сайте.'})
    }else{
      const reason=String(value?.reason||'UNAVAILABLE').slice(0,90)
      items.push({text:'⚠️ '+label+': подтверждённого ответа пока нет ('+
        String(value?.status||'unavailable')+', '+reason+
        '). Проверить доступность: /status. Ответ не придуман.'})
    }
  }
  return items
}
