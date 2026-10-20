import { IPIP_TRAIT_GUIDANCE } from './ipip50-guidance.js'
import { HH_PERSONALITY_TYPE_KEYS, personalityDimensionGuidance } from './personality-type-interpretation.js'
import { BACH_GUIDANCE } from './bach-guidance.js'
import { descriptiveScorePosition } from './descriptive-score-position.js'
import { traitReportCopy } from './trait-report-locales.js'
import { getDefinitionById, getAssessmentDefinition, provenance } from './definitions.js'
import { scoreAssessment } from './scoring.js'
import { CFPB_SHORT_2017_LOOKUP } from './cfpb-short-scoring.js'

// Score identity comes from the immutable scorer, not a title, locale of the
// report, or a coincidentally equal range. This module never reads responses.
const signatures = new WeakMap()
const SIGNATURE_FIELDS = ['key', 'min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct', 'displayKind']
// Complete integer responses make a mean discrete, even after rounding. A
// plausible in-range decimal alone is not evidence that this scorer can emit it.
// Reverse scoring preserves each item's integer bounds. Do not infer answers.
const meanValues = new WeakMap()
// The official CFPB age/mode table yields only a subset of integers 0–100.
// A forged but in-range integer must not become a verified client result when
// its database interpretation payload is absent or fails integrity checks.
const CFPB_ATTAINABLE_SCORES = new Set(CFPB_SHORT_2017_LOOKUP.flat())
function attainableMeanValues(definition, spec) {
  let byDimension = meanValues.get(definition)
  if (!byDimension) { byDimension = new Map(); meanValues.set(definition, byDimension) }
  if (byDimension.has(spec.key)) return byDimension.get(spec.key)
  const values = new Set()
  byDimension.set(spec.key, values)
  if (!Array.isArray(spec.items) || !spec.items.length || new Set(spec.items).size !== spec.items.length) return values
  let minimum = 0, maximum = 0
  for (const id of spec.items) {
    const question = definition.questions.find(item => item.id === id)
    if (!question) return values
    const min = question.min ?? definition.answerScale?.min
    const max = question.max ?? definition.answerScale?.max
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) return values
    minimum += min; maximum += max
  }
  const multiplier = spec.multiplier === undefined ? 1 : spec.multiplier
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) ||
      !Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) return values
  // Frozen registry item ranges bound this enumeration. Use the exact scorer's
  // order and two-decimal rounding, including CBI's 25-point multiplier.
  for (let sum = minimum; sum <= maximum; sum++)
    values.add(Math.round((sum / spec.items.length) * multiplier * 100) / 100)
  return values
}
function validNumber(dimension, definition) {
  if (!dimension || !['value', 'min', 'max'].every(key => Number.isFinite(dimension[key])) ||
      dimension.min >= dimension.max || dimension.value < dimension.min || dimension.value > dimension.max) return false
  const spec = definition.scoring?.dimensions?.find(item => item.key === dimension.key)
  // Integer Bach answers, 1/1.5 section weights and integer/1.5 bonuses
  // can only yield half-points. This is a necessary score-lattice check,
  // not proof that every half-point is attainable for every theme.
  if (definition.scoringKey === 'bach-flower') return Number.isInteger(dimension.value * 2)
  if (definition.scoringKey === 'cfpb-short-2017') return spec?.method === 'official-age-mode-lookup' &&
    spec.key === 'resources.financial_wellbeing.cfpb_short' &&
    Number.isInteger(dimension.value) && CFPB_ATTAINABLE_SCORES.has(dimension.value)
  if (spec?.method === 'mean') return attainableMeanValues(definition, spec).has(dimension.value)
  const integer = ['sum', 'value', 'capped_sum', 'healthy_days', 'classic-shaded-count', 'official-age-mode-lookup'].includes(spec?.method) ||
    ['raw-state', 'raw-dimensions', 'mini-ipip-20'].includes(definition.scoringKey)
  return !integer || Number.isInteger(dimension.value)
}
export function exactInterpretationDefinition(result, dimension) {
  let definition
  try { definition = getDefinitionById(result?.definitionId) } catch { return null }
  if (Object.entries(provenance(definition)).some(([key, value]) => result?.[key] !== value)) return null
  // Trauma has its own exact-result check and administration-sensitive contract.
  if (definition.administration) return null
  let expected = signatures.get(definition)
  if (!expected) {
    const answers = Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale?.min]))
    try { expected = scoreAssessment(definition, answers).dimensions } catch { return null }
    signatures.set(definition, expected)
  }
  const matches = (actual, spec) => spec && validNumber(actual, definition) &&
    SIGNATURE_FIELDS.every(key => actual[key] === spec[key])
  if (!Array.isArray(result?.dimensions) || result.dimensions.length !== expected.length ||
      Array.from(result.dimensions).some((actual, index) => !matches(actual, expected[index]))) return null
  if (dimension && !matches(dimension, expected.find(item => item.key === dimension.key))) return null
  return definition
}

