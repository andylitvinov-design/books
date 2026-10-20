import { exactPcPtsd5ResultDefinition } from './pc-ptsd5-runtime.js'

export const isPcPtsd5Result = (result, dimension) =>
  result?.definitionKey === 'pc-ptsd-5' || result?.scoringKey === 'pc-ptsd5-trauma' ||
  dimension?.key === 'symptoms.pcptsd5.total' ||
  (Array.isArray(result?.dimensions) && result.dimensions.some(item => item?.key === 'symptoms.pcptsd5.total'))

export function pcPtsd5Classification(result, dimension, locale = 'en') {
  const definition = exactPcPtsd5ResultDefinition(result), ru = locale === 'ru'
  if (!definition || !result.dimensions.includes(dimension)) return {
    basis: 'unavailable', code: 'invalid', label: ru ? 'Результат не подтверждён' : 'Unverified result',
    meaning: ru ? 'Версия, показатели или состояние пропуска не подтверждены.' : 'The version, dimensions or skip state could not be verified.',
    source: null, recommendedReview: false,
  }
  const skipped = dimension.responseState === 'structurally-skipped'
  const meaning = skipped
    ? (ru
      ? 'На вопрос о пережитом событии выбран NO. Пять вопросов о симптомах не задавались; 0 является результатом предусмотренного пропуска, а не пятью ответами NO и не доказательством отсутствия трудностей.'
      : 'The lifetime exposure question was answered NO. The five symptom questions were not administered; 0 is the structural-skip result, not five NO responses and not proof that difficulties are absent.')
    : (ru
      ? `Ответ YES отмечен в ${dimension.value} из пяти вопросов о последнем месяце. Здесь не применяется универсальный клинический порог; этот счёт не определяет диагноз, тяжесть состояния или вероятность заболевания.`
      : `${dimension.value} of the five past-month questions were answered YES. No universal clinical cutoff is applied here; this count does not determine a diagnosis, severity category or probability of illness.`)
  return { basis: 'descriptive', code: skipped ? 'structurally-skipped' : 'response-count',
    label: skipped ? (ru ? 'Симптомы не опрашивались' : 'Symptom questions skipped') : (ru ? 'Количество ответов YES (0–5)' : 'YES response count (0–5)'),
    construct: ru ? 'PC-PTSD-5: ответы о симптомах за последний месяц' : definition.scoring.dimensions[0].sourceConstruct,
    summary: meaning, meaning, source: definition.source.url, recommendedReview: false }
}

export function buildPcPtsd5ResultReport(result, locale = 'en') {
  const definition = exactPcPtsd5ResultDefinition(result), ru = locale === 'ru'
  const note = ru
    ? 'Оригинальная английская форма для взрослых. Перевод отчёта не является валидированной адаптацией опросника. Результат не является диагнозом или рекомендацией лечения.'
    : 'Original adult English form. Translated report text is not a validated questionnaire adaptation. The result is not a diagnosis or a treatment recommendation.'
  const support = ru
    ? 'Обсудите беспокоящие симптомы с квалифицированным специалистом независимо от балла. Ответы не отслеживаются в реальном времени.'
    : 'Discuss concerning symptoms with a qualified health professional regardless of the score. Responses are not monitored in real time.'
  return {
    rulesVersion: 'pc-ptsd5-descriptive-v1', definitionVersion: result?.definitionVersion || null,
    verified: Boolean(definition), personalityType: null,
    title: ru ? 'Ответы PC-PTSD-5' : 'PC-PTSD-5 responses',
    intro: note, methodology: note, purpose: definition?.title || (ru ? 'Результат не подтверждён' : 'Unverified result'),
    contextNote: ru ? 'Вопрос о событии относится ко всей жизни; пять вопросов о симптомах — к последнему месяцу.' : 'Exposure refers to lifetime experience; the five symptom questions refer to the past month.',
    sections: definition ? result.dimensions.map(dimension => {
      const classification = pcPtsd5Classification(result, dimension, locale)
      return { key: dimension.key, domain: 'general', title: classification.construct, construct: classification.construct,
        value: dimension.value, min: dimension.min, max: dimension.max, responseState: dimension.responseState,
        meaning: classification.meaning, summary: classification.summary, band: classification.label,
        bandBasis: 'descriptive', source: classification.source, steps: [], followUp: support,
        recommendedReview: false, presentationDirection: 'neutral' }
    }) : [],
    note, seekSupport: definition ? support : null,
  }
}
