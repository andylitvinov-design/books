import {
  getAssessmentCatalogEntry,
  definitionLocaleFor,
} from '../../data/assessments/catalog.js'

const DAY = 86400000

const MOOD_DEFAULTS = {
  sad: ['phq-4', 'k6', 'hh-weekly-pulse'],
  neutral: ['hh-weekly-pulse', 'k6', 'hh-resource-pulse'],
  happy: ['hh-resource-pulse', 'hh-monthly-profile', 'hh-weekly-pulse'],
}

const CATEGORY_BOOST = {
  body: ['hh-current-state', 'hh-weekly-pulse', 'hh-monthly-profile'],
  energy: ['hh-weekly-pulse', 'k6', 'hh-resource-pulse'],
  emotions: ['phq-4', 'hh-resource-pulse', 'hh-weekly-pulse'],
  relationships: ['hh-resource-pulse', 'hh-monthly-profile', 'phq-4'],
  'work-money': ['k6', 'hh-weekly-pulse', 'hh-monthly-profile'],
  other: [],
}

const REASONS = {
  en: {
    sad: 'A short check may help clarify what is weighing on you today.',
    neutral: 'A brief check can show what is keeping your state steady or flat.',
    happy: 'You can also track what is supporting a good state.',
    category: 'This matches the area you selected.',
    due: 'This check is due again based on your previous result.',
    phqDepression: 'Your last 1-minute screen suggested that mood deserves a closer look.',
    phqAnxiety: 'Your last 1-minute screen suggested that anxiety deserves a closer look.',
    weeklyMood: 'Your weekly check suggests mood has been harder recently.',
    weeklyAnxiety: 'Your weekly check suggests tension has been higher recently.',
    weeklyLoad: 'Your weekly check suggests mental load has been higher recently.',
    resource: 'A resource check can show what is supporting you right now.',
  },
  ru: {
    sad: 'Короткая проверка может помочь понять, что сегодня сильнее влияет на состояние.',
    neutral: 'Короткая проверка поможет увидеть, что удерживает состояние ровным или нейтральным.',
    happy: 'Можно также отследить, что поддерживает хорошее состояние.',
    category: 'Этот вариант связан с выбранной вами областью.',
    due: 'По вашей истории эту проверку уже можно повторить.',
    phqDepression: 'Последняя минутная проверка показала, что настроение стоит рассмотреть чуть подробнее.',
    phqAnxiety: 'Последняя минутная проверка показала, что тревогу стоит рассмотреть чуть подробнее.',
    weeklyMood: 'Недельная динамика показывает, что настроение в последнее время стало тяжелее.',
    weeklyAnxiety: 'Недельная динамика показывает, что напряжение в последнее время выше.',
    weeklyLoad: 'Недельная динамика показывает, что психологическая нагрузка в последнее время выше.',
    resource: 'Проверка ресурсов поможет увидеть, что сейчас вас поддерживает.',
  },
}

function latestResult(results, key) {
  return [...results]
    .filter((result) => result.definitionKey === key)
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
    .at(-1)
}

function latestDimension(result, key) {
  return result?.dimensions?.find((dimension) => dimension.key === key)?.value
}

export function dueFor(entry, results = [], now = Date.now()) {
  const prior = latestResult(results, entry.key)
  if (!prior || !entry.cooldownDays) return { due: true, prior: prior || null, nextDueAt: null }
  const next = Date.parse(prior.measurementAt) + entry.cooldownDays * DAY
  return { due: now >= next, prior, nextDueAt: new Date(next).toISOString() }
}

function accessAllowed(entry, guest) {
  if (!entry?.startable) return false
  if (guest) return entry.guestEligible === true
  return entry.access !== 'clinician' && entry.access !== 'practitioner'
}

function activeRunFor(runs, entryKey, definitionsById) {
  return runs.find((run) => {
    if (!['draft', 'in_progress'].includes(run.status)) return false
    if (run.definitionKey) return run.definitionKey === entryKey
    const def = definitionsById?.(run.definitionId)
    return def?.key === entryKey
  })
}

function makeCandidate(key, options) {
  const entry = getAssessmentCatalogEntry(key)
  if (!entry || !accessAllowed(entry, options.guest)) return null
  const due = dueFor(entry, options.results, options.now)
  const run = activeRunFor(options.runs || [], key, options.definitionsById)
  if (!due.due && !run && !options.force) return null
  return {
    key,
    entry,
    definitionLocale: definitionLocaleFor(entry, options.locale),
    resumeRunId: run?.id || null,
    due: due.due,
    nextDueAt: due.nextDueAt,
    reasonCode: options.reasonCode || options.mood || 'due',
    reason: (REASONS[options.locale] || REASONS.en)[options.reasonCode || options.mood || 'due'],
  }
}

