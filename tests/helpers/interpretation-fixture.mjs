import { gunzipSync } from 'node:zlib'
// Synthetic test helper: uses the same prepared content artifact as the DB seed.
// Production code never imports this file or falls back to this artifact.
import { readFileSync } from 'node:fs'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'
import { resolveStoredInterpretation, STORED_INTERPRETATION_VERSION } from '../../lib/assessments/stored-interpretation.js'
const records = JSON.parse(gunzipSync(readFileSync(new URL('../../data/assessment-interpretations/'+STORED_INTERPRETATION_VERSION+'.json.gz',import.meta.url))).toString('utf8')).records
const byKey=new Map(records.map(row=>[row.definitionId+'/'+row.uiLocale,row]))
export function withInterpretationFixture(result) {
  const interpretations={}
  for(const locale of ['en','ru']) {
    const row=byKey.get(result?.definitionId+'/'+locale)
    if(row)interpretations[locale]=resolveStoredInterpretation(result,row.payload,locale,row.payloadHash)
  }
  return {...result,interpretations}
}
export function buildFixtureReport(result,locale='en') {return buildAssessmentResultReport(withInterpretationFixture(result),locale)}
