import { recommendProfileBattery } from './profile-battery.js'
import { goalSupportFacetForScale } from './goal-profile.js'

/**
 * One source of truth for five public profile directions and their topics.
 * An axis describes what a versioned scorer actually measures; a catalogue
 * topic describes why the questionnaire can be relevant to a life area.
 * They are deliberately not interchangeable.
 */
export const PROFILE_FOCUS_AREAS = Object.freeze({
  wellbeing: ['emotions', 'recovery', 'body'],
  relationships: ['connection'],
  work: ['work', 'money'],
  identity: ['traits', 'support', 'meaning'],
  goal: ['goal'],
})

export const PROFILE_AREA_AXES = Object.freeze({
  traits: ['personality'],
  support: ['resource', 'self_support'],
  emotions: ['stress', 'anxiety', 'mood', 'emotional_regulation'],
  recovery: ['sleep', 'energy'],
  body: ['embodiment', 'energy'],
  connection: ['relationships', 'intimacy', 'boundaries', 'sexual_wellbeing', 'personality'],
  work: ['clarity', 'focus', 'functioning', 'stress', 'personality'],
  money: ['resource', 'stress', 'functioning', 'meaning', 'self_support'],
  meaning: ['meaning'],
  goal: ['clarity', 'meaning', 'energy', 'resource', 'focus', 'functioning', 'self_support'],
})


const researchAxis = (id, sourceAxis, en, ru, es) => Object.freeze({
  id, sourceAxis, label: Object.freeze({ en, ru, es }),
})

