import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { missingRequiredSections, readCsv } from './remedy-source-completeness.mjs'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
const ruDirectory = path.join(projectRoot, 'content', 'remedies', 'ru')
const enDirectory = path.join(projectRoot, 'content', 'remedies', 'en')

function fail(message) { throw new Error(`remedy-content: ${message}`) }

function parseFrontmatter(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
  if (!match) fail(`${path.relative(projectRoot, filePath)} is missing frontmatter or body`)
  const metadata = Object.fromEntries(match[1].split('\n').map((line) => {
    const separator = line.indexOf(':')
    if (separator === -1) fail(`${path.relative(projectRoot, filePath)} has invalid metadata`)
    return [line.slice(0, separator), line.slice(separator + 1).trim()]
  }))
  return { metadata, body: match[2].trim() }
}

function files(directory) {
  if (!existsSync(directory)) fail(`${path.relative(projectRoot, directory)} is missing`)
  return readdirSync(directory).filter((file) => file.endsWith('.md')).sort()
}

function sourceSections(metadata) {
  return (metadata.primary_source_sections || '').split(';').map((section) => section.trim()).filter(Boolean)
}

function countHeadings(body) {
  return (body.match(/^##\s+/gm) || []).length
}

function countStructuredSourceHeadings(body, sections) {
  return sections.filter((section) => new RegExp(`^##\\s+${section}(?::|$)`, 'gmu').test(body)).length
}

const confirmed = readCsv(inventoryPath).filter(({ candidate_status: status }) => status === 'confirmed')
const expected = confirmed.map(({ slug }) => `${slug}.md`).sort()
const ruFiles = files(ruDirectory)
const enFiles = files(enDirectory)
if (expected.join('\n') !== ruFiles.join('\n')) fail('Russian files do not match confirmed inventory slugs')
if (expected.join('\n') !== enFiles.join('\n')) fail('English files do not match confirmed inventory slugs')

let supplementaryItems = 0
for (const remedy of confirmed) {
  const ru = parseFrontmatter(path.join(ruDirectory, `${remedy.slug}.md`))
  const en = parseFrontmatter(path.join(enDirectory, `${remedy.slug}.md`))
  const sourcePath = path.join(projectRoot, remedy.source_file)
  if (!existsSync(sourcePath)) fail(`${remedy.slug} source file is missing`)
  if (ru.metadata.slug !== remedy.slug || en.metadata.slug !== remedy.slug) fail(`${remedy.slug} pair has a mismatched slug`)
  if (ru.metadata.locale !== 'ru' || en.metadata.locale !== 'en') fail(`${remedy.slug} pair has incorrect locales`)
  if (ru.metadata.source_file !== remedy.source_file || ru.metadata.source_heading !== remedy.source_section_heading) fail(`${remedy.slug} Russian source metadata is broken`)
  if (!/^message\d+ \(/.test(ru.metadata.primary_source_message || '')) fail(`${remedy.slug} primary Telegram source record is missing`)
  if (ru.metadata.primary_source_url !== 'https://t.me/arche_therapy') fail(`${remedy.slug} primary Telegram source URL is broken`)
  const lost = missingRequiredSections((ru.metadata.primary_source_sections || '').split(';').join('\n'), ru.body)
  if (lost.length) fail(`${remedy.slug} lost primary source sections: ${lost.join(', ')}`)
  if (en.metadata.translation_provenance !== 'translated-from-ru') fail(`${remedy.slug} English provenance is missing`)
  if (en.metadata.translation_source !== `content/remedies/ru/${remedy.slug}.md`) fail(`${remedy.slug} English source pair is broken`)
  if (en.metadata.en_source_exists !== 'no' || !en.body) fail(`${remedy.slug} English language state is broken`)
  if (en.metadata.primary_source_message !== ru.metadata.primary_source_message || en.metadata.primary_source_sections !== ru.metadata.primary_source_sections) fail(`${remedy.slug} English primary-source provenance is broken`)
  const structuredSections = countStructuredSourceHeadings(ru.body, sourceSections(ru.metadata))
  if (structuredSections && countHeadings(en.body) < structuredSections) fail(`${remedy.slug} English translation lost source section structure`)
  supplementaryItems += (ru.metadata.supplementary_materials || '').split(';').filter(Boolean).length
}

console.log(`ru=${ruFiles.length} en=${enFiles.length} pairs=${confirmed.length} source_refs=${confirmed.length} supplementary_items=${supplementaryItems} completeness=green`)
