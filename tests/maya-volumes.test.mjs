import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { books, getBookById } from '../data/library.js'
import { loadReaderDocument } from '../data/reader-content.js'
import { getMediaAsset } from '../data/media.js'

const mayaVolumes = [
  {
    id: 'maya-egregor-gods',
    title: 'Традиция Майя и Ацтеков. Эгрегор и Боги',
    description: 'Эгрегор традиции, божественные силы, их каналы и авторские настройки в источниковой редакционной компоновке.',
    source: 'source-books/book-3-maya-tradition/outputs/Maya_Aztec_Egregor_Gods.html',
    heading: 'I. Эгрегор Майя',
    templeImage: 'post-2226-1.jpg',
  },
  {
    id: 'maya-calendar',
    title: 'Энергии Календаря Майя',
    description: 'Отдельный цикл материалов о календаре, времени, периодах и энергии дней Майя.',
    source: 'source-books/book-3-maya-tradition/outputs/Maya_Calendar_Energies.html',
    heading: 'VII. Календарь и энергия дней',
    templeImage: 'post-103-1.jpg',
  },
  {
    id: 'maya-exorcism',
    title: 'Экзорцизм в Традиции Майя. Настройки и энергии',
    description: 'Настройки, каналы, помощники и практические авторские формы работы с энергиями Майя и Ацтеков.',
    source: 'source-books/book-3-maya-tradition/outputs/Maya_Exorcism_Settings_Energies.html',
    heading: 'III. Настройки и энергии Майя и Ацтеков',
    templeImage: 'post-209-1.jpg',
  },
  {
    id: 'maya-mysteries',
    title: 'Мистерии Майя',
    description: 'Мифология, Шибальба, инициация, ритуал, священные места, двойники и авторские архетипические модели.',
    source: 'source-books/book-3-maya-tradition/outputs/Maya_Mysteries.html',
    heading: 'IV. Мифология, Шибальба, инициация и ритуал',
    templeImage: 'post-203-1.jpg',
  },
]

test('restores the four exact full Maya volume records without section ranges', () => {
  assert.deepEqual(books.filter((book) => book.mediaSeries === 'maya').map((book) => book.id), mayaVolumes.map(({ id }) => id))

  for (const expected of mayaVolumes) {
    const book = getBookById(expected.id)
    assert.equal(book?.title, expected.title)
    assert.equal(book?.description, expected.description)
    assert.equal(book?.sourceSeries, 'Круг Пернатого Змея / mayaismagic')
    assert.equal(book?.originalSourceFile, expected.source)
    assert.equal('sourceSectionStart' in book, false)
    assert.equal('sourceSectionEnd' in book, false)
  }
})

test('renders each Maya volume from its complete sanitized source HTML with safe media URLs', async () => {
  for (const expected of mayaVolumes) {
    const book = getBookById(expected.id)
    assert.ok(book)

    const document = await loadReaderDocument(book)
    assert.equal(document.type, 'html')
    assert.ok(document.content.length > 5_000, `${expected.id} should render the full book, not a short overview`)
    assert.match(document.content, new RegExp(`<h1[^>]*>${expected.title}`))
    assert.match(document.content, new RegExp(expected.heading))
    assert.match(document.content, /src="\/media\/maya\/photo_[^"]+\.jpg"/)
    assert.match(document.content, new RegExp(`src="/library/${expected.id}/media/${expected.templeImage}"`))
    assert.doesNotMatch(document.content, /(?:\.\.\/raw\/photos|\.\.\/media\/templetherapy|file:\/\/|localhost)/)
  }
})

test('maps every Maya catalog chapter link to its rendered source H1 anchor', async () => {
  for (const expected of mayaVolumes) {
    const book = getBookById(expected.id)
    assert.ok(book)
    const document = await loadReaderDocument(book)

    for (const chapter of book.chapters) {
      assert.match(
        document.content,
        new RegExp(`<h1[^>]*\\bid="${chapter.id}"[^>]*>${chapter.title}</h1>`),
        `${book.id} TOC link #${chapter.id} should target its source H1`,
      )
    }
  }
})

test('serves every rewritten Maya image from a fixed public root without traversal', async () => {
  for (const expected of mayaVolumes) {
    const book = getBookById(expected.id)
    assert.ok(book)
    const document = await loadReaderDocument(book)
    const imageUrls = [...document.content.matchAll(/src="([^"]+)"/g)].map(([, src]) => src)

    for (const imageUrl of imageUrls) {
      if (imageUrl.startsWith('/media/maya/')) {
        assert.ok(await getMediaAsset('maya', imageUrl.slice('/media/maya/'.length)), imageUrl)
      } else {
        assert.match(imageUrl, new RegExp(`^/library/${expected.id}/media/post-[^/]+\\.jpg$`))
        assert.equal(
          existsSync(path.join(process.cwd(), 'public', imageUrl)),
          true,
          `${imageUrl} must be a tracked public asset`,
        )
      }
    }
  }
})