// These are RESEARCH QUESTIONS / presentation facets, not new scores, cutoffs,
// diagnoses, or interchangeable test norms. A facet exists in the UI only when
// an existing versioned source scale can actually support it. Do not equate
// two measurements, or two languages, merely because they share a facet.
export const PROFILE_RESEARCH_AXES = Object.freeze({
  emotions: Object.freeze([
    researchAxis('stress', 'stress', 'Perceived stress / load', 'Стресс и нагрузка', 'Estrés percibido'),
    researchAxis('anxiety', 'anxiety', 'Worry / anxiety', 'Тревога и беспокойство', 'Ansiedad y preocupación'),
    researchAxis('mood', 'mood', 'Mood / emotional state', 'Настроение', 'Estado de ánimo'),
    researchAxis('regulation', 'emotional_regulation', 'Emotional regulation', 'Регуляция эмоций', 'Regulación emocional'),
  ]),
  recovery: Object.freeze([
    researchAxis('sleep', 'sleep', 'Sleep / rest', 'Сон и отдых', 'Sueño y descanso'),
    researchAxis('energy', 'energy', 'Energy / fatigue', 'Энергия и усталость', 'Energía y fatiga'),
  ]),
  body: Object.freeze([
    researchAxis('body_awareness', 'embodiment', 'Body awareness / presence', 'Контакт с телом', 'Conciencia corporal'),
    researchAxis('body_energy', 'energy', 'Body comfort / energy (self-report)', 'Телесный комфорт и энергия (самоотчёт)', 'Sensaciones corporales y energía'),
  ]),
  connection: Object.freeze([
    researchAxis('social_connection', 'relationships', 'Connection and support', 'Контакт и поддержка', 'Conexión y apoyo'),
    researchAxis('intimacy', 'intimacy', 'Emotional closeness', 'Эмоциональная близость', 'Cercanía emocional'),
    researchAxis('boundaries', 'boundaries', 'Boundaries and choice', 'Границы и право выбора', 'Límites y elección'),
    researchAxis('sexual_wellbeing', 'sexual_wellbeing', 'Sexual self-acceptance', 'Самопринятие в сексуальности', 'Autoaceptación sexual'),
    researchAxis('relational_traits', 'personality', 'Social traits (descriptive)', 'Черты в общении (описательно)', 'Rasgos sociales (descriptivos)'),
  ]),
  work: Object.freeze([
    researchAxis('focus', 'focus', 'Attention and task focus', 'Внимание и фокус на задаче', 'Atención y concentración'),
    researchAxis('clarity', 'clarity', 'Clarity and decisions', 'Ясность и решения', 'Claridad y decisiones'),
    researchAxis('functioning', 'functioning', 'Daily functioning (not job performance)', 'Повседневные действия (не оценка работы)', 'Funcionamiento diario (no rendimiento laboral)'),
    researchAxis('workload', 'stress', 'Work-related strain', 'Рабочая нагрузка и напряжение', 'Presión laboral'),
    researchAxis('working_style', 'personality', 'Work-related dispositions (traits)', 'Рабочие склонности (черты)', 'Rasgos en el trabajo'),
  ]),
  money: Object.freeze([
    researchAxis('financial_wellbeing', 'resource', 'Financial well-being (source-specific)', 'Финансовое благополучие (по методике)', 'Bienestar financiero (según la prueba)'),
    researchAxis('money_pressure', 'stress', 'Money-related pressure', 'Финансовое напряжение', 'Presión económica'),
    researchAxis('financial_coping', 'resource', 'Money-related coping resources', 'Ресурсы для решения денежных трудностей', 'Recursos ante dificultades económicas'),
  ]),
  traits: Object.freeze([
    researchAxis('extraversion', 'personality', 'Extraversion', 'Экстраверсия', 'Extraversión'),
    researchAxis('agreeableness', 'personality', 'Agreeableness', 'Доброжелательность', 'Amabilidad'),
    researchAxis('conscientiousness', 'personality', 'Conscientiousness', 'Добросовестность', 'Responsabilidad'),
    researchAxis('emotional_reactivity', 'personality', 'Emotional reactivity / stability', 'Эмоциональная реактивность / устойчивость', 'Reactividad / estabilidad emocional'),
    researchAxis('openness', 'personality', 'Openness / imagination', 'Открытость / воображение', 'Apertura / imaginación'),
    researchAxis('other_traits', 'personality', 'Other traits and strengths', 'Другие черты и сильные стороны', 'Otros rasgos y fortalezas'),
    researchAxis('typologies', 'personality', 'Exploratory typologies (unvalidated)', 'Описательные типологии (не валидированы)', 'Tipologías exploratorias (sin validar)'),
  ]),
  support: Object.freeze([
    researchAxis('resources', 'resource', 'Perceived resources / resilience', 'Воспринимаемые ресурсы и устойчивость', 'Recursos y resiliencia percibidos'),
    researchAxis('self_support', 'self_support', 'Self-support / self-compassion', 'Самоподдержка / сочувствие себе', 'Autoapoyo y autocompasión'),
  ]),
  meaning: Object.freeze([
    researchAxis('meaning', 'meaning', 'Values / sense of direction', 'Ценности и направление жизни', 'Valores y sentido de vida'),
  ]),
  // Exploratory source-scoped topics, not scores for the three goal self-ratings.
  goal: Object.freeze([
    researchAxis('clarity', 'clarity', 'Clarity & direction (supporting test)', 'Ясность и направление (вспомогательный тест)', 'Claridad y dirección (prueba complementaria)'),
    researchAxis('motivation', 'energy', 'Energy & readiness (supporting test)', 'Энергия и готовность (вспомогательный тест)', 'Energía y disposición (prueba complementaria)'),
    researchAxis('confidence', 'self_support', 'Self-support (supporting test)', 'Самоподдержка (вспомогательный тест)', 'Apoyo personal (prueba complementaria)'),
  ]),
})

const BIG_FIVE_SCALE_KEYS = Object.freeze({
  extraversion: ['trait.extraversion', 'trait.ipip50.extraversion', 'trait.tipi.extraversion'],
  agreeableness: ['trait.agreeableness', 'trait.ipip50.agreeableness', 'trait.tipi.agreeableness'],
  conscientiousness: ['trait.conscientiousness', 'trait.ipip50.conscientiousness', 'trait.tipi.conscientiousness'],
  emotional_reactivity: ['trait.neuroticism', 'trait.ipip50.emotional_stability', 'trait.tipi.emotional_stability'],
  openness: ['trait.intellect_imagination', 'trait.ipip50.intellect_imagination', 'trait.tipi.openness'],
})

const axisRef = (area, id) => area + '::' + id