// These are construct names, not severity labels. Several playful titles name a
// difficulty while their actual items measure the ability to handle it.
const SINGLE_CONSTRUCTS = Object.freeze({
  'phq-2': ['Low mood and loss of interest', 'Сниженное настроение и утрата интереса'],
  'gad-2': ['Nervousness and uncontrollable worry', 'Нервозность и неконтролируемое беспокойство'],
  'phq-9': ['Reported depressive symptoms', 'Сообщаемые депрессивные симптомы'],
  'phq-8': ['Reported depressive symptoms', 'Сообщаемые депрессивные симптомы'],
  'gad-7': ['Reported anxiety symptoms', 'Сообщаемые тревожные симптомы'],
  'k6': ['Non-specific psychological distress', 'Неспецифический психологический дистресс'],
  'k10': ['Non-specific psychological distress', 'Неспецифический психологический дистресс'],
  'phq-15': ['Reported bodily symptom burden', 'Выраженность сообщаемых телесных симптомов'],
  'brcs': ['Flexible coping with stress', 'Гибкое совладание со стрессом'],
  'cbi-personal': ['Physical and psychological exhaustion', 'Физическое и психологическое истощение'],
  'cbi-work': ['Exhaustion attributed to work', 'Истощение, связываемое с работой'],
  'cbi-client': ['Exhaustion attributed to client-facing work', 'Истощение, связываемое с работой с клиентами'],
  'rses-10': ['Overall self-esteem', 'Общая самооценка'],
  'ces-d-20': ['Frequency of depressive experiences', 'Частота депрессивных переживаний'],
  'hh-social-battery': ['Energy and choice in social contact', 'Силы и свобода выбора в общении'],
  'hh-focus-mode': ['Readiness to start and sustain a task', 'Готовность начать и продолжать дело'],
  'hh-stress-weather': ['Tension and the impact of current demands', 'Напряжение и влияние текущей нагрузки'],
  'hh-recharge-decoder': ['Access to restorative activities', 'Доступность восстанавливающих занятий'],
  'hh-boundary-radar': ['Recognising and expressing boundaries', 'Распознавание и выражение границ'],
  'hh-tiny-joys': ['Noticing pleasant moments and interest', 'Внимание к приятным моментам и интересу'],
  'hh-sleep-reset': ['Restorative sleep and supportive sleep habits', 'Восстанавливающий сон и поддерживающие привычки'],
  'hh-morning-battery': ['Morning energy and readiness', 'Утренние силы и готовность к дню'],
  'hh-evening-landing': ['Ability to wind down after the day', 'Способность замедлиться в конце дня'],
  'hh-decision-fog': ['Reported difficulty making and closing decisions', 'Сообщаемые трудности принятия и завершения решений'],
  'hh-start-button': ['Ability to begin a manageable first step', 'Способность начать с посильного шага'],
  'hh-screen-saturation': ['Screen-related overload and relief', 'Перегрузка от экранов и облегчение'],
  'hh-inner-critic': ['Harsh self-judgment and self-critical thoughts', 'Жёсткая самооценка и самокритичные мысли'],
  'hh-inner-ally': ['Respectful and supportive self-treatment', 'Уважительное и поддерживающее отношение к себе'],
  'hh-meaning-compass': ['Clarity of personal meaning and direction', 'Ясность личного смысла и направления'],
  'hh-motivation-spark': ['Interest and readiness for a next action', 'Интерес и готовность к следующему действию'],
  'hh-change-readiness': ['Readiness and support for a small change', 'Готовность и поддержка для небольшого изменения'],
  'hh-workload-weather': ['Manageability of work and ability to adjust demands', 'Посильность работы и возможность менять нагрузку'],
  'hh-body-signals': ['Noticing and responding to bodily needs', 'Распознавание телесных потребностей и отклик на них'],
  'hh-rest-permission': ['Permission to rest before exhaustion', 'Разрешение отдыхать до истощения'],
  'hh-closeness-compass': ['Choice and balance between closeness and space', 'Выбор и баланс близости и личного пространства'],
  'hh-confidence-pulse': ['Trust in everyday choices and coping', 'Доверие повседневным решениям и своим возможностям'],
  'hh-playfulness-pulse': ['Access to curiosity, enjoyment and play', 'Доступность любопытства, удовольствия и игры'],
  'hh-daily-rhythm': ['Supportive structure in everyday routines', 'Поддерживающая структура повседневных привычек'],
  'hh-money-pressure': ['Money worries and available coping responses', 'Беспокойство о деньгах и доступное совладание'],
  'hh-overthinking-loop': ['Repetitive thinking and ways to interrupt it', 'Повторяющиеся размышления и способы их прервать'],
  'hh-felt-safety': ['Noticing bodily comfort and choosing grounding', 'Распознавание телесного комфорта и выбор опоры'],
  'hh-emotion-clarity': ['Recognising and naming emotions', 'Распознавание и называние эмоций'],
  'hh-loss-adjustment': ['Making room for loss and everyday support', 'Принятие переживаний утраты и повседневная поддержка'],
  'hh-belonging': ['Access to welcome and authentic connection', 'Доступность принятия и искреннего контакта'],
  'hh-conflict-repair': ['Pausing, dialogue and choice after conflict', 'Пауза, диалог и свобода выбора после конфликта'],
  'hh-family-roles': ['Choice and boundaries in family expectations', 'Выбор и границы в семейных ожиданиях'],
  'hh-inner-imagery': ['Voluntary use of imagination and metaphor', 'Добровольное использование воображения и метафор'],
  'hh-values-direction': ['Everyday choices aligned with personal values', 'Повседневные решения в согласии с личными ценностями'],
  'hh-life-transition': ['Stability and support during change', 'Устойчивость и поддержка во время перемен'],
  'hh-speaking-up': ['Expressing preferences, questions and needs', 'Выражение предпочтений, вопросов и потребностей'],
  'hh-sustainable-pace': ['Adjusting demands to available energy', 'Соотнесение нагрузки с доступными силами'],
  'hh-support-seeking': ['Recognising needs and asking for help', 'Распознавание потребностей и обращение за помощью'],
  'hh-sensory-comfort': ['Noticing and adjusting sensory comfort', 'Распознавание и настройка сенсорного комфорта'],
  'hh-goal-obstacles': ['Recognising obstacles and planning a practical step', 'Распознавание препятствий и планирование посильного шага'],
  'hh-body-mind-context': ['Observing bodily sensations without assuming causes', 'Наблюдение телесных ощущений без предположения причин'],
  'hh-energy-drains': ['Recognising energy demands and adjusting activity', 'Распознавание затрат сил и настройка активности'],
  'hh-social-ease': ['Flexible, comfortable participation in contact', 'Гибкое и комфортное участие в общении'],
  'hh-solitude-choice': ['Choosing between restorative solitude and connection', 'Выбор между восстанавливающим уединением и общением'],
  'hh-relationship-balance': ['Noticing reciprocity and expressing relationship needs', 'Внимание к взаимности и выражение потребностей в отношениях'],
  'hh-approval-pressure': ['Keeping personal choice when approval matters', 'Сохранение собственного выбора при значимости одобрения'],
  'hh-perfectionism-pressure': ['Flexible standards and permission to finish', 'Гибкость стандартов и разрешение завершать дела'],
  'hh-uncertainty-flexibility': ['Acting flexibly without complete certainty', 'Гибкие действия при неполной определённости'],
  'hh-role-freedom': ['Choice and self-worth beyond familiar roles', 'Свобода выбора и самоценность за пределами привычных ролей'],
  'hh-work-boundaries': ['Clarifying and renegotiating work boundaries', 'Прояснение и пересмотр рабочих границ'],
})
const MIXED_POLARITY_IDENTITIES = Object.freeze({
  '5f4f8e9e-47d5-5831-bef2-fb1701d275dc': 'sha256:66c0afe8731d6d5fba0971c8f47e3a743a30b9d3ae3007f94e23adb5f32083c5',
  '0af7c9ec-c349-5a54-84cc-3ca23b9d4b07': 'sha256:9d083d4278979cd450fc6ba4746fe1c884fc5ba3a5c6a6b4f57b1257bca95d3a',
  'd4cda843-f234-5304-aca0-17dfa59e4c3c': 'sha256:7991d7d69831c2e8e06724090c463d921f001ac5b2939772501c113972debcec',
  '13782a7c-a7e3-5daa-a6ac-bab2e78f93ef': 'sha256:5a91ec5c9faae1e7ffdd27db8c736369d229050f0dfbbe2dbc6897d3eeca7b31',
  '78e8bbd2-20d3-5013-9590-fc686744b9e8': 'sha256:2f5e5c8e227c58e6229ad6e34caf54e00d797924a37c4fdeaf1307de3a425128',
  '14474c94-072c-50a4-b965-e80a3db77455': 'sha256:b47fcd65ceb8bd585ecfe55ad4656e9558d02cbe4aa0db6824be460d80895211',
})
export function hasReliableInterpretationDirection(definition) {
  return !!definition && !(definition.version === 'v1' &&
    MIXED_POLARITY_IDENTITIES[definition.id] === definition.contentHash)
}
// Only these audited immutable result+dimension identities qualify. A title,
// key alone, legacy partial result, or future version cannot trigger this flag.
export function isMixedDirectionResultDimension(result, dimension) {
  const definition = exactInterpretationDefinition(result, dimension)
  return !!definition && !hasReliableInterpretationDirection(definition)
}
const lang = locale => locale === 'ru' ? 'ru' : 'en'
const n = value => Number(value.toFixed(2)).toString()
// Only the already registered, revised Bach v2 questionnaire gets this wording.
const bachGuide = (definition, dimension, locale) => definition?.key === 'hh-bach-flower-profile' && definition.version === 'v2' && definition.scoringKey === 'bach-flower'
  ? BACH_GUIDANCE[dimension?.sourceConstruct]?.[lang(locale)] || null : null
