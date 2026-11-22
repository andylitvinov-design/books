const MAX_EVENTS = 256

// Call inside an authenticated owner transaction, alongside the source reads.
export async function readCoachContextGrants(db, actor, { provider, sessionId, accountWideOnly = false, sessionOnly = false }) {
  if (!actor?.id || !provider || !sessionId) return []
  const { rows } = await db.query(
    `select distinct on (category, item_id, scale_key, session_id)
            revision, account_id, purpose, role_key, provider_key, policy_version,
            category, item_id, scale_key, session_id, decision, occurred_at, expires_at, source_revision
       from app_private.context_cloud_grants
      where account_id = $1 and provider_key = $2 and role_key = 'coach'
        and purpose = 'coaching' and (session_id is null or session_id = $3)
        and (not $5::boolean or session_id is not null or decision = 'revoke')
      order by category, item_id, scale_key, session_id, revision desc limit $4`,
    [actor.id, provider, accountWideOnly ? null : sessionId, MAX_EVENTS + 1, sessionOnly],
  )
  if (rows.length > MAX_EVENTS) return []
  if (rows.some(row => row.account_id !== actor.id || row.provider_key !== provider ||
      (row.session_id !== null && (accountWideOnly || row.session_id !== sessionId)))) return []
  return rows.filter(row => !sessionOnly || row.session_id !== null || row.decision === 'revoke').map(row => ({
    revision: Number(row.revision),
    accountId: row.account_id,
    purpose: row.purpose,
    role: row.role_key,
    provider: row.provider_key,
    policyVersion: row.policy_version,
    category: row.category,
    itemId: row.item_id,
    scaleKey: row.scale_key,
    sourceRevision: row.source_revision,
    sessionId: row.session_id,
    decision: row.decision,
    occurredAt: timestamp(row.occurred_at),
    expiresAt: row.expires_at === null ? null :
      timestamp(row.expires_at),
  }))
}

function timestamp(value) {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}
