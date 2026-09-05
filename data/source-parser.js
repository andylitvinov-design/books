const allowedTags = new Set([
  'a', 'article', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead',
  'tr', 'ul',
])

const allowedMediaSeries = new Set(['alchemy', 'dao', 'maya'])
const mayaTempleMediaRoots = new Set([
  'maya-egregor-gods',
  'maya-calendar',
  'maya-exorcism',
  'maya-mysteries',
])
const voidTags = new Set(['br', 'hr', 'img'])
const commonAttributes = new Set(['aria-label', 'class', 'id', 'title'])
const blockedTagPattern = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta|base|svg|math|template|noscript)\b[^>]*>(?:[\s\S]*?<\/\1\s*>)?/gi
const sourceImagePattern = /\bsrc\s*=\s*(["'])(?![a-z][a-z0-9+.-]*:|\/)(?:[^/"']+\/)*(?:media|photos)\/([^/"']+)\1/gi
const mayaTempleImagePattern = /\bsrc\s*=\s*(["'])(?:\.\.\/)+media\/templetherapy\/(post-[^/"']+\.(?:avif|gif|jpe?g|png|webp))\1/gi
const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
}

function isSafeExternalHref(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()

    return (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && !url.username
      && !url.password
      && hostname !== 'localhost'
      && hostname !== '::1'
      && !hostname.startsWith('127.')
    )
  } catch {
    return false
  }
}

function isKnownMediaSource(value, series, bookId) {
  const prefix = `/media/${series}/`
  const filename = value.startsWith(prefix) ? value.slice(prefix.length) : ''

  if (Boolean(filename) && !filename.includes('/') && !filename.includes('\\') && !/[?#]/.test(filename)) {
    return true
  }

  const templePrefix = `/library/${bookId}/media/`
  const templeFilename = value.startsWith(templePrefix) ? value.slice(templePrefix.length) : ''

  return (
    series === 'maya'
    && mayaTempleMediaRoots.has(bookId)
    && /^post-[^/\\?#]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(templeFilename)
  )
}

function isAllowedAttribute(tag, name, value, series, bookId) {
  if (commonAttributes.has(name)) return true
  if (tag === 'a' && name === 'href') return isSafeExternalHref(value)
  if (tag === 'img' && name === 'src') return isKnownMediaSource(value, series, bookId)
  if (tag === 'img' && name === 'alt') return true
  if (tag === 'img' && name === 'loading') return value === 'lazy' || value === 'eager'
  if (tag === 'img' && (name === 'width' || name === 'height')) return /^\d+$/.test(value)
  if ((tag === 'td' || tag === 'th') && (name === 'colspan' || name === 'rowspan')) return /^\d+$/.test(value)
  if (tag === 'th' && name === 'scope') return ['col', 'colgroup', 'row', 'rowgroup'].includes(value)

  return false
}

function sanitizeAttributes(tag, rawAttributes, series, bookId) {
  const attributes = []

  for (const match of rawAttributes.matchAll(attributePattern)) {
    const name = match[1].toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? ''

    if (isAllowedAttribute(tag, name, value, series, bookId)) {
      attributes.push(`${name}="${escapeAttribute(value)}"`)
    }
  }

  return attributes.length ? ` ${attributes.join(' ')}` : ''
}

function sanitizeSourceHtml(html, series, bookId) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(blockedTagPattern, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag, rawAttributes) => {
      const tag = rawTag.toLowerCase()
      if (!allowedTags.has(tag)) return ''
      if (match.startsWith('</')) return voidTags.has(tag) ? '' : `</${tag}>`

      return `<${tag}${sanitizeAttributes(tag, rawAttributes, series, bookId)}>`
    })
}

export function normalizeSourceHtml(html, series, bookId) {
  if (!allowedMediaSeries.has(series)) {
    throw new TypeError(`Unknown media series: ${series}`)
  }

  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  const normalizedTempleImages = body.replace(mayaTempleImagePattern, (_, __, filename) => {
    if (series !== 'maya' || !mayaTempleMediaRoots.has(bookId)) return ''

    return `src="/library/${bookId}/media/${filename}"`
  })
  const normalizedImages = normalizedTempleImages.replace(sourceImagePattern, (_, __, sourcePath) => {
    const filename = sourcePath.split('/').at(-1)
    return `src="/media/${series}/${filename}"`
  })

  return sanitizeSourceHtml(normalizedImages, series, bookId)
}
