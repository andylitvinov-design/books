import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

function source(path) {
  return existsSync(new URL(path, import.meta.url))
    ? readFileSync(new URL(path, import.meta.url), 'utf8')
    : ''
}

const page = source('../app/[locale]/about/page.tsx')
const biography = source('../data/about-biography.ts')
const mobileNavigation = source('../components/mobile-bottom-navigation.tsx')
const siteNavigation = source('../components/site-navigation.tsx')

test('publishes paired localized About routes with complete, Ontario-safe editorial biographies', () => {
  assert.match(page, /canonical: "\/" \+ locale \+ "\/about"/)
  assert.match(page, /languages: \{ ru: "\/ru\/about", en: "\/en\/about", es: "\/es\/about", "x-default": "\/en\/about" \}/)
  assert.match(biography, /Let me introduce myself\./)
  assert.match(biography, /Raised in Ukraine but living internationally\./)
  assert.match(biography, /24 years of facilitating group and personal growth work/)
  assert.match(biography, /Dreams Alive \/ Guided Imagery Work/)
  assert.match(biography, /Body-oriented Work/)
  assert.match(biography, /Archetypal Temple Work/)
  assert.match(biography, /depth-oriented personal work/)
  assert.match(biography, /Hanscarl Leuner/)
  assert.match(biography, /Dionysus and Demeter/)
  assert.match(biography, /Osho-inspired teachings/)
  assert.match(biography, /Я хочу представиться\./)
  assert.match(biography, /Я вырос в Украине, а затем жил в разных странах мира\./)
  assert.match(biography, /Ганс Карл Лойнер|Hanscarl Leuner/)
  assert.match(biography, /Телесно-ориентированная работа/)
  assert.match(biography, /Архетипическая храмовая работа/)
  assert.match(biography, /Bodynamic Analysis/)
  assert.match(biography, /Диониса и Деметры/)
  assert.doesNotMatch(biography, /Dreams Alive Psychotherapy|Body-oriented Psychotherapy|Temple Therapy|healing (?:early )?Inner Child traumas|complex symptoms|Though my primary interest is psychotherapy|Psychotherapy & Guided Imagery|Телесно-ориентированная психотерапия|Храмовая терапия|сложными симптомами|мой главный интерес — психотерапия/)
  assert.ok(existsSync(new URL('../public/images/holistic-house/andy-about.png', import.meta.url)))
})

test('shares all public destinations with seven mobile shortcuts and no administration', async () => {
  const { getCompactNavigation, getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'energy', 'love', 'business', 'library', 'events', 'courses', 'pro', 'temple', 'cabinet'])
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.length, 10)
    assert.equal(items.find(item=>item.id==='love')?.href, `/${locale}/explore/love`)
    assert.equal(items.find((item) => item.id === 'courses').href, `/${locale}/academy`)
    assert.equal(items.find((item) => item.id === 'events').href, `/${locale}/events`)
    assert.equal(items.find((item) => item.id === 'business').href, `/${locale}/explore/business`)
    assert.equal(items.find((item) => item.id === 'temple').href, `/${locale}/holistic-support`)
    assert.equal(getCompactNavigation(locale).length, 7)
    assert.equal(items.find((item) => item.id === 'cabinet').href, `/${locale}/client`)
    assert.equal(getCompactNavigation(locale).find((item) => item.id === 'business').href, `/${locale}/explore/business`)
  }
  assert.match(mobileNavigation, /getCompactNavigation/)
  assert.match(mobileNavigation, /data-nav-item/)
  assert.match(siteNavigation, /getSiteNavigation/)
  assert.doesNotMatch(mobileNavigation, /href: '\/admin'/)
  assert.doesNotMatch(siteNavigation, /href="\/admin"/)
})

test('About reviews stay on Holistic House with genuine local posters and internal contact paths', () => {
  const enRuPage = source('../app/[locale]/about/page.tsx')
  const esPage = source('../app/es/about/page.tsx')
  const testimonials = source('../components/personal-testimonials.tsx')
  const player = source('../components/site-video-player.tsx')
  const aboutCopy = source('../data/about-biography.ts')
  const spanishCopy = source('../data/about-es.ts')
  for (const page of [enRuPage, esPage]) {
    assert.match(page, /PersonalTestimonials/)
    assert.match(page, /variant="about"/)
    assert.doesNotMatch(page, /psimaster\.net|about-review-archive|archiveCards|archiveImage|target="_blank"/)
    assert.match(page, /internalOnly/)
  }
  assert.match(testimonials, /locallyArchivedVideoPosterIds\.has\(item\.id\)/)
  assert.match(testimonials, /internalOnly=\{isAbout\}/)
  assert.match(testimonials, /id=\{isHome \? "testimonials" : isAbout \? "about-testimonials"/)
  assert.match(player, /internalOnly \? null : <a/)
  assert.match(source('../components/page-video.tsx'), /internalOnly=\{internalOnly\}/)
  assert.doesNotMatch(source('../components/psychic-alchemy-intro-video.tsx'), /app\.heygen\.com\/share|target="_blank"/)
  assert.doesNotMatch(aboutCopy, /https:\/\/(?:t\.me|designrr\.page)/)
  assert.doesNotMatch(spanishCopy, /https:\/\/t\.me/)
  for (const locale of ['en','ru','es'])
    assert.ok((locale === 'es' ? spanishCopy : aboutCopy).includes('/' + locale + '/contact'))
  for (const id of ['Dk0LBmOivQo', 'MIVLm1GUTtM', 'ttQxUHopaUM'])
    assert.ok(existsSync(new URL('../public/images/holistic-house/testimonial-posters/' + id + '.webp', import.meta.url)))
})

test('About consultation secondary action stays within Holistic House in all locales', () => {
  const regular = source('../app/[locale]/about/page.tsx')
  const spanish = source('../app/es/about/page.tsx')
  const form = source('../components/personal-consultation-form.tsx')
  const capture = source('../components/consultation-choice-capture.tsx')
  assert.match(regular, /<PersonalConsultationForm locale=\{typedLocale\} onSiteContact \/>/)
  assert.match(spanish, /<PersonalConsultationForm locale="es" onSiteContact \/>/)
  assert.match(form, /onSiteContact=\{onSiteContact\}/)
  assert.match(capture, /onSiteContact \? \(/)
  assert.match(capture, /href=\{["]"?\/["]"? \+ locale \+ "\/contact"\}/)
  assert.match(capture, /data-contact-channel="site"/)
  assert.match(capture, /onSiteContact\?: boolean/)
})
