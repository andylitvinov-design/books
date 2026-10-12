import { gunzipSync } from 'node:zlib'
// Inserts reviewed non-personal content only. Import from isolated setup or use
// prepare-assessment-interpretation-sql.mjs for an offline release artifact; no live connection.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { validateProvenance } from '../lib/assessments/definitions.js'
import { STORED_INTERPRETATION_VERSION as version } from '../lib/assessments/stored-interpretation.js'
export async function preparedInterpretationRecords() {
  return JSON.parse(gunzipSync(await readFile(new URL('../data/assessment-interpretations/'+version+'.json.gz',import.meta.url))).toString('utf8')).records
}
export function assertPreparedRecord(record) {
  const payload=record.payload, definition=validateProvenance(payload.identity)
  if(record.definitionId!==definition.id || record.uiLocale!==payload.uiLocale || !['en','ru'].includes(record.uiLocale) ||
    record.interpretationVersion!==version || payload.interpretationVersion!==version ||
    record.payloadHash!=='sha256:'+createHash('sha256').update(canonicalJSON(payload)).digest('hex')) throw new Error('INVALID_INTERPRETATION_RECORD')
  return definition
}
const identityColumns={definitionKey:'definition_key',definitionVersion:'definition_version',instrumentLocale:'instrument_locale',translationVersion:'translation_version',contentHash:'content_hash',scoringKey:'scoring_key',scoringVersion:'scoring_version',timeframe:'timeframe'}
export async function seedAssessmentInterpretations(db, records) {
  const ids=[...new Set(records.map(record=>assertPreparedRecord(record).id))]
  const definitions=(await db.query('select * from app.assessment_versions where id=any($1::uuid[])',[ids])).rows
  const byId=new Map(definitions.map(row=>[row.id,row]))
  let inserted=0,unchanged=0
  for(const record of records) {
    const definition=assertPreparedRecord(record),identity=record.payload.identity,row=byId.get(record.definitionId)
    if(!row || row.status!=='published' || Object.entries(identityColumns).some(([key,column])=>identity[key]!==row[column]) ||
      definition.resultVersion!==row.definition?.resultVersion || canonicalJSON(definition)!==canonicalJSON(row.definition)) throw new Error('REGISTERED_INSTRUMENT_MISMATCH:'+record.definitionId)
    const existing=(await db.query(`select * from app.assessment_interpretation_versions where assessment_version_id=$1 and ui_locale=$2 and interpretation_version=$3`,[record.definitionId,record.uiLocale,version])).rows[0]
    if(existing) {
      if(existing.status!=='published' || existing.payload_hash!==record.payloadHash || canonicalJSON(existing.payload)!==canonicalJSON(record.payload) ||
        existing.instrument_content_hash!==definition.contentHash || existing.scoring_key!==definition.scoringKey || existing.scoring_version!==definition.scoringVersion || existing.result_version!==definition.resultVersion ||
        existing.definition_key!==definition.key || existing.definition_version!==definition.version || existing.instrument_locale!==definition.instrumentLocale || existing.translation_version!==definition.translationVersion)
        throw new Error('IMMUTABLE_INTERPRETATION_CONFLICT:'+record.definitionId+'/'+record.uiLocale)
      unchanged++;continue
    }
    await db.query(`insert into app.assessment_interpretation_versions
      (assessment_version_id,definition_key,definition_version,instrument_locale,translation_version,instrument_content_hash,scoring_key,scoring_version,result_version,ui_locale,interpretation_version,payload,payload_hash)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
    [definition.id,definition.key,definition.version,definition.instrumentLocale,definition.translationVersion,definition.contentHash,definition.scoringKey,definition.scoringVersion,definition.resultVersion,record.uiLocale,version,JSON.stringify(record.payload),record.payloadHash])
    inserted++
  }
  return {inserted,unchanged,total:records.length}
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const records=await preparedInterpretationRecords()
  for(const record of records)assertPreparedRecord(record)
  if(!process.argv.includes('--check'))throw new Error('Use --check; this compiler never opens a database connection. A reviewed migrator must call seedAssessmentInterpretations inside one transaction.')
  console.log(JSON.stringify({version,records:records.length,identities:new Set(records.map(r=>r.definitionId)).size,hashes:'verified',database:'not connected'}))
}
