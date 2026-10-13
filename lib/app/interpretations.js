import 'server-only'
import { createHash } from 'node:crypto'
import { canonicalJSON } from '../assessments/contracts.js'
import { verifiedResult, interpretationUnavailable } from '../assessments/result-integrity.js'
import { matchingIdentity, resolveStoredInterpretation, STORED_INTERPRETATION_VERSION } from '../assessments/stored-interpretation.js'
const columns = {definitionId:'assessment_version_id',definitionKey:'definition_key',definitionVersion:'definition_version',instrumentLocale:'instrument_locale',translationVersion:'translation_version',contentHash:'instrument_content_hash',scoringKey:'scoring_key',scoringVersion:'scoring_version',resultVersion:'result_version'}
export function verifiedContentRecord(row, result, locale) {
  if (!row || row.status !== 'published' || row.ui_locale !== locale || row.interpretation_version !== STORED_INTERPRETATION_VERSION ||
      Object.entries(columns).some(([key,column])=>row[column] !== result[key]) ||
      !matchingIdentity(result,row.payload?.identity) || row.payload?.uiLocale !== locale ||
      row.payload?.interpretationVersion !== row.interpretation_version) return false
  return row.payload_hash === 'sha256:' + createHash('sha256').update(canonicalJSON(row.payload)).digest('hex')
}
function collect(value, found = [], seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || value instanceof Date || seen.has(value)) return found
  seen.add(value)
  if (typeof value.definitionKey === 'string' && Array.isArray(value.dimensions) &&
      ['definitionId','contentHash','scoringKey','scoringVersion','resultVersion','instrumentLocale','translationVersion','definitionVersion','timeframe'].every(key=>Object.hasOwn(value,key))) found.push(value)
  else for (const child of Object.values(value)) collect(child,found,seen)
  return found
}
function replace(value, prepared) {
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) return value
  if (prepared.has(value)) return {...value,interpretations:prepared.get(value)}
  if (Array.isArray(value)) return value.map(child=>replace(child,prepared))
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,replace(child,prepared)]))
}
// One lookup for all authorized results already selected by the repository.
// This boundary also covers submit/retry, bootstrap, reload, saved/shared and
// practitioner result responses; it never broadens the selection of client rows.
export async function attachDatabaseInterpretations(db, value) {
  const results = collect(value)
  if (!results.length) return value
  const valid = results.filter(verifiedResult)
  const ids = [...new Set(valid.map(result=>result.definitionId))]
  let rows = []
  if (ids.length) {
    // During a coordinated schema/code rollout, missing content fails closed
    // without putting the transaction into PostgreSQL's aborted state.
    const exists = (await db.query("select coalesce(has_table_privilege(current_user,to_regclass('app.assessment_interpretation_versions'),'SELECT'),false) as available")).rows[0]?.available
    if (exists) rows = (await db.query(
      `select * from app.assessment_interpretation_versions
       where assessment_version_id=any($1::uuid[]) and interpretation_version=$2
         and ui_locale in ('en','ru') and status='published'`, [ids,STORED_INTERPRETATION_VERSION])).rows
  }
  const byKey = new Map()
  for (const row of rows) {
    const key=row.assessment_version_id+'/'+row.ui_locale
    // Multiple rows for an exact key must not silently select one.
    byKey.set(key,byKey.has(key)?null:row)
  }
  const prepared = new Map()
  for (const result of results) {
    const interpretations = {}
    for (const locale of ['en','ru']) {
      const row=byKey.get(result.definitionId+'/'+locale)
      interpretations[locale] = verifiedResult(result) && verifiedContentRecord(row,result,locale)
        ? resolveStoredInterpretation(result,row.payload,locale,row.payload_hash) : interpretationUnavailable(locale)
    }
    prepared.set(result,interpretations)
  }
  return replace(value,prepared)
}
