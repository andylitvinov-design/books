import crypto from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const exportRoot = process.env.TELEGRAM_PSYCHIC_ALCHEMY_EXPORT
  || '/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-09-04'
const sourceFile = path.join(exportRoot, 'messages.html')
const outputFile = path.join(projectRoot, 'data', 'telegram-psychic-alchemy-index.csv')

// These are complete, structured remedy posts in the Telegram export. Canonical
// names follow the approved Phase L normalization; the source spelling remains
// in the inventory aliases/provenance rather than being discarded.
const NEW_FULL_CARDS = [
  ['Nitricum Acidum', 'nitricum-acidum', 'message162'],
  ['Arnica', 'arnica', 'message168'],
  ['Phosphoricum Acidum', 'phosphoricum-acidum', 'message169'],
  ['Kalium Arsenicosum', 'kalium-arsenicosum', 'message222'],
  ['Spongia Tosta', 'spongia-tosta', 'message230'],
  ['Lycopodium', 'lycopodium', 'message240'],
  ['Carbo vegetabilis', 'carbo-vegetabilis', 'message244'],
  ['Sepia', 'sepia', 'message247'],
  ['Staphysagria', 'staphysagria', 'message277'],
  ['Secale Cornutum', 'secale-cornutum', 'message285'],
  ['Hypericum Perforatum', 'hypericum-perforatum', 'message294'],
  ['Carbo Animalis', 'carbo-animalis', 'message317'],
  ['Apis', 'apis', 'message387'],
  ['Silicea', 'silicea', 'message390'],
  ['Natrum Carbonicum', 'natrum-carbonicum', 'message398'],
  ['Magnesia Phosphorica', 'magnesia-phosphorica', 'message408'],
  ['Bryonia', 'bryonia', 'message417'],
  ['Ruta Graveolens', 'ruta-graveolens', 'message425'],
  ['Natrum Sulfuricum', 'natrum-sulfuricum', 'message449'],
  ['Alumina', 'alumina', 'message450'],
  ['Thuja', 'thuja', 'message452'],
  ['Psorinum', 'psorinum', 'message470'],
  ['Magnesium Muriaticum', 'magnesium-muriaticum', 'message487'],
  ['Borax', 'borax', 'message496'],
  ['Cinchona', 'cinchona', 'message565'],
  ['Mercurius solubilis', 'mercurius-solubilis', 'message570'],
  ['Phytolacca Decandra', 'phytolacca-decandra', 'message575'],
  ['Kali Muriaticum', 'kali-muriaticum', 'message601'],
  ['Hydrogenium', 'hydrogenium', 'message606'],
  ['Teucrium', 'teucrium', 'message609'],
  ['Coccus Cacti', 'coccus-cacti', 'message614'],
  ['Camphora', 'camphora', 'message622'],
  ['Platina Metallicum', 'platina-metallicum', 'message667'],
  ['Baptisia Tinctoria', 'baptisia-tinctoria', 'message670'],
  ['Sanguinaria Canadensis', 'sanguinaria-canadensis', 'message678'],
  ['Veratrum Album', 'veratrum-album', 'message680'],
  ['Hydrastis Canadensis', 'hydrastis-canadensis', 'message681'],
  ['Cobaltum Metallicum', 'cobaltum-metallicum', 'message682'],
  ['Kalium Iodatum', 'kalium-iodatum', 'message696'],
  ['Colchicum Autumnale', 'colchicum-autumnale', 'message704'],
  ['Cocculus Indicus', 'cocculus-indicus', 'message725'],
  ['Aethusa Cynapium', 'aethusa-cynapium', 'message733'],
  ['Beryllium Metallicum', 'beryllium-metallicum', 'message735'],
  ['Bovista Lycoperdon', 'bovista-lycoperdon', 'message737'],
  ['Bothrops Lanceolatus', 'bothrops-lanceolatus', 'message749'],
  ['Ambra Grisea', 'ambra-grisea', 'message751'],
  ['Folliculinum', 'folliculinum', 'message755'],
  ['Helleborus Niger', 'helleborus-niger', 'message760'],
  ['Magnesium Carbonicum', 'magnesium-carbonicum', 'message802'],
  ['Saccharum Officinale', 'saccharum-officinale', 'message806'],
  ['Cyclamen Europaeum', 'cyclamen-europaeum', 'message819'],
  ['Syzygium jambolanum', 'syzygium-jambolanum', 'message826'],
  ['Rock Water', 'rock-water', 'message848'],
  ['Saccharum Lactis', 'saccharum-lactis', 'message1025'],
]

