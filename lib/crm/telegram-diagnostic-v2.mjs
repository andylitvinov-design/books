// First-party Holistic House Telegram coaching intake V2.
// Owner-authored conversation, no AI, marketing, background job or provider calls.
// The webhook stores only consented client replies in the existing encrypted CRM.
export const TELEGRAM_DIAGNOSTIC_V2_VERSION = 2
export const TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT = 5 * 1024 * 1024
const STAGES = new Set(['consent','focus','photo','question','drawing','done','stopped'])
const TOPICS = new Set(['business','wellbeing','relationships','other'])
const PHOTO = /^[A-Za-z0-9_-]{10,256}$/
const COMMAND = /^\/[a-z_]+(?:@[A-Za-z0-9_]+)?(?:\s|$)/i
const COACHING_HOST = 'https://holistichouse.vercel.app'
const copy = Object.freeze({
  ru: {
    intro: `Приветствую! Спасибо за интерес к экспресс-диагностике.

Буду рад помочь.

Мы можем провести блиц диагностику текущей ситуации.
Это могут быть деньги, работа, отношения, переезд и тп.

В блиц-формате я могу дать обратную связь:
- что сейчас происходит
- в чем причина (где внутренний ступор)
- что можно сделать с этим.

Через этот бот я задам пару вопросов и потом в течение трех дней сделаю личный разбор.

Подходит, начинаем?

Нажимая «Да, начинаем», вы соглашаетесь прислать ответы и фото для одного личного разбора без рекламы. Не отправляйте сюда медицинские документы и результаты тестов. В любой момент можно написать «Стоп».`,
    topics: `Выбери, пожалуйста, с какой темой сейчас хотелось бы поработать:
- деньги/ работа
- энергия/ здоровье
- отношения
- другое.`,
    portrait: `Вышли, пожалуйста, свое фото (лучше недавнее, за последний год, чтобы четко было видно лицо, в полный рост - ну или любое которое есть).`,
    questionPhoto: `Спасибо. Фото принял.

Напиши, пожалуйста,
1) в чем ключевая задача (цель)
2) в чем сложность
3) любые подробности, которые стоило бы добавить.`,
    questionSkip: `Спасибо.

Напиши, пожалуйста,
1) в чем ключевая задача (цель)
2) в чем сложность
3) любые подробности, которые стоило бы добавить.`,
    drawing: `Спасибо за ответ.

Теперь самое важное чтобы я мог разобрать ситуацию, сделай, пожалуйста, рисунок. Ручкой, на любом листике бумаги нарисуй три фигурки:
- я
- цель
- сложность/ препятствие

Это могут быть любые абстрактные фигурки, человечки, квадратики.
Все что придет в голову.

И потом вышли, пожалуйста, фото рисунка в этот чат.`,
    final: `Спасибо.
Задача принята в работу.

И последнее.
Чтобы еще чуть лучше понять, разобраться в текущей форме заполни, пожалуйста, эту коучинг форму.

Такая форма поможет и тебе четче понять запрос и решения.
И мне подготовить для тебя те ответы, которые будут более значимы.

Коучинг форма по этой ссылке.
{link}

Просто зайти на нее, заполни ответы, нажми отправить.
И я займусь изучением твоего вопроса.`,
    later: `Хорошо. Если захочешь вернуться к разбору, снова нажми Start.`,
    choose: `Выбери, пожалуйста, одну из четырёх тем на кнопках.`,
    askPortrait: `Пришли, пожалуйста, фото до 5 МБ или нажми «Пропустить фото».`,
    askQuestion: `Напиши, пожалуйста, в чем ключевая задача, в чем сложность и какие подробности важно добавить.`,
    askDrawing: `Пришли, пожалуйста, фото рисунка до 5 МБ или нажми «Пропустить рисунок».`,
    stopped: `Диалог остановлен. Больше не буду писать тебе в этот чат.`,
    buttons: {
      yes:'Да, начинаем',notNow:'Не сейчас',
      business:'деньги/ работа',wellbeing:'энергия/ здоровье',
      relationships:'отношения',other:'другое',
      skipPhoto:'Пропустить фото',skipDrawing:'Пропустить рисунок',
    },
  },
  en: {
    intro: `Hello! I'm Andrey. Thank you for your interest in a personal express review. I'll be glad to help.

We can explore your current situation — money, work, relationships, moving, or something else important to you.

I'll offer personal feedback: what may be happening, where you may feel stuck and some practical next steps.

I'll ask you a few questions here, then usually prepare your written review within three days after receiving the information.

By choosing “Yes, let's begin”, you agree to share these answers and any optional photos with me for one personal reply, without marketing. Telegram processes photos; please don't send medical records or test results. You can stop anytime by writing “Stop”.

Shall we begin?`,
    topics: 'Great! Which topic would you like to explore?',
    portrait: 'Thank you. Please send a recent photo of yourself, ideally from the past year with your face visible. A full-length photo is welcome, but any photo you have is fine. It is optional; choose “Skip photo” if you prefer.',
    questionPhoto: 'Thank you, I received your photo. Please describe in ONE message:\n1) Your main goal or task.\n2) What feels difficult.\n3) Any useful details.\n\nWrite naturally, without medical information.',
    questionSkip: 'Thank you. Please describe in ONE message:\n1) Your main goal or task.\n2) What feels difficult.\n3) Any useful details.\n\nWrite naturally, without medical information.',
    drawing: 'Thank you for sharing. Now an important step for the review.\n\nOn any sheet of paper, draw three shapes with a pen:\n• ME\n• MY GOAL\n• DIFFICULTY / OBSTACLE\n\nThey can be people, circles, squares or anything that comes to mind. Photograph your drawing and send it here. If this is difficult now, choose “Skip drawing”.',
    final: 'Thank you! Your enquiry is ready for my personal review.\n\nOne last step: please fill out my coaching questionnaire:\n{link}\n\nThis helps you clarify your question and helps me prepare a meaningful written response. Open the form, answer the questions and press “Send questionnaire and request”. Only a confirmed submission reaches my secure CRM; saving a private draft does not send it.\n\nThank you for your trust!',
    later: 'Of course. If you decide to return, just press Start in this bot. Take care!',
    choose: 'Please choose one of the four topics below.',
    askPortrait: 'Please send an ordinary photo under 5 MB, or select “Skip photo”.',
    askQuestion: 'Please describe your goal, main difficulty and any helpful details in one message.',
    askDrawing: 'Please send a photo of your drawing under 5 MB, or select “Skip drawing”.',
    stopped: 'Understood. This conversation is stopped; I will not contact you here.',
    buttons: {
      yes:"Yes, let's begin",notNow:'Not now',
      business:'Money / work',wellbeing:'Energy / wellbeing',
      relationships:'Relationships',other:'Other',
      skipPhoto:'Skip photo',skipDrawing:'Skip drawing',
    },
  },
  es: {
    intro: `¡Hola! Soy Andrey. Gracias por tu interés en una revisión personal exprés. Será un placer ayudarte.

Podemos explorar tu situación actual: dinero, trabajo, relaciones, mudanza o cualquier otra cuestión importante.

Compartiré mi visión personal de lo que ocurre, dónde puede haber un bloqueo y qué pasos prácticos puedes dar.

Te haré unas preguntas aquí y normalmente prepararé una respuesta escrita en unos tres días después de recibir la información.

Al elegir «Sí, empezamos», aceptas compartir tus respuestas y fotos opcionales conmigo para una sola respuesta personal, sin publicidad. Telegram procesa las fotos; no envíes expedientes médicos ni resultados de pruebas. Puedes detener la conversación escribiendo «Parar».

¿Empezamos?`,
    topics: '¡Bien! ¿Con qué tema te gustaría trabajar?',
    portrait: 'Gracias. Envíame una foto reciente, preferiblemente del último año, con el rostro visible. Una foto de cuerpo entero también está bien, pero sirve cualquiera. Es opcional; elige «Omitir foto» si lo prefieres.',
    questionPhoto: 'Gracias, recibí tu foto. Ahora escribe en UN solo mensaje:\n1) Tu objetivo principal.\n2) La dificultad que encuentras.\n3) Cualquier detalle relevante.\n\nSin datos médicos, por favor.',
    questionSkip: 'Gracias. Ahora escribe en UN solo mensaje:\n1) Tu objetivo principal.\n2) La dificultad que encuentras.\n3) Cualquier detalle relevante.\n\nSin datos médicos, por favor.',
    drawing: 'Gracias por compartirlo. Ahora viene una parte importante.\n\nDibuja con bolígrafo en cualquier hoja tres figuras:\n• YO\n• MI META\n• DIFICULTAD / OBSTÁCULO\n\nPueden ser personas, círculos, cuadrados o formas abstractas. Fotografía el dibujo y envíalo aquí. Si ahora no puedes, elige «Omitir dibujo».',
    final: '¡Gracias! Tu consulta está lista para mi revisión personal.\n\nUna última cosa: completa mi formulario de coaching aquí:\n{link}\n\nTe ayudará a aclarar tu objetivo y a mí a preparar una respuesta útil. Abre el formulario, contesta y pulsa «Enviar formulario y solicitud». Solo el envío confirmado llega a mi CRM privado; guardar un borrador no lo envía.\n\n¡Gracias por la confianza!',
    later: 'Claro. Si más adelante quieres continuar, pulsa Start en este bot. ¡Cuídate!',
    choose: 'Elige uno de los cuatro temas.',
    askPortrait: 'Envía una foto normal de menos de 5 MB, o elige «Omitir foto».',
    askQuestion: 'Describe tu objetivo, tu dificultad y cualquier detalle relevante en un solo mensaje.',
    askDrawing: 'Envía la foto de tu dibujo de menos de 5 MB, o elige «Omitir dibujo».',
    stopped: 'De acuerdo, la conversación se ha detenido. No te escribiré aquí.',
    buttons: {
      yes:'Sí, empezamos',notNow:'Ahora no',
      business:'Dinero / trabajo',wellbeing:'Energía / bienestar',
      relationships:'Relaciones',other:'Otro',
      skipPhoto:'Omitir foto',skipDrawing:'Omitir dibujo',
    },
  },
})

