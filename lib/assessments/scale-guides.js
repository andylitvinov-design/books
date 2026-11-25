import { EXPANDED_CATALOG_V2 } from '../../data/assessments/catalog-v2.js'
import { HH_SPLIT_V2_KEYS, HH_SPLIT_V2_AXES } from '../../data/assessments/hh-split-reflections-v2.js'
import { hasTraumaAdministration } from './trauma-administration.js'
import { traumaScaleGuide } from './trauma-scale-guide.js'
import { MONITORING_CATALOG, monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { getAssessmentDefinition } from './definitions.js'
import { scoreAssessment } from './scoring.js'
import { interpretationPlan, interpretationDimensionPlan, interpretationForDimension, classificationDirection } from './interpretation-registry.js'
import { BACH_GUIDANCE } from './bach-guidance.js'
import { RELATIONSHIP_DIMENSION_AXES } from '../../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_DIMENSION_AXES } from '../../data/assessments/tantric-reflections-v1.js'
import { portraitSourceRule } from './portrait-constructs.js'

// A score is an observation, not a diagnosis or a requirement to improve.
// Skills are optional behavioural directions, NEVER clinical score targets.
// All test dimensions come from the versioned scorer, not catalog-topic guesses.
export const SCALE_FOCUS = Object.freeze({
  stress: { en: 'Stress load', ru: 'Нагрузка и стресс', watch: ['Notice when demands feel heavier and how they affect your day.','Отмечайте, когда нагрузка сильнее и как она влияет на день.'], skill: ['Recovery and a manageable pace','Восстановление и посильный темп'] },
  anxiety: { en: 'Anxiety & tension', ru: 'Тревога и напряжение', watch: ['Notice what starts worry, how long it lasts and what helps you feel steadier.','Замечайте, что вызывает беспокойство, как долго оно длится и что помогает успокоиться.'], skill: ['Grounding and flexible responses','Заземление и гибкость реакций'] },
  mood: { en: 'Mood & feelings', ru: 'Настроение и чувства', watch: ['Notice mood changes and what happened around them, without judging yourself.','Наблюдайте изменения настроения и их контекст без самооценки.'], skill: ['Supportive routines and emotional awareness','Поддерживающие привычки и осознание чувств'] },
  sleep: { en: 'Sleep & recovery', ru: 'Сон и восстановление', watch: ['Notice restfulness, sleep patterns and their effect on the next day.','Замечайте качество отдыха, режим сна и влияние на следующий день.'], skill: ['A gentler recovery routine','Бережный режим восстановления'] },
  energy: { en: 'Energy & body', ru: 'Энергия и тело', watch: ['Notice energy or physical discomfort during the day; do not assume a psychological cause.','Наблюдайте изменения сил и телесных ощущений, не предполагая их психологическую причину.'], skill: ['Pacing, rest and asking for appropriate medical advice','Посильная нагрузка, отдых и медицинская оценка при необходимости'] },
  clarity: { en: 'Mental clarity', ru: 'Ясность мышления', watch: ['Notice when thinking feels clear and which conditions make it more difficult.','Отмечайте, когда мышление яснее и какие условия мешают.'], skill: ['Attention breaks and planning','Паузы внимания и планирование'] },
  focus: { en: 'Focus & attention', ru: 'Фокус и внимание', watch: ['Notice which tasks are easier to start and sustain without distractions.','Замечайте, какие дела легче начинать и продолжать без отвлечений.'], skill: ['Small focus blocks and realistic goals','Короткие блоки концентрации и реалистичные цели'] },
  emotional_regulation: { en: 'Emotional flexibility', ru: 'Эмоциональная гибкость', watch: ['Notice feelings, their expression and which responses fit the situation.','Отмечайте чувства, способы их выражения и уместность реакций в ситуации.'], skill: ['Naming feelings and flexible expression','Распознавание чувств и гибкое выражение'] },
  relationships: { en: 'Connection & relationships', ru: 'Отношения и контакт', watch: ['Notice when contact feels supportive, comfortable or demanding.','Замечайте, когда контакт поддерживает, комфортен или утомляет.'], skill: ['Communication and personal boundaries','Общение и личные границы'] },
  intimacy: { en: 'Emotional intimacy', ru: 'Эмоциональная близость', watch: ['Notice the kinds and pace of closeness that feel welcome and voluntary.','Отмечайте виды и темп близости, которые комфортны и добровольны.'], skill: ['Expressing needs and choosing your own pace','Обсуждение потребностей и выбор своего темпа'] },
  boundaries: { en: 'Boundaries and consent', ru: 'Границы и согласие', watch: ['Notice situations when you want to say yes, no, or pause; a score never proves consent.','Замечайте, когда хочется согласиться, отказать или остановиться; балл не устанавливает согласие.'], skill: ['Respectful requests and clear boundaries','Уважительные просьбы и ясные границы'] },
  sexual_wellbeing: { en: 'Sexual wellbeing and choice', ru: 'Сексуальное благополучие и выбор', watch: ['Notice comfort and preferences without assuming any level of desire is required.','Замечайте комфорт и предпочтения, не считая какой-либо уровень желания обязательным.'], skill: ['Non-pressured self-acceptance and communication','Самопринятие и общение без давления'] },
  embodiment: { en: 'Body awareness and presence', ru: 'Телесное присутствие и внимание', watch: ['Notice comfortable sensory cues and respect your right to stop.','Замечайте комфортные телесные сигналы и уважайте своё право остановиться.'], skill: ['Gentle grounding and voluntary presence','Мягкое заземление и добровольное присутствие'] },
  resource: { en: 'Resilience & resources', ru: 'Ресурс и устойчивость', watch: ['Notice which activities, people or routines help you recover.','Отмечайте занятия, людей и привычки, помогающие восстанавливаться.'], skill: ['Building accessible support','Развитие доступной поддержки'] },
  self_support: { en: 'Inner support', ru: 'Внутренняя опора', watch: ['Notice how you treat yourself when difficulties appear.','Замечайте своё отношение к себе во время трудностей.'], skill: ['Self-compassion and small independent choices','Самоподдержка и небольшие самостоятельные решения'] },
  functioning: { en: 'Daily functioning', ru: 'Повседневные дела', watch: ['Notice which everyday activities have become easier or harder.','Замечайте, какие повседневные дела стали легче или труднее.'], skill: ['Small practical steps and appropriate support','Небольшие практические шаги и поддержка'] },
  personality: { en: 'Personality tendencies', ru: 'Личностные особенности', watch: ['Notice how a tendency shows up in different settings; no trait is inherently a defect.','Отмечайте проявления особенности в разных ситуациях; ни одна черта не является дефектом.'], skill: ['Flexible behaviour by choice — not changing a trait score','Гибкое поведение по желанию — не изменение балла черты'] },
  meaning: { en: 'Meaning & direction', ru: 'Смысл и направление', watch: ['Notice which activities feel personally meaningful and what you want to move toward.','Замечайте значимые занятия и направление, в котором хочется двигаться.'], skill: ['Value-led small actions','Небольшие шаги в направлении ценностей'] },
})
export const FOCUS_KEYS = Object.freeze(Object.keys(SCALE_FOCUS))
const DIMENSION_AXIS = Object.freeze({
  ...HH_SPLIT_V2_AXES,
  'resources.ons4.life_satisfaction':'resource',
  'resources.ons4.worthwhile':'meaning',
  'resources.ons4.happiness':'mood',
  'symptoms.ons4.anxiety':'anxiety',
  'symptoms.asrs6.shaded_count':'focus',
  'resources.mhc_sf.total':'resource', 'resources.mhc_sf.emotional':'mood',
  'resources.mhc_sf.social':'relationships', 'resources.mhc_sf.psychological':'resource',
  'resources.scs_sf.total':'self_support',
  'resources.cs.total':'relationships','resources.cs.kindness':'relationships',
  'resources.cs.common_humanity':'relationships','resources.cs.mindfulness':'relationships',
  'resources.cs.indifference_reversed':'relationships',
  'state.problem_intensity':'stress', 'state.resource':'resource', 'state.tension':'anxiety', 'state.fatigue':'energy', 'state.life_impact':'functioning',
  'weekly.mood':'mood','weekly.tension':'anxiety','weekly.load':'stress','weekly.recovery':'sleep','weekly.energy':'energy',
  'weekly.clarity':'clarity','weekly.connection':'relationships','weekly.functioning':'functioning',
  'resource.energy':'energy','resource.self_support':'self_support','resource.support':'resource','resource.connection':'relationships',
  'resource.agency':'functioning','resource.meaning':'meaning','resources.overall':'resource',
  'resources.monthly.self':'self_support','resources.monthly.relationships':'relationships','resources.monthly.body':'energy',
  'resources.monthly.work':'functioning','resources.monthly.meaning':'meaning','resources.monthly.support':'resource','resources.monthly.overall':'resource',
  'symptoms.phq4.total':'mood','symptoms.phq4.depression':'mood','symptoms.phq4.anxiety':'anxiety',
  'resources.mspss.significant_other':'relationships','resources.mspss.family':'relationships','resources.mspss.friends':'relationships','resources.mspss.overall':'relationships',
  'resources.erq.reappraisal':'emotional_regulation','resources.erq.suppression':'emotional_regulation',
  'function.hrqol4.general_health':'functioning','symptoms.hrqol4.physically_unhealthy_days':'energy',
  'symptoms.hrqol4.mentally_unhealthy_days':'mood','function.hrqol4.activity_limitation_days':'functioning',
  'symptoms.hrqol4.unhealthy_days_index':'functioning','resources.hrqol4.healthy_days_index':'functioning',
  'symptoms.cdc_healthy_days.pain_days':'energy','symptoms.cdc_healthy_days.sad_days':'mood',
  'symptoms.cdc_healthy_days.anxiety_days':'anxiety','symptoms.cdc_healthy_days.sleep_days':'sleep',
  'resources.cdc_healthy_days.vitality_days':'energy',
})
// Explicit primary construct for every original HH single-score reflection.
const SINGLE_TEST_AXIS = Object.freeze({
  'hh-social-battery':'relationships','hh-focus-mode':'focus','hh-stress-weather':'stress','hh-recharge-decoder':'resource',
  'hh-boundary-radar':'self_support','hh-tiny-joys':'mood',
  'hh-sleep-reset':'sleep','hh-morning-battery':'energy','hh-evening-landing':'sleep','hh-decision-fog':'clarity',
  'hh-start-button':'focus','hh-screen-saturation':'focus','hh-inner-critic':'self_support','hh-inner-ally':'self_support',
  'hh-meaning-compass':'meaning','hh-motivation-spark':'energy','hh-change-readiness':'resource',
  'hh-workload-weather':'stress','hh-body-signals':'energy','hh-rest-permission':'resource',
  'hh-closeness-compass':'relationships','hh-confidence-pulse':'self_support','hh-playfulness-pulse':'mood',
  'hh-daily-rhythm':'sleep','hh-money-pressure':'stress','hh-overthinking-loop':'anxiety',
  'hh-felt-safety':'self_support','hh-emotion-clarity':'emotional_regulation','hh-loss-adjustment':'mood',
  'hh-belonging':'relationships','hh-conflict-repair':'relationships','hh-family-roles':'self_support',
  'hh-inner-imagery':'meaning','hh-values-direction':'meaning','hh-life-transition':'resource',
  'hh-speaking-up':'relationships','hh-sustainable-pace':'functioning','hh-support-seeking':'resource',
  'hh-sensory-comfort':'energy','hh-goal-obstacles':'functioning','hh-body-mind-context':'energy',
  'hh-energy-drains':'energy','hh-social-ease':'relationships','hh-solitude-choice':'relationships',
  'hh-relationship-balance':'relationships','hh-approval-pressure':'self_support',
  'hh-perfectionism-pressure':'self_support','hh-uncertainty-flexibility':'anxiety',
  'hh-role-freedom':'personality','hh-work-boundaries':'functioning',
  'phq-2':'mood','gad-2':'anxiety','phq-4':'mood','phq-8':'mood','phq-9':'mood',
  'gad-7':'anxiety','k6':'stress','k10':'stress','phq-15':'energy','brcs':'resource',
  'cbi-personal':'stress','cbi-work':'stress','cbi-client':'stress','rses-10':'self_support','ces-d-20':'mood',
})
const WORD_AXIS = [
  [/^trait\./,'personality'],
  [/anxiety|gad|worr|panic|tension|uncertainty/i,'anxiety'],
  [/stress|strain|burden|burnout|cbi|distress/i,'stress'],
  [/sleep|rest|recovery/i,'sleep'],
  [/mood|depress|phq[289]|sad|interest|emotion/i,'mood'],
  [/self.?support|self.?esteem|rses|compassion|inner.?ally|critic/i,'self_support'],
  [/friend|family|relationship|lonel|social|connect|belong/i,'relationships'],
  [/clarity|cognit|decision/i,'clarity'],
  [/focus|attention|concentrat/i,'focus'],
  [/meaning|value|purpose/i,'meaning'],
  [/energy|fatigue|somatic|physical|pain|body|vital/i,'energy'],
  [/agency|function|activities|work|role|disabil/i,'functioning'],
  [/resource|coping|resilien|support/i,'resource'],
]
const memo = new Map()
const freeze = item => Object.freeze(item)
const textLocale = (value, locale) => value?.[locale] || value?.en || ''
const makeAnswerSet = (definition) => Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale?.min]))
export function scaleAxisFor(dimension, definition, catalog) {
  const id = String(dimension?.key || '')
  if (id.startsWith('bach.')) return null // symbolic / traditional themes, never a validated psychometric scale
  // Reports uses the audited portrait contract. A test excluded from
  // favorable portrait rays (e.g. ASRS shaded-response *count*) must still
  // be discoverable under its topical subject in the public test catalog.
  // Discovery affinity is NOT permission to draw a positive ray or set a goal.
  const reviewed=portraitSourceRule(definition?.key,id,definition?.version)
  if (reviewed && reviewed.mode !== 'excluded') return reviewed.axis
  if (DIMENSION_AXIS[id]) return DIMENSION_AXIS[id]
  if (RELATIONSHIP_DIMENSION_AXES[id]) return RELATIONSHIP_DIMENSION_AXES[id]
  if (TANTRIC_DIMENSION_AXES[id]) return TANTRIC_DIMENSION_AXES[id]
  if (id.startsWith('trait.')) return 'personality'
  if (SINGLE_TEST_AXIS[definition?.key]) return SINGLE_TEST_AXIS[definition.key]
  const raw = [id, dimension?.sourceConstruct || ''].join(' ')
  const matched = WORD_AXIS.find(([pattern]) => pattern.test(raw))
  if (matched) return matched[1]
  // Last resort: the instrument's declared primary topic, not broad coverage art.
  return catalog?.analysisAxes?.map(a => a.key).find(key => FOCUS_KEYS.includes(key)) || null
}
const friendlyName = (dimension, definition, catalog, lang, count) => {
  const exact = interpretationDimensionPlan({definitionKey:definition.key,definitionVersion:definition.version},dimension.key)
  if (exact?.label?.[lang]) return exact.label[lang]
  if (count === 1) return textLocale(catalog.title,lang) || definition.title
  const construct = String(dimension.sourceConstruct || '').trim()
  if (lang === definition.instrumentLocale && construct) return construct
  const axis = scaleAxisFor(dimension,definition,catalog)
  return axis && SCALE_FOCUS[axis] ? SCALE_FOCUS[axis][lang] : construct || dimension.key
}
const sourceKind = definition => {
  if (definition.key === 'hh-bach-flower-profile') return 'traditional'
  if (definition.source?.status?.includes('non-diagnostic') || definition.key.startsWith('hh-')) return 'original'
  if (definition.scoringKey === 'mini-ipip-20' || String(definition.key).startsWith('ipip-')) return 'trait'
  return 'instrument'
}
const interpretBands = (score, dimension, language) => {
  const lower = interpretationForDimension(score,{...dimension,value:dimension.min},language)
  if (!['screening','published-reference'].includes(lower.basis)) return freeze({
    basis:'descriptive', rows:freeze([]),
    note: language==='ru'
      ? 'Значения описывают ответы внутри диапазона, но не являются клиническими порогами. Сравнивать можно только совместимые повторные измерения.'
      : 'These values describe the position within the possible answer range; they are not clinical cutoffs. Compare only compatible repeated measures.',
  })
  const rows = []
  for (let v=dimension.min;v<=dimension.max;v++){
    const band=interpretationForDimension(score,{...dimension,value:v},language)
    if (!rows.length || rows[rows.length-1].code!==band.code)
      rows.push({code:band.code,from:v,to:v,label:band.label,source:band.source})
    else rows[rows.length-1].to=v
  }
  return freeze({basis:lower.basis,rows:freeze(rows.map(freeze)),note:language==='ru'
    ? 'Опубликованные границы относятся к скрининговой оценке или справочному диапазону, не устанавливают диагноз.'
    : 'Published boundaries describe screening or reference categories; they do not establish a diagnosis.'})
}
const timeCopy = (timeframe,locale) => {
  const ru=locale==='ru'
  const values = {'right-now':[ 'right now','прямо сейчас' ],'past-7-days':['past seven days','последние семь дней'],
    'past-2-weeks':['past two weeks','последние две недели'],'past-month':['past month','последний месяц'],
    'past-30-days':['past 30 days','последние 30 дней'],'past-4-weeks':['past four weeks','последние четыре недели'],
    'past-6-months':['past six months','последние шесть месяцев'],
    'general':['in general','в целом'],'general-self-description':['general self-description','общее описание своих особенностей']}
  return values[timeframe]?.[ru?1:0] || (ru?'период, указанный в вопросах':'the period given in the questions')
}
export function getTestScaleGuide(key, locale='en', historicalVersion=null) {
  const lang=locale==='ru'?'ru':'en'
  const activeCatalog=monitoringCatalogItem(key)
  const catalog=historicalVersion==='v1' && HH_SPLIT_V2_KEYS.includes(key)
    ? EXPANDED_CATALOG_V2.find(item => item.key===key) : activeCatalog
  if(!activeCatalog?.startable || activeCatalog.rightsStatus!=='cleared') return null
  if(!catalog?.startable || catalog.rightsStatus!=='cleared') return null
  // Audited split and Bach families support explicit historical guides.
  if (historicalVersion && !((HH_SPLIT_V2_KEYS.includes(key) || key === 'hh-bach-flower-profile') && ['v1', 'v2'].includes(historicalVersion))) return null
  const version=historicalVersion || catalog.version
  const cacheKey=key+':'+version+':'+lang
  if(memo.has(cacheKey)) return memo.get(cacheKey)
  let def
  try {def=getAssessmentDefinition(key,version,catalog.instrumentLocale==='dynamic'?lang:catalog.instrumentLocale)}
  catch {return null}
  if(hasTraumaAdministration(def)) return traumaScaleGuide(def,catalog,lang)
  const score=scoreAssessment(def,makeAnswerSet(def))
  const plan=interpretationPlan(def.key,def.version)
  const kind=sourceKind(def)
  const screeningCount=def.key==='asrs-6'
  const scales=score.dimensions.map((d)=>{
    const portraitRule=portraitSourceRule(def.key,d.key,def.version)
    const axis=scaleAxisFor(d,def,catalog)
    const guide=interpretationDimensionPlan(score,d.key)
    const theme=kind==='traditional'?BACH_GUIDANCE[d.sourceConstruct]?.[lang]:null
    const family=axis?SCALE_FOCUS[axis]:null
    // Neutral direction means no normative target; it does not make a symptom
    // screen (or an emotion-regulation strategy) a personality trait.
    const direction=classificationDirection(d)
    const trait=d.dimensionClass==='trait' && kind!=='traditional'
    const symptomMeasure=kind==='instrument' && d.dimensionClass==='symptoms'
    const descriptive=portraitRule?.mode==='descriptive' || portraitRule?.mode==='excluded' ||
      (!trait && !symptomMeasure && direction==='neutral')
    const band=interpretBands(score,d,lang)
    const symptomScreening=symptomMeasure && band.basis==='screening'
    const watch=screeningCount
      ? lang==='ru'
        ? 'Отметьте примеры трудностей с вниманием или активностью и их влияние на повседневную жизнь за последние шесть месяцев. Балл не измеряет тяжесть или ежедневный прогресс.'
        : 'Consider examples of attention or activity difficulties and their everyday impact during the past six months. This count does not measure severity or daily progress.'
      : symptomMeasure
      ? lang==='ru'
        ? 'Отмечайте сообщаемые симптомы и их влияние на повседневную жизнь. Этот показатель не устанавливает диагноз; при беспокойстве обсудите результат со специалистом.'
        : 'Notice the symptoms you report and their effect on everyday life. This measure does not establish a diagnosis; discuss concerns with a qualified professional.'
      : kind==='traditional'
      ? lang==='ru'
        ? 'Замечайте, встречается ли эта эмоциональная тема в опыте и в каких обстоятельствах. Совпадение не является диагнозом или назначением эссенции.'
        : 'Notice whether this emotional theme appears in your experience and in which situations. A match is neither a diagnosis nor an essence prescription.'
      : trait ? SCALE_FOCUS.personality.watch[lang==='ru'?1:0]
        : family?.watch?.[lang==='ru'?1:0] || (lang==='ru'?'Отмечайте изменения с учётом ситуации и времени.':'Track changes with their context and timing.')
    const action=theme?.step || guide?.step?.[lang] || plan?.step?.[lang] ||
      (lang==='ru'?'Выберите одно небольшое наблюдение на ближайшую неделю.':'Choose one manageable observation for the next week.')
    const item=freeze({ key:d.key, label:theme?.title||friendlyName(d,def,catalog,lang,score.dimensions.length),
      axis, axisLabel:family?.[lang] || (kind==='traditional'
        ? (lang==='ru'?'Традиционная эмоциональная тема':'Traditional emotional theme')
        : (lang==='ru'?'Описательный показатель':'Descriptive measure')),
      type:screeningCount?'screening_count':kind==='traditional'?'traditional':trait?'trait':symptomScreening?'symptom_screening':symptomMeasure?'symptom_measure':descriptive?'descriptive':direction==='difficulty'?'reported_difficulty':'reported_resource',
      min:d.min,max:d.max, direction:d.direction, timeframe:timeCopy(def.timeframe,lang),
      watch, action, skill:kind==='traditional'||screeningCount||symptomMeasure||descriptive?null:family?.skill?.[lang==='ru'?1:0]||null,
      // Only an explicitly audited, optional self-report skill may suggest a goal.
      // Screening scores, consent, sexuality, traits and unreviewed constructs cannot.
      canChooseSkill:Boolean(axis) && portraitRule?.goalEligible === true &&
        portraitRule.mode === 'directional' && !trait && !screeningCount && !symptomMeasure && !descriptive,
      portraitMode:portraitRule?.mode || 'unreviewed', bands:band,
      ...(screeningCount?{displayKind:'screening-count'}:{}) })
    return item
  })
  const measurementAxes=freeze([...new Set(scales.map(s=>s.axis).filter(Boolean))])
  const uniqueSkillAxes=freeze([...new Set(scales.filter(s=>s.canChooseSkill).map(s=>s.axis))])
  const guide=freeze({
    key, version:def.version, language:lang, instrumentLanguage:def.instrumentLocale,
    title:textLocale(catalog.title,lang) || def.title, purpose:textLocale(catalog.description,lang) || def.title,
    timeframe:timeCopy(def.timeframe,lang), sourceTitle:def.source?.title || def.title,
    sourceUrl:def.source?.url || null, kind, questions:def.questions.length,
    suggestedRepeatDays:screeningCount?null:catalog.suggestedRepeatDays??null, measurementAxes, skillAxes:uniqueSkillAxes,
    scales:freeze(scales), documentPath:'docs/assessments/guides/'+key+'.md',
    disclaimer:screeningCount
      ? lang==='ru'
        ? 'Пояснение Holistic House: 0–3 — ниже скринингового порога; 4–6 — на уровне или выше него. Это не диагноз, не оценка тяжести и не вероятность СДВГ. Результат ниже порога не исключает СДВГ; беспокоящие симптомы можно обсудить со специалистом при любом результате. Шесть месяцев — период вопросов, а не рекомендация по повторному прохождению. Валидация именно русского перевода NYU не подтверждена.'
        : 'Holistic House explanation: 0–3 is below the screening threshold; 4–6 is at or above it. This is not a diagnosis, severity rating or probability of ADHD. A below-threshold result does not rule out ADHD; discuss concerns with a qualified healthcare professional regardless of the score. Six months is the reference period, not a retesting recommendation. Validation of the exact NYU Russian translation has not been established.'
      : lang==='ru'
      ? kind==='traditional'?'Это традиционная тематическая саморефлексия, не медицинский или психологический диагностический инструмент.':'Балл отражает ответы на опросник и не заменяет обследование. Личностные черты не нужно «исправлять», а упражнения выбираются только добровольно.'
      : kind==='traditional'?'Traditional thematic self-reflection; not a clinical or psychological diagnostic measure.':'A questionnaire score reflects reported answers, not a clinical diagnosis. Personality traits do not need fixing; any skill practice is optional.',
  })
  memo.set(cacheKey,guide)
  return guide
}
export function allRunnableScaleGuides(locale='en') {
  return Object.freeze(MONITORING_CATALOG.filter(item=>item.startable).map(item=>getTestScaleGuide(item.key,locale)))
}
export function measuredScaleAxes(entry) { return Object.freeze([...(entry?.scaleGuide?.measurementAxes || [])]) }
export function scaleOverlap(entry, selectedAxes=[]) {
  const desired=[...new Set((Array.isArray(selectedAxes)?selectedAxes:[]).filter(a=>FOCUS_KEYS.includes(a)))]
  if(!desired.length) return 0
  return desired.filter(a=>measuredScaleAxes(entry).includes(a)).length/desired.length
}

// Saved course IDs carry a dimension key, not a version. Resolve only the exact
// old dimension; never remap an existing selection to one of the new constructs.
export function getChosenScaleGuide(key, dimensionKey, locale='en') {
  const current=getTestScaleGuide(key, locale)
  if (current?.scales.some(item => item.key===dimensionKey)) return current
  if (!HH_SPLIT_V2_KEYS.includes(key)) return null
  const historical=getTestScaleGuide(key, locale, 'v1')
  return historical?.scales.some(item => item.key===dimensionKey) ? historical : null
}
