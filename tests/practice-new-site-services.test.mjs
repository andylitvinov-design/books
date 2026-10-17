import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('My Practice starts with real site-wide new-service counts, then View all, then Add your service', async () => {
  const [view, styles] = await Promise.all([
    source('components/app/practice-workspace.jsx'),
    source('components/app/practice-dashboard.css'),
  ])
  const panel = view.indexOf('className="hh-practice-marketplace"')
  const viewAll = view.indexOf('className="hh-practice-marketplace-all"')
  const add = view.indexOf('className="hh-practice-top-cta"', panel)
  const requests = view.indexOf('<PracticeRequestsOverview requests={requests}', panel)
  const ownStats = view.indexOf('className="hh-practice-overview"')
  assert.ok(panel > 0 && panel < viewAll && viewAll < add && add < requests && requests < ownStats)
  assert.equal([...view.matchAll(/className="hh-practice-top-cta"/g)].length, 1)
  assert.match(view, /<\/section>\}\s*<PracticeRequestsOverview requests=\{requests\}/)
  assert.match(view, /const newServices=data\.newServices/)
  for (const stat of ['submitted7d', 'pendingNow', 'published7d', 'availableNow']) {
    assert.match(view, new RegExp('newServices\\.' + stat))
  }
  assert.match(view, /Новые услуги на сайте/)
  assert.match(view, /View all services/)
  assert.match(view, /Add your service/)
  assert.match(view, /disabled=\{!serviceQuota\.canAdd\}/)
  assert.match(view, /onClick=\{addService\}/)
  assert.match(styles, /\.hh-practice-marketplace-statistics/)
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})

test('Marketplace stats are read after authentication; only public-approved service names are returned', async () => {
  const [api, repo] = await Promise.all([
    source('app/api/app/[...path]/route.js'),
    source('lib/practitioners/repository.js'),
  ])
  const verified = api.indexOf('const actor = await auth.verified()')
  const practice = api.indexOf("joined === 'practice' && method === 'GET'")
  assert.ok(verified >= 0 && practice > verified)
  assert.match(api, /newServices = await practiceRepo\.getMarketplaceNewServices\(\)/)
  assert.match(api, /return json\(\{ \.\.\.workspace, newServices \}\)/)
  const start = repo.indexOf('async getMarketplaceNewServices()')
  const end = repo.indexOf('async listPublicServices(', start)
  const sourceOfStats = repo.slice(start, end)
  assert.ok(start > 0 && end > start)
  assert.match(sourceOfStats, /s\.submitted_at >= now\(\)-interval '7 days'/)
  assert.match(sourceOfStats, /s\.status='submitted'/)
  assert.match(sourceOfStats, /s\.status='published'/)
  assert.match(sourceOfStats, /serviceStatusSql\('s'\)/)
  assert.match(sourceOfStats, /publicStatusSql\('p'\)/)
  assert.match(sourceOfStats, /\{server:true\}/)
  assert.doesNotMatch(sourceOfStats, /draft_copy|draft_profile|contact_ciphertext/)
})

test('View all services opens the real catalogue rather than the collapsed details panel', async () => {
  const [view, page] = await Promise.all([
    source('components/app/practice-workspace.jsx'),
    source('app/[locale]/services/page.tsx'),
  ])
  assert.match(view, /services\?catalog=1#service-listings/)
  assert.match(page, /const catalogRequested = \(await searchParams\)\?\.catalog === '1'/)
  assert.match(page, /id="available-services" open=\{catalogRequested\}/)
  assert.match(page, /id="service-listings"/)
})
