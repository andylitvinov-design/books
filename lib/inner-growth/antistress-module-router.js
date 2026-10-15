// NAV-1.3: original educational Anti-Stress module orientation.
// Not a clinical triage instrument, diagnosis, PTSD stage, or a validated scale.
// Only raw, individually comparable, authenticated HH Weekly Pulse dimensions
// enter the algorithm. Authorial thresholds are provisional editorial gates.
export const ANTISTRESS_ROUTER_VERSION = 'opora-nav-1.3-20261014'
export const ANTISTRESS_MODULE_IDS = Object.freeze(['AS1','AS2','AS3','AS4','AS5','AS6'])
export const ANTISTRESS_MODULE_GOALS = Object.freeze([
  Object.freeze({id:'AS1',title:{ru:'Безопасность и ориентировка',en:'Safety and grounding',es:'Seguridad y orientación'},short:{ru:'Мне нужна доступная опора',en:'I need a gentle place to start',es:'Necesito un comienzo suave'}}),
  Object.freeze({id:'AS2',title:{ru:'Стабилизация и саморегуляция',en:'Stability and self-regulation',es:'Estabilidad y autorregulación'},short:{ru:'Хочу уменьшить перегрузку',en:'I want to manage everyday stress',es:'Quiero manejar el estrés'}}),
  Object.freeze({id:'AS3',title:{ru:'Чувства и эмоциональная грамотность',en:'Emotions and emotional literacy',es:'Emociones y comprensión emocional'},short:{ru:'Хочу понимать свои чувства',en:'I want to understand my feelings',es:'Quiero entender mis emociones'}}),
  Object.freeze({id:'AS4',title:{ru:'Привычные стрессовые реакции',en:'Everyday stress responses',es:'Respuestas al estrés cotidiano'},short:{ru:'Хочу замечать автоматические реакции',en:'I want to notice my stress responses',es:'Quiero reconocer mis reacciones'}}),
  Object.freeze({id:'AS5',title:{ru:'Внутренняя поддержка и ценности',en:'Self-support and values',es:'Apoyo interior y valores'},short:{ru:'Хочу относиться к себе бережнее',en:'I want more self-kindness',es:'Quiero tratarme con amabilidad'}}),
  Object.freeze({id:'AS6',title:{ru:'Возвращение к активной жизни',en:'Returning to daily life',es:'Volver a la vida cotidiana'},short:{ru:'Хочу снова действовать',en:'I want to return to everyday activities',es:'Quiero recuperar mis actividades'}}),
])
export const ANTISTRESS_MODULE_FINDER_ITEMS = Object.freeze([
  Object.freeze({id:'F1',moduleId:'AS1',text:{ru:'Мне удавалось направлять внимание к нейтральным предметам вокруг.',en:'I could direct my attention to neutral objects around me.',es:'Podía dirigir mi atención a objetos neutros de mi entorno.'}}),
  Object.freeze({id:'F2',moduleId:'AS1',text:{ru:'Мне удавалось остановиться, уменьшить нагрузку или выбрать паузу.',en:'I could stop, reduce a demand or take a break.',es:'Podía detenerme, reducir una exigencia o descansar.'}}),
  Object.freeze({id:'F3',moduleId:'AS3',text:{ru:'Мне удавалось определить и назвать своё чувство.',en:'I could identify and name what I was feeling.',es:'Podía reconocer y nombrar lo que sentía.'}}),
  Object.freeze({id:'F4',moduleId:'AS3',text:{ru:'При неприятных чувствах мне удавалось при необходимости возвращаться к доступной опоре.',en:'When feelings were uncomfortable, I could return to a safe anchor if needed.',es:'Ante sentimientos incómodos, podía volver a un apoyo si lo necesitaba.'}}),
  Object.freeze({id:'F5',moduleId:'AS4',text:{ru:'Мне удавалось замечать свою привычную реакцию на повседневный стресс.',en:'I could notice my usual reaction to everyday stress.',es:'Podía reconocer mi reacción habitual al estrés diario.'}}),
  Object.freeze({id:'F6',moduleId:'AS4',text:{ru:'В обычной стрессовой ситуации мне удавалось сделать паузу и выбрать посильную реакцию.',en:'In an everyday stressful situation, I could pause and choose a manageable response.',es:'En una situación estresante cotidiana, podía parar y elegir una respuesta posible.'}}),
  Object.freeze({id:'F7',moduleId:'AS5',text:{ru:'В трудные моменты мне удавалось поддержать себя без чрезмерного самообвинения.',en:'In difficult moments, I could support myself without excessive self-blame.',es:'En momentos difíciles podía apoyarme sin culparme en exceso.'}}),
  Object.freeze({id:'F8',moduleId:'AS5',text:{ru:'Даже при напряжении мне удавалось понимать, что для меня важно.',en:'Even when stressed, I could recognize what matters to me.',es:'Incluso con estrés, podía reconocer lo que es importante para mí.'}}),
])

