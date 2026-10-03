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
  }
}
