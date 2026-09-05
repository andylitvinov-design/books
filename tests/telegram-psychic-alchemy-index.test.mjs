import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const indexPath = path.join(projectRoot, 'data', 'telegram-psychic-alchemy-index.csv')
const imageMapPath = path.join(projectRoot, 'data', 'remedy-image-map.csv')

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

function readIndex() {
  const lines = readFileSync(indexPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(lines.shift())
  return lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
}

test('Phase K Telegram index preserves every export message and asset reference', () => {
  assert.equal(existsSync(indexPath), true, 'Telegram Psychic Alchemy index must exist')
  if (!existsSync(indexPath)) return

  const rows = readIndex()
  assert.equal(rows.length, 1325)
  assert.equal(rows.filter(({ message_type }) => message_type === 'default').length, 924)
  assert.equal(rows.filter(({ message_type }) => message_type === 'service').length, 401)
  assert.equal(rows.filter(({ useful }) => useful === 'yes').length, 774)
  assert.equal(rows.filter(({ missing_asset_count }) => missing_asset_count !== '0').length, 0)
  assert.equal(new Set(rows.map(({ message_id }) => message_id)).size, rows.length)
})

test('Phase L keeps Book 02 cards, source variants, and approved canonical names traceable', () => {
  const rows = readIndex()
  const books = Object.groupBy(rows, ({ book_assignment }) => book_assignment)
  assert.equal(books.book_01.length, 252)
  assert.equal(books.book_02.length, 111)
  assert.equal(books.book_03.length, 133)
  assert.equal(books.book_04.length, 278)
  assert.equal(rows.filter(({ remedy_focus }) => remedy_focus === 'full_card').length, 95)
  assert.equal(rows.filter(({ remedy_focus }) => remedy_focus === 'supporting_post').length, 16)
  assert.equal(rows.filter(({ duplicate_of_message_id }) => duplicate_of_message_id).length, 2)

  const aurum = rows.find(({ message_id }) => message_id === 'message37')
  assert.equal(aurum.canonical_remedy, 'Aurum metallicum')
  assert.equal(aurum.remedy_slug, 'aurum-metallicum')
  const carsinosinum = rows.find(({ message_id }) => message_id === 'message1053')
  assert.equal(carsinosinum.canonical_remedy, 'Carcinosinum')
  assert.equal(carsinosinum.remedy_slug, 'carcinosinum')
  const aurumComparison = rows.find(({ message_id }) => message_id === 'message1059')
  assert.equal(aurumComparison.remedy_focus, 'supporting_post')
  assert.equal(aurumComparison.canonical_card_message_id, 'message37')
})

test('Phase M image map preserves Book 02 photo provenance and approved public review decisions', () => {
  assert.equal(existsSync(imageMapPath), true, 'remedy image map must exist')
  if (!existsSync(imageMapPath)) return

  const indexRows = readIndex()
  const imageLines = readFileSync(imageMapPath, 'utf8').trim().split('\n')
  const imageHeader = parseCsvLine(imageLines.shift())
  const imageRows = imageLines.map((line) => Object.fromEntries(imageHeader.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
  const indexedMessageIds = new Set(indexRows.map(({ message_id }) => message_id))

  assert.equal(imageRows.length, 110)
  assert.equal(imageRows.every(({ message_id }) => indexedMessageIds.has(message_id)), true)
  assert.equal(imageRows.every(({ source_image_exists }) => source_image_exists === 'yes'), true)
  assert.equal(imageRows.filter(({ image_classification }) => image_classification === 'primary_remedy_image').length, 93)
  assert.equal(imageRows.filter(({ image_classification }) => image_classification === 'supporting_image').length, 15)
  assert.equal(imageRows.filter(({ image_classification }) => image_classification === 'promotional_admin').length, 2)
  assert.equal(imageRows.filter(({ image_review_status }) => image_review_status === 'approved_for_publication').every(({ public_url }) => public_url.startsWith('/media/remedies/')), true)
  assert.equal(imageRows.filter(({ image_review_status }) => image_review_status === 'excluded_promotional_admin').every(({ public_url }) => public_url === ''), true)
})