// Direct ratings preserve the actual question endpoints, including historical
// current-state v1 whose question/scorer semantics are identical to v2.
// Do not apply this to configured resource-pulse statements or their mean.
function directRatingQuestion(definition, dimension, locale) {
  const allowed = definition?.key === 'hh-current-state' && ['v1', 'v2'].includes(definition.version) && definition.scoringKey === 'raw-state'
    || definition?.key === 'hh-weekly-pulse' && definition.version === 'v1' && definition.scoringKey === 'raw-dimensions'
  if (!allowed || definition.scoringVersion !== 'v1') return null
  try {
    const localized = getAssessmentDefinition(definition.key, definition.version, lang(locale))
    const question = localized.questions.find(item => item.id === dimension.key)
    return question && question.min === dimension.min && question.max === dimension.max &&
      Array.isArray(question.anchors) && question.anchors.length === 2 &&
      question.anchors.every(anchor => typeof anchor === 'string' && anchor.trim()) ? question : null
  } catch { return null }
}
// A configured value dimension can copy one statement response. Keep this
// separate from the genuine resources.overall mean and from anchored ratings.
function singleStatementQuestion(definition, dimension, locale) {
  if (definition?.key !== 'hh-resource-pulse' || definition.version !== 'v1' ||
      definition.scoringKey !== 'configured' || definition.scoringVersion !== 'v1') return null
  const scale = definition.scoring?.dimensions?.find(item => item.key === dimension.key)
  if (scale?.method !== 'value' || scale.items?.length !== 1 || scale.items[0] !== dimension.key) return null
  try {
    const localized = getAssessmentDefinition(definition.key, definition.version, lang(locale))
    const question = localized.questions.find(item => item.id === scale.items[0])
    return question && question.min === dimension.min && question.max === dimension.max &&
      typeof question.text === 'string' && question.text.trim() ? question : null
  } catch { return null }
}
// Reuse each instrument's existing full-report explanation only after the caller
// has verified immutable definition and dimension provenance. Do not infer a
// personality type from one dimension or from the scale's arithmetic midpoint.
function reviewedTraitGuidance(definition, dimension, locale) {
  if (definition?.version !== 'v1') return null
  if (definition.key === 'ipip-big-five-50') {
    const guide = IPIP_TRAIT_GUIDANCE[dimension.key]
    if (!guide) return null
    const index = locale === 'ru' ? 1 : 0
    return { meaning: guide.meaning[index], steps: guide.steps.map(step => step[index]) }
  }
  return HH_PERSONALITY_TYPE_KEYS.includes(definition.key) ? personalityDimensionGuidance(dimension, locale) : null
}
export function interpretationConstruct(result, dimension, definition, plan, locale = 'en') {
  const language = lang(locale)
  const bach = bachGuide(definition, dimension, locale)
  if (bach) return dimension.sourceConstruct + ' — ' + bach.title
  if (plan?.label?.[language]) return plan.label[language]
  if (SINGLE_CONSTRUCTS[result?.definitionKey]) return SINGLE_CONSTRUCTS[result.definitionKey][language === 'ru' ? 1 : 0]
  if (definition && definition.instrumentLocale !== language) {
    try {
      const counterpart = getAssessmentDefinition(definition.key, definition.version, language)
      const spec = counterpart.scoring?.dimensions?.find(item => item.key === dimension.key)
      if (spec?.sourceConstruct) return spec.sourceConstruct
    } catch { /* Not every instrument has an authorised translated questionnaire. */ }
  }
  const value = dimension?.sourceConstruct
  return typeof value === 'string' && !/^[a-z_]+\.[a-z_.]+$/.test(value) ? value : language === 'ru' ? 'Ответы по этой шкале' : 'Responses on this scale'
}

