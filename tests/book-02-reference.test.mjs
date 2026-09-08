import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getBook02Remedies, getRemedyDirectory } from '../data/remedies.js'

test('Book 02 reads the same 94 sorted canonical remedy cards as the standalone directory', () => {
  for (const locale of ['ru', 'en']) {
    const remedies = getBook02Remedies(locale)
    const directory = getRemedyDirectory(locale)

    assert.equal(remedies.length, 94)
    assert.deepEqual(remedies.map(({ slug }) => slug), directory.map(({ slug }) => slug))
    assert.equal(remedies.find(({ slug }) => slug === 'aurum-metallicum').primary_image, '/media/remedies/aurum-metallicum/message37-1.jpg')
    const carcinosinum = remedies.find(({ slug }) => slug === 'carcinosinum')
    assert.equal(carcinosinum.canonical_latin_name, 'Carcinosinum')
    assert.match(carcinosinum.description, /CARSINOSINUM/i)
  }
})

test('Book 02 reference renderer provides indexed canonical cards without the archive renderer', () => {
  const page = readFileSync('app/books/[bookId]/page.tsx', 'utf8')
  const reference = readFileSync('components/book-02-reference.tsx', 'utf8')
  const styles = readFileSync('app/globals.css', 'utf8')

  assert.match(page, /Book02Reference/)
  assert.match(page, /book\.id === "alchemy-homeopathy-remedies"/)
  assert.match(page, /getBook02Remedies/)
  assert.match(reference, /Найти препарат/)
  assert.match(reference, /Remedies \(94\)/)
  assert.match(reference, /#remedy-\$\{entry\.slug\}/)
  assert.match(reference, /homeopathy\/remedies\/\$\{entry\.slug\}/)
  assert.match(reference, /source_messages/)
  assert.match(reference, /scrollIntoView/)
  assert.match(reference, /history\.pushState/)
  assert.doesNotMatch(reference, /Publication:|Публикация:/)
  assert.match(styles, /book-reference-sidebar/)
  assert.match(styles, /book-remedy-primary-image/)
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*book-remedy-primary-image/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*book-remedy-primary-image/)
})
