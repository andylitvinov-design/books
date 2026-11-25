import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const count = (sourceText, marker) => sourceText.split(marker).length - 1

test('EN/RU homepage promotes paid personal support with optional free choices', () => {
  const home = source('components/holistic-house-home.tsx')
  assert.match(home, /Stuck in relationships, work or an important decision\?/)
  assert.match(home, /Сложности в отношениях, работе или важном решении\?/)
  assert.match(home, /<StaticPortrait[\s\S]*?andy-about\.png/)
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services#consultation\x60\}/)
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services\/free-situation-review\x60\}/)
  assert.match(home, /href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/)
  const paid = home.indexOf('"data-hero-cta": "paid-sessions"')
  const free = home.indexOf('"data-hero-cta": "free-written-review"')
  const tests = home.indexOf('"data-hero-cta": "free-tests"')
  assert.ok(paid !== -1 && paid < free && free < tests)
  assert.match(home, /className="service-home-selfcheck-link"/)
  assert.match(source('app/holistic-house-home.css'), /\.house-home--services \.service-home-selfcheck-link/)
  assert.match(home, /not a live call/i)
  assert.match(home, /Бесплатный формат — анкета, рисунок и личный письменный отчёт/)
})

test('Spanish homepage keeps the same paid/free/test priority and public tracking', () => {
  const page = source('app/es/page.tsx')
  assert.match(page, /<AcquisitionEventLink/)
  const paid = page.indexOf('"data-hero-cta": "paid-sessions"')
  const free = page.indexOf('"data-hero-cta": "free-written-review"')
  const tests = page.indexOf('"data-hero-cta": "free-tests"')
  assert.ok(paid !== -1 && paid < free && free < tests)
  assert.match(page, /className="service-home-selfcheck-link"/)
  assert.match(page, /Solicitar sesión personal · desde €50/)
  assert.match(page, /La revisión gratuita es un informe escrito, no una llamada/)
})

test('services landing prioritizes three free paths, personal offers, intro, testimonials and one booking', () => {
  const order = ['<ServicesConversionHero', '<ServicesStudioOffers', '<ServicesIntroMedia',
    '<PersonalTestimonials', '<ServicesMethodVideos', '<PublicConsultationCta', '<ServicesDirectoryInvitation']
  for (const route of ['app/[locale]/services/page.tsx', 'app/es/services/page.tsx']) {
    const page=source(route)
    for(let i=1;i<order.length;i++)
      assert.ok(page.indexOf(order[i])>page.indexOf(order[i-1]),order[i]+' follows '+order[i-1])
    assert.equal(count(page,'<PublicConsultationCta'),1)
    assert.equal(count(page,'<PersonalTestimonials'),1)
    assert.match(page,/id="consultation" serviceBooking/)
    assert.doesNotMatch(page,/<ServicesSmartDiscovery/)
  }
  const hero=source('components/services-conversion-hero.tsx')
  assert.match(hero,/href="#consultation" data-service-hero-cta="paid"/)
  assert.match(hero,/href="#free-insights" data-service-hero-cta="free"/)
  assert.match(hero,/time and payment are agreed separately/i)
  const directory=source('components/services-directory-page.tsx')
  assert.match(directory,/<ServicesSmartDiscovery/)
})


test('topic routes offer safe opt-in personal sessions, not score-based diagnoses or prescriptions', () => {
  const page = source('components/topic-journey-selector.tsx')
  for (const [topic, slug] of [
    ['relationships', 'systemic-constellations'],
    ['business', 'business-consulting'],
    ['stress', 'imagery-therapy'],
    ['energy', 'remote-energy-support'],
    ['effectiveness', 'imagery-therapy'],
  ]) assert.match(page, new RegExp(topic + ": '" + slug + "'"))
  assert.match(page, /data-topic-action': 'consultation'/)
  assert.match(page, /event="service_view"/)
  assert.match(page, /independent of your test scores/)
  assert.match(page, /no test results are shared/)
  assert.match(page, /journey\.id === 'energy' \? c\.remoteDetail : c\.personalDetail/)
  assert.doesNotMatch(page, /\?score=|\?result=|query=\{selected|query=\{problems/)
  for (const slug of ['systemic-constellations', 'business-consulting', 'imagery-therapy', 'remote-energy-support']) {
    assert.match(source('app/[locale]/services/' + slug + '/page.tsx'), /export default/)
  }
  const css = source('components/topic-journey-selector.module.css')
  assert.match(css, /\.paidServiceLink\{grid-column:1\/-1/)
  assert.match(css, /@media\(max-width:720px\)/)
})

test('paid services disclose established EUR tariffs, while other practitioners retain their own pricing', () => {
  const offers = source('components/services-solutions.tsx')
  assert.match(offers, /data-personal-session-price/)
  assert.match(offers, /€50 \/ 30 min · €100 \/ 60 min/)
  assert.match(offers, /€50 \/ 30 мин · €100 \/ 60 мин/)
  assert.match(offers, /\['alchemy', 'hypnotherapy', 'business'\]/)
  const finder = source('components/services-smart-discovery.tsx')
  assert.match(finder, /confirmedPrice/)
  assert.match(finder, /Price on request/)
})

test('SEO is about actual consultations and GA4 cannot turn on before its privacy gate', () => {
  const seo = source('lib/home-seo.ts')
  const spanish = source('app/es/page.tsx')
  assert.match(seo, /Personal Sessions in Toronto & Online/)
  assert.match(seo, /Личные консультации в Торонто и онлайн/)
  assert.match(seo, /languages: \{ en: "\/", ru: "\/ru", es: "\/es"/)
  assert.match(spanish, /Sesiones personales en Toronto y en línea/)
  const analytics = source('lib/public-analytics.ts')
  const ga4 = source('components/ga4-analytics.tsx')
  assert.match(analytics, /PUBLIC_ANALYTICS_AVAILABLE = false/)
  assert.match(ga4, /!PUBLIC_ANALYTICS_AVAILABLE/)
  assert.match(ga4, /!isCanonicalProductionHost\(\)/)
  assert.match(ga4, /!isPublicAnalyticsPath\(pathname\)/)
  assert.match(ga4, /if \(!hasConsent\(\)/)
})
