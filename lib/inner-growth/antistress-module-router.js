// OPORA NAV-2.0: 5 self-guided 14-day routes based on reported stress load.
// These authorial bands are NON-CLINICAL; not a trauma-stage or PTSD diagnosis.
// AS6 remains readable only as a pinned legacy route for existing participants.
export const ANTISTRESS_ROUTER_VERSION='opora-nav-2.0-20261014'
export const ANTISTRESS_ACTIVE_MODULE_IDS=Object.freeze(['AS1','AS2','AS3','AS4','AS5'])
export const ANTISTRESS_MODULE_IDS=Object.freeze([...ANTISTRESS_ACTIVE_MODULE_IDS,'AS6'])
export const ANTISTRESS_MODULE_GOALS=Object.freeze([
 Object.freeze({id:'AS1',range:[9,10],title:{ru:'Бережное восстановление безопасности',en:'Gentle return to safety',es:'Un comienzo seguro'},
   short:{ru:'Очень высокая нагрузка · самый мягкий темп',en:'Very high strain · gentlest pace',es:'Tensión muy alta · ritmo suave'}}),
 Object.freeze({id:'AS2',range:[7,8],title:{ru:'Стабилизация и снижение перегрузки',en:'Stabilization and easing overload',es:'Estabilización y sobrecarga'},
   short:{ru:'Высокая нагрузка · возвращение опоры',en:'High strain · regaining support',es:'Tensión alta · recuperar apoyo'}}),
 Object.freeze({id:'AS3',range:[5,6],title:{ru:'Саморегуляция и восстановление ресурсов',en:'Self-regulation and recovery',es:'Autorregulación y recuperación'},
   short:{ru:'Умеренная нагрузка · больше равновесия',en:'Moderate strain · more balance',es:'Tensión moderada · equilibrio'}}),
 Object.freeze({id:'AS4',range:[3,4],title:{ru:'Гибкость в стрессовых ситуациях',en:'Flexibility with everyday stress',es:'Flexibilidad ante el estrés'},
   short:{ru:'Небольшая нагрузка · гибкий ответ',en:'Mild strain · flexible responses',es:'Tensión leve · flexibilidad'}}),
 Object.freeze({id:'AS5',range:[0,2],title:{ru:'Устойчивость и профилактика стресса',en:'Resilience and prevention',es:'Resiliencia y prevención'},
   short:{ru:'Низкая нагрузка · сохранять устойчивость',en:'Low strain · maintain resilience',es:'Tensión baja · resiliencia'}}),
])
const LEGACY_SIXTH={id:'AS6',title:{ru:'Возвращение к активной жизни',en:'Returning to daily life',es:'Volver a la vida cotidiana'}}
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
  const item=ANTISTRESS_MODULE_GOALS.find(row=>row.id===id)||(id==='AS6'?LEGACY_SIXTH:null)
  return item?.title[locale]||item?.title.en||''
}
// `goal` is an explicit preference, not a synthetic psychological classification.
// Only current, comparable 0–10 HH Weekly Pulse axes are used for stress intensity.
// The higher of reported load/tension is a conservative orientation, NOT severity triage.
// Skills (F1/F2) and marked daily difficulty can recommend a *gentler* route; never a more
// demanding route than the current stress band. User preference is a separate override.
export function recommendAntistressModule({weekly={},answers={},goal=null}={}) {
 const f=validateModuleFinderAnswers(answers)
 const w={
  load:validScore(weekly?.['weekly.load']),
  tension:validScore(weekly?.['weekly.tension']),
  functioning:validScore(weekly?.['weekly.functioning']),
 }
 const complete=present(w.load)&&present(w.tension)&&present(w.functioning)
 const intensity=complete?Math.max(w.load,w.tension):null
 const band=complete?ANTISTRESS_MODULE_GOALS.find(x=>intensity>=x.range[0]&&intensity<=x.range[1]):null
 const limitedGrounding=present(f.F1)&&present(f.F2)&&f.F1<=3&&f.F2<=3
 const dailyDifficulty=complete&&w.functioning<=3
 let moduleId=band?.id||'AS2',reason='exploratory'
 if(complete) {
  reason=intensity>=7?'reported_overload':intensity>=5?'reported_moderate':
   intensity>=3?'reported_mild':'maintenance'
  if(limitedGrounding && moduleId!=='AS1') {
   moduleId='AS1';reason='gentle_start'
  } else if(dailyDifficulty && moduleId!=='AS1') {
   // Daily difficulty justifies a gentler start, without making a clinical inference.
   moduleId=ANTISTRESS_ACTIVE_MODULE_IDS[Math.max(0,ANTISTRESS_ACTIVE_MODULE_IDS.indexOf(moduleId)-1)]
   reason='reported_functioning'
  }
 }
 const i=ANTISTRESS_ACTIVE_MODULE_IDS.indexOf(moduleId)
 const alternativeId=ANTISTRESS_ACTIVE_MODULE_IDS[i===0?1:i-1]
 const evidence=[
   {id:'weekly.load',value:w.load},{id:'weekly.tension',value:w.tension},
   {id:'weekly.functioning',value:w.functioning},
   {id:'F1',value:f.F1},{id:'F2',value:f.F2},
 ].filter(x=>present(x.value))
 const available=[w.load,w.tension,w.functioning,...Object.values(f)].filter(present).length
 return Object.freeze({
   version:ANTISTRESS_ROUTER_VERSION,moduleId,alternativeId,
   matched:complete,reason,goal:ANTISTRESS_ACTIVE_MODULE_IDS.includes(goal)?goal:null,
   evidence,available,provisional:!complete||available<11,
   reportedIntensity:intensity,reportedBand:band?.id||null,
   flagged:[...(limitedGrounding?['limited_grounding']:[]),...(dailyDifficulty?['daily_difficulty']:[])],
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
