const categories = new Set(['goals', 'actions', 'reports', 'preferences'])
const providers = new Set(['groq', 'gemini_free', 'gemini_paid', 'openrouter'])

// Inputs come from the authenticated server and its owner-scoped grant ledger.
// A newer category withdrawal also withdraws any older item grants.
export function hasCoachContextGrant(request, events) {
  const { accountId, sessionId, provider, policyVersion, role, category, itemId, now } = request
  if (role !== 'coach' || !accountId || !sessionId || !itemId || !policyVersion ||
      !providers.has(provider) || !categories.has(category) ||
      !Number.isFinite(now) || !Array.isArray(events)) return false

  let latest = null
  let latestItem = null
  const revisions = new Set()
  for (const event of events) {
    if (event?.accountId !== accountId || event.provider !== provider ||
        event.purpose !== 'coaching' || event.role !== role || event.category !== category ||
        (event.sessionId !== null && event.sessionId !== sessionId) ||
        (event.itemId !== null && event.itemId !== itemId)) continue
    if (!Number.isSafeInteger(event.revision) || event.revision < 1 ||
        !Number.isFinite(event.occurredAt) || event.occurredAt > now ||
        !['grant', 'revoke'].includes(event.decision)) return false
    if (revisions.has(event.revision)) return false
    revisions.add(event.revision)
    if (event.itemId === itemId && (!latestItem || event.revision > latestItem.revision)) {
      latestItem = event
    }
    if (!latest || event.revision > latest.revision) latest = event
  }
  if (latestItem?.decision === 'revoke') return false
  if (latestItem && (typeof request.sourceRevision !== 'string' ||
      latestItem.sourceRevision !== request.sourceRevision ||
      latestItem.policyVersion !== policyVersion ||
      (latestItem.expiresAt !== null && !(latestItem.expiresAt > now)))) return false
  return latest?.decision === 'grant' && latest.policyVersion === policyVersion &&
    (latest.expiresAt === null || (Number.isFinite(latest.expiresAt) && latest.expiresAt > now))
}
