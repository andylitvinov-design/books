// Holistic House · cost-free Coaching Intelligence P1.
// All matching runs in memory in the client. There are no model/provider calls,
// clinical inferences, analytics, new client-answer tables or hidden session writes.
const langs=['en','ru','es']
const local=(value,lang)=>value?.[lang]||value?.en||''
const actionStages=new Set(['options','action','plan','step','will','affirm','destiny','design'])
const actionOrder=['first_step','plan','action','step','will','destiny']
const directionOrder=['options','design']
const timingChoiceIds=new Set(['today','week','month','later'])
const focusOrder=['goal','outcome','preferred','wish','topic','frame','contract','define']
const situationOrder=['obstacle','reality','understand','listen','explore','scaling','scale']
const resourceOrder=['resources','knowhow','exceptions','discover','affirm']
const timeOrder=['when','will','plan']

const cues={
  time:{
    why:{en:'You mentioned limited time. Look for a step that fits your actual schedule.',
      ru:'Вы отметили нехватку времени. Выберите шаг, который вписывается в реальное расписание.',
      es:'Mencionaste poco tiempo. Busca un paso que encaje en tu horario real.'},
    action:{en:'Which small option could fit into the time you actually have?',
      ru:'Какой небольшой вариант поместится в то время, которое у вас реально есть?',
      es:'¿Qué pequeña opción cabe en el tiempo del que dispones?'},
    timing:{en:'When could you reserve a small amount of time for your next step?',
      ru:'Когда вы могли бы выделить немного времени на следующий шаг?',
      es:'¿Cuándo podrías reservar un poco de tiempo para el siguiente paso?'},
  },
  clarity:{
    why:{en:'You mentioned uncertainty. A small experiment can bring information without requiring a final decision.',
      ru:'Вы отметили неопределённость. Небольшой эксперимент поможет получить информацию без окончательного решения.',
      es:'Mencionaste dudas. Una prueba pequeña puede aportar información sin una decisión definitiva.'},
    action:{en:'Which option could give you useful information before a bigger decision?',
      ru:'Какой вариант поможет получить нужные сведения до более важного решения?',
      es:'¿Qué opción te daría información útil antes de tomar una decisión mayor?'},
    timing:{en:'When could you take one small step toward more clarity?',
      ru:'Когда вы могли бы сделать небольшой шаг к большей ясности?',
      es:'¿Cuándo podrías dar un paso pequeño para ganar claridad?'},
  },
  confidence:{
    why:{en:'You noticed hesitation. Consider a step that is safe to try and easy to revise.',
      ru:'Вы заметили сомнения. Подумайте о шаге, который безопасно попробовать и легко изменить.',
      es:'Notaste dudas. Considera un paso seguro y fácil de revisar.'},
    action:{en:'Which small, reversible option is possible even if some doubt remains?',
      ru:'Какой небольшой обратимый вариант возможен, даже если сомнения остаются?',
      es:'¿Qué opción pequeña y reversible es posible aunque aún tengas dudas?'},
    timing:{en:'When would you feel ready to test a small, reversible step?',
      ru:'Когда вы были бы готовы попробовать небольшой обратимый шаг?',
      es:'¿Cuándo te sentirías listo para probar un paso pequeño y reversible?'},
  },
  resources:{
    why:{en:'You mentioned resources or support. Begin with what is already available rather than assuming more is needed.',
      ru:'Вы отметили ресурсы или поддержку. Начните с уже доступного, не предполагая, что нужно больше.',
      es:'Mencionaste recursos o apoyo. Empieza con lo que ya tienes disponible.'},
    action:{en:'Which option can you try using resources already available to you?',
      ru:'Какой вариант можно попробовать, используя уже доступные ресурсы?',
      es:'¿Qué opción puedes probar con los recursos que ya tienes?'},
    timing:{en:'When could you use one resource already within reach?',
      ru:'Когда вы могли бы воспользоваться одним уже доступным ресурсом?',
      es:'¿Cuándo podrías utilizar un recurso que ya tienes a mano?'},
  },
  stuck:{
    why:{en:'You said progress feels blocked. Consider a different, manageable experiment, not a leap.',
      ru:'Вы отметили ощущение застоя. Рассмотрите другой посильный эксперимент, а не резкий рывок.',
      es:'Dijiste que te sientes bloqueado. Considera un experimento manejable, no un salto enorme.'},
    action:{en:'Which different, manageable option could you test first?',
      ru:'Какой другой посильный вариант вы могли бы попробовать первым?',
      es:'¿Qué opción diferente y manejable podrías probar primero?'},
    timing:{en:'When could you try one small alternative to your current approach?',
      ru:'Когда вы могли бы попробовать маленькую альтернативу привычному подходу?',
      es:'¿Cuándo podrías probar una pequeña alternativa a tu enfoque actual?'},
  },
  support:{
    why:{en:'You identified the value of support. Keep the choice of asking for help in your own hands.',
      ru:'Вы отметили ценность поддержки. Решение обратиться за помощью остаётся за вами.',
      es:'Identificaste el valor del apoyo. Tú decides si pedir ayuda.'},
    action:{en:'Which possible next step could include support from someone you choose?',
      ru:'Какой из следующих шагов может включать поддержку человека, которого вы выберете?',
      es:'¿Qué posible paso podría incluir apoyo de alguien que elijas?'},
    timing:{en:'When might it feel right to ask someone you trust for support?',
      ru:'Когда вам было бы удобно обратиться за поддержкой к человеку, которому доверяете?',
      es:'¿Cuándo te vendría bien pedir apoyo a alguien de confianza?'},
  },
}
function stepOf(item){return String(item?.stepKey||item?.stage||'')}
function choiceCue(item,value){
  if(typeof value!=='string'||!value.startsWith('choice:'))return null
  const id=value.slice(7),stage=stepOf(item)
  if(id==='stuck'||id==='not_started')return 'stuck'
  if(['clarity','unclear','uncertain','not_sure','unsure'].includes(id))return 'clarity'
  if(['confidence','doubt','hesitation'].includes(id))return 'confidence'
  if(id==='time'&&['obstacle','understand','explore','reality'].includes(stage))return 'time'
  if(['resources','limited_resources'].includes(id))return 'resources'
  if(['people','ask','support'].includes(id))return 'support'
  if(['experience','skills'].includes(id)&&['knowhow','resources','discover'].includes(stage))return 'resources'
  return null
}
function textCue(value){
  if(typeof value!=='string'||!value.trim()||value.startsWith('choice:'))return null
  // Do not mine sensitive narratives; use only a few explicit, nonclinical words.
  const text=value.toLowerCase().slice(0,350).replace(/ё/g,'е')
  if(/(?:\b(?:time|deadline|schedule)\b|нехватк[а-я]* врем|нет времени|falta de tiempo)/u.test(text))return 'time'
  if(/(?:\b(?:unsure|unclear|uncertain)\b|не знаю|неясн|no se|no sé)/u.test(text))return 'clarity'
  if(/(?:\b(?:hesitat|doubt)\w*\b|сомнева|сомнен|duda)/u.test(text))return 'confidence'
  if(/(?:\b(?:stuck|blocked)\b|застрял|застряла|bloquead)/u.test(text))return 'stuck'
  return null
}
function mostRecentCue(questions,index,answers){
  for(let i=index-1;i>=Math.max(0,index-3);i--){
    const question=questions[i],value=answers?.[question?.id]
    const clue=choiceCue(question,value)||textCue(value)
    if(clue)return clue
  }
  return null
}
function previousScale(questions,index,answers){
  const last=questions[index-1]
  if(last?.type!=='scale_0_10')return null
  const raw=answers?.[last.id]
  if(typeof raw!=='string'||!/^choice:(?:10|[0-9])$/.test(raw))return null
  return Number(raw.slice(7))
}
// Returns a proposed prompt, never a new question ID or a new client record.
// Original published wording remains available from the UI on every slide.
export function coachingAdaptivePrompt({question,questions=[],index=0,answers={},locale='en',requiredCustomPlan=false}={}){
  if(!question||index<1||!Array.isArray(questions)||question.type==='scale_0_10')return null
  const step=stepOf(question),lang=langs.includes(locale)?locale:'en'
  if(requiredCustomPlan&&index===questions.length-1)return null // WOOP authored if-then plan
  if((step==='knowhow'||step==='resources')&&previousScale(questions,index,answers)!==null){
    const score=previousScale(questions,index,answers)
    return {
      key:'scale_resource',
      prompt:local(score<=3
        ?{en:'Which resource could help you make one small improvement from here?',
          ru:'Какой ресурс поможет вам сделать отсюда одно небольшое улучшение?',
          es:'¿Qué recurso podría ayudarte a mejorar un poco desde aquí?'}
        :{en:'Which resource has helped you reach this point?',
          ru:'Какой ресурс уже помог вам оказаться на этой отметке?',
          es:'¿Qué recurso te ayudó a llegar a este punto?'},lang),
      why:local({en:'Your own 0–10 rating is a reflection aid, not a clinical score.',
        ru:'Ваша оценка 0–10 — инструмент размышления, а не клинический балл.',
        es:'Tu valoración 0–10 ayuda a reflexionar; no es una puntuación clínica.'},lang),
    }
  }
  if(!actionStages.has(step))return null
  const cue=mostRecentCue(questions,index,answers)
  if(!cue)return null
  const timing=question.id==='when'||Array.isArray(question.choices)&&
    question.choices.some(choice=>['today','week','month','later'].includes(choice.id))
  return {key:cue,prompt:local(cues[cue][timing?'timing':'action'],lang),why:local(cues[cue].why,lang)}
}

