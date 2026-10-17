/** Pure reader for immutable, exact-provenance interpretation payloads. Never executes stored code. */
export const INTERPRETATION_PAYLOAD_SCHEMA = 'hh-interpretation.v1'
const IDENTITY = { assessmentVersionId: 'definitionId', definitionKey: 'definitionKey', definitionVersion: 'definitionVersion', instrumentLocale: 'instrumentLocale', translationVersion: 'translationVersion', scoringKey: 'scoringKey', scoringVersion: 'scoringVersion', resultVersion: 'resultVersion', contentHash: 'contentHash' }
const SIGNATURE = ['key', 'min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct', 'displayKind']
const plain = x => !!x && typeof x === 'object' && !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x))
const finiteUnique = values => Array.isArray(values) && values.length > 0 && values.every(Number.isFinite) && new Set(values).size === values.length
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const textArray = value => Array.isArray(value) && value.every(nonempty)
const sourceLink = value => value === null || (typeof value === 'string' && /^https?:\/\//.test(value))
const bandFields = ['code','from','to','includeFrom','includeTo','label','source']
function validTemplate(template, spec, values) {
  if (!plain(template) || template.verified !== true || !['descriptive','screening','published-reference'].includes(template.basis) ||
      !['code','label','summary','meaning','construct'].every(key=>nonempty(template[key])) ||
      !textArray(template.actions) || !textArray(template.limitations) || !sourceLink(template.source) ||
      typeof template.recommendedReview!=='boolean' || typeof template.reliableDirection!=='boolean' ||
      !['difficulty','resource','neutral'].includes(template.presentationDirection) ||
      !Array.isArray(template.bands) || typeof template.continuous!=='boolean') return false
  if (template.basis==='descriptive') return template.continuous===true && template.code==='continuous' && template.bands.length===0 && template.currentBand===null
  if (template.continuous || !template.bands.length || !plain(template.currentBand)) return false
  if (template.bands.some(band=>!plain(band) || !nonempty(band.code) || !nonempty(band.label) || !sourceLink(band.source) || !Number.isFinite(band.from) || !Number.isFinite(band.to) || band.from>band.to || band.from<spec.signature.min || band.to>spec.signature.max || band.includeFrom!==true || band.includeTo!==true)) return false
  if (new Set(template.bands.map(band=>band.code)).size!==template.bands.length) return false
  for(const value of spec.allowedValues) if(template.bands.filter(band=>value>=band.from&&value<=band.to).length!==1)return false
  return values.every(value=>{
    const chosen=template.bands.find(band=>value>=band.from&&value<=band.to)
    return chosen?.code===template.code && bandFields.every(key=>chosen[key]===template.currentBand[key])
  })
}
const format = value => Number(value.toFixed(2)).toString()
function render(value, score) {
  if (typeof value === 'string') return value.replaceAll('{{value}}', format(score))
  if (Array.isArray(value)) return value.map(part => render(part, score))
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([key, part]) => [key, render(part, score)]))
  return value
}
/** Returns null on every missing/mismatched/invalid input. Caller may use ONLY exact-provenance code fallback. */
export function storedInterpretationForDimension(payload, result, dimension, locale, interpretationVersion) {
  if (!plain(payload) || payload.schemaVersion !== INTERPRETATION_PAYLOAD_SCHEMA || payload.reportLocale !== locale || payload.interpretationVersion !== interpretationVersion || payload.rendererStrategy !== 'finite-domain-template.v1' || !plain(payload.provenance)) return null
  if (Object.entries(IDENTITY).some(([saved, input]) => payload.provenance[saved] !== result?.[input])) return null
  if (payload.timeframe !== result?.timeframe || !Array.isArray(payload.dimensions) || !Array.isArray(result?.dimensions) || result.dimensions.length !== payload.dimensions.length) return null
  for (let index = 0; index < payload.dimensions.length; index++) {
    const expected = payload.dimensions[index], actual = result.dimensions[index]
    if (!plain(expected) || !plain(actual) || !Number.isFinite(actual.value) || !finiteUnique(expected.allowedValues) || !expected.allowedValues.includes(actual.value) || SIGNATURE.some(key => expected.signature?.[key] !== actual[key])) return null
  }
  const index = result.dimensions.findIndex(part => part === dimension)
  // The actual dimension object from the validated result is required; no detached spoof.
  if (index < 0) return null
  const spec = payload.dimensions[index]
  if (!Array.isArray(spec.variants) || !spec.variants.length || spec.variants.some(variant => !plain(variant) || !finiteUnique(variant.values) || variant.values.some(value => !spec.allowedValues.includes(value)) || !validTemplate(variant.template, spec, variant.values))) return null
  const declaredValues=spec.variants.flatMap(variant => variant.values)
  if(new Set(declaredValues).size!==declaredValues.length || declaredValues.length!==spec.allowedValues.length) return null
  const matches = spec.variants.filter(variant => variant.values.includes(dimension.value))
  if (matches.length !== 1 || !plain(matches[0].template)) return null
  const output = render(matches[0].template, dimension.value)
  if (output.verified !== true || typeof output.meaning !== 'string' || !output.meaning || typeof output.construct !== 'string' || !output.construct) return null
  return output
}
