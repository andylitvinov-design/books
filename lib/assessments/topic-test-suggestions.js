import {
  buildExplorerEntries,
  buildPublicStarterBattery,
  filterExplorerEntries,
  rankPublicTestMatches,
} from './test-explorer.js'
import { journeyFocusForTopics, journeyProblemsForTopics } from './topic-journeys.js'

// Only recommend questionnaires from the existing cleared, startable catalog.
// Precompute the small number of topic combinations on the server so the
// interaction updates instantly without a client-side catalog bundle or API calls.
export function buildTopicTestSuggestions(journey, locale = 'en') {
  if (!journey) return {}
  const entries = buildExplorerEntries({ locale: locale === 'ru' ? 'ru' : 'en', audience: 'account' })
  const available = filterExplorerEntries(entries, { availability: 'available' })
  const suggestions = {}

  for (let mask = 0; mask < (1 << journey.topics.length); mask++) {
    const chosen = journey.topics.filter((_, index) => mask & (1 << index)).map((item) => item.id)
    const focus = journeyFocusForTopics(journey, chosen)
    const problems = journeyProblemsForTopics(journey, chosen)
    const preferences = { focus, problems, depth: 'balanced' }
    const targeted = filterExplorerEntries(available, { availability: 'available', focus, problems })
    const primary = buildPublicStarterBattery(rankPublicTestMatches(targeted, preferences))
    // Some specific topics have mostly opt-in / research-only instruments.
    // Fill the small starter set only with independently eligible alternatives.
    const fallback = primary.length >= 2 ? [] : buildPublicStarterBattery(rankPublicTestMatches(available, preferences))
    const picked = [...primary, ...fallback.filter((row) => !primary.some((item) => item.key === row.key))]
      .filter((row) => row.selectable && row.starterEligible !== false && row.definition)
      .slice(0, 2)

    suggestions[chosen.slice().sort().join(',')] = picked.map((row) => {
      const fullDescription = String(row.description || row.methodology || '')
        .split(String.fromCharCode(10))[0].trim()
      const description = fullDescription.length > 230
        ? fullDescription.slice(0, 227).trimEnd() + '…'
        : fullDescription
      return {
        key: row.key,
        title: row.title,
        description,
        area: row.area || '',
        questionCount: row.questionCount ?? null,
        durationMinutes: row.durationMinutes ?? null,
        definition: {
          key: row.definition.key,
          version: row.definition.version,
          instrumentLocale: row.definition.instrumentLocale,
        },
      }
    })
  }

  return suggestions
}
