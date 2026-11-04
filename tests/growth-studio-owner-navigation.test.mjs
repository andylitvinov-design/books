// Growth Studio owner-auth integration contracts.
// All seven original navigation/cabinet checks are preserved from the two
// existing owner test files, with the current five-destination allowlist.
// This dedicated file keeps unrelated course CI out of Growth-only PRs.
// Original tests remain untouched and are still run by their native suites.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('new My Practice Marketing uses verified owner bridge instead of legacy root', () => {
  const practice = read('components/app/practice-workspace.jsx')
  const access = read('lib/app/practitioner-access.js')
  const route = read('app/api/app/[...path]/route.js')
  assert.match(practice, /isOwner&&<PracticeTile Icon=\{Megaphone\}/)
  assert.match(practice, /choosePanel\('marketing'\)/)
  assert.match(practice, /activePanel==='marketing'&&isOwner/)
  assert.match(practice, /onClick=\{\(\)=>openOwner\(destination\)\}/)
  for (const [name, path] of Object.entries({
    growth:'/admin/growth-studio',seo:'/admin/seo',acquisition:'/admin/acquisition',
    videos:'/admin/videos',youtube:'/admin/youtube-upload',
  })) {
    assert.ok(access.includes(name + ": '" + path + "'"), name)
    assert.ok(practice.includes("destination:'" + name + "'"), name)
  }
  assert.match(route, /practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(route, /issueTrustedAdminSession/)
  assert.doesNotMatch(practice, /window\.location\.assign\('\/admin\/growth-studio'\)/)
})

test('Growth Studio OAuth deep link preserves bounded destination without open redirects', () => {
  const studio = read('app/admin/growth-studio/page.js')
  const login = read('app/admin/login/page.js')
  const entry = read('components/practitioner-auto-entry.jsx')
  const route = read('app/api/app/[...path]/route.js')
  const header = read('components/prescription-admin-header.jsx')
  assert.match(studio, /requireAdminRequest\(\)/)
  assert.match(studio, /redirect\('\/admin\/login\?destination=growth'\)/)
  assert.match(studio, /compactMarketing/)
  assert.match(login, /\['growth', 'seo', 'acquisition', 'tools', 'youtubeConnect'\]\.includes\(params\?\.destination\)/)
  assert.match(login, /practitionerDestination\[destination\]/)
  assert.match(entry, /response\.redirectUrl !== ADMIN_DESTINATIONS\[safeDestination\]/)
  for (const name of ['growth','seo','acquisition']) {
    assert.ok(route.includes("'practitioner-" + name + "'"), name + ' OAuth continuation missing')
    assert.ok(route.includes('/admin/login?destination=' + name), name + ' return missing')
  }
  assert.match(header, /compactMarketing \? <nav/)
  assert.match(header, /panel=marketing/)
  assert.ok(!header.includes('href={destination}'))
})

test('SEO and campaigns return to new Marketing hub; no client data in growth', () => {
  const seo=read('app/admin/seo/page.jsx')
  const acquisition=read('app/admin/acquisition/page.jsx')
  const css=read('components/app/practice-dashboard.css')
  assert.match(seo,/panel=marketing/)
  assert.match(acquisition,/panel=marketing/)
  assert.match(css,/max-width:430px/)
  assert.match(css,/hh-practice-marketing-grid/)
  assert.doesNotMatch(read('components/app/practice-workspace.jsx'),/publishGrowthTelegramNowAction/)
})

test('legacy /admin is an authenticated compatibility redirect, not another cabinet',()=>{
  const page=read('app/admin/page.js')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/redirect\('\/admin\/login'\)/)
  assert.match(page,/uiLocaleCookie/)
  assert.match(page,/redirect\('\/'\+locale\+'\/app\/practice'\)/)
  assert.match(page,/dynamic='force-dynamic'/)
  assert.match(page,/index:false,follow:false/)
  assert.doesNotMatch(page,/PractitionerCabinet|listClients|import.*database/)
})

test('specialized admin tools stay on guarded existing routes and are grouped compactly',()=>{
  const page=read('app/admin/tools/page.js')
  const panel=read('components/practitioner-cabinet.jsx')
  const css=read('components/practitioner-cabinet.module.css')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/redirect\('\/admin\/login\?destination=tools'\)/)
  assert.match(page,/revalidate=0/)
  assert.match(page,/robots:\{index:false,follow:false\}/)
  assert.match(page,/PractitionerCabinet/)
  for(const path of [
    '/admin/clients','/admin/consultations/new','/admin/reports',
    '/admin/prescriptions/new','/admin/payments/new','/admin/manual-billing',
    '/admin/clients/legacy','/admin/materials','/admin/materials/courses/reiki-practitioner',
    '/admin/videos','/admin/youtube-upload','/admin/reiki-leads','/admin/app-requests',
    '/admin/practitioners','/admin/telegram-setup',
  ])assert.ok(panel.includes(path),path)
  assert.match(panel,/appRequestsEnabled\?\[/)
  assert.match(panel,/panel=marketing/)
  assert.match(panel,/<details/)
  assert.match(panel,/open=\{index===0\}/)
  assert.match(panel,/aria-label=\{group.title\}/)
  assert.match(css,/max-width:520px/)
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/)
  assert.match(css,/focus-visible/)
  assert.match(css,/prefers-reduced-motion/)
})

test('Google owner tool transition is allowlisted end-to-end with no open redirect',()=>{
  const access=read('lib/app/practitioner-access.js')
  const login=read('app/admin/login/page.js')
  const entry=read('components/practitioner-auto-entry.jsx')
  const route=read('app/api/app/[...path]/route.js')
  const practice=read('components/app/practice-workspace.jsx')
  assert.match(access,/tools: '\/admin\/tools'/)
  assert.match(login,/\['growth', 'seo', 'acquisition', 'tools', 'youtubeConnect'\]\.includes/)
  assert.match(login,/practitionerDestination\[destination\]/)
  assert.match(entry,/tools: '\/admin\/tools'/)
  assert.match(entry,/response\.redirectUrl !== ADMIN_DESTINATIONS\[safeDestination\]/)
  assert.match(route,/'practitioner-tools'/)
  assert.match(route,/continueTo === 'practitioner-tools'/)
  assert.match(route,/\$\{origin\}\/admin\/login\?destination=tools/)
  assert.match(route,/!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(route,/issueTrustedAdminSession/)
  assert.match(practice,/onClick=\{\(\)=>openOwner\('tools'\)\}/)
  assert.match(practice,/ownerTools && !activePanel && <details/)
  assert.doesNotMatch(practice,/window\.location\.assign\('\/admin\/tools'\)/)
})

test('navigation stays in one cabinet, and Growth Studio never links to former dashboard',()=>{
  const header=read('components/prescription-admin-header.jsx')
  const studio=read('app/admin/growth-studio/page.js')
  assert.match(header,/href=\{"\/"\+locale\+"\/app\/practice"\}/)
  assert.match(header,/href="\/admin\/tools"/)
  assert.doesNotMatch(header,/<Link href="\/admin">/)
  assert.match(header,/panel=marketing/)
  assert.match(studio,/compactMarketing/)
  assert.match(studio,/redirect\('\/admin\/login\?destination=growth'\)/)
  assert.doesNotMatch(studio,/sendMessage|publishGrowthTelegramNowAction/)
})
