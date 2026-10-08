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
  return Boolean(mediaRoots[series]) && basenamePattern.test(file)
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
