import { getDefinitionById, getAssessmentDefinition } from './definitions.js'
import { verifiedHistoryResult } from './verified-history.js'

// Response-linked reflection, never a composite, diagnosis, norm, percentile,
// psychometric validity estimate or reliable-change calculation.
// Saved result/definition identities must pass the existing immutable gates.
const TRACKED_CHECKINS = new Set(['hh-current-state', 'hh-weekly-pulse'])
const SUPPORTED_SCORERS = new Set(['raw-state', 'raw-dimensions'])
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
  if (!verifiedHistoryResult(result) || !TRACKED_CHECKINS.has(result?.definitionKey) ||
      !Array.isArray(sections) || sections.length < 2) return null
  let definition
  try { definition = getDefinitionById(result.definitionId) } catch { return null }
  if (!SUPPORTED_SCORERS.has(definition.scoringKey) ||
      !(definition.source?.status?.startsWith('original-') || definition.key === 'hh-current-state'))
    return null
  const dimensions = new Map(result.dimensions.map(part => [part.key, part]))
  const candidates = sections.map(section => {
    const source = dimensions.get(section.key)
    const item = positioned(section)
    if (!item || !source || source.value !== item.value ||
        source.min !== item.min || source.max !== item.max ||
        source.dimensionClass === 'trait' || typeof source.direction !== 'string' ||
        (item.orientation === 'difficulty' && !source.direction.startsWith('lower-reported-')) ||
        (item.orientation === 'resource' && !source.direction.startsWith('higher-reported-')))
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
  // Different constructs are NOT interchangeable 0–100 severity scores.
  // Start with a reported difficulty when there is one; treat resources and
  // everyday functioning as independent observations, never a negative total.
  const difficulties = candidates.filter(item => item.orientation === 'difficulty')
    .sort((a, b) => b.fraction - a.fraction || a.key.localeCompare(b.key))
  const resources = candidates.filter(item => item.orientation === 'resource' &&
      (item.dimensionClass === 'resources' || item.key === 'state.resource'))
  const resource = [...resources].sort((a, b) => b.fraction - a.fraction ||
    a.key.localeCompare(b.key))[0] || null
  const lessAvailable = [...resources].sort((a, b) => a.fraction - b.fraction ||
    a.key.localeCompare(b.key))[0] || null
  // Zero on all difficulty questions is not proof of medical wellbeing.
  const first = difficulties.find(item => item.fraction > 0) ||
    lessAvailable || candidates[0]
  // Functioning and symptom load are separate self-reported constructs: a
  // resource rating cannot substitute for what the person could actually do.
  const impact = candidates.find(item =>
    item.key === 'state.life_impact' || item.key === 'weekly.functioning') || null
  const ru = lang(locale) === 'ru'
  const scoreText = item => String(item.value) + ' (' + item.min + '–' + item.max + ')'
  const windowLabel = definition.timeframe === 'right-now'
    ? (ru ? 'прямо сейчас' : 'right now')
    : definition.timeframe === 'past-7-days'
      ? (ru ? 'за последние семь дней' : 'over the past seven days')
      : (ru ? 'в указанном периоде' : 'in the stated period')
  const focus = ru
    ? 'Для следующего самонаблюдения можно выбрать «' + first.label +
      '»: ответ ' + scoreText(first) + '.'
    : 'One possible focus for your next check-in is “' + first.label +
      '”: response ' + scoreText(first) + '.'
  const support = resource && resource.key !== first.key && resource.fraction > 0
    ? ru
      ? ' Среди ответов о ресурсах выше всего отмечено «' + resource.label +
        '»: ' + scoreText(resource) + '.'
      : ' Among resource-related answers, “' + resource.label +
        '” has the highest endorsement: ' + scoreText(resource) + '.'
    : ''
  const functioning = impact && impact.key !== first.key && impact.key !== resource?.key
    ? ru
      ? ' Отдельно о повседневных делах — «' + impact.label +
        '»: ' + scoreText(impact) + '.'
      : ' Separately, everyday functioning — “' + impact.label +
        '”: ' + scoreText(impact) + '.'
    : ''
  const context = lessAvailable && resource && lessAvailable.key !== resource.key &&
      lessAvailable.key !== first.key
    ? ru
      ? ' Ещё один ответ о поддержке: «' + lessAvailable.label +
        '» — ' + scoreText(lessAvailable) +
        '. Это не показатель личного дефицита без учёта обстоятельств.'
      : ' Another support-related answer was “' + lessAvailable.label +
        '”: ' + scoreText(lessAvailable) +
        '. This does not indicate a personal deficit without context.'
    : ''
  const question = first.orientation === 'difficulty'
    ? ru
      ? 'В какой конкретной ситуации это было заметно и что, если что-то, помогало?'
      : 'In which specific situation did you notice this, and what, if anything, helped?'
    : ru
      ? 'В какой ситуации это было менее доступно и что могло бы облегчить следующий шаг?'
      : 'When did this feel less available, and what might make the next step easier?'
  const caution = ru
    ? ' Ответы относятся к периоду «' + windowLabel + '». Это ориентир для обсуждения, а не общий индекс здоровья, норма или доказательство улучшения.'
    : ' Responses refer to ' + windowLabel +
      '. This is a conversation prompt, not a health index, norm or proof of improvement.'
  return Object.freeze({
    kind: 'original-descriptive-checkin',
    focusKey: first.key,
    resourceKey: resource?.key || null,
    difficultyKey: difficulties[0]?.key || null,
    lessAvailableKey: lessAvailable?.key || null,
    impactKey: impact?.key || null,
    period: definition.timeframe,
    reflectionQuestion: question,
    summary: focus + support + context + functioning + caution,
  })
}
