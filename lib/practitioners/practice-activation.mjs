// My Practice activation is separate from public moderation.
// An owner with an existing approved practice remains grandfathered in;
// new applicants unlock their private workspace only once their profile
// and first service have both been submitted.
const ELIGIBLE_FIRST_SERVICE_STATUSES = new Set(['submitted','changes_requested','published','paused'])
const ELIGIBLE_PRACTITIONER_STATUSES = new Set(['submitted','changes_requested'])

export function hasActivatedPractice(practitioner, services = []) {
  if (!practitioner) return false
  if (['suspended','rejected','archived'].includes(practitioner.status)) return false
  if (practitioner.status === 'approved') return true
  if (!ELIGIBLE_PRACTITIONER_STATUSES.has(practitioner.status)) return false

  const profile = practitioner.draftProfile || practitioner.profile || {}
  if (!String(profile.displayName || practitioner.profile?.displayName || '').trim()) return false
  return Array.isArray(services) && services.some(service =>
    service && ELIGIBLE_FIRST_SERVICE_STATUSES.has(service.status))
}
