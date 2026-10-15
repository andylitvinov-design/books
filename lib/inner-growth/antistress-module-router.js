// OPORA TRAUMA-1.3: six pedagogical courses and separate reported stress load.
// The optional clinical-support course AS4 is never assigned as self-guided care.
// Older NAV-2 cycles remain pinned to their original versioned lessons.
export const ANTISTRESS_ROUTER_VERSION='opora-trauma-1.3-20261015'
export const ANTISTRESS_PREVIOUS_ROUTER_VERSION='opora-nav-2.0-20261014'
export const ANTISTRESS_ACTIVE_MODULE_IDS=Object.freeze(['AS1','AS2','AS3','AS4','AS5','AS6'])
export const ANTISTRESS_MODULE_IDS=ANTISTRESS_ACTIVE_MODULE_IDS
export const ANTISTRESS_MODULE_GOALS=Object.freeze([
  Object.freeze({id:'AS1',title:{ru:'Безопасность и первая опора',en:'Safety and first supports',es:'Seguridad y primeros apoyos'},short:{ru:'Ориентировка, пауза и доступная поддержка',en:'Grounding, choice and available support',es:'Orientación, pausas y apoyo disponible'}}),
  Object.freeze({id:'AS2',title:{ru:'Стабилизация и саморегуляция',en:'Stabilization and self-regulation',es:'Estabilización y autorregulación'},short:{ru:'Ранние сигналы, регулирование нагрузки и восстановление',en:'Early signals, manageable load and recovery',es:'Señales tempranas, carga y recuperación'}}),
  Object.freeze({id:'AS3',title:{ru:'Контакт с чувствами',en:'Working with everyday emotions',es:'Contacto con emociones'},short:{ru:'Эмоциональная грамотность и возвращение к опоре',en:'Name emotions and return to support',es:'Reconocer emociones y volver al apoyo'}}),
  Object.freeze({id:'AS4',clinicalOnly:true,title:{ru:'Работа с травмой со специалистом',en:'Clinician-supported trauma care',es:'Atención del trauma con especialista'},short:{ru:'Только с квалифицированным специалистом; самопрохождение закрыто',en:'Clinician required; not self-guided treatment',es:'Requiere especialista; no es autotratamiento'}}),
  Object.freeze({id:'AS5',title:{ru:'Интеграция и самоотношение',en:'Integration and self-support',es:'Integración y relación con uno mismo'},short:{ru:'Поддерживающая внутренняя речь, ценности и границы',en:'Self-compassion, values and boundaries',es:'Autocompasión, valores y límites'}}),
  Object.freeze({id:'AS6',title:{ru:'Возвращение к жизни',en:'Returning to everyday life',es:'Regreso a la vida cotidiana'},short:{ru:'Посильные шаги, ресурсы и доступные связи',en:'Manageable actions and human connection',es:'Pasos realistas, recursos y vínculos'}}),
])
export const ANTISTRESS_MODULE_PRIMARY_METRICS=Object.freeze({
  AS1:'hh-module-finder::F2',AS2:'hh-weekly-pulse::weekly.load',
  AS3:'hh-module-finder::F4',AS4:null,
  AS5:'hh-module-finder::F7',AS6:'hh-weekly-pulse::weekly.functioning',
})
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

const label = (id, locale) => ANTISTRESS_MODULE_GOALS.find(row=>row.id===id)?.title?.[locale]||
  ANTISTRESS_MODULE_GOALS.find(row=>row.id===id)?.title?.en||''
// Inputs are NON-diagnostic authorial self-ratings. The user's learning goal and
// domain-specific scores direct the course, while load/tension affect *pace*.
export function recommendAntistressModule({weekly={},answers={},goal=null}={}) {
 const f=validateModuleFinderAnswers(answers)
 const w={load:validScore(weekly?.['weekly.load']),tension:validScore(weekly?.['weekly.tension']),
   functioning:validScore(weekly?.['weekly.functioning'])}
 const complete=[w.load,w.tension,w.functioning].every(present)
 const intensity=complete?Math.max(w.load,w.tension):null
 const has=(a,b)=>present(a)&&a<=b
 const limitedGrounding=has(f.F1,3)&&has(f.F2,3)
 const elevatedLoad=complete&&intensity>=7
 const dailyDifficulty=complete&&w.functioning<=4
 const goalIsSafe=ANTISTRESS_ACTIVE_MODULE_IDS.includes(goal)&&goal!=='AS4'
 let moduleId='AS2',reason='exploratory'
 if(limitedGrounding&&(elevatedLoad||goal==='AS1')){moduleId='AS1';reason='gentle_start'}
 else if(goalIsSafe){moduleId=goal;reason='goal_preference'}
 else if(has(f.F4,3)&&present(f.F3)){moduleId='AS3';reason='emotional_skills'}
 else if(has(f.F7,3)){moduleId='AS5';reason='self_support'}
 else if(dailyDifficulty&&complete&&intensity<=6){moduleId='AS6';reason='daily_function'}
 else if(has(f.F2,3)&&elevatedLoad){moduleId='AS1';reason='gentle_start'}
 else if(elevatedLoad){moduleId='AS2';reason='reported_overload'}
 else if(complete){moduleId='AS2';reason='general_stabilization'}
 // Only a clinician can determine appropriateness of AS4; never recommend or
 // automatically start trauma memory work from questionnaires.
 const alternatives={AS1:'AS2',AS2:'AS1',AS3:'AS2',AS4:'AS2',AS5:'AS2',AS6:'AS2'}
 const evidence=[{id:'weekly.load',value:w.load},{id:'weekly.tension',value:w.tension},
   {id:'weekly.functioning',value:w.functioning},
   ...ANTISTRESS_MODULE_FINDER_ITEMS.map(item=>({id:item.id,value:f[item.id]}))].filter(x=>present(x.value))
 const available=evidence.length
 return Object.freeze({version:ANTISTRESS_ROUTER_VERSION,moduleId,alternativeId:alternatives[moduleId],
   matched:complete,reason,goal:goalIsSafe?goal:null,
   evidence,available,provisional:!complete||available<5,
   reportedIntensity:intensity,reportedBand:null,
   pace:intensity===null?'unrated':intensity>=8?'gentle':intensity>=5?'standard':'maintenance',
   flagged:[...(limitedGrounding?['limited_grounding']:[]),...(dailyDifficulty?['daily_difficulty']:[])],
   primaryMetric:ANTISTRESS_MODULE_PRIMARY_METRICS[moduleId],
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