// Return only a facet supported by an *actual* registered, scored dimension.
// For personality, name Big Five axes only for the exact published-source scale
// keys; original HH typologies never masquerade as Big Five measurements.
// Scores with opposite polarity (e.g. neuroticism vs emotional stability) are
// NOT made comparable or aggregated by this presentation grouping.
export function researchAxisForScale(test, scale, area) {
  if (!isProfileScaleRelevant(test, scale, area)) return null
  let id = null
  if (area === 'traits' && scale.axis === 'personality') {
    id = Object.keys(BIG_FIVE_SCALE_KEYS).find(facet =>
      BIG_FIVE_SCALE_KEYS[facet].includes(scale.key)) ||
      (test.testKind === 'hobby' ? 'typologies' : 'other_traits')
  } else if (area === 'goal') {
    id = goalSupportFacetForScale(test.key, scale, test.version || test.definition?.version)
  } else if (area === 'money') {
    if (scale.key === 'resources.financial_wellbeing.cfpb_short')
      id = 'financial_wellbeing'
    else if (scale.key === 'state.money_pressure.difficulty')
      id = 'money_pressure'
    else if (scale.key === 'resources.money_pressure.coping')
      id = 'financial_coping'
  } else {
    id = PROFILE_RESEARCH_AXES[area]?.find(entry => entry.sourceAxis === scale.axis)?.id
  }
  return PROFILE_RESEARCH_AXES[area]?.find(entry => entry.id === id) || null
}

export function profileResearchAxisLabel(ref, locale = 'en') {
  const [area, id] = String(ref || '').split('::')
  const source = PROFILE_RESEARCH_AXES[area]?.find(entry => entry.id === id)
  return source?.label?.[locale] || source?.label?.en || ref
}

export function selectedProfileResearchAxes(groups = [], selectedIds = []) {
  const chosen = new Set(selectedIds)
  return [...new Set(groups.flatMap(group => (group.scales || [])
    .filter(scale => chosen.has(scale.id) && scale.researchAxisId)
    .map(scale => scale.researchAxisId)))]
}

// Selecting a source scale does not give another source's score; the matching
// facet only identifies possible FULL-questionnaire alternatives. A source
// score / version / language is always independently verified downstream.
export function recommendProfileAxisBattery(tests = [], groups = [], selectedIds = [], mode = 'questionnaires', limit = 5) {
  const kind = mode === 'pro' ? 'professional' : 'monitoring'
  const cap = Number.isInteger(limit) ? Math.max(0, Math.min(12, limit)) : 0
  const chosen = new Set(selectedIds)
  const selectedScales = groups.flatMap(group => group.scales || []).filter(scale =>
    chosen.has(scale.id) && scale.researchAxisId)
  const wanted = new Set(selectedScales.map(scale => scale.researchAxisId))
  const matched = groups.flatMap(group => group.scales || [])
  const options = (Array.isArray(tests) ? tests : []).filter(test =>
    test?.testKind === kind && typeof test.key === 'string' &&
    !('selectable' in test && test.selectable !== true) &&
    !('free' in test && test.free !== true) &&
    !('startable' in test && test.startable !== true) &&
    !('rightsStatus' in test && test.rightsStatus !== 'cleared') &&
    !('explicitOptIn' in test && test.explicitOptIn === true))
    .map(test => ({
      test,
      axes: [...new Set(matched.filter(scale => scale.testKey === test.key &&
        wanted.has(scale.researchAxisId)).map(scale => scale.researchAxisId))],
      exact: selectedScales.filter(scale => scale.testKey === test.key).length,
    })).filter(item => item.axes.length)
  const result = []
  while (result.length < cap && wanted.size) {
    const best = options.filter(item => !result.includes(item.test.key))
      .map(item => ({ ...item, gain: item.axes.filter(axis => wanted.has(axis)) }))
      .filter(item => item.gain.length)
      .sort((a, b) => b.gain.length - a.gain.length || b.exact - a.exact ||
        (a.test.minutes ?? 99) - (b.test.minutes ?? 99) ||
        a.test.key.localeCompare(b.test.key))[0]
    if (!best) break
    result.push(best.test.key)
    best.gain.forEach(axis => wanted.delete(axis))
  }
  return Object.freeze(result)
}

const hasSourceTopic = (test, topics) =>
  Array.isArray(test?.topics) && test.topics.some(topic => topics.includes(topic))

// Avoid presenting generic personality strengths as measurements of relational
// behaviour. These are explicit source constructs ABOUT relating, not claims
// that the scores measure relationship quality or predict compatibility.
const RELATIONAL_TRAIT_DIMENSIONS = new Set([
  'trait.ipip.empathic_concern',
  'trait.ipip.responsive_joy',
  'trait.ipip.responsive_distress',
  'trait.bfas.compassion',
  'trait.via.capacity_for_love',
  'trait.via.forgiveness',
  'trait.via.kindness',
  'trait.via.social_intelligence',
  'trait.via.teamwork',
  'trait.via.fairness',
  'trait.via.honesty',
  'trait.via.gratitude',
])

