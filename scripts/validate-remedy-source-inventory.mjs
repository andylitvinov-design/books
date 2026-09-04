import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
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
const allowedStatuses = new Set(['confirmed', 'duplicate', 'grouped'])

function fail(message) {
  throw new Error(`remedy-source-inventory: ${message}`)
}

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

  if (quoted) fail('contains an unterminated quoted field')
  cells.push(value)
  return cells
}

function sourceHeadings(sourceFile) {
  const sourcePath = path.join(projectRoot, sourceFile)
  if (!existsSync(sourcePath)) fail(`source file is missing: ${sourceFile}`)

  return new Set(
    [...readFileSync(sourcePath, 'utf8').matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)]
      .map(([, heading]) => heading.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()),
  )
}

function readInventory() {
  if (!existsSync(inventoryPath)) fail('CSV file is missing')
  const lines = readFileSync(inventoryPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())

  if (header.join('\u0000') !== expectedColumns.join('\u0000')) fail('CSV columns do not match the inventory contract')

  return lines.map((line, lineIndex) => {
    const values = parseCsvLine(line)
    if (values.length !== header.length) fail(`line ${lineIndex + 2} has ${values.length} fields, expected ${header.length}`)
    return Object.fromEntries(header.map((column, index) => [column, values[index]]))
  })
}

const rows = readInventory()
const headingsByFile = new Map()
const confirmedSlugs = new Set()
const counts = { confirmed: 0, duplicate: 0, grouped: 0 }

for (const [index, row] of rows.entries()) {
  const line = index + 2
  if (!allowedStatuses.has(row.candidate_status)) fail(`line ${line} has invalid status ${row.candidate_status}`)
  if (!row.source_file || !row.source_section_heading) fail(`line ${line} is missing source traceability`)

  if (!headingsByFile.has(row.source_file)) headingsByFile.set(row.source_file, sourceHeadings(row.source_file))
  if (!headingsByFile.get(row.source_file).has(row.source_section_heading)) fail(`line ${line} heading was not found in ${row.source_file}`)

  if (row.candidate_status === 'confirmed') {
    if (!row.canonical_latin_name || !row.slug) fail(`line ${line} confirmed row is missing name or slug`)
    if (confirmedSlugs.has(row.slug)) fail(`line ${line} duplicates confirmed slug ${row.slug}`)
    if (row.ru_source_exists !== 'yes' || row.en_source_exists !== 'no' || row.needs_translation !== 'yes') {
      fail(`line ${line} has an invalid language availability state`)
    }
    confirmedSlugs.add(row.slug)
  } else if (row.candidate_status === 'duplicate') {
    if (!row.canonical_latin_name || !row.slug || row.needs_translation !== 'yes') fail(`line ${line} duplicate row is incomplete`)
  } else if (row.canonical_latin_name || row.slug || row.needs_translation !== 'no') {
    fail(`line ${line} grouped row must not infer an individual remedy`)
  }

  counts[row.candidate_status] += 1
}

for (const row of rows.filter(({ candidate_status }) => candidate_status === 'duplicate')) {
  if (!confirmedSlugs.has(row.slug)) fail(`duplicate row references no confirmed slug: ${row.slug}`)
}

const enMissing = rows.filter(({ candidate_status, needs_translation }) => candidate_status === 'confirmed' && needs_translation === 'yes').length
console.log(`confirmed=${counts.confirmed} duplicates=${counts.duplicate} grouped=${counts.grouped} en_missing=${enMissing}`)
