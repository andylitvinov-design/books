import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Coach reference layout uses compact scenic design and actual persona/session paths', () => {
  const page = read('app/[locale]/my-coach/page.jsx')
  const component = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')

  assert.ok(!page.includes('PublicSiteHeader'), 'old promotion/header must not push the catalog below the fold')
  for (const locale of ['en', 'ru', 'es']) assert.match(page, new RegExp("/" + locale + "/my-coach"))
  for (const part of ['brandHeader', 'welcome', 'hero', 'coachRail', 'quickTopics', 'controlTop', 'typePills', 'visualTopics', 'cardGrid', 'cardPortrait']) {
    assert.ok(component.includes('styles.' + part), part + ' present')
    assert.ok(css.includes('.' + part + '{'), part + ' styled')
  }
  assert.match(css, /my-coach-portraits\.avif/)
  assert.match(css, /reiki-approved-sunrise-v3\.webp/)
  assert.match(css, /@media\(max-width:540px\)/)
  assert.match(css, /@media\(max-width:355px\)/)
  assert.match(css, /overflow-x:auto/)
  assert.match(component, /data-my-coach-card=\{persona\.id\}/)
  assert.match(component, /aria-pressed=\{topic === item\.id\}/)
  assert.match(component, /aria-expanded=\{showFilters\}/)
  assert.match(component, /paceFilter !== 'any'/)
  assert.match(component, /localStorage/)
  assert.match(component, /coachSessionHref\(lang, persona\.id, normalizeCoachSettings\(persona\.id\)\)/)
  assert.match(component, /coachSessionHref\(lang, selected\.id, safeSettings\)/)
  assert.match(component, /data-my-coach-start=\{selected\.id\}/)
  assert.match(component, /href=\{'\/' \+ lang \+ '\/masters'\}/)
  assert.match(component, /data-my-coach-hero-start/)
  assert.match(component, /aria-expanded=\{expandedId === persona\.id\}/)
  assert.ok(component.indexOf('styles.hero') < component.indexOf('styles.discover'))
  assert.doesNotMatch(component, /4\.9|512 sessions|verified practitioner/)
})

test('reference portrait sprite is first-party, compact and served for fictional personas', () => {
  const photo = readFileSync(new URL('../public/images/holistic-house/my-coach-portraits.avif', import.meta.url))
  assert.ok(photo.length > 1000 && photo.length < 15000)
  assert.equal(photo.toString('ascii', 4, 12), 'ftypavif')
  const css = read('components/my-coach-catalog.module.css')
  for (const id of ['mira', 'max', 'sofia', 'alex']) {
    assert.ok(css.includes('[data-persona=' + id + ']'), id + ' portrait')
  }
})