// The pre-Phase-K inventory already established these 38 source-backed cards.
// These anchors let the Telegram index attach their original post and assets
// without changing their published remedy content.
const LEGACY_FULL_CARD_ANCHORS = [
  ['natrum-muriaticum', 'message49'], ['ignatia-amara', 'message54'], ['cantharis', 'message70'],
  ['opium', 'message112'], ['sulphur', 'message113'], ['baryta-carbonica', 'message114'],
  ['urtica-urens', 'message134'], ['ferrum-phosphoricum', 'message147'], ['lachesis', 'message153'],
  ['gelsemium', 'message158'], ['pulsatilla', 'message164'], ['rhus-toxicodendron', 'message180'],
  ['arsenicum-album', 'message188'], ['calcarea-carbonica', 'message205'], ['kalium-sulphuricum', 'message217'],
  ['coffea-cruda', 'message219'], ['avena-sativa', 'message228'], ['kalium-phosphoricum', 'message257'],
  ['antimonium-crudum', 'message329'], ['argentum-nitricum', 'message419'], ['causticum', 'message448'],
  ['mezereum', 'message456'], ['lac-humanum', 'message534'], ['lac-asinum', 'message552'],
  ['kali-carbonicum', 'message630'], ['cenchris-contortrix', 'message754'], ['testosteronum', 'message838'],
  ['oophorinum', 'message840'], ['bach-vine', 'message881'], ['bach-crab-apple', 'message1000'],
  ['bach-oak', 'message1001'], ['bach-hornbeam', 'message1002'], ['bach-wild-oat', 'message1005'],
  ['bach-elm', 'message1006'], ['rock-rose', 'message1007'], ['star-of-bethlehem', 'message1008'],
  ['bach-sweet-chestnut', 'message1009'], ['bach-cerato', 'message1011'],
]

// These are source variants, poems, or later updates. They are retained in the
// index and have a merge target; unlike exact duplicates, their text is not
// discarded.
const SUPPORTING_CARD_POSTS = [
  ['message1059', 'Aurum metallicum', 'aurum-metallicum', 'message37'],
  ['message165', 'Natrum Muriaticum', 'natrum-muriaticum', 'message49'],
  ['message198', 'Sulphur', 'sulphur', 'message113'], ['message199', 'Sulphur', 'sulphur', 'message113'],
  ['message200', 'Sulphur', 'sulphur', 'message113'], ['message218', 'Kalium Sulphuricum', 'kalium-sulphuricum', 'message217'],
  ['message245', 'Carbo vegetabilis', 'carbo-vegetabilis', 'message244'], ['message249', 'Sepia', 'sepia', 'message247'],
  ['message258', 'Kalium Phosphoricum', 'kalium-phosphoricum', 'message257'],
  ['message283', 'Staphysagria', 'staphysagria', 'message277'], ['message430', 'Carcinosinum', 'carcinosinum', 'message429'],
  ['message481', 'Baryta Carbonica', 'baryta-carbonica', 'message114'], ['message566', 'Cinchona', 'cinchona', 'message565'],
  ['message752', 'Ambra Grisea', 'ambra-grisea', 'message751'], ['message842', 'Testosteronum', 'testosteronum', 'message838'],
  ['message866', 'Testosteronum', 'testosteronum', 'message838'],
]

// The author approved these two names for publication in Phase L. Original
// spellings are kept in the source aliases and mapping notes.
const RESOLVED_FULL_CARDS = [
  ['Aurum metallicum', 'aurum-metallicum', ['message37']],
  ['Carcinosinum', 'carcinosinum', ['message429', 'message1053']],
]

