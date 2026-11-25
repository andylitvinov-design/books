/**
 * Pure, on-demand My Coach readiness recovery policy.
 * Never polls, contacts a provider, sends a transcript or bypasses rate limits.
 */
export const COACH_MODEL_RECHECK_MS=90_000
export const COACH_MODEL_SLOW_RECHECK_MS=10*60_000

export function coachModelProbeRetryAllowed(readiness,lastAttempt,now){
  if(!readiness||readiness.status!=='unavailable'||!Number.isFinite(now)||
    !Number.isFinite(lastAttempt)||lastAttempt<0)return false
  const slowReasons=new Set(['rate_limited','server_not_configured',
    'feature_disabled','privacy_model_unavailable','cost_unverified'])
  const cooldown=slowReasons.has(readiness.reason)
    ?COACH_MODEL_SLOW_RECHECK_MS:COACH_MODEL_RECHECK_MS
  return lastAttempt===0||now-lastAttempt>=cooldown
}
