import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  formatSourceCard,
  readCsv,
  requiredSectionsIn,
  sourceChannelUrl,
  telegramTexts,
} from './remedy-source-completeness.mjs'

const projectRoot = process.cwd()
const exportRoot = process.env.TELEGRAM_PSYCHIC_ALCHEMY_EXPORT
  || '/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-09-04'
const inventoryPath = path.join(projectRoot, 'data/remedy-source-inventory.csv')
const indexPath = path.join(projectRoot, 'data/telegram-psychic-alchemy-index.csv')
const ruDirectory = path.join(projectRoot, 'content/remedies/ru')
const enDirectory = path.join(projectRoot, 'content/remedies/en')
const tocPath = path.join(projectRoot, 'data/book-02-remedy-toc.json')

function frontmatter(metadata, body) {
  const fields = Object.entries(metadata).map(([key, value]) => {
    const normalized = String(value ?? '').replace(/\n/g, ' ').trim()
    return normalized ? `${key}: ${normalized}` : `${key}:`
  })
  return `---\n${fields.join('\n')}\n---\n\n${body.trim()}\n`
}

function splitTranslation(text, maximum = 900) {
  if (text.length <= maximum) return [text]
  const chunks = []; let rest = text
  while (rest.length > maximum) {
    const end = Math.max(rest.lastIndexOf('\n\n', maximum), rest.lastIndexOf('. ', maximum), rest.lastIndexOf(' ', maximum))
    chunks.push(rest.slice(0, end + 1)); rest = rest.slice(end + 1).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

const browserUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
let bingSession

async function createBingSession() {
  const response = await fetch('https://www.bing.com/translator', { headers: { 'user-agent': browserUserAgent, 'accept-language': 'en-CA,en;q=0.9' } })
  if (!response.ok) throw new Error(`Bing Translator session failed (status=${response.status})`)
  const html = await response.text()
  const ig = html.match(/"ig":"([^"]+)"/)?.[1]
  const iid = html.match(/data-iid="([^"]+)/)?.[1]
  const parameters = html.match(/var params_AbusePreventionHelper = \[([^\]]+)\]/)?.[1].split(',').map((value) => value.trim().replace(/^"|"$/g, ''))
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
  if (!ig || !iid || !parameters?.[0] || !parameters?.[1] || !cookie) throw new Error('Bing Translator session parameters are incomplete')
  return { ig, iid, key: parameters[0], token: parameters[1], cookie }
}