// Only explicitly authored work-relevant dispositions. A VIA strengths
// questionnaire may cover many unrelated traits: spirituality, gratitude,
// humor, intimacy or aesthetic appreciation are NOT work-performance scales.
const WORK_TRAIT_DIMENSIONS = new Set([
  'trait.bfas.industriousness',
  'trait.bfas.orderliness',
  'trait.ipip.locus_of_control_internality',
  'trait.ipip.locus_of_control_powerful_others',
  'trait.ipip.locus_of_control_chance',
  'trait.via.teamwork',
  'trait.via.leadership',
  'trait.via.perseverance',
  'trait.via.prudence',
  'trait.via.self_regulation',
  'trait.via.judgment',
  'trait.via.fairness',
  'trait.via.honesty',
  'trait.via.creativity',
  'trait.via.love_of_learning',
  'trait.via.perspective',
  'trait.via.core.dependability',
  'trait.via.core.mastery',
])


// Generic wellbeing, confidence or personality scores are NOT financial
// wellbeing scores. Secondary axes only belong to a life topic when the
// authored questionnaire metadata explicitly says so.
export function isProfileScaleRelevant(test, scale, area, permittedAxes = PROFILE_AREA_AXES) {
  if (!scale || !Array.isArray(permittedAxes[area]) || !permittedAxes[area].includes(scale.axis)) return false
  if (area === 'goal') return Boolean(goalSupportFacetForScale(test?.key, scale, test?.version || test?.definition?.version))
  if (area === 'body') return scale.axis === 'embodiment' ||
    (scale.axis === 'energy' && hasSourceTopic(test, ['body']))
  if (area === 'money') return hasSourceTopic(test, ['money', 'financial_wellbeing']) ||
    test.key === 'hh-money-pressure' // Specific source title; its old catalogue tags only say "work".
  if (area === 'work') return scale.axis === 'stress'
    ? hasSourceTopic(test, ['work']) && test.key !== 'hh-money-pressure'
    : scale.axis === 'personality' ?
      WORK_TRAIT_DIMENSIONS.has(scale.key) && hasSourceTopic(test, ['work'])
      : hasSourceTopic(test, ['work', 'function', 'attention'])
  if (area === 'support' && scale.axis === 'resource' &&
    (test.key === 'cfpb-financial-wellbeing-5' ||
      String(scale.key).startsWith('resources.financial_wellbeing.'))) return false
  if (area === 'connection' && scale.axis === 'personality') {
    return RELATIONAL_TRAIT_DIMENSIONS.has(scale.key) &&
      hasSourceTopic(test, ['relationships', 'intimacy', 'support', 'boundaries'])
  }
  return true
}

export function profileAreasWithTests(tests = [], focuses = []) {
  const candidates = [...new Set(focuses.flatMap(focus => PROFILE_FOCUS_AREAS[focus] || []))]
  return buildProfileScaleGroups(tests, candidates, PROFILE_AREA_AXES)
    .filter(group => group.scales.length > 0).map(group => group.area)
}

// Scale keys and full-questionnaire time/question metadata come only from the
// existing rights-cleared public catalogue. A scale is NOT a stand-alone quiz:
// one questionnaire can provide several scale scores after one completion.
export function buildProfileScaleGroups(tests = [], areas = [], areaAxes = {}) {
  const input = Array.isArray(tests) ? tests : []
  return (Array.isArray(areas) ? areas : []).map(area => {
    const axes = new Set(areaAxes[area] || [])
    const seen = new Set()
    const scales = []
    for (const test of input) {
      if (typeof test?.key !== 'string' || !Array.isArray(test.scales)) continue
      for (const item of test.scales) {
        if (!item || typeof item.key !== 'string' || !axes.has(item.axis) ||
            typeof item.label !== 'string' || !item.label.trim() ||
            !isProfileScaleRelevant(test, item, area, areaAxes)) continue
        const facet = researchAxisForScale(test, item, area)
        if (!facet) continue
        const id = test.key + '::' + item.key
        if (seen.has(id)) continue
        seen.add(id)
        scales.push({
          id, key: item.key, axis: item.axis, label: item.label,
          researchAxisId: axisRef(area, facet.id),
          testKey: test.key, testTitle: test.title,
          testKind: test.testKind,
          // Item count is source-declared. null means it cannot be verified.
          scaleQuestions: Number.isInteger(item.scaleQuestions) && item.scaleQuestions > 0
            ? item.scaleQuestions : null,
          // Exact source questionnaire totals, not invented scale runtimes.
          questions: Number.isInteger(test.questions) && test.questions > 0 ? test.questions : null,
          minutes: Number.isFinite(test.minutes) && test.minutes > 0 ? test.minutes : null,
        })
      }
    }
    scales.sort((a, b) =>
      (a.testKind === 'monitoring' ? 0 : 1) - (b.testKind === 'monitoring' ? 0 : 1) ||
      (a.minutes ?? 99) - (b.minutes ?? 99) ||
      (a.questions ?? 99) - (b.questions ?? 99) ||
      a.axis.localeCompare(b.axis) || a.label.localeCompare(b.label))
    const researchAxes = (PROFILE_RESEARCH_AXES[area] || [])
      .filter(facet => scales.some(scale => scale.researchAxisId === axisRef(area, facet.id)))
      .map(facet => Object.freeze({
        id: axisRef(area, facet.id), sourceAxis: facet.sourceAxis, label: facet.label,
        scaleCount: scales.filter(scale => scale.researchAxisId === axisRef(area, facet.id)).length,
      }))
    return { area, scales, researchAxes }
  })
}

