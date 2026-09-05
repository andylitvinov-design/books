import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const mapPath = path.join(projectRoot, 'data/remedy-image-map.csv')
const contentRoot = path.join(projectRoot, 'content/remedies')

function csv(line) { const cells = []; let value = ''; let quoted = false; for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted } else if (character === ',' && !quoted) { cells.push(value); value = '' } else value += character } cells.push(value); return cells }
function metadata(filePath) { const match = readFileSync(filePath, 'utf8').match(/^---\n([\s\S]*?)\n---/); if (!match) throw new Error(`remedy-images: invalid frontmatter ${filePath}`); return Object.fromEntries(match[1].split('\n').map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()])) }
const lines = readFileSync(mapPath, 'utf8').trim().split('\n'); const header = csv(lines.shift()); const rows = lines.map((line) => Object.fromEntries(header.map((column, index) => [column, csv(line)[index] ?? ''])))
const published = rows.filter(({ image_review_status }) => image_review_status === 'approved_for_publication')
const primary = published.filter(({ image_classification }) => image_classification === 'primary_remedy_image')
if (primary.length !== 93 || new Set(primary.map(({ remedy_slug }) => remedy_slug)).size !== 93) throw new Error('remedy-images: duplicate or invalid primary mapping')
if (rows.filter(({ image_classification, image_review_status }) => image_classification === 'promotional_admin' && image_review_status === 'excluded_promotional_admin').length !== 2) throw new Error('remedy-images: promotional exclusions are incomplete')
for (const row of published) {
  if (!new RegExp(`^/media/remedies/${row.remedy_slug}/[^/]+$`).test(row.public_url)) throw new Error(`remedy-images: invalid public URL ${row.public_url}`)
  if (row.public_url.includes('Telegram Desktop') || !existsSync(path.join(projectRoot, 'public', row.public_url))) throw new Error(`remedy-images: missing public asset ${row.public_url}`)
}
for (const { remedy_slug, public_url } of primary) for (const locale of ['ru', 'en']) {
  const card = metadata(path.join(contentRoot, locale, `${remedy_slug}.md`))
  if (card.primary_image !== public_url || !card.source_images.startsWith('/media/remedies/')) throw new Error(`remedy-images: broken ${locale} metadata for ${remedy_slug}`)
}
for (const locale of ['ru', 'en']) {
  const baryta = metadata(path.join(contentRoot, locale, 'baryta-carbonica.md'))
  if (baryta.primary_image || !baryta.supporting_images.startsWith('/media/remedies/baryta-carbonica/')) throw new Error(`remedy-images: Baryta supporting-only metadata is broken for ${locale}`)
}
console.log(`primary=${primary.length} supporting=${published.length - primary.length} published=${published.length}`)
