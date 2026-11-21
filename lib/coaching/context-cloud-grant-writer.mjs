const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function lockCoachContextConsent(db, actor) {
  return db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1, 0))',
    ['context-cloud-consent:' + actor.id])
}

// Scope and policy version must be resolved by the server before calling this
// function. The actor must come from the same authenticated transaction.
export async function appendCoachContextGrant(db, actor, scope, decision, confirmed) {
  if (typeof actor?.id !== 'string' || !uuid.test(actor.id) ||
      !['grant', 'revoke'].includes(decision) ||
      (decision === 'grant' && confirmed !== true)) {
    throw new Error('CONTEXT_GRANT_CONFIRMATION_REQUIRED')
  }
  const { provider, policyVersion, category, itemId, sessionId, expiresAt, sourceRevision, scaleKey = null } = scope
  if (![itemId, sessionId].every(id => id === null || (typeof id === 'string' && uuid.test(id)))) {
    throw new Error('CONTEXT_GRANT_SCOPE_INVALID')
  }

  // The revision establishes action order, including across category and item
  // scopes. Serialize writes before the database allocates the revision.
  await lockCoachContextConsent(db, actor)
  const { rows } = await db.query(
    `insert into app_private.context_cloud_grants
       (account_id, purpose, role_key, provider_key, policy_version, category, item_id,
        session_id, decision, expires_at, source_revision, scale_key)
     values ($1, 'coaching', 'coach', $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning revision`,
    [actor.id, provider, policyVersion, category, itemId, sessionId, decision,
      decision === 'grant' ? expiresAt ?? null : null,
      decision === 'grant' && itemId ? sourceRevision : null, scaleKey],
  )
  return rows[0].revision
}
