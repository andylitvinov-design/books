import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Home uses My Space as its only top chrome and hides the sitewide promo ribbon', () => {
  const home=read('components/holistic-house-home.tsx')
  const banner=read('components/sitewide-antistress-banner.tsx')
  assert.match(home, /<ProfileHubTabs locale=\{locale\} publicEntry \/>/)
  assert.doesNotMatch(home, /<header className="house-header house-header--services">/)
  assert.match(banner, /pathname === "\/" \|\|/)
  assert.match(banner, /\(\?:ru\|en\|es\)/)
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
