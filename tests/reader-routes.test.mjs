import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import { books, getBookById } from '../data/library.js'
import * as media from '../data/media.js'
import * as readerContent from '../data/reader-content.js'

const { mediaPathFor, validateMediaRequest } = media

test('maps every Maya volume cover media to one of the fixed source roots', () => {
  const mayaVolumes = books.filter((book) => book.mediaSeries === 'maya')

  assert.equal(mayaVolumes.length, 4)
  for (const book of mayaVolumes) {
    assert.match(mediaPathFor(book.mediaSeries, book.cover), /^source-books\/book-3-maya-tradition\/raw\/photos\/.+\.jpg$/)
  }
})

test('rejects unknown series and unsafe media filenames', () => {
  assert.equal(validateMediaRequest('alchemy', 'post_10_01.jpg'), true)
  assert.equal(validateMediaRequest('unknown', 'post_10_01.jpg'), false)
  assert.equal(validateMediaRequest('dao', '../post_2_1.jpg'), false)
  assert.equal(validateMediaRequest('maya', 'photos/photo.jpg'), false)
})

test('accepts real Maya image basenames that include spaces', () => {
  assert.equal(validateMediaRequest('maya', 'photo_82@06-01-2025_09-33-38_thumb (1).jpg'), true)
})

test('keeps reader metadata complete for canonical book records', () => {
  const book = getBookById('alchemy-homeopathy-foundations')

  assert.deepEqual(
    { sourceSeries: book.sourceSeries, category: book.category, status: book.status, cover: book.cover },
    { sourceSeries: 'Алхимия души', category: 'Алхимия души', status: 'published', cover: 'post_10_01.jpg' },
  )
})

test('loads original HTML reader content through the safe source parser', async () => {
  assert.equal(typeof readerContent.loadReaderDocument, 'function')

  const document = await readerContent.loadReaderDocument(getBookById('alchemy-homeopathy-foundations'))

  assert.equal(document.type, 'html')
  assert.match(document.content, /<h1>Книга 01\. Гомеопатия: основы и метод<\/h1>/)
  assert.match(document.content, /<h2 id="introduction">Введение в метод<\/h2>/)
  assert.match(document.content, /src="\/media\/alchemy\/post_10_01\.jpg"/)
  assert.doesNotMatch(document.content, /<script\b/i)
})

test('reads known image assets with a cacheable MIME type only', async () => {
  assert.equal(typeof media.getMediaAsset, 'function')

  const asset = await media.getMediaAsset('maya', 'photo_100@06-01-2025_09-34-15.jpg')

  assert.equal(asset.contentType, 'image/jpeg')
  assert.ok(asset.body.byteLength > 1000)
  assert.equal(await media.getMediaAsset('maya', '../MAYA_TRADITION_UNIFIED.md'), undefined)
  assert.equal(await media.getMediaAsset('unknown', 'photo.jpg'), undefined)
})

test('provides the server reader, not-found, and strict media route modules', async () => {
  const [readerPage, notFoundPage, mediaRoute] = await Promise.all([
    readFile('app/books/[bookId]/page.tsx', 'utf8').catch(() => ''),
    readFile('app/books/[bookId]/not-found.tsx', 'utf8').catch(() => ''),
    readFile('app/media/[series]/[file]/route.ts', 'utf8').catch(() => ''),
  ])

  await Promise.all([
    access('app/books/[bookId]/page.tsx'),
    access('app/books/[bookId]/not-found.tsx'),
    access('app/media/[series]/[file]/route.ts'),
  ])
  assert.match(readerPage, /generateMetadata/)
  assert.match(readerPage, /metadataBase/)
  assert.match(readerPage, /notFound\(\)/)
  assert.match(readerPage, /loadReaderDocument/)
  assert.match(readerPage, /\/media\/\$\{book\.mediaSeries\}/)
  assert.match(readerPage, /Источник/)
  assert.match(readerPage, /Статус/)
  assert.match(notFoundPage, /Библиотек/)
  assert.match(mediaRoute, /Cache-Control/)
  assert.match(mediaRoute, /image\//)
})

test('uses an absolute deployable metadata base with a Vercel fallback', async () => {
  const modulePath = 'data/site-metadata.js'
  const moduleExists = await access(modulePath).then(() => true, () => false)

  assert.equal(moduleExists, true)

  const { metadataBaseFor } = await import('../data/site-metadata.js')

  assert.equal(
    metadataBaseFor(undefined).href,
    'https://andylitvinov-books.vercel.app/',
  )
  assert.equal(
    metadataBaseFor('https://books.example.test/library').href,
    'https://books.example.test/library',
  )
})