// Explicit source mentions not represented by one of the complete cards above.
// They are inventory candidates only, never page proposals.
const MENTION_ONLY = [
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
  ['Magnesium sulphuricum', 'magnesium-sulphuricum', ['message757']],
  ['Aspen', 'aspen', ['message1026']],
  ['White Chestnut', 'white-chestnut', ['message1026']],
]

function fail(message) {
  throw new Error(`telegram-psychic-alchemy-index: ${message}`)
}

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function normalize(value) {
  return value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function plainText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function endOfDiv(html, start) {
  const divTag = /<\/?div\b[^>]*>/gi
  divTag.lastIndex = start
  let depth = 0
  let token
  while ((token = divTag.exec(html))) {
    depth += token[0][1] === '/' ? -1 : 1
    if (depth === 0) return divTag.lastIndex
  }
  fail(`unclosed div at byte ${start}`)
}

function messageText(fragment) {
  const textStart = /<div\b[^>]*class="text"[^>]*>/gi
  const parts = []
  let match
  while ((match = textStart.exec(fragment))) {
    const end = endOfDiv(fragment, match.index)
    parts.push(plainText(fragment.slice(match.index, end)))
    textStart.lastIndex = end
  }
  return parts.join('\n\n').trim()
}

function parseMessages(html) {
  const messageStart = /<div\b(?=[^>]*\bclass="([^"]*\bmessage\b[^"]*)")(?=[^>]*\bid="([^"]+)")[^>]*>/gi
  const records = []
  let match
  while ((match = messageStart.exec(html))) {
    const end = endOfDiv(html, match.index)
    const fragment = html.slice(match.index, end)
    const classes = match[1]
    const id = match[2]
    const photos = [...new Set(
      [...fragment.matchAll(/(?:href|src)="(photos\/[^"?#]+)(?:\?[^\"]*)?"/gi)]
        .map(([, asset]) => asset)
        .filter((asset) => !asset.includes('_thumb.')),
    )]
    records.push({
      message_id: id,
      message_type: classes.includes('service') ? 'service' : 'default',
      date: fragment.match(/class="pull_right date details" title="([^"]+)"/i)?.[1] || '',
      forwarded: /class="forwarded body"/i.test(fragment) ? 'yes' : 'no',
      text: messageText(fragment),
      photo_assets: photos,
      missing_assets: photos.filter((asset) => !existsSync(path.join(exportRoot, asset))),
    })
    messageStart.lastIndex = end
  }
  return records
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
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else value += character
  }
  cells.push(value)
  return cells
}

function currentRemedies() {
  const inventory = readFileSync(path.join(projectRoot, 'data', 'remedy-source-inventory.csv'), 'utf8').trim().split('\n')
  const header = parseCsvLine(inventory.shift())
  return inventory
    .map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
    .filter(({ candidate_status }) => candidate_status === 'confirmed')
    .map(({ canonical_latin_name, slug, russian_common_name, aliases_abbreviations }) => ({
      canonical_latin_name,
      slug,
      names: [canonical_latin_name, russian_common_name, ...aliases_abbreviations.split(';')].filter(Boolean),
    }))
}

function matchesName(normalizedText, name) {
  const normalizedName = normalize(name)
  if (normalizedName.length < 5) return false
  return normalizedText.includes(normalizedName)
}