// Buttons are typed actions; the callback handler maps fixed IDs to the
// owner's original translated labels. No user-submitted callback data is sent
// directly into a CRM message or executable workflow.
export const TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS = Object.freeze(
  Object.fromEntries(Object.entries(copy).map(([locale,lang])=>
    [locale,Object.freeze({...lang.buttons})]))
)

export const TELEGRAM_DIAGNOSTIC_V2_BUTTONS = Object.freeze(
  [...new Set(Object.values(copy).flatMap(lang=>Object.values(lang.buttons)))]
)

export function telegramV2CoachingLink(locale,topic){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const selected=TOPICS.has(topic)?topic:'personal'
  return COACHING_HOST+'/'+lang+'/coaching/intake?topic='+selected
}

// The pilot's legacy V1 chat may already have hit its 10-guidance-message
// UTC-day cap. Allow exactly ONE fresh quota when the visitor explicitly
// restarts from V1 into V2; flow_version is persisted as 2 atomically with this
// message, so repeated /start commands CANNOT reset the quota again.
export function telegramDiagnosticDailyReplyCount(previous,next,today){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(today||'')))return 10
  const oldDay=previous?.reply_day instanceof Date
    ?previous.reply_day.toISOString().slice(0,10)
    :String(previous?.reply_day||'').slice(0,10)
  const oldCount=Math.min(10,Math.max(0,Number(previous?.reply_count)||0))
  const upgrading=Number(previous?.flow_version)===1 &&
    next?.flowVersion===2 && next?.stage==='consent' && next?.consent===false
  return upgrading||oldDay!==today?0:oldCount
}