export function interpretationLimitations(result, definition, classification, locale = 'en') {
  const ru = locale === 'ru'
  if (classification.basis === 'unavailable') return [ru ? 'Версия, происхождение или диапазон результата не подтверждены.' : 'The score version, provenance or range could not be verified.']
  const notes = [classification.basis === 'descriptive'
    ? ru ? 'Для этой версии здесь не применяются проверенные категориальные пороги. Балл не является диагнозом, нормой или процентилем.' : 'No verified categorical cutoffs are applied to this version here. The score is not a diagnosis, norm or percentile.'
    : ru ? 'Опубликованный диапазон относится к этому инструменту и не устанавливает диагноз, причину или вероятность заболевания.' : 'The published range belongs to this instrument; it does not establish a diagnosis, cause or probability of a condition.']
  if (definition?.key.startsWith('hh-')) notes.push(ru
    ? 'Это авторский опросник Holistic House для самонаблюдения. Его результат нельзя считать валидированной клинической оценкой или доказательством эффективности помощи.'
    : 'This is an original Holistic House self-reflection questionnaire. Its score must not be treated as a validated clinical assessment or evidence that an intervention works.')
  if (result?.definitionKey === 'gad-7' && definition?.instrumentLocale === 'ru') notes.push(ru
    ? 'Использован самостоятельный русский перевод Holistic House без подтверждённой психометрической валидации. Клинические категории английского оригинала к нему не переносятся.'
    : 'This is the Holistic House Russian translation without established independent psychometric validation. The English original’s clinical categories are not transferred to it.')
  else if (definition?.instrumentLocale === 'en' && ru) notes.push('Вопросы были на английском. Русский текст пояснения не является валидированной русской адаптацией опросника.')
  if (result?.definitionKey === 'k6') notes.push(ru
    ? 'Порог 13 изучался в определённых популяциях; он не даёт индивидуальную вероятность расстройства и не переносит популяционную калибровку.'
    : 'The threshold of 13 was studied in particular populations; it does not provide an individual probability or transfer population calibration.')
  if ((definition && !hasReliableInterpretationDirection(definition))) notes.push(ru
    ? 'В этой неизменённой версии среднее объединяет утверждения о трудности и о совладании без разворота ответов. Его нельзя читать как чистую тяжесть проблемы; рассматривайте оба вида опыта отдельно.'
    : 'This unchanged version averages difficulty and coping statements without reversing them. Its total cannot be read as pure problem severity; consider the two kinds of experience separately.')
  return notes
}

