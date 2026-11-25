// Synthetic-only canvas PDF verification for the existing isolated browser CI.
// No app requests, authentication, database connections, external AI, or Next build.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildClientReport } from '../lib/profile/client-report.js'
import { createProfileSnapshot } from '../lib/profile/history.js'

// Deliberately reuse the CI's strict allowlist without calling adminClient/setup.
const databaseGuard = new URL(assertIsolated())
assert.ok(['postgres:', 'postgresql:'].includes(databaseGuard.protocol), 'Isolated PostgreSQL configuration required')
assert.equal(process.env.VERCEL_ENV || '', '', 'Do not run from a Vercel environment')
if (process.env.HH_TEST_APP_ORIGIN) assert.match(process.env.HH_TEST_APP_ORIGIN, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engineName = process.env.HH_TEST_BROWSER || 'chromium'
assert.ok(['chromium', 'webkit'].includes(engineName), 'Only the existing Chromium/WebKit CI engines are supported')
// Import after the guard so a rejected invocation cannot launch a browser.
const { chromium, webkit } = await import('@playwright/test')
const engine = engineName === 'webkit' ? webkit : chromium
const output = fileURLToPath(new URL('../artifacts/app-r1/asrs6-pdf-' + engineName + '/', import.meta.url))
const renderer = await readFile(new URL('../lib/profile/client-report-pdf.js', import.meta.url))
const source = JSON.parse(await readFile(new URL('../docs/assessments/sources/asrs6/instrument-extraction.json', import.meta.url), 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const normalized = text => text.replace(/\s+/g, ' ').trim()
const checks = [], cases = [], errors = [], failures = [], blockedRequests = [], servedRequests = []
const passed = label => { checks.push(label); console.log('PASS ' + label) }
await mkdir(output, { recursive: true })

function makeFixture(locale, count, index) {
  const values = count === 0 ? [0, 0, 0, 0, 0, 0] : [2, 2, 2, 3, 0, 0]
  const definition = getAssessmentDefinition('asrs-6', 'v1', locale)
  const answers = Object.fromEntries(values.map((value, i) => ['asrs6.' + String(i + 1).padStart(2, '0'), value]))
  const accountId = '10000000-0000-4000-8000-000000000099'
  const result = {
    ...scoreAssessment(definition, answers), accountId,
    id: '30000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
    measurementAt: '2026-10-12T20:00:00Z',
  }
  const snapshot = createProfileSnapshot({
    id: '40000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
    accountId, generatedResult: result, createdAt: '2026-10-12T20:00:01Z',
  })
  const report = buildClientReport({
    account: { displayName: locale === 'ru' ? 'СИНТЕТИЧЕСКИЙ ПРИМЕР · ' + count + ' из 6' : 'SYNTHETIC EXAMPLE · ' + count + ' of 6' },
    results: [result], snapshot, locale, now: new Date('2026-10-12T21:00:00Z'),
  })
  assert.equal(report.tests.length, 1)
  assert.equal(report.latestScales.length, 1)
  for (const dimension of [report.tests[0].dimensions[0], report.latestScales[0]]) {
    assert.equal(dimension.value, count)
    assert.equal(dimension.min, 0)
    assert.equal(dimension.max, 6)
    assert.equal(dimension.displayKind, 'screening-count')
  }
  assert.equal(report.tests[0].interpretation.sections[0].recommendedReview, count >= 4)
  const original = report.tests[0].interpretation.instrumentText
  const expected = {
    eligibilityText: source.locales[locale].eligibility,
    printedScoringText: source.locales[locale].printed_scoring_text,
    safetyText: source.locales[locale].safety_text,
    requiredSiteAttribution: source.required_site_attribution,
    sourceUrl: definition.source.url,
  }
  if (definition.formCopyright) expected.formCopyright = definition.formCopyright
  for (const [key, text] of Object.entries(expected)) {
    assert.ok(typeof text === 'string' && text.length > 0, 'Missing source ' + key)
    assert.equal(original[key], text, locale + ' exact ' + key)
  }
  return { id: locale + '-' + (count === 0 ? 'zero' : 'threshold4'), locale, count, values, expected, report }
}
const fixtures = ['en', 'ru'].flatMap((locale, li) => [0, 4].map((count, ci) => makeFixture(locale, count, li * 2 + ci)))

let origin, browser, context
const server = createServer((request, response) => {
  const path = request.url
  if (request.method !== 'GET' || request.headers.host !== new URL(origin).host || request.socket.remoteAddress !== '127.0.0.1') {
    response.writeHead(403); response.end('Loopback GET only'); return
  }
  servedRequests.push(path)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'self'; img-src data:; style-src 'none'; font-src 'none'; frame-src 'none'")
  if (path === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html><meta charset="utf-8"><title>Synthetic ASRS6 PDF QA</title><p>Synthetic local renderer verification.</p>')
  } else if (path === '/renderer.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8'); response.end(renderer)
  } else if (path === '/favicon.ico') { response.writeHead(204); response.end() }
  else { response.writeHead(404); response.end('Not found') }
})

async function capturePdf(page, fixture) {
  return page.evaluate(async report => {
    const { generateClientPdf } = await import('/renderer.js')
    await document.fonts.ready
    const text = [], shapes = [], pages = [], canvasIds = new Map()
    const prototype = CanvasRenderingContext2D.prototype
    const originalText = prototype.fillText, originalRect = prototype.rect, originalRound = prototype.roundRect
    const originalExport = HTMLCanvasElement.prototype.toDataURL
    const pageFor = canvas => {
      if (!canvasIds.has(canvas)) canvasIds.set(canvas, canvasIds.size + 1)
      return canvasIds.get(canvas)
    }
    const regionFor = (canvas, bounds) => {
      const x = Math.max(0, Math.floor(bounds.left)), y = Math.max(0, Math.floor(bounds.top))
      return { x, y, width: Math.max(0, Math.min(canvas.width, Math.ceil(bounds.right)) - x), height: Math.max(0, Math.min(canvas.height, Math.ceil(bounds.bottom)) - y) }
    }
    prototype.fillText = function (value, x, y, ...rest) {
      const string = String(value), metrics = this.measureText(string)
      const bounds = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight, top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent }
      const region = regionFor(this.canvas, bounds), isCyrillic = /[А-Яа-яЁё]/u.test(string)
      const before = isCyrillic && region.width && region.height ? this.getImageData(region.x, region.y, region.width, region.height).data : null
      const result = originalText.call(this, value, x, y, ...rest)
      let changedPixels = null
      if (before) {
        const after = this.getImageData(region.x, region.y, region.width, region.height).data
        changedPixels = 0
        for (let i = 0; i < before.length; i += 4) if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2] || before[i + 3] !== after[i + 3]) changedPixels++
      }
      text.push({ page: pageFor(this.canvas), text: string, x, y, width: metrics.width, font: this.font, bounds, isCyrillic, changedPixels })
      return result
    }
    prototype.rect = function (x, y, width, height, ...rest) {
      shapes.push({ page: pageFor(this.canvas), x, y, width, height, color: this.fillStyle })
      return originalRect.call(this, x, y, width, height, ...rest)
    }
    if (originalRound) prototype.roundRect = function (x, y, width, height, ...rest) {
      shapes.push({ page: pageFor(this.canvas), x, y, width, height, color: this.fillStyle })
      return originalRound.call(this, x, y, width, height, ...rest)
    }
    HTMLCanvasElement.prototype.toDataURL = function (type, ...rest) {
      const encoded = originalExport.call(this, type, ...rest)
      if (type === 'image/jpeg' && canvasIds.has(this)) {
        pages.push({ page: pageFor(this), width: this.width, height: this.height, jpeg: encoded, png: originalExport.call(this, 'image/png') })
      }
      return encoded
    }
    try {
      const blob = await generateClientPdf(report)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let start = 0; start < bytes.length; start += 32768) binary += String.fromCharCode(...bytes.subarray(start, start + 32768))
      return { pdf: btoa(binary), mime: blob.type, text, shapes, pages }
    } finally {
      prototype.fillText = originalText; prototype.rect = originalRect
      if (originalRound) prototype.roundRect = originalRound
      HTMLCanvasElement.prototype.toDataURL = originalExport
    }
  }, fixture.report)
}

