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
  assert.match(page, /languages: \{ ru: "\/ru\/about", en: "\/en\/about" \}/)
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

test('uses the shared six-item public model without exposing admin', async () => {
  const { getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'library', 'services', 'academy', 'about', 'cabinet'])
  assert.equal(getSiteNavigation('en').find(item => item.id === 'cabinet').href, '/en/client')
  assert.equal(getSiteNavigation('ru').find(item => item.id === 'cabinet').href, '/ru/client')
  assert.equal(getSiteNavigation('es').find(item => item.id === 'cabinet').href, '/es/client')
  assert.equal(getSiteNavigation('en').find(item => item.id === 'academy').href, 'https://psitrends.com/academy')
  assert.match(mobileNavigation, /getSiteNavigation/)
  assert.doesNotMatch(mobileNavigation, /href: '\/admin'/)
  assert.match(siteNavigation, /getSiteNavigation/)
  assert.doesNotMatch(siteNavigation, /href="\/admin"/)
})
