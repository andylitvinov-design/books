import { IPIP_BIG_FIVE_50_EN_V1 as instrument } from '../../data/assessments/ipip-big-five-50-en-v1.js'

// Input is a server-owned row joined to its finalized run. Project exactly one
// selected scale from the reviewed instrument version.
export function projectSelectedAssessmentScore(row, { accountId, resultId, scaleKey } = {}) {
  if (!accountId || !resultId || row?.id !== resultId || row.account_id !== accountId ||
      row.run_status !== 'completed' || row.source_version_id !== instrument.id ||
      row.scoring_version !== instrument.scoringVersion ||
      row.result_version !== instrument.resultVersion) return null

  const scale = instrument.scoring.dimensions.find(candidate => candidate.key === scaleKey)
  const matches = Array.isArray(row.dimensions) ?
    row.dimensions.filter(candidate => candidate?.key === scaleKey) : []
  const score = matches[0]?.value
  const measuredAt = new Date(row.measurement_at ?? NaN)
  if (!scale || matches.length !== 1 || !Number.isInteger(score) ||
      score < scale.min || score > scale.max || !Number.isFinite(measuredAt.getTime())) return null

  return {
    instrument: instrument.title, method: 'self-report sum',
    measuredOn: measuredAt.toISOString().slice(0, 10),
    scale: scale.sourceConstruct, score, min: scale.min, max: scale.max,
    evidenceKind: 'validated_test_score', limitation: 'Descriptive self-report score, not a diagnosis.',
  }
}
