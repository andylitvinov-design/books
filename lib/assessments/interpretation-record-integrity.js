// Server/build-time integrity checks. No credentials or external connections.
import crypto from 'node:crypto'
import { APPROVED_INTERPRETATION_DIGESTS } from './interpretation-approved-digests.js'

export function interpretationRecordApprovalKey({ definitionId, contentHash, interpretationVersion, reportLocale }) {
 return JSON.stringify([definitionId, contentHash, interpretationVersion, reportLocale])
}
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
export function validInterpretationRecord(row, {definitionId, contentHash, interpretationVersion, reportLocale} = {}) {
 try {
  if(!row || row.assessment_version_id!==definitionId || row.definition_content_hash!==contentHash || row.interpretation_version!==interpretationVersion || row.report_locale!==reportLocale) return false
  const p=row.payload
  if(!p || p.schemaVersion!=='hh-interpretation.v1' || p.interpretationVersion!==interpretationVersion || p.reportLocale!==reportLocale || p.provenance?.assessmentVersionId!==definitionId || p.provenance?.contentHash!==contentHash || canonical(p.provenance)!==canonical(row.provenance) || p.sourceCommit!==row.source_commit || p.rulesEngineVersion!==row.rules_engine_version) return false
  const bytes=canonical(p)
  return bytes===row.payload_canonical && row.payload_sha256==='sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')
 } catch { return false }
}
export async function loadInterpretationRecord(db, identity, { approvedDigests = APPROVED_INTERPRETATION_DIGESTS } = {}) {
 const {definitionId,contentHash,interpretationVersion,reportLocale}=identity
 if(!['en','ru'].includes(reportLocale)||!interpretationVersion||!definitionId||!contentHash) return null
 // db is an existing server transaction already scoped to hh_app_backend.
 // Explicit immutable version selection; never 'latest', no mutation or stored client result access.
 const response=await db.query('SELECT assessment_version_id, interpretation_version, report_locale, definition_content_hash, provenance, source_commit, rules_engine_version, payload_sha256, payload_canonical, payload FROM app.assessment_interpretation_versions WHERE assessment_version_id=$1 AND interpretation_version=$2 AND report_locale=$3 AND definition_content_hash=$4', [definitionId,interpretationVersion,reportLocale,contentHash])
 if(response.rows?.length!==1 || !validInterpretationRecord(response.rows[0],identity))return null
 const key=interpretationRecordApprovalKey(identity)
 if(!Object.hasOwn(approvedDigests,key) || approvedDigests[key]!==response.rows[0].payload_sha256)return null
 return response.rows[0].payload
}
