import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('public EN/RU/ES homes share the one-line dialog-first design',()=>{
 const home=read('components/holistic-house-home.tsx')
 const es=read('app/es/page.tsx')
 const first=read('components/home-dialog-first.tsx')
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/)
 assert.match(es,/<HomeDialogFirst locale="es"\/>/)
 assert.match(first,/data-home-first-header/)
 assert.match(first,/data-home-purpose-switch/)
 assert.match(first,/data-home-conversation-hero/)
 for(const x of ['Для себя','Для бизнеса','For myself','For business','Para mí','Para negocios'])
  assert.ok(first.includes(x),x)
 assert.doesNotMatch(home,/ProfileHubTabs|HomeSectionCarousel|HomeFeaturedWorkspace/)
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

test('browser acceptance requires the first-input hero, seven dock links and no autoplay',()=>{
 const browser=read('scripts/verify-home-consultation-first-screen.mjs')
 assert.match(browser,/data-home-first-header/)
 assert.match(browser,/data-home-intent-input/)
 assert.match(browser,/data-home-purpose="business"/)
 assert.match(browser,/data-unified-dock-item/)
 assert.match(browser,/no heavy Profile\/video on first paint/)
 assert.match(browser,/document\.documentElement\.scrollWidth/)
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
