import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const exportRoot = process.env.TELEGRAM_PSYCHIC_ALCHEMY_EXPORT
  || '/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-09-04'
const inventoryPath = path.join(projectRoot, 'data/remedy-source-inventory.csv')
const indexPath = path.join(projectRoot, 'data/telegram-psychic-alchemy-index.csv')
const ruDirectory = path.join(projectRoot, 'content/remedies/ru')
const enDirectory = path.join(projectRoot, 'content/remedies/en')
const tocPath = path.join(projectRoot, 'data/book-02-remedy-toc.json')

function csv(line) {
  const cells = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) { cells.push(value); value = '' } else value += character
  }
  cells.push(value)
  return cells
}

function readCsv(filePath) {
  const lines = readFileSync(filePath, 'utf8').trim().split('\n')
  const header = csv(lines.shift())
  return lines.map((line) => Object.fromEntries(header.map((column, index) => [column, csv(line)[index] ?? ''])))
}

function bodyFromMarkdown(filePath) {
  if (!readdirSync(path.dirname(filePath)).includes(path.basename(filePath))) return ''
  return readFileSync(filePath, 'utf8').replace(/^---\n[\s\S]*?\n---\n+/, '').trim()
}

function plainText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function endOfDiv(html, start) {
  const divTag = /<\/?div\b[^>]*>/gi; divTag.lastIndex = start; let depth = 0; let token
  while ((token = divTag.exec(html))) { depth += token[0][1] === '/' ? -1 : 1; if (depth === 0) return divTag.lastIndex }
  throw new Error(`unclosed div at ${start}`)
}

function telegramTexts() {
  const html = readFileSync(path.join(exportRoot, 'messages.html'), 'utf8')
  const start = /<div\b(?=[^>]*\bclass="([^"]*\bmessage\b[^"]*)")(?=[^>]*\bid="([^"]+)")[^>]*>/gi
  const messages = new Map(); let match
  while ((match = start.exec(html))) {
    const end = endOfDiv(html, match.index); const fragment = html.slice(match.index, end)
    const textStart = /<div\b[^>]*class="text"[^>]*>/gi; const textParts = []; let textMatch
    while ((textMatch = textStart.exec(fragment))) { const textEnd = endOfDiv(fragment, textMatch.index); textParts.push(plainText(fragment.slice(textMatch.index, textEnd))); textStart.lastIndex = textEnd }
    messages.set(match[2], textParts.join('\n\n').trim()); start.lastIndex = end
  }
  return messages
}

function cleanTelegramText(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const kept = lines.filter((line) => !/(?:@andytherapist|записаться|свободн(?:ые|ое) время|стоимость|акци[яи]|скидк|консультаци|подписывай)/iu.test(line))
  return kept.join('\n\n').trim()
}

function frontmatter(metadata, body) {
  const fields = Object.entries(metadata).map(([key, value]) => {
    const normalized = String(value ?? '').replace(/\n/g, ' ').trim()
    return normalized ? `${key}: ${normalized}` : `${key}:`
  })
  return `---\n${fields.join('\n')}\n---\n\n${body.trim()}\n`
}

