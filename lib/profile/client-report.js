import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { getDefinitionById } from '../assessments/definitions.js'
import { buildProfileSummary } from './summary.js'
import { nextPersonalRecommendation, resultChangeSummary } from '../assessments/personal-guidance.js'

// The client report is a deterministic, private rendering of already-completed,
// provenance-checked results returned to their authenticated account. It never
// infers a clinical diagnosis, prescribes medication or treats raw scores as norms.
const COPY = {
  en: {
    title: 'Personal assessment report',
    summary: 'Overall summary',
    completed: 'Completed assessments',
    attempts: 'Recorded attempts',
    scales: 'Recorded scales',
    areas: 'Profile layers covered',
    dates: 'Testing period',
    noDate: 'No date recorded',
    allScales: 'Latest profile measurements',
    insights: 'Overall observations',
    next: 'Recommendations & next steps',
    testResults: 'Results by test',
    purpose: 'About this questionnaire',
    result: 'Latest completed assessment',
    interpretations: 'What these measurements show',
    perTest: 'Assessment conclusion',
    repeats: 'Earlier compatible measurements',
    first: 'First comparable measurement; use as a personal baseline.',
    numeric: 'Reported scores are positions on this questionnaire’s own scale; they are not health percentages or diagnostic cutoffs.',
    trait: 'Personality traits are descriptive, not better-or-worse targets.',
    testWarning: 'This is a self-report measurement, not a diagnosis or a medical severity classification.',
    date: 'Measured on',
    other: 'Other recent assessment dates',
    reference: 'Source',
    change: 'Change from a compatible previous measurement',
    none: 'No comparable earlier measurement',
    noResults: 'There are no completed tests yet.',
    noUniversal: 'Different questionnaires measure different constructs; their scores must not be averaged into a universal health index.',
    trend: 'When the same scale is measured again using a compatible test version, its numerical change is shown without assuming a cause.',
    shortObservation: 'Your latest answers are saved across {tests} different tests and {scales} separate measurement scales.',
    layers: 'The current profile includes {covered} of five broad measurement layers. Missing layers indicate only that no questionnaire has measured those areas yet.',
    priority: 'Suggested next step',
    informational: 'For private self-reflection and discussion with a qualified professional. Not a diagnosis, treatment plan, urgent-care service or substitute for medical advice. Compare only compatible measurement versions.',
    private: 'Confidential · generated locally from your private account',
    range: 'Scale range',
    values: 'Value',
  },
  ru: {
    title: 'Персональный отчёт по тестированию',
    summary: 'Общие итоги',
    completed: 'Пройдено тестов',
    attempts: 'Всего прохождений',
    scales: 'Измеренных шкал',
    areas: 'Охвачено слоёв профиля',
    dates: 'Период тестирования',
    noDate: 'Дата отсутствует',
    allScales: 'Последние показатели профиля',
    insights: 'Общие наблюдения',
    next: 'Рекомендации и дальнейшие шаги',
    testResults: 'Результаты по каждому тесту',
    purpose: 'О чём этот опросник',
    result: 'Последнее завершённое прохождение',
    interpretations: 'Как понимать измерения',
    perTest: 'Вывод по тесту',
    repeats: 'Предыдущие сопоставимые замеры',
    first: 'Первый сопоставимый замер — личная точка отсчёта.',
    numeric: 'Баллы относятся к шкале конкретного опросника; это не процент здоровья и не диагностический порог.',
    trait: 'Личностные качества описательны и не делятся на хорошие или плохие.',
    testWarning: 'Самооценка состояния, а не диагноз или классификация тяжести состояния.',
    date: 'Дата измерения',
    other: 'Другие даты прохождения',
    reference: 'Источник',
    change: 'Изменение относительно сопоставимого предыдущего замера',
    none: 'Предыдущего сопоставимого измерения нет',
    noResults: 'Завершённых тестов пока нет.',
    noUniversal: 'Разные тесты измеряют разные параметры; их баллы нельзя усреднять в единый индекс здоровья.',
    trend: 'Численные изменения показаны только для совместимых версий одинаковых шкал, без предположений о причинах.',
    shortObservation: 'Ваш профиль объединяет последние результаты {tests} тестов и {scales} отдельных шкал.',
    layers: 'Измерены {covered} из пяти основных слоёв профиля. Недостающие слои означают только отсутствие соответствующих измерений.',
    priority: 'Предлагаемый следующий шаг',
    informational: 'Для личного самоанализа и обсуждения со специалистом. Не является диагнозом, назначением лечения или заменой медицинской помощи. Сопоставлять можно только совместимые версии измерений.',
    private: 'Конфиденциально · создано локально на основе приватного аккаунта',
    range: 'Диапазон',
    values: 'Значение',
  },
}

