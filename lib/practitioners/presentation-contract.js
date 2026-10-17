import { AppError, assertObject, onlyKeys } from '../assessments/contracts.js'

export const PRESENTATION_BUCKET = 'hh-practitioner-presentations'
export const PRESENTATION_MAX_BYTES = 25_000_000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const invalid = () => { throw new AppError('INVALID_PRESENTATION_VIDEO', 400) }

// Only embeddable public video hosts are accepted. No arbitrary iframe
// HTML, redirect URLs, Drive shares or client-private media are accepted.
export function normalizeVideoPresentation(value) {
  if(value == null || value === '') return null
  assertObject(value)
  if(value.kind === 'external') {
    onlyKeys(value, ['kind', 'url'])
    if(typeof value.url !== 'string' || value.url.length > 500) invalid()
    let url
    try { url = new URL(value.url) } catch { invalid() }
    if(url.protocol !== 'https:' || url.username || url.password || url.hash) invalid()
    const host = url.hostname.toLowerCase()
    let videoId = ''
    if(['www.youtube.com','youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)) {
      if(host === 'youtu.be') videoId = url.pathname.slice(1)
      else if(url.pathname === '/watch') videoId = url.searchParams.get('v') || ''
      else if(/^\/(embed|shorts|live)\//.test(url.pathname)) videoId = url.pathname.split('/')[2] || ''
      if(!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) invalid()
      return {kind:'external',url:'https://www.youtube.com/watch?v=' + videoId}
    }
    if(host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
      const match = url.pathname.match(host === 'player.vimeo.com' ? /^\/video\/(\d{6,12})\/?$/ : /^\/(\d{6,12})\/?$/)
      if(!match) invalid()
      return {kind:'external',url:'https://vimeo.com/' + match[1]}
    }
    invalid()
  }
  if(value.kind === 'upload') {
    onlyKeys(value, ['kind', 'assetId', 'path'])
    if(!uuid.test(value.assetId || '') || typeof value.path !== 'string' ||
      !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov)$/i.test(value.path) ||
      !uuid.test(value.path.split('/')[0]) ||
      value.path.split('/')[1].split('.')[0].toLowerCase() !== value.assetId.toLowerCase()) invalid()
    return {kind:'upload',assetId:value.assetId.toLowerCase(),path:value.path.toLowerCase()}
  }
  invalid()
}

export function publicPresentationUrl(presentation, supabaseUrl) {
  const normalized = normalizeVideoPresentation(presentation)
  if(!normalized) return ''
  if(normalized.kind === 'external') return normalized.url
  const origin = new URL(supabaseUrl).origin
  if(!origin.startsWith('https://')) invalid()
  return origin + '/storage/v1/object/public/' + PRESENTATION_BUCKET + '/' +
    normalized.path.split('/').map(encodeURIComponent).join('/')
}
