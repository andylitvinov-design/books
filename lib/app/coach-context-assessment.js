import 'server-only'
import { operationHash } from './crypto.js'
import { projectSelectedAssessmentScore } from '../coaching/context-cloud-assessment-projection.mjs'
import { IPIP_BIG_FIVE_50_EN_V1 as instrument } from '../../data/assessments/ipip-big-five-50-en-v1.js'

export async function listCoachAssessmentChoices(db, actor) {
  const { rows } = await db.query(
    `select r.id, r.measurement_at
       from app.assessment_results r
       join app.assessment_runs run on run.id = r.run_id and run.account_id = r.account_id
        and run.assessment_version_id = r.source_version_id
      where r.account_id = $1 and r.source_version_id = $2 and r.scoring_version = $3
        and r.result_version = $4 and run.status = 'completed'
      order by r.measurement_at desc, r.id limit 25`,
    [actor.id, instrument.id, instrument.scoringVersion, instrument.resultVersion],
  )
  return rows.map(row => ({
    resultId: row.id, instrument: instrument.title,
    measuredOn: new Date(row.measurement_at).toISOString().slice(0, 10),
    scales: instrument.scoring.dimensions.map(scale => ({ key: scale.key, label: scale.sourceConstruct })),
  }))
}

// Use the same authenticated owner transaction that reads consent. Select the
// requested dimension inside PostgreSQL so other scales never leave the query.
export async function readSelectedCoachAssessment(db, config, actor, { resultId, scaleKey }) {
  if (!actor?.id || typeof resultId !== 'string' || typeof scaleKey !== 'string' ||
      !/^trait\.ipip50\.[a-z_]+$/.test(scaleKey)) return null

  const { rows: [row] } = await db.query(
    `select r.id, r.account_id, r.source_version_id, r.scoring_version,
            r.result_version, r.measurement_at, run.status as run_status,
            (select jsonb_agg(jsonb_build_object('key', d->>'key', 'value', d->'value'))
               from jsonb_array_elements(r.dimensions) as dims(d)
              where d->>'key' = $3) as dimensions
       from app.assessment_results r
       join app.assessment_runs run on run.id = r.run_id and run.account_id = r.account_id
        and run.assessment_version_id = r.source_version_id
      where r.account_id = $1 and r.id = $2 and run.status = 'completed'`,
    [actor.id, resultId, scaleKey],
  )
  const score = projectSelectedAssessmentScore(row, { accountId: actor.id, resultId, scaleKey })
  if (!score) return null
  const sourceRevision = operationHash({
    purpose: 'coach-context-assessment', resultId, scaleKey, score,
    sourceVersion: row.source_version_id, scoringVersion: row.scoring_version,
    resultVersion: row.result_version,
  }, config)
  return { score, sourceRevision }
}
