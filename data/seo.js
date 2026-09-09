import { books } from './library.js'
import { getRemedyRouteParams } from './remedies.js'

function at(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

function localizedEntry(baseUrl, pathname) {
  const peerPath = pathname.replace(/^\/(ru|en)/, (_, locale) => `/${locale === 'ru' ? 'en' : 'ru'}`)
  return {
    url: at(baseUrl, pathname),
    lastModified: new Date('2026-09-04T00:00:00.000Z'),
    changeFrequency: 'monthly',
    priority: 0.7,
    alternates: { languages: { ru: at(baseUrl, pathname.startsWith('/ru/') ? pathname : peerPath), en: at(baseUrl, pathname.startsWith('/en/') ? pathname : peerPath) } },
  }
}

export function getSitemapEntries(baseUrl) {
  const base = new URL(baseUrl).toString()
  const booksEntries = books.map((book) => ({
    url: at(base, `/books/${book.id}`),
    lastModified: new Date('2026-09-04T00:00:00.000Z'),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  const homeopathyIndexes = ['/ru/homeopathy', '/en/homeopathy', '/ru/homeopathy/remedies', '/en/homeopathy/remedies']
    .map((pathname) => localizedEntry(base, pathname))
  const remedyEntries = getRemedyRouteParams()
    .map(({ locale, slug }) => localizedEntry(base, `/${locale}/homeopathy/remedies/${slug}`))

  return [{ url: at(base, '/'), lastModified: new Date('2026-09-04T00:00:00.000Z'), changeFrequency: 'weekly', priority: 1 }, ...booksEntries, ...homeopathyIndexes, ...remedyEntries]
}

export function getRobotsPolicy(baseUrl) {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: at(baseUrl, '/sitemap.xml') }
}
