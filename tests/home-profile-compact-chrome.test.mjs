import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('The new public Home is only a one-line My Space conversation entry, without a second masthead', () => {
  const home=read('components/holistic-house-home.tsx')
  const dialog=read('components/home-dialog-first.tsx')
  const banner=read('components/sitewide-antistress-banner.tsx')
  assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/)
  assert.doesNotMatch(home,/ProfileHubTabs|HomeSectionCarousel|HomeFeaturedWorkspace|HomeMoreDisclosure/)
  assert.match(dialog,/<h1 className=\{css.title\}>My Space<\/h1>/)
  assert.match(dialog,/data-home-purpose="self"/)
  assert.match(dialog,/data-home-purpose="business"/)
  assert.match(dialog,/<SiteSearch locale=\{locale\} pathname=\{target\}\/>/)
  assert.match(dialog,/data-home-menu/)
  assert.match(banner,/pathname === "\/" \|\|/)
  assert.match(banner,/\(\?:ru\|en\|es\)/)
  assert.doesNotMatch(home,/house-header--services|SiteNavigation/)
})

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