function classify(record, allNames, fullByMessage, supportingByMessage, mentionByMessage, exactDuplicates) {
  const normalizedText = normalize(record.text)
  const full = fullByMessage.get(record.message_id)
  const supporting = supportingByMessage.get(record.message_id)
  const mentions = allNames.filter(({ names }) => names.some((name) => matchesName(normalizedText, name)))
  const remedyNames = [...new Set([
    ...(full ? [full.canonical_latin_name] : []),
    ...mentions.map(({ canonical_latin_name }) => canonical_latin_name),
    ...(mentionByMessage.get(record.message_id) || []).map(({ canonical_latin_name }) => canonical_latin_name),
  ])]
  const promo = /(?:записаться|свободн(?:ые|ое) время|стоимость|консультац(?:ия|ии)|@andytherapist|подписывай)/iu.test(record.text)
  const book4 = /(?:алхими|миазм|магическ|рунич|карм|стихи[яй]|усин|меридиан|мандал|даосск|эгрегор)/iu.test(record.text)
  const book3 = /(?:субличност|част[ьи] души|фрагментарн(?:ая|ой) личност|внутренн(?:ий|яя) (?:ребенок|часть)|архетип)/iu.test(record.text)
  const book1 = /(?:гомеопат|препарат|систем(?:ная|ной) гомеопат|расстановк|потенци|травм)/iu.test(record.text)
  const duplicateOf = exactDuplicates.get(record.message_id) || ''
  let book = 'out_of_scope'
  if (record.message_type === 'service') book = 'service'
  else if (!record.text) book = 'empty_or_media'
  else if (duplicateOf) book = 'duplicate'
  else if (full || supporting) book = 'book_02'
  else if (book4) book = 'book_04'
  else if (book3) book = 'book_03'
  else if (book1) book = 'book_01'
  else if (promo) book = 'promo_or_boilerplate'

  let contentType = 'other'
  if (record.message_type === 'service') contentType = 'service_history'
  else if (!record.text) contentType = 'empty_or_media'
  else if (duplicateOf) contentType = 'duplicate_repost'
  else if (full) contentType = 'remedy_card'
  else if (supporting) contentType = 'remedy_card_support'
  else if (promo && !/^book_0[1-4]$/.test(book)) contentType = 'promo_admin'
  else if (/\bкейс\b/iu.test(record.text)) contentType = 'case_observation'
  else if (book === 'book_01') contentType = 'theory_method'
  else if (book === 'book_03') contentType = 'subpersonality'
  else if (book === 'book_04') contentType = 'deep_alchemical'
  else if (remedyNames.length) contentType = 'remedy_mention'

  return {
    book,
    useful: /^book_0[1-4]$/.test(book) ? 'yes' : 'no',
    content_type: contentType,
    classification_confidence: full || supporting || record.message_type === 'service' || duplicateOf ? 'high' : (book === 'out_of_scope' ? 'low' : 'medium'),
    remedy_focus: full ? 'full_card' : (supporting ? 'supporting_post' : (remedyNames.length ? 'mention_only' : 'none')),
    canonical_remedy: full?.canonical_latin_name || supporting?.canonical_latin_name || remedyNames.join('; '),
    remedy_slug: full?.slug || supporting?.slug || mentions.map(({ slug }) => slug).join('; '),
    canonical_card_message_id: full ? record.message_id : (supporting?.canonical_card_message_id || ''),
    duplicate_of_message_id: duplicateOf,
  }
}

if (!existsSync(sourceFile)) fail(`Telegram export is missing: ${sourceFile}`)
const html = readFileSync(sourceFile, 'utf8')
const records = parseMessages(html)
if (records.length === 0) fail('no Telegram messages were parsed')

const current = currentRemedies()
const currentBySlug = new Map(current.map((record) => [record.slug, record]))
const legacyCards = LEGACY_FULL_CARD_ANCHORS.map(([slug, message_id]) => {
  const record = currentBySlug.get(slug)
  if (!record) fail(`legacy card anchor references an unknown current slug: ${slug}`)
  return { ...record, message_id }
})
const proposalCards = NEW_FULL_CARDS.map(([canonical_latin_name, slug, message_id]) => ({
  canonical_latin_name,
  slug,
  message_id,
  names: [canonical_latin_name],
}))
const resolvedCards = RESOLVED_FULL_CARDS.map(([canonical_latin_name, slug, message_ids]) => ({
  canonical_latin_name,
  slug,
  message_ids,
  names: canonical_latin_name.startsWith('Aurum')
    ? ['Аурум', 'Aurum', 'Aurum Metallicum']
    : ['Carsinosinum', 'Carcinosinum'],
}))
const fullByMessage = new Map([
  ...legacyCards.map((card) => [card.message_id, card]),
  ...proposalCards.map((card) => [card.message_id, card]),
  ...resolvedCards.flatMap((card) => card.message_ids.map((messageId) => [messageId, card])),
])
const supportingByMessage = new Map(SUPPORTING_CARD_POSTS.map(([message_id, canonical_latin_name, slug, canonical_card_message_id]) => [
  message_id,
  { canonical_latin_name, slug, canonical_card_message_id },
]))
const mentionRecords = MENTION_ONLY.map(([canonical_latin_name, slug, message_ids]) => ({ canonical_latin_name, slug, names: [canonical_latin_name], message_ids }))
const mentionByMessage = new Map()
for (const record of mentionRecords) {
  for (const messageId of record.message_ids) {
    if (!mentionByMessage.has(messageId)) mentionByMessage.set(messageId, [])
    mentionByMessage.get(messageId).push(record)
  }
}
const allNames = [...current, ...proposalCards, ...resolvedCards, ...mentionRecords]

