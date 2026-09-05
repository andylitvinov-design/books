import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const tocPath = path.join(projectRoot, 'data', 'book-02-remedy-toc.json')

test('Book 02 TOC is an alphabetical projection of all 94 published canonical cards', () => {
  assert.equal(existsSync(tocPath), true, 'Book 02 requires a generated structured TOC')
  if (!existsSync(tocPath)) return

  const toc = JSON.parse(readFileSync(tocPath, 'utf8'))
  assert.equal(toc.book_id, 'book-02-homeopathy-remedies')
  assert.equal(toc.remedy_count, 94)
  assert.equal(toc.entries.length, 94)
  assert.equal(new Set(toc.entries.map(({ slug }) => slug)).size, 94)
  assert.deepEqual(toc.entries.map(({ canonical_latin_name }) => canonical_latin_name), [...toc.entries.map(({ canonical_latin_name }) => canonical_latin_name)].sort((a, b) => a.localeCompare(b, 'en')))
  assert.equal(toc.entries.some(({ slug }) => slug === 'aurum-metallicum'), true)
  assert.equal(toc.entries.some(({ slug }) => slug === 'carcinosinum'), true)
})
