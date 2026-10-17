import assert from 'node:assert/strict'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const root = process.cwd()
const output = path.resolve('output/acquisition-admin-isolated')
const base = 'http://127.0.0.1:3291'
const token = 'isolated-acquisition-' + randomUUID()
const signature = createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const evidence = {
  scope: 'ISOLATED built-app acceptance; ephemeral signed admin session, app backend disabled; no production data',
  commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'),
  runId: process.env.GITHUB_RUN_ID || null,
  scriptSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
  checks: [], screenshots: [], errors: [],
}
await mkdir(output, { recursive: true })
const log = createWriteStream(path.join(output, 'next.log'))
// Deliberately do not inherit database credentials, production secrets or tokens.
const app = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3291'], {
  cwd: root,
  env: {
    PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1', HH_APP_ENABLED: 'false',
    PRESCRIPTIONS_ADMIN_TOKEN: token,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
app.stdout.pipe(log, { end: false })
app.stderr.pipe(log, { end: false })
let startupError
app.on('error', error => { startupError = error.message })
let browser
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function privateHeaders(headers) {
  assert.match(headers['cache-control'] || '', /private/)
  assert.match(headers['cache-control'] || '', /no-store/)
  assert.match(headers['x-robots-tag'] || '', /noindex/)
  assert.equal(headers['referrer-policy'], 'no-referrer')
  const connect = (headers['content-security-policy'] || '').split(';').find(value => value.trim().startsWith('connect-src'))
  assert.equal(connect?.trim(), "connect-src 'self'")
}

async function pageContext(width = 390, authorized = true) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 })
  context.setDefaultTimeout(15_000)
  const violations = []
  await context.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== base || !['GET', 'HEAD'].includes(request.method()) || url.pathname.startsWith('/api/')) {
      violations.push({ origin: url.origin, pathname: url.pathname, method: request.method() })
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  if (authorized) await context.addCookies([{ name: 'prescriptions_admin', value: signature, domain: '127.0.0.1', path: '/admin', httpOnly: true, sameSite: 'Strict', secure: false }])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  return { context, page, errors, violations }
}

