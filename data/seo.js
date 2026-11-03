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
  const bookLocales = ['en', 'ru', 'es']
  const booksEntries = books
    .filter(book => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.id))
    .flatMap(book => bookLocales.map(locale => ({
      url: at(base, `/${locale}/books/${book.id}`),
      lastModified: new Date('2026-10-17T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: {
        en: at(base, `/en/books/${book.id}`),
        ru: at(base, `/ru/books/${book.id}`),
        es: at(base, `/es/books/${book.id}`),
        'x-default': at(base, `/en/books/${book.id}`),
      } },
    })))
  // This public, editorial-only test catalogue entry is distinct from the
  // noindex/robots-blocked interactive /client/tests explorer and private reports.
  const publicTestLanguages = Object.fromEntries(
    bookLocales.map(locale => [locale, at(base, `/${locale}/tests`)]),
  )
  publicTestLanguages['x-default'] = publicTestLanguages.en
  const publicTestEntries = bookLocales.map(locale => ({
    url: publicTestLanguages[locale],
    lastModified: new Date('2026-10-18T00:00:00.000Z'),
    changeFrequency: 'monthly',
    priority: 0.8,
    alternates: { languages: { ...publicTestLanguages } },
  }))
  const homeopathyIndexes = ['/ru/homeopathy', '/en/homeopathy', '/ru/homeopathy/remedies', '/en/homeopathy/remedies']
    .map((pathname) => localizedEntry(base, pathname))
  const servicesIndexes = ['/ru/services', '/en/services'].map((pathname) => localizedEntry(base, pathname))
  const remedyEntries = getRemedyRouteParams()
    .map(({ locale, slug }) => localizedEntry(base, `/${locale}/homeopathy/remedies/${slug}`))

  const homepageLanguages = { en: at(base, '/'), ru: at(base, '/ru'), es: at(base, '/es'), 'x-default': at(base, '/') }
  return [
    { url: at(base, '/'), changeFrequency: 'weekly', priority: 1, alternates: { languages: homepageLanguages } },
    { url: at(base, '/ru'), changeFrequency: 'weekly', priority: 1, alternates: { languages: homepageLanguages } },
    { url: at(base, '/books'), changeFrequency: 'monthly', priority: 0.8 }, ...booksEntries, ...publicTestEntries, ...homeopathyIndexes, ...servicesIndexes, ...remedyEntries]
}

export function getRobotsPolicy(baseUrl) {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api', '/api/', '/admin', '/document-preview/',
        '/en/app', '/ru/app', '/es/app',
        '/en/client', '/ru/client', '/es/client',
        '/en/report', '/ru/report', '/es/report',
        '/en/prescriptions/', '/ru/prescriptions/', '/es/prescriptions/',
      ],
    },
    sitemap: at(baseUrl, '/sitemap.xml'),
  }
}