const stopText = text => /^\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]+)?$/i.test(text) ||
  ['стоп','остановить','остановить диалог','stop','parar','detener'].includes(text.toLowerCase())
const skipText = (raw,locale,type) => raw===copy[locale].buttons[type] ||
  /^\/skip(?:@[A-Za-z0-9_]+)?$/i.test(raw)

function result(stage,locale,session,{body=null,photoFileId=null,photoPurpose=null,
  stop=false,replyKey=null,consent=false,topic=null}={}){
  const lang=copy[locale]||copy.en
  const activeTopic=topic||session?.topic||null
  const reply=replyKey==='final'
    ?lang.final.replace('{link}',telegramV2CoachingLink(locale,activeTopic))
    :replyKey?lang[replyKey]:null
  let keyboard=[]
  if(replyKey==='intro')keyboard=[[lang.buttons.yes,lang.buttons.notNow]]
  if(replyKey==='topics')keyboard=[
    [lang.buttons.business,lang.buttons.wellbeing],
    [lang.buttons.relationships,lang.buttons.other],
  ]
  if(replyKey==='portrait'||replyKey==='askPortrait')keyboard=[[lang.buttons.skipPhoto]]
  if(replyKey==='drawing'||replyKey==='askDrawing')keyboard=[[lang.buttons.skipDrawing]]
  if(replyKey==='choose')keyboard=[
    [lang.buttons.business,lang.buttons.wellbeing],
    [lang.buttons.relationships,lang.buttons.other],
  ]
  if(replyKey==='later')keyboard=[]
  return {handled:true,flowVersion:TELEGRAM_DIAGNOSTIC_V2_VERSION,
    stage,locale,topic:activeTopic,body,photoFileId,photoPurpose,
    stop,consent,reply,keyboard}
}

