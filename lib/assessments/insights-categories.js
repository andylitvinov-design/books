// A shared topic vocabulary for the public selector and private Insights.
// These are navigation categories, never new clinical scales or diagnoses.
export const HOME_TEST_TOPICS = Object.freeze([
  { key: 'stress', en: 'Stress', ru: 'Стресс', es: 'Estrés' },
  { key: 'anxiety', en: 'Anxiety', ru: 'Тревога', es: 'Ansiedad' },
  { key: 'mood', en: 'Mood', ru: 'Настроение', es: 'Ánimo' },
  { key: 'sleep', en: 'Sleep', ru: 'Сон', es: 'Sueño' },
  { key: 'body', en: 'Energy', ru: 'Энергия', es: 'Energía' },
  { key: 'relationships', en: 'Relationships', ru: 'Отношения', es: 'Relaciones' },
  { key: 'resources', en: 'Self-support', ru: 'Внутренняя опора', es: 'Apoyo interior' },
  { key: 'attention', en: 'Focus', ru: 'Концентрация', es: 'Atención' },
])

// Show the same eight topics first. Extra categories keep personality, functioning,
// Wu Xing and legacy assessments visible instead of losing them in a default filter.
export const INSIGHTS_TEST_CATEGORIES = Object.freeze([
  ...HOME_TEST_TOPICS,
  { key: 'personality', en: 'Personality', ru: 'Личность' },
  { key: 'function', en: 'Daily life', ru: 'Повседневная жизнь' },
  { key: 'meaning', en: 'Meaning & goals', ru: 'Смысл и цели' },
  { key: 'wu-xing', en: 'Wu Xing', ru: 'У-Син' },
  { key: 'other', en: 'Other tests', ru: 'Другие тесты' },
])

const ALIASES = Object.freeze({
  stress: 'stress', anxiety: 'anxiety', mood: 'mood',
  sleep: 'sleep', recovery: 'sleep',
  body: 'body', energy: 'body',
  relationships: 'relationships', relationship: 'relationships', support: 'relationships',
  resources: 'resources', resource: 'resources',
  'self-support': 'resources', self_support: 'resources',
  resilience: 'resources', emotional_regulation: 'resources',
  attention: 'attention', focus: 'attention', clarity: 'attention',
  personality: 'personality',
  function: 'function', functioning: 'function', work: 'function',
  meaning: 'meaning', purpose: 'meaning',
  'wu-xing': 'wu-xing',
})
const KNOWN = new Set(INSIGHTS_TEST_CATEGORIES.map((category) => category.key))

// Prefer explicit instrument topics for its primary heading. The published catalog
// already provides these tags; secondary areas and measured axes make it discoverable
// under other relevant filters without duplicating it on the All view.
export function categoriesForCompletedTest(entry) {
  const tags = [
    ...(entry?.topics || []),
    ...(entry?.areas || []),
    ...(entry?.measurementAxes || []),
  ]
  const matched = [...new Set(tags.map((tag) => ALIASES[String(tag || '').toLowerCase()]).filter(Boolean))]
  const primary = matched[0] || 'other'
  return { primary, members: matched.length ? matched : ['other'] }
}

// A score belongs to its real assessment, never to a fabricated combined index.
// A multi-topic assessment is rendered only once, in the first selected matching
// category (or its stable primary category when viewing all).
export function buildInsightsCategorySections(groups = [], entriesByKey = new Map(), selected = []) {
  const active = [...new Set(selected.filter((key) => KNOWN.has(key)))]
  const counts = Object.fromEntries(INSIGHTS_TEST_CATEGORIES.map((category) => [category.key, 0]))
  const buckets = new Map(INSIGHTS_TEST_CATEGORIES.map((category) => [category.key, []]))
  for (const group of groups) {
    const { primary, members } = categoriesForCompletedTest(entriesByKey.get(group.key))
    for (const key of members) counts[key] += 1
    const destination = active.length ? active.find((key) => members.includes(key)) : primary
    if (destination) buckets.get(destination).push(group)
  }
  return {
    counts,
    sections: INSIGHTS_TEST_CATEGORIES
      .filter((category) => active.length ? active.includes(category.key) : buckets.get(category.key).length > 0)
      .map((category) => ({ category, groups: buckets.get(category.key) })),
  }
}