// Make each real research axis discoverable BEFORE showing alternate sources.
// Truncating the first N scored scales can hide Big Five dimensions behind
// several generic strength scores. Never invent a facet or change its score.
export function previewProfileScales(scales = [], limit = 8) {
  const input = Array.isArray(scales) ? scales : []
  const max = Number.isInteger(limit) ? Math.max(0, Math.min(24, limit)) : 8
  const axes = new Set()
  const representatives = []
  for (const scale of input) {
    const axis = scale?.researchAxisId || scale?.axis
    if (!axis || axes.has(axis)) continue
    axes.add(axis)
    representatives.push(scale)
  }
  // More than N real axes must remain visible; N applies to secondary sources.
  const cap = Math.max(max, representatives.length)
  const chosen = [...representatives]
  const ids = new Set(chosen.map(scale => scale.id))
  for (const scale of input) {
    if (chosen.length >= cap) break
    if (!scale || ids.has(scale.id)) continue
    chosen.push(scale)
    ids.add(scale.id)
  }
  return chosen
}

// Suggest up to three *existing* source-declared scales for each topic, first
// covering different axes, then alternative subscales. No mandatory scales.
export function defaultProfileScaleIds(groups = [], perTopic = 3) {
  const selected = new Set()
  const cap = Number.isInteger(perTopic) ? Math.max(0, Math.min(5, perTopic)) : 0
  for (const group of groups) {
    const chosen = []
    const axes = new Set()
    for (const scale of group.scales || []) {
      if (chosen.length >= cap) break
      const dimension = scale.researchAxisId || scale.axis
      if (axes.has(dimension)) continue
      chosen.push(scale.id)
      axes.add(dimension)
    }
    for (const scale of group.scales || []) {
      if (chosen.length >= cap) break
      if (!chosen.includes(scale.id)) chosen.push(scale.id)
    }
    chosen.forEach(id => selected.add(id))
  }
  return [...selected]
}

export function selectedProfileAxes(groups = [], ids = []) {
  const picked = new Set(ids)
  return [...new Set(groups.flatMap(group => (group.scales || [])
    .filter(scale => picked.has(scale.id)).map(scale => scale.axis)))]
}

// The mode changes only eligible catalogue alternatives, not scoring,
// licensing, account permissions, or the meaning of individual scales.
export function recommendProfileMode(tests = [], axes = [], mode = 'questionnaires', limit = 5) {
  const kind = mode === 'pro' ? 'professional' : 'monitoring'
  const eligible = (Array.isArray(tests) ? tests : []).filter(test =>
    test?.testKind === kind && Array.isArray(test.axes) &&
    test.axes.some(axis => axes.includes(axis)))
  return [...recommendProfileBattery(eligible, axes, limit)]
}

export function profileBatteryTotals(tests = [], keys = []) {
  const chosen = new Set(keys)
  const source = (Array.isArray(tests) ? tests : []).filter(test => chosen.has(test.key))
  return Object.freeze({
    count: source.length,
    questions: source.reduce((total, t) => total + (t.questions ?? 0), 0),
    minutes: source.reduce((total, t) => total + (t.minutes ?? 0), 0),
  })
}
