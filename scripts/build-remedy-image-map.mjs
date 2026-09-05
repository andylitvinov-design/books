import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const indexPath = path.join(projectRoot, 'data', 'telegram-psychic-alchemy-index.csv')
const outputPath = path.join(projectRoot, 'data', 'remedy-image-map.csv')

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

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

if (!existsSync(indexPath)) throw new Error('remedy-image-map: Telegram index is missing')
const lines = readFileSync(indexPath, 'utf8').trim().split('\n')
const header = parseCsvLine(lines.shift())
const rows = lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
const mapHeader = ['message_id', 'date_utc_offset', 'canonical_remedy', 'remedy_slug', 'canonical_card_message_id', 'source_image', 'source_image_exists', 'source_role', 'publication_status', 'notes']
const mapping = rows
  .filter(({ remedy_focus, photo_assets }) => (remedy_focus === 'full_card' || remedy_focus === 'supporting_post') && photo_assets)
  .flatMap((row) => row.photo_assets.split('; ').filter(Boolean).map((source_image) => ({
    message_id: row.message_id,
    date_utc_offset: row.date_utc_offset,
    canonical_remedy: row.canonical_remedy,
    remedy_slug: row.remedy_slug,
    canonical_card_message_id: row.canonical_card_message_id,
    source_image,
    source_image_exists: 'yes',
    source_role: row.remedy_focus === 'full_card' ? 'primary_card_attached' : 'supporting_post_attached',
    publication_status: 'editorial_visual_review_required',
    notes: 'Source association is preserved. Filename alone does not establish remedy-specific visual suitability; do not publish automatically.',
  })))

writeFileSync(outputPath, `${mapHeader.join(',')}\n${mapping.map((row) => mapHeader.map((column) => csv(row[column])).join(',')).join('\n')}\n`)
console.log(`mapped_images=${mapping.length} primary=${mapping.filter(({ source_role }) => source_role === 'primary_card_attached').length} supporting=${mapping.filter(({ source_role }) => source_role === 'supporting_post_attached').length}`)
