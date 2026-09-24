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

test('publishes paired localized About routes with complete editorial biographies', () => {
  assert.match(page, /canonical: "\/" \+ locale \+ "\/about"/)
  assert.match(page, /languages: \{ ru: "\/ru\/about", en: "\/en\/about" \}/)
  assert.match(biography, /Let me introduce myself\./)
  assert.match(biography, /I’m Andy, a Jungian-oriented specialist and facilitator of archetypal practices\./)
  assert.match(biography, /Tantra Reiki School/)
  assert.match(biography, /Hanscarl Leuner/)
  assert.match(biography, /Dionysus, Demeter/)
  assert.match(biography, /Я хочу представиться\./)
  assert.match(biography, /Ганс Карл Лойнер|Hanscarl Leuner/)
  assert.match(biography, /Телесно-ориентированная психотерапия/)
  assert.match(biography, /Bodynamic Analysis/)
  assert.match(biography, /Диониса, Деметры/)
  assert.ok(existsSync(new URL('../public/images/holistic-house/andy-about.png', import.meta.url)))
})

test('keeps five public mobile destinations and removes public Cabinet administration links', () => {
  assert.match(mobileNavigation, /label: 'About', href: '\/en\/about', icon: UserRound/)
  assert.match(mobileNavigation, /label: 'Обо мне', href: '\/ru\/about', icon: UserRound/)
  assert.doesNotMatch(mobileNavigation, /href: '\/admin'/)
  assert.match(siteNavigation, /href=\{\"\/\" \+ activeLocale \+ "\/about"\}/)
  assert.doesNotMatch(siteNavigation, /href="\/admin"/)
})