function branchFromPHQ4(results, options) {
  const result = latestResult(results, 'phq-4')
  if (!result) return null
  const depression = Number(latestDimension(result, 'symptoms.phq4.depression'))
  const anxiety = Number(latestDimension(result, 'symptoms.phq4.anxiety'))
  if (!(depression >= 3 || anxiety >= 3)) return null
  const key = depression >= 3 && depression >= anxiety ? 'phq-9' : 'gad-7'
  return makeCandidate(key, {
    ...options,
    reasonCode: key === 'phq-9' ? 'phqDepression' : 'phqAnxiety',
    force: false,
  })
}

export function recommendForMood({
  mood,
  category = null,
  results = [],
  runs = [],
  locale = 'en',
  guest = false,
  now = Date.now(),
  definitionsById,
  limit = 3,
} = {}) {
  if (!MOOD_DEFAULTS[mood]) return []

  const options = { mood, results, runs, locale, guest, now, definitionsById }
  const branch = !guest ? branchFromPHQ4(results, options) : null
  const defaults = [...MOOD_DEFAULTS[mood]]
  const boosts = CATEGORY_BOOST[category] || []
  const ordered = []

  if (branch) ordered.push(branch)

  for (const key of [...boosts, ...defaults]) {
    if (ordered.some((candidate) => candidate?.key === key)) continue
    const candidate = makeCandidate(key, {
      ...options,
      reasonCode: boosts.includes(key) ? 'category' : mood,
    })
    if (candidate) ordered.push(candidate)
  }

  const firstTime = results.length === 0
  if (firstTime) {
    const allowed = mood === 'happy'
      ? ['hh-resource-pulse', 'hh-weekly-pulse']
      : ['phq-4', 'hh-weekly-pulse']
    return ordered.filter((candidate) => allowed.includes(candidate.key)).slice(0, 2)
  }

  return ordered.filter(Boolean).slice(0, limit)
}

export function recommendAfterResult({
  result,
  results = [],
  runs = [],
  locale = 'en',
  guest = false,
  now = Date.now(),
  definitionsById,
} = {}) {
  if (!result) return null
  const options = { results, runs, locale, guest, now, definitionsById }

  if (result.definitionKey === 'phq-4') {
    const depression = Number(latestDimension(result, 'symptoms.phq4.depression'))
    const anxiety = Number(latestDimension(result, 'symptoms.phq4.anxiety'))
    if (!guest && (depression >= 3 || anxiety >= 3)) {
      const key = depression >= 3 && depression >= anxiety ? 'phq-9' : 'gad-7'
      return makeCandidate(key, {
        ...options,
        reasonCode: key === 'phq-9' ? 'phqDepression' : 'phqAnxiety',
      })
    }
    if (guest && (depression >= 3 || anxiety >= 3))
      return makeCandidate('k6', { ...options, reasonCode: 'due' })
  }

  if (result.definitionKey === 'hh-weekly-pulse') {
    const mood = Number(latestDimension(result, 'weekly.mood'))
    const tension = Number(latestDimension(result, 'weekly.tension'))
    const load = Number(latestDimension(result, 'weekly.stress'))
    if (mood <= 3)
      return makeCandidate('phq-4', { ...options, reasonCode: 'weeklyMood' })
    if (tension >= 7)
      return makeCandidate(guest ? 'phq-4' : 'gad-7', { ...options, reasonCode: 'weeklyAnxiety' })
    if (load >= 7)
      return makeCandidate('k6', { ...options, reasonCode: 'weeklyLoad' })
  }

  if (result.definitionKey === 'hh-resource-pulse' && !guest)
    return makeCandidate('hh-monthly-profile', { ...options, reasonCode: 'resource' })

  return null
}

export function moodTrend(checkins = [], timezone = 'UTC') {
  const byDay = new Map()
  const sorted = [...checkins].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
  for (const item of sorted) {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(item.occurredAt))
    byDay.set(day, item)
  }
  return [...byDay.entries()].map(([day, item]) => ({ day, mood: item.mood, occurredAt: item.occurredAt }))
}