function checkRendered(fixture, captured, pdf, images) {
  assert.equal(captured.mime, 'application/pdf')
  assert.ok(pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-1.4'))
  assert.ok(pdf.subarray(-20).toString('ascii').includes('%%EOF'))
  const pdfSyntax = pdf.toString('latin1')
  assert.equal((pdfSyntax.match(/\/Type \/Page\b/g) || []).length, images.length, 'All captured pages must exist in the PDF')
  assert.ok(images.length >= 4 && images.length <= 20, 'Expected bounded multi-page synthetic report')
  assert.deepEqual(captured.pages.map(p => p.page), images.map((_, i) => i + 1))
  for (const [index, image] of images.entries()) {
    assert.equal(captured.pages[index].width, 1240)
    assert.equal(captured.pages[index].height, 1754)
    assert.ok(pdf.includes(image.jpeg), 'The actual captured JPEG must be embedded in the PDF, page ' + (index + 1))
  }
  const text = normalized(captured.text.map(row => row.text).join(' '))
  for (const [key, expected] of Object.entries(fixture.expected)) assert.ok(text.includes(normalized(expected)), fixture.id + ' rendered exact ' + key)
  assert.equal(captured.text.filter(row => row.text === fixture.count + ' / 6').length, 2, 'Discrete count must appear on measurements and test pages')
  assert.ok(!captured.text.some(row => /\d\s*%/u.test(row.text)), 'No score percentage labels')
  assert.equal(captured.shapes.filter(shape => shape.height === 10).length, 0, 'No percentage meter track/fill')
  const outOfPage = captured.text.filter(row => !Object.values(row.bounds).every(Number.isFinite) || row.bounds.left < -1 || row.bounds.right > 1241 || row.bounds.top < -1 || row.bounds.bottom > 1755)
  assert.deepEqual(outOfPage, [], 'All text ink must remain inside its PDF page')
  const outOfBody = captured.text.filter(row => row.page > 1 && row.y > 110 && row.y < 1663 && (row.bounds.left < 87 || row.bounds.right > 1153 || row.bounds.bottom > 1618))
  assert.deepEqual(outOfBody, [], 'Body text must stay within margins and above the footer')
  for (let number = 2; number <= images.length; number++) {
    assert.ok(captured.text.some(row => row.page === number && row.text === String(number) && row.y === 1680), 'Page number ' + number)
  }
  const cyrillic = captured.text.filter(row => row.isCyrillic)
  if (fixture.locale === 'ru') {
    assert.ok(cyrillic.length > 20, 'Expected Russian content across the report')
    assert.ok(cyrillic.every(row => row.changedPixels > 0), 'Every Cyrillic text draw must add visible pixels')
    assert.ok(text.includes('Валидация именно этой русской формулировки не подтверждена'), 'Russian validation caveat must be visible')
  }
  return { exactSourceText: true, discreteCountLabels: 2, meterShapes: 0, pageBounds: true, bodyBounds: true, cyrillicDraws: cyrillic.length, cyrillicNonblank: cyrillic.every(row => row.changedPixels > 0) }
}

function verification(failure) {
  return {
    commit: process.env.GITHUB_SHA || null, engine: engineName, rendererSha256: hash(renderer),
    syntheticOnly: true, production: 'UNCHANGED', databaseConnections: 0,
    checks, cases, errors, failures, blockedRequests, servedRequests,
    pageImageMethod: 'Lossless PNG captured from each actual renderer canvas before disposal; matching JPEG bytes are asserted to be embedded in the PDF.',
    visualReview: 'Automated text/ink/bounds checks only. Review every saved PDF/page PNG for typography, glyph shapes, overlaps and page-break quality before declaring visual QA complete.',
    ...(failure ? { failure } : {}),
  }
}
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  origin = 'http://127.0.0.1:' + server.address().port
  browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE } : {})
  context = await browser.newContext({ viewport: { width: 1280, height: 960 }, timezoneId: 'UTC', locale: 'en-US', serviceWorkers: 'block' })
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin !== origin || request.method() !== 'GET' || !['/', '/renderer.js', '/favicon.ico'].includes(url.pathname) || url.search) {
      blockedRequests.push({ origin: url.origin, path: url.pathname, method: request.method() })
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin, { waitUntil: 'load' })
  for (const fixture of fixtures) {
    await writeFile(output + fixture.id + '-model.json', JSON.stringify({ syntheticOnly: true, ...fixture }, null, 2))
    const captured = await capturePdf(page, fixture)
    const pdf = Buffer.from(captured.pdf, 'base64'), images = []
    await writeFile(output + fixture.id + '.pdf', pdf)
    for (const capturedPage of captured.pages) {
      assert.ok(capturedPage.png.startsWith('data:image/png;base64,'))
      assert.ok(capturedPage.jpeg.startsWith('data:image/jpeg;base64,'))
      const png = Buffer.from(capturedPage.png.split(',')[1], 'base64')
      const jpeg = Buffer.from(capturedPage.jpeg.split(',')[1], 'base64')
      const prefix = fixture.id + '-page-' + String(capturedPage.page).padStart(2, '0')
      await writeFile(output + prefix + '.png', png)
      await writeFile(output + prefix + '.jpg', jpeg)
      images.push({ png, jpeg })
    }
    await writeFile(output + fixture.id + '-trace.json', JSON.stringify({ text: captured.text, shapes: captured.shapes }, null, 2))
    const result = { id: fixture.id, count: fixture.count, language: fixture.locale, pages: images.length, bytes: pdf.length, sha256: hash(pdf), pageImages: images.map((image, index) => ({ page: index + 1, pngSha256: hash(image.png), jpegSha256: hash(image.jpeg) })) }
    cases.push(result)
    // Keep the other three synthetic artifacts available even if a layout assertion fails.
    try {
      result.assertions = checkRendered(fixture, captured, pdf, images)
      passed(fixture.id + ': source-exact canvas PDF, discrete count, no percentage meter, bounded text and nonblank language glyphs')
    } catch (error) {
      result.failure = error.message
      failures.push({ id: fixture.id, message: error.message })
      console.error('FAIL ' + fixture.id + ': ' + error.message)
    }
  }
  assert.deepEqual(errors, [], 'No browser page errors')
  assert.deepEqual(blockedRequests, [], 'The renderer must never attempt non-harness traffic')
  assert.equal(cases.length, 4)
  assert.deepEqual(failures, [], 'Every synthetic PDF must pass its automated checks')
  const evidence = verification(); evidence.browser = await browser.version()
  await writeFile(output + 'verification.json', JSON.stringify(evidence, null, 2))
} catch (error) {
  await writeFile(output + 'verification.json', JSON.stringify(verification(error.stack || error.message), null, 2))
  throw error
} finally {
  await context?.close().catch(() => {})
  await browser?.close().catch(() => {})
  if (server.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
}
