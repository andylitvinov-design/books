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
  assert.match(login, /\['growth', 'seo', 'acquisition', 'tools'\]\.includes\(params\?\.destination\)/)
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
