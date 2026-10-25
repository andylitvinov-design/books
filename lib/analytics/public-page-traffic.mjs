// Anonymous, consent-based public-page statistics. Never save URLs, query strings,
// arbitrary referring hosts, visitor IDs, account data or assessment answers.
const PUBLIC_SECTIONS = new Set([
  'services','explore','holistic-support','academy','events','about',
  'practitioners','masters','business','courses','reiki','free',
  'articles','coaching','contact','dao','homeopathy','relationships',
  'shop','temple-insights','temple-support','toronto','wu-xing','install'
]);
export const PUBLIC_TRAFFIC_SOURCES = Object.freeze([
  'direct','google-organic','google-paid','bing-organic',
  'facebook-organic','facebook-paid','instagram-organic','instagram-paid',
  'youtube','telegram','whatsapp','partner','referral','unknown'
]);
const allowedSource = new Set(PUBLIC_TRAFFIC_SOURCES);

export function safePublicPagePath(input) {
  if (typeof input !== 'string' || input.length > 140 || input.includes('//')) return null;
  const path = input.length > 1 ? input.replace(/\/$/, '') : input;
  if (path === '/') return path;
  const segments = path.split('/');
  if (segments[0] !== '' || !['en','ru','es'].includes(segments[1])) return null;
  if (segments.length === 2) return path;
  if (segments.length < 3 || segments.length > 6 || !PUBLIC_SECTIONS.has(segments[2])) return null;
  if (!segments.slice(3).every(part => /^[a-z0-9][a-z0-9-]{0,63}$/.test(part))) return null;
  return path;
}

export function safePublicSource(input) {
  return allowedSource.has(input) ? input : null;
}

function domainSource(host, paid = false) {
  if (/(^|\.)google\.[a-z.]+$/.test(host) || host === 'google') return paid ? 'google-paid' : 'google-organic';
  if (/(^|\.)bing\.com$/.test(host) || host === 'bing') return 'bing-organic';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host) || ['facebook','fb','meta'].includes(host)) return paid ? 'facebook-paid' : 'facebook-organic';
  if (/(^|\.)(instagram\.com|instagr\.am)$/.test(host) || ['instagram','ig'].includes(host)) return paid ? 'instagram-paid' : 'instagram-organic';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host) || host === 'youtube') return 'youtube';
  if (/(^|\.)(t\.me|telegram\.org)$/.test(host) || host === 'telegram') return 'telegram';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host) || host === 'whatsapp') return 'whatsapp';
  return null;
}

export function sourceFromPublicEntry(href, referrer = '') {
  try {
    const destination = new URL(href);
    const utm = destination.searchParams.getAll('utm_source');
    const mediums = destination.searchParams.getAll('utm_medium');
    // Duplicate / user-provided free-text UTM cannot become a report dimension.
    if (utm.length > 1 || mediums.length > 1) return 'unknown';
    const source = (utm[0] || '').trim().toLowerCase();
    const medium = (mediums[0] || '').trim().toLowerCase();
    const paid = ['paid','paid_social','paid-search','paid_search','cpc','ppc','cpm'].includes(medium);
    if (source) {
      const known = domainSource(source, paid);
      if (known) return known;
      if (['partner','affiliate','referral','eventbrite','meetup'].includes(source)) return 'partner';
      return 'unknown';
    }
    if (!referrer) return 'direct';
    const from = new URL(referrer);
    if (!['http:','https:'].includes(from.protocol)) return 'unknown';
    if (from.hostname.toLowerCase() === destination.hostname.toLowerCase()) return 'unknown';
    return domainSource(from.hostname.toLowerCase()) || 'referral';
  } catch {
    return 'unknown';
  }
}