// Read explanatory endpoints only from the exact scored questionnaire item.
// Published screening bands and aggregate subscales use their own scoring rules;
// two answer anchors must never be represented as clinical thresholds.
function questionnaireEndpoints(definition, dimension, locale) {
  if (!definition || !dimension) return null
  const scale = definition.scoring?.dimensions?.find(row => row.key === dimension.key)
  const direct = ['raw-state', 'raw-dimensions'].includes(definition.scoringKey) ||
    (scale?.method === 'value' && scale.items?.length === 1 && scale.items[0] === dimension.key)
  if (!direct) return null
  let source = definition
  if (source.instrumentLocale !== lang(locale)) {
    try { source = getAssessmentDefinition(definition.key, definition.version, lang(locale)) }
    catch { return null }
  }
  if (source?.key !== definition.key || source.version !== definition.version ||
      source.scoringKey !== definition.scoringKey) return null
  const question = source.questions?.find(row => row.id === dimension.key)
  if (!question || (question.min ?? source.answerScale?.min) !== dimension.min ||
      (question.max ?? source.answerScale?.max) !== dimension.max ||
      !Array.isArray(question.anchors) || question.anchors.length !== 2 ||
      question.anchors.some(text => typeof text !== 'string' || !text.trim())) return null
  return Object.freeze({ low: question.anchors[0].trim(), high: question.anchors[1].trim() })
}

// These are mathematical positions on the instrument's *actual* response range.
// They do not classify mental health, compare a user against norms or invent
// unsupported psychometric cutoff ranges.
function numericScoreReading(dimension, construct, endpoints, locale) {
  const ru = locale === 'ru'
  const low = n(dimension.min), high = n(dimension.max)
  const fraction = (dimension.value - dimension.min) / (dimension.max - dimension.min)
  const position = fraction === 0
    ? (ru ? 'на нижнем полюсе ответов' : 'at the lowest response endpoint')
    : fraction === 1
      ? (ru ? 'на верхнем полюсе ответов' : 'at the highest response endpoint')
      : Math.abs(fraction - 0.5) < 1e-9
        ? (ru ? 'ровно посередине шкалы ответов' : 'exactly halfway along the response scale')
        : fraction < 0.5
          ? (ru ? 'ближе к нижнему полюсу ответов' : 'closer to the lower response endpoint')
          : (ru ? 'ближе к верхнему полюсу ответов' : 'closer to the higher response endpoint')
  if (endpoints) return ru
    ? `Ваш результат по шкале «${construct}» — ${n(dimension.value)} из ${high}: ${position}. В самой анкете ${low} означает «${endpoints.low}», а ${high} — «${endpoints.high}».`
    : `Your score for ${construct.toLowerCase()} is ${n(dimension.value)} of ${high}: ${position}. The original response endpoints are ${low} (“${endpoints.low}”) and ${high} (“${endpoints.high}”).`
  return ru
    ? `Ваш результат по шкале «${construct}» — ${n(dimension.value)} при возможном диапазоне ${low}–${high}; он находится ${position.replace('ответов', 'значений')}.`
    : `Your score for ${construct.toLowerCase()} is ${n(dimension.value)} within the possible ${low}–${high} range, ${position}.`
}

