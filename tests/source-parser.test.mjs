import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { normalizeSourceHtml } from '../data/source-parser.js'
import { books, getBookById, getBooksByCategory, searchBooks } from '../data/library.js'

test('normalizes source images and removes local-only links', () => {
  const output = normalizeSourceHtml(
    '<html><head><script>bad()</script><style>.bad { color: red }</style></head><body><h1>Глава</h1><img src="media/post_10_01.jpg"><img src="../../media/cover.jpg"><img src="photos/post_2_1.jpg"><img src="../../../photos/photo.jpg"><a href="file:///Users/a/book.html">Local</a><a href="http://localhost:3000/book">Loopback</a><a href="/Users">Home</a><a href="//localhost/x">Protocol-relative</a><a href="//127.0.0.1/x">Loopback IP</a></body></html>',
    'alchemy',
  )

  assert.match(output, /<h1>Глава<\/h1>/)
  assert.match(output, /src="\/media\/alchemy\/post_10_01\.jpg"/)
  assert.match(output, /src="\/media\/alchemy\/cover\.jpg"/)
  assert.match(output, /src="\/media\/alchemy\/post_2_1\.jpg"/)
  assert.match(output, /src="\/media\/alchemy\/photo\.jpg"/)
  assert.doesNotMatch(output, /<script|<style|file:\/\/|localhost|127\.0\.0\.1|\/Users/)
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
  assert.match(getBookById('maya-tradition-methodology').description, /81 первичных текстов/)
  assert.equal(getBookById('missing'), undefined)
  assert.equal(getBooksByCategory('Даосская традиция').length, 10)
  assert.deepEqual(searchBooks('врата').map((book) => book.id), ['alchemy-brain-protocols'])
})

test('points every canonical record to an exact source file and existing cover', () => {
  const originalCheckout = process.env.BOOKS_ORIGINAL_CHECKOUT ?? '/Users/andriilitvinov/projects/books'
  const expectedSourceFiles = [
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_foundations.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_remedies.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_naturopathy_hormones.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_naturopathy_oils.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_bach_foundations.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_bach_cards.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_brain_theory.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_brain_protocols.html',
    'source-books/book-1-alchemy-soul/alchemy_soul_guide_services_workflow.html',
    'source-books/book-2-dao-books/dao_alchemy_intro.html',
    'source-books/book-2-dao-books/dao_tradition_temples_symbols.html',
    'source-books/book-2-dao-books/dao_magic_basics.html',
    'source-books/book-2-dao-books/dao_talismans_symbols.html',
    'source-books/book-2-dao-books/dao_rituals_altars.html',
    'source-books/book-2-dao-books/dao_yijing_predictions.html',
    'source-books/book-2-dao-books/dao_healing_basics.html',
    'source-books/book-2-dao-books/dao_wuxing_five_elements.html',
    'source-books/book-2-dao-books/dao_wuxing_model_steps.html',
    'source-books/book-2-dao-books/dao_practicum_cases_remedies.html',
    'source-books/book-3-maya-tradition/manuscript/MAYA_TRADITION_UNIFIED.md',
  ]
  const mediaRoots = {
    alchemy: 'source-books/book-1-alchemy-soul/media',
    dao: 'source-books/book-2-dao-books/photos',
    maya: 'source-books/book-3-maya-tradition/raw/photos',
  }

  assert.deepEqual(books.map((book) => book.originalSourceFile), expectedSourceFiles)
  assert.deepEqual(
    Object.fromEntries(['Alchemy', 'Dao', 'Maya'].map((culture) => [
      culture,
      books.filter((book) => book.culture === culture).length,
    ])),
    { Alchemy: 9, Dao: 10, Maya: 1 },
  )

  for (const book of books) {
    assert.ok(existsSync(path.join(originalCheckout, book.originalSourceFile)), `missing source for ${book.id}`)
    assert.ok(
      existsSync(path.join(originalCheckout, mediaRoots[book.mediaSeries], book.cover)),
      `missing cover for ${book.id}`,
    )
  }
})
