import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
const ruDirectory = path.join(projectRoot, 'content', 'remedies', 'ru')
const enDirectory = path.join(projectRoot, 'content', 'remedies', 'en')

function fail(message) {
  throw new Error(`remedy-content: ${message}`)
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
  cells.push(value)
  return cells
}

function parseFrontmatter(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
  if (!match) fail(`${path.relative(projectRoot, filePath)} is missing frontmatter or body`)
  const metadata = Object.fromEntries(
    match[1].split('\n').map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) fail(`${path.relative(projectRoot, filePath)} has invalid metadata`)
      return [line.slice(0, separator), line.slice(separator + 1).trim()]
    }),
  )
  return { metadata, body: match[2].trim() }
}

function normaliseSourceText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function files(directory) {
  if (!existsSync(directory)) fail(`${path.relative(projectRoot, directory)} is missing`)
  return readdirSync(directory).filter((file) => file.endsWith('.md')).sort()
}

const [headerLine, ...lines] = readFileSync(inventoryPath, 'utf8').trim().split('\n')
const header = parseCsvLine(headerLine)
const confirmed = lines
  .map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
  .filter(({ candidate_status: status }) => status === 'confirmed')
const expected = confirmed.map(({ slug }) => `${slug}.md`).sort()
const ruFiles = files(ruDirectory)
const enFiles = files(enDirectory)
if (expected.join('\n') !== ruFiles.join('\n')) fail('Russian files do not match confirmed inventory slugs')
if (expected.join('\n') !== enFiles.join('\n')) fail('English files do not match confirmed inventory slugs')

for (const remedy of confirmed) {
  const ruPath = path.join(ruDirectory, `${remedy.slug}.md`)
  const enPath = path.join(enDirectory, `${remedy.slug}.md`)
  const ru = parseFrontmatter(ruPath)
  const en = parseFrontmatter(enPath)
  const sourcePath = path.join(projectRoot, remedy.source_file)
  if (!existsSync(sourcePath)) fail(`${remedy.slug} source file is missing`)
  const source = readFileSync(sourcePath, 'utf8')
  if (ru.metadata.slug !== remedy.slug || en.metadata.slug !== remedy.slug) fail(`${remedy.slug} pair has a mismatched slug`)
  if (ru.metadata.locale !== 'ru' || en.metadata.locale !== 'en') fail(`${remedy.slug} pair has incorrect locales`)
  if (ru.metadata.source_file !== remedy.source_file || ru.metadata.source_heading !== remedy.source_section_heading) fail(`${remedy.slug} Russian source metadata is broken`)
  const headings = remedy.source_section_heading.split(';').map((value) => value.trim()).filter(Boolean)
  if (!headings.every((heading) => source.includes(heading))) fail(`${remedy.slug} source heading no longer exists`)
  if (remedy.source_file !== 'data/telegram-psychic-alchemy-index.csv') {
    const manualExcerpt = ru.body.split('\n\n## Дополнительные авторские материалы из Telegram\n\n')[0]
    if (!normaliseSourceText(source).includes(normaliseSourceText(manualExcerpt))) {
      fail(`${remedy.slug} Russian manual excerpt is not traceable to its source`)
    }
  }
  if (en.metadata.translation_provenance !== 'translated-from-ru') fail(`${remedy.slug} English provenance is missing`)
  if (en.metadata.translation_source !== `content/remedies/ru/${remedy.slug}.md`) fail(`${remedy.slug} English source pair is broken`)
  if (en.metadata.en_source_exists !== 'no' || !en.body) fail(`${remedy.slug} English language state is broken`)
}

console.log(`ru=${ruFiles.length} en=${enFiles.length} pairs=${confirmed.length} source_refs=${confirmed.length}`)
