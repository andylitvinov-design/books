import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import { getBookById } from '../data/library.js'
import * as media from '../data/media.js'
import * as readerContent from '../data/reader-content.js'

const { mediaPathFor, validateMediaRequest } = media
const { parseMayaManuscript } = readerContent

test('maps canonical cover media to one of the fixed source roots', () => {
  const maya = getBookById('maya-tradition-methodology')

  assert.equal(mediaPathFor(maya.mediaSeries, maya.cover), 'source-books/book-3-maya-tradition/raw/photos/photo_100@06-01-2025_09-34-15.jpg')
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

test('parses Maya manuscript source labels and supplemental TempleTherapy headings', () => {
  const blocks = parseMayaManuscript([
    '# I. Описание традиции',
    '',
    '## TempleTherapy · пост 2062',
    '',
    '*Источники: TempleTherapy: пост [2062](https://t.me/TempleTherapy/2062); 2024-10-24.*',
    '',
    'Сохранённый авторский текст.',
  ].join('\n'))

  assert.deepEqual(blocks, [
    { type: 'heading', level: 1, text: 'I. Описание традиции', supplemental: false },
    { type: 'heading', level: 2, text: 'TempleTherapy · пост 2062', supplemental: true },
    { type: 'paragraph', text: 'Источники: TempleTherapy: пост 2062; 2024-10-24.', sourceLabel: true },
    { type: 'paragraph', text: 'Сохранённый авторский текст.', sourceLabel: false },
  ])
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

test('loads Maya as semantic manuscript blocks with supplemental source labels', async () => {
  assert.equal(typeof readerContent.loadReaderDocument, 'function')

  const document = await readerContent.loadReaderDocument(getBookById('maya-tradition-methodology'))

  assert.equal(document.type, 'maya')
  assert.ok(document.blocks.some((block) => block.type === 'heading' && block.supplemental))
  assert.ok(document.blocks.some((block) => block.type === 'paragraph' && block.sourceLabel))
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
