import 'server-only'
export function billingRegistryEnabled(env = process.env) {
  return env.HH_CRM_BILLING_REGISTRY_ENABLED === 'true'
}
// Called only inside the authenticated CRM transaction. The database helper
// independently requires an approved exact reader UUID and active owner session.
export async function readBillingRegistry(db) {
  const { rows } = await db.query('select * from billing_private.crm_subscription_summary()')
  return rows.map(row => ({ accountId: row.subscriber_id, provider: row.provider,
    environment: row.environment, status: row.status, paidThrough: row.paid_through_at,
    cancelAtPeriodEnd: row.cancel_at_period_end, updatedAt: row.updated_at }))
}