async function translateChunk(chunk) {
  let lastResponse = 'no response'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    bingSession ||= await createBingSession()
    const body = `&fromLang=ru&to=en&text=${encodeURIComponent(chunk)}&token=${encodeURIComponent(bingSession.token)}&key=${encodeURIComponent(bingSession.key)}`
    const endpoint = `https://www.bing.com/ttranslatev3?isVertical=1&IG=${bingSession.ig}&IID=${bingSession.iid}&SFX=${attempt}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': browserUserAgent,
        'accept-language': 'en-CA,en;q=0.9',
        origin: 'https://www.bing.com',
        referer: 'https://www.bing.com/translator',
        'x-requested-with': 'XMLHttpRequest',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        cookie: bingSession.cookie,
      },
      body,
    })
    lastResponse = `status=${response.status}`
    if (response.ok) {
      const payload = await response.json()
      const translation = payload?.[0]?.translations?.[0]?.text?.trim()
      if (translation) return translation.replace(/\bdrugs\b/gi, 'remedies').replace(/\bdrug\b/gi, 'remedy')
    }
    bingSession = undefined
  }
  throw new Error(`translation service did not return text (${lastResponse}; characters=${chunk.length})`)
}

async function translate(body) {
  const output = []
  for (const chunk of splitTranslation(body)) output.push(await translateChunk(chunk))
  return output.join('\n\n')
    .replaceAll('Additional copyright materials from Telegram', 'Additional materials and observations')
    .replaceAll('Additional author materials from Telegram', 'Additional materials and observations')
}

async function mapLimit(values, limit, iteratee) {
  const output = new Array(values.length); let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) { const index = cursor; cursor += 1; output[index] = await iteratee(values[index]) }
  }))
  return output
}

function sourceRecord(source) {
  return `${source.messageId}${source.row?.date_utc_offset ? ` (${source.row.date_utc_offset})` : ''}`
}

function uniqueBlocks(blocks) {
  const seen = new Set()
  return blocks.filter((block) => {
    const key = block.replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeFullCards(primary, additions) {
  let result = formatSourceCard(primary.text)
  for (const source of additions) {
    const blocks = formatSourceCard(source.text).split(/\n{2,}/).filter(Boolean).slice(1)
    const unique = uniqueBlocks(blocks.filter((block) => !result.toLocaleLowerCase('ru-RU').includes(block.toLocaleLowerCase('ru-RU'))))
    if (unique.length) result = `${result}\n\n${unique.join('\n\n')}`
  }
  return result
}

const inventory = readCsv(inventoryPath).filter(({ candidate_status }) => candidate_status === 'confirmed')
if (inventory.length !== 94) throw new Error(`expected 94 confirmed remedies, received ${inventory.length}`)
const index = readCsv(indexPath)
const telegram = telegramTexts(exportRoot)

mkdirSync(ruDirectory, { recursive: true }); mkdirSync(enDirectory, { recursive: true })

const cards = inventory.map((remedy) => {
  const allSources = index
    .filter(({ remedy_slug, remedy_focus }) => remedy_slug === remedy.slug && (remedy_focus === 'full_card' || remedy_focus === 'supporting_post'))
    .map((row) => ({ messageId: row.message_id, row, text: telegram.get(row.message_id) || '' }))
    .filter(({ text }) => Boolean(text.trim()))
  const fullCards = allSources.filter(({ row }) => row.remedy_focus === 'full_card').sort((left, right) => right.text.length - left.text.length)
  if (!fullCards.length) throw new Error(`missing full-card Telegram source for ${remedy.slug}`)
  const [primary, ...additionalFullCards] = fullCards
  const supporting = allSources.filter(({ row }) => row.remedy_focus === 'supporting_post')
  const primaryBody = mergeFullCards(primary, additionalFullCards)
  const supplementary = supporting.length
    ? `## Дополнительные материалы и наблюдения\n\n${supporting.map((source) => `### ${sourceRecord(source)}\n\n${formatSourceCard(source.text)}`).join('\n\n')}`
    : ''
  const ruBody = [primaryBody, supplementary].filter(Boolean).join('\n\n')
  const sourceMessages = [...fullCards, ...supporting].map(sourceRecord).join('; ')
  const sourceImages = [...new Set(allSources.flatMap(({ row }) => (row.photo_assets || '').split(';').map((value) => value.trim()).filter(Boolean)))].join('; ')
  const baseMetadata = {
    slug: remedy.slug,
    canonical_latin_name: remedy.canonical_latin_name,
    russian_common_name: remedy.russian_common_name,
    source_substance: remedy.russian_common_name,
    aliases: remedy.aliases_abbreviations,
    key_image: '',
    main_state: '', observed_effect: '', archetype: '', shadow: '', resource: '', internal_conflict: '', developmental_stage: '', subpersonality: '', transformation: '', meanings_lessons: '', alchemical_interpretation: '', practical_observations: '', cases: '', comparisons: '',
    primary_source_message: sourceRecord(primary),
    primary_source_sections: requiredSectionsIn(primary.text).join('; '),
    primary_source_url: sourceChannelUrl(),
    full_card_additions: additionalFullCards.map(sourceRecord).join('; '),
    supplementary_materials: supporting.map(sourceRecord).join('; '),
    source_messages: sourceMessages,
    source_images: sourceImages,
    provenance: `${remedy.notes}; primary canonical content rebuilt from ${sourceRecord(primary)}${additionalFullCards.length ? `; full-card additions: ${additionalFullCards.map(sourceRecord).join(', ')}` : ''}`,
    source_file: remedy.source_file,
    source_heading: remedy.source_section_heading,
    source_author: 'Andrii Litvinov',
    source_status: 'telegram-full-card-primary',
    related_slugs: '',
  }
  return { remedy, ruBody, baseMetadata }
})

await mapLimit(cards, 2, async ({ remedy, ruBody, baseMetadata }) => {
  writeFileSync(path.join(ruDirectory, `${remedy.slug}.md`), frontmatter({ locale: 'ru', ...baseMetadata, translation_provenance: 'original-ru-source', en_source_exists: 'no' }, ruBody))
  if (process.env.SKIP_EN_TRANSLATION === '1') return
  const enBody = await translate(ruBody)
  writeFileSync(path.join(enDirectory, `${remedy.slug}.md`), frontmatter({ locale: 'en', ...baseMetadata, translation_provenance: 'translated-from-ru', translation_source: `content/remedies/ru/${remedy.slug}.md`, translation_method: 'source-faithful machine-assisted translation', en_source_exists: 'no' }, enBody))
})

const entries = cards.map(({ remedy, baseMetadata }) => ({
  slug: remedy.slug,
  canonical_latin_name: remedy.canonical_latin_name,
  russian_common_name: remedy.russian_common_name,
  aliases: remedy.aliases_abbreviations,
  primary_source_message: baseMetadata.primary_source_message,
  supplementary_materials: baseMetadata.supplementary_materials,
  source_messages: baseMetadata.source_messages,
})).sort((left, right) => left.canonical_latin_name.localeCompare(right.canonical_latin_name, 'en'))
writeFileSync(tocPath, `${JSON.stringify({ book_id: 'book-02-homeopathy-remedies', title_ru: 'Гомеопатические препараты и карточки', title_en: 'Homeopathic Remedies and Cards', remedy_count: entries.length, entries }, null, 2)}\n`)
console.log(`generated ru=${cards.length} en=${cards.length} book_02_toc=${entries.length}`)
