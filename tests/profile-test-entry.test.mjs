import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Profile opens a public, test-first entry without starting account bootstrap', () => {
  const route = read('app/[locale]/app/portrait/page.jsx')
  const guest = read('components/app/profile-test-entry.jsx')
  assert.match(route, /if \(hasPrivateIntent\) return <AppWorkspaceNavigator/)
  assert.match(route, /return <ProfileTestEntry locale=\{locale\} \/>/)
  assert.ok(route.indexOf('if (hasPrivateIntent)') < route.indexOf('return <ProfileTestEntry'))
  assert.doesNotMatch(guest, /appFetch|fetch\(|bootstrap|useEffect|sessionStorage|localStorage|signIn|auth\/start/)
  assert.match(guest, /data-profile-tests-first/)
  assert.match(guest, /active="tests" publicEntry/)
})

test('guest test choices start existing rights-checked public flow; saving stays optional', () => {
  const guest = read('components/app/profile-test-entry.jsx')
  const publicTests = read('components/app/public-test-explorer.jsx')
  const legacyGuest = read('components/app/cabinet-landing.jsx')
  assert.match(guest, /\?startTests=state/)
  assert.match(guest, /\?startTests=trait/)
  assert.match(guest, /client\/tests\?catalog=full/)
  assert.match(publicTests, /guestStartable\(entries\)/)
  assert.match(publicTests, /rightsStatus === 'cleared'/)
  assert.match(legacyGuest, /if \(id === 'state'\)/)
  assert.match(legacyGuest, /if \(id === 'trait'\)/)
  assert.match(guest, /personality-profiles/)
  assert.match(guest, /portrait\?space=reports/)
  assert.match(guest, /prefetch=\{false\}/)
  assert.match(guest, /Гостевых|гостевых/)
})

test('guest tab links are public where appropriate, private reports remain explicit', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  assert.match(hub, /publicEntry = false/)
  assert.match(hub, /tests: '#profile-free-tests'/)
  assert.match(hub, /state: .*startTests=state/)
  assert.match(hub, /reports: root \+ '\/portrait\?space=reports'/)
  assert.match(hub, /prefetch=\{false\}/)
  const privateWorkspace = read('components/app/app-workspace.jsx')
  assert.match(privateWorkspace, /getCabinetBootstrap/)
  assert.match(privateWorkspace, /<ProfileResultsArchive/)
})

test('bare Profile remains guest-safe while explicit saved reports use the private account', () => {
  const route = read('app/[locale]/app/portrait/page.jsx')
  const hub = read('components/app/profile-hub-tabs.jsx')
  const link = read('components/app/instant-cabinet-link.jsx')
  const legacy = read('components/app/profile-legacy-hash-redirect.jsx')
  assert.ok(route.includes("['today', 'path', 'reports'].includes(query.space)"))
  assert.doesNotMatch(route, /Object\.keys\(query\)\.some/)
  assert.ok(hub.includes("today: root + '/portrait',"))
  assert.ok(hub.includes("today: root + '/portrait?space=today',"))
  assert.ok(link.includes("current.searchParams.get('space')"))
  assert.ok(legacy.includes("window.location.hash === '#personal-reports'"))
  assert.ok(legacy.includes("window.location.hash === '#hh-development-program'"))
  assert.doesNotMatch(legacy, /appFetch|fetch\(|bootstrap|localStorage|sessionStorage/)
})
