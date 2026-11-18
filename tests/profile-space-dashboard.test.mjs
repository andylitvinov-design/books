import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const path = source => new URL('../' + source, import.meta.url)
const read = source => readFileSync(path(source), 'utf8')

test('My Space uses one personal path and four distinct cards, not duplicate test/state navigation', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  assert.match(hub, /current === 'today' && <ProfileSpaceDashboard/)
  assert.match(hub, /current !== 'today' && <nav/)
  assert.doesNotMatch(hub, /<ProfilePresentationPlayer/)
  assert.match(dashboard, /data-profile-space-path/)
  assert.deepEqual([...dashboard.matchAll(/id: '(state|courses|reports|sessions)'/g)].map(match => match[1]),
    ['state', 'courses', 'reports', 'sessions'])
  assert.match(dashboard, /My State/)
  assert.match(dashboard, /Tests, wellbeing and dynamics/)
  assert.match(hub, /current === 'state' && <nav/)
  assert.match(hub, /Take a Test/)
  assert.match(dashboard, /data-profile-my-page/)
  assert.match(dashboard, /data-profile-settings-link/)
})

test('Profile links keep original private routes and work switch', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  for (const route of [
    "/monitoring", "/course?view=courses", "/portrait?space=reports",
    "/portrait?space=sessions", "/portrait?space=path", "/settings",
  ]) assert.ok(dashboard.includes(route), route)
  assert.match(dashboard, /selected \+ '\/practice'/)
  assert.match(workspace, /searchParams\.get\('space'\) === 'sessions'/)
  assert.match(workspace, /<SavedSessionsPanel items=\{data\.savedSessions \|\| \[\]\}/)
  assert.match(workspace, /data-profile-sessions-empty/)
})

test('Four optimized card photos load from one actual local WebP sprite', () => {
  const css = read('components/app/profile-space-dashboard.module.css')
  const file = 'public/images/holistic-house/profile-card-photos.webp'
  assert.ok(existsSync(path(file)), 'Local photo sprite must exist')
  const bytes = readFileSync(path(file))
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP')
  assert.ok(bytes.length < 8000, 'Photo set should load quickly on mobile')
  assert.match(css, /profile-card-photos\.webp/)
  for (const section of ['courses', 'reports', 'sessions'])
    assert.ok(css.includes('[data-profile-photo="' + section + '"]'))
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})

test('Seven-item shared bottom navigation stays outside Profile dashboard', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  const mobile = read('components/mobile-bottom-navigation.tsx')
  assert.doesNotMatch(dashboard, /MobileBottomNavigation|data-mobile-bottom-nav/)
  assert.match(mobile, /getCompactNavigation/)
})
