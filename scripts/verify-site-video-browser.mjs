// Synthetic credentials + ephemeral CI Redis only. --live performs no login or
// mutation on production. Run with the production application's locked build.
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:https'
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { promisify } from 'node:util'
import {classifyIsolatedVideoRedisCommand} from './helpers/isolate-video-redis-command.mjs'
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
        const redisScope=classifyIsolatedVideoRedisCommand(command)
        assert.notEqual(redisScope,'deny')
        if(redisScope==='synthetic-missing'){
          // Missing optional EN YouTube upload is not a fabricated player.
          response.writeHead(200,{'Content-Type':'application/json'})
          response.end(JSON.stringify({result:null}))
          return
        }
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
  // Next 15 DEV can briefly lack a clientReferenceManifest on the first
  // dynamically compiled /ru home render. Precompile both public Home routes
  // by an isolated HTTP GET before any browser page can receive that transient
  // server error. A genuine repeated 500 remains fatal; LIVE is unchanged.
  if(!live){
    for(const warmPath of ['/', '/ru']){
      let ready=false
      for(let attempt=0;attempt<3;attempt++){
        const response=await context.request.get(origin+warmPath,{timeout:60000})
        if(response.status()===200){ready=true;break}
        if(response.status()!==500)throw new Error('Next DEV warmup unexpected status '+response.status()+' on '+warmPath)
        await pause(450)
      }
      assert.ok(ready,'Next DEV public route failed first-render warmup: '+warmPath)
    }
  }
  const page = await context.newPage()
  const pageErrors = []
  // Keep every JavaScript error fatal and preserve bounded stack evidence.
  page.on('pageerror', error => pageErrors.push({ message: error.message,
    url: page.url(), stack: String(error.stack || '').slice(0, 1800) }))
  async function navigate(target) {
    const options = { waitUntil: live ? 'domcontentloaded' : 'load', timeout: 60000 }
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
      console.warn('First isolated DEV render returned 500 for '+target+
        '. Retrying exact document once; repeated 500 remains a hard failure.')
      await pause(350)
      response = await page.reload(options)
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
    ['/en/services?assist=quiz', 'services-intro', 'en', '48105a2f2228e7cb3a67391e97acaf8b', 's30Y42IwPcg'],
    ['/en/homeopathy', 'homeopathy-intro', 'en', '34df311e461509433b45929908a9097a', 'ILyRWyHtJoE'],
    ['/ru/services?assist=quiz', 'services-intro', 'ru', '79c2845577865979cd95ac40a08fc01a', 'Cz6SxXJNZbw'],
    ['/ru/homeopathy', 'homeopathy-intro', 'ru', '0f984780d06948b1e78166e6e553e4e9', 'Q9NvYECKWuc'],
  ]) {
    await navigate(target)
    if (slot === 'services-intro') {
      // The approved Services page keeps the introduction under an explicit About panel.
      // Exercise the real user-opened disclosure before validating the actual player.
      const about = page.locator('[data-services-unified-panel="about"]')
      await expect(about).toHaveCount(1)
      await expect.poll(
        () => page.evaluate(() => history.pushState.toString().includes("__NA")),
        { timeout: 30000, message: 'Services introduction requires hydrated disclosure' },
      ).toBe(true)
      await about.locator(':scope > button[aria-controls="services-unified-about"]').click()
      await expect(about).toHaveAttribute('data-expanded', 'true')
    }
    const block = page.locator(`[data-video-slot="${slot}"][data-video-locale="${locale}"]`)
    await expect(block).toHaveCount(1)
    assert.equal(await block.locator('iframe').count(), 0)
    const play = block.getByRole('button', { name: /^(Watch video|Open video|Смотреть видео):/ })
    if (live) await pause(1200)
    // English archival HeyGen IDs MUST have an actual verified upload receipt.
    // The isolated CI Redis is intentionally empty; its first click must fail closed.
    // The separately marked local fixture tests only the client click-to-iframe wiring.
    let expectedYouTubeId = youtubeId
    let isolatedReceiptRoute = null
    if (locale === 'en') {
      const endpoint = new URL('/api/public/english-intro-video?videoId='+encodeURIComponent(id), origin)
      const receiptResponse = await context.request.get(endpoint.href, { timeout: 15000 })
      assert.equal(receiptResponse.status(), 200, 'Verified-channel readback endpoint must respond')
      const payload = await receiptResponse.json()
      const verified = payload?.youtubeId
      assert.ok(verified === null || (typeof verified === 'string' && /^[A-Za-z0-9_-]{11}$/.test(verified)),
        'Never accept an unverifiable video ID')
      if (verified) {
        expectedYouTubeId = verified
        await play.click()
      } else {
        await play.click()
        await expect(block.locator('[data-english-video-source="youtube"]')).toContainText(
          'not yet been verified on the English YouTube channel', { timeout: 15000 })
        await expect(block.locator('iframe')).toHaveCount(0)
        if (live) throw new Error('LIVE blocked: missing verified English YouTube receipt for '+slot)
        // Isolated CI UI fixture is not provider confirmation or LIVE proof.
        isolatedReceiptRoute = url => url.pathname === '/api/public/english-intro-video' &&
          url.searchParams.get('videoId') === id
        await page.route(isolatedReceiptRoute, route => route.fulfill({
          status: 200, contentType: 'application/json',
          headers: { 'cache-control': 'no-store' },
          body: JSON.stringify({ youtubeId }),
        }))
        console.log('LOCAL_UI_FIXTURE_ONLY_NO_PROVIDER_PROOF '+slot)
        await play.click()
      }
    } else {
      await play.click()
    }
    if (live && await block.locator('iframe').count() === 0) {
      // Retry a click once after real hydration, not after a provider failure.
      await pause(1200)
      if (await play.count()) await play.click()
    }
    await expect(block.locator('iframe')).toHaveAttribute('src', new RegExp(
      `^https://www\\.youtube-nocookie\\.com/embed/${expectedYouTubeId}\\?`), { timeout: 15000 })
    await expect(block.locator('iframe')).toHaveAttribute('data-video-playback', 'youtube')
    if (isolatedReceiptRoute) await page.unroute(isolatedReceiptRoute)
  }
  let russianPresentationVerified = false
  for (const home of ['/?full=1', '/ru?full=1']) {
    await navigate(home)
    // The withdrawn 2026-10-01 intro remains retired; this is a different
    // owner-approved 2026-10-30 presentation, not an old HeyGen fallback.
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    const presentation = page.locator('[data-video-slot="home-presentation"]')
    if (home.startsWith('/ru')) {
      // A production-domain check may run before this PR is deployed.
      // Local/preview builds MUST show the approved RU presentation.
      if (!live || await presentation.count()) {
        await expect(presentation).toHaveCount(1)
        await expect(presentation).toHaveAttribute('data-video-locale', 'ru')
        await expect(presentation.locator('iframe')).toHaveCount(0)
        // This secondary player is below the initial Home fold. A DEV
        // DOMContentLoaded response may precede React hydration, leaving
        // its intentionally inert SSR Play button disabled. Simulate the
        // real visitor scrolling into view and prove hydration rather than
        // pressing an unbound control or waiving the playback assertion.
        await presentation.scrollIntoViewIfNeeded()
        if (!live) await page.waitForLoadState('load', { timeout: 60000 })
        await expect.poll(
          () => page.evaluate(() => history.pushState.toString().includes('__NA')),
          { timeout: 30000, message: 'RU presentation requires a hydrated Next router' },
        ).toBe(true)
        const play = presentation.locator('button.site-video-play')
        await expect(play).toHaveAttribute('aria-busy', 'false', { timeout: 30000 })
        await expect(play).toBeEnabled()
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
    await expect(page.locator('[data-home-dialogue-entry]')).toHaveCount(1)
    await expect(page.locator('[data-home-intent-form]')).toHaveCount(1)
    // Testimonial galleries now load only when the visitor explicitly expands
    // the lower catalogue, never before Ali's main composer is interactive.
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
  // Approved 10x3 Services catalogue: the legacy intro and video gallery remain
  // available when their informational panels are opened by the visitor.
  // First-screen Videos is a three-offer shelf, not a duplicate page or hidden checkout.
  if (!live) {
    for (const locale of ['en', 'ru']) {
      await navigate('/' + locale + '/services')
      await expect(page.locator('[data-support-programs-only]')).toHaveCount(1)
      await expect(page.locator('[data-services-unified-panel="about"]')).toHaveCount(0)
      await navigate('/' + locale + '/services?assist=quiz')
      await expect.poll(
        () => page.evaluate(() => history.pushState.toString().includes("__NA")),
        { timeout: 30000, message: 'Services media disclosures require hydrated React' },
      ).toBe(true)
      const aboutPanel = page.locator('[data-services-unified-panel="about"]')
      const galleryPanel = page.locator('[data-services-unified-panel="mytube"]')
      const intro = aboutPanel.locator('[data-services-meet] [data-video-slot="services-intro"][data-video-locale="' + locale + '"]')
      const gallery = galleryPanel.locator('#method-videos')
      await expect(aboutPanel).toHaveCount(1)
      await expect(galleryPanel).toHaveCount(1)
      await expect(intro.locator('button.site-video-play')).toBeHidden()
      await expect(gallery).toBeHidden()
      await aboutPanel.locator(':scope > button[aria-controls="services-unified-about"]').click()
      await galleryPanel.locator(':scope > button[aria-controls="services-unified-mytube"]').click()
      await expect(aboutPanel).toHaveAttribute('data-expanded','true')
      await expect(galleryPanel).toHaveAttribute('data-expanded','true')
      await expect(intro.locator('button.site-video-play')).toBeVisible()
      await expect(intro.locator('iframe')).toHaveCount(0)
      await expect(gallery).toBeVisible()
      await expect(gallery).toHaveAttribute('open', '')
      if (locale === 'en') {
        await expect(gallery.locator('[data-video-slot="method-hypnotherapy"] .site-video-play')).toBeVisible()
        await expect(gallery.locator('[data-video-slot="method-constellations"] .site-video-play')).toBeVisible()
      }
      // The original paid service modules remain mounted under the optional
      // nested details; the new three-offer cards are their primary discovery.
      const offers = page.locator('[data-services-studio-paid] [data-services-studio-card]')
      const expectedPaidOfferIds = ["monthly-support", "alchemy", "hypnotherapy", "constellations", "business", "remote-energy-support"]
      await expect(offers).toHaveCount(expectedPaidOfferIds.length)
      const paidOfferIds = await offers.evaluateAll(cards => cards.map(card => card.getAttribute('data-services-studio-card')))
      assert.deepEqual(paidOfferIds, expectedPaidOfferIds, 'Original Services paid catalogue changed: ' + locale)
      for (const [id, suffix] of [['alchemy', 'alchemy-of-soul'], ['hypnotherapy', 'hypnotherapy-course']]) {
        const hrefs = await page.locator('[data-services-studio-card="' + id + '"] a[href]')
          .evaluateAll(links => links.map(link => link.getAttribute('href')))
        assert.ok(hrefs.includes('/' + locale + '/services/' + suffix), id + ' route not reachable from Services')
      }
      // Return to the initial collapsed informational presentation before
      // checking the REAL phone UI: six upper category links + three video offers.
      await aboutPanel.locator(':scope > button[aria-controls="services-unified-about"]').click()
      await galleryPanel.locator(':scope > button[aria-controls="services-unified-mytube"]').click()
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(intro.locator('button.site-video-play')).toBeHidden()
      await expect(gallery).toBeHidden()
      const videoPanel = page.locator('[data-services-unified-panel="video"]')
      await expect(videoPanel).toBeVisible()
      const variants = videoPanel.locator(':scope > [data-services-three-visible] > [data-service-variant]')
      await expect(variants).toHaveCount(3)
      for (const variant of await variants.all()) {
        await expect(variant).toBeVisible()
        await expect(variant.locator('[data-service-price]')).toBeVisible()
        await expect(variant.locator('img')).toBeVisible()
        const buttons=variant.locator(':scope > [data-service-card-actions] > div[role="group"] > button')
        await expect(buttons).toHaveCount(2)
        await expect(buttons.first()).toBeVisible()
        await expect(buttons.nth(1)).toBeVisible()
      }
      const actions = variants.first().locator(':scope > [data-service-card-actions]')
      const controls = actions.locator(':scope > div[role="group"] > button')
      const details = controls.first()
      const order = controls.nth(1)
      await expect(details).toHaveAttribute('aria-expanded','false')
      await expect(order).toHaveAttribute('aria-expanded','false')
      const mobileVideo = videoPanel.locator('[data-assist-video-generation]')
      await expect(mobileVideo).toBeHidden()
      await details.click()
      await expect(details).toHaveAttribute('aria-expanded','true')
      await expect(order).toHaveAttribute('aria-expanded','false')
      const description = actions.locator(':scope > [data-service-card-details]')
      await expect(description).toBeVisible()
      await expect(description.locator('p')).toBeVisible()
      const studioLink = description.locator('a[href]')
      await expect(studioLink).toHaveCount(1)
      await expect(studioLink).toHaveAttribute('href', '/' + locale + '/holistic-support/mandala')
      const studioLinkBox = await studioLink.boundingBox()
      assert.ok(studioLinkBox && studioLinkBox.height >= 44, 'Mobile video studio link must be finger-sized: ' + locale)
      await expect(actions.locator(':scope > [data-service-card-order]')).toBeHidden()
      await order.click()
      await expect(details).toHaveAttribute('aria-expanded','false')
      await expect(order).toHaveAttribute('aria-expanded','true')
      await expect(description).toBeHidden()
      const orderRegion = actions.locator(':scope > [data-service-card-order]')
      await expect(orderRegion).toBeVisible()
      await expect(orderRegion.locator('[data-messenger-only-channel="whatsapp"]')).toBeVisible()
      await expect(orderRegion.locator('[data-messenger-only-channel="telegram"]')).toBeVisible()
      await order.click()
      await expect(order).toHaveAttribute('aria-expanded','false')
      await expect(orderRegion).toBeHidden()
      await expect(mobileVideo.locator('iframe')).toHaveCount(0)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Services mobile overflow: ' + locale)
      await page.screenshot({ path: `${evidence}/services-${locale}-mobile-video.png`, fullPage: true })
      await page.setViewportSize({ width: 1365, height: 1000 })
    }
    pass('EN/RU Services legacy videos play after user disclosure; all 3 mobile video offers preserve Details, Order and links')

    // EN HeyGen masters must not expose an archival provider player/link.
    // Genuine LIVE proves a paired-channel receipt; isolated CI first asserts
    // no iframe and then uses a clearly labeled UI-only YouTube fixture.
    const detailRoutes = [
      ['/en/services/alchemy-of-soul', 'alchemy', null, '7c6b243f048b9c0581ae29619a4a89fc'],
      ['/en/services/hypnotherapy-course', 'hypnotherapy', null, '8c1634ce904434a91931429b6a7eefe1'],
      ['/ru/services/alchemy-of-soul', 'alchemy', 'https://www.youtube-nocookie.com/embed/Cz6SxXJNZbw?', null],
      ['/ru/services/hypnotherapy-course', 'hypnotherapy', 'https://www.youtube-nocookie.com/embed/eLsjFaKCBhI?', null],
      ['/en/services/psychohomeopathy', 'alchemy', null, '7c6b243f048b9c0581ae29619a4a89fc'],
      ['/ru/services/psychohomeopathy', 'alchemy', 'https://www.youtube-nocookie.com/embed/Cz6SxXJNZbw?', null],
      ['/es/services/imagery-therapy', 'hypnotherapy', null, '8c1634ce904434a91931429b6a7eefe1'],
      ['/en/services/systemic-constellations', 'constellation-case', 'https://www.youtube-nocookie.com/embed/sfVFOQNr2qk?', null],
      ['/en/services/free-situation-review', 'free-review-intro', 'https://www.youtube-nocookie.com/embed/s30Y42IwPcg?', null],
    ]
    for (const [route, topic, directYoutubePrefix, englishMasterId] of detailRoutes) {
      await navigate(route)
      if (route.endsWith('/psychohomeopathy')) {
        assert.equal(new URL(page.url()).pathname, route.replace('/psychohomeopathy', '/alchemy-of-soul'),
          'Legacy service redirects to its canonical Alchemy page')
      }
      const block = page.locator(topic === 'alchemy' ? '[data-alchemy-panel="video"]' :
        topic === 'free-review-intro' ? '[data-free-review-intro-video]' :
        '[data-service-video="' + topic + '"]')
      await expect(block).toHaveCount(1)
      await block.scrollIntoViewIfNeeded()
      const play = block.locator('.site-video-play')
      await expect(play).toBeVisible()
      await expect(play).toBeEnabled()
      await expect(block.locator('iframe')).toHaveCount(0)
      const transcript = block.locator('details.site-video-transcript')
      if (await transcript.count() && !(await transcript.evaluate(node => node.open)))
        await transcript.locator('summary').click()
      const offsite = block.locator('.site-video-watch-link').first()
      let expectedPrefix=directYoutubePrefix
      let isolatedRoute=null
      try {
        if (englishMasterId) {
          // Do not accept a Russian channel, guessed mirror or HeyGen URL.
          await expect(block.locator('a[href^="https://app.heygen.com"]')).toHaveCount(0)
          const endpoint = new URL('/api/public/english-intro-video?videoId='+
            encodeURIComponent(englishMasterId), origin)
          const reply = await context.request.get(endpoint.href,{timeout:15000})
          assert.equal(reply.status(),200,'Exact EN source lookup must respond')
          const data=await reply.json()
          assert.ok(data?.youtubeId===null||
            (typeof data?.youtubeId==='string'&&/^[A-Za-z0-9_-]{11}$/.test(data.youtubeId)),
            'EN video may expose only a validated permanent YouTube watch ID')
          if (data.youtubeId) {
            expectedPrefix='https://www.youtube-nocookie.com/embed/'+data.youtubeId+'?'
            await expect(offsite).toHaveAttribute('href',
              'https://www.youtube.com/watch?v='+data.youtubeId)
            await play.click()
          } else {
            await expect(offsite).toHaveCount(0)
            await play.click()
            await expect(block.locator('[data-english-video-source="youtube"]'))
              .toBeVisible({timeout:15000})
            await expect(block.locator('iframe')).toHaveCount(0)
            if (live) throw new Error('LIVE English upload receipt missing for '+route)
            // This fixture proves CLIENT UX only, not an actual provider upload.
            const fixtureId='QaFrame123_'
            isolatedRoute=url=>url.pathname==='/api/public/english-intro-video'&&
              url.searchParams.get('videoId')===englishMasterId&&url.searchParams.size===1
            await page.route(isolatedRoute,route=>route.fulfill({
              status:200,contentType:'application/json',headers:{'cache-control':'no-store'},
              body:JSON.stringify({youtubeId:fixtureId}),
            }))
            expectedPrefix='https://www.youtube-nocookie.com/embed/'+fixtureId+'?'
            console.log('LOCAL_UI_FIXTURE_ONLY_NO_PROVIDER_PROOF '+route)
            await expect(play).toBeEnabled()
            await play.click()
          }
        } else {
          await expect(offsite).toHaveAttribute('href',/^https:\/\/www\.youtube\.com\/watch\?v=/)
          await play.click()
        }
        await expect.poll(async()=>{
          const src=await block.locator('iframe').getAttribute('src')
          return typeof src==='string'&&src.startsWith(expectedPrefix)
        },{timeout:15000,message:route+' must embed the exact approved YouTube source'}).toBe(true)
        await expect(block.locator('iframe')).toHaveAttribute('data-video-playback','youtube')
        await expect(play).toHaveCount(0)
      } finally {
        if(isolatedRoute)await page.unroute(isolatedRoute)
      }
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
      // Do not abort in-flight Next DEV RSC/JSON while immediately navigating
      // away at DOMContentLoaded. All page errors remain fatal below.
      if (!live) {
        await page.waitForLoadState('load', { timeout: 30000 })
        // Next DEV keeps background RSC/metadata requests alive; networkidle can
        // wait forever without indicating a page defect. Keep the real load
        // readiness, all 14 route/overflow checks, and fatal page errors.
      }
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
  assert.deepEqual(pageErrors, [], 'Unexpected page JavaScript errors')
  pass('No page JavaScript errors')
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
