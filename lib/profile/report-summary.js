// Saved report metadata already belongs to the signed-in account.
// Never select revoked reports, even if their timestamps are newer.
export function availableSavedReports(savedReports = []) {
  return (Array.isArray(savedReports) ? savedReports : [])
    .filter(report => report && report.id != null && report.available !== false)
}

function receivedTimestamp(report) {
  const received = Date.parse(report.savedAt || '')
  if (Number.isFinite(received)) return received
  const dated = Date.parse(report.occurredOn || '')
  return Number.isFinite(dated) ? dated : 0
}

export function latestReceivedReport(savedReports = []) {
  return availableSavedReports(savedReports)
    .sort((a, b) =>
      receivedTimestamp(b) - receivedTimestamp(a) ||
      String(b.occurredOn || '').localeCompare(String(a.occurredOn || '')) ||
      String(a.id).localeCompare(String(b.id))
    )[0] || null
}
