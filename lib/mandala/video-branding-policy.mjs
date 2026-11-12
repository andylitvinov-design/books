import {VIDEO_EXPORT_POLICY_VERSION} from './video-branding.mjs'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Separate, deliberately non-commercial Practice Pro pilot capability.
 * No consumer course subscription, creative Video Studio tier or XP balance
 * can grant a clean export. IDs are trusted verified session account IDs.
 * Both explicit enablement and a future expiry are required for a pilot.
 */
export function pilotVideoExportCapability(actor,env=process.env,now=Date.now()) {
  const expires=Date.parse(env.HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT||'')
  const validUntil=Number.isFinite(expires)?new Date(expires).toISOString():null
  const ids=String(env.HH_VIDEO_EXPORT_CLEAN_PILOT_ACCOUNT_IDS||'')
    .split(',').map(id=>id.trim().toLowerCase()).filter(Boolean)
  const allowed=env.HH_VIDEO_EXPORT_CLEAN_PILOT_ENABLED==='true' &&
    typeof actor?.id==='string' && UUID.test(actor.id) &&
    ids.length<=64 && ids.includes(actor.id.toLowerCase()) &&
    Number.isFinite(expires) && expires>now && expires-now<=90*86400000
  return {
    policyVersion:VIDEO_EXPORT_POLICY_VERSION,
    canExportClean:allowed,
    grantType:allowed?'pilot':'none',
    validUntil:allowed?validUntil:null,
  }
}
