// Synthetic credentials + ephemeral CI Redis only. --live performs no login or
// mutation on production. Run with the production application's locked build.
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:https'
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { promisify } from 'node:util'
import { chromium, expect } from '@playwright/test'
import { SITE_VIDEO_SLOTS } from '../lib/site-videos/model.js'

const live = process.argv.includes('--live')
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3100'
const evidence = '/tmp/site-video-evidence'
mkdirSync(evidence, { recursive: true })
const results = []
function pass(label) { results.push(label); console.log(`PASS: ${label}`) }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let server, app, browser
const exec = promisify(execFile)
const testToken = 'synthetic-video-browser-test-only'
const namespace = 'holistic-house:site-videos:v1'

try {
  if (!live) {
    assert.equal(process.env.CI, 'true', 'Isolated tests must run in CI')
    server = createServer({ key: readFileSync('/tmp/video-test-key.pem'), cert: readFileSync('/tmp/video-test-cert.pem') }, async (request, response) => {
      try {
        assert.equal(request.method, 'POST')
        assert.equal(request.headers.authorization, `Bearer ${testToken}`)
        let raw = ''
        for await (const part of request) { raw += part; assert.ok(raw.length < 400000) }
        const command = JSON.parse(raw)
        assert.ok(Array.isArray(command))
        assert.ok(['HGET', 'HGETALL', 'EVAL'].includes(command[0]))
        assert.equal(command[command[0] === 'EVAL' ? 3 : 1], namespace)
        const { stdout } = await exec('redis-cli', ['-h', '127.0.0.1', '-p', '6379', '--json', ...command.map(String)], { maxBuffer: 4 * 1024 * 1024 })
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ result: JSON.parse(stdout) }))
      } catch (error) {
        console.error('Isolated Redis adapter:', error.message)
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Invalid isolated test command' }))
      }
    })
    // Match production HTTPS validation without weakening the application rule.
    server.listen(443, '127.0.0.1')
    await once(server, 'listening')
    const log = createWriteStream(`${evidence}/local-app.log`)
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3100', '-H', '127.0.0.1'], {
      env: { ...process.env, PRESCRIPTIONS_ADMIN_TOKEN: testToken, PRESCRIPTIONS_ADMIN_PIN: '', PRESCRIPTIONS_KV_REST_API_URL: 'https://127.0.0.1', PRESCRIPTIONS_KV_REST_API_TOKEN: testToken },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    app.stdout.pipe(log); app.stderr.pipe(log)
    for (let i = 0; ; i++) {
      try { if ((await fetch(origin)).ok) break } catch { /* starting */ }
      if (i > 90 || app.exitCode !== null) throw new Error('Local application did not start')
      await pause(1000)
    }
  }
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  async function navigate(target) {
    const options = { waitUntil: 'domcontentloaded', timeout: 60000 }
    let response = await page.goto(new URL(target, origin).href, options)
    // Different placements can be anchors on the same Services page. A hash-only
    // navigation makes no HTTP request and returns null. Reload to inspect the
    // newly published server snapshot rather than the old document already open.
    if (!response) response = await page.reload(options)
    assert.ok(response, `No document response for ${target}`)
    assert.equal(response.status(), 200, target)
    // Archived source books may contain a nested main landmark of their own.
    // Readiness concerns the outer application page, not imported source markup.
    await expect(page.locator('main').first()).toBeVisible()
  }
  if (live) {
    for (let i = 0; ; i++) {
      await navigate('/en/about')
      if (await page.locator('.site-video-player').count() === 3) break
      if (i >= 40) throw new Error('Updated module not observed on production')
      await pause(5000)
    }
  }
  await navigate('/en/about')
  await expect(page.locator('#psychic-alchemy-video')).toBeVisible()
  assert.equal(await page.locator('iframe').count(), 0)
  assert.equal(await page.locator('.site-video-player').count(), 3)
  await expect(page.locator('#personal-consultation-title')).toBeVisible()
  pass(`${live ? 'Production' : 'Local'}: approved About intro, three testimonials, form; no eager iframe`)
  await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-about-desktop.png`, fullPage: true })
  await navigate('/en/homeopathy/remedies')
  const remedyPath = await page.locator('a[href^="/en/homeopathy/remedies/"]').first().getAttribute('href')
  assert.ok(remedyPath)
  await navigate('/en/books')
  const bookPath = await page.locator('a[href^="/books/"]').first().getAttribute('href')
  assert.ok(bookPath)
  const paths = ['/?lang=en', '/?lang=ru', '/en/about', '/ru/about', '/en/services', '/ru/services', '/en/homeopathy', '/ru/homeopathy', '/en/homeopathy/remedies', '/ru/homeopathy/remedies', '/en/books', '/ru/books', remedyPath, bookPath]
  for (const width of [1365, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of paths) {
      await navigate(path)
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
      assert.ok(sizes.document <= sizes.viewport + 2, `Overflow on ${path}: ${JSON.stringify(sizes)}`)
    }
    pass(`${live ? 'Production' : 'Local'}: ${paths.length} routes, HTTP 200 and no overflow at ${width}px`)
  }
  await navigate('/en/about')
  await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-about-mobile.png`, fullPage: true })
  await page.goto(`${origin}/admin/videos`)
  await expect(page).toHaveURL(/\/admin\/login/)
  assert.equal(await page.locator('.site-video-editor').count(), 0)
  pass('Guest cannot access video editor')
  if (live) {
    await page.setViewportSize({ width: 1365, height: 1000 })
    await navigate('/en/about')
    const intro = page.locator('#psychic-alchemy-video')
    await intro.getByRole('button', { name: /^Open video:/ }).click()
    await expect(intro.locator('iframe')).toHaveAttribute('src', 'https://app.heygen.com/embeds/fd5fcead9b067f9a0649862675a38771')
    pass('Production: correct existing HeyGen iframe loads only on click')
    await page.screenshot({ path: `${evidence}/live-player-open.png` })
    const frame = page.frames().find(item => item.url().startsWith('https://app.heygen.com/embeds/'))
    if (frame) console.log('OBSERVATION: HeyGen video elements:', await frame.locator('video').count())
  } else {
    const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
    await adminContext.addCookies([{ name: 'prescriptions_admin', value: createHmac('sha256', testToken).update('prescriptions-admin-v1').digest('base64url'), domain: '127.0.0.1', path: '/admin', httpOnly: true, sameSite: 'Strict' }])
    const editor = await adminContext.newPage()
    editor.on('pageerror', error => pageErrors.push(error.message))
    async function openEditor(target = editor) {
      await target.goto(`${origin}/admin/videos`)
      await target.locator('.prescription-admin-header button[lang="en"]').click()
      await expect(target.locator('.site-video-manager')).toHaveAttribute('lang', 'en')
      await expect(target.locator('.site-video-placement-list button')).toHaveCount(13)
      assert.equal(await target.getByText('Video storage is currently unavailable.', { exact: false }).count(), 0)
    }
    async function choose(slot, locale = 'en', target = editor) {
      await target.locator('.site-video-language-picker button').nth(locale === 'en' ? 0 : 1).click()
      await target.locator('.site-video-placement-list button').filter({ hasText: slot.label.en }).click()
      if (slot.entityType) await target.locator('.site-video-field select').first().selectOption({ index: 1 })
    }
    async function fill(title, target = editor) {
      await target.locator('input[name="youtubeUrl"]').fill('https://youtu.be/OkLEN8Zb-sY?si=test-tracker')
      await target.locator('input[name="title"]').fill(title)
    }
    async function save(intent, target = editor) {
      if (intent === 'publish') {
        await target.locator('input[name="reviewed"]').check()
        await target.locator('.site-video-admin-button--primary').click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video published to the selected page.')
      } else if (intent === 'draft') {
        await target.getByRole('button', { name: 'Save draft', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Draft saved.')
      } else {
        await target.getByRole('button', { name: 'Hide from website', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video hidden from the website.')
      }
    }
    await openEditor()
    await fill('QA unpublished private-to-editor title')
    await save('draft')
    await openEditor()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA unpublished private-to-editor title')
    await navigate('/?lang=en')
    assert.ok(!(await page.content()).includes('QA unpublished private-to-editor title'))
    pass('Draft persists across reload and stays out of public output')
    await editor.locator('input[name="youtubeUrl"]').fill('https://drive.google.com/file/d/invalid-playback/view')
    await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
    pass('Drive playback URL rejected')
    for (const locale of ['en', 'ru']) {
      for (const slot of SITE_VIDEO_SLOTS) {
        console.log(`CHECK: publish ${slot.id}:${locale}`)
        await choose(slot, locale)
        const title = `QA ${slot.id} ${locale}`
        await fill(title)
        await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
        await save('publish')
        const destination = await editor.locator('.site-video-editor-heading > a').getAttribute('href')
        await navigate(destination)
        await expect(page.locator('.site-video-player').filter({ hasText: title })).toHaveCount(1)
      }
      pass(`All 13 ${locale.toUpperCase()} placements publish via real server actions and isolated Redis`)
    }
    await choose(SITE_VIDEO_SLOTS[0])
    await editor.screenshot({ path: `${evidence}/editor-desktop.png`, fullPage: true })
    await editor.setViewportSize({ width: 390, height: 844 })
    assert.ok(await editor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await editor.screenshot({ path: `${evidence}/editor-mobile.png`, fullPage: true })
    pass('Authenticated mobile editor has no overflow')
    await editor.setViewportSize({ width: 1365, height: 1000 })
    await fill('QA newer draft preserves publication')
    await save('draft')
    await navigate('/?lang=en')
    await expect(page.getByText('QA home-intro en', { exact: true })).toBeVisible()
    assert.ok(!(await page.content()).includes('QA newer draft preserves publication'))
    await navigate('/?lang=ru')
    await expect(page.getByText('QA home-intro ru', { exact: true })).toBeVisible()
    pass('Draft changes preserve published snapshot; EN/RU are isolated')
    const second = await adminContext.newPage()
    await openEditor(second)
    await fill('QA editor A accepted')
    await save('publish')
    await fill('QA editor B retained edits', second)
    await second.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('changed in another window')
    await second.getByRole('button', { name: 'Refresh list and keep edits', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('List refreshed.')
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    await expect(second.locator('input[name="reviewed"]')).not.toBeChecked()
    await save('publish', second)
    await navigate('/?lang=en')
    await expect(page.getByText('QA editor B retained edits', { exact: true })).toBeVisible()
    pass('Concurrent edit rejected; refresh keeps edits and resets review; republish works')
    assert.equal(await page.locator('iframe').count(), 0)
    await page.locator('.site-video-play').click()
    await expect(page.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/OkLEN8Zb-sY\?/)
    pass('YouTube privacy-enhanced iframe exists only after click')
    await save('hide', second)
    await navigate('/?lang=en')
    assert.equal(await page.locator('.site-video-player').count(), 0)
    await navigate('/?lang=ru')
    await expect(page.getByText('QA home-intro ru', { exact: true })).toBeVisible()
    await openEditor(second)
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    pass('Hide persists, retains draft and leaves other language unchanged')
    await adminContext.close()
  }
  assert.deepEqual(pageErrors, [], 'Unexpected page JavaScript errors')
  pass('No page JavaScript errors')
  writeFileSync(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ mode: live ? 'read-only production' : 'isolated Redis browser', passed: results }, null, 2))
  console.log(`VERIFIED: ${results.length} scenario groups`)
} catch (error) {
  if (!live) { try { console.error('Isolated application log:', readFileSync(`${evidence}/local-app.log`, 'utf8')) } catch { /* not started */ } }
  throw error
} finally {
  if (browser) await browser.close()
  if (app) app.kill('SIGTERM')
  if (server) server.close()
}