// The caller passes state from the encrypted owner CRM's separate hashed session.
// No third-party customer data or codes are ever interpolated into bot replies.
export function transitionTelegramDiagnosticV2(session,event){
  const raw=String(event?.rawText??'').trim()
  const deep= /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhreview_(en|ru|es)$/i.exec(raw)
  const start=Boolean(deep||/^\/start(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw)||
    /^(?:начать заново|start again|empezar de nuevo)$/i.test(raw))
  const locale=deep?.[1]?.toLowerCase()||
    (copy[session?.locale]?session.locale:copy[event?.locale]?event.locale:'en')
  const stage=STAGES.has(session?.stage)?session.stage:null
  const consented=Boolean(session?.consentAt)
  if(stage==='stopped')return result('stopped',locale,session)
  if(stopText(raw))return result('stopped',locale,session,{
    body:consented?'/stop':null,stop:consented,replyKey:'stopped',
  })
  if(start||!stage)return result('consent',locale,null,{replyKey:'intro'})
  const lang=copy[locale]
  if(/^\/help(?:@[A-Za-z0-9_]+)?$/i.test(raw)){
    const key={consent:'intro',focus:'topics',photo:'portrait',
      question:'askQuestion',drawing:'drawing',done:'final'}[stage]
    return result(stage,locale,session,{replyKey:key})
  }
  if(stage==='consent'){
    if(raw===lang.buttons.yes||/^\/agree(?:@[A-Za-z0-9_]+)?$/i.test(raw))
      return result('focus',locale,session,{body:'One-time personal reply consent; no marketing',
        consent:true,replyKey:'topics'})
    if(raw===lang.buttons.notNow)return result('consent',locale,session,{replyKey:'later'})
    return result('consent',locale,session,{replyKey:'intro'})
  }
  if(stage==='focus'){
    let topic=Object.keys(lang.buttons).find(k=>TOPICS.has(k)&&lang.buttons[k]===raw)||null
    if(!topic&&locale==='ru'){
      // Previously delivered buttons and ordinary phrasing from the pilot
      // remain accepted, but ONLY the owner's exact four labels are displayed.
      const prior={
        'Деньги / работа':'business','Энергия / самочувствие':'wellbeing',
        'Отношения':'relationships','Другое':'other','Хочу денег':'business',
      }
      topic=prior[raw]||null
    }
    if(!topic&&/^\/situation(?:@[A-Za-z0-9_]+)?$/i.test(raw))topic='other'
    if(!topic&&/^\/energy(?:@[A-Za-z0-9_]+)?$/i.test(raw))topic='wellbeing'
    if(!topic)return result('focus',locale,session,{replyKey:'choose'})
    return result('photo',locale,session,{topic,
      body:'Topic: '+topic,replyKey:'portrait'})
  }
  if(stage==='photo'){
    if(skipText(raw,locale,'skipPhoto'))
      return result('question',locale,session,{replyKey:'questionSkip'})
    if(PHOTO.test(String(event?.photoFileId||'')) &&
       Number.isSafeInteger(event?.photoBytes) &&
       event.photoBytes>0&&event.photoBytes<=TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT)
      return result('question',locale,session,{
        body:'[Client portrait photo, shared voluntarily for private review]',
        photoFileId:event.photoFileId,photoPurpose:'portrait',replyKey:'questionPhoto'})
    return result('photo',locale,session,{replyKey:'askPortrait'})
  }
  if(stage==='question'){
    if(raw.length>1&&raw.length<=1200&&!COMMAND.test(raw)&&!event?.photoFileId)
      return result('drawing',locale,session,{body:raw,replyKey:'drawing'})
    return result('question',locale,session,{replyKey:'askQuestion'})
  }
  if(stage==='drawing'){
    if(skipText(raw,locale,'skipDrawing'))
      return result('done',locale,session,{replyKey:'final'})
    if(PHOTO.test(String(event?.photoFileId||'')) &&
       Number.isSafeInteger(event?.photoBytes)&&event.photoBytes>0 &&
       event.photoBytes<=TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT)
      return result('done',locale,session,{
        body:'[ME-GOAL-OBSTACLE drawing, shared voluntarily for private review]',
        photoFileId:event.photoFileId,photoPurpose:'drawing',replyKey:'final'})
    return result('drawing',locale,session,{replyKey:'askDrawing'})
  }
  if(stage==='done'){
    // Follow-up messages go to the same consented CRM thread, without an
    // automatic bot conversation or a second lead. Late drawings remain private.
    if(PHOTO.test(String(event?.photoFileId||'')) &&
       Number.isSafeInteger(event?.photoBytes)&&event.photoBytes>0 &&
       event.photoBytes<=TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT)
      return result('done',locale,session,{body:'[Additional voluntary drawing/photo]',
        photoFileId:event.photoFileId,photoPurpose:'drawing'})
    if(raw&&!COMMAND.test(raw))return result('done',locale,session,{body:raw.slice(0,1200)})
    return result('done',locale,session)
  }
  return {handled:false}
}

