import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const mediaRoots = {
  alchemy: 'source-books/book-1-alchemy-soul/media',
  dao: 'source-books/book-2-dao-books/photos',
  maya: 'source-books/book-3-maya-tradition/raw/photos',
}

const basenamePattern = /^(?!\.{1,2}$)[^/\\\0]+$/
const mediaTypes = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])

export function validateMediaRequest(series, file) {
  return Object.hasOwn(mediaRoots, series) && basenamePattern.test(file)
}

export function mediaPathFor(series, file) {
  if (!validateMediaRequest(series, file)) return undefined

  return `${mediaRoots[series]}/${file}`
}

// Serve source-book photos from the public, immutable Git commit on Vercel.
// Keeping ~211 MB of photos out of the function bundle avoids replicating
// the same binaries with every Preview/Production deployment.
export const VERIFIED_FALLBACK_MEDIA_COMMIT = 'f55b1f830e62efb5867faf3a4df8940e90080a7d'

export function mediaSourceUrlFor(series, file, revision) {
  const mediaPath = mediaPathFor(series, file)
  if (!mediaPath || !mediaTypes.has(path.extname(file).toLowerCase())) return undefined
  if (!/^[0-9a-f]{40}$/i.test(revision || '')) return undefined

  const escaped = mediaPath.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/andylitvinov-design/books/${revision}/${escaped}`
}

export async function getMediaAsset(series, file) {
  const relativePath = mediaPathFor(series, file)
  const contentType = mediaTypes.get(path.extname(file).toLowerCase())

  if (!relativePath || !contentType) return undefined

  try {
    return {
      body: await readFile(path.join(process.cwd(), relativePath)),
      contentType,
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}


// Current Maya corpus maximum is 575,183 bytes; stay below Vercel response limits.
const MAX_REMOTE_MEDIA_BYTES = 2 * 1024 * 1024
const REMOTE_MEDIA_TIMEOUT_MS = 8000

function hasImageSignature(bytes, contentType) {
  if (contentType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (contentType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (contentType === 'image/gif') return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'))
  if (contentType === 'image/webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  if (contentType === 'image/avif') return bytes.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(bytes.subarray(8, 12).toString('ascii'))
  return false
}

/** Fixed public repository only: never proxy a user URL or forward cookies. */
export async function getRemoteMediaResponse(series, file, revision, fetchSource = fetch) {
  const sourceUrl = mediaSourceUrlFor(series, file, revision)
  const fail = (status) => new Response(status === 404 ? 'Not found' : 'Image unavailable', {
    status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
  if (series !== 'maya' || !sourceUrl) return fail(404)
  const contentType = mediaTypes.get(path.extname(file).toLowerCase())
  let reader
  try {
    const upstream = await fetchSource(sourceUrl, {
      redirect: 'error', credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.timeout(REMOTE_MEDIA_TIMEOUT_MS),
      headers: { Accept: contentType },
    })
    if (upstream.status === 404) { await upstream.body?.cancel(); return fail(404) }
    if (upstream.status !== 200 || !upstream.body || upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== contentType) {
      await upstream.body?.cancel(); return fail(502)
    }
    const declaredSize = upstream.headers.get('content-length')
    if (declaredSize !== null && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > MAX_REMOTE_MEDIA_BYTES)) {
      await upstream.body.cancel(); return fail(502)
    }
    reader = upstream.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_REMOTE_MEDIA_BYTES) { await reader.cancel(); return fail(502) }
      chunks.push(Buffer.from(value))
    }
    const bytes = Buffer.concat(chunks, size)
    if (!hasImageSignature(bytes, contentType)) return fail(502)
    return new Response(bytes, { headers: {
      'Content-Type': contentType, 'Content-Length': String(size),
      // Public URL is not versioned: preserve the existing one-hour freshness.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch {
    await reader?.cancel().catch(() => {})
    return fail(502)
  } finally {
    reader?.releaseLock()
  }
}
