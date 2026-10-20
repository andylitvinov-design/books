import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { transpileModule, JsxEmit, ModuleKind, ScriptTarget } from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  ACQUISITION_SOURCES, acquisitionDateRange, summarizeAcquisitionCounters, loadAcquisitionReport,
  campaignLandingLinks, acquisitionRecommendation, UNMEASURED_STAGES,
} from '../lib/acquisition/report.js'
import { readOrganicEventReferral } from '../lib/organic-event-referrals.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const require = createRequire(import.meta.url)
const moduleUrl = name => pathToFileURL(require.resolve(name)).href
const sourceUrl = path => new URL('../' + path, import.meta.url).href
function compiledModule(source) {
  const output = transpileModule(source, { compilerOptions: { jsx: JsxEmit.ReactJSX, module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText
    .replace(/from ["']react\/jsx-runtime["']/g, `from ${JSON.stringify(moduleUrl('react/jsx-runtime'))}`)
    .replace(/from ["']react["']/g, `from ${JSON.stringify(moduleUrl('react'))}`)
  return 'data:text/javascript;base64,' + Buffer.from(output).toString('base64')
}
const now = new Date('2026-10-17T12:00:00Z')
const row = (day = '2026-10-16', overrides = {}) => ({ day, impressions: '10', orderClicks: '3', whatsappClicks: '1', telegramClicks: '0', ...overrides })
const load = overrides => loadAcquisitionReport({ authorize: async () => true, readDaily: async () => [row()], now, ...overrides })

test('Toronto ranges use completed local dates, not UTC day or DST hours', () => {
  for (const [instant, period, start, end] of [
    ['2026-10-17T03:59:59Z', 1, '2026-10-15', '2026-10-15'],
    ['2026-10-17T04:00:00Z', 7, '2026-10-10', '2026-10-16'],
    ['2026-03-09T04:00:00Z', 7, '2026-03-02', '2026-03-08'],
    ['2026-11-02T05:00:00Z', 7, '2026-10-26', '2026-11-01'],
    ['2026-01-01T05:00:00Z', 30, '2025-12-02', '2025-12-31'],
  ]) assert.deepEqual(acquisitionDateRange(period, new Date(instant)), { days: period, start, end, timeZone: 'America/Toronto' })
  for (const invalid of [0, -1, 90, '7;select', ['7', '30'], null]) assert.equal(acquisitionDateRange(invalid, now).days, 7)
  assert.throws(() => acquisitionDateRange(7, new Date('invalid')), /INVALID_REPORT_DATE/)
})

test('aggregates add recorded clicks without converting them into inquiries, revenue or unique people', async () => {
  const result = await load({ readDaily: async () => [row(), row('2026-10-15', { impressions: 4, orderClicks: 0, whatsappClicks: 0, telegramClicks: 2 })] })
  assert.deepEqual(result.counters.totals, { impressions: 14, orderClicks: 3, whatsappClicks: 1, telegramClicks: 2 })
  assert.equal(result.counters.observedDays, 2)
  assert.equal(result.counters.firstObservedDay, '2026-10-15')
  assert.deepEqual(result.attribution, { status: 'not_measured', source: null, campaign: null, language: null })
  for (const key of UNMEASURED_STAGES) assert.deepEqual(result.stages[key], { status: 'not_measured', value: null })
  assert.equal(acquisitionRecommendation(result), 'confirm_receipts')
})

test('observed zero is distinct from no records, denied access, missing table or offline', async () => {
  const zero = await load({ readDaily: async () => [row('2026-10-16', { impressions: 0, orderClicks: 0, whatsappClicks: 0, telegramClicks: 0 })] })
  assert.equal(zero.counters.status, 'observed')
  assert.equal(zero.counters.totals.impressions, 0)
  assert.equal(acquisitionRecommendation(zero), 'no_activity')
  const empty = await load({ readDaily: async () => [] })
  assert.equal(empty.counters.status, 'no_observations')
  assert.equal(empty.counters.totals, null)
  for (const reason of ['42P01 missing table', '42501 permission denied', 'ECONNREFUSED', 'secret connection URL']) {
    const failed = await load({ readDaily: async () => { throw Error(reason) } })
    assert.deepEqual(failed.counters, { status: 'unavailable', totals: null, observedDays: null })
    assert.ok(!JSON.stringify(failed).includes(reason))
  }
})

test('non-admin authorization fails before any data or configuration access', async () => {
  let calls = 0
  const result = await load({ authorize: async () => false, readDaily: async () => { calls++; throw Error('MUST_NOT_READ') } })
  assert.deepEqual(result, { status: 'forbidden' })
  assert.equal(calls, 0)
  const page = read('app/admin/acquisition/page.jsx')
  assert.ok(page.indexOf("if (!await requireAdminRequest()) redirect('/admin/login')") < page.indexOf('await readAcquisitionReport('))
  assert.match(page, /dynamic = 'force-dynamic'/)
  assert.match(page, /revalidate = 0/)
  assert.match(page, /robots: \{ index: false, follow: false \}/)
  assert.match(page, /referrer: 'no-referrer'/)
  const reader = read('lib/acquisition/read-report.js')
  assert.match(reader, /import 'server-only'/)
  assert.match(reader, /authorize: requireAdminRequest/)
})

test('report SQL selects only bounded aggregate counters using existing RLS transaction', () => {
  const source = read('lib/acquisition/read-report.js')
  const sql = source.match(/db\.query\(`([\s\S]*?)`/)[1]
  assert.match(sql, /from app_private\.service_funnel_daily/)
  assert.match(sql, /where day >= \$1::date and day <= \$2::date/)
  assert.match(sql, /group by day/)
  assert.doesNotMatch(sql, /\b(join|insert|update|delete|alter|create|grant|select \*)\b/i)
  assert.doesNotMatch(sql, /client|account|request|contact|payment|result|ciphertext|source|campaign|language/i)
  assert.match(source, /\[range.start, range.end\]/)
  assert.match(source, /transaction\(getAppConfig\(\), null/)
})

test('malformed, duplicated or identity-bearing aggregates fail closed without partial totals', async () => {
  const range = acquisitionDateRange(7, now)
  for (const rows of [null, [row(), row()], [row('2026-10-17')], [row('2026-09-01')], [row('2026-10-16', { email: 'private@example.invalid' })],
    ...[-1, NaN, Infinity, 1.2, '1.2', '', null, true, Number.MAX_SAFE_INTEGER + 1].map(impressions => [row('2026-10-16', { impressions })])]) {
    assert.throws(() => summarizeAcquisitionCounters(rows, range), /INVALID_AGGREGATE/)
    const result = await load({ readDaily: async () => rows })
    assert.equal(result.counters.totals, null)
  }
})

test('recommendations depend on actual observations and never invent a conversion rate', async () => {
  for (const [overrides, expected] of [
    [{ whatsappClicks: 0, telegramClicks: 0 }, 'check_handoff'],
    [{ orderClicks: 0, whatsappClicks: 0, telegramClicks: 0 }, 'review_cta'],
  ]) assert.equal(acquisitionRecommendation(await load({ readDaily: async () => [row('2026-10-16', overrides)] })), expected)
  assert.equal(acquisitionRecommendation(await load({ readDaily: async () => [] })), 'measurement_unavailable')
})

test('campaign URLs reuse the public allowlist for every source and EN/RU/ES destination', () => {
  for (const [source] of ACQUISITION_SOURCES) for (const locale of ['en', 'ru', 'es']) {
    const links = campaignLandingLinks({ source, locale, campaign: 'resources-workshop-2026' })
    assert.equal(links.length, 2)
    for (const link of links) {
      const url = new URL(link)
      assert.equal(url.origin, 'https://holistichouse.vercel.app')
      assert.ok(url.pathname.startsWith(`/${locale}/services/`))
      assert.deepEqual([...url.searchParams.keys()], ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'])
      assert.equal(readOrganicEventReferral(url.search, url.pathname).source, source)
      assert.equal(url.searchParams.get('utm_campaign'), 'resources-workshop-2026')
    }
  }
})

test('campaign builder rejects arbitrary URLs, contact details, secrets and unsupported locale/source', () => {
  for (const campaign of ['', 'ab', 'John Smith', 'a@example.com', 'person-14165550123', 'client-abc', 'token-abcdef', 'symptom-anxiety', 'x&email=abc', 'https://evil.test', '../private', '<script>', 'x'.repeat(65)]) {
    assert.throws(() => campaignLandingLinks({ source: 'eventbrite', campaign }), /INVALID_PUBLIC_CAMPAIGN/)
  }
  for (const options of [{ source: 'evil', campaign: 'public-workshop' }, { source: 'eventbrite', campaign: 'public-workshop', locale: '../../admin' }]) assert.throws(() => campaignLandingLinks(options))
  const client = read('components/admin-acquisition-links.jsx')
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|document.cookie|navigator.sendBeacon|<form/)
  assert.match(client, /type="button"/)
  assert.match(client, /resetOutput/)
})

test('admin report remains discoverable, responsive and isolated from public/private analytics', () => {
  assert.match(read('components/practitioner-cabinet.jsx'), /href:'\/admin\/acquisition'/)
  assert.match(read('lib/public-analytics.ts'), /PUBLIC_ANALYTICS_AVAILABLE\s*=\s*false/)
  const page = read('app/admin/acquisition/page.jsx')
  for (const label of ['Not measured', 'Не измеряется', 'No medido', 'America/Toronto']) assert.ok((page + read('lib/acquisition/report.js')).includes(label))
  assert.doesNotMatch(page, /ga4|gtag\(|sendBeacon|dangerouslySetInnerHTML|process.env/)
  const css = read('app/admin/acquisition/acquisition.module.css')
  assert.match(css, /@media\(max-width:380px\)/)
  assert.match(css, /minmax\(0,1fr\)/)
  assert.match(css, /focus-visible/)
})

test('actual middleware gives the new private route no-store, noindex and isolated CSP', async () => {
  const source = read('middleware.ts')
    .replace("from 'next/server'", `from ${JSON.stringify(moduleUrl('next/server.js'))}`)
    .replace("from './lib/canonical-redirect'", `from ${JSON.stringify(sourceUrl('lib/canonical-redirect.js'))}`)
  const { middleware } = await import(compiledModule(source))
  const { NextRequest } = await import('next/server.js')
  for (const query of ['', '?lang=ru&days=30', '?lang=es&days=1']) {
    const response = middleware(new NextRequest('https://holistichouse.vercel.app/admin/acquisition' + query))
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0, must-revalidate')
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive')
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY')
    const connect = response.headers.get('Content-Security-Policy').split(';').find(value => value.trim().startsWith('connect-src'))
    assert.equal(connect.trim(), "connect-src 'self'")
  }
})

async function renderedPage({ authorized = true, report, params = {} } = {}) {
  const reportModule = JSON.stringify(sourceUrl('lib/acquisition/report.js'))
  const client = read('components/admin-acquisition-links.jsx')
    .replace(/from ['"]@\/lib\/acquisition\/report.js['"]/, `from ${reportModule}`)
    .replace(/import styles from [^\n]+/, 'const styles = new Proxy({}, {get:(_, key)=>key})')
  const clientUrl = JSON.stringify(compiledModule(client))
  const page = read('app/admin/acquisition/page.jsx')
    .replace("import Link from 'next/link'", `import React from ${JSON.stringify(moduleUrl('react'))}; const Link=({children,prefetch,...props})=>React.createElement('a',props,children)`)
    .replace("import { cookies } from 'next/headers'", "const cookies=async()=>({get:()=>({value:'en'})})")
    .replace("import { redirect } from 'next/navigation'", "const redirect=target=>{throw Error('REDIRECT:'+target)}")
    .replace("import { requireAdminRequest } from '@/lib/prescriptions/admin'", `const requireAdminRequest=async()=>${authorized}`)
    .replace("import { uiLocaleCookie } from '@/lib/ui-locale'", "const uiLocaleCookie='fixture-language'")
    .replace("import { readAcquisitionReport } from '@/lib/acquisition/read-report.js'", `const readAcquisitionReport=async()=>(${JSON.stringify(report)})`)
    .replace(/from ['"]@\/lib\/acquisition\/report.js['"]/, `from ${reportModule}`)
    .replace("from '@/components/admin-acquisition-links'", `from ${clientUrl}`)
    .replace(/import styles from [^\n]+/, 'const styles = new Proxy({}, {get:(_, key)=>key})')
  const { default: Page } = await import(compiledModule(page))
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }))
}

test('actual JSX server-rendering supports all locales and denies unsigned output', async () => {
  const report = await load()
  for (const [lang, missing, title] of [['en', 'Not measured', 'Campaigns &amp; enquiries'], ['ru', 'Не измеряется', 'Кампании и обращения'], ['es', 'No medido', 'Campañas y consultas']]) {
    const html = await renderedPage({ report, params: { lang } })
    assert.ok(html.includes(`lang="${lang}"`))
    assert.ok(html.includes(title))
    assert.ok(html.includes(`<strong>10</strong>`))
    assert.equal((html.match(new RegExp(`<dd>${missing}</dd>`, 'g')) || []).length, 8)
    assert.ok(html.includes('America/Toronto'))
    assert.ok(html.includes('type="button"'))
    assert.ok(!html.includes('utm_campaign='), 'No campaign is generated or published on render')
  }
  await assert.rejects(() => renderedPage({ authorized: false, report: { shouldNeverReachHtml: 'private' } }), /REDIRECT:\/admin\/login/)
  const safe = await renderedPage({ report, params: { lang: '<script>private</script>' } })
  assert.ok(safe.includes('lang="en"'))
  assert.ok(!safe.includes('private</script>'))
})

test('actual JSX cannot replace unavailable or empty measurements with zero', async () => {
  for (const readDaily of [async () => [], async () => { throw Error('PRIVATE_RAW_CONNECTION_ERROR') }]) {
    const report = await load({ readDaily })
    const html = await renderedPage({ report })
    assert.equal((html.match(/<strong>Not measured<\/strong>/g) || []).length, 4)
    assert.ok(!html.includes('PRIVATE_RAW_CONNECTION_ERROR'))
    assert.ok(!html.includes('<strong>0</strong>'))
  }
})
