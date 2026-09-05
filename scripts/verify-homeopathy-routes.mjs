import { books } from '../data/library.js'
import { getRemedy, getRemedyRouteParams } from '../data/remedies.js'

const baseUrl = process.argv[2]
if (!baseUrl) throw new Error('usage: node scripts/verify-homeopathy-routes.mjs <base-url>')

const base = new URL(baseUrl)

async function request(pathname, expectedStatus = 200) {
  const response = await fetch(new URL(pathname, base))
  if (response.status !== expectedStatus) throw new Error(`${pathname} returned ${response.status}, expected ${expectedStatus}`)
  return response
}

for (const pathname of ['/ru/homeopathy', '/en/homeopathy', '/ru/homeopathy/remedies', '/en/homeopathy/remedies']) {
  await request(pathname)
}

for (const { locale, slug } of getRemedyRouteParams()) {
  const response = await request(`/${locale}/homeopathy/remedies/${slug}`)
  const body = await response.text()
  const remedy = getRemedy(locale, slug)
  if (!body.includes(remedy.canonical_latin_name)) throw new Error(`${locale}/${slug} does not contain its remedy title`)
}

for (const book of books) {
  const response = await request(`/books/${book.id}`)
  const body = await response.text()
  if (!body.includes(book.title)) throw new Error(`/books/${book.id} does not contain its title`)
}

await request('/ru/homeopathy/remedies/not-a-remedy', 404)
const sitemap = await (await request('/sitemap.xml')).text()
const remedyLocations = [...sitemap.matchAll(/<loc>[^<]+\/homeopathy\/remedies\/[^<]+<\/loc>/g)]
const expectedRemedyRoutes = getRemedyRouteParams().length
if (remedyLocations.length !== expectedRemedyRoutes) throw new Error(`sitemap contains ${remedyLocations.length} remedy URLs, expected ${expectedRemedyRoutes}`)
const robots = await (await request('/robots.txt')).text()
if (!robots.includes('Sitemap:')) throw new Error('robots.txt does not advertise sitemap.xml')

console.log(`homeopathy_indexes=4 remedy_routes=${expectedRemedyRoutes} books=23 sitemap_remedies=${remedyLocations.length} not_found=404 robots=ok`)
