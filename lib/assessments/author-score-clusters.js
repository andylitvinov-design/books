import { getAssessmentDefinition, getDefinitionById, provenance } from './definitions.js'
import { SITUATION_OBSERVATION } from './situational-score-context.js'

// Descriptive score clusters from ACTUALLY attainable questionnaire scores.
// Never infer psychometric norms, reliability, diagnosis or a severity cutoff.
// Existing immutable scorers and stored interpretation versions are unchanged.
const L = locale => locale === 'ru' ? 'ru' : 'en'
const fmt = (n, locale) => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
  maximumFractionDigits: 2,
}).format(n)
const rounded = n => Math.round(n * 100) / 100
const EDITORIAL = Object.freeze({
  ru: ['Ближе к минимуму ответов', 'Ниже середины ответов', 'Средняя часть ответов',
    'Выше середины ответов', 'Ближе к максимуму ответов'],
  en: ['Near the lowest possible answers', 'Below the answer midpoint', 'Middle of the answer range',
    'Above the answer midpoint', 'Near the highest possible answers'],
})
const CAVEAT = Object.freeze({
  ru: 'Это интервалы достижимых баллов по ключу авторского опросника, а не клинические пороги, нормы, процентили или пять доказанных типов людей. Одинаковая сумма возможна при разных ответах.',
  en: 'These intervals contain attainable scores under this original questionnaire key. They are not clinical cutoffs, population norms, percentiles or five scientifically established types. Different answers may have the same total.',
})
const SOURCE_NOTE = Object.freeze({
  ru: 'Интервалы сгруппированы по близости среднего к исходным вариантам ответа. Это не утверждение, что каждый отдельный ответ был одинаковым, и не медицинская классификация.',
  en: 'Intervals group scores by the nearest original response anchor. They do not imply that every item received the same answer or establish a medical classification.',
})
function lookup(result) {
  let definition
  try { definition = getDefinitionById(result?.definitionId) } catch { return null }
  if (!definition?.key?.startsWith('hh-') || definition.key === 'hh-bach-flower-profile' ||
      Object.entries(provenance(definition)).some(([key, value]) => result?.[key] !== value)) return null
  return definition
}
function localized(definition, locale) {
  if (L(locale) === definition.instrumentLocale) return definition
  try {
    const other = getAssessmentDefinition(definition.key, definition.version, L(locale))
    if (other.questions.length !== definition.questions.length ||
        other.scoringKey !== definition.scoringKey ||
        other.scoringVersion !== definition.scoringVersion ||
        other.scoring?.dimensions?.length !== definition.scoring?.dimensions?.length ||
        other.questions.some((q, i) => q.id !== definition.questions[i].id ||
          (q.min ?? other.answerScale?.min) !== (definition.questions[i].min ?? definition.answerScale?.min) ||
          (q.max ?? other.answerScale?.max) !== (definition.questions[i].max ?? definition.answerScale?.max)) ||
        other.scoring?.dimensions?.some((part, i) => {
          const original = definition.scoring.dimensions[i]
          return part.key !== original.key || part.method !== original.method ||
            part.min !== original.min || part.max !== original.max ||
            JSON.stringify(part.items) !== JSON.stringify(original.items) ||
            JSON.stringify(part.reverseItems || []) !== JSON.stringify(original.reverseItems || [])
        })) return definition
    return other
  } catch { return definition }
}
function sourceDimension(definition, dimension) {
  let method, spec = null, questions
  if (['raw-state', 'raw-dimensions'].includes(definition.scoringKey)) {
    const question = definition.questions.find(q => q.id === dimension.key)
    if (!question) return null
    method = 'value'
    questions = [question]
  } else if (definition.scoringKey === 'configured') {
    spec = definition.scoring?.dimensions?.find(s => s.key === dimension.key)
    if (!spec || !['sum', 'mean', 'value'].includes(spec.method) ||
        !Array.isArray(spec.items) || spec.items.length === 0 ||
        new Set(spec.items).size !== spec.items.length ||
        (spec.method === 'value' && spec.items.length !== 1)) return null
    questions = spec.items.map(id => definition.questions.find(q => q.id === id))
    if (questions.some(q => !q)) return null
    method = spec.method
    // Distinct source item polarity must not silently become a homogeneous
    // resource or difficulty measure. Reverse-keyed source clusters require
    // a separately reviewed per-item key and are not guessed here.
    if (spec.reverseItems?.length ||
        questions.some(q => q.direction && spec.direction &&
          q.direction !== spec.direction)) return null
  } else return null
  if (!questions.length || questions.length > 120) return null
  const bounds = questions.map(q => ({
    min: q.min ?? definition.answerScale?.min,
    max: q.max ?? definition.answerScale?.max,
  }))
  if (bounds.some(b => !Number.isSafeInteger(b.min) || !Number.isSafeInteger(b.max) ||
    b.max <= b.min || b.max - b.min > 40)) return null
  const multiplier = spec?.multiplier ?? 1
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) return null
  const minSum = bounds.reduce((s, q) => s + q.min, 0)
  const maxSum = bounds.reduce((s, q) => s + q.max, 0)
  if (maxSum - minSum > 600) return null
  const values = [...new Set(Array.from({length: maxSum - minSum + 1}, (_, i) => {
    const sum = minSum + i
    return rounded((method === 'mean' ? sum / questions.length : sum) * multiplier)
  }))].sort((a,b) => a-b)
  if (values[0] !== dimension.min || values.at(-1) !== dimension.max ||
      !values.includes(dimension.value)) return null
  const sameBounds = bounds.every(b => b.min === bounds[0].min && b.max === bounds[0].max)
  const anchors = sameBounds && Array.isArray(definition.responseAnchors) &&
    definition.responseAnchors.length === bounds[0].max - bounds[0].min + 1 &&
    definition.responseAnchors.every(s => typeof s === 'string' && s.trim()) &&
    definition.responseAnchors.length >= 3 && definition.responseAnchors.length <= 7
    ? definition.responseAnchors : null
  return { method, spec, questions, values, anchors, min:bounds[0].min,
    max:bounds[0].max, multiplier }
}

