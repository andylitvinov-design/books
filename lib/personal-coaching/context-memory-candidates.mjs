import { likelySensitiveDisclosure } from '../holistic-support/client-memory-core.mjs'

// Derive transient candidates from a server-verified saved review. No transcript,
// generated summary, or unaccepted action is eligible.
export function reviewedReportMemoryCandidates(record) {
  const report = record?.report
  if (!record?.id || !Number.isSafeInteger(record.revision) || record.revision < 1 ||
      report?.status !== 'reviewed' || report.review?.status !== 'confirmed' ||
      !Array.isArray(report.actionCandidates) || !Array.isArray(report.evidence)) return []

  const candidates = []
  for (const action of report.actionCandidates) {
    if (action?.origin !== 'client_selected' || action.status !== 'accepted' ||
        typeof action.candidateId !== 'string' || typeof action.text !== 'string' ||
        !action.text.trim() || action.text.length > 240 || likelySensitiveDisclosure(action.text)) continue
    const acceptance = report.evidence.find(event =>
      event?.kind === 'client_action_acceptance' && event.source === 'client_report_review' &&
      event.value === action.text && event.evidenceId === 'review:accept:' + action.candidateId &&
      action.sourceEvidenceIds?.includes(event.evidenceId))
    if (!acceptance) continue
    candidates.push({ reportId: record.id, sourceRevision: record.revision,
      candidateId: action.candidateId, text: action.text, status: 'candidate' })
    if (candidates.length === 4) break
  }
  return candidates
}