const hashes = new Map()
for (const record of records.filter(({ message_type, text }) => message_type === 'default' && text.length >= 40)) {
  const fingerprint = normalize(record.text).replace(/\b(?:записаться\s+)?@andytherapist\b/gu, '').trim()
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex')
  if (!hashes.has(hash)) hashes.set(hash, [])
  hashes.get(hash).push(record.message_id)
}
const exactDuplicates = new Map()
for (const ids of hashes.values()) {
  if (ids.length < 2) continue
  for (const id of ids.slice(1)) exactDuplicates.set(id, ids[0])
}

const header = [
  'message_id', 'message_type', 'date_utc_offset', 'forwarded', 'photo_assets', 'photo_count', 'missing_asset_count',
  'source_channel', 'text_sha256', 'text_excerpt', 'content_type', 'book_assignment', 'include_in_book', 'useful', 'classification_confidence', 'remedy_focus',
  'canonical_remedy', 'remedy_slug', 'canonical_card_message_id', 'duplicate_of_message_id', 'source_file', 'source_anchor',
]
const rows = records.map((record) => {
  const details = classify(record, allNames, fullByMessage, supportingByMessage, mentionByMessage, exactDuplicates)
  return {
    message_id: record.message_id,
    message_type: record.message_type,
    date_utc_offset: record.date,
    forwarded: record.forwarded,
    photo_assets: record.photo_assets.join('; '),
    photo_count: record.photo_assets.length,
    missing_asset_count: record.missing_assets.length,
    source_channel: 'Психогомеопатия: Алхимия души.',
    text_sha256: crypto.createHash('sha256').update(record.text).digest('hex'),
    text_excerpt: record.text.replace(/\s+/g, ' ').slice(0, 360),
    ...details,
    book_assignment: details.book,
    include_in_book: details.useful,
    source_file: 'Telegram Desktop/ChatExport_2026-09-04/messages.html',
    source_anchor: `#${record.message_id}`,
  }
})
writeFileSync(outputFile, `${header.join(',')}\n${rows.map((row) => header.map((column) => csv(row[column])).join(',')).join('\n')}\n`)

const totals = Object.groupBy(rows, ({ book_assignment }) => book_assignment)
const fullCardNames = new Set(rows.filter(({ remedy_focus }) => remedy_focus === 'full_card').map(({ canonical_remedy }) => canonical_remedy))
console.log(JSON.stringify({
  messages_processed: rows.length,
  default_messages: rows.filter(({ message_type }) => message_type === 'default').length,
  service_messages: rows.filter(({ message_type }) => message_type === 'service').length,
  useful_messages: rows.filter(({ useful }) => useful === 'yes').length,
  exact_duplicate_messages: rows.filter(({ duplicate_of_message_id }) => duplicate_of_message_id).length,
  remedy_focused_messages: rows.filter(({ remedy_focus }) => remedy_focus !== 'none').length,
  full_card_source_labels: fullCardNames.size,
  by_book: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.length])),
  missing_photo_assets: rows.reduce((count, { missing_asset_count }) => count + Number(missing_asset_count), 0),
}, null, 2))
