import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const path = source => new URL('../' + source, import.meta.url)
const read = source => readFileSync(path(source), 'utf8')

test('My Space uses one personal path and four distinct cards, not duplicate test/state navigation', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  assert.match(hub, /current === 'today' && <ProfileSpaceDashboard/)
  assert.match(hub, /!simplifiedSpace && <nav/)
  assert.doesNotMatch(hub, /<ProfilePresentationPlayer/)
  assert.match(dashboard, /data-profile-space-path/)
  assert.deepEqual([...dashboard.matchAll(/id: '(state|courses|reports|sessions)'/g)].map(match => match[1]),
    ['state', 'courses', 'reports', 'sessions'])
  assert.match(dashboard, /My Goals & Coaching Reports/)
  assert.match(dashboard, /My Psychic Health/)
  assert.match(dashboard, /Tests & therapy plan/)
  assert.match(hub, /current === 'state' && <nav/)
  assert.match(hub, /Take a Test/)
  assert.match(dashboard, /data-profile-my-page/)
  assert.match(dashboard, /data-profile-settings-link/)
  assert.match(dashboard, /id === 'reports' && Number\.isInteger\(resultCount\)/)
})

test('Profile links keep original private routes and work switch', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  for (const route of [
    "/my-coaching-plan", "/course?view=courses", "/portrait?space=reports",
    "/portrait?space=sessions", "/portrait?space=path", "/settings",
  ]) assert.ok(dashboard.includes(route), route)
  assert.match(dashboard, /selected \+ '\/practice'/)
  assert.match(workspace, /searchParams\.get\('space'\) === 'sessions'/)
  assert.match(workspace, /<ProfileSessionsDashboard locale=\{locale\}/)
  assert.match(workspace, /savedSessions=\{data\.savedSessions \|\| \[\]\}/)
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


test('the two card destinations are real private goal/report and mental-health pages with distinct data sources', () => {
  const dashboard = read('components/app/profile-space-dashboard.jsx')
  const coaching = read('components/app/my-coaching-plan.jsx')
  const coachingCSS = read('components/app/my-coaching-plan.module.css')
  const reports = read('components/app/profile-hub-tabs.jsx')
  const reportCSS = read('components/app/profile-hub-tabs.module.css')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(dashboard, /href: root \+ '\/my-coaching-plan'/)
  assert.match(dashboard, /href: root \+ '\/portrait\?space=reports'/)
  assert.match(coaching, /My Goals & Coaching Reports/)
  assert.match(coaching, /Мои цели и отчёты коучинга/)
  assert.match(coaching, /Mis metas e informes de coaching/)
  assert.match(coaching, /appFetch\('coaching-life-plan\?locale='/)
  assert.match(coaching, /appFetch\('personal-coaching-reports'/)
  assert.match(coachingCSS, /reiki-approved-sunrise-v3\.webp/)
  assert.match(reports, /heroTitle: 'My Psychic Health'/)
  assert.match(reports, /heroTitle: 'Моё психическое здоровье'/)
  assert.match(reports, /data-psychic-health-tests/)
  assert.match(reports, /data-psychic-health-therapy-plan/)
  assert.match(reports, /href="#personal-reports"/)
  assert.match(reports, /not automatically generated from test results/)
  assert.match(reportCSS, /\.healthShortcuts/)
  assert.match(workspace, /page === 'my-coaching-plan' && <MyCoachingPlan/)
  assert.match(workspace, /<ProfileDomains locale=\{locale\} mode="account"/)
});

test('Sessions shows real authorized orders before private history and existing service recommendations', () => {
 const workspace=read('components/app/app-workspace.jsx')
 const panel=read('components/app/profile-sessions-dashboard.jsx')
 const css=read('components/app/profile-sessions-dashboard.module.css')
 const route=read('app/api/app/profile-session-offers/route.js')
 const hub=read('components/app/profile-hub-tabs.jsx')
 assert.match(workspace, /<ProfileSessionsDashboard locale=\{locale\}/)
 assert.ok(panel.includes("fetch('/api/app/messages/my-orders'"))
 assert.ok(panel.includes("fetch('/api/app/profile-session-offers'"))
 assert.ok(panel.includes("credentials:'same-origin'"))
 assert.ok(panel.indexOf('data-profile-active-orders') < panel.indexOf('data-profile-recent-orders'))
 assert.ok(panel.indexOf('data-profile-recent-orders') < panel.indexOf('data-profile-sessions-recommendations'))
 assert.ok(panel.includes("root+'/sessions/'+encodeURIComponent(item.id)"))
 assert.ok(panel.includes("root+'/messages?section=orders&order='+encodeURIComponent(order.id)"))
 assert.ok(panel.includes("root+'/consultations?service='+encodeURIComponent(service.id)"))
 assert.ok(hub.includes("current === 'reports' || current === 'sessions'"))
 assert.ok(hub.includes("current === 'sessions' || isCourseLanding"))
 assert.ok(route.includes('auth.verified()'))
 assert.ok(route.includes('PRIVATE_HEADERS'))
 assert.ok(route.includes('transaction(config,actor'))
 assert.doesNotMatch(panel, /24 нояб\. 2026|57%|36%/)
 assert.match(css, /reiki-approved-sunrise-v3\.webp/)
 assert.match(css, /max-width:370px/)
})
