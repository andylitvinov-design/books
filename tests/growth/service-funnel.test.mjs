import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const count = (sourceText, marker) => sourceText.split(marker).length - 1

const reassuranceByLocale = {
  en: 'Session times and conditions are confirmed before booking or payment.',
  ru: 'Время встречи и условия подтверждаются до записи и оплаты.',
  es: 'La hora y las condiciones se confirman antes de reservar o pagar.',
}

function assertRenderedServicesReassurance(sourceText) {
  const file = ts.createSourceFile('services-conversion-hero.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const descendants = root => {
    const result = []
    const visit = node => { result.push(node); ts.forEachChild(node, visit) }
    visit(root)
    return result
  }
  const unwrap = node => ts.isAsExpression(node) || ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node
  const all = descendants(file)
  const copy = all.filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === 'copy')
  assert.equal(copy.length, 1, 'one Services copy declaration')
  const object = unwrap(copy[0].initializer)
  assert.ok(ts.isObjectLiteralExpression(object), 'literal localized Services copy')
  for (const [locale, expected] of Object.entries(reassuranceByLocale)) {
    const entries = object.properties.filter(node => ts.isPropertyAssignment(node) && node.name.getText(file) === locale)
    assert.equal(entries.length, 1, `${locale} copy is unique`)
    const localized = unwrap(entries[0].initializer)
    assert.ok(ts.isObjectLiteralExpression(localized), `${locale} copy is literal`)
    const messages = localized.properties.filter(node => ts.isPropertyAssignment(node) && node.name.getText(file) === 'reassurance')
    assert.equal(messages.length, 1, `${locale} reassurance is unique`)
    assert.ok(ts.isStringLiteral(messages[0].initializer), `${locale} reassurance is literal`)
    assert.equal(messages[0].initializer.text, expected, `${locale} confirmation precedes booking/payment`)
  }
  const components = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ServicesConversionHero')
  assert.equal(components.length, 1, 'actual Services hero export')
  const body = descendants(components[0].body)
  const localeBindings = body.filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === 't')
  assert.equal(localeBindings.length, 1, 'one localized hero binding')
  assert.equal(localeBindings[0].initializer.getText(file), 'copy[locale]', 'hero copy follows actual locale')
  const returns = components[0].body.statements.filter(ts.isReturnStatement)
  assert.equal(returns.length, 1, 'one hero render return')
  const paragraphs = descendants(returns[0].expression).filter(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'p' && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'className' && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression?.getText(file) === 'styles.reassurance'))
  assert.equal(paragraphs.length, 1, 'one rendered reassurance paragraph')
  const values = paragraphs[0].children.filter(ts.isJsxExpression)
  assert.equal(values.length, 1, 'one rendered reassurance expression')
  assert.equal(values[0].expression?.getText(file), 't.reassurance', 'rendered reassurance uses the localized confirmation')
}

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
  assertRenderedServicesReassurance(hero)
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


test('Services reassurance contract rejects changed locale disclosures and missing render binding', () => {
  const hero = source('components/services-conversion-hero.tsx')
  const faults = [
    ...Object.entries(reassuranceByLocale).map(([locale, value]) => ({
      source: hero.replace(value, 'Book and pay immediately.'),
      reason: new RegExp(`${locale} confirmation precedes booking/payment`),
    })),
    { source: hero.replace('{t.reassurance}', '{null}'), reason: /rendered reassurance uses the localized confirmation/ },
    { source: hero.replace('const t = copy[locale]', 'const t = copy.en'), reason: /hero copy follows actual locale/ },
  ]
  for (const fault of faults) {
    assertRenderedServicesReassurance(hero)
    assert.notEqual(fault.source, hero, 'mutation applies to actual hero source')
    assert.throws(() => assertRenderedServicesReassurance(fault.source), fault.reason)
  }
})
