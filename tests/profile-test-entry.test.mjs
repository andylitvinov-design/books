import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Profile restores My Space Today as the first screen', () => {
  const route = read('app/[locale]/app/portrait/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const hub = read('components/app/profile-hub-tabs.jsx')
  const today = read('components/app/cabinet-today.jsx')

  assert.match(route, /return <AppWorkspaceNavigator locale=\{locale\} path=\{\['portrait'\]\} \/>/)
  assert.doesNotMatch(route, /ProfileTestEntry|hasPrivateIntent/)
  assert.match(route, /My Space/)
  assert.match(route, /Моё пространство/)
  assert.match(hub, /export function ProfileHubTabs/)
  for (const tab of ['today', 'tests', 'state', 'path', 'courses', 'reports'])
    assert.match(hub, new RegExp("id: '" + tab + "'"))
  assert.match(hub, /data-profile-video-hero/)
  assert.match(hub, /data-profile-quick-actions/)
  assert.match(workspace, /<ProfileHubTabs locale=\{locale\} active="today" \/>/)
  assert.match(workspace, /<CabinetToday locale=\{locale\}/)
  assert.match(today, /data-cabinet-today/)
  assert.match(today, /What shall we do today\?/)
  assert.match(today, /Create course/)
})

test('signed-out Profile keeps the original dashboard and public free-test entry', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const guest = read('components/app/cabinet-guest-overview.jsx')
  assert.match(workspace, /CabinetGuestOverview/)
  assert.match(workspace, /<ProfileHubTabs locale=\{locale\} active="today" \/>/)
  assert.match(guest, /client\/tests/)
  assert.match(guest, /Explore free tests|Посмотреть бесплатные тесты/)
})

test('public guest tests remain available without forcing result storage', () => {
  const publicTests = read('components/app/public-test-explorer.jsx')
  const legacyGuest = read('components/app/cabinet-landing.jsx')
  const entry = read('components/app/profile-test-entry.jsx')
  assert.match(publicTests, /guestStartable\(entries\)/)
  assert.match(publicTests, /rightsStatus === 'cleared'/)
  assert.match(legacyGuest, /if \(id === 'state'\)/)
  assert.match(legacyGuest, /if \(id === 'trait'\)/)
  assert.match(entry, /Гостевых|гостевых/)
  assert.match(entry, /portrait\?space=reports/)
})

test('Profile tabs preserve real account destinations and explicit private reports', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const route = read('app/[locale]/app/portrait/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const link = read('components/app/instant-cabinet-link.jsx')
  const legacy = read('components/app/profile-legacy-hash-redirect.jsx')
  assert.match(hub, /publicEntry = false/)
  assert.match(hub, /today: root \+ '\/portrait\?space=today'/)
  assert.match(hub, /reports: root \+ '\/portrait\?space=reports'/)
  assert.match(route, /AppWorkspaceNavigator/)
  assert.match(workspace, /getCabinetBootstrap/)
  assert.match(workspace, /<ProfileResultsArchive/)
  assert.match(link, /current\.searchParams\.get\('space'\)/)
  assert.ok(legacy.includes("window.location.hash === '#personal-reports'"))
  assert.ok(legacy.includes("window.location.hash === '#hh-development-program'"))
})
