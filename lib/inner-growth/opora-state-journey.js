// Presentation-level support for every OPORA guided lesson except the
// bespoke AS2 Day 1. Never alter immutable syllabus text or pinned lesson IDs.
// These are optional educational choices, not a diagnosis, outcome scale or
// evidence that an action was performed.
export const OPORA_STATE_JOURNEY_SCHEMA='opora-state-journey-v1'
export const OPORA_STATE_JOURNEY_CHOICES=Object.freeze({
  need:Object.freeze([
    {id:'space',ru:'Чуть больше пространства',en:'A little more space'},
    {id:'rest',ru:'Отдых',en:'Rest'},
    {id:'clarity',ru:'Больше ясности',en:'More clarity'},
    {id:'human',ru:'Поддержка человека',en:'Human support'},
    {id:'none',ru:'Пока не знаю',en:'Not sure yet'},
    {id:'skip',ru:'Не выбирать',en:'Skip'},
  ].map(Object.freeze)),
  support:Object.freeze([
    {id:'pause',ru:'Небольшая пауза',en:'A brief pause'},
    {id:'orient',ru:'Внешний ориентир',en:'An ordinary object'},
    {id:'reduce',ru:'Уменьшить нагрузку',en:'Reduce demands'},
    {id:'rest',ru:'Отдохнуть',en:'Rest'},
    {id:'human',ru:'Попросить поддержки',en:'Ask for support'},
    {id:'none',ru:'Сейчас ничего',en:'Nothing right now'},
    {id:'skip',ru:'Не выбирать',en:'Skip'},
  ].map(Object.freeze)),
  experience:Object.freeze([
    {id:'clearer',ru:'Лучше понимаю своё состояние',en:'My state feels clearer'},
    {id:'more_choice',ru:'Чуть больше свободы выбора',en:'A little more choice'},
    {id:'easier',ru:'Стало немного легче',en:'I feel a little easier'},
    {id:'unchanged',ru:'Без заметных изменений',en:'No noticeable change'},
    {id:'uncomfortable',ru:'Стало некомфортно',en:'I felt uncomfortable'},
    {id:'unsure',ru:'Пока не знаю',en:'Not sure yet'},
    {id:'skip',ru:'Не хочу отвечать',en:'Prefer not to say'},
  ].map(Object.freeze)),
})
const SIGNAL_LABELS=Object.freeze({
  tense:{ru:'Напряжение',en:'Tension'},
  low:{ru:'Мало сил',en:'Low energy'},
  steady:{ru:'Ровное состояние',en:'Steady'},
  unsure:{ru:'Пока неясно',en:'Unclear'},
})
export function validateOporaStateJourney(raw){
  if(raw===undefined||raw===null)return null
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('INVALID_OPORA_STATE_JOURNEY')
  const result={}
  for(const [field,value] of Object.entries(raw)){
    if(!Object.hasOwn(OPORA_STATE_JOURNEY_CHOICES,field)||
      typeof value!=='string'||!OPORA_STATE_JOURNEY_CHOICES[field].some(x=>x.id===value))
      throw new Error('INVALID_OPORA_STATE_JOURNEY')
    result[field]=value
  }
  return result
}
export function oporaStateJourneySummary(raw,initialFeeling,locale='en'){
  const lang=locale==='ru'?'ru':'en'
  const normalized=validateOporaStateJourney(raw)
  const get=(field)=>OPORA_STATE_JOURNEY_CHOICES[field].find(x=>x.id===normalized?.[field]&&x.id!=='skip')?.[lang]||null
  const signal=SIGNAL_LABELS[initialFeeling]?.[lang]||null
  const need=get('need'),support=get('support'),experience=get('experience')
  if(!signal&&!need&&!support&&!experience)return null
  return {signal,need,support,experience}
}