export function validateModuleFinderAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('MODULE_FINDER_INVALID')
  const allowed = new Set(ANTISTRESS_MODULE_FINDER_ITEMS.map(item=>item.id))
  if (Object.keys(answers).some(key=>!allowed.has(key))) throw new Error('MODULE_FINDER_INVALID')
  const cleaned = {}
  for (const {id} of ANTISTRESS_MODULE_FINDER_ITEMS) {
    const value = answers[id]
    if (value === null || value === undefined) cleaned[id] = null
    else if (Number.isInteger(value) && value >= 0 && value <= 10) cleaned[id] = value
    else throw new Error('MODULE_FINDER_INVALID')
  }
  return cleaned
}

const validScore = value => Number.isInteger(value) && value>=0 && value<=10 ? value : null
const present = value => value !== null && value !== undefined
export function weeklyAxesFromResults(results, now=Date.now()) {
  const rows = (Array.isArray(results)?results:[])
    .filter(row=>row && row.definitionKey==='hh-weekly-pulse' && row.definitionVersion==='v1' &&
      ['ru','en'].includes(row.instrumentLocale) &&
      Number.isFinite(Date.parse(row.measurementAt||'')) &&
      Date.parse(row.measurementAt)<=now && now-Date.parse(row.measurementAt)<=7*86400000 &&
      Array.isArray(row.dimensions))
    .sort((a,b)=>Date.parse(b.measurementAt)-Date.parse(a.measurementAt))
  const latest=rows[0]
  const expected=['weekly.load','weekly.tension','weekly.functioning']
  const axes={}
  if (!latest) return {ready:false,values:{},resultId:null,measuredAt:null}
  for(const key of expected) {
    const matched=latest.dimensions.filter(d=>d?.key===key)
    if(matched.length!==1 || validScore(matched[0].value)===null || matched[0].min!==0 || matched[0].max!==10) {
      return {ready:false,values:{},resultId:null,measuredAt:null}
    }
    axes[key]=matched[0].value
  }
  return {ready:true,values:axes,resultId:latest.id,measuredAt:latest.measurementAt}
}

