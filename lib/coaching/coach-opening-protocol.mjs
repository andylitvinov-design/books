/**
 * Holistic House My Coach — six mandatory *opening opportunities* before method work.
 * One brief question at a time. Explicit NO, STOP, SKIP and safety always override.
 * Evidence is reconstructed solely from client utterances (not model claims).
 * This is an ephemeral reducer; caller owns consent, authentication and storage.
 */
export const COACH_OPENING_VERSION='hh-coach-opening-v1-20261122'
export const COACH_OPENING_STEPS=Object.freeze([
  'invitation','name','continuity','focus','feelings','confirmation'
])
export const COACH_OPENING_LABELS=Object.freeze({
  en:['Invitation','Your name','Previous or new topic','Session focus','Feelings','Ready to begin'],
  ru:['Приглашение','Ваше имя','Старая или новая тема','Формат работы','Чувства','Подтверждение'],
  es:['Invitación','Tu nombre','Tema anterior o nuevo','Enfoque','Emociones','Confirmación']
})
const langs=new Set(['en','ru','es'])
const clean=(s,n=240)=>typeof s==='string'?s.trim().slice(0,n):''
const langOf=x=>langs.has(x)?x:'en'
const consentYes=/^(?:(?:yes|yeah|yep|sure|okay|ok|alright|i agree|i would|let'?s (?:try|do it|start|begin)|we can try|possibly|perhaps|maybe|sounds good)\b|(?:да|давай(?:те)?|конечно|соглас(?:ен|на)|можно|попробуем|попробовать можно|возможно|может быть|хорошо|окей|ага)(?=$|[\s,;.!?])|(?:s[ií]|vale|claro|de acuerdo|probemos|intent[eé]moslo|tal vez|quiz[aá]s|podemos intentar)(?=$|[\s,;.!?]))/iu
const decline=/^(?:(?:no|nope|not today|not now|no thanks|maybe later|stop|leave me alone|don't want|do not want|rather not)\b|(?:нет|не хочу|не готов(?:а)?|не сегодня|не сейчас|потом|не надо|стоп|хватит|отстань)(?=$|[\s,;.!?])|(?:no|ahora no|hoy no|m[aá]s tarde|no quiero|para|basta)(?=$|[\s,;.!?]))/iu
const pause=/^(?:pause|wait|later|hold on|пауза|подожд[иите]|погодите|подожду|pausa|espera)(?=$|[\s,;.!?])/iu
const skip=/\b(?:skip|pass|rather not say|prefer not|don't want to answer|do not want to answer|no feelings today)\b|(?:пропущу|пропустить|не хочу отвечать|не хочу говорить|без чувств|не готов(?:а)? говорить)(?=$|[\s,;.!?])|(?:prefiero no decir|paso|omitir|no quiero responder)(?=$|[\s,;.!?])/iu
const oldTopic=/\b(?:continue|old|same (?:topic|subject)|last time|previous topic|pick up|resume|earlier topic)\b|(?:продолж|стар(?:ую|ая|ой)|прошл(?:ую|ая|ой)|ту же|верн[eё]мся)|(?:continuar|sigamos|anterior|retomar|mismo tema)/iu
const newTopic=/\b(?:new|different|another|fresh|change topic)\b|(?:нов(?:ую|ая|ой)|друг(?:ую|ая|ой)|заново|сменить тему)|(?:nuevo|nueva|otro tema|distinto|cambiar tema)/iu
const focusPatterns=Object.freeze({
  self_exploration:/\b(?:self.explor|self.discover|profile|assessment|tests?|personality|know myself)\b|(?:самоисслед|самопознан|профил|тесты?|исследовать себя|изучать себя|понять себя)|(?:autoexplor|autoconoc|perfil|pruebas?|conocerme)/iu,
  goal:/\b(?:goal|achiev|result|aim|objective|accomplish|build|plan)\b|(?:цел[ьи]|результат|достич|достиж|хочу добиться|планир)|(?:meta|objetivo|lograr|conseguir|resultado)/iu,
  challenge:/\b(?:challenge|problem|difficulty|issue|stress|conflict|trouble|obstacle)\b|(?:трудност|проблем|сложност|стресс|конфликт|препятств|кризис|не справ)|(?:desaf[ií]o|problema|dificultad|estr[eé]s|conflicto|obst[aá]culo)/iu,
})
const fallback=Object.freeze({
  en:{invitation:'Would you like to try a coaching session with me today?',
    name:'What name would you like me to use?',
    continuity:'Would you prefer to continue the previous topic or start a new one?',
    focus:'Would you like to work on a challenge, a goal, or self-exploration?',
    feelings:'How are you feeling today? You can skip this question.',
    confirmation:'Shall we begin working on the topic you chose?'},
  ru:{invitation:'Хотите сегодня попробовать коучинг-сессию со мной?',
    name:'Как мне к вам обращаться?',
    continuity:'Продолжим прошлую тему или выберем новую?',
    focus:'Что выбираем: сложность, цель или самоисследование?',
    feelings:'Как вы сегодня себя чувствуете? Можно пропустить этот вопрос.',
    confirmation:'Ну что, приступим к выбранной теме?'},
  es:{invitation:'¿Quieres probar hoy una sesión de coaching conmigo?',
    name:'¿Cómo prefieres que te llame?',
    continuity:'¿Continuamos el tema anterior o elegimos uno nuevo?',
    focus:'¿Elegimos desafío, meta o autoexploración?',
    feelings:'¿Cómo te sientes hoy? Puedes omitir esta pregunta.',
    confirmation:'¿Empezamos a trabajar con el tema elegido?'}
})
function remembered(prior){
  if(!prior||prior.consent!==true)return null
  const name=clean(prior.name,48),topic=clean(prior.topic,180)
  if(!name&&!topic)return null
  return {name:validName(name)?name:'',topic}
}
function validName(value){
  return /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]{0,47}$/u.test(value)&&
    value.length<=48&&value.split(/\s+/u).length<=4&&
    !/^(?:yes|no|hello|hi|stop|maybe|goal|challenge|skip|new topic|old topic|previous topic|continue|self exploration|sad|anxious|stressed|tired|busy|confused|привет|нет|да|не знаю|цель|проблема|новая тема|старая тема|мне плохо|устал(?:а)?|тревожн|hola|s[ií]|nuevo tema)$/iu.test(value)
}
function extractName(raw){
  const text=clean(raw,160).replace(/[.!?]+$/u,'').trim()
  const recognized=text.match(/^(?:my name is|i am|i'm|call me|you can call me|please call me|меня зовут|моё имя|мое имя|зовите меня|называйте меня|можно (?:меня )?называть|me llamo|mi nombre es|puedes llamarme|ll[aá]mame)\s*[:\-—]?\s*(.+)$/iu)
  const value=(recognized?.[1]||text).replace(/^(?:just|просто|solo)\s+/iu,'').trim()
  return validName(value)?value:null
}
function category(raw){
  for(const key of ['self_exploration','goal','challenge'])if(focusPatterns[key].test(raw))return key
  return null
}
function mode(raw){
  if(newTopic.test(raw)&&!oldTopic.test(raw))return 'new'
  if(oldTopic.test(raw)&&!newTopic.test(raw))return 'continue'
  return null
}
function responseType(raw){
  const s=clean(raw)
  if(decline.test(s))return 'no'
  if(pause.test(s))return 'pause'
  return consentYes.test(s)?'yes':'unclear'
}
function completedStatus(progress,id,answer,source='client'){
  const index=COACH_OPENING_STEPS.indexOf(id)
  progress.done[index]=true
  progress.answers[id]={status:'done',source,quote:clean(answer,240)}
}
function autoContinuity(progress,prior){
  if(prior?.topic)return
  progress.continuity='new'
  completedStatus(progress,'continuity','new session','default_new')
}
function applyAnswer(progress,answer,prior){
  const raw=clean(answer,1200)
  if(!raw)return
  progress.lastUserText=raw.slice(0,240)
  const id=COACH_OPENING_STEPS[progress.done.indexOf(false)]
  if(!id)return
  const decision=responseType(raw)
  progress.attempts[id]=(progress.attempts[id]||0)+1
  if(decision==='no'&&id!=='feelings'){
    progress.last={step:id,result:'declined'}
    progress.blocked=true
    return
  }
  if(id==='invitation'){
    if(decision==='yes'){
      completedStatus(progress,id,raw)
      progress.blocked=false
      progress.last={step:id,result:'accepted'}
      if(prior?.name){
        progress.name=prior.name
        completedStatus(progress,'name',prior.name,'consented_saved_history')
        autoContinuity(progress,prior)
      }
    }else progress.last={step:id,result:decision==='pause'?'paused':'uncertain'}
  }else if(id==='name'){
    if(skip.test(raw)){
      progress.name=''
      completedStatus(progress,id,'Preferred not to share','skipped')
      autoContinuity(progress,prior)
      progress.last={step:id,result:'skipped'}
    }else{
      const name=extractName(raw)
      if(name){
        progress.name=name
        completedStatus(progress,id,raw)
        autoContinuity(progress,prior)
        progress.last={step:id,result:'accepted'}
      }else progress.last={step:id,result:'uncertain'}
    }
  }else if(id==='continuity'){
    // A returning visitor may correct the remembered name before choosing
    // whether to continue the old topic. Do not treat a correction as a topic.
    const nameCorrection=/^(?:my name is|call me|you can call me|меня зовут|зовите меня|называйте меня|me llamo|ll[aá]mame)\s+/iu.test(raw)
      ?extractName(raw):null
    if(nameCorrection){
      progress.name=nameCorrection
      completedStatus(progress,'name',raw,'client_correction')
      progress.last={step:id,result:'name_corrected'}
      return
    }
    const selected=mode(raw)
    if(selected){
      progress.continuity=selected
      completedStatus(progress,id,raw)
      progress.last={step:id,result:'accepted'}
    }else progress.last={step:id,result:'uncertain'}
  }else if(id==='focus'){
    const selected=category(raw)
    if(selected){
      progress.focus=selected
      completedStatus(progress,id,raw)
      progress.last={step:id,result:'accepted'}
    }else progress.last={step:id,result:'uncertain'}
  }else if(id==='feelings'){
    if(skip.test(raw)||decision==='no'){
      completedStatus(progress,id,'Preferred not to share','skipped')
      progress.last={step:id,result:'skipped'}
    }else{
      progress.feelings=raw.slice(0,220)
      completedStatus(progress,id,raw)
      progress.last={step:id,result:'accepted'}
    }
  }else if(id==='confirmation'){
    if(decision==='yes'){
      completedStatus(progress,id,raw)
      progress.last={step:id,result:'accepted'}
    }else progress.last={step:id,result:decision==='pause'?'paused':'uncertain'}
  }
}
export function coachOpeningSnapshot({answers=[],latest='',prior=null,locale='en'}={}){
  const history=remembered(prior)
  const progress={schema:COACH_OPENING_VERSION,source:'client-spoken-or-typed-answers',
    locale:langOf(locale),done:Array(6).fill(false),attempts:{},
    answers:{},name:'',focus:null,continuity:null,feelings:'',last:null,blocked:false}
  const input=Array.isArray(answers)?answers.slice(0,24):[]
  for(const row of input){
    const answer=typeof row==='string'?row:row?.role==='user'?row.content:null
    if(typeof answer==='string')applyAnswer(progress,answer,history)
  }
  if(typeof latest==='string'&&latest.trim())applyAnswer(progress,latest,history)
  const nextIndex=progress.done.indexOf(false)
  progress.complete=nextIndex===-1
  progress.step=progress.complete?'complete':COACH_OPENING_STEPS[nextIndex]
  progress.stepIndex=progress.complete?6:nextIndex
  progress.lights={
    invitation:progress.done[0],
    identityAndContinuity:progress.done[1],
    focus:progress.done[3],confirmation:progress.done[5]
  }
  // No light or acceptance tone for step 5. Checkboxes remain independent.
  return Object.freeze(progress)
}
function resistanceReflection(raw,locale){
  const t=langOf(locale),s=clean(raw)
  const kind=/\b(?:privacy|data|save|record|personal information)\b|(?:приват|данны|запис|сохран)\b|(?:privacidad|datos|grabar)\b/iu.test(s)?'privacy':
    /\b(?:time|busy|minute|rush)\b|(?:нет времени|спеш|занят)\b|(?:tiempo|prisa|ocupad)\b/iu.test(s)?'time':
    /\b(?:ai|robot|trust|real person)\b|(?:ии|искусствен|робот|довер)\b|(?:ia|robot|confian)\b/iu.test(s)?'trust':
    /\b(?:afraid|scared|overwhelmed|anxious)\b|(?:боюсь|страшно|тревог|перегруж)\b|(?:miedo|ansiedad|abrumad)\b/iu.test(s)?'fear':'unsure'
  const entries={
    privacy:{en:'You decide what to share. Nothing is saved to your account without a separate save choice.',
      ru:'Вы сами решаете, чем делиться. В аккаунте ничего не сохраняется без отдельного выбора сохранить.',
      es:'Tú decides qué compartir. No guardamos nada en tu cuenta sin una decisión aparte.'},
    time:{en:'We can keep this short, or return another time.',ru:'Можем поговорить коротко или вернуться к этому позже.',es:'Podemos hablar brevemente o volver otro día.'},
    trust:{en:'I am an AI character, not a human therapist. You can stop whenever you wish.',
      ru:'Я виртуальный AI-коуч, а не живой психотерапевт. Вы можете остановиться в любой момент.',
      es:'Soy un personaje de IA, no un terapeuta humano. Puedes detenerte cuando quieras.'},
    fear:{en:'We do not need to enter a difficult subject or share anything personal.',
      ru:'Необязательно затрагивать тяжёлую тему или делиться личным.',
      es:'No hace falta entrar en un tema difícil ni contar nada personal.'},
    unsure:{en:'It is fine to be unsure. We can try a brief conversation or stop here.',
      ru:'Сомневаться нормально. Можем немного попробовать или остановиться.',
      es:'Está bien dudar. Podemos probar una charla breve o dejarlo aquí.'}
  }
  return entries[kind][t]
}
export function coachOpeningResponse({before,after,locale='en',question=null}={}){
  if(!before||!after)throw Error('COACH_OPENING_INVALID')
  const t=langOf(locale),id=after.step
  const copy={
    en:{no:'I respect your decision. We will not start a session. You can return whenever you choose.',
      accept:'Thank you for saying yes.',name:'Thank you',continue:'We can continue from what you chose.',
      feelings:'Thank you for telling me. I will keep your words in mind, without assuming more than you said.',
      skipped:'Of course. No need to explain.',ready:'Thank you. We can now explore your chosen focus.',
      unsure:'Would you like to try, or would you prefer to stop for now?'},
    ru:{no:'Уважаю ваш ответ. Начинать сессию не будем. Вы сможете вернуться, когда захотите.',
      accept:'Спасибо за согласие.',name:'Спасибо',continue:'Учтём выбранное вами направление.',
      feelings:'Спасибо, что поделились. Я услышал(а) ваши слова и не буду додумывать за вас.',
      skipped:'Конечно, объяснять не нужно.',ready:'Спасибо. Теперь можем перейти к выбранной теме.',
      unsure:'Хотите попробовать или лучше пока остановиться?'},
    es:{no:'Respeto tu decisión. No comenzaremos la sesión. Puedes volver cuando quieras.',
      accept:'Gracias por aceptar.',name:'Gracias',continue:'Seguimos con el enfoque que elegiste.',
      feelings:'Gracias por compartirlo. Tendré en cuenta tus palabras sin suponer nada más.',
      skipped:'Por supuesto, no tienes que explicar nada.',ready:'Gracias. Ahora podemos explorar el tema elegido.',
      unsure:'¿Te gustaría probar o prefieres dejarlo por ahora?'}
  }[t]
  const result=after.last?.result
  if(result==='declined')return {reflection:copy.no,question:'',progress:after}
  if(id==='invitation'){
    const text=result==='paused'?copy.unsure:resistanceReflection(after.lastUserText||'',t)
    return {reflection:text,question:question||fallback[t].invitation,progress:after}
  }
  const previous=before.step
  const reflection=previous==='invitation'&&after.done[0]?copy.accept:
    previous==='name'&&after.done[1]?(copy.name+(after.name?', '+after.name:'' )+'.'):
    previous==='continuity'&&result==='name_corrected'?(copy.name+', '+after.name+'.'):
    previous==='continuity'&&after.done[2]?copy.continue:
    previous==='feelings'&&after.done[4]?(result==='skipped'?copy.skipped:copy.feelings):
    previous==='confirmation'&&after.complete?copy.ready:''
  const memoryLine=previous==='invitation'&&after.answers.name?.source==='consented_saved_history'?
    ({en:'Last time you asked me to call you ',ru:'В прошлый раз вы просили называть вас ',es:'La vez anterior me pediste que te llamara '}[t]+after.name+'. '):''
  const nextQuestion=after.complete?({
      en:'What feels most important to explore first?',ru:'Что сейчас важнее всего исследовать вначале?',es:'¿Qué te gustaría explorar primero?'
    }[t]):question||fallback[t][id]
  return {reflection:(memoryLine+reflection).trim(),question:nextQuestion,progress:after}
}
export function coachOpeningNextQuestion(step,locale='en'){
  return fallback[langOf(locale)][step]||''
}
