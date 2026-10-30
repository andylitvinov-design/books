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
import { RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'

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
  page.on('pageerror', error => pageErrors.push({ message: error.message, url: page.url() }))
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
  for (const [target, slot, locale, id, youtubeId] of [
    ['/en/services', 'services-intro', 'en', '48105a2f2228e7cb3a67391e97acaf8b', 's30Y42IwPcg'],
    ['/en/homeopathy', 'homeopathy-intro', 'en', '34df311e461509433b45929908a9097a', 'ILyRWyHtJoE'],
    ['/ru/services', 'services-intro', 'ru', '79c2845577865979cd95ac40a08fc01a', 'Cz6SxXJNZbw'],
    ['/ru/homeopathy', 'homeopathy-intro', 'ru', '0f984780d06948b1e78166e6e553e4e9', 'Q9NvYECKWuc'],
  ]) {
    await navigate(target)
    if (slot === 'services-intro' && await page.locator('#method-videos').count()) {
      // Videos are visible by default; old production may still use a closed disclosure.
      if (await page.locator('#method-videos').getAttribute('open') === null) {
        await page.locator('#method-videos > summary').click()
      }
      await expect(page.locator('#method-videos')).toHaveAttribute('open', '')
    }
    const block = page.locator(`[data-video-slot="${slot}"][data-video-locale="${locale}"]`)
    await expect(block).toHaveCount(1)
    assert.equal(await block.locator('iframe').count(), 0)
    const play = block.getByRole('button', { name: /^(Watch video|Open video|Смотреть видео):/ })
    if (live) await pause(1200)
    await play.click()
    if (live && await block.locator('iframe').count() === 0) {
      // A very fast synthetic click can land before Next hydration has attached
      // client handlers to SSR markup. Retry once after hydration rather than
      // treating that test-timing race as a playback failure.
      await pause(1200)
      if (await play.count()) await play.click()
    }
    await expect(block.locator('iframe')).toHaveAttribute('src', new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${youtubeId}\\?`), { timeout: 10000 })
    await expect(block.locator('iframe')).toHaveAttribute('data-video-playback', 'youtube')
  }
  for (const home of ['/', '/ru']) {
    await navigate(home)
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
  }
  pass(`${live ? 'Production' : 'Local'}: EN/RU AI home intros hidden; Services and Homeopathy approved videos remain playable`)

  // Regressions reported by the owner: the Services videos were buried inside
  // a collapsed block, while the detailed service pages contained no players.
  // These checks run against built/served pages in an isolated local environment.
  if (!live) {
    for (const locale of ['en', 'ru']) {
      await navigate('/' + locale + '/services')
      const visibleGallery = page.locator('#method-videos')
      await expect(visibleGallery).toHaveAttribute('open', '')
      // Services introduction is a sibling of #method-videos after the studio layout revision.
      // Verify the real poster is present without an eagerly mounted YouTube iframe.
      const intro = page.locator(`[data-services-meet] [data-video-slot="services-intro"][data-video-locale="${locale}"]`)
      await expect(intro.locator('button.site-video-play')).toBeVisible()
      await expect(intro.locator('iframe')).toHaveCount(0)
      // Keep the current production's additional EN method-poster acceptance.
      if (locale === 'en') {
        await expect(visibleGallery.locator('[data-video-slot="method-hypnotherapy"] .site-video-play')).toBeVisible()
        await expect(visibleGallery.locator('[data-video-slot="method-constellations"] .site-video-play')).toBeVisible()
      }
      const offers = page.locator('[data-services-studio-paid] [data-services-studio-card]')
      const expectedPaidOfferIds = ["monthly-support", "alchemy", "hypnotherapy", "constellations", "business", "remote-energy-support"]
      await expect(offers).toHaveCount(expectedPaidOfferIds.length)
      const paidOfferIds = await offers.evaluateAll(cards => cards.map(card => card.getAttribute('data-services-studio-card')))
      assert.deepEqual(paidOfferIds, expectedPaidOfferIds, 'Services paid catalogue changed: ' + locale)
      for (const [id, suffix] of [['alchemy', 'alchemy-of-soul'], ['hypnotherapy', 'hypnotherapy-course']]) {
        // The offer itself is the matching card, not an obsolete direct-video link.
        const hrefs = await page.locator('[data-services-studio-card="' + id + '"] a[href]')
          .evaluateAll(links => links.map(link => link.getAttribute('href')))
        assert.ok(hrefs.includes('/' + locale + '/services/' + suffix), id + ' route not reachable from Services')
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(intro.locator('button.site-video-play')).toBeVisible()
      await expect(visibleGallery).toHaveAttribute('open', '')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Services mobile overflow: ' + locale)
      await page.screenshot({ path: `${evidence}/services-${locale}-mobile-video.png`, fullPage: true })
      await page.setViewportSize({ width: 1365, height: 1000 })
    }
    pass('EN/RU Services galleries are open on load, video links work, and mobile width is safe')

    const detailRoutes = [
      ['/en/services/alchemy-of-soul', 'alchemy', 'https://app.heygen.com/embeds/7c6b243f048b9c0581ae29619a4a89fc'],
      ['/en/services/hypnotherapy-course', 'hypnotherapy', 'https://app.heygen.com/embeds/8c1634ce904434a91931429b6a7eefe1'],
      ['/ru/services/alchemy-of-soul', 'alchemy', 'https://www.youtube-nocookie.com/embed/Cz6SxXJNZbw?'],
      // Owner-approved RU guided-imagery video in data/service-video-library.ts,
      // not the generic Russian overview used by Alchemy and constellations.
      ['/ru/services/hypnotherapy-course', 'hypnotherapy', 'https://www.youtube-nocookie.com/embed/eLsjFaKCBhI?'],
      ['/en/services/psychohomeopathy', 'alchemy', 'https://app.heygen.com/embeds/7c6b243f048b9c0581ae29619a4a89fc'],
      ['/ru/services/psychohomeopathy', 'alchemy', 'https://www.youtube-nocookie.com/embed/Cz6SxXJNZbw?'],
      ['/es/services/imagery-therapy', 'hypnotherapy', 'https://app.heygen.com/embeds/8c1634ce904434a91931429b6a7eefe1'],
      // The standalone systemic-constellations landing uses the owner's
      // published business-constellations case, not the generic method video.
      ['/en/services/systemic-constellations', 'constellation-case', 'https://www.youtube-nocookie.com/embed/sfVFOQNr2qk?'],
      // FreeEntryLanding owns its own inline intro; it does not render the old
      // ServiceVideoShowcase wrapper. The approved overview recording is kept.
      ['/en/services/free-situation-review', 'free-review-intro', 'https://www.youtube-nocookie.com/embed/s30Y42IwPcg?'],
    ]
    for (const [route, topic, expectedUrl] of detailRoutes) {
      await navigate(route)
      if (route.endsWith('/psychohomeopathy')) {
        assert.equal(new URL(page.url()).pathname, route.replace('/psychohomeopathy', '/alchemy-of-soul'), 'Legacy service redirects to its canonical Alchemy page')
      }
      const block = page.locator(topic === 'alchemy' ? '[data-alchemy-panel="video"]' :
        topic === 'free-review-intro' ? '[data-free-review-intro-video]' :
        `[data-service-video="${topic}"]`)
      await expect(block).toHaveCount(1)
      await block.scrollIntoViewIfNeeded()
      await expect(block.locator('.site-video-play')).toBeVisible()
      assert.equal(await block.locator('iframe').count(), 0, route + ' eager third-party iframe')
      const transcript = block.locator('details.site-video-transcript')
      if (await transcript.count() && !(await transcript.evaluate(node => node.open))) await transcript.locator('summary').click()
      await expect(block.locator('.site-video-watch-link').first()).toHaveAttribute('href', /^https:\/\//)
      await block.locator('.site-video-play').click()
      await expect.poll(async () => (await block.locator('iframe').getAttribute('src'))?.startsWith(expectedUrl), {
        timeout: 10000, message: `${route}: player must embed the exact approved public source ${expectedUrl}`,
      }).toBe(true)
      assert.equal(await block.locator('.site-video-play').count(), 0, route + ' poster remained after Play')
    }
    // Wu Xing is now a focused free entry and consented enquiry, not a
    // separate automatic method-video promotion. Preserve the approved flow.
    await navigate('/ru/services/dao-health-profile')
    await expect(page.locator('main[data-free-entry-landing="dao"] [data-compact-lead-form]')).toHaveCount(1)
    assert.equal(await page.locator('[data-service-video="overview"]').count(), 0,
      'The separate Dao free start must not imply a video consultation')
    pass('Nine video service routes and the separate Dao free entry preserve exact approved formats')
  }

  await navigate('/en/about')
  await expect(page.locator('#psychic-alchemy-video')).toBeVisible()
  assert.equal(await page.locator('iframe').count(), 0)
  // About now shows ten verified archived public testimonials (6 EN, 4 RU
  // with matching approved local posters). The two unverified-poster RU
  // clips are excluded by PersonalTestimonials, never silently substituted.
  const approvedReviewIds = [
    'Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk',
    '4NrryHcEF1A', 'hYwRNMxIMjc', 'MIVLm1GUTtM', 'ttQxUHopaUM',
    'VABgpmn4ZYA', 'muOnIHllI7E',
  ].sort()
  const aboutReviews = page.locator('[data-personal-testimonials="about"] [data-testimonial-video-id]')
  await expect(aboutReviews).toHaveCount(approvedReviewIds.length)
  const renderedIds = await aboutReviews.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testimonial-video-id')).sort())
  assert.deepEqual(renderedIds, approvedReviewIds, 'About contains only the approved public testimonial originals')
  await expect(page.locator('[data-personal-testimonials="about"] .site-video-player')).toHaveCount(approvedReviewIds.length)
  await expect(page.locator('#personal-consultation-title')).toBeVisible()
  pass(`${live ? 'Production' : 'Local'}: approved About intro, ten identity-matched public testimonials, form; no eager iframe`)
  await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-about-desktop.png`, fullPage: true })
  await navigate('/en/homeopathy/remedies')
  const remedyPath = await page.locator('a[href^="/en/homeopathy/remedies/"]').first().getAttribute('href')
  assert.ok(remedyPath)
  await navigate('/en/books')
  const bookPath = await page.locator('a[href^="/en/books/"]').first().getAttribute('href')
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
