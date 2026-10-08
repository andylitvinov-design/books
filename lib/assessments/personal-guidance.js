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

function title(result, locale) {
  const item = monitoringCatalogItem(result.definitionKey)
  return item?.title?.[locale] || item?.title?.en || result.definitionKey
}

export function assessmentHistoryGroups(results = [], runs = [], locale = 'en') {
  const groups = new Map()
  for (const result of sorted(results)) {
    const key = result.definitionKey
    const current = groups.get(key) || { key, title: title(result, locale), latest: result, history: [], draft: null }
    current.history.push(result)
    groups.set(key, current)
  }
  for (const run of Array.isArray(runs) ? runs : []) {
    if (!run?.definitionKey || !['draft', 'in_progress'].includes(run.status)) continue
    const key = run.definitionKey
    const current = groups.get(key) || { key, title: title(run, locale), latest: null, history: [], draft: null }
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
  const ordered = sorted(results)
  for (const current of ordered) {
    const compatible = resultChangeSummary(current, ordered)
    if (!compatible.previous) continue
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
  const current = sorted(results)[0]
  if (!current) return ''
  // This is a reflective prompt tied to measured constructs, never clinical triage.
  const previous = resultChangeSummary(current, results)
  const mostChanged = previous.changes
    .map((change) => ({ ...change, range: Math.max(1, (current.dimensions.find((d) => d.key === change.key)?.max ?? 10) - (current.dimensions.find((d) => d.key === change.key)?.min ?? 0)) }))
    .sort((a, b) => Math.abs(b.delta) / b.range - Math.abs(a.delta) / a.range)[0]
  const constructs = [mostChanged?.key, ...current.dimensions.map((dimension) => dimension.key)].filter(Boolean).join(' ').toLowerCase()
  const tipKey = /sleep|сон/.test(constructs) ? 'sleep'
    : /fatigue|energy|resource|recovery|ресурс|устал/.test(constructs) ? 'energy'
      : /tension|stress|anxiety|load|напряж|тревог/.test(constructs) ? 'stress'
        : /relationship|support|contact|отношен|поддерж/.test(constructs) ? 'connections'
          : 'context'
  const prompts = {
    sleep: { en: 'For the next check-in, note your sleep and energy for a few days. Look for patterns rather than one-day conclusions.', ru: 'Перед следующим замером несколько дней отмечайте сон и энергию. Ищите повторяющиеся закономерности, а не делайте вывод по одному дню.' },
    energy: { en: 'Notice which activities, pauses or contacts seem to replenish your energy. Write down the context before comparing your next check-in.', ru: 'Отмечайте, какие занятия, паузы или контакты помогают восстанавливать силы. Запишите контекст, чтобы сопоставить его со следующим замером.' },
    stress: { en: 'Notice when you feel more or less tense and what support seems useful. Keep observations separate from assumptions about the cause.', ru: 'Замечайте, когда напряжение усиливается или ослабевает и какая поддержка помогает. Отделяйте наблюдения от предположений о причинах.' },
    connections: { en: 'Reflect on which interactions have felt supportive and what boundaries or needs mattered to you.', ru: 'Отметьте, в каком общении вы ощущали поддержку и какие потребности или границы были для вас важны.' },
    context: { en: 'Before your next check-in, record what changed in everyday life and what helped. Your scores alone do not explain why.', ru: 'Перед следующим тестом запишите, что изменилось в повседневной жизни и что помогало. Одни баллы не объясняют причин.' },
  }
  return (prompts[tipKey][locale] || prompts[tipKey].en)
}

export function nextPersonalRecommendation({ results = [], snapshot = null, locale = 'en', now = Date.now() } = {}) {
  const ru = locale === 'ru'
  const ordered = sorted(results)
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

export function resultChangeSummary(result, results = [], locale = 'en') {
  const previous = sorted(results).find((r) => r.id !== result?.id && (!r.accountId || !result?.accountId || r.accountId === result.accountId) && r.definitionId === result?.definitionId && r.contentHash === result?.contentHash && r.instrumentLocale === result?.instrumentLocale && r.scoringVersion === result?.scoringVersion && r.resultVersion === result?.resultVersion && Date.parse(r.measurementAt) <= Date.parse(result.measurementAt))
  if (!previous) return { previous: null, changes: [] }
  const changes = (result.dimensions || []).flatMap((dimension) => {
    const before = previous.dimensions?.find((d) => d.key === dimension.key && d.unit === dimension.unit && d.min === dimension.min && d.max === dimension.max)
    return before ? [{ key: dimension.key, from: before.value, to: dimension.value, delta: dimension.value - before.value, label: dimension.sourceConstruct || dimension.key }] : []
  })
  return { previous, changes }
}
