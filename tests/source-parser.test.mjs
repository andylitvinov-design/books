import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSourceHtml } from '../data/source-parser.js'
import { books, getBookById, getBooksByCategory, searchBooks } from '../data/library.js'

test('normalizes source images and removes local-only links', () => {
  const output = normalizeSourceHtml(
    '<html><head><script>bad()</script><style>.bad { color: red }</style></head><body><h1>Глава</h1><img src="media/post_10_01.jpg"><img src="photos/post_2_1.jpg"><a href="file:///Users/a/book.html">Local</a><a href="http://localhost:3000/book">Loopback</a></body></html>',
    'alchemy',
  )

  assert.match(output, /<h1>Глава<\/h1>/)
  assert.match(output, /src="\/media\/alchemy\/post_10_01\.jpg"/)
  assert.match(output, /src="\/media\/alchemy\/post_2_1\.jpg"/)
  assert.doesNotMatch(output, /<script|<style|file:\/\/|localhost|\/Users\//)
})

test('exposes the complete source-backed library and searchable metadata', () => {
  const expectedIds = [
    'alchemy-homeopathy-foundations',
    'alchemy-homeopathy-remedies',
    'alchemy-naturopathy-hormones',
    'alchemy-naturopathy-oils',
    'alchemy-bach-foundations',
    'alchemy-bach-cards',
    'alchemy-brain-theory',
    'alchemy-brain-protocols',
    'alchemy-services-workflow',
    'dao-alchemy-intro',
    'dao-tradition-temples-symbols',
    'dao-magic-basics',
    'dao-talismans-symbols',
    'dao-rituals-altars',
    'dao-yijing-predictions',
    'dao-healing-basics',
    'dao-wuxing-five-elements',
    'dao-wuxing-model-steps',
    'dao-practicum-cases-remedies',
    'maya-tradition-methodology',
  ]
  const requiredFields = [
    'id', 'title', 'description', 'sourceSeries', 'category', 'culture', 'cover',
    'mediaSeries', 'summary', 'originalSourceFile', 'status', 'tags', 'chapters',
  ]

  assert.deepEqual(books.map((book) => book.id), expectedIds)
  assert.equal(new Set(books.map((book) => book.originalSourceFile)).size, 20)
  for (const book of books) {
    assert.deepEqual(Object.keys(book).sort(), requiredFields.sort())
    assert.ok(book.cover)
    assert.ok(book.chapters.length)
  }

  assert.equal(
    getBookById('maya-tradition-methodology').originalSourceFile,
    'source-books/book-3-maya-tradition/manuscript/MAYA_TRADITION_UNIFIED.md',
  )
  assert.equal(getBookById('missing'), undefined)
  assert.equal(getBooksByCategory('Даосская традиция').length, 10)
  assert.deepEqual(searchBooks('врата').map((book) => book.id), ['alchemy-brain-protocols'])
})
