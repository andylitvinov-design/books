import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test("Dialog-first homepage replaces old 'public English, Russian and Spanish homes show the' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

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

test("Dialog-first homepage replaces old 'browser acceptance detects published EN/RU facades' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

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
