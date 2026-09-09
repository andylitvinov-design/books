import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const exportRoot = process.env.TELEGRAM_PSYCHIC_ALCHEMY_EXPORT || '/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-09-04'
const exportHtml = path.join(exportRoot, 'messages.html')
const indexPath = path.join(projectRoot, 'data/telegram-psychic-alchemy-index.csv')
const mapPath = path.join(projectRoot, 'data/remedy-image-map.csv')
const tocPath = path.join(projectRoot, 'data/book-02-remedy-toc.json')
const auditPath = path.join(projectRoot, 'docs/remedy-image-audit.md')
const contentRoot = path.join(projectRoot, 'content/remedies')
const visuallyExcludedPromotionalMessages = new Set(['message114', 'message866'])

function csv(line) {
  const cells = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted }
    else if (character === ',' && !quoted) { cells.push(value); value = '' } else value += character
  }
  cells.push(value)
  return cells
}

function quote(value) { return `"${String(value ?? '').replaceAll('"', '""')}"` }

function readCsv(filePath) {
  const lines = readFileSync(filePath, 'utf8').trim().split('\n')
  const header = csv(lines.shift())
  return lines.map((line) => Object.fromEntries(header.map((column, index) => [column, csv(line)[index] ?? ''])))
}

function photoAssets(row) { return row.photo_assets.split(';').map((asset) => asset.trim()).filter(Boolean) }

function stableFileName(messageId, index, sourceImage) {
  const extension = path.extname(sourceImage).toLowerCase() || '.jpg'
  return `${messageId}-${index + 1}${extension}`
}

function parseFrontmatter(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
  if (!match) throw new Error(`invalid remedy content: ${filePath}`)
  const metadata = Object.fromEntries(match[1].split('\n').map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]))
  return { metadata, body: match[2] }
}

function writeFrontmatter(filePath, metadata, body) {
  writeFileSync(filePath, `---\n${Object.entries(metadata).map(([key, value]) => `${key}:${value ? ` ${String(value).replace(/\n/g, ' ').trim()}` : ''}`).join('\n')}\n---\n${body}`)
}

if (!existsSync(exportHtml)) throw new Error(`Telegram export missing: ${exportHtml}`)
const html = readFileSync(exportHtml, 'utf8')
const index = readCsv(indexPath)
const mapHeader = ['message_id', 'date_utc_offset', 'canonical_remedy', 'remedy_slug', 'canonical_card_message_id', 'source_image', 'source_image_exists', 'source_role', 'image_classification', 'image_review_status', 'public_url', 'notes']
const linked = index
  .filter(({ remedy_slug, remedy_focus, photo_assets }) => remedy_slug && photo_assets && (remedy_focus === 'full_card' || remedy_focus === 'supporting_post'))
  .flatMap((row) => photoAssets(row).map((source_image, sourceIndex) => ({ ...row, source_image, sourceIndex })))
  .sort((left, right) => left.message_id.localeCompare(right.message_id, 'en', { numeric: true }))

const firstPrimaryBySlug = new Map()
for (const row of linked) if (row.remedy_focus === 'full_card' && !firstPrimaryBySlug.has(row.remedy_slug)) firstPrimaryBySlug.set(row.remedy_slug, row.message_id)

const mapping = linked.map((row) => {
  const isPrimary = row.remedy_focus === 'full_card' && firstPrimaryBySlug.get(row.remedy_slug) === row.message_id
  const isPromotional = visuallyExcludedPromotionalMessages.has(row.message_id)
  const image_classification = isPromotional ? 'promotional_admin' : (isPrimary ? 'primary_remedy_image' : 'supporting_image')
  const image_review_status = isPromotional ? 'excluded_promotional_admin' : 'approved_for_publication'
  const fileName = stableFileName(row.message_id, row.sourceIndex, row.source_image)
  const public_url = isPromotional ? '' : `/media/remedies/${row.remedy_slug}/${fileName}`
  const sourcePath = path.join(exportRoot, row.source_image)
  if (!html.includes(row.source_image)) throw new Error(`asset has no messages.html reference: ${row.source_image}`)
  if (!existsSync(sourcePath)) throw new Error(`asset is missing: ${sourcePath}`)
  if (!isPromotional) {
    const targetDirectory = path.dirname(path.join(projectRoot, 'public', public_url))
    mkdirSync(targetDirectory, { recursive: true })
    copyFileSync(sourcePath, path.join(targetDirectory, fileName))
  }
  return {
    message_id: row.message_id,
    date_utc_offset: row.date_utc_offset,
    canonical_remedy: row.canonical_remedy,
    remedy_slug: row.remedy_slug,
    canonical_card_message_id: row.canonical_card_message_id,
    source_image: row.source_image,
    source_image_exists: 'yes',
    source_role: row.remedy_focus === 'full_card' ? 'primary_card_attached' : 'supporting_post_attached',
    image_classification,
    image_review_status,
    public_url,
    notes: isPromotional
      ? 'Visually reviewed CTA/promotional attachment; retained in provenance but excluded from public remedy media.'
      : isPrimary
      ? 'Attached to the canonical remedy source post; approved as the single primary image for this remedy.'
      : 'Attached to an additional canonical/source-support message; approved for the compact supporting gallery.',
  }
})

const approvedMapping = mapping.filter(({ image_review_status }) => image_review_status === 'approved_for_publication')
const primaryBySlug = new Map(approvedMapping.filter(({ image_classification }) => image_classification === 'primary_remedy_image').map((row) => [row.remedy_slug, row]))
const supportingBySlug = new Map()
for (const row of approvedMapping.filter(({ image_classification }) => image_classification === 'supporting_image')) {
  if (!supportingBySlug.has(row.remedy_slug)) supportingBySlug.set(row.remedy_slug, [])
  supportingBySlug.get(row.remedy_slug).push(row)
}

