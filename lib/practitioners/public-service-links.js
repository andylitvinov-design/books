/**
 * Canonical public landing for a published practitioner service.
 *
 * Andy's early Homeopathy consultation listing predates the approved unified
 * Alchemy of the Soul / Psycho-homeopathy landing. Keep the original service
 * record and slug intact for moderation, reporting and existing deep links.
 * EN, RU and ES share the same Alchemy of the Soul landing.
 *
 * Other practitioners' service URLs must never be rewritten to Andy's page.
 */
export function getPublicServiceDetailHref(locale, practitionerSlug, serviceSlug) {
  const base = `/${locale}/services`;
  if (practitionerSlug === 'andy-litvinov' && serviceSlug === 'homeopathy-consultation') {
    return `${base}/alchemy-of-soul`;
  }
  return `${base}/${practitionerSlug}/${serviceSlug}`;
}

/** Preserve Alchemy's existing video-testimonial anchor for users of the legacy service. */
export function getPublicServiceReviewHref(locale, practitionerSlug, serviceSlug) {
  const fragment = practitionerSlug === 'andy-litvinov' && serviceSlug === 'homeopathy-consultation'
    ? '#service-reviews' : '#reviews';
  return getPublicServiceDetailHref(locale, practitionerSlug, serviceSlug) + fragment;
}
