import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const url = source => new URL('../' + source, import.meta.url)
const read = source => readFileSync(url(source), 'utf8')

test('My Space cinematic skin remains scoped to the real dashboard and not the Courses page', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  const cardCss = read('components/app/profile-space-dashboard.module.css')
  const headerCss = read('components/app/profile-hub-tabs.module.css')
  const shellCss = read('app/[locale]/app/[[...path]]/workspace.css')
  const dockCss = shellCss
  const originalDockCss = read('components/unified-mobile-dock.module.css')
  assert.match(dashboard, /data-profile-space-dashboard/)
  assert.match(cardCss, /\.dashboard\[data-profile-space-dashboard\] \.scenic/)
  assert.match(cardCss, /\.dashboard\[data-profile-space-dashboard\] \.card/)
  assert.match(cardCss, /\.dashboard\[data-profile-space-dashboard\] \.account/)
  assert.match(headerCss, /\.hub\[data-profile-active="today"\] \.heading/)
  assert.match(shellCss, /main\.hh-app:has\(\[data-profile-space-dashboard\]\)/)
  assert.match(dockCss, /body:has\(\[data-profile-space-dashboard\]\) \[data-hh-unified-dock\]/)
  assert.doesNotMatch(originalDockCss, /MY_SPACE_CINEMATIC_20261121/)
  // Keep the separate teal courses dashboard untouched.
  assert.match(read('components/app/course-space-intro.jsx'), /data-profile-course-landing/)
  assert.doesNotMatch(cardCss, /\.dashboard\[data-profile-course-landing\].*#170f09/)
})

test('Cinematic skin reuses real local WebP assets, avoiding unlicensed remote photos', () => {
  const css = read('components/app/profile-space-dashboard.module.css')
  const shell = read('app/[locale]/app/[[...path]]/workspace.css')
  for (const asset of [
    'support-personal-choice-photos-hd.webp',
    'books-library.webp',
    'reiki-approved-sunrise-v3.webp',
    'support-therapy-cabinet-hd.webp',
  ]) {
    const assetPath = 'public/images/holistic-house/' + asset
    assert.ok(existsSync(url(assetPath)), assetPath)
    const raw = readFileSync(url(assetPath))
    assert.equal(raw.toString('ascii', 0, 4), 'RIFF', assetPath)
    assert.equal(raw.toString('ascii', 8, 12), 'WEBP', assetPath)
    assert.ok(statSync(url(assetPath)).size < 225000, asset + ' fits mobile image budget')
    assert.ok((css + shell).includes(asset), asset + ' is used by the page')
  }
})

test('The real six profile actions, account privacy and shared dock remain in place', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  for (const action of [
    "/my-coaching-plan", "/course?view=courses", "/portrait?space=reports",
    "/portrait?space=sessions", "/portrait?space=path", "/settings",
    "data-profile-my-page", "data-profile-space-work",
  ]) assert.ok(dashboard.includes(action), action)
  assert.match(read('components/unified-mobile-dock.tsx'), /UNIFIED_DOCK_IDS\.map/)
  assert.doesNotMatch(dashboard, /<img[^>]+src="https:|<iframe/)
})
