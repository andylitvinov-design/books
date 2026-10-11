export function publicAssessmentView(record) {
  if (!record || record.status !== 'shared') return undefined
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    occurredOn: record.occurredOn,
    language: record.language,
    sourceName: record.sourceName,
    sourceVersion: record.sourceVersion,
    description: record.description,
    originalResult: record.originalResult,
    practitionerComment: record.practitionerComment,
    ...(record.profileArea && record.profileArea !== 'general' ? { profileArea: record.profileArea } : {}),
  }
}

/**
 * A delivery invitation is not a full report. Even with a valid bearer link,
 * save-enabled invitations receive only minimal header data until the client
 * explicitly uses Google sign-in and the report is attached to their account.
 * Never use CSS blur as a confidentiality boundary.
 */
export function reportInvitationPreview(report) {
  if (!report) return undefined
  return {
    title: report.title,
    kind: report.kind,
    occurredOn: report.occurredOn,
    language: report.language,
  }
}
