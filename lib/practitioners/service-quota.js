// Default free Hobby package for practitioner listings.
// Partner verification is not a paid subscription and must not bypass this limit.
export const HOBBY_SERVICE_LIMIT = 10

export function getHobbyServiceQuota(services = []) {
  const used = services.filter(item => item?.status !== 'archived').length
  return {
    tier: 'hobby',
    limit: HOBBY_SERVICE_LIMIT,
    used,
    remaining: Math.max(0, HOBBY_SERVICE_LIMIT - used),
    canAdd: used < HOBBY_SERVICE_LIMIT,
  }
}