// Read-only script projection for the signed Telegram V2 state machine.
// These message strings and keyboard labels come from the SAME 'copy' used
// by transitionTelegramDiagnosticV2. Never save this projection as a generic
// SalesBot flow: its photo/drawing/consent stages cannot be represented by
// the 360-character dry-run graph editor.
export function telegramDiagnosticV2Script(locale = 'en', topic = 'other') {
  const langId = Object.prototype.hasOwnProperty.call(copy, locale) ? locale : 'en'
  const lang = copy[langId]
  const kind = TOPICS.has(topic) ? topic : 'other'
  const buttons = lang.buttons
  const link = telegramV2CoachingLink(langId, kind)
  return [
    {id:'intro', stage:'consent', text:lang.intro, buttons:[buttons.yes,buttons.notNow]},
    {id:'topics', stage:'focus', text:lang.topics,
      buttons:[buttons.business,buttons.wellbeing,buttons.relationships,buttons.other]},
    {id:'portrait', stage:'photo', text:lang.portrait, buttons:[buttons.skipPhoto]},
    {id:'question', stage:'question', text:lang.questionPhoto,
      withoutPhotoText:lang.questionSkip, buttons:[]},
    {id:'drawing', stage:'drawing', text:lang.drawing, buttons:[buttons.skipDrawing]},
    {id:'final', stage:'done', text:lang.final.replace('{link}',link),
      link, buttons:[]},
  ]
}
