// Pure recovery policy. Provider evidence is passed only by server reconciliation;
// hold metadata is never accepted from a browser or a webhook payload snapshot.
const iso = value => value instanceof Date ? value.toISOString() : value
const key = hold => [hold.reason, hold.chargeId || '', hold.disputeId || '', hold.invoiceId || ''].join(':')
const validRef = (value, prefix) => typeof value === 'string' && new RegExp('^'+prefix+'_[A-Za-z0-9_]+$').test(value)
function validHold(value) {
  return value && ['dispute','refund','unverified_dispute'].includes(value.reason) && validRef(value.chargeId,'ch') &&
    validRef(value.invoiceId,'in') && (value.reason !== 'dispute' || validRef(value.disputeId,'dp'))
}
export function recoverSessionCredit(row, subscription, access, coverage, now = Date.now()) {
  if (!['available','requested','revoked'].includes(row.status) || Date.parse(iso(row.period_end)) <= now) return null
  const period = iso(row.period_end), stamp = new Date(now).toISOString()
  const holds = Array.isArray(row.hold_details) ? row.hold_details.map(hold => ({ ...hold })) : []
  const incoming = (Array.isArray(coverage?.holds) ? coverage.holds : []).filter(hold => hold.periodEnd === period)
  if (row.status === 'revoked' && !holds.length) holds.push({reason:'manual_review',heldAt:stamp})
  for (const item of incoming) {
    const hold = validHold(item) ? item : { reason:'manual_review' }
    const existing = holds.find(previous => key(previous) === key(hold))
    if (existing) { Object.assign(existing,hold); delete existing.resolvedAt; delete existing.resolution }
    else holds.push({...hold,heldAt:stamp})
  }
  if (subscription.revokedAt && !incoming.length && !holds.some(hold => !hold.resolvedAt))
    holds.push({reason:'manual_review',heldAt:stamp})
  const samePaidPeriod = access.active && access.tier === 'premium' && access.paidThrough === period
  if (samePaidPeriod) for (const hold of holds) {
    if (hold.reason !== 'dispute' || hold.resolvedAt) continue
    const resolved = coverage?.resolvedDisputes?.find(item => validHold(item) && item.reason === 'dispute' &&
      item.periodEnd === period && key(item) === key(hold) && ['won','warning_closed'].includes(item.disputeStatus))
    // Simultaneous unresolved evidence wins. Refund/unknown/manual holds never clear automatically.
    if (resolved && !incoming.some(item => key(item) === key(hold))) {
      hold.resolvedAt=stamp;hold.resolution=resolved.disputeStatus
    }
  }
  const blocked = holds.some(hold => !hold.resolvedAt)
  const prior = ['available','requested'].includes(row.status) ? row.status : row.held_from_status || null
  const status = blocked ? 'revoked' : row.status === 'revoked' && samePaidPeriod && ['available','requested'].includes(prior) ? prior : row.status
  if (status === row.status && JSON.stringify(holds) === JSON.stringify(row.hold_details || [])) return null
  return { status, heldFromStatus: prior, holdDetails: holds }
}
