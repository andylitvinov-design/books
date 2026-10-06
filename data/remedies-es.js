// Source-backed public translation adapter. Private-cabinet locales and all
// original EN/RU source documents remain unchanged.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getRemedy, getRemedyDirectory } from './remedies.js'
import { applySpanishReview } from './spanish-remedy-review.js'
const document = JSON.parse(readFileSync(path.join(process.cwd(), 'data/spanish-remedies.json'), 'utf8'))
const fields = new Set(['description', 'source_substance', 'key_image', 'main_state', 'observed_effect', 'archetype', 'shadow', 'resource', 'internal_conflict', 'developmental_stage', 'subpersonality', 'transformation', 'meanings_lessons', 'alchemical_interpretation', 'practical_observations', 'cases', 'comparisons', 'primary_image_alt'])
if (document.schemaVersion !== 1 || document.targetLocale !== 'es' || document.sourceLocale !== 'en') throw new Error('Invalid Spanish remedy corpus')
const originals = getRemedyDirectory('en')
const translated = new Map()
for (const { slug } of originals) {
  const source = getRemedy('en', slug)
  const translation = document.entries?.[slug]
  const hash = createHash('sha256').update(readFileSync(path.join(process.cwd(), 'content/remedies/en', slug + '.md'))).digest('hex')
  if (!source || !translation || translation.sourceSha256 !== hash || !translation.fields?.description?.trim()) throw new Error('Missing or stale Spanish remedy translation: ' + slug)
  for (const [field, value] of Object.entries(translation.fields)) if (!fields.has(field) || typeof value !== 'string') throw new Error('Invalid Spanish remedy text field')
  const reviewed = applySpanishReview(source, translation.fields)
  if (Object.values(reviewed).some(value => /[\u0400-\u04ff]/.test(value))) throw new Error('Untranslated Spanish field: ' + slug)
  translated.set(slug, Object.freeze({ ...source, ...reviewed, locale: 'es', translation_source: `content/remedies/en/${slug}.md`, translation_method: document.method, translation_provenance: 'traducción automática del archivo del autor con correcciones lingüísticas puntuales' }))
}
if (Object.keys(document.entries).length !== originals.length) throw new Error('Spanish corpus does not match the public source inventory')
export function getSpanishRemedy(slug) { return translated.get(slug) }
export function getSpanishRemedySlugs() { return [...translated.keys()] }
export function getSpanishRemedyDirectory() {
  return originals.map(entry => {
    const remedy = translated.get(entry.slug)
    const firstParagraph = remedy.description.split(/\n{2,}/).find(block => block.trim() && !block.trim().startsWith('#') && block.trim().toUpperCase() !== remedy.canonical_latin_name.toUpperCase()) || ''
    return { slug: entry.slug, title: entry.title, letter: entry.letter, aliases: entry.aliases, searchText: entry.searchText, summary: (remedy.main_state || firstParagraph).replace(/[#*`]/g, '').slice(0, 180), descriptionType: entry.descriptionType }
  })
}