export function descriptiveInterpretation(result, dimension, definition, plan, locale = 'en') {
  const ru = locale === 'ru'
  const construct = interpretationConstruct(result, dimension, definition, plan, locale)
  const spec = definition?.scoring?.dimensions?.find(item => item.key === dimension.key)
  const range = `${n(dimension.min)}–${n(dimension.max)}`
  const score = `${n(dimension.value)} (${range})`
  const traitCopy = traitReportCopy(definition, dimension, locale)
  const bach = bachGuide(definition, dimension, locale)
  const reviewedTrait = reviewedTraitGuidance(definition, dimension, locale)
  const directRating = directRatingQuestion(definition, dimension, locale)
  const singleStatement = singleStatementQuestion(definition, dimension, locale)
  const responseAnchors = questionnaireEndpoints(definition, dimension, locale)
  let explanation
  if ((definition && !hasReliableInterpretationDirection(definition))) explanation = ru
    ? 'Это среднее ответов о трудностях и способах совладания; оно не позволяет отделить нагрузку от поддержки.'
    : 'This averages responses about difficulties and coping; it cannot separate burden from support.'
  else if (directRating) explanation = ru
    ? `Это один выбранный ответ по теме «${construct}», а не сумма или среднее нескольких ответов. Промежуточные числа обозначают положение между этими опорами, а не клинические категории. Ответ относится к периоду, указанному в вопросе, и не описывает все ситуации.`
    : `This is one selected rating about ${construct.toLowerCase()}, not a sum or mean of several answers. Intermediate numbers describe position between these endpoints, not clinical categories. The answer concerns the period stated in the question and does not describe every situation.`
  else if (singleStatement) explanation = ru
    ? `Это ваша оценка одного утверждения: «${singleStatement.text}». Большие числа означают, что это утверждение лучше описывает ваш текущий опыт. Это один ответ, а не сумма или среднее разных ответов; он не описывает все ситуации.`
    : `This is your rating of one statement: “${singleStatement.text}”. Higher numbers mean that this statement better describes your current experience. It is a single response, not a sum or mean of different answers; it does not describe every situation.`
  else if (result?.definitionKey === 'k10') explanation = ru
    ? 'Сумма 10 ответов отражает частоту неспецифического психологического дистресса за последние 30 дней. Больше баллов означает более частые сообщаемые переживания, но не определяет конкретное расстройство.'
    : 'The sum of 10 responses describes the frequency of non-specific psychological distress over the past 30 days. Higher scores mean more frequently reported experiences, without identifying a particular disorder.'
  else if (dimension.key === 'resources.erq.reappraisal') explanation = ru
    ? 'Среднее отражает привычку менять взгляд на ситуацию для изменения эмоционального переживания. Более высокий балл означает большее согласие с этой стратегией; её полезность зависит от ситуации.'
    : 'The mean describes a tendency to change how a situation is understood to alter its emotional impact. Higher scores mean greater endorsement of this strategy; its usefulness depends on context.'
  else if (dimension.key === 'resources.erq.suppression') explanation = ru
    ? 'Среднее отражает привычку ограничивать внешнее выражение эмоций. Более высокий балл означает большее согласие с этой стратегией, а не отсутствие эмоций; её полезность зависит от ситуации.'
    : 'The mean describes a tendency to hold back outward emotional expression. Higher scores mean greater endorsement of this strategy, not an absence of emotion; its usefulness depends on context.'
  else if (result?.definitionKey?.startsWith('cbi-')) explanation = ru
    ? 'Среднее ответов пересчитано в баллы 0–100 по ключу CBI. Больший балл отражает больше сообщаемого истощения в указанном контексте; это не процент здоровья и не диагноз выгорания.'
    : 'The response mean is converted to 0–100 points using the CBI key. Higher scores indicate more reported exhaustion in the stated context; this is not a health percentage or a burnout diagnosis.'
  else if (result?.definitionKey === 'cfpb-financial-wellbeing-5') explanation = ru
    ? 'Балл получен по официальной таблице для возраста и способа заполнения, откалиброванной в США. Больший балл отражает больше сообщаемой финансовой устойчивости и свободы выбора; он не определяет доход, активы или кредитоспособность.'
    : 'The score uses the official age-and-administration lookup calibrated in the United States. Higher scores reflect greater reported financial security and freedom of choice; they do not measure income, assets or creditworthiness.'
  else if (dimension.key === 'function.hrqol4.general_health') explanation = ru
    ? 'Это выбранная оценка общего здоровья: 1 — отличное, 2 — очень хорошее, 3 — хорошее, 4 — удовлетворительное, 5 — плохое. Она не объясняет медицинские причины.'
    : 'This is the selected general-health rating: 1 excellent, 2 very good, 3 good, 4 fair, 5 poor. It does not explain medical causes.'
  else if (['capped_sum', 'healthy_days'].includes(spec?.method)) explanation = ru
    ? 'Это расчётный индекс за 30 дней: физически и психически трудные дни складываются с ограничением 30; для здоровых дней эта сумма вычитается из 30. Перекрытие дней не измеряется отдельно, поэтому индекс не равен точному календарю.'
    : 'This is a derived 30-day index: physically and mentally unhealthy days are added and capped at 30; healthy days subtract that sum from 30. Overlap is not measured separately, so the index is not an exact calendar count.'
  else if (result?.definitionKey?.startsWith('cdc-') && dimension.max === 30) explanation = ru
    ? `Вы сообщили о ${n(dimension.value)} днях из последних 30 по теме «${construct}». Количество дней не определяет причину или диагноз.`
    : `You reported ${n(dimension.value)} of the past 30 days for ${construct.toLowerCase()}. A day count does not identify a cause or diagnosis.`
  else if (bach) explanation = ru
    ? `Взвешенные совпадения относятся к эмоциональной теме «${bach.title}». Это традиционная тема для самонаблюдения, а не клиническая оценка, доказательство эффективности эссенций или их назначение.`
    : `Weighted matches concern the emotional theme “${bach.title}”. This is a traditional self-reflection theme, not a clinical assessment, evidence of flower-essence efficacy or a prescription.`
  else if (traitCopy) explanation = traitCopy.explanation
  else if (reviewedTrait) explanation = reviewedTrait.meaning
  else if (dimension.dimensionClass === 'trait') explanation = ru
    ? 'После применения ключа больший балл означает большее соответствие описанной особенности. Это непрерывное самоописание: ни один конец шкалы не является автоматически лучше или хуже.'
    : 'After applying the scoring key, higher scores mean greater endorsement of the named tendency. This is a continuous self-description; neither end is inherently better or worse.'
  else if (dimension.direction?.startsWith('higher-reported-')) explanation = ru
    ? `Больший балл отражает большее согласие с утверждениями о теме «${construct}». Это описание доступного опыта, а не оценка ваших качеств; общий показатель может скрывать различия между ответами.`
    : `Higher scores reflect greater endorsement of the statements about ${construct.toLowerCase()}. This describes reported experience, not personal worth; an aggregate can hide differences between responses.`
  else if (dimension.direction?.startsWith('lower-reported-') || dimension.dimensionClass === 'symptoms') explanation = ru
    ? `Больший балл отражает более выраженные или частые ответы по теме «${construct}» в периоде опросника. Сумма не объясняет причины и сама по себе не задаёт тяжесть состояния.`
    : `Higher scores reflect stronger or more frequent responses about ${construct.toLowerCase()} during the questionnaire’s reference period. The total does not explain causes or by itself establish clinical severity.`
  else explanation = ru
    ? `Балл суммирует ваши ответы по теме «${construct}». Значение следует сопоставлять с конкретными ситуациями, не превращая его в оценку личности или диагноз.`
    : `The score summarises your responses about ${construct.toLowerCase()}. Relate it to specific situations rather than treating it as a judgement of your character or a diagnosis.`
  const position = bach ? descriptiveScorePosition(dimension, locale, 'weighted-theme')
    : definition?.key === 'tipi-10' && traitCopy ? descriptiveScorePosition(dimension, locale, 'trait-mean')
      : reviewedTrait ? descriptiveScorePosition(dimension, locale, 'trait-sum') : null
  if (position) explanation += ' ' + position.text
  // The reviewed instrument-specific position explanation already supplies this
  // reading. Do not repeat a second generic midpoint/endpoint paragraph.
  const scoreReading = position ? '' : numericScoreReading(dimension, construct, responseAnchors, locale)
  const summary = [scoreReading, explanation].filter(Boolean).join(' ')
  const computation = spec?.method === 'mean'
    ? ru ? ` Среднее ${spec.items.length} ответов${spec.reverseItems?.length ? ' после обратного кодирования указанных в ключе пунктов' : ''}.` : ` Mean of ${spec.items.length} responses${spec.reverseItems?.length ? ', after reversing the items specified by the key' : ''}.`
    : ''
  return { basis: 'descriptive', code: 'continuous', label: ru ? `Описательный результат (${range})` : `Descriptive score (${range})`,
    // A semantic field for compact consumers, before adding the score prefix.
    // Never recover meaning by splitting punctuation: decimals and abbreviations
    // are legitimate score/source text, and the first sentence can be only a number.
    summary,
    responseAnchors,
    meaning: `${construct}: ${score}. ${summary}${computation} ` + (ru
      ? 'Проверенные клинические категории для этого результата здесь не присваиваются.'
      : 'No verified clinical categories are assigned to this result here.'),
    source: definition?.source?.scoringUrl || definition?.source?.url || null, recommendedReview: false }
}

