import { isCoreCheckinResult, checkinComparisonRows } from './checkin-result-analysis.js'
import { verifiedHistoryView, verifiedPreviousResult } from './verified-history.js'
import { interpretationForDimension } from './interpretation-registry.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { profileCompletionRecommendations } from '../profile/summary.js'

// Only deterministic, on-device matching. Free-text concerns must not be sent to analytics,
// written to a profile, or interpreted as diagnoses.
const CONCERNS = Object.freeze([
  ['anxiety', ['тревог', 'беспокой', 'страх', 'паник', 'anxi', 'worr', 'panic', 'nervous', 'ansiedad', 'miedo']],
  ['stress', ['стресс', 'напряж', 'перегруз', 'давлени', 'stress', 'overwhelm', 'pressure', 'estrés', 'agotad']],
  ['clarity', ['ясност', 'туман в голове', 'не понимаю', 'продуктив', 'brain fog', 'clear thinking', 'clarity', 'confus', 'claridad']],
  ['body', ['телесн', 'физическ', 'устал', 'сил нет', 'бессили', 'слабост', 'энерги', 'дышать', 'дыхан', 'fatigue', 'exhaust', 'physical', 'body', 'energy', 'breath', 'cansad', 'energía']],
  ['mood', ['груст', 'печал', 'уныни', 'настроен', 'подавлен', 'тоск', 'sad', 'mood', 'down', 'low spirits', 'trist', 'ánimo']],
  ['sleep', ['сон', 'сна', 'заснуть', 'бессонниц', 'спать', 'sleep', 'insomnia', 'rest', 'dormir', 'sueño']],
  ['relationships', ['отношени', 'одиноч', 'контакт', 'поддержк', 'близост', 'общени', 'relationship', 'lonel', 'connect', 'support', 'relacion', 'soledad']],
  ['resources', ['ресурс', 'восстанов', 'выгорани', 'не хватает сил', 'устойчив', 'recover', 'burnout', 'resilien', 'self-support', 'recuper', 'recurso']],
  ['attention', ['внимани', 'концентрац', 'фокус', 'отвлека', 'attention', 'focus', 'concentrat', 'distract', 'atención', 'concentración']],
  ['function', ['работ', 'дела не', 'быт', 'сложно делать', 'работоспособ', 'function', 'daily tasks', 'productiv', 'work', 'trabaj', 'funcion']],
  ['personality', ['личност', 'характер', 'привычк', 'паттерн', 'personality', 'patterns', 'traits', 'personalidad']],
  ['meaning', ['смысл', 'цель', 'куда дальше', 'направлен', 'зачем жив', 'meaning', 'direction', 'purpose', 'goals', 'sentido', 'propósito']],
])
const URGENT = /самоубий|покончить с собой|не хочу жить|kill myself|suicid|self.harm|quitarme la vida/i

export function interpretConcern(value) {
  const concern = typeof value === 'string' ? value.trim().slice(0, 500) : ''
  const lower = concern.toLocaleLowerCase()
  return {
    focus: CONCERNS.filter(([, needles]) => needles.some((needle) => lower.includes(needle))).map(([key]) => key),
    urgent: URGENT.test(concern),
  }
}

const sorted = (results = []) =>
  [...results].filter((r) => r?.id && r.definitionKey && Number.isFinite(Date.parse(r.measurementAt)))
    .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt) || String(b.id).localeCompare(String(a.id)))

export function assessmentHistoryTitle(result, locale) {
  const item = monitoringCatalogItem(result.definitionKey)
  return item?.title?.[locale] || item?.title?.en || result.definitionKey
}