const label = (id, locale) => {
  const item=ANTISTRESS_MODULE_GOALS.find(row=>row.id===id)
  return item?.title[locale]||item?.title.en||''
}
// `goal` is an explicit preference, not a synthetic psychological classification.
export function recommendAntistressModule({weekly={},answers={},goal=null}={}) {
  const f=validateModuleFinderAnswers(answers)
  const w={
    load:validScore(weekly?.['weekly.load']),
    tension:validScore(weekly?.['weekly.tension']),
    functioning:validScore(weekly?.['weekly.functioning']),
  }
  const flags={
    AS1:present(f.F1)&&present(f.F2)&&f.F1<=3&&f.F2<=3,
    AS2:(present(w.load)&&w.load>=7)||(present(w.tension)&&w.tension>=7),
    AS3:(present(f.F3)&&f.F3<=3)||(present(f.F4)&&f.F4<=3),
    AS4:(present(f.F5)&&f.F5<=3)||(present(f.F6)&&f.F6<=3),
    AS5:(present(f.F7)&&f.F7<=3)||(present(f.F8)&&f.F8<=3),
    AS6:present(w.functioning)&&w.functioning<=4,
  }
  const confidence = [w.load,w.tension,w.functioning,...Object.values(f)].filter(present).length
  const validGoal=ANTISTRESS_MODULE_IDS.includes(goal)?goal:null
  let recommended = null
  if(flags.AS1) recommended='AS1'
  else if(validGoal&&flags[validGoal]) recommended=validGoal
  else if(flags.AS2) recommended='AS2'
  else if(flags.AS6) recommended='AS6'
  else if(validGoal) recommended=validGoal
  else recommended=['AS3','AS4','AS5','AS1'].find(id=>flags[id])||'AS2'
  const alternative = ANTISTRESS_MODULE_IDS
    .filter(id=>id!==recommended)
    .sort((a,b)=>Number(flags[b])-Number(flags[a])||
      (a==='AS2'?-1:b==='AS2'?1:0)||a.localeCompare(b))[0]
  const evidence={
    AS1:[{id:'F1',value:f.F1},{id:'F2',value:f.F2}].filter(x=>present(x.value)),
    AS2:[{id:'weekly.load',value:w.load},{id:'weekly.tension',value:w.tension}].filter(x=>present(x.value)),
    AS3:[{id:'F3',value:f.F3},{id:'F4',value:f.F4}].filter(x=>present(x.value)),
    AS4:[{id:'F5',value:f.F5},{id:'F6',value:f.F6}].filter(x=>present(x.value)),
    AS5:[{id:'F7',value:f.F7},{id:'F8',value:f.F8}].filter(x=>present(x.value)),
    AS6:[{id:'weekly.functioning',value:w.functioning}].filter(x=>present(x.value)),
  }
  return Object.freeze({
    version:ANTISTRESS_ROUTER_VERSION,
    moduleId:recommended,alternativeId:alternative,
    matched:flags[recommended],reason:flags.AS1&&recommended==='AS1'?'gentle_start':
      validGoal===recommended?'personal_goal':
      flags.AS2&&recommended==='AS2'?'reported_overload':
      flags.AS6&&recommended==='AS6'?'reported_functioning':
      flags[recommended]?'reported_skill':'exploratory',
    goal:validGoal, evidence:evidence[recommended],
    available:confidence,provisional:confidence<11||!flags[recommended],
    flagged:Object.keys(flags).filter(key=>flags[key]),
  })
}
export const antistressModuleTitle=(id,locale='en')=>label(id,['ru','en','es'].includes(locale)?locale:'en')

// Backwards-compatible encrypted concerns envelope. Only use inside the
// account-authenticated server repository, never localStorage or URL params.
const MARKER='hh-opora-module-choice-v1'
export function unpackCourseModuleContext(value) {
  const raw=typeof value==='string'?value:''
  if(!raw.startsWith('{'))return {concerns:raw,moduleChoice:null}
  try{
    const parsed=JSON.parse(raw)
    if(parsed?.schema!==MARKER || typeof parsed.concerns!=='string' ||
       !ANTISTRESS_MODULE_IDS.includes(parsed.moduleChoice?.id))return {concerns:raw,moduleChoice:null}
    return {concerns:parsed.concerns,moduleChoice:parsed.moduleChoice}
  }catch{return {concerns:raw,moduleChoice:null}}
}
export function packCourseModuleContext(concerns,choice) {
  if(typeof concerns!=='string'||!ANTISTRESS_MODULE_IDS.includes(choice?.id))throw new Error('MODULE_CHOICE_INVALID')
  return JSON.stringify({schema:MARKER,concerns,moduleChoice:choice})
}
