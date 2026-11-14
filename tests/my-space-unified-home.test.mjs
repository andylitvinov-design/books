import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('public English, Russian and Spanish homes show the same My Space video-first navigation and categories', () => {
  for (const path of ['components/holistic-house-home.tsx', 'app/es/page.tsx']) {
    const page = read(path)
    const hub = page.indexOf('<ProfileHubTabs')
    const topics = page.indexOf('<MySpaceTopics')
    const oldCarousel = page.indexOf('<HomeSectionCarousel')
    const stages = page.indexOf('<HomeFeaturedWorkspace')
    assert.ok(hub >= 0 && hub < topics && topics < oldCarousel && oldCarousel < stages,
      path + ': video and topical discovery lead into the old seven-stage content')
    assert.match(page, /publicEntry/)
    assert.match(page, /publicHome/)
  }
})

test('guest and account My Space add topics after the existing shared video and four quick actions', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const today = read('components/app/cabinet-today.jsx')
  const guest = read('components/app/cabinet-guest-overview.jsx')
  assert.match(hub, /data-profile-video-hero/)
  assert.match(hub, /data-profile-quick-actions/)
  assert.match(today, /<MySpaceTopics locale=\{locale\} signedIn/)
  assert.match(guest, /<MySpaceTopics locale=\{selectedLocale\}/)
  assert.match(hub, /preload="none"/)
})

test('browser acceptance detects published EN/RU facades and the ES scenic video without autoplay', () => {
  const browser = read('scripts/verify-home-consultation-first-screen.mjs')
  assert.match(browser, /data-profile-presentation-locale/)
  assert.match(browser, /site-video-frame/)
  assert.match(browser, /site-video-play/)
  assert.match(browser, /locator\('iframe'\)\.count\(\)/)
  assert.match(browser, /presentation language matches the selected site locale/)
})

test('all six categories, three verified free starts, seven-stage path and mobile sizes are present', () => {
  const component = read('components/my-space-topics.jsx')
  const css = read('components/my-space-topics.module.css')
  for (const id of ['money','love','energy','stress','learning','sessions']) {
    assert.match(component, new RegExp("id: '" + id + "'"))
  }
  for (const path of ['explore/business','explore/love','explore/energy','explore/stress','academy','services',
    'client/tests','services/free-situation-review']) {
    assert.ok(component.includes(path), path)
  }
  for (const locale of ['en:', 'ru:', 'es:']) assert.ok(component.includes(locale))
  assert.match(component, /profile-free-tests/)
  assert.match(component, /#home-my-space-features/)
  assert.match(css, /@media\(max-width:700px\)/)
  assert.match(css, /@media\(max-width:360px\)/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /min-height:76px/)
})