// Returns null rather than supplying ordered "levels" to historical mixed-
// polarity forms or records with invalid score, key, version or direction.
export function authorScoreClusters({result, dimension, interpretation, locale='en'} = {}) {
  if (!dimension || !interpretation?.verified || interpretation.basis !== 'descriptive' ||
      interpretation.reliableDirection === false || !Number.isFinite(dimension.value)) return null
  const definition = lookup(result)
  if (!definition) return null
  const source = sourceDimension(definition, dimension)
  if (!source) return null
  const lang = L(locale)
  const loc = localized(definition, locale)
  const localizedQuestions = source.questions.map(q =>
    loc.questions.find(item => item.id === q.id) || q)
  const localizedAnchors = source.anchors && Array.isArray(loc.responseAnchors) &&
    loc.responseAnchors.length === source.anchors.length &&
    loc.responseAnchors.every(s => typeof s === 'string' && s.trim())
    ? loc.responseAnchors : source.anchors
  const numberOfGroups = source.anchors ? source.anchors.length : Math.min(5, source.values.length)
  const groups = Array.from({length:numberOfGroups}, (_, index) => ({ index, values:[] }))
  const closest = value => {
    if (!source.anchors) return null
    const perAnswer = (source.method === 'sum'
      ? value / source.multiplier / source.questions.length : value / source.multiplier)
    return Math.max(0, Math.min(numberOfGroups-1, Math.floor(perAnswer - source.min + 0.5)))
  }
  source.values.forEach((value, i) => {
    const idx = source.anchors ? closest(value) : Math.min(numberOfGroups-1,
      Math.floor(i * numberOfGroups / source.values.length))
    groups[idx].values.push(value)
  })
  if (groups.some(group => !group.values.length)) return null
  const construct = interpretation.construct || dimension.sourceConstruct || dimension.key
  const observation = SITUATION_OBSERVATION[dimension.key]?.[lang] ||
    SITUATION_OBSERVATION[result.definitionKey]?.[lang] || null
  const modes = {difficulty:'difficulty',resource:'resource',neutral:'neutral'}
  const direction = interpretation.presentationDirection in modes
    ? interpretation.presentationDirection : 'neutral'
  const bands = groups.map(({index, values}) => {
    const from=values[0], to=values.at(-1)
    const displayRange = from === to ? fmt(from,lang) : fmt(from,lang)+'–'+fmt(to,lang)
    const label = source.anchors ? localizedAnchors[index] :
      EDITORIAL[lang][Math.min(4,Math.floor(index * 5 / numberOfGroups))]
    const note = source.anchors
      ? lang === 'ru'
        ? 'По теме «'+construct+'» баллы '+displayRange+' соответствуют среднему ответу ближе к «'+label+'». Отдельные вопросы могут иметь другие значения; это не клиническая категория.'
        : 'For “'+construct+'”, scores '+displayRange+' correspond to an average nearest “'+label+'”. Individual items can have different answers; this is not a clinical category.'
      : lang === 'ru'
        ? 'По теме «'+construct+'» достижимые баллы '+displayRange+' находятся в '+(index + 1)+'-м участке из '+numberOfGroups+'. Это числовое положение, не уровень здоровья или норма.'
        : 'For “'+construct+'”, attainable scores '+displayRange+' fall in section '+(index+1)+' of '+numberOfGroups+'. This is arithmetic position, not a health level or norm.'
    return Object.freeze({code:'hh-score-cluster-'+(index+1),
      from,to,displayRange,label,note,current:values.includes(dimension.value),
      attainableCount:values.length})
  })
  if (bands.filter(b=>b.current).length !== 1 ||
      bands.some((b,i)=>i>0 && b.from <= bands[i-1].to)) return null
  const scoringNote = lang === 'ru'
    ? (source.method === 'mean' ? 'Среднее' : source.method === 'sum' ? 'Сумма' : 'Отдельный ответ')+
      ' по '+source.questions.length+' вопрос'+(source.questions.length === 1 ? 'у' : 'ам')+
      '. Минимум '+fmt(dimension.min,lang)+', максимум '+fmt(dimension.max,lang)+
      '. Границы интервалов — достижимые баллы; отдельные числа между ними могут быть недостижимыми.'
    : (source.method === 'mean' ? 'Mean' : source.method === 'sum' ? 'Sum' : 'Single response')+
      ' across '+source.questions.length+' item(s). Minimum '+fmt(dimension.min,lang)+
      ', maximum '+fmt(dimension.max,lang)+
      '. Interval endpoints are attainable values; not every number between them need be attainable.'
  return Object.freeze({
    kind: source.anchors ? 'source-options' : 'descriptive',
    basis: source.anchors ? 'source-answer-anchors' : 'attainable-score-positions',
    rows:Object.freeze(bands),
    current:bands.find(b=>b.current),
    sourceQuestions:Object.freeze(localizedQuestions.map(q=>Object.freeze({id:q.id,text:q.text}))),
    scoringNote, observation, direction,
    caution: source.anchors ? SOURCE_NOTE[lang]+' '+CAVEAT[lang] : CAVEAT[lang],
  })
}
