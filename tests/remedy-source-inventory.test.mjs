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

test('publishes the approved 94-card Book 02 inventory without promoting mention-only entries', () => {
  assert.equal(existsSync(inventoryPath), true, 'remedy source inventory must exist')
  if (!existsSync(inventoryPath)) return

  const { header, rows } = readInventory()
  assert.deepEqual(header, expectedColumns)
  assert.equal(rows.length, 125)

  const counts = Object.groupBy(rows, ({ candidate_status }) => candidate_status)
  assert.equal(counts.confirmed.length, 94)
  assert.equal(counts.duplicate.length, 8)
  assert.equal(counts.grouped.length, 1)
  assert.equal(counts.mention_only.length, 22)
  assert.equal(counts.proposed_full_card, undefined)
  assert.equal(counts.needs_resolution, undefined)

  const confirmed = counts.confirmed
  assert.equal(new Set(confirmed.map(({ slug }) => slug)).size, 94)
  assert.equal(confirmed.every(({ slug }) => slug), true)
  assert.equal(confirmed.every(({ ru_source_exists }) => ru_source_exists === 'yes'), true)
  assert.equal(confirmed.every(({ en_source_exists }) => en_source_exists === 'no'), true)
  assert.equal(confirmed.every(({ needs_translation }) => needs_translation === 'yes'), true)

  const headings = new Set(
    [...readFileSync(path.join(projectRoot, sourceFile), 'utf8').matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)]
      .map(([, heading]) => heading.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()),
  )
  assert.equal(rows.filter(({ source_file: file }) => file === sourceFile).every(({ source_section_heading }) => headings.has(source_section_heading)), true)
  assert.equal(confirmed.filter(({ source_file: file }) => file === sourceFile).length, 38)
  assert.equal(confirmed.filter(({ source_file: file }) => file === 'data/telegram-psychic-alchemy-index.csv').length, 56)

  const confirmedSlugs = new Set(confirmed.map(({ slug }) => slug))
  assert.equal(counts.duplicate.every(({ slug }) => confirmedSlugs.has(slug)), true)
  assert.equal(counts.grouped[0].slug, '')
  assert.equal(confirmed.find(({ slug }) => slug === 'aurum-metallicum').canonical_latin_name, 'Aurum metallicum')
  assert.match(confirmed.find(({ slug }) => slug === 'aurum-metallicum').aliases_abbreviations, /Аурум; Aurum/)
  assert.equal(confirmed.find(({ slug }) => slug === 'carcinosinum').canonical_latin_name, 'Carcinosinum')
  assert.match(confirmed.find(({ slug }) => slug === 'carcinosinum').aliases_abbreviations, /Carsinosinum/)
  assert.equal(counts.mention_only.some(({ slug }) => slug === 'aqua-marina'), true)
  assert.equal(counts.mention_only.some(({ slug }) => slug === 'aquamarinus'), true)
  assert.equal(confirmed.some(({ slug }) => slug === 'lac-humanum'), true)
  assert.equal(confirmed.some(({ aliases_abbreviations = '' }) => /Lac maternum/i.test(aliases_abbreviations)), false)
})

test('validates the audited remedy counts from the CSV source of truth', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-remedy-source-inventory.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /confirmed=94 duplicates=8 grouped=1 mention_only=22 en_missing=94/)
})
