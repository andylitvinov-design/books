import { getAssessmentDefinition, getDefinitionById, provenance } from './definitions.js'
import { hasReliableInterpretationDirection } from './interpretation-context.js'

// Only six pinned EN/RU source identities may carry these archived, mixed-
// polarity v1 means. Current catalog uses the verified two-construct v2 form.
// Never infer two new subscale scores from an old one-dimensional saved mean.
const REVISED_KEYS = Object.freeze([
  'hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation',
])
const NUM = locale => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
  maximumFractionDigits: 2,
})
const COPY = Object.freeze({
  ru: {
    first: 'Низкое среднее согласие с разнородными утверждениями. Это не означает ни отсутствия трудностей, ни недостатка ресурсов.',
    second: 'В среднем согласие небольшое, но отдельные вопросы о трудностях и способах справляться могли получить разные ответы.',
    middle: 'Среднее согласие может скрывать противоположные сочетания ответов на вопросы о трудностях и доступных действиях.',
    fourth: 'В среднем утверждения отмечены заметно; балл не показывает отдельно интенсивность трудностей и доступность поддержки.',
    fifth: 'Среднее согласие высокое по двум разным темам сразу. Это не степень тяжести, не высокий ресурс и не доказательство улучшения.',
    caution: 'Архивная версия v1 объединяла вопросы о трудностях и возможностях справляться без разворота ответов. Поэтому ни один из пяти интервалов не означает уровень тяжести, здоровья или ресурса; это только средняя степень согласия с разными утверждениями. По сохранённой итоговой сумме невозможно восстановить отдельные ответы и рассчитать две новые шкалы. Для нового измерения используется исправленная v2; прямое сравнение общего v1 и подшкал v2 недопустимо.',
    range: 'Архивная v1: диапазоны общего ответа, не уровни тяжести',
    method: 'Архивная версия v1. Среднее шести целочисленных ответов 0–4 (одинаковый вес), округлённое до двух знаков; шесть вопросов относятся к двум разным темам. Для каждой темы нужно новое заполнение v2.',
    root: 'Архивная общая оценка по двум смешанным темам',
  },
  en: {
    first: 'Low average endorsement of mixed statements does not establish either absence of difficulty or lack of resources.',
    second: 'Average agreement is lower, but answers about difficulties and coping may differ from one another.',
    middle: 'The mean can conceal opposite patterns of difficulty and coping-item responses.',
    fourth: 'The mixed statements are fairly strongly endorsed on average; this does not isolate difficulties or available support.',
    fifth: 'High average endorsement combines two unlike themes. It is not a severity rating, a high-resource level or evidence of improvement.',
    caution: 'Archived v1 averaged difficulty and coping/context items without reversing answers. None of these intervals indicates severity, health or resource level: they only describe aggregate endorsement of unlike statements. Individual items and the new independent subscale scores cannot be reconstructed from a saved total. New administrations use the corrected v2. The old overall mean cannot be compared directly with either v2 subscale.',
    range: 'Archived v1: mixed-response intervals, not severity bands',
    method: 'Archived v1: unweighted mean of six integer responses 0–4, rounded to two decimals. The six questions concern two unlike themes. Complete v2 for independently scored domains.',
    root: 'Archived mixed-domain response average',
  },
})
const STAGES = {
  ru: ['Ближе к «Совсем нет»', 'Ближе к «Немного»', 'Ближе к «Отчасти»',
    'Ближе к «В значительной степени»', 'Ближе к «Очень сильно»'],
  en: ['Nearest “Not at all”', 'Nearest “A little”', 'Nearest “Somewhat”',
    'Nearest “Quite a lot”', 'Nearest “Very much”'],
}
const round2 = value => Math.round(value * 100) / 100

