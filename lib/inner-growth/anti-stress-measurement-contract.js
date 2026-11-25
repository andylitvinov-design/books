// The measurement contract for OPORA Anti-Stress (educational, not diagnostic).
// Keep original test results in their own scales and recall windows. Never
// calculate a blended "recovery index" or infer causation from completion.
export const ANTISTRESS_MEASUREMENT_TESTS = Object.freeze({
  primary:'hh-weekly-pulse',anxiety:'gad-7',optionalResource:'hh-resource-pulse',
})
const definitions=Object.freeze({
  'weekly.load': {order:0,role:'primary',direction:'lower',
    ru:'Стресс и перегрузка',en:'Stress and overload'},
  'weekly.tension': {order:1,role:'secondary',direction:'lower',
    ru:'Тревога и внутреннее напряжение',en:'Anxiety and inner tension'},
  'weekly.recovery': {order:2,role:'secondary',direction:'higher',
    ru:'Сон и восстановление',en:'Sleep and recovery'},
  'weekly.functioning': {order:3,role:'secondary',direction:'higher',
    ru:'Повседневное функционирование',en:'Daily functioning'},
  'weekly.connection': {order:4,role:'supplementary',direction:'higher',
    ru:'Контакт и поддержка',en:'Connection and support'},
  'weekly.mood': {order:5,role:'exploratory',direction:'higher',
    ru:'Эмоциональное состояние',en:'Emotional state'},
  'weekly.energy': {order:6,role:'exploratory',direction:'higher',
    ru:'Доступная энергия',en:'Usable energy'},
  'weekly.clarity': {order:7,role:'exploratory',direction:'higher',
    ru:'Ясность мышления',en:'Mental clarity'},
  'symptoms.gad7.total': {order:0,role:'anxiety_screening',direction:'lower',
    ru:'Тревожные симптомы · GAD-7',en:'Anxiety symptoms · GAD-7'},
  'resource.self_support': {order:0,role:'optional',direction:'higher',
    ru:'Самоподдержка',en:'Self-support'},
  'resource.agency': {order:1,role:'optional',direction:'higher',
    ru:'Свобода выбора следующего шага',en:'Ability to choose the next step'},
  'resource.support': {order:2,role:'optional',direction:'higher',
    ru:'Доступность поддержки',en:'Available support'},
  'resource.energy': {order:3,role:'optional',direction:'higher',
    ru:'Ресурс энергии сейчас',en:'Energy available now'},
  'resource.connection': {order:4,role:'optional',direction:'higher',
    ru:'Контакт с людьми сейчас',en:'Connection now'},
  'resource.meaning': {order:5,role:'optional',direction:'higher',
    ru:'Ощущение смысла сейчас',en:'Sense of meaning now'},
})
export const ANTISTRESS_MEASUREMENT_AXES=Object.freeze(definitions)

const testAxis={
  'hh-weekly-pulse':new Set([
    'weekly.load','weekly.tension','weekly.recovery','weekly.functioning',
    'weekly.connection','weekly.mood','weekly.energy','weekly.clarity',
  ]),
  'gad-7':new Set(['symptoms.gad7.total']),
  'hh-resource-pulse':new Set([
    'resource.self_support','resource.agency','resource.support',
    'resource.energy','resource.connection','resource.meaning',
  ]),
}
export const antistressTestWindow=key=>({
  'hh-weekly-pulse':'past-7-days','gad-7':'past-2-weeks',
  'hh-resource-pulse':'right-now',
})[key]||null

export function antistressRoleForScale(testKey,scaleKey) {
  if(!testAxis[testKey]?.has(scaleKey))return null
  return ANTISTRESS_MEASUREMENT_AXES[scaleKey]?.role||null
}

// Ordering makes the exact pre-registered primary score visible first at T0
// and T14, but NEVER changes the original score, severity or direction.
export function orderAntistressScales(testKey,rows=[]) {
  if(!Array.isArray(rows))return []
  const expected=testAxis[testKey]
  if(!expected)return [...rows]
  return [...rows].sort((a,b)=>{
    const rank=value=>{
      const key=typeof value?.key==='string' ? value.key
        :typeof value?.id==='string' ? value.id.slice(value.id.indexOf('::')+2):null
      return expected.has(key)?ANTISTRESS_MEASUREMENT_AXES[key]?.order??999:1000
    }
    return rank(a)-rank(b)
  })
}

export function antistressOutcomeLabel(testKey,scaleKey,locale='en') {
  if(!testAxis[testKey]?.has(scaleKey))return null
  const definition=ANTISTRESS_MEASUREMENT_AXES[scaleKey]
  return definition?.[locale==='ru'?'ru':'en']||null
}

export function antistressSelectedMeasures(testKeys=[],locale='en') {
  const selected=new Set(testKeys)
  return [ANTISTRESS_MEASUREMENT_TESTS.primary,
    ANTISTRESS_MEASUREMENT_TESTS.anxiety,
    ANTISTRESS_MEASUREMENT_TESTS.optionalResource]
    .filter(key=>selected.has(key))
    .map(key=>({
      testKey:key,window:antistressTestWindow(key),
      scales:[...testAxis[key]].sort((a,b)=>
        (ANTISTRESS_MEASUREMENT_AXES[a].order??99)-(ANTISTRESS_MEASUREMENT_AXES[b].order??99))
        .map(id=>({id,role:ANTISTRESS_MEASUREMENT_AXES[id].role,
          direction:ANTISTRESS_MEASUREMENT_AXES[id].direction,
          label:antistressOutcomeLabel(key,id,locale)})),
    }))
}
