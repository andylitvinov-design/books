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
const allowedStatuses = new Set(['confirmed', 'duplicate', 'grouped', 'mention_only'])
const telegramIndexFile = 'data/telegram-psychic-alchemy-index.csv'

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

function telegramMessageIds() {
  const indexPath = path.join(projectRoot, telegramIndexFile)
  if (!existsSync(indexPath)) fail(`Telegram index is missing: ${telegramIndexFile}`)
  const lines = readFileSync(indexPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())
  const messageIdColumn = header.indexOf('message_id')
  if (messageIdColumn < 0) fail('Telegram index has no message_id column')
  return new Set(lines.map((line) => parseCsvLine(line)[messageIdColumn]))
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
const unpublishedSlugs = new Set()
const counts = { confirmed: 0, duplicate: 0, grouped: 0, mention_only: 0 }
const telegramIds = telegramMessageIds()

for (const [index, row] of rows.entries()) {
  const line = index + 2
  if (!allowedStatuses.has(row.candidate_status)) fail(`line ${line} has invalid status ${row.candidate_status}`)
  if (!row.source_file || !row.source_section_heading) fail(`line ${line} is missing source traceability`)

  if (row.source_file === telegramIndexFile) {
    const anchors = row.source_section_heading.split(';').map((anchor) => anchor.trim()).filter(Boolean)
    if (anchors.length === 0 || !anchors.every((anchor) => telegramIds.has(anchor))) {
      fail(`line ${line} references a Telegram message not found in ${telegramIndexFile}`)
    }
  } else {
    if (!headingsByFile.has(row.source_file)) headingsByFile.set(row.source_file, sourceHeadings(row.source_file))
    if (!headingsByFile.get(row.source_file).has(row.source_section_heading)) fail(`line ${line} heading was not found in ${row.source_file}`)
  }

  if (row.candidate_status === 'confirmed') {
    if (!row.canonical_latin_name || !row.slug) fail(`line ${line} confirmed row is missing name or slug`)
    if (confirmedSlugs.has(row.slug)) fail(`line ${line} duplicates confirmed slug ${row.slug}`)
    if (row.ru_source_exists !== 'yes' || row.en_source_exists !== 'no' || row.needs_translation !== 'yes') {
      fail(`line ${line} has an invalid language availability state`)
    }
    confirmedSlugs.add(row.slug)
  } else if (row.candidate_status === 'duplicate') {
    if (!row.canonical_latin_name || !row.slug || row.needs_translation !== 'yes') fail(`line ${line} duplicate row is incomplete`)
  } else if (row.candidate_status === 'grouped' && (row.canonical_latin_name || row.slug || row.needs_translation !== 'no')) {
    fail(`line ${line} grouped row must not infer an individual remedy`)
  } else if (row.candidate_status === 'mention_only') {
    if (!row.canonical_latin_name || !row.slug || row.ru_source_exists !== 'yes' || row.en_source_exists !== 'no' || row.needs_translation !== 'yes') {
      fail(`line ${line} mention-only row is incomplete`)
    }
    if (confirmedSlugs.has(row.slug) || unpublishedSlugs.has(row.slug)) fail(`line ${line} reuses a published or mention-only slug: ${row.slug}`)
    unpublishedSlugs.add(row.slug)
  }

  counts[row.candidate_status] += 1
}

for (const row of rows.filter(({ candidate_status }) => candidate_status === 'duplicate')) {
  if (!confirmedSlugs.has(row.slug)) fail(`duplicate row references no confirmed slug: ${row.slug}`)
}

const enMissing = rows.filter(({ candidate_status, needs_translation }) => candidate_status === 'confirmed' && needs_translation === 'yes').length
if (counts.confirmed !== 94 || counts.duplicate !== 8 || counts.grouped !== 1 || counts.mention_only !== 22) {
  fail(`unexpected Phase L inventory counts: confirmed=${counts.confirmed} duplicates=${counts.duplicate} grouped=${counts.grouped} mention_only=${counts.mention_only}`)
}

console.log(`confirmed=${counts.confirmed} duplicates=${counts.duplicate} grouped=${counts.grouped} mention_only=${counts.mention_only} en_missing=${enMissing}`)
