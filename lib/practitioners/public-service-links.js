/**
 * Canonical public landing for a published practitioner service.
 *
 * Andy's early Homeopathy consultation listing predates the approved unified
 * Alchemy of the Soul / Psycho-homeopathy landing. Keep the original service
 * record and slug intact for moderation, reporting and existing deep links.
 * Spanish retains its supported standalone psycho-homeopathy landing.
 *
 * Other practitioners' service URLs must never be rewritten to Andy's page.
 */
export function getPublicServiceDetailHref(locale, practitionerSlug, serviceSlug) {
  const base = `/${locale}/services`;
  if (practitionerSlug === 'andy-litvinov' && serviceSlug === 'homeopathy-consultation') {
    return locale === 'es' ? '/es/services/psychohomeopathy' : `${base}/alchemy-of-soul`;
  }
  return `${base}/${practitionerSlug}/${serviceSlug}`;
}