export function scoreLinkedActions(result, dimension, definition, plan, classification, locale = 'en') {
  if (classification.basis === 'unavailable' || definition?.administration) return []
  const ru = locale === 'ru'
  const construct = interpretationConstruct(result, dimension, definition, plan, locale)
  const score = `${n(dimension.value)} (${n(dimension.min)}–${n(dimension.max)})`
  const traitCopy = traitReportCopy(definition, dimension, locale)
  if (traitCopy) return [
    ru ? `Для результата ${score} по теме «${construct}» запишите ситуацию, где это описание подходит, и исключение. Сравнивайте гибкость поведения, не стремясь к «правильному» баллу.`
      : `For ${score} on ${construct.toLowerCase()}, record a situation that fits this description and an exception. Explore flexibility rather than aiming for a “correct” score.`,
    (ru ? 'По желанию: ' : 'If useful: ') + traitCopy.reflection,
  ]
  const specific = bachGuide(definition, dimension, locale)?.step || plan?.step?.[lang(locale)]
  let first
  if ((definition && !hasReliableInterpretationDirection(definition))) first = ru
    ? `При результате ${score} отдельно отметьте трудность и способ совладания по теме «${construct}»: один общий балл их не различает.`
    : `With ${score} for ${construct.toLowerCase()}, note a difficulty and a coping response separately: the total cannot distinguish them.`
  else if (classification.basis === 'screening') first = classification.recommendedReview
    ? ru ? `Результат ${score}, категория «${classification.label}»: обсудите симптомы и влияние на обычные дела с квалифицированным специалистом; опросник не определяет диагноз или лечение.`
      : `At ${score}, the category is ${classification.label}. Discuss symptoms and their effect on daily life with a qualified professional; the questionnaire does not determine a diagnosis or treatment.`
    : ru ? `Результат ${score}, категория «${classification.label}»: сопоставьте его с повседневным самочувствием. Даже этот результат не исключает проблему; беспокоящие симптомы можно обсудить со специалистом.`
      : `At ${score}, the category is ${classification.label}. Compare it with everyday functioning. This result does not rule out a problem; discuss concerning symptoms with a professional if needed.`
  else if (classification.basis === 'published-reference') first = ru
    ? `Результат ${score} относится к диапазону «${classification.label}». Сопоставьте его с одним примером гибкого совладания и ситуацией, где нужна поддержка; балл не оценивает вашу ценность.`
    : `Your ${score} falls in the ${classification.label}. Compare it with one example of flexible coping and a situation where support would help; the score does not judge your worth.`
  else if (directRatingQuestion(definition, dimension, locale) || singleStatementQuestion(definition, dimension, locale)) first = ru
    ? `Для выбранного ответа ${score} по теме «${construct}» вспомните конкретный пример за период вопроса. Сопоставляйте только тот же вопрос, версию, язык и период; один ответ не отражает все обстоятельства.`
    : `For your selected rating ${score} about ${construct.toLowerCase()}, recall a concrete example from the question’s time period. Compare only the same question, version, language and period; one answer does not capture every circumstance.`
  else if (dimension.dimensionClass === 'trait' || result?.definitionKey === 'erq') first = ru
    ? `Для результата ${score} по теме «${construct}» запишите ситуацию, где это описание подходит, и исключение. Сравнивайте гибкость поведения, не стремясь к «правильному» баллу.`
    : `For ${score} on ${construct.toLowerCase()}, record a situation that fits this description and an exception. Explore flexibility rather than aiming for a “correct” score.`
  else if (dimension.value === dimension.min) first = ru
    ? `Результат ${score} по теме «${construct}» на нижней границе возможных ответов. Проверьте, соответствует ли это вашему опыту, и отметьте исключения, которые общий балл не показывает.`
    : `Your ${score} on ${construct.toLowerCase()} is at the lowest possible response value. Check whether that fits your experience and note exceptions the aggregate cannot show.`
  else if (dimension.value === dimension.max) first = ru
    ? `Результат ${score} по теме «${construct}» на верхней границе возможных ответов. Отметьте, в каких ситуациях это проявляется и где опыт отличается; это не клинический порог.`
    : `Your ${score} on ${construct.toLowerCase()} is at the highest possible response value. Note where this appears and where your experience differs; this is not a clinical threshold.`
  else first = ru
    ? `Используйте ${score} по теме «${construct}» как исходное наблюдение: опишите конкретную ситуацию и её влияние на день. Сравнивайте только ту же версию, язык вопросов и период измерения.`
    : `Use ${score} on ${construct.toLowerCase()} as a starting observation: describe a concrete situation and its impact on the day. Compare only the same version, questionnaire language and reference period.`
  return [first, specific].filter(Boolean)
}
