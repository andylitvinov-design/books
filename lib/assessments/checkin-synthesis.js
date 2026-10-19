import { getDefinitionById, getAssessmentDefinition } from './definitions.js'
import { verifiedHistoryResult } from './verified-history.js'

// Response-linked reflection, never a composite, diagnosis, norm, percentile,
// psychometric validity estimate or reliable-change calculation.
// Saved result/definition identities must pass the existing immutable gates.
const SUPPORTED_SCORERS = new Set(['raw-state', 'raw-dimensions', 'configured'])
const allowedDirection = new Set(['difficulty', 'resource'])
const lang = locale => locale === 'ru' ? 'ru' : 'en'

function questionLabel(definition, result, dimension, locale) {
  let localized = definition
  try {
    localized = getAssessmentDefinition(definition.key, definition.version, locale)
  } catch { /* Some forms are available only in their original language. */ }
  const question = localized.questions.find(item => item.id === dimension.key)
  const scale = localized.scoring?.dimensions?.find(item => item.key === dimension.key)
  return question?.label || scale?.sourceConstruct ||
    (dimension.key === dimension.sourceConstruct ? null : dimension.sourceConstruct) ||
    (locale === 'ru' ? 'Этот показатель' : 'This measure')
}

function positioned(section) {
  if (!section || section.bandBasis !== 'descriptive' ||
      !allowedDirection.has(section.presentationDirection) ||
      ![section.value, section.min, section.max].every(Number.isFinite) ||
      section.max <= section.min || section.value < section.min || section.value > section.max)
    return null
  const fraction = (section.value - section.min) / (section.max - section.min)
  return {
    key: section.key,
    fraction,
    // For display prioritisation ONLY: high reported difficulty or lower
    // available resource. Fractions are not comparable clinical severity.
    attention: section.presentationDirection === 'difficulty' ? fraction : 1 - fraction,
    orientation: section.presentationDirection,
    value: section.value,
    min: section.min,
    max: section.max,
    dimensionClass: section.dimensionClass,
  }
}

export function buildOriginalCheckinInsight(result, sections, locale = 'en') {
  if (!verifiedHistoryResult(result) || !result.definitionKey?.startsWith('hh-') ||
      !Array.isArray(sections) || sections.length < 2) return null
  let definition
  try { definition = getDefinitionById(result.definitionId) } catch { return null }
  if (!SUPPORTED_SCORERS.has(definition.scoringKey) ||
      !definition.source?.status?.startsWith('original-') ||
      !['past-7-days', 'right-now', 'past-30-days'].includes(definition.timeframe))
    return null
  const dimensions = new Map(result.dimensions.map(part => [part.key, part]))
  const candidates = sections.map(section => {
    const source = dimensions.get(section.key)
    const item = positioned(section)
    if (!item || !source || source.value !== item.value ||
        source.min !== item.min || source.max !== item.max ||
        source.dimensionClass === 'trait' ||
        source.direction !== (item.orientation === 'difficulty'
          ? source.direction.startsWith('lower-reported-') ? source.direction : null
          : source.direction.startsWith('higher-reported-') ? source.direction : null))
      return null
    return {
      ...item,
      dimensionClass: source.dimensionClass,
      label: questionLabel(definition, result, source, lang(locale)),
    }
  }).filter(Boolean)
  if (candidates.length < 2) return null
  // This selects a reflection starting point, not a severity threshold or
  // proof that two distinct subscales measure the same psychological trait.
  const ordered = candidates.sort((a, b) => b.attention - a.attention ||
    Number(b.dimensionClass === 'function') - Number(a.dimensionClass === 'function') ||
    a.key.localeCompare(b.key))
  const first = ordered[0]
  const resource = [...candidates].filter(item => item.orientation === 'resource')
    .sort((a, b) => b.fraction - a.fraction || a.key.localeCompare(b.key))[0] || null
  const ru = lang(locale) === 'ru'
  const firstScore = String(first.value) + ' (' + first.min + '–' + first.max + ')'
  const resourceScore = resource ? String(resource.value) + ' (' + resource.min + '–' + resource.max + ')' : ''
  const focus = ru
    ? 'Для следующего самонаблюдения можно выбрать «' + first.label +
      '»: ответ ' + firstScore + '.'
    : 'One possible focus for your next check-in is “' + first.label +
      '”: response ' + firstScore + '.'
  const support = resource && resource.key !== first.key && resource.fraction > 0
    ? ru
      ? ' Среди ответов о ресурсах выше всего отмечено «' + resource.label +
        '»: ' + resourceScore + '.'
      : ' Among resource-related answers, “' + resource.label +
        '” has the highest endorsement: ' + resourceScore + '.'
    : ''
  const caution = ru
    ? ' Это лишь ориентир для обсуждения ответов, а не общий индекс здоровья, нормативное сравнение или доказательство изменения состояния.'
    : ' This is a reflection prompt based on response positions, not a health index, normative comparison or proof of meaningful change.'
  return Object.freeze({
    kind: 'original-descriptive-checkin',
    focusKey: first.key,
    resourceKey: resource?.key || null,
    summary: focus + support + caution,
  })
}
