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
    intro: `Приветствую! Спасибо за интерес к экспресс-разбору. Буду рад помочь.

Мы можем сделать блиц-разбор вашей ситуации: деньги, работа, отношения, переезд или другая важная тема.

Я дам личную обратную связь: что сейчас происходит, где может быть внутренний ступор и какие шаги помогут сдвинуться.

Здесь я задам несколько вопросов, а затем обычно в течение трёх дней после получения материалов подготовлю письменный разбор.

Нажимая «Да, начинаем», вы соглашаетесь передать ответы и добровольные фото лично мне для одного ответа, без рекламы. Telegram обрабатывает отправленные фото; не присылайте медицинские документы и результаты тестов. Диалог можно остановить словом «Стоп».

Подходит? Начинаем?`,
    topics: 'Отлично! Выберите, пожалуйста, с какой темой сейчас хотите поработать:',
    portrait: 'Спасибо! Пришлите, пожалуйста, своё фото. Лучше недавнее, за последний год, с хорошо видимым лицом. Фото в полный рост тоже подойдёт, но можно любое, которое есть. Это добровольно; если неудобно, нажмите «Пропустить фото».',
    questionPhoto: 'Спасибо, фото принял. Теперь напишите, пожалуйста, одним сообщением:\n1) В чём ваша ключевая задача или цель?\n2) В чём основная сложность?\n3) Какие подробности важно учесть?\n\nМожно кратко, своими словами, без медицинских данных.',
    questionSkip: 'Спасибо! Теперь напишите, пожалуйста, одним сообщением:\n1) В чём ваша ключевая задача или цель?\n2) В чём основная сложность?\n3) Какие подробности важно учесть?\n\nМожно кратко, своими словами, без медицинских данных.',
    drawing: 'Спасибо за ответ. Теперь самая важная часть для разбора.\n\nНа любом листе бумаги ручкой нарисуйте три фигуры:\n• Я\n• Цель\n• Сложность / препятствие\n\nЭто могут быть человечки, кружки, квадраты или любые абстрактные формы, которые придут в голову. Сфотографируйте рисунок и пришлите сюда. Если сейчас не получается, можно выбрать «Пропустить рисунок».',
    final: 'Спасибо! Задача принята в работу.\n\nИ последнее: чтобы лучше понять ваш запрос, пожалуйста, заполните авторскую коучинг-анкету по ссылке:\n{link}\n\nАнкета поможет вам яснее сформулировать цель, а мне — подготовить полезный личный разбор. Откройте форму, заполните ответы и нажмите «Отправить анкету и заявку». После подтверждения отправки анкета отдельно поступит в защищённую CRM. Сохранённый черновик сам по себе не отправляется.\n\nБлагодарю за доверие!',
    later: 'Хорошо! Если захотите вернуться к разбору, просто нажмите Start у этого бота. Хорошего дня!',
    choose: 'Выберите одну из четырёх тем на кнопках ниже.',
    askPortrait: 'Пришлите обычное фото до 5 МБ или нажмите «Пропустить фото».',
    askQuestion: 'Напишите, пожалуйста, вашу цель, сложность и необходимые подробности одним сообщением.',
    askDrawing: 'Пришлите фото рисунка до 5 МБ или нажмите «Пропустить рисунок».',
    stopped: 'Хорошо, диалог остановлен. Я не буду писать вам в этот чат.',
    buttons: {
      yes:'Да, начинаем',notNow:'Не сейчас',
      business:'Деньги / работа',wellbeing:'Энергия / самочувствие',
      relationships:'Отношения',other:'Другое',
      skipPhoto:'Пропустить фото',skipDrawing:'Пропустить рисунок',
    },
  },
  en: {
    intro: `Hello! Thank you for your interest in a personal express review. I'll be glad to help.

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
    intro: `¡Hola! Gracias por tu interés en una revisión personal exprés. Será un placer ayudarte.

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

export const TELEGRAM_DIAGNOSTIC_V2_BUTTONS = Object.freeze(
  [...new Set(Object.values(copy).flatMap(lang=>Object.values(lang.buttons)))]
)

export function telegramV2CoachingLink(locale,topic){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const selected=TOPICS.has(topic)?topic:'personal'
  return COACHING_HOST+'/'+lang+'/coaching/intake?topic='+selected
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
  const start=Boolean(deep||/^\/start(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw))
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
