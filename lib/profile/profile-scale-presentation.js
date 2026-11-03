import { interpretationBandModel } from '../assessments/interpretation-registry.js'

// Snapshot rows are not provenance. Resolve the original account result and
// match its exact dimension before exposing any source-defined screening band.
export function profileScreeningPresentation(row, results = [], locale = 'en') {
  const result = Array.isArray(results) ? results.find(item => item?.id === row?.sourceResultId) : null
  const screening = row?.key === 'symptoms.asrs6.shaded_count' || row?.displayKind === 'screening-count' ||
    result?.definitionKey === 'asrs-6' || result?.scoringKey === 'asrs-v1-6-classic'
  if (!screening) return null
  const unavailable = { verified: false, label: locale === 'ru'
    ? 'Скрининговый результат не подтверждён; интерпретация недоступна.'
    : 'Screening result is unverified; interpretation is unavailable.' }
  if (!result || !row?.sourceResultId || row.sourceDefinitionId !== result.definitionId ||
      row.instrumentLocale !== result.instrumentLocale || row.measurementAt !== result.measurementAt) return unavailable
  const dimension = Array.isArray(result.dimensions) ? result.dimensions.find(item => item?.key === row.key) : null
  const fields = ['key', 'value', 'min', 'max', 'direction', 'dimensionClass', 'unit', 'timeframe', 'displayKind', 'sourceConstruct']
  if (!dimension || fields.some(field => row[field] !== dimension[field])) return unavailable
  const model = interpretationBandModel(result, dimension, locale)
  if (!model.verified || model.basis !== 'screening' || !model.currentBand) return unavailable
  return { verified: true, label: model.currentBand.label + '. ' + (locale === 'ru'
    ? 'Скрининг, не диагноз и не шкала тяжести.'
    : 'Screening, not a diagnosis or severity scale.') }
}