export function assessmentHistoryGroups(results = [], runs = [], locale = 'en') {
  const groups = new Map()
  for (const result of sorted(results)) {
    const key = result.definitionKey
    const current = groups.get(key) || { key, title: assessmentHistoryTitle(result, locale), latest: result, history: [], draft: null }
    current.history.push(result)
    groups.set(key, current)
  }
  for (const run of Array.isArray(runs) ? runs : []) {
    if (!run?.definitionKey || !['draft', 'in_progress'].includes(run.status)) continue
    const key = run.definitionKey
    const current = groups.get(key) || { key, title: assessmentHistoryTitle(run, locale), latest: null, history: [], draft: null }
    if (!current.draft || Date.parse(run.startedAt) > Date.parse(current.draft.startedAt)) current.draft = run
    groups.set(key, current)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    prior: group.history.find((r) => r.id !== group.latest?.id && r.definitionId === group.latest?.definitionId && r.contentHash === group.latest?.contentHash) || null,
    count: group.history.length,
  })).sort((a, b) => Date.parse(b.latest?.measurementAt || b.draft?.startedAt || 0) - Date.parse(a.latest?.measurementAt || a.draft?.startedAt || 0))
}

// A change is descriptive only: it never infers pathology or the cause of a score.
export function latestScoreObservation(results = [], locale = 'en') {
  const view = verifiedHistoryView(results)
  const ordered = view.eligible
  for (const current of view.current) {
    const compatible = resultChangeSummary(current, ordered)
    if (!compatible.previous) continue
    if (isCoreCheckinResult(current)) return locale === 'ru'
      ? 'Сопоставимые ответы показаны отдельно по аспектам. Их разница не определяет важность переживания и не доказывает улучшение.'
      : 'Comparable responses are shown separately by aspect. Their differences do not determine importance or establish improvement.'
    const change = compatible.changes
      .filter((item) => Number.isFinite(item.delta) && item.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
    if (!change) continue
    const field = change.label
    return locale === 'ru'
      ? `В последних сопоставимых прохождениях показатель «${field}» изменился с ${change.from} на ${change.to}. Это описание ваших ответов, а не вывод о причине изменений.`
      : `Across your recent comparable check-ins, “${field}” moved from ${change.from} to ${change.to}. This describes your answers, not the cause of a change.`
  }
  return ''
}

export function practicalReflection(results = [], locale = 'en') {
  const current = verifiedHistoryView(results).eligible[0]
  if (!current) return ''
  if (isCoreCheckinResult(current)) return locale === 'ru'
    ? 'Выберите аспект, который важен вам сейчас. Числа описывают разные переживания и не определяют, какое из них важнее.'
    : 'Choose the aspect that matters to you now. The numbers describe different experiences and do not determine which matters most.'
  if (current.definitionKey === 'asrs-6') return locale === 'ru'
    ? 'Можно записать конкретные примеры трудностей с вниманием или активностью за последние шесть месяцев и обсудить беспокойство с квалифицированным медицинским специалистом независимо от балла.'
    : 'Consider noting concrete examples of attention or activity difficulties during the past six months and discussing concerns with a qualified healthcare professional regardless of the count.'
  // Use the same identity-verified, score-linked guidance as the detailed
  // result. A namespace such as resources.erq does not mean physical energy.
  const dimensions = Array.isArray(current.dimensions) ? current.dimensions : []
  const previous = resultChangeSummary(current, results)
  const mostChanged = previous.changes
    .filter((change) => Number.isFinite(change.delta) && change.delta !== 0)
    .map((change) => ({ ...change, range: Math.max(1, (dimensions.find((d) => d.key === change.key)?.max ?? 10) - (dimensions.find((d) => d.key === change.key)?.min ?? 0)) }))
    .sort((a, b) => Math.abs(b.delta) / b.range - Math.abs(a.delta) / a.range)[0]
  const dimension = dimensions.find((item) => item.key === mostChanged?.key) || dimensions[0]
  if (dimension) {
    const interpretation = interpretationForDimension(current, dimension, locale)
    if (interpretation.basis !== 'unavailable' && interpretation.actions.length)
      return interpretation.actions.join(' ')
  }
  return locale === 'ru'
    ? 'Перед следующим тестом запишите, что изменилось в повседневной жизни и что помогало. Одни баллы не объясняют причин.'
    : 'Before your next check-in, record what changed in everyday life and what helped. Your scores alone do not explain why.'
}

export function nextPersonalRecommendation({ results = [], snapshot = null, locale = 'en', now = Date.now() } = {}) {
  const ru = locale === 'ru'
  const view = verifiedHistoryView(results)
  const ordered = view.eligible
  if ((view.ordered.length || snapshot?.dimensions?.length) && !ordered.length) return {
    kind: 'verify', key: null, title: ru ? 'Проверьте сохранённые результаты' : 'Verify saved results',
    reason: ru ? 'Новые сохранённые результаты не подтверждены. Сравнения и рекомендации по ним недоступны; прежние значения не подставляются вместо текущих.'
      : 'The latest saved results could not be verified. Comparisons and recommendations from them are unavailable; older values are not substituted as current.',
  }
  const observation = latestScoreObservation(ordered, locale)
  const reflection = practicalReflection(ordered, locale)
  if (!ordered.length) return {
    kind: 'baseline', key: 'hh-current-state',
    title: ru ? 'Начните с короткого замера' : 'Start with a short baseline',
    reason: ru ? 'Первый результат создаст личную точку отсчёта для будущих сравнений.' : 'Your first result establishes a personal baseline for future comparisons.',
  }
  const latestByKey = assessmentHistoryGroups(ordered, [], locale)
  const due = latestByKey.filter(({ latest }) => {
    const days = Number(monitoringCatalogItem(latest.definitionKey)?.suggestedRepeatDays)
    return Number.isFinite(days) && days > 0 && (now - Date.parse(latest.measurementAt)) >= days * 86400000
  }).sort((a, b) => Date.parse(a.latest.measurementAt) - Date.parse(b.latest.measurementAt))[0]
  if (due) return {
    kind: 'repeat', key: due.key,
    observation,
    reflection,
    title: ru ? 'Повторите знакомый тест' : 'Repeat a familiar test',
    reason: ru
      ? `С момента последнего прохождения «${due.title}» прошло достаточно времени для нового замера. Сравнивайте только совместимые версии.`
      : `It may be time for another ${due.title} check-in. Compare only results from compatible versions.`,
  }
  const profile = profileCompletionRecommendations({ snapshot, results: ordered, locale, limit: 1 })
  const next = profile.recommendations[0]
  if (next) return {
    kind: 'explore', key: next.key,
    observation,
    reflection,
    title: ru ? 'Дополните картину состояния' : 'Explore another part of your wellbeing',
    reason: next.reason,
  }
  return {
    kind: 'review', key: null,
    observation,
    reflection,
    title: ru ? 'Посмотрите, что изменилось' : 'Review how things have changed',
    reason: ru ? 'У вас уже есть результаты. Сравните совместимые замеры и отметьте контекст изменений.' : 'You already have results. Compare compatible measurements and reflect on what was happening at the time.',
  }
}

export function resultChangeSummary(result, results = []) {
  const previous = verifiedPreviousResult(result, results)
  if (!previous) return { previous: null, changes: [] }
  if (isCoreCheckinResult(result) || isCoreCheckinResult(previous)) {
    const changes = checkinComparisonRows(result, previous).map(row => ({ key: row.key, from: row.prior, to: row.current, delta: row.delta, label: result.dimensions.find(item => item.key === row.key)?.sourceConstruct || row.key }))
    return { previous: changes.length ? previous : null, changes }
  }
  const changes = (result.dimensions || []).flatMap((dimension) => {
    const before = previous.dimensions?.find((d) => d.key === dimension.key && d.unit === dimension.unit && d.min === dimension.min && d.max === dimension.max)
    return before ? [{ key: dimension.key, from: before.value, to: dimension.value, delta: dimension.value - before.value, label: dimension.sourceConstruct || dimension.key }] : []
  })
  return { previous, changes }
}