export function coachingAnswerText(value,question,locale='en'){
  if(typeof value!=='string'||!value.trim())return ''
  if(!value.startsWith('choice:'))return value.trim()
  const id=value.slice(7)
  if(question?.type==='scale_0_10'&&/^(?:10|[0-9])$/.test(id))return id+'/10'
  const match=question?.choices?.find(choice=>choice.id===id)
  return match?local(match.label,locale):''
}
function firstFor(items,keys,role){
  for(const key of keys){
    const match=items.find(row=>row.step===key&&row.value&&row.role===role)
    if(match)return {questionId:match.id,value:match.value}
  }
  return null
}
// A selected date, resource or area of change is NOT automatically a chosen action.
// An explicit pause/uncertainty is not inflated to a commitment either.
function recapRole(question,answer){
  const step=question.id==='first_step'?'first_step':question.id==='when'?'when':stepOf(question)
  const choiceId=typeof answer==='string'&&answer.startsWith('choice:')?answer.slice(7):null
  if(!answer||choiceId==='pause'||choiceId==='unsure'||choiceId==='not_sure')return null
  if(step==='review')return null
  if(step==='when'||(timingChoiceIds.has(choiceId)&&['will','plan'].includes(step)))return 'timing'
  if(['resources','knowhow','exceptions','discover','affirm'].includes(step))return 'resources'
  if(step==='scaling'||step==='scale')return 'baseline'
  if(focusOrder.includes(step))return 'focus'
  if(situationOrder.includes(step))return 'situation'
  if(directionOrder.includes(step))return 'direction'
  if(actionOrder.includes(step))return 'action'
  return null
}
const recapLabels={
  en:{focus:'My focus',situation:'The situation I described',baseline:'My own starting rating',
    resources:'Resources I identified',direction:'Direction I want to explore',
    action:'Possible next step I chose',timing:'Timing I chose'},
  ru:{focus:'Мой фокус',situation:'Описанная ситуация',baseline:'Моя исходная самооценка',
    resources:'Отмеченные ресурсы',direction:'Вариант для исследования',
    action:'Мой возможный следующий шаг',timing:'Выбранный срок'},
  es:{focus:'Mi foco',situation:'La situación que describí',baseline:'Mi valoración inicial',
    resources:'Recursos que identifiqué',direction:'Dirección que deseo explorar',
    action:'Posible próximo paso que elegí',timing:'Momento que elegí'},
}
// Reproduce only actual client-owned saved selections. No inference, diagnosis,
// action invented from a review score, or due date mislabelled as a task.
export function buildCoachingRecap(session,questions=[],locale='en'){
  const lang=langs.includes(locale)?locale:'en'
  const answers=session?.answers||{}
  const items=(Array.isArray(questions)?questions:[]).map(q=>{
    const raw=answers[q.id]
    return {id:q.id,step:q.id==='first_step'?'first_step':q.id==='when'?'when':stepOf(q),
      value:coachingAnswerText(raw,q,lang),role:recapRole(q,raw)}
  })
  const roles=[
    ['focus',focusOrder],
    ['situation',['obstacle','reality','understand','listen','explore']],
    ['baseline',['scaling','scale']],
    ['resources',resourceOrder],
    ['direction',directionOrder],
    ['action',actionOrder],
    ['timing',timeOrder],
  ]
  return roles.map(([key,order])=>{
    const picked=firstFor(items,order,key)
    return picked?{key,label:recapLabels[lang][key],...picked}:null
  }).filter(Boolean)
}
export function coachingRecapClipboardText(session,questions=[],locale='en'){
  const lang=langs.includes(locale)?locale:'en'
  const rows=buildCoachingRecap(session,questions,lang)
  const heading={en:'Personal coaching session',ru:'Личная коуч-сессия',es:'Sesión personal de coaching'}[lang]
  const original={en:'My question',ru:'Мой вопрос',es:'Mi pregunta'}[lang]
  return [heading,session?.clientQuestion?original+': '+session.clientQuestion:'',...rows.map(r=>r.label+': '+r.value)]
    .filter(Boolean).join('\n\n')
}
