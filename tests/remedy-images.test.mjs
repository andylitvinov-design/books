import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const imageMapPath = path.join(projectRoot, 'data', 'remedy-image-map.csv')
const tocPath = path.join(projectRoot, 'data', 'book-02-remedy-toc.json')

function parseCsvLine(line) {
  const cells = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted }
    else if (character === ',' && !quoted) { cells.push(value); value = '' } else value += character
  }
  cells.push(value)
  return cells
}

function readCsv(filePath) {
  const lines = readFileSync(filePath, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())
  return { header, rows: lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? '']))) }
}

function metadata(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  assert.ok(match, `${filePath} has frontmatter`)
  return Object.fromEntries(match[1].split('\n').map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]))
}

test('restores approved Telegram images as stable public remedy assets without local-path leakage', () => {
  const { header, rows } = readCsv(imageMapPath)
  assert.deepEqual(header, ['message_id', 'date_utc_offset', 'canonical_remedy', 'remedy_slug', 'canonical_card_message_id', 'source_image', 'source_image_exists', 'source_role', 'image_classification', 'image_review_status', 'public_url', 'notes'])

  const published = rows.filter(({ image_review_status }) => image_review_status === 'approved_for_publication')
  const primary = published.filter(({ image_classification }) => image_classification === 'primary_remedy_image')
  const supporting = published.filter(({ image_classification }) => image_classification === 'supporting_image')
  assert.equal(primary.length, 93)
  assert.equal(supporting.length, 15)
  assert.equal(new Set(primary.map(({ remedy_slug }) => remedy_slug)).size, 93, 'one primary image per canonical remedy')
  assert.equal(rows.filter(({ image_classification, image_review_status }) => image_classification === 'promotional_admin' && image_review_status === 'excluded_promotional_admin').length, 2)

  for (const row of published) {
    assert.match(row.public_url, new RegExp(`^/media/remedies/${row.remedy_slug}/[^/]+$`))
    assert.equal(row.public_url.includes('Telegram Desktop'), false)
    assert.equal(existsSync(path.join(projectRoot, 'public', row.public_url)), true, row.public_url)
  }
})

test('shares the image decision across each RU/EN card and exposes it in the Book 02 TOC', () => {
  const { rows } = readCsv(imageMapPath)
  const primaryBySlug = new Map(rows.filter(({ image_classification, image_review_status }) => image_classification === 'primary_remedy_image' && image_review_status === 'approved_for_publication').map(({ remedy_slug, public_url }) => [remedy_slug, public_url]))
  const hasSupporting = new Set(rows.filter(({ image_classification, image_review_status }) => image_classification === 'supporting_image' && image_review_status === 'approved_for_publication').map(({ remedy_slug }) => remedy_slug))
  const toc = JSON.parse(readFileSync(tocPath, 'utf8'))

  for (const [slug, publicUrl] of primaryBySlug) {
    const ru = metadata(path.join(projectRoot, 'content/remedies/ru', `${slug}.md`))
    const en = metadata(path.join(projectRoot, 'content/remedies/en', `${slug}.md`))
    assert.equal(ru.primary_image, publicUrl)
    assert.equal(en.primary_image, publicUrl)
    assert.match(ru.source_images, /^\/media\/remedies\//)
    assert.equal(toc.entries.find((entry) => entry.slug === slug).image_status, hasSupporting.has(slug) ? 'primary_with_supporting_gallery' : 'primary_image')
  }
  const baryta = toc.entries.find((entry) => entry.slug === 'baryta-carbonica')
  assert.equal(baryta.image_status, 'supporting_gallery')
  for (const locale of ['ru', 'en']) {
    const card = metadata(path.join(projectRoot, 'content/remedies', locale, 'baryta-carbonica.md'))
    assert.equal(card.primary_image, '')
    assert.match(card.supporting_images, /^\/media\/remedies\/baryta-carbonica\//)
  }
})
