// Synthetic credentials + ephemeral CI Redis only. --live performs no login or
// mutation on production. Run with the production application's locked build.
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:https'
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { promisify } from 'node:util'
import { chromium, expect } from '@playwright/test'
import { verifyAboutTestimonials } from './verify-about-testimonials-browser.mjs'
import {assertMessengerOnlyCapture} from './helpers/messenger-only-contract.mjs'

const live = process.argv.includes('--live')
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3100'
const evidence = '/tmp/site-video-evidence'
mkdirSync(evidence, { recursive: true })
const results = []
const skippedResults = []
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
    // The production build is tested separately above. This isolated app
    // exercises real admin actions with the existing RLS-protected PostgreSQL
    // practitioner directory plus ephemeral Redis; Next production mode
    // intentionally refuses loopback synthetic DB credentials.
    assert.equal(process.env.HH_APP_TEST_RUNTIME, 'isolated')
    assert.match(process.env.HH_APP_DATABASE_URL || '', /^postgres:\/\/hh_app_ci_login:[^@]+@127\.0\.0\.1:5432\/hh_app_test$/)
    const log = createWriteStream(`${evidence}/local-app.log`)
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3100', '-H', '127.0.0.1'], {
      env: { ...process.env, NODE_ENV: 'development', HH_APP_ENABLED: 'true',
        PRESCRIPTIONS_ADMIN_TOKEN: testToken, PRESCRIPTIONS_ADMIN_PIN: '',
        PRESCRIPTIONS_KV_REST_API_URL: 'https://127.0.0.1',
        PRESCRIPTIONS_KV_REST_API_TOKEN: testToken },
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
  // Preserve the actual error record. A single failed initial DEV document
  // may be attributed as provisional only after an exact 200 retry.
  const recoveredFailedDevErrors = new Set()
  page.on('pageerror', error => pageErrors.push({ message: error.message, url: page.url() }))
  async function navigate(target) {
    const errorCountBeforeDocument = pageErrors.length
    const options = { waitUntil: 'domcontentloaded', timeout: 60000 }
    const destination = new URL(target, origin)
    const previous = new URL(page.url())
    // Multiple placements can share one Services path and differ by #anchor.
    // Avoid dispatching an unnecessary Next.js same-document navigation, which
    // does not request fresh publication data and can recurse through popstate.
    const sameDocument = previous.origin === destination.origin &&
      previous.pathname === destination.pathname && previous.search === destination.search
    let response = sameDocument
      ? await page.reload(options)
      : await page.goto(destination.href, options)
    if (!response) response = await page.reload(options)
    // Next 15 isolated DEV can briefly lack clientReferenceManifest during
    // FIRST dynamic compilation. One identical-document retry must return 200;
    // never soften a LIVE request or skip genuine route verification.
    if (!live && response?.status() === 500) {
      const rejectedDocumentUrl = response.url()
      console.warn('First isolated DEV render returned 500 for '+target+
        '. Retrying exact document once; repeated 500 remains a hard failure.')
      await pause(350)
      const rejectedDocumentErrors = pageErrors.slice(errorCountBeforeDocument)
      // Do not waive errors from a successfully loaded page, an unrelated
      // host, a different JS exception or multiple failures.
      const exactIsolatedFirst500 = rejectedDocumentErrors.length <= 1 &&
        rejectedDocumentErrors.every(error =>
          error.message === 'Unexpected end of JSON input' &&
          error.url === rejectedDocumentUrl &&
          new URL(error.url).origin === origin)
      assert.ok(exactIsolatedFirst500,
        'An isolated first 500 cannot excuse unrelated page JavaScript errors')
      response = await page.reload(options)
      if (response?.status() === 200) {
        for (const error of rejectedDocumentErrors) recoveredFailedDevErrors.add(error)
      }
    }
    assert.ok(response, `No document response for ${target}`)
    assert.equal(response.status(), 200, target)
    // Archived source books may contain a nested main landmark of their own.
    // Readiness concerns the outer application page, not imported source markup.
    await expect(page.locator('main').first()).toBeVisible()
  }
  if (live) {
    for (let i = 0; ; i++) {
      await navigate('/en/about')
      if (await page.locator('[data-about-primary-testimonials="en"] [data-about-testimonial-audio="en"][data-testimonial-video-id]').count() === 6) break
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
  let russianPresentationVerified = false
  for (const home of ['/', '/ru']) {
    await navigate(home)
    // The withdrawn 2026-10-01 intro remains retired; this is a different
    // owner-approved 2026-10-30 presentation, not an old HeyGen fallback.
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    const presentation = page.locator('[data-video-slot="home-presentation"]')
    if (home === '/ru') {
      // A production-domain check may run before this PR is deployed.
      // Local/preview builds MUST show the approved RU presentation.
      if (!live || await presentation.count()) {
        await expect(presentation).toHaveCount(1)
        await expect(presentation).toHaveAttribute('data-video-locale', 'ru')
        await expect(presentation.locator('iframe')).toHaveCount(0)
        const play = presentation.locator('button.site-video-play')
        await expect(play).toBeEnabled({ timeout: 30000 })
        await play.click()
        await expect(presentation.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/G0Db6yOCMto\?/, { timeout: 10000 })
        russianPresentationVerified = true
      }
    } else if (await presentation.count()) {
      // English is visible only if a separately approved English YouTube
      // presentation exists; never reuse the Russian publication.
      await expect(presentation).toHaveAttribute('data-video-locale', 'en')
      await expect(presentation.locator('iframe')).toHaveCount(0)
    }
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
  }
  pass(`${live ? 'Production' : 'Local'}: withdrawn intros hidden; EN publication gate checked`)
  if (russianPresentationVerified) {
    pass(`${live ? 'Production' : 'Local'}: approved RU presentation click-to-iframe verified`)
  } else {
    const skipped = 'SKIPPED: production RU presentation slot absent; click-to-iframe not verified'
    skippedResults.push(skipped)
    console.log(skipped)
  }

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
      // The owner-approved mobile Services page deliberately hides the legacy
      // method-video gallery and intro; desktop above still verifies both.
      // On phones validate the replacement three-scenario Personal video card
      // and its real first-party studio destination, not a hidden old player.
      await expect(intro.locator('button.site-video-play')).toBeHidden()
      await expect(visibleGallery).toBeHidden()
      const videoPanel = page.locator('[data-services-unified-panel="video"]')
      const videoTrigger = videoPanel.locator(':scope > button')
      await expect(videoTrigger).toBeVisible()
      await expect(videoTrigger).toHaveAttribute('aria-expanded', 'false')
      const mobileVideo = videoPanel.locator('[data-assist-video-generation]')
      await expect(mobileVideo).toBeHidden()
      // A dev SSR snapshot can paint before Next attaches client event
      // handlers. Do not misclassify an unhydrated early click as an app
      // state regression; require the real Next router hydration first.
      await expect.poll(
        () => page.evaluate(() => history.pushState.toString().includes("__NA")),
        { timeout: 30000, message: 'Services video panel must hydrate before the click' },
      ).toBe(true)
      await videoTrigger.click()
      await expect(videoTrigger).toHaveAttribute('aria-expanded', 'true')
      await expect(mobileVideo).toBeVisible()
      await expect(mobileVideo.locator('a[data-assist-video-scenario]')).toHaveCount(3)
      const createVideo = mobileVideo.locator('a[data-assist-video-create]')
      await expect(createVideo).toBeVisible()
      await expect(createVideo).toHaveAttribute('href', '/' + locale + '/holistic-support/mandala')
      const createBox = await createVideo.boundingBox()
      assert.ok(createBox && createBox.height >= 44, 'Services mobile create-video action is finger-sized: ' + locale)
      await expect(mobileVideo.locator('iframe')).toHaveCount(0)
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
    const daoHandoff=await assertMessengerOnlyCapture(page.locator('main[data-free-entry-landing="dao"]'),expect,
      {locale:'ru',label:'Dao free-start messenger-only contact'});
    assert.match(daoHandoff.draft,/У-Син|Wu Xing/,
      'The selected Dao/Wu Xing profile must be named in the message draft')
    assert.equal(await page.locator('[data-service-video="overview"]').count(), 0,
      'The separate Dao free start must not imply a video consultation')
    pass('Nine video service routes and the separate Dao free entry preserve exact approved formats')
  }

  await navigate('/en/about')
  await expect(page.locator('#psychic-alchemy-video')).toBeVisible()
  assert.equal(await page.locator('iframe').count(), 0)
  // The exact release must show original-language players first and mount the
  // other approved language only after an explicit disclosure click.
  const enIds = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js',
    'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'].sort()
  const ruIds = ['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM',
    'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w'].sort()
  const primaryGrid = page.locator('[data-about-primary-testimonials="en"]')
  await expect(primaryGrid).toHaveCount(1)
  {
    const primary = primaryGrid.locator('[data-about-testimonial-audio="en"][data-testimonial-video-id]')
    await expect(primary).toHaveCount(enIds.length)
    const ids = await primary.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testimonial-video-id')).sort())
    assert.deepEqual(ids, enIds, 'English About must lead with the six authentic English originals')
    const disclosure = page.locator('[data-about-other-language-testimonials="true"]')
    await expect(disclosure).toHaveCount(1)
    await expect(disclosure.locator('[data-about-secondary-testimonials]')).toHaveCount(0)
    // Wait for real React hydration before the genuine details click.
    // An SSR-native toggle alone cannot mount lazy other-language videos.
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-about-other-language-testimonials="true"]')
      const key = Object.keys(element || {}).find(name => name.startsWith('__reactProps$'))
      return Boolean(key && typeof element[key]?.onToggle === 'function')
    }, null, { timeout: 30000 })
    await disclosure.locator('summary').click()
    const secondary = disclosure.locator('[data-about-secondary-testimonials="ru"] [data-about-testimonial-audio="ru"][data-testimonial-video-id]')
    await expect(secondary).toHaveCount(ruIds.length)
    const idsAfterOpen = await secondary.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testimonial-video-id')).sort())
    assert.deepEqual(idsAfterOpen, ruIds, 'Disclosed RU archive retains six exact Russian originals')
    await expect(page.locator('iframe')).toHaveCount(0)
    pass((live ? 'Production' : 'Local')+': six EN first, six RU only after disclosure; no eager iframe')
  }
  await expect(page.locator('#personal-consultation-title')).toBeVisible()
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
  } else {
    // The required "admin-verified-owner-browser" job independently runs
    // the same real editor publication/review journeys with the protected v2
    // owner-session bridge, synthetic migrated Postgres and isolated Redis.
    // Public browser smoke must never forge retired v1 administrator cookies.
    skippedResults.push('SKIPPED: authenticated owner editor is verified in its independent v2 session browser job')
  }
  if (!live) {
    await verifyAboutTestimonials(origin)
    pass('About original-language disclosures: Chromium and WebKit at 320/390/430 in EN/RU/ES')
  }
  // Provisional failures remain in pageErrors. All errors on actual accepted
  // documents and every LIVE route still fail the original strict gate.
  assert.deepEqual(pageErrors.filter(error => !recoveredFailedDevErrors.has(error)), [],
    'Unexpected page JavaScript errors on accepted documents')
  pass('No page JavaScript errors on accepted documents')
  writeFileSync(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ mode: live ? 'read-only production' : 'isolated Redis browser', passed: results, skipped: skippedResults }, null, 2))
  console.log(`VERIFIED: ${results.length} scenario groups`)
} catch (error) {
  if (!live) { try { console.error('Isolated application log:', readFileSync(`${evidence}/local-app.log`, 'utf8')) } catch { /* not started */ } }
  throw error
} finally {
  if (browser) await browser.close()
  if (app) app.kill('SIGTERM')
  if (server) server.close()
}
