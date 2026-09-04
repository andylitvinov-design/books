import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
const sourceFile = 'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_remedies.html'
const expectedColumns = [
  'canonical_latin_name',
  'slug',
  'russian_common_name',
  'aliases_abbreviations',
  'source_file',
  'source_section_heading',
  'ru_source_exists',
  'en_source_exists',
  'needs_translation',
  'candidate_status',
  'notes',
]

function parseCsvLine(line) {
  const cells = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else {
      value += character
    }
  }

  cells.push(value)
  return cells
}

function readInventory() {
  const lines = readFileSync(inventoryPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())
  return {
    header,
    rows: lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? '']))),
  }
}

test('records every remedy-like Book 02 heading without inventing English content', () => {
  assert.equal(existsSync(inventoryPath), true, 'remedy source inventory must exist')
  if (!existsSync(inventoryPath)) return

  const { header, rows } = readInventory()
  assert.deepEqual(header, expectedColumns)
  assert.equal(rows.length, 47)

  const counts = Object.groupBy(rows, ({ candidate_status }) => candidate_status)
  assert.equal(counts.confirmed.length, 38)
  assert.equal(counts.duplicate.length, 8)
  assert.equal(counts.grouped.length, 1)

  const confirmed = counts.confirmed
  assert.equal(new Set(confirmed.map(({ slug }) => slug)).size, 38)
  assert.equal(confirmed.every(({ source_file }) => source_file === sourceFile), true)
  assert.equal(confirmed.every(({ ru_source_exists }) => ru_source_exists === 'yes'), true)
  assert.equal(confirmed.every(({ en_source_exists }) => en_source_exists === 'no'), true)
  assert.equal(confirmed.every(({ needs_translation }) => needs_translation === 'yes'), true)

  const headings = new Set(
    [...readFileSync(path.join(projectRoot, sourceFile), 'utf8').matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)]
      .map(([, heading]) => heading.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()),
  )
  assert.equal(rows.every(({ source_section_heading }) => headings.has(source_section_heading)), true)

  const confirmedSlugs = new Set(confirmed.map(({ slug }) => slug))
  assert.equal(counts.duplicate.every(({ slug }) => confirmedSlugs.has(slug)), true)
  assert.equal(counts.grouped[0].slug, '')
})

test('validates the audited remedy counts from the CSV source of truth', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-remedy-source-inventory.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /confirmed=38 duplicates=8 grouped=1 en_missing=38/)
})