const numeric = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'
const stamp = (v) => Number.isFinite(Date.parse(v || '')) ? Date.parse(v) : 0
const fmt = (v, locale) => stamp(v) ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', { dateStyle:'medium', timeZone:'UTC' }).format(new Date(v)) : '—'
const localized = (v, locale) => v?.[locale] || v?.en || ''
const replace = (template, vars) => template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))

function safeDefinition(result) {
  try { return getDefinitionById(result.definitionId) } catch { return null }
}
function constructName(dimension) {
  return String(dimension?.sourceConstruct || dimension?.key || '').replace(/^trait\./, '')
}
function describeMeasurement(dimension, locale, change) {
  const c = COPY[locale] || COPY.en
  const display = numeric(dimension.value) + ' / ' + numeric(dimension.max)
  const core = locale === 'ru'
    ? constructName(dimension) + ': ' + display + ' (диапазон ' + numeric(dimension.min) + '–' + numeric(dimension.max) + ').'
    : constructName(dimension) + ': ' + display + ' (range ' + numeric(dimension.min) + '–' + numeric(dimension.max) + ').'
  const changed = change && Number.isFinite(change.delta)
    ? (locale === 'ru' ? ' Разница со сравнимым прошлым замером: ' : ' Change since a compatible earlier reading: ') + (change.delta > 0 ? '+' : '') + numeric(change.delta) + '.'
    : ''
  return core + changed
}
function testConclusion(latest, changeSummary, locale) {
  const ru = locale === 'ru', dims = latest.dimensions || []
  const traits = dims.some(d => d.direction === 'non-normative' || d.dimensionClass === 'trait')
  const numericChanges = changeSummary.changes.filter(d => Number.isFinite(d.delta) && d.delta !== 0)
  const baseline = numericChanges.length
    ? ru
      ? 'Сопоставимые шкалы изменились: ' + numericChanges.slice(0, 3).map(d => (d.label || d.key) + ' ' + (d.delta > 0 ? '+' : '') + numeric(d.delta)).join('; ') + '. Это численные изменения ответов, а не доказательство причин.'
      : 'Comparable scales changed: ' + numericChanges.slice(0, 3).map(d => (d.label || d.key) + ' ' + (d.delta > 0 ? '+' : '') + numeric(d.delta)).join('; ') + '. These are changes in reported values, not explanations of their cause.'
    : changeSummary.previous
      ? ru ? 'Значения сопоставимых шкал не изменились относительно предыдущего прохождения.' : 'Compatible measurement values did not change since the previous attempt.'
      : ru ? 'Это личная исходная точка отсчёта. Повторный тест поможет увидеть динамику.' : 'This is a personal baseline; a repeat could establish a time series.'
  return baseline + ' ' + (traits
    ? ru ? 'Личностные характеристики описательны и не имеют универсальной «идеальной» отметки.' : 'Personality tendencies are descriptive and have no universal ideal score.'
    : ru ? 'Интерпретируйте шкалы в пределах конкретного инструмента; результат сам по себе не является диагнозом.' : 'Interpret the scores only within this instrument; the result alone is not a diagnosis.')
}
export function buildClientReport({ account = {}, results = [], snapshot = null, locale = 'en', now = new Date() } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const c = COPY[lang]
  // Never use browser-shared local storage, guest sessions or third-party APIs.
  const ordered = [...results].filter(r => r?.id && r.definitionKey && Array.isArray(r.dimensions) && stamp(r.measurementAt))
    .sort((a,b) => stamp(a.measurementAt) - stamp(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
  const groups = new Map()
  for (const r of ordered) {
    const id = String(r.definitionId || r.definitionKey)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(r)
  }
  const tests = [...groups.values()].map(attempts => {
    const latest = attempts.at(-1)
    const def = safeDefinition(latest)
    const catalog = monitoringCatalogItem(latest.definitionKey)
    const change = resultChangeSummary(latest, ordered)
    const diffs = new Map(change.changes.map(row => [row.key,row]))
    return {
      key:latest.definitionKey, id:latest.definitionId, title:localized(catalog?.title,lang) || def?.title || latest.definitionKey,
      description:localized(catalog?.description,lang) || (lang === 'ru' ? 'Психологический опросник для самонаблюдения.' : 'A self-report assessment for personal observation.'),
      date:fmt(latest.measurementAt,lang), version:latest.definitionVersion, language:latest.instrumentLocale,
      source:latest.definitionKey + ' / ' + (latest.definitionVersion || ''),
      attemptCount:attempts.length,
      dimensions:latest.dimensions.map(d => ({
        key:d.key,label:constructName(d),value:d.value,min:d.min,max:d.max,unit:d.unit || 'points',
        direction:d.direction,dimensionClass:d.dimensionClass,
        change:diffs.get(d.key)?.delta ?? null,
        note:describeMeasurement(d,lang,diffs.get(d.key)),
      })),
      conclusion:testConclusion(latest,change,lang),
      attempts:attempts.map(r => ({
        id:r.id,date:fmt(r.measurementAt,lang),
        scales:r.dimensions.map(d => ({key:d.key,label:constructName(d),value:d.value,min:d.min,max:d.max})),
      })),
    }
  }).sort((a,b) => a.title.localeCompare(b.title,lang))
  const profile = buildProfileSummary({snapshot,results:ordered})
  const currentScales = profile.rows.map(d => ({
    key:d.key,label:constructName(d),source:d.sourceDefinitionId,
    value:d.value,min:d.min,max:d.max,unit:d.unit,dimensionClass:d.dimensionClass,
    date:fmt(d.measurementAt,lang),delta:d.delta,
  })).sort((a,b) => a.label.localeCompare(b.label,lang))
  const recommendation = nextPersonalRecommendation({results:ordered,snapshot,locale:lang,now:now instanceof Date ? now.getTime() : Date.now()})
  const measuredRange = ordered.length ? fmt(ordered[0].measurementAt,lang) + ' — ' + fmt(ordered.at(-1).measurementAt,lang) : c.noDate
  const overall = [
    replace(c.shortObservation,{tests:tests.length,scales:currentScales.length}),
    replace(c.layers,{covered:profile.coveredAxes.length}),
    c.noUniversal,
    c.trend,
  ]
  const advice = [recommendation.title + ': ' + recommendation.reason]
  if (recommendation.observation) advice.push(recommendation.observation)
  if (recommendation.reflection) advice.push(recommendation.reflection)
  advice.push(c.informational)
  return {
    language:lang, title:c.title, labels:c, accountName:String(account?.displayName || 'Holistic House client').slice(0,110),
    generatedAt:fmt(now instanceof Date ? now.toISOString() : new Date(now).toISOString(),lang),
    measuredRange,
    counts:{tests:tests.length,attempts:ordered.length,scales:currentScales.length,covered:profile.coveredAxes.length},
    latestScales:currentScales,
    tests, overall, recommendations:advice,
    disclaimer:c.informational,
  }
}
