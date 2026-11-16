import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test("Dialog-first homepage replaces old 'Home uses My Space as its only top chrome and hide' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test('Home and Profile share real search/menu, compact locale switch and working public links', () => {
  const hub=read('components/app/profile-hub-tabs.jsx')
  const nav=read('components/site-navigation.tsx')
  const workspace=read('components/app/app-workspace.jsx')
  assert.match(hub, /data-profile-language-switch/)
  assert.match(hub, /className=\{styles\.languageOptions\}/)
  assert.match(hub, /if \(publicEntry\) return language === 'en' \? '\/' : '\/' \+ language/)
  assert.match(hub, /<SiteNavigation locale=\{selected\} compact \/>/)
  assert.match(nav, /compact = false/)
  assert.match(nav, /<SiteSearch locale=\{activeLocale\} pathname=\{pathname\} \/>/)
  assert.match(nav, /<details className="site-main-menu"/)
  assert.match(workspace, /target\.closest\('\[data-profile-chrome-navigation\]'\)/)
})

test('Both profile presentations keep true 16:9 without the extra blue caption rail', () => {
  const css=read('components/app/profile-hub-tabs.module.css')
  assert.match(css, /\.hub \.videoFrame\{width:100%;aspect-ratio:16\/9;/)
  assert.match(css, /:global\(\.site-video-caption\)\{display:none!important\}/)
  assert.match(css, /\.titleFull\{display:none\}\.titleCompact\{display:inline\}/)
  assert.match(css, /\[data-profile-mode-switch\]/)
})

test('Home, Profile and Work render one real My Space header row, not two', () => {
  const hub=read('components/app/profile-hub-tabs.jsx')
  const work=read('components/practice-work-profile-intro.jsx')
  const css=read('components/app/profile-hub-tabs.module.css')
  for(const source of [hub,work]) {
    assert.match(source,/className=\{styles\.headingTitle\}/)
    assert.match(source,/className=\{styles\.profileHeadingActions\}/)
    assert.match(source,/className=\{styles\.titleCompact\}>/)
    assert.match(source,/My Space/)
    assert.doesNotMatch(source,/<p className=\{styles\.eyebrow\}>/)
  }
  assert.match(css,/\.hub \.heading\{flex-wrap:nowrap;/)
  assert.match(css,/\.hub \.heading h2\{font-size:clamp\(16px,4\.5vw,20px\)/)
  assert.match(css,/:global\(\[data-site-search-trigger\]\)/)
  assert.match(css,/:global\(\.site-main-menu-trigger\)/)
});
