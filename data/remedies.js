import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const supportedLocales = ['ru', 'en']

const projectRoot = process.cwd()
const contentRoot = path.join(projectRoot, 'content', 'remedies')

function parseFrontmatter(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
  if (!match) throw new Error(`Invalid remedy content: ${filePath}`)

  const metadata = Object.fromEntries(
    match[1].split('\n').map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) throw new Error(`Invalid remedy metadata: ${filePath}`)
      return [line.slice(0, separator), line.slice(separator + 1).trim()]
    }),
  )

  return { ...metadata, description: match[2].trim() }
}

function loadLocale(locale) {
  const directory = path.join(contentRoot, locale)
  if (!existsSync(directory)) throw new Error(`Missing remedy locale directory: ${directory}`)

  return readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => parseFrontmatter(path.join(directory, file)))
}

const remediesByLocale = Object.fromEntries(supportedLocales.map((locale) => [locale, loadLocale(locale)]))

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function transliterateCyrillic(value) {
  const characters = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '',
  }
  return [...value].map((character) => characters[character] ?? character).join('')
}

function normaliseSearch(value) {
  return transliterateCyrillic(stripDiacritics(String(value).toLowerCase()))
    .replace(/c/g, 'k')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function abbreviation(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 3))
    .join(' ')
}

function searchTerms(remedy) {
  return [
    remedy.canonical_latin_name,
    remedy.russian_common_name,
    remedy.aliases,
    abbreviation(remedy.canonical_latin_name),
  ]
    .filter(Boolean)
    .map(normaliseSearch)
}

function directoryEntry(remedy) {
  return {
    slug: remedy.slug,
    title: remedy.canonical_latin_name,
    commonName: remedy.russian_common_name,
    aliases: remedy.aliases.split(';').map((alias) => alias.trim()).filter(Boolean),
    letter: remedy.canonical_latin_name.charAt(0).toUpperCase(),
    searchText: searchTerms(remedy).join(' '),
  }
}

export function isSupportedLocale(locale) {
  return supportedLocales.includes(locale)
}

export function getRemedy(locale, slug) {
  if (!isSupportedLocale(locale)) return undefined
  return remediesByLocale[locale].find((remedy) => remedy.slug === slug)
}

export function getRemedyDirectory(locale) {
  if (!isSupportedLocale(locale)) return []
  return remediesByLocale[locale].map(directoryEntry).sort((left, right) => left.title.localeCompare(right.title, 'en'))
}

export function getRemedyRouteParams() {
  return supportedLocales.flatMap((locale) => remediesByLocale[locale].map(({ slug }) => ({ locale, slug })))
}

export function getHomeopathyLocaleParams() {
  return supportedLocales.map((locale) => ({ locale }))
}

export function getAlphabeticalRemedies(locale) {
  const grouped = new Map()
  for (const remedy of getRemedyDirectory(locale)) {
    if (!grouped.has(remedy.letter)) grouped.set(remedy.letter, [])
    grouped.get(remedy.letter).push(remedy)
  }
  return [...grouped.entries()].map(([letter, remedies]) => ({ letter, remedies }))
}

export function searchRemedies(locale, query) {
  const normalisedQuery = normaliseSearch(query)
  const remedies = getRemedyDirectory(locale)
  if (!normalisedQuery) return remedies
  return remedies.filter((entry) => {
    const source = getRemedy(locale, entry.slug)
    return searchTerms(source).some((term) => term.includes(normalisedQuery))
  })
}

export function getRemedySwitchPath(locale, slug) {
  return `/${locale}/homeopathy/remedies/${slug}`
}

export function getRelatedRemedies(locale, remedy) {
  if (!remedy?.related_slugs) return []
  return remedy.related_slugs
    .split(';')
    .map((slug) => slug.trim())
    .filter(Boolean)
    .map((slug) => getRemedy(locale, slug))
    .filter(Boolean)
}