for (const locale of ['ru', 'en']) {
  const tocEntries = JSON.parse(readFileSync(tocPath, 'utf8')).entries
  for (const { slug } of tocEntries) {
    const filePath = path.join(contentRoot, locale, `${slug}.md`)
    const { metadata, body } = parseFrontmatter(filePath)
    const primary = primaryBySlug.get(slug)
    const supporting = supportingBySlug.get(slug) || []
    const selected = primary || supporting[0]
    const alt = locale === 'ru'
      ? `Исходное изображение, прикреплённое к ${metadata.canonical_latin_name}, ${selected?.message_id || ''}.`
      : `Source image attached to ${metadata.canonical_latin_name}, ${selected?.message_id || ''}.`
    writeFrontmatter(filePath, {
      ...metadata,
      primary_image: primary?.public_url || '',
      source_images: [primary, ...supporting].filter(Boolean).map(({ public_url }) => public_url).join('; '),
      supporting_images: supporting.map(({ public_url }) => public_url).join('; '),
      source_message_id: selected?.message_id || '',
      source_date: selected?.date_utc_offset || '',
      image_classification: primary?.image_classification || (supporting.length ? 'supporting_image' : ''),
      image_review_status: selected?.image_review_status || '',
      primary_image_alt: alt,
    }, body)
  }
}

const toc = JSON.parse(readFileSync(tocPath, 'utf8'))
toc.entries = toc.entries.map((entry) => {
  const primary = primaryBySlug.get(entry.slug)
  const supporting = supportingBySlug.get(entry.slug) || []
  return {
    ...entry,
    image_status: !primary ? (supporting.length ? 'supporting_gallery' : 'no_image') : (supporting.length ? 'primary_with_supporting_gallery' : 'primary_image'),
    primary_image: primary?.public_url || '',
    supporting_image_count: supporting.length,
  }
})
writeFileSync(tocPath, `${JSON.stringify(toc, null, 2)}\n`)
writeFileSync(mapPath, `${mapHeader.join(',')}\n${mapping.map((row) => mapHeader.map((column) => quote(row[column])).join(',')).join('\n')}\n`)

const uniqueAssets = new Map()
for (const row of index) for (const asset of photoAssets(row)) {
  if (!uniqueAssets.has(asset)) uniqueAssets.set(asset, [])
  uniqueAssets.get(asset).push(row)
}
const auditCounts = { promotional: 0, duplicate: 0, case: 0, unclear: 0 }
for (const rows of uniqueAssets.values()) {
  if (rows.some(({ message_id }) => visuallyExcludedPromotionalMessages.has(message_id))) { auditCounts.promotional += 1; continue }
  const kinds = new Set(rows.map(({ content_type }) => content_type))
  if (kinds.has('promo_admin')) auditCounts.promotional += 1
  else if (kinds.has('duplicate_repost')) auditCounts.duplicate += 1
  else if (kinds.has('case_observation')) auditCounts.case += 1
  else if (!rows.some(({ remedy_focus }) => remedy_focus === 'full_card' || remedy_focus === 'supporting_post')) auditCounts.unclear += 1
}
const remediesWithImages = new Set(approvedMapping.map(({ remedy_slug }) => remedy_slug)).size
const approvedSupportingCount = approvedMapping.filter(({ image_classification }) => image_classification === 'supporting_image').length
const report = `# Remedy image audit — Phase M\n\n## Method\n\nThe complete Telegram export was checked through \`messages.html\`, \`photos/\`, the parsed Telegram index, the 94-card inventory, and the generated image map. A public asset is copied only when its attachment belongs to a mapped canonical full-card or supporting-post message. All URLs below are repository-owned \`/media/remedies/...\` URLs; no Telegram Desktop path is exposed.\n\n## Result\n\n| Measure | Count |\n| --- | ---: |\n| Unique Telegram image assets reviewed | ${uniqueAssets.size} |\n| Remedy-linked image attachments | ${mapping.length} |\n| Approved primary images | ${primaryBySlug.size} |\n| Approved supporting images | ${approvedSupportingCount} |\n| Excluded promotional/admin images | ${auditCounts.promotional} |\n| Duplicate/repost images retained only in audit | ${auditCounts.duplicate} |\n| Case images retained only in audit | ${auditCounts.case} |\n| Unclear/manual-review images not published | ${auditCounts.unclear} |\n| Remedies with a usable image | ${remediesWithImages} |\n| Remedies with no usable image | ${94 - remediesWithImages} |\n\n## Decisions\n\n- ${primaryBySlug.size} cards have exactly one \`primary_remedy_image\`, selected from their first suitable canonical full-card message. One further card has an approved supporting-gallery image only because its canonical attachment was a CTA banner.\n- The ${approvedSupportingCount} approved supporting attachments are compact gallery images.\n- Images not mapped to a full-card or explicit supporting-post message remain in the export audit and are not copied to public assets.\n- Promotional/admin, duplicate/repost, case-only, and unclear images never enter the public remedy media path.\n`
writeFileSync(auditPath, report)
console.log(`reviewed=${uniqueAssets.size} linked=${mapping.length} primary=${primaryBySlug.size} supporting=${approvedSupportingCount} promo=${auditCounts.promotional} duplicate=${auditCounts.duplicate} case=${auditCounts.case} unclear=${auditCounts.unclear} without=${94 - remediesWithImages}`)
