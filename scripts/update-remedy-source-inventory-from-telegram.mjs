import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
const telegramIndexPath = path.join(projectRoot, 'data', 'telegram-psychic-alchemy-index.csv')
const baselineStatuses = new Set(['confirmed', 'duplicate', 'grouped'])
const phaseLSourceSpellings = new Map([
  ['Carbo vegetabilis', 'Carbo Vegetables; Carbo vegetabilis'],
  ['Mercurius solubilis', 'Mercurious Solubilis; Mercurius solubilis'],
  ['Syzygium jambolanum', 'Syzygiun Jambolanum; Syzygium jambolanum'],
  ['Aurum metallicum', 'Аурум; Aurum; Aurum Metallicum; Aurum metallicum'],
  ['Carcinosinum', 'Carsinosinum; Carcinosinum'],
])
const phaseLCommonNames = new Map([
  ['Aurum metallicum', 'золото'],
])

const mentionOnly = [
  ['Aconitum', 'aconitum', ['message34', 'message47', 'message48']],
  ['Medorrhinum', 'medorrhinum', ['message67', 'message757']],
  ['Aqua Marina', 'aqua-marina', ['message194']],
  ['Luna', 'luna', ['message194']],
  ['Anandamide', 'anandamide', ['message757']],
  ['Cineraria', 'cineraria', ['message757']],
  ['Amniotic Fluid', 'amniotic-fluid', ['message757']],
  ['Placenta', 'placenta', ['message757']],
  ['Lac Amnioticum', 'lac-amnioticum', ['message757']],
  ['Aquamarinus', 'aquamarinus', ['message757']],
  ['Lac Caninum', 'lac-caninum', ['message757']],
  ['Berberis', 'berberis', ['message757']],
  ['Plumbum Metallicum', 'plumbum-metallicum', ['message757']],
  ['Helium', 'helium', ['message757']],
  ['Dolphin Milk', 'dolphin-milk', ['message757']],
  ['Crocus Sativus', 'crocus-sativus', ['message757']],
  ['Tuberculinum', 'tuberculinum', ['message757']],
  ['Moschus', 'moschus', ['message757']],
  ['Anacardium', 'anacardium', ['message757']],
  ['Magnesium Sulphiricum', 'magnesium-sulphiricum', ['message757']],
  ['Aspen', 'aspen', ['message1026']],
  ['White Chestnut', 'white-chestnut', ['message1026']],
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
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else value += character
  }
  cells.push(value)
  return cells
}

function readCsv(file) {
  const lines = readFileSync(file, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())
  return {
    header,
    rows: lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? '']))),
  }
}

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function commonName(name, excerpt) {
  const match = excerpt.match(new RegExp(`${escapeRegExp(name)}\\s*[.,—:-]*\\s*\\(([^)]+)\\)`, 'iu'))
  const value = match?.[1]?.trim() || ''
  return /[А-Яа-яЁё]/u.test(value) ? value : ''
}

const baseline = readCsv(inventoryPath)
const index = readCsv(telegramIndexPath)
const baselineRows = baseline.rows.filter(({ candidate_status }) => baselineStatuses.has(candidate_status))
const baselineSlugs = new Set(baselineRows.filter(({ candidate_status }) => candidate_status === 'confirmed').map(({ slug }) => slug))
const fullRows = index.rows.filter(({ book_assignment, remedy_focus }) => book_assignment === 'book_02' && remedy_focus === 'full_card')
const firstByName = new Map()
for (const row of fullRows) if (!firstByName.has(row.canonical_remedy)) firstByName.set(row.canonical_remedy, row)
const messageIdsByName = new Map()
for (const row of fullRows) {
  if (!messageIdsByName.has(row.canonical_remedy)) messageIdsByName.set(row.canonical_remedy, [])
  messageIdsByName.get(row.canonical_remedy).push(row.message_id)
}

const newFullCardRows = [...firstByName.values()]
  .filter(({ remedy_slug }) => remedy_slug && !baselineSlugs.has(remedy_slug))
  .map((row) => ({
    canonical_latin_name: row.canonical_remedy,
    slug: row.remedy_slug,
    russian_common_name: phaseLCommonNames.get(row.canonical_remedy) || commonName(row.canonical_remedy, row.text_excerpt),
    aliases_abbreviations: phaseLSourceSpellings.get(row.canonical_remedy) || row.canonical_remedy,
    source_file: 'data/telegram-psychic-alchemy-index.csv',
    source_section_heading: messageIdsByName.get(row.canonical_remedy).join('; '),
    ru_source_exists: 'yes',
    en_source_exists: 'no',
    needs_translation: 'yes',
    candidate_status: 'confirmed',
    notes: `Telegram full-card source approved for Phase L publication. Source spelling/provenance: ${phaseLSourceSpellings.get(row.canonical_remedy) || row.canonical_remedy}.`,
  }))

const mentionRows = mentionOnly.map(([canonical_latin_name, slug, messageIds]) => ({
  canonical_latin_name,
  slug,
  russian_common_name: '',
  aliases_abbreviations: canonical_latin_name === 'Magnesium sulphuricum'
    ? 'Magnesium Sulphiricum; Magnesium sulphuricum'
    : canonical_latin_name,
  source_file: 'data/telegram-psychic-alchemy-index.csv',
  source_section_heading: messageIds.join('; '),
  ru_source_exists: 'yes',
  en_source_exists: 'no',
  needs_translation: 'yes',
  candidate_status: 'mention_only',
  notes: 'Explicit Telegram mention only; no standalone source card was found, so no public page is proposed.',
}))

const rows = [...baselineRows, ...newFullCardRows, ...mentionRows]
writeFileSync(inventoryPath, `${baseline.header.join(',')}\n${rows.map((row) => baseline.header.map((column) => csv(row[column])).join(',')).join('\n')}\n`)
console.log(`baseline=${baselineRows.length} confirmed_from_telegram=${newFullCardRows.length} mention_only=${mentionRows.length} total=${rows.length}`)
