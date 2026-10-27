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

// BEGIN bounded public detail-video contract (source-tested, no browser/provider calls).
// These literals are independent of the renderer and registry. Update only with
// source-routing plus independent delivery/isolation evidence; not registry self-comparison.
const detailVideoCases = [
  {"alias": "alchemy-en", "route": "/en/services/alchemy-of-soul", "canonicalPath": "/en/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "7c6b243f048b9c0581ae29619a4a89fc"},
  {"alias": "hypnotherapy-en", "route": "/en/services/hypnotherapy-course", "canonicalPath": "/en/services/hypnotherapy-course", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "8c1634ce904434a91931429b6a7eefe1"},
  {"alias": "alchemy-ru", "route": "/ru/services/alchemy-of-soul", "canonicalPath": "/ru/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "Cz6SxXJNZbw"},
  {"alias": "hypnotherapy-ru", "route": "/ru/services/hypnotherapy-course", "canonicalPath": "/ru/services/hypnotherapy-course", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "eLsjFaKCBhI"},
  {"alias": "alchemy-legacy-en", "route": "/en/services/psychohomeopathy", "canonicalPath": "/en/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "7c6b243f048b9c0581ae29619a4a89fc"},
  {"alias": "alchemy-legacy-ru", "route": "/ru/services/psychohomeopathy", "canonicalPath": "/ru/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "Cz6SxXJNZbw"},
  {"alias": "imagery-es", "route": "/es/services/imagery-therapy", "canonicalPath": "/es/services/imagery-therapy", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "es", "audioLanguage": "en", "provider": "heygen", "videoId": "8c1634ce904434a91931429b6a7eefe1"},
  {"alias": "constellations-en", "route": "/en/services/systemic-constellations", "canonicalPath": "/en/services/systemic-constellations", "selector": "[data-service-video=\"constellation-case\"]", "locale": "en", "audioLanguage": "en", "provider": "youtube", "videoId": "sfVFOQNr2qk"},
  {"alias": "free-review-en", "route": "/en/services/free-situation-review", "canonicalPath": "/en/services/free-situation-review", "selector": "[data-free-review-intro-video][data-intro-audio-language=\"en\"]", "locale": "en", "audioLanguage": "en", "provider": "youtube", "videoId": "s30Y42IwPcg"},
]

function detailVideoWatchUrl(contract) {
  return contract.provider === 'heygen'
    ? `https://app.heygen.com/share/${contract.videoId}`
    : `https://www.youtube.com/watch?v=${contract.videoId}`
}

function classifyDetailVideoSource(raw, contract) {
  if (typeof raw !== 'string' || !raw) return 'missing'
  if (raw.length > 2048 || raw !== raw.trim()) return 'invalid'
  let url
  try { url = new URL(raw) } catch { return 'invalid' }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return 'invalid'
  const origin = contract.provider === 'heygen' ? 'https://app.heygen.com' : 'https://www.youtube-nocookie.com'
  if (url.origin !== origin) return 'wrong-origin'
  const path = contract.provider === 'heygen' ? `/embeds/${contract.videoId}` : `/embed/${contract.videoId}`
  if (url.pathname !== path) return 'wrong-video'
  if (contract.provider === 'heygen') return url.search ? 'wrong-parameters' : 'match'
  const parameters = { autoplay: '1', playsinline: '1', rel: '0', hl: contract.locale, cc_lang_pref: contract.audioLanguage }
  if ([...url.searchParams].length !== Object.keys(parameters).length) return 'wrong-parameters'
  for (const [name, value] of Object.entries(parameters)) {
    if (url.searchParams.getAll(name).length !== 1 || url.searchParams.get(name) !== value) return 'wrong-parameters'
  }
  return 'match'
}
// END bounded public detail-video contract.

// BEGIN bounded About gallery contract (public identity/rendering metadata only).
// The About archive is not the compact home/services preview. Keep these ten
// independently pinned IDs in EN-first order, including each original audio language.
const aboutTestimonialVideos = [
  ['Dk0LBmOivQo', 'en'], ['aUJde6A-9p0', 'en'], ['fE6sD1zr1Js', 'en'],
  ['itjo2_z2NGk', 'en'], ['4NrryHcEF1A', 'en'], ['hYwRNMxIMjc', 'en'],
  ['MIVLm1GUTtM', 'ru'], ['ttQxUHopaUM', 'ru'], ['VABgpmn4ZYA', 'ru'], ['muOnIHllI7E', 'ru'],
]
function classifyAboutGallery(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.cards)) return 'invalid'
  if (snapshot.galleryCount !== 1) return 'gallery-count'
  if (snapshot.locale !== 'en') return 'gallery-locale'
  if (snapshot.cards.length !== aboutTestimonialVideos.length) return 'card-count'
  if (snapshot.playerCount !== aboutTestimonialVideos.length) return 'player-count'
  if (snapshot.iframeCount !== 0) return 'eager-iframe'
  if (snapshot.watchLinkCount !== 0) return 'external-watch-link'
  for (const [index, [id, language]] of aboutTestimonialVideos.entries()) {
    const card = snapshot.cards[index]
    if (!card || card.id !== id) return 'video-order-or-identity'
    if (card.playerCount !== 1) return 'card-player-count'
    if (card.playerLocale !== 'en') return 'player-locale'
    if (card.audioLanguage !== language) return 'audio-language'
    if (card.playCount !== 1 || card.playDisabled !== false) return 'poster-not-ready'
    if (card.posterSrc !== `/images/holistic-house/testimonial-posters/${id}.webp`) return 'poster-identity'
  }
  return 'match'
}
// END bounded About gallery contract.

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
  async function readAboutGallery() {
    // Read only public identity/cardinality attributes. No titles, narratives,
    // transcripts, frame URLs, HTML dumps or client information enter diagnostics.
    return page.locator('#about-testimonials[data-personal-testimonials="about"]').evaluateAll(galleries => {
      const gallery = galleries[0]
      const cards = gallery ? [...gallery.querySelectorAll('[data-testimonial-video-id]')].slice(0, 11) : []
      return {
        galleryCount: Math.min(galleries.length, 2), locale: gallery?.getAttribute('lang') ?? null,
        playerCount: gallery ? Math.min(gallery.querySelectorAll('.site-video-player').length, 11) : 0,
        iframeCount: gallery ? Math.min(gallery.querySelectorAll('iframe').length, 1) : 0,
        watchLinkCount: gallery ? Math.min(gallery.querySelectorAll('.site-video-watch-link').length, 1) : 0,
        cards: cards.map(card => {
          const player = card.querySelector('.site-video-player')
          const play = player?.querySelector('button.site-video-play')
          return {
            id: card.getAttribute('data-testimonial-video-id'),
            playerCount: Math.min(card.querySelectorAll('.site-video-player').length, 2),
            playerLocale: player?.getAttribute('lang') ?? null,
            audioLanguage: player?.querySelector('.site-video-caption [lang]')?.getAttribute('lang') ?? null,
            playCount: player ? Math.min(player.querySelectorAll('button.site-video-play').length, 2) : 0,
            playDisabled: play ? play.disabled : null,
            posterSrc: player?.querySelector('.site-video-fallback-poster')?.getAttribute('src') ?? null,
          }
        }),
      }
    })
  }
  if (live) {
    for (let i = 0; ; i++) {
      await navigate('/en/about')
      if (classifyAboutGallery(await readAboutGallery()) === 'match') break
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

    for (const contract of detailVideoCases) {
      const { alias, route, selector, locale, audioLanguage, provider } = contract
      let block, phase = 'navigate'
      console.log(`CHECK: video-detail ${alias}`)
      try {
        await navigate(route)
        assert.equal(new URL(page.url()).pathname, contract.canonicalPath, `Video detail ${alias}: canonical route`)
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale)
        phase = 'poster'
        block = page.locator(selector)
        await expect(block).toHaveCount(1)
        await block.scrollIntoViewIfNeeded()
        await expect(block.locator('.site-video-player')).toHaveAttribute('lang', locale)
        await expect(block.locator('.site-video-caption [lang]').first()).toHaveAttribute('lang', audioLanguage)
        await expect(block.locator('.site-video-play')).toBeVisible()
        assert.equal(await block.locator('iframe').count(), 0, `Video detail ${alias}: eager third-party iframe`)
        const transcript = block.locator('details.site-video-transcript')
        if (await transcript.count() && !(await transcript.evaluate(node => node.open))) await transcript.locator('summary').click()
        // Check the independently pinned original identity without printing unknown hrefs.
        await expect.poll(async () => (await block.locator('.site-video-watch-link').first().getAttribute('href')) === detailVideoWatchUrl(contract),
          { message: `Video detail ${alias}: original watch identity` }).toBe(true)
        phase = 'play'
        await block.locator('.site-video-play').click()
        await expect(block.locator('iframe')).toHaveCount(1)
        // Parse exact origin/path and language parameters, not a permissive URL prefix.
        // Failures report only a fixed category, never an unknown iframe URL/query.
        await expect.poll(async () => classifyDetailVideoSource(await block.locator('iframe').getAttribute('src'), contract),
          { timeout: 10000, message: `Video detail ${alias}: approved embed identity` }).toBe('match')
        await expect.poll(async () => (await block.locator('iframe').getAttribute('data-video-playback')) === provider,
          { message: `Video detail ${alias}: playback provider` }).toBe(true)
        assert.equal(await block.locator('.site-video-play').count(), 0, `Video detail ${alias}: poster remained after Play`)
        console.log(`PASS: video-detail ${alias}`)
      } catch (error) {
        let snapshot = { status: 'unavailable' }
        try {
          const frames = block ? await block.locator('iframe').evaluateAll(nodes => nodes.slice(0, 2).map(node => ({
            src: node.getAttribute('src'), provider: node.getAttribute('data-video-playback'),
          }))) : []
          snapshot = {
            status: 'captured', canonicalPathMatches: new URL(page.url()).pathname === contract.canonicalPath,
            blockCount: block ? Math.min(await block.count(), 2) : 0,
            frameCount: block ? Math.min(await block.locator('iframe').count(), 2) : 0,
            frames: frames.map(frame => ({ source: classifyDetailVideoSource(frame.src, contract), providerMatches: frame.provider === provider })),
          }
        } catch { /* Diagnostic failure must not replace the original assertion. */ }
        const failure = { schemaVersion: 1, caseAlias: alias, phase, ...snapshot }
        writeFileSync(`${evidence}/detail-route-failure.json`, JSON.stringify(failure, null, 2))
        console.error('FAIL: video-detail', JSON.stringify(failure))
        throw error
      }
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
  await expect.poll(async () => classifyAboutGallery(await readAboutGallery()),
    { timeout: 10000, message: 'About EN gallery: exact ten locale-first identities, local posters and opt-in players' }).toBe('match')
  await expect(page.locator('#personal-consultation-title')).toBeVisible()
  pass(`${live ? 'Production' : 'Local'}: approved About intro, ten exact locale-first testimonials, form; no eager iframe`)
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
    const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
    await adminContext.addCookies([{ name: 'prescriptions_admin', value: createHmac('sha256', testToken).update('prescriptions-admin-v1').digest('base64url'), domain: '127.0.0.1', path: '/admin', httpOnly: true, sameSite: 'Strict' }])
    const editor = await adminContext.newPage()
    editor.on('pageerror', error => pageErrors.push(error.message))
    async function openEditor(target = editor) {
      await target.goto(`${origin}/admin/videos`)
      await target.locator('.prescription-admin-header button[lang="en"]').click()
      await expect(target.locator('.site-video-manager')).toHaveAttribute('lang', 'en')
      // All 16 canonical site-video slots are selectable in the same editor.
      await expect(target.locator('.site-video-placement-list button')).toHaveCount(16)
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
      const publicSlots = SITE_VIDEO_SLOTS.filter(slot => locale === 'en' || !slot.id.startsWith('method-'))
      for (const slot of publicSlots) {
        console.log(`CHECK: publish ${slot.id}:${locale}`)
        await choose(slot, locale)
        const title = `QA ${slot.id} ${locale}`
        await fill(title)
        await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
        await save('publish')
        const destination = await editor.locator('.site-video-editor-heading > a').getAttribute('href')
        await navigate(destination)
        if (slot.id === 'thank-you') {
          // The thank-you page deliberately hides every video before a valid
          // tab-local enquiry receipt. Seed only an isolated synthetic browser
          // receipt; no real lead, payment, private account or session is touched.
          assert.equal(await page.locator('.site-video-player').filter({ hasText: title }).count(), 0)
          await page.evaluate(key => {
            window.sessionStorage.setItem(key, JSON.stringify({
              referenceCode: 'HH-0123456789AB', createdAt: Date.now(),
            }))
          }, RECEIPT_SESSION_KEY)
          await page.reload({ waitUntil: 'domcontentloaded' })
        }
        await expect(page.locator('.site-video-player').filter({ hasText: title })).toHaveCount(1)
      }
      pass(`All ${publicSlots.length} ${locale.toUpperCase()} public placements publish via real server actions and isolated Redis`)
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
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    assert.ok(!(await page.content()).includes('QA newer draft preserves publication'))
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
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
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    pass('Concurrent edit rejected; refresh keeps edits and resets review; republish works')
    assert.equal(await page.locator('iframe').count(), 0)
    // Owner withdrew approval: even a newly published archived home intro cannot
    // leak back onto the public homepage. Testimonial videos remain independent.
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
    pass('Archived unpublished-quality home introduction cannot reappear in public')
    await save('hide', second)
    await navigate('/?lang=en')
    // Hiding a managed intro should leave independently published testimonials intact.
    assert.equal(await page.locator('[data-video-slot="home-intro"] .site-video-player').count(), 0)
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    await openEditor(second)
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    pass('Hide persists, retains draft and leaves other language unchanged')
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('.site-video-placement-list button')).toHaveCount(1)
    await expect(editor.locator('.site-video-editor-heading > a')).toHaveAttribute('href', '/es/about')
    await fill('QA Spanish About independent publication')
    await save('publish')
    await navigate('/es/about')
    await expect(page.getByText('QA Spanish About independent publication', { exact: true })).toHaveCount(1)
    await save('hide')
    await navigate('/es/about')
    await expect(page.locator('[data-video-slot="about-intro"]')).toHaveCount(0)
    await navigate('/en/about')
    await expect(page.getByText('QA about-intro en', { exact: true })).toHaveCount(1)
    await navigate('/ru/about')
    await expect(page.getByText('QA about-intro ru', { exact: true })).toHaveCount(1)
    await openEditor()
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA Spanish About independent publication')
    pass('Spanish About publish/hide/reload via real actions preserves EN/RU and never falls back to English')
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