async function loaded(page, locale = 'en', days = 7) {
  const response = await page.goto(`${base}/admin/acquisition?lang=${locale}&days=${days}`, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200)
  privateHeaders(response.headers())
  await page.locator('[data-acquisition-admin]').waitFor({ state: 'visible' })
  assert.equal(await page.locator('[data-acquisition-admin]').getAttribute('lang'), locale)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}: horizontal overflow`)
  assert.equal(await page.locator('main dd').count(), 8)
  assert.equal(await page.locator('main article > strong').filter({ hasText: /^0$/ }).count(), 0)
  assert.equal(await page.locator('main').getByText({ en: 'Not measured', ru: 'Не измеряется', es: 'No medido' }[locale], { exact: true }).count() >= 12, true)
}

try {
  let ready = false
  for (let attempt = 0; attempt < 120; attempt++) {
    if (startupError || app.exitCode !== null) throw new Error('ISOLATED_NEXT_EXITED')
    try { if ((await fetch(base + '/admin/login', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break } } catch { /* bounded local startup */ }
    await pause(500)
  }
  assert.ok(ready, 'ISOLATED_NEXT_START_TIMEOUT')
  browser = await chromium.launch()

  const anonymous = await pageContext(390, false)
  const denied = await anonymous.context.request.get(base + '/admin/acquisition?lang=en', { maxRedirects: 0 })
  assert.equal(denied.status(), 307)
  privateHeaders(denied.headers())
  assert.equal(new URL(denied.headers().location, base).pathname, '/admin/login')
  assert.ok(!(await denied.text()).includes('data-acquisition-admin'))
  await anonymous.context.close()
  evidence.checks.push('Unsigned request redirects before report markup; private response headers and analytics-isolated CSP verified')

  for (const locale of ['en', 'ru', 'es']) for (const width of [320, 390, 1280]) {
    const fixture = await pageContext(width)
    try {
      await loaded(fixture.page, locale)
      // An explicit screenshot label prevents these isolated images being mistaken for production.
      await fixture.page.evaluate(() => { const label = document.createElement('aside'); label.textContent = 'ISOLATED QA · backend disabled · no production data'; document.body.prepend(label) })
      const filename = `isolated-acquisition-${locale}-${width}.png`
      await fixture.page.screenshot({ path: path.join(output, filename), fullPage: true })
      evidence.screenshots.push(filename)
      assert.deepEqual(fixture.errors, [])
      assert.deepEqual(fixture.violations, [])
      evidence.checks.push(`${locale} ${width}px: real signed-admin route, responsive layout, unavailable metrics without invented zero, no API/third-party requests or runtime errors`)
    } finally { await fixture.context.close() }
  }

  const fixture = await pageContext()
  try {
    const { page } = fixture
    await loaded(page)
    const panel = page.locator('[data-acquisition-admin]')
    const campaign = panel.getByLabel('Public campaign slug', { exact: true })
    const generate = panel.getByRole('button', { name: 'Create links', exact: true })
    await campaign.fill('person@example.invalid')
    await generate.click()
    assert.equal(await panel.getByRole('alert').isVisible(), true)
    assert.equal(await page.locator('textarea[readonly]').count(), 0)
    await campaign.fill('public-resources-2026')
    await generate.click()
    const urls = async () => page.locator('textarea[readonly]').evaluateAll(nodes => nodes.map(node => node.value))
    const validate = async (source, locale) => {
      const links = await urls()
      assert.equal(links.length, 2)
      for (const href of links) {
        const url = new URL(href)
        assert.equal(url.origin, 'https://holistichouse.vercel.app')
        assert.ok(url.pathname.startsWith(`/${locale}/services/`))
        assert.deepEqual([...url.searchParams.keys()], ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'])
        assert.equal(url.searchParams.get('utm_source'), source)
        assert.equal(url.searchParams.get('utm_campaign'), 'public-resources-2026')
      }
    }
    await validate('eventbrite', 'en')
    // Wrapping select labels contain their options in label text. Match the
    // direct visible label exactly, and fail on duplicate labels or controls.
    const selectByVisibleLabel = async name => {
      const label = panel.locator('label').filter({ hasText: new RegExp('^' + name) })
      assert.equal(await label.count(), 1)
      assert.equal(await label.evaluate(node => [...node.childNodes]
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => child.textContent).join('').trim()), name)
      const control = label.locator('select')
      assert.equal(await control.count(), 1)
      return control
    }
    await (await selectByVisibleLabel('Public source')).selectOption('meetup')
    assert.equal(await page.locator('textarea[readonly]').count(), 0)
    for (const locale of ['en', 'ru', 'es']) {
      await (await selectByVisibleLabel('Landing language')).selectOption(locale)
      await generate.click()
      await validate('meetup', locale)
      await generate.click()
      await validate('meetup', locale)
    }
    await panel.getByRole('link', { name: 'Last 30 days', exact: true }).click()
    await page.waitForURL('**/admin/acquisition?lang=en&days=30')
    assert.equal(await panel.getByRole('link', { name: 'Last 30 days', exact: true }).getAttribute('aria-current'), 'page')
    await page.goBack({ waitUntil: 'networkidle' })
    await page.waitForURL('**/admin/acquisition?lang=en&days=7')
    assert.equal(new URL(page.url()).searchParams.get('days'), '7')
    await page.goForward({ waitUntil: 'networkidle' })
    await page.waitForURL('**/admin/acquisition?lang=en&days=30')
    assert.equal(new URL(page.url()).searchParams.get('days'), '30')
    await panel.getByRole('link', { name: 'RU', exact: true }).click()
    await page.waitForURL('**/admin/acquisition?lang=ru&days=30')
    assert.equal(await page.locator('main').getAttribute('lang'), 'ru')
    assert.deepEqual(fixture.errors, [])
    assert.deepEqual(fixture.violations, [])
    evidence.checks.push('Hydrated builder rejects personal email, recovers, clears stale sources, supports all landing locales and repeated generation; period Back/Forward and language navigation work without external requests')
  } finally { await fixture.context.close() }
  evidence.status = 'passed'
} catch (error) {
  evidence.status = 'failed'
  evidence.errors.push(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  if (app.exitCode === null) {
    app.kill('SIGTERM')
    await new Promise(resolve => {
      const timer = setTimeout(() => { app.kill('SIGKILL'); resolve() }, 5000)
      app.once('exit', () => { clearTimeout(timer); resolve() })
    })
  }
  await new Promise(resolve => log.end(resolve))
  await writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
}
console.log(JSON.stringify(evidence, null, 2))
