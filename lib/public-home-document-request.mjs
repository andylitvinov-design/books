import { approvedTelegramPresentation } from './crm/telegram-presentation.mjs'

const homeLocales = new Map([['/', 'en'], ['/ru', 'ru'], ['/es', 'es']])
const privateOrRouterHeaders = [
  'authorization', 'proxy-authorization', 'rsc', 'next-action', 'next-url',
  'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch',
  'x-nextjs-data', 'x-middleware-prefetch', 'x-hh-render-public-home', 'range',
  'x-prerender-revalidate', 'x-prerender-revalidate-if-generated',
]

export function publicHomeDocumentLocale({ pathname, method, search, headers }) {
  const locale = homeLocales.get(pathname)
  if (!locale || search || (method !== 'GET' && method !== 'HEAD')) return null
  // Once an English presentation is approved the live CMS can withdraw it at
  // any time. Until the snapshot tracks publication, use its live SSR gate.
  if (locale === 'en' && approvedTelegramPresentation('en')?.youtubeId) return null
  if (privateOrRouterHeaders.some(name => headers.has(name))) return null
  if (['purpose', 'sec-purpose'].some(name => /prefetch|prerender/i.test(headers.get(name) || ''))) return null
  if (/no-cache|no-store/i.test(headers.get('cache-control') || '') ||
      /no-cache/i.test(headers.get('pragma') || '')) return null

  const accept = (headers.get('accept') || '').trim().toLowerCase()
  if (accept && accept !== '*/*' && !/(?:^|,)\s*text\/html\b/.test(accept)) return null
  if (accept.includes('text/x-component')) return null
  const destination = headers.get('sec-fetch-dest')
  if (destination && destination !== 'document') return null
  const mode = headers.get('sec-fetch-mode')
  if (mode && mode !== 'navigate') return null

  // Locale is fixed by the canonical URL. Every other cookie, including any
  // newly introduced session name, keeps the existing request-specific path.
  const cookie = headers.get('cookie') || ''
  if (cookie && !cookie.split(';').every(part =>
    /^holistic_house_(?:public_locale|ui_locale)=(?:en|ru|es)$/.test(part.trim()))) return null
  return locale
}

// A missing/invalid preference uses identity. An explicit gzip;q=0 takes
// precedence over the wildcard as required by HTTP content negotiation.
export function publicHomeEncoding(header) {
  let wildcard = false
  for (const value of (header || '').toLowerCase().split(',')) {
    const [coding, ...params] = value.trim().split(';')
    if (coding !== 'gzip' && coding !== '*') continue
    const quality = params.length ? /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.exec(params.join(';').trim()) : null
    const allowed = !params.length || (quality !== null && Number(quality[1]) > 0)
    if (coding === 'gzip') return allowed ? 'gzip' : 'identity'
    wildcard = allowed
  }
  return wildcard ? 'gzip' : 'identity'
}
