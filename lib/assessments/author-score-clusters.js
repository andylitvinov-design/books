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
// The same response anchor has a different descriptive meaning for a
// difficulty, available resource or neutral personality tendency. These are
// editorial explanations of endorsements, NOT five validated psychometric
// severity categories or evidence of lasting ability.
const BAND_MEANING = Object.freeze({
  ru: {
    difficulty: [
      'Трудности по указанной теме почти не отражены в ответах; это не исключает сложных моментов.',
      'Трудности отмечены в небольшой мере. Полезно учитывать конкретные обстоятельства.',
      'Трудности отражены частично; отдельные ответы могли существенно различаться.',
      'Трудности заметно представлены в ответах. Сопоставьте их с влиянием на повседневные дела.',
      'Трудности сильно отражены в ответах. Если это мешает обычной жизни, уместна профессиональная поддержка.',
    ],
    resource: [
      'Описанные возможности почти не отмечены в этом прохождении; это не значит, что их нет совсем.',
      'Описанные возможности отмечены в небольшой мере; найдите ситуации-исключения.',
      'Возможности отмечены частично. Разные вопросы могут показывать разные стороны опыта.',
      'Возможности заметно представлены в ответах; условия и контекст всё ещё имеют значение.',
      'Возможности сильно отмечены в этом заполнении. Это не доказывает устойчивость ресурса во времени.',
    ],
    neutral: [
      'Низкое согласие с названной склонностью не доказывает противоположный тип личности.',
      'Склонность отражена в небольшой мере; разные ситуации могут давать другие ответы.',
      'Склонность отражена частично; промежуточная сумма не означает один определённый тип.',
      'Склонность довольно заметна в самоописании, но не определяет личность целиком.',
      'Склонность сильно отмечена в ответах; это не преимущество, диагноз или цель коррекции.',
    ],
  },
  en: {
    difficulty: [
      'These difficulties are minimally endorsed in this run; difficult moments may still occur.',
      'These difficulties are endorsed to a lesser degree; consider the situations behind the answers.',
      'Some difficulties are reflected, and individual items may differ substantially.',
      'Difficulties are notably reflected in responses; consider their effect on daily activities.',
      'Difficulties are strongly endorsed here. If everyday life is affected, professional support may be helpful.',
    ],
    resource: [
      'The named options are weakly endorsed in this run; this does not mean they are entirely absent.',
      'The named options are reported to a lesser degree; look for useful exceptions.',
      'The options are partly endorsed; different items may reflect different parts of experience.',
      'The options are clearly endorsed, but context and circumstances still matter.',
      'The options are strongly endorsed this time; the score does not establish stability over time.',
    ],
    neutral: [
      'Low endorsement of the named tendency does not establish an opposite personality type.',
      'The tendency is endorsed to a lesser degree and can differ across settings.',
      'The tendency is partly endorsed; an intermediate sum is not a fixed personality type.',
      'The tendency is fairly prominent in responses, but does not define the whole person.',
      'The tendency is strongly endorsed; this is not an advantage, diagnosis or improvement target.',
    ],
  },
})
const CAVEAT = Object.freeze({
  ru: 'Это не медицинские нормы и не клинические пороги: интервалы построены из достижимых баллов авторского опросника, а не из процентилей или пяти доказанных типов людей. Одинаковая сумма возможна при разных ответах.',
  en: 'These intervals contain attainable scores under this original questionnaire key. They are not clinical norms, clinical cutoffs, population percentiles or five scientifically established types. Different answers may have the same total.',
})
// Exact boundaries of what our authored questionnaires can legitimately infer.
// These are content-review warnings, not new scores or clinical cutoffs.
const CONSTRUCT_LIMITS = Object.freeze({
  'hh-current-state': {
    ru: 'Пять отдельных вопросов описывают разные стороны текущего состояния. Они не образуют общий показатель психического здоровья.',
    en: 'Five separate questions describe different aspects of the present state, not one overall mental-health score.',
  },
  'hh-weekly-pulse': {
    ru: 'Восемь отдельных показателей относятся к разным областям недели. Нельзя считать их единой проверенной шкалой психического здоровья.',
    en: 'The eight weekly ratings cover distinct domains; they are not a single validated measure of mental health.',
  },
  'hh-felt-safety': {
    ru: 'Вопросы объединяют замечание телесных сигналов, доступный комфорт, личные границы и выбор действий. Общий балл не измеряет объективную безопасность или наличие травмы.',
    en: 'Items combine noticing body signals, available comfort, boundaries and chosen responses. The average does not measure objective safety or the presence of trauma.',
  },
  'hh-body-mind-context': {
    ru: 'Вопросы описывают навыки наблюдения ощущений и своевременного обращения за оценкой. Они не измеряют тяжесть болезни и не устанавливают психосоматическую причину.',
    en: 'Items cover observation of body sensations and deciding when to seek assessment. The mean does not measure illness severity or establish a psychosomatic cause.',
  },
  'hh-money-pressure': {
    ru: 'В актуальной версии финансовые трудности и доступные способы совладания — разные подшкалы. Их нельзя складывать в один показатель и сравнивать с архивной смешанной версией.',
    en: 'The current version scores money-related difficulty and available coping separately; do not combine them or compare either with the archived mixed score.',
  },
  'hh-overthinking-loop': {
    ru: 'Повторяющиеся мысли и возможность прервать их отражаются раздельно. Одного вопроса о переключении недостаточно, чтобы доказать устойчивый навык саморегуляции.',
    en: 'Repetitive-thinking difficulties and the ability to interrupt them are separate; one interruption item cannot establish a reliable enduring self-regulation skill.',
  },
  'hh-screen-saturation': {
    ru: 'Экранная перегрузка и субъективное облегчение после перерыва учитываются отдельно; совпадение ответов не доказывает причину симптомов.',
    en: 'Screen overload and perceived relief after a break are described separately; their association in responses does not establish symptom causation.',
  },
  'hh-socionics-32': {
    ru: 'Баллы описывают согласие с авторскими вопросами о предпочтениях, а не доказанный соционический тип личности.',
    en: 'Scores describe endorsement of original preference statements, not a scientifically established socionics personality type.',
  },
  'hh-enneagram-36': {
    ru: 'Баллы показывают самоописание по темам эннеаграммы, но не подтверждают неизменный тип личности.',
    en: 'Scores are self-descriptions along Enneagram themes, not evidence of a fixed personality type.',
  },
  'hh-disc-style-20': {
    ru: 'Профиль отражает авторские описания стиля поведения; это не официальная или валидированная DISC-оценка.',
    en: 'The profile reflects authored statements about behavior; it is not an official or independently validated DISC assessment.',
  },
  'hh-temperaments-16': {
    ru: 'Предпочтения отражены описательно, без обоснованного вывода о четырёх неизменных темпераментах.',
    en: 'Preferences are described without establishing four immutable temperaments.',
  },
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
  const anchors = sameBounds &&
    // An individual item's own response labels take precedence. Never describe
    // an answer as "Often" if that specific question offered "Agree".
    questions.every(q => !Array.isArray(q.responseAnchors) ||
      JSON.stringify(q.responseAnchors) === JSON.stringify(definition.responseAnchors)) &&
    Array.isArray(definition.responseAnchors) &&
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
  const endpoints = !source.anchors && localizedQuestions.length === 1 &&
    Array.isArray(localizedQuestions[0].anchors) &&
    localizedQuestions[0].anchors.length === 2 &&
    localizedQuestions[0].anchors.every(value => typeof value === 'string' && value.trim())
    ? localizedQuestions[0].anchors : null
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
    const bandMeaning = source.anchors?.length === 5
      ? BAND_MEANING[lang][direction][index] + ' ' : ''
    const note = source.anchors
      ? lang === 'ru'
        ? 'По теме «'+construct+'» баллы '+displayRange+' соответствуют среднему ответу ближе к «'+label+'». '+bandMeaning+'Отдельные вопросы могут иметь другие значения; это не клиническая категория.'
        : 'For “'+construct+'”, scores '+displayRange+' correspond to an average nearest “'+label+'”. '+bandMeaning+'Individual items can have different answers; this is not a clinical category.'
      : lang === 'ru'
        ? 'По теме «'+construct+'» достижимые баллы '+displayRange+' находятся в '+(index + 1)+'-м участке из '+numberOfGroups+'. '+(endpoints ? 'Полюса исходного вопроса: '+fmt(dimension.min,lang)+' («'+endpoints[0]+'») и '+fmt(dimension.max,lang)+' («'+endpoints[1]+'»). ' : '')+'Это числовое положение, не уровень здоровья или норма.'
        : 'For “'+construct+'”, attainable scores '+displayRange+' fall in section '+(index+1)+' of '+numberOfGroups+'. '+(endpoints ? 'Original item endpoints: '+fmt(dimension.min,lang)+' (“'+endpoints[0]+'”) and '+fmt(dimension.max,lang)+' (“'+endpoints[1]+'”). ' : '')+'This is arithmetic position, not a health level or norm.'
    return Object.freeze({code:'hh-score-cluster-'+(index+1),
      from,to,displayRange,label,note,current:values.includes(dimension.value),
      attainableCount:values.length,
      // Exact scorer lattice, including gaps between rounded means.
      // Do not reconstruct a respondent's original individual answers.
      scorePoints:Object.freeze([...values]),
      originalAnswerCode:source.anchors ? source.min + index : null})
  })
  if (bands.filter(b=>b.current).length !== 1 ||
      bands.some((b,i)=>i>0 && b.from <= bands[i-1].to)) return null
  const scoringNote = lang === 'ru'
    ? (source.method === 'mean' ? 'Среднее' : source.method === 'sum' ? 'Сумма' : 'Отдельный ответ')+
      ' по '+source.questions.length+' вопрос'+(source.questions.length === 1 ? 'у' : 'ам')+
      '. Минимум '+fmt(dimension.min,lang)+', максимум '+fmt(dimension.max,lang)+
      '. Границы интервалов — достижимые баллы; отдельные числа между ними могут быть недостижимыми.'+
      (source.method === 'mean'
        ? ' Формула: сумма кодов ответов ÷ '+source.questions.length+
          (source.multiplier !== 1 ? ' × '+fmt(source.multiplier,lang) : '')+
          '; округление итогового среднего до двух знаков.'
        : source.method === 'sum'
          ? ' Формула: сумма кодов ответов'+
            (source.multiplier !== 1 ? ' × '+fmt(source.multiplier,lang) : '')+'.'
          : ' Этот результат — один ответ, не среднее нескольких вопросов. Его надёжность как отдельной шкалы не установлена.')
    : (source.method === 'mean' ? 'Mean' : source.method === 'sum' ? 'Sum' : 'Single response')+
      ' across '+source.questions.length+' item(s). Minimum '+fmt(dimension.min,lang)+
      ', maximum '+fmt(dimension.max,lang)+
      '. Interval endpoints are attainable values; not every number between them need be attainable.'+
      (source.method === 'mean'
        ? ' Formula: sum of coded responses ÷ '+source.questions.length+
          (source.multiplier !== 1 ? ' × '+fmt(source.multiplier,lang) : '')+
          '; final mean rounded to two decimals.'
        : source.method === 'sum'
          ? ' Formula: sum of coded responses'+
            (source.multiplier !== 1 ? ' × '+fmt(source.multiplier,lang) : '')+'.'
          : ' This is one direct response, not a multi-item average; independent measurement reliability has not been established.')
  const responseOptions = source.anchors ? Object.freeze(localizedAnchors.map((label,index)=>
    Object.freeze({ value:source.min+index, label }))) : null
  const boundary = CONSTRUCT_LIMITS[result.definitionKey]?.[lang] ||
    (lang === 'ru'
      ? 'Баллы отражают самоописание по названным вопросам. Без отдельной проверки нельзя утверждать, что все вопросы измеряют одно устойчивое психологическое свойство.'
      : 'Scores summarize endorsement of these statements. Without independent evidence, they do not establish one stable underlying psychological trait.')
  return Object.freeze({
    kind: source.anchors ? 'source-options' : 'descriptive',
    basis: source.anchors ? 'source-answer-anchors' : 'attainable-score-positions',
    rows:Object.freeze(bands),
    current:bands.find(b=>b.current),
    sourceQuestions:Object.freeze(localizedQuestions.map(q=>Object.freeze({id:q.id,text:q.text}))),
    scoringNote, observation, direction, responseOptions, contentBoundary:boundary,
    caution: (source.anchors ? SOURCE_NOTE[lang]+' ' : '')+CAVEAT[lang],
  })
}