function splitTranslation(text, maximum = 1000) {
  if (text.length <= maximum) return [text]
  const chunks = []; let rest = text
  while (rest.length > maximum) {
    const end = Math.max(rest.lastIndexOf('\n\n', maximum), rest.lastIndexOf('. ', maximum), rest.lastIndexOf(' ', maximum))
    chunks.push(rest.slice(0, end + 1)); rest = rest.slice(end + 1).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

async function translateChunk(chunk) {
  const query = new URLSearchParams({ client: 'gtx', sl: 'ru', tl: 'en', dt: 't', q: chunk })
  let lastResponse = 'no response'
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`)
    lastResponse = `status=${response.status}`
    if (response.ok) {
      const payload = await response.json()
      const translation = payload?.[0]?.map(([part]) => part).join('').trim()
      if (translation) return translation.replace(/\bdrug\b/gi, 'remedy')
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }
  throw new Error(`translation service did not return text (${lastResponse}; characters=${chunk.length})`)
}

async function translate(body) {
  const chunks = splitTranslation(body)
  const output = []
  for (const chunk of chunks) output.push(await translateChunk(chunk))
  return output.join('\n\n')
}

async function mapLimit(values, limit, iteratee) {
  const output = new Array(values.length); let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) { const index = cursor; cursor += 1; output[index] = await iteratee(values[index]) }
  }))
  return output
}

const inventory = readCsv(inventoryPath).filter(({ candidate_status }) => candidate_status === 'confirmed')
if (inventory.length !== 94) throw new Error(`expected 94 confirmed remedies, received ${inventory.length}`)
const index = readCsv(indexPath)
const indexById = new Map(index.map((row) => [row.message_id, row]))
const telegram = telegramTexts()
const legacySlugs = new Set(inventory.filter(({ source_file }) => source_file !== 'data/telegram-psychic-alchemy-index.csv').map(({ slug }) => slug))
const previousRu = new Map([...legacySlugs].map((slug) => [slug, bodyFromMarkdown(path.join(ruDirectory, `${slug}.md`)).replace(/\n\n## Дополнительные авторские материалы из Telegram[\s\S]*$/, '')]))
const previousEn = new Map([...legacySlugs].map((slug) => [slug, bodyFromMarkdown(path.join(enDirectory, `${slug}.md`))]))
const enrichSlugs = new Set(['natrum-muriaticum', 'sulphur', 'kalium-sulphuricum', 'baryta-carbonica', 'testosteronum'])

mkdirSync(ruDirectory, { recursive: true }); mkdirSync(enDirectory, { recursive: true })

const cards = inventory.map((remedy) => {
  const primaryIds = remedy.source_file === 'data/telegram-psychic-alchemy-index.csv'
    ? remedy.source_section_heading.split(';').map((value) => value.trim()).filter(Boolean)
    : index.filter(({ remedy_slug, remedy_focus }) => remedy_slug === remedy.slug && remedy_focus === 'full_card').map(({ message_id }) => message_id)
  const supportingIds = index
    .filter(({ remedy_slug, remedy_focus }) => remedy_slug === remedy.slug && remedy_focus === 'supporting_post')
    .map(({ message_id }) => message_id)
    .filter((messageId) => !primaryIds.includes(messageId))
  const sourceIds = [...primaryIds, ...supportingIds]
  const sources = sourceIds.map((messageId) => ({ messageId, row: indexById.get(messageId), text: cleanTelegramText(telegram.get(messageId) || '') }))
  const sourceMessages = sources.map(({ messageId, row }) => `${messageId}${row?.date_utc_offset ? ` (${row.date_utc_offset})` : ''}`).join('; ')
  const sourceImages = [...new Set(sources.flatMap(({ row }) => (row?.photo_assets || '').split(';').map((value) => value.trim()).filter(Boolean)))].join('; ')
  const additions = sources.filter(({ messageId }) => !primaryIds.includes(messageId) && Boolean(messageId))
  const existing = previousRu.get(remedy.slug)
  const baseRu = existing || sources.filter(({ messageId }) => primaryIds.includes(messageId)).map(({ messageId, text }) => `### ${messageId}\n\n${text}`).join('\n\n')
  const ruBody = additions.length && (enrichSlugs.has(remedy.slug) || !existing)
    ? `${baseRu}\n\n## Дополнительные авторские материалы из Telegram\n\n${additions.map(({ messageId, text }) => `### ${messageId}\n\n${text}`).join('\n\n')}`
    : baseRu
  if (!ruBody) throw new Error(`missing author content for ${remedy.slug}`)
  const baseMetadata = {
    slug: remedy.slug,
    canonical_latin_name: remedy.canonical_latin_name,
    russian_common_name: remedy.russian_common_name,
    source_substance: remedy.russian_common_name,
    aliases: remedy.aliases_abbreviations,
    key_image: '',
    main_state: '', observed_effect: '', archetype: '', shadow: '', resource: '', internal_conflict: '', developmental_stage: '', subpersonality: '', transformation: '', meanings_lessons: '', alchemical_interpretation: '', practical_observations: '', cases: '', comparisons: '',
    source_messages: sourceMessages,
    source_images: sourceImages,
    provenance: remedy.notes,
    source_file: remedy.source_file,
    source_heading: remedy.source_section_heading,
    source_author: 'Andrii Litvinov',
    source_status: remedy.source_file === 'data/telegram-psychic-alchemy-index.csv' ? 'telegram-primary-source' : 'manual-primary-source',
    related_slugs: '',
  }
  return { remedy, ruBody, baseMetadata }
})

await mapLimit(cards, 2, async ({ remedy, ruBody, baseMetadata }) => {
  writeFileSync(path.join(ruDirectory, `${remedy.slug}.md`), frontmatter({ locale: 'ru', ...baseMetadata, translation_provenance: 'original-ru-source', en_source_exists: 'no' }, ruBody))
  const oldEnglish = previousEn.get(remedy.slug)
  const enBody = oldEnglish && !enrichSlugs.has(remedy.slug) ? oldEnglish : await translate(ruBody)
  writeFileSync(path.join(enDirectory, `${remedy.slug}.md`), frontmatter({ locale: 'en', ...baseMetadata, translation_provenance: 'translated-from-ru', translation_source: `content/remedies/ru/${remedy.slug}.md`, translation_method: 'source-faithful machine-assisted translation', en_source_exists: 'no' }, enBody))
})

const entries = cards.map(({ remedy, baseMetadata }) => ({ slug: remedy.slug, canonical_latin_name: remedy.canonical_latin_name, russian_common_name: remedy.russian_common_name, aliases: remedy.aliases_abbreviations, source_messages: baseMetadata.source_messages }))
  .sort((left, right) => left.canonical_latin_name.localeCompare(right.canonical_latin_name, 'en'))
writeFileSync(tocPath, `${JSON.stringify({ book_id: 'book-02-homeopathy-remedies', title_ru: 'Гомеопатические препараты и карточки', title_en: 'Homeopathic Remedies and Cards', remedy_count: entries.length, entries }, null, 2)}\n`)
console.log(`generated ru=${cards.length} en=${cards.length} book_02_toc=${entries.length}`)