export function legacyMixedScoreAudit({ result, dimension, interpretation, locale = 'en' } = {}) {
  if (!result || !dimension || interpretation?.verified !== true ||
      interpretation?.basis !== 'descriptive' ||
      interpretation?.reliableDirection !== false ||
      !Number.isFinite(dimension.value)) return null
  let old, revised
  try {
    old = getDefinitionById(result.definitionId)
    revised = getAssessmentDefinition(old.key, 'v2', old.instrumentLocale)
  } catch { return null }
  if (old.version !== 'v1' || !REVISED_KEYS.includes(old.key) ||
      hasReliableInterpretationDirection(old) ||
      Object.entries(provenance(old)).some(([key, value]) => result[key] !== value)) return null
  const spec = old.scoring?.dimensions
  if (old.scoringKey !== 'configured' || old.scoringVersion !== 'v1' ||
      spec?.length !== 1 || spec[0]?.method !== 'mean' ||
      spec[0]?.items?.length !== 6 || old.questions?.length !== 6 ||
      revised.scoring?.dimensions?.length !== 2 ||
      revised.scoring.dimensions[0].direction === revised.scoring.dimensions[1].direction ||
      spec[0].key !== dimension.key ||
      spec[0].min !== 0 || spec[0].max !== 4 ||
      dimension.min !== 0 || dimension.max !== 4 ||
      dimension.timeframe !== old.timeframe ||
      dimension.direction !== spec[0].direction ||
      old.answerScale?.min !== 0 || old.answerScale?.max !== 4 ||
      !Array.isArray(old.responseAnchors) || old.responseAnchors.length !== 5 ||
      !Array.isArray(spec[0].items) || new Set(spec[0].items).size !== 6 ||
      spec[0].items.some((id, i) => id !== old.questions[i].id)) return null
  // The approved v2 is a re-mapping of EXACT same item texts and answer
  // choices, not a license to reconstruct raw item answers from an aggregate.
  if (revised.questions.length !== 6 || revised.scoring.dimensions.some(s =>
        s.method !== 'mean' || !Array.isArray(s.items) || !s.items.length) ||
      revised.questions.some((q, i) => q.id !== old.questions[i].id ||
        q.text !== old.questions[i].text) ||
      JSON.stringify(revised.responseAnchors) !== JSON.stringify(old.responseAnchors)) return null
  const membership = new Map()
  for (const part of revised.scoring.dimensions) for (const id of part.items) {
    if (membership.has(id)) return null
    membership.set(id, part)
  }
  if (membership.size !== 6 || old.questions.some(q => !membership.has(q.id))) return null
  const values = Array.from({length: 25}, (_, i) => round2(i / 6))
  if (!values.includes(dimension.value)) return null
  const lang = locale === 'ru' ? 'ru' : 'en'
  const copy = COPY[lang]
  const index = n => Math.max(0, Math.min(4, Math.floor(n + 0.5)))
  const buckets = Array.from({length: 5}, () => [])
  values.forEach(n => buckets[index(n)].push(n))
  if (buckets.some(b => !b.length)) return null
  const labels = STAGES[lang]
  const notes = [copy.first,copy.second,copy.middle,copy.fourth,copy.fifth]
  const topic = lang === 'ru' ? ({
    'hh-money-pressure':'денежных переживаниях и доступных действиях',
    'hh-overthinking-loop':'повторяющихся размышлениях и возможности переключиться',
    'hh-screen-saturation':'экранной перегрузке и облегчении после паузы',
  })[old.key] : ({
    'hh-money-pressure':'money worries and available coping actions',
    'hh-overthinking-loop':'repetitive thinking and interrupting the loop',
    'hh-screen-saturation':'screen overload and relief after time offline',
  })[old.key]
  const number=NUM(lang)
  const rows = buckets.map((bucket, i) => {
    const from = bucket[0], to = bucket.at(-1)
    return Object.freeze({
      code: 'historic-mixed-response-' + (i + 1),
      from, to, displayRange: number.format(from) + '–' + number.format(to),
      label: labels[i], note: (lang === 'ru' ? 'В исторической анкете о ' + topic + ': ' :
        'In the archived questionnaire about ' + topic + ': ') + notes[i] +
        (lang === 'ru' ? ' Возможные средние баллы: ' : ' Attainable mean scores: ') +
        bucket.map(value => number.format(value)).join(', ') + '.',
      current: bucket.includes(dimension.value),
    })
  })
  if (rows.filter(row => row.current).length !== 1) return null
  let localized = old
  if (lang !== old.instrumentLocale) {
    try {
      const candidate = getAssessmentDefinition(old.key, 'v1', lang)
      if (candidate.questions.length === old.questions.length &&
          candidate.questions.every((q, i) => q.id === old.questions[i].id) &&
          candidate.scoring.dimensions[0].key === spec[0].key) localized = candidate
    } catch { /* Keep original text if translation cannot be audited. */ }
  }
  const questions = old.questions.map((q, i) => {
    const part = membership.get(q.id)
    const localPart = lang === old.instrumentLocale ? part : (() => {
      try {
        const alt = getAssessmentDefinition(old.key,'v2',lang)
        return alt.scoring.dimensions.find(s => s.key === part.key) || part
      } catch { return part }
    })()
    return Object.freeze({
      id:q.id,
      text: localized.questions[i].text,
      domain: localPart.sourceConstruct,
    })
  })
  return Object.freeze({
    kind:'historical-mixed', basis:'historical-mixed-mean-v1',
    rows:Object.freeze(rows), current:rows.find(row => row.current),
    sourceQuestions:Object.freeze(questions),
    scoringNote:copy.method,
    caution:copy.caution,
    rangeTitle:copy.range,
    heading:copy.root,
    description:lang === 'ru' ? 'Только положение исторического общего среднего; направления вопросов различаются.' :
      'The archived average is an arithmetic position only; individual items point in different directions.',
    newerVersion:'v2',
    oldVersion:'v1',
  })
}
