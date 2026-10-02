// Write-capable acceptance harness: loopback + isolated CI Redis DB 15 ONLY.
// There is deliberately no --live flag, production URL, seed route or real credential.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { createServer } from 'node:https'
import { request as httpRequest } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, webkit, expect } from '@playwright/test'
import { createPrescriptionStore } from '../lib/prescriptions/store.js'
import { createClient } from '../lib/clients/service.js'
import { getOwnerCabinetLink, rotateCabinetAccess, revokeCabinetAccess } from '../lib/clients/access.js'
import { createAssessment, updateAssessment, transitionAssessment } from '../lib/clients/assessments.js'
import { getSiteNavigation } from '../lib/site-navigation-model.js'
assert.equal(process.env.CI, 'true', 'Only isolated CI execution is supported')
assert.equal(process.argv.length, 2, 'No runtime URL or live mode is accepted')
const exec = promisify(execFile)
const origin = 'https://127.0.0.1:3444', apiOrigin = 'https://127.0.0.1:4443'
const evidence = '/tmp/ia222-evidence'
mkdirSync(evidence, { recursive: true })
const token = randomBytes(32).toString('base64url'), key = randomBytes(32).toString('base64')
const redactions = [token, key]
const environment = { NODE_ENV: 'production', VERCEL_ENV: 'preview', PRESCRIPTIONS_KV_REST_API_URL: apiOrigin, PRESCRIPTIONS_KV_REST_API_TOKEN: token, PRESCRIPTIONS_DATA_ENCRYPTION_KEY: key, PRESCRIPTIONS_ADMIN_TOKEN: token, PRESCRIPTIONS_ADMIN_PIN: '' }
const certificate = { key: readFileSync('/tmp/ia222-key.pem'), cert: readFileSync('/tmp/ia222-cert.pem') }
const results = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let bridge, proxy, app, browser, secondBrowser, logs = ''
const pass = message => { results.push({ status: 'PASS', message }); console.log(`PASS: ${message}`) }
const sanitize = text => redactions.reduce((value, secret) => value.replaceAll(secret, '[redacted]'), String(text))
async function redis(command) {
  const { stdout } = await exec('redis-cli', ['-h', '127.0.0.1', '-p', '6379', '-n', '15', '--json', ...command.map(String)], { maxBuffer: 8 * 1024 * 1024 })
  return JSON.parse(stdout)
}
async function startApp() {
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3203', '-H', '127.0.0.1'], { env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] })
  app.stdout.on('data', chunk => { logs += chunk }); app.stderr.on('data', chunk => { logs += chunk })
  for (let i = 0; ; i++) {
    try { if ((await fetch('http://127.0.0.1:3203/en/library')).ok) return } catch { /* starting */ }
    assert.ok(i < 90 && app.exitCode === null, 'Local app failed to start')
    await pause(1000)
  }
}
async function stopApp() { if (app && app.exitCode === null) { const stopped = once(app, 'exit'); app.kill('SIGTERM'); await stopped } }
async function go(page, path) {
  const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  return response
}
try {
  await redis(['FLUSHDB']) // Dedicated ephemeral service database, not a configured production store.
  bridge = createServer(certificate, async (request, response) => {
    try {
      assert.equal(request.method, 'POST'); assert.equal(request.headers.authorization, `Bearer ${token}`)
      let raw = ''
      for await (const part of request) { raw += part; assert.ok(raw.length <= 2 * 1024 * 1024) }
      const command = JSON.parse(raw)
      assert.ok(Array.isArray(command) && ['GET', 'SET', 'MGET', 'MSET', 'SMEMBERS', 'SADD', 'EVAL', 'SCAN', 'INCR', 'EXPIRE', 'DEL', 'HGET', 'HGETALL'].includes(command[0]))
      const result = await redis(command)
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ result }))
    } catch { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Isolated adapter failure' })) }
  })
  bridge.listen(4443, '127.0.0.1'); await once(bridge, 'listening')
  proxy = createServer(certificate, (incoming, outgoing) => {
    const upstream = httpRequest({ hostname: '127.0.0.1', port: 3203, path: incoming.url, method: incoming.method, headers: { ...incoming.headers, 'x-forwarded-proto': 'https' } }, response => { outgoing.writeHead(response.statusCode || 502, response.headers); response.pipe(outgoing) })
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end() })
    incoming.pipe(upstream)
  })
  proxy.listen(3444, '127.0.0.1'); await once(proxy, 'listening')
  const store = createPrescriptionStore({ environment })
  assert.equal(store.assessmentStorage, 'encrypted-kv')
  const a = createClient({ fullName: 'Synthetic Client A', preferredLocale: 'en' }), b = createClient({ fullName: 'Synthetic Client B', preferredLocale: 'ru' })
  await store.saveClient(a); await store.saveClient(b)
  const links = { a: await getOwnerCabinetLink(store, a.id, environment), b: await getOwnerCabinetLink(store, b.id, environment) }
  redactions.push(links.a.secret, links.b.secret)
  const supplied = { kind: 'research_result', title: 'Synthetic durable probe', occurredOn: '2026-10-02', language: 'en', originalResult: 'PRIVATE-SYNTHETIC-RESULT-222', practitionerComment: 'Explicit fixture comment', relatedDocumentIds: [] }
  const requestId = randomUUID()
  const pair = await Promise.all([createAssessment(store, a.id, supplied, requestId), createAssessment(store, a.id, supplied, requestId)])
  assert.equal(pair[0].id, pair[1].id)
  await assert.rejects(createAssessment(store, a.id, { ...supplied, title: 'Conflict' }, requestId), error => error.code === 'CONFLICT')
  const fresh = createPrescriptionStore({ environment })
  assert.equal((await fresh.listClientAssessments(a.id)).length, 1)
  assert.equal((await fresh.findClientAssessment(pair[0].id)).originalResult, supplied.originalResult)
  const ciphertext = await redis(['GET', `client:assessment:${pair[0].id}`])
  assert.ok(ciphertext.includes('AES-256-GCM')); assert.ok(!ciphertext.includes(supplied.originalResult))
  const concurrent = await Promise.allSettled([updateAssessment(store, a.id, pair[0].id, 1, supplied), updateAssessment(fresh, a.id, pair[0].id, 1, supplied)])
  assert.equal(concurrent.filter(x => x.status === 'fulfilled').length, 1)
  await transitionAssessment(store, a.id, pair[0].id, 2, 'archive')
  pass('Real isolated Redis: encrypted REST adapter, fresh-adapter readback, atomic retry and compare-and-swap')
  await startApp()
  browser = await chromium.launch()
  const common = { ignoreHTTPSErrors: true, serviceWorkers: 'block' }
  const publicContext = await browser.newContext(common), page = await publicContext.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  assert.equal((await go(page, '/')).status(), 200)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  for (const locale of ['en', 'ru', 'es']) {
    for (const width of [320, 360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal((await go(page, `/${locale}/library`)).status(), 200)
      const expected = getSiteNavigation(locale)
      for (const selector of ['.site-navigation', '.mobile-bottom-navigation']) {
        const nav = page.locator(selector)
        assert.deepEqual(await nav.locator('[data-nav-item]').evaluateAll(elements => elements.map(el => ({ id: el.getAttribute('data-nav-item'), href: el.getAttribute('href') }))), expected.map(x => ({ id: x.id, href: x.href })))
        await expect(nav.locator('[data-nav-item="library"]')).toHaveAttribute('aria-current', 'page')
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Overflow: ${locale}/${width}`)
      const bottom = page.locator('.mobile-bottom-navigation')
      if (await bottom.isVisible()) {
        for (const link of await bottom.locator('[data-nav-item]').all()) {
          const box = await link.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44)
        }
        const last = page.locator('.library-note'); await last.scrollIntoViewIfNeeded()
        const box = await last.boundingBox(), bar = await bottom.boundingBox()
        assert.ok(box.y + box.height <= bar.y + 2, 'Bottom navigation overlaps final content')
      }
      await page.screenshot({ path: `${evidence}/library-${locale}-${width}.png`, fullPage: true })
    }
  }
  pass('Both six-item menus, Library EN/RU/ES, active states, 320–1280px, tap targets and bottom spacing')
  for (const path of ['/en/books', '/ru/books', '/es/books', '/en/homeopathy', '/ru/homeopathy', '/es/homeopathy', '/en/services', '/ru/services', '/es/services', '/en/about', '/ru/about', '/es/about']) assert.equal((await go(page, path)).status(), 200, path)
  const sitemap = await (await fetch(origin + '/sitemap.xml')).text()
  for (const locale of ['en', 'ru', 'es']) assert.ok(sitemap.includes(`/${locale}/library`))
  assert.ok(!/\/client(?:\/|<)/.test(sitemap))
  for (const path of ['/en/client', '/ru/client', '/es/client']) {
    const res = await publicContext.request.get(origin + path)
    assert.match(res.headers()['cache-control'], /no-store/)
    assert.match(res.headers()['x-robots-tag'], /noindex/)
    assert.equal(res.headers()['referrer-policy'], 'no-referrer')
  }
  pass('Old public routes remain available; localized Library sitemap and exact entry privacy headers')
  const owner = await browser.newContext(common)
  await owner.addCookies([{ name: 'prescriptions_admin', value: createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url'), domain: '127.0.0.1', path: '/admin', secure: true, httpOnly: true, sameSite: 'Strict' }])
  const admin = await owner.newPage()
  const ca = await browser.newContext(common), cb = await browser.newContext(common)
  const pa = await ca.newPage(), pb = await cb.newPage()
  await go(pa, `/en/client/${links.a.selector}#${links.a.secret}`)
  await expect(pa.getByRole('heading', { name: 'Synthetic Client A', exact: true })).toBeVisible()
  await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  await go(pb, `/ru/client/${links.b.selector}#${links.b.secret}`)
  await expect(pb.getByRole('heading', { name: 'Synthetic Client B', exact: true })).toBeVisible()
  await go(admin, `/admin/clients/${a.id}/assessments/new?kind=test`)
  await admin.locator('input[name="title"]').fill('Supplied test · synthetic')
  await admin.locator('input[name="occurredOn"]').fill('2026-10-02')
  await admin.locator('input[name="sourceName"]').fill('Synthetic source')
  await admin.locator('textarea[name="originalResult"]').fill('Literal supplied result <script>window.ia222Xss = true</script>')
  await admin.locator('textarea[name="practitionerComment"]').fill('Separate explicit comment')
  await admin.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(admin).toHaveURL(/\/assessments\/[a-f0-9-]+\/edit$/)
  const id = admin.url().match(/\/assessments\/([^/]+)\/edit$/)[1]
  await admin.reload(); await expect(admin.locator('input[name="title"]')).toHaveValue('Supplied test · synthetic')
  await pa.reload(); assert.ok(!(await pa.content()).includes('Supplied test · synthetic'))
  await admin.getByRole('button', { name: 'Share with client', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Unshare', exact: true })).toBeVisible()
  await pa.reload(); await expect(pa.getByRole('heading', { name: 'Supplied test · synthetic', exact: true })).toBeVisible()
  await pa.getByRole('link', { name: /Supplied test/ }).click()
  await expect(pa.getByRole('heading', { name: 'Original result', exact: true })).toBeVisible()
  await expect(pa.getByRole('heading', { name: 'Practitioner comment', exact: true })).toBeVisible()
  assert.equal(await pa.evaluate(() => window.ia222Xss), undefined)
  await pa.screenshot({ path: `${evidence}/synthetic-client-shared-result.png`, fullPage: true })
  const denied = await cb.request.get(origin + `/ru/client/${links.b.selector}/assessments/${id}`)
  assert.equal(denied.status(), 404); assert.ok(!(await denied.text()).includes('Supplied test'))
  const guessed = await publicContext.request.get(origin + `/en/client/${links.a.selector}/assessments/${id}`)
  assert.equal(guessed.status(), 404); assert.ok(!(await guessed.text()).includes('Literal supplied'))
  const rsc = await cb.request.get(origin + `/en/client/${links.a.selector}/assessments/${id}`, { headers: { RSC: '1' } })
  assert.ok(!(await rsc.text()).includes('Literal supplied')); assert.match(rsc.headers()['cache-control'], /no-store/)
  pass('Actual owner Draft/Share and client detail; two-client HTML/RSC isolation; literal source safely escaped')
  await admin.getByRole('button', { name: 'Unshare', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible()
  assert.equal((await ca.request.get(origin + `/en/client/${links.a.selector}/assessments/${id}`)).status(), 404)
  await admin.locator('textarea[name="practitionerComment"]').fill('Explicitly edited comment')
  await admin.getByRole('button', { name: 'Save draft', exact: true }).click()
  await admin.reload(); await expect(admin.locator('textarea[name="practitionerComment"]')).toHaveValue('Explicitly edited comment')
  await admin.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(admin.getByText('This record is archived and is not visible to the client.', { exact: true })).toBeVisible()
  assert.equal((await fresh.findClientAssessment(id)).status, 'archived')
  await go(admin, `/admin/clients/${a.id}/assessments/new?kind=research_result`)
  await expect(admin.locator('select[name="kind"]')).toHaveValue('research_result')
  await admin.locator('input[name="title"]').fill('Research result · synthetic')
  await admin.locator('input[name="occurredOn"]').fill('2026-10-01')
  await admin.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(admin).toHaveURL(/\/assessments\/[a-f0-9-]+\/edit$/)
  await admin.screenshot({ path: `${evidence}/synthetic-practitioner-draft.png`, fullPage: true })
  pass('Actual owner Unshare/Edit/Archive and second research-result creation, with store readback')
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  await go(pa, '/ru/client'); await expect(pa).toHaveURL(origin + `/ru/client/${links.a.selector}`)
  await go(pa, '/es/client'); await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  await stopApp(); await startApp()
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  assert.equal((await createPrescriptionStore({ environment }).findClientAssessment(id)).status, 'archived')
  await rotateCabinetAccess(store, a.id, environment)
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + '/en/client')
  await revokeCabinetAccess(store, b.id)
  await go(pb, '/ru/client'); await expect(pb).toHaveURL(origin + '/ru/client')
  assert.equal(await pa.evaluate(() => localStorage.length + sessionStorage.length), 0)
  pass('Resume EN/RU/ES, application restart persistence, rotation/revocation invalidation and no private browser storage')
  secondBrowser = await webkit.launch()
  const safari = await secondBrowser.newContext({ ...common, viewport: { width: 390, height: 844 } }), sp = await safari.newPage()
  await go(sp, '/ru/library')
  await expect(sp.locator('.mobile-bottom-navigation [data-nav-item="cabinet"]')).toBeVisible()
  assert.ok(await sp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
  await sp.screenshot({ path: `${evidence}/library-ru-webkit.png`, fullPage: true })
  assert.deepEqual(errors, [])
  pass('WebKit narrow navigation and no public JavaScript errors')
  results.push({ status: 'BLOCKED', message: 'Deployed Preview/Production private-storage configuration and real-data isolation are not inspected by this synthetic harness.' })
} catch (error) {
  results.push({ status: 'FAIL', message: sanitize(error.message) })
  console.error(sanitize(error.stack)); process.exitCode = 1
} finally {
  await browser?.close(); await secondBrowser?.close(); await stopApp()
  bridge?.close(); proxy?.close()
  writeFileSync(`${evidence}/results.json`, JSON.stringify(results, null, 2))
  writeFileSync(`${evidence}/app.log`, sanitize(logs))
}
