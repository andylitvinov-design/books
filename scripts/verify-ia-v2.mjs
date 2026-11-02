// Write-capable acceptance harness: loopback + isolated CI Redis DB 15 ONLY.
// There is deliberately no --live flag, production URL, seed route or real credential.
import assert from 'node:assert/strict'
import { observePublicNavigation, resizePublicViewport } from './ia-public-navigation-diagnostics.mjs'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { createServer } from 'node:https'
import { request as httpRequest, createServer as createHttpServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, webkit, expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import pg from 'pg'
import { createPrescriptionStore } from '../lib/prescriptions/store.js'
import { createClient } from '../lib/clients/service.js'
import { getOwnerCabinetLink, rotateCabinetAccess, revokeCabinetAccess } from '../lib/clients/access.js'
import { createAssessment, updateAssessment, transitionAssessment } from '../lib/clients/assessments.js'
import { getSiteNavigation, getCompactNavigation } from '../lib/site-navigation-model.js'
import { loopbackHeaders, loopbackLocation } from './ia-v2-loopback-proxy.mjs'
assert.equal(process.env.CI, 'true', 'Only isolated CI execution is supported')
assert.equal(process.argv.length, 2, 'No runtime URL or live mode is accepted')
// Only the trusted, exact-merge Messenger CI selector can request a private IA lane.
// The default/manual path retains every original public navigation matrix.
const messengerOnly=process.env.HH_IA_MESSENGER_ONLY==='true'
const exec = promisify(execFile)
const origin = 'https://127.0.0.1:3444', apiOrigin = 'https://127.0.0.1:4443'
const evidence = '/tmp/ia222-evidence'
mkdirSync(evidence, { recursive: true })
const token = randomBytes(32).toString('base64url'), key = randomBytes(32).toString('base64')
const redactions = [token, key]
// Only the isolated loopback CI fixture may enable the test runtime. The app
// still executes its real verified identity, owner lookup and v2 session bridge.
assert.equal(process.env.HH_APP_TEST_RUNTIME, 'isolated')
assert.ok(!process.env.VERCEL, 'Synthetic owner authentication is CI-only')
const adminDb = new URL(process.env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
assert.equal(adminDb.hostname, '127.0.0.1')
assert.equal(adminDb.pathname, '/hh_app_test')
const authOrigin = 'http://127.0.0.1:54321'
const authKey = 'sb_publishable_synthetic_012345678901234567890'
const ownerId = '10000000-0000-4000-8000-000000000001'
const ownerSession = '20000000-0000-4000-8000-000000000001'
const ownerEmail = 'andy.litvinov@gmail.com' // Existing owner allowlist; synthetic local identity only.
const ownerClaims = {sub:ownerId,session_id:ownerSession,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}
const ownerJwt = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url') + '.' +
  Buffer.from(JSON.stringify(ownerClaims)).toString('base64url') + '.' + Buffer.from('synthetic-ci-signature').toString('base64url')
const ownerUser = {id:ownerId,aud:'authenticated',email:ownerEmail,user_metadata:{full_name:'Synthetic owner'},
  app_metadata:{provider:'google'},created_at:'2026-10-01T00:00:00Z',last_sign_in_at:new Date().toISOString()}
const environment = { NODE_ENV: 'test', VERCEL_ENV: 'preview', HH_APP_TEST_RUNTIME:'isolated', HH_APP_ENABLED:'true',
  HH_APP_SUPABASE_URL:authOrigin, HH_APP_SUPABASE_PUBLISHABLE_KEY:authKey,
  HH_APP_DATABASE_URL:'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
  HH_APP_ENCRYPTION_KEY:Buffer.alloc(32).toString('base64'), HH_APP_ALLOWED_ORIGINS:'https://localhost:3203',
  PRESCRIPTIONS_KV_REST_API_URL: apiOrigin, PRESCRIPTIONS_KV_REST_API_TOKEN: token,
  PRESCRIPTIONS_DATA_ENCRYPTION_KEY: key, PRESCRIPTIONS_ADMIN_TOKEN: token, PRESCRIPTIONS_ADMIN_PIN: '' }
const certificate = { key: readFileSync('/tmp/ia222-key.pem'), cert: readFileSync('/tmp/ia222-cert.pem') }
const results = []
const publicNavigationDiagnostics = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let bridge, proxy, authProvider, app, browser, secondBrowser, logs = ''
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
async function authenticateOwner(context) {
  const jar = new Map()
  const client = createServerClient(authOrigin, authKey, {
    auth:{experimental:{appendPkceFlowIdToRedirects:true}},
    cookieOptions:{name:'hh-app-auth',httpOnly:true,secure:false,sameSite:'lax',path:'/'},
    cookies:{encode:'tokens-only',getAll(){return [...jar].map(([name,value])=>({name,value}))},
      setAll(items){for(const {name,value} of items)jar.set(name,value)}},
  })
  const {error}=await client.auth.setSession({access_token:ownerJwt,refresh_token:'synthetic-local-refresher'})
  assert.equal(error,null,'Local synthetic identity must be verified by the provider double')
  assert.ok([...jar.keys()].some(name=>/^hh-app-auth(?:\.\d+)?$/.test(name)))
  await context.addCookies([...jar].map(([name,value])=>({name,value,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax',secure:false})))
  const denied=await context.request.get(origin+'/admin',{maxRedirects:0})
  assert.ok([303,307,308].includes(denied.status()),'SDK-only identity must not bypass admin bridge')
  const opened=await context.request.post(origin + '/api/app/practitioner/open',{
    data:{destination:'cabinet'},headers:{Origin:origin},timeout:30000,
  })
  assert.equal(opened.status(),200,'real verified practitioner bridge must issue the owner session')
  assert.equal((await opened.json()).redirectUrl,'/admin')
  assert.ok((await context.cookies(origin+'/admin')).some(cookie=>cookie.name==='prescriptions_admin' && /^v2\.[A-Za-z0-9_-]{43}$/.test(cookie.value)))
}

async function go(page, path) {
  const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  return response
}

function expectedMobileNavigation(locale) { return getCompactNavigation(locale) }
function visibleMobileLabel(locale, id) {
  const names = {
    en: {home:'Home',analysis:'Free Analysis',courses:'Courses',profile:'My Profile',alchemy:'Psychic Alchemy',pro:'Pro',temple:'Holistic Support'},
    ru: {home:'Домой',analysis:'Разбор',courses:'Курсы',profile:'Профиль',alchemy:'Алхимия души',pro:'Pro',temple:'Поддержка'},
    es: {home:'Inicio',analysis:'Análisis',courses:'Cursos',profile:'Mi perfil',alchemy:'Alquimia del Alma',pro:'Pro',temple:'Apoyo holístico'},
  }
  return names[locale][id]
}

async function assertPublicBottomNavigation(bottom, { locale, surface, label }) {
  const expected = expectedMobileNavigation(locale)
  const links = bottom.locator('[data-nav-item]')
  assert.deepEqual(await links.evaluateAll(elements => elements.map(el => ({ id: el.getAttribute('data-nav-item'), href: el.getAttribute('href') }))), expected.map(({ id, href }) => ({ id, href })), label + ': exact seven bottom destinations')
  await expect(links).toHaveCount(7)
  const visible = await bottom.isVisible()
  for (let index = 0; index < expected.length; index++) {
    await expect(links.nth(index)).toHaveText(visibleMobileLabel(locale, expected[index].id))
    if (visible) await expect(links.nth(index)).toHaveAccessibleName(expected[index].ariaLabel)
  }
  const active = ({home:'home',analysis:'analysis',courses:'courses',academy:'courses',pro:'pro',profile:'profile',alchemy:'alchemy',temple:'temple',
    'temple-support':'temple','services/free-situation-review':'analysis',
    'services/alchemy-of-soul':'alchemy','services/psychohomeopathy':'alchemy',
    'client':'profile','client/tests':'profile','personality-profiles':'profile','temple-insights':'temple','holistic-support':'temple'})[surface]
  await expect(bottom.locator('[aria-current="page"]')).toHaveCount(active ? 1 : 0)
  if (active) await expect(bottom.locator('[data-nav-item="' + active + '"]')).toHaveAttribute('aria-current', 'page')
  return expected
}

async function verifyDirectNavigation(nav, { locale, surface, expected, label }) {
  const freeReviewHref = '/' + locale + '/services/free-situation-review'
  const directions = expected.filter(item => ['energy','love','business'].includes(item.id))
  // Global My Space dialog is available across public routes.
  const expectedHeader = [...directions.map(({id,href}) => ({id,href})), { id: 'cabinet', href: null }]
  assert.deepEqual(await nav.locator(':scope > a').evaluateAll(elements => elements.filter(el => !['shop','cart'].includes(el.getAttribute('data-nav-item'))).map(el => el.getAttribute('href'))), [freeReviewHref, ...directions.map(item => item.href), '/' + locale + '/about'], label + ': exact direct header destinations')
  assert.deepEqual(await nav.locator(':scope > [data-nav-item]').evaluateAll(elements => elements.filter(el => !['shop','cart'].includes(el.getAttribute('data-nav-item'))).map(el => ({ id: el.getAttribute('data-nav-item'), href: el.getAttribute('href') }))), expectedHeader, label + ': exact header destinations')
  const current = nav.locator(':scope > a[aria-current="page"]')
  await expect(current).toHaveCount(directions.some(item => item.id === surface) ? 1 : 0)
  if (directions.some(item => item.id === surface)) await expect(current).toHaveAttribute('href', directions.find(item => item.id === surface).href)
}

async function verifySiteMenu(page, header, { locale, surface, label, expectedMenu, inViewport }) {
  const menu = header.locator('details.site-main-menu')
  const trigger = menu.locator('summary')
  const links = menu.locator('.site-main-menu-panel a')
  await expect(menu).toHaveCount(1)
  await expect(menu).toHaveJSProperty('open', false)
  await inViewport(trigger, label + '/site-menu')
  assert.deepEqual(await links.evaluateAll(elements => elements.map(el => el.getAttribute('href'))), expectedMenu, label + ': exact site-menu destinations')
  await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1)
  const activeMenuHref = surface === 'home' ? (locale === 'en' ? '/' : '/' + locale) :
    surface === 'library' ? '/' + locale + '/library' :
    surface === 'services' ? '/' + locale + '/services' :
    surface === 'academy' ? '/' + locale + '/academy' :
    getSiteNavigation(locale).find(item => item.id === surface)?.href
  await expect(menu.locator('a[aria-current="page"]')).toHaveAttribute('href', activeMenuHref)
  await trigger.focus()
  await trigger.press('Enter')
  await expect(menu).toHaveJSProperty('open', true)
  // The menu is deliberately scrollable; each destination must become
  // reachable within the viewport, not fit simultaneously at every height.
  for (const link of await links.all()) {
    await link.scrollIntoViewIfNeeded()
    await inViewport(link, label + '/site-menu-link')
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Open site menu overflow: ' + label)
  await trigger.press('Tab')
  await expect(links.first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveJSProperty('open', false)
  await expect(trigger).toBeFocused()
  // Exercise a real menu navigation to another public surface after the matrix's
  // current-page checks, so its bottom-navigation active state stays meaningful.
  await trigger.press('Enter')
  await expect(menu).toHaveJSProperty('open', true)
  const destination = '/' + locale + '/' + (surface === 'library' ? 'services' : 'library')
  const target = menu.locator('a[href="' + destination + '"]')
  await expect(target).toHaveCount(1)
  await target.click()
  await expect(page).toHaveURL(origin + destination)
  await expect(header.locator('details.site-main-menu')).toHaveJSProperty('open', false)
}

async function verifyPublicHeaderMatrix(page, engine) {
  const diagnostic = await observePublicNavigation(page, { engine, origin, record: event => publicNavigationDiagnostics.push(event) })
  try {
  const originalViewport = page.viewportSize()
  const inViewport = async (locator, label) => {
    await expect(locator).toBeVisible()
    const box = await locator.boundingBox()
    const { width, height } = page.viewportSize()
    const fits = box && box.x >= -1 && box.x + box.width <= width + 1 && box.y >= -1 && box.y + box.height <= height + 1 && box.width >= 44 && box.height >= 44
    if (!fits) console.error('IA_CONTROL_GEOMETRY', label, JSON.stringify({box, viewport:{width,height}}))
    assert.ok(fits, label + ': visible 44px control must fit viewport')
  }
  // Keep all eleven breakpoints in Chromium PR and manual full-matrix QA.
  // PR WebKit uses representative mobile/tablet/desktop widths to avoid
  // hundreds of repeated route navigations before private Safari assertions.
  const fullHeaderWidths = [320, 360, 374, 375, 390, 430, 768, 1023, 1024, 1100, 1280]
  const prWebkitHeaderWidths = [320, 390, 768, 1280]
  const publicHeaderWidths = engine === 'webkit' && process.env.GITHUB_EVENT_NAME === 'pull_request'
    ? prWebkitHeaderWidths : fullHeaderWidths
  for (const locale of ['en', 'ru', 'es']) {
    for (const [surface, path] of [['home', locale === 'es' ? '/es' : '/?lang=' + locale], ['energy', '/' + locale + '/explore/energy'], ['love', '/' + locale + '/explore/love'], ['business', '/' + locale + '/explore/business'], ['library', '/' + locale + '/library']]) {
      for (const width of publicHeaderWidths) {
        const label = engine + '/' + locale + '/' + surface + '/' + width
        diagnostic.phase(label)
        await resizePublicViewport(page, { width, height: 900 })
        assert.equal((await go(page, path)).status(), 200, label)
        const header = page.locator('header.house-header--services')
        await expect(header).toBeVisible()
        const expected = getSiteNavigation(locale)
        const expectedMenu = ['/' + locale + '/services/free-situation-review', ...getCompactNavigation(locale).map(item => item.href), '/' + locale + '/shop', '/' + locale + '/cart', '/' + locale + '/install', ...expected.filter(item => ['energy','love','business','library','events'].includes(item.id)).map(item => item.href), '/' + locale + '/temple-insights', '/' + locale + '/services', '/' + locale + '/about']
        await verifyDirectNavigation(header.locator('.site-navigation'), { locale, surface, expected, label })
        const cabinetEntry = header.locator('.site-cabinet-entry')
        const menu = header.locator('details.site-language-menu')
        const trigger = menu.locator('summary')
        await expect(trigger).toHaveText(locale.toUpperCase())
        await expect(cabinetEntry).toHaveCount(1)
        await expect(cabinetEntry).toHaveAttribute('aria-haspopup', 'dialog')
        await expect(cabinetEntry).toHaveAttribute('aria-controls', 'home-personal-space-dialog')
        await expect(cabinetEntry).toHaveAttribute('aria-expanded', 'false')
        await expect(cabinetEntry).toHaveAccessibleName({en:'My Space',ru:'Моё пространство',es:'Mi espacio'}[locale])
        const visibleCabinetLabel = cabinetEntry.locator(width <= 1023 ? '.site-cabinet-entry__compact' : '.site-cabinet-entry__full')
        await expect(visibleCabinetLabel).toBeVisible()
        await expect(visibleCabinetLabel).toHaveText(width <= 1023 && locale === 'ru' ? 'Моё' : {en:'My Space',ru:'Моё пространство',es:'Mi espacio'}[locale])
        if (locale === 'en' && surface === 'library' && width === 320) {
          await cabinetEntry.click()
          await expect(page.locator('#home-personal-space-dialog')).toBeVisible()
          await expect(cabinetEntry).toHaveAttribute('aria-expanded', 'true')
          await page.keyboard.press('Escape')
          await expect(page.locator('#home-personal-space-dialog')).not.toBeVisible()
        }
        if (width <= 767) for (const icon of await cabinetEntry.locator('svg').all()) await expect(icon).toBeHidden()
        await expect(menu).toHaveJSProperty('open', false)
        await inViewport(cabinetEntry, label + '/cabinet')
        await inViewport(trigger, label + '/language')
        if (width > 1140) {
          for (const link of await header.locator('.site-navigation > a').all()) {
            await expect(link).toBeVisible()
            const box = await link.boundingBox()
            assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, label + ': desktop navigation link must remain in bounds')
          }
        } else {
          for (const link of await header.locator('.site-navigation > a:not(.site-cabinet-entry)').all()) await expect(link).toBeHidden()
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Closed menu overflow: ' + label)
        // Use the real keyboard sequence; opening details alone does not test
        // the React Escape handler or its focus-return behavior after hydration.
        await cabinetEntry.focus()
        for (const selector of ['.site-nav-shop-entry[data-nav-item="shop"]', 'a[data-nav-item="cart"]']) {
          const visibleHeaderLink = header.locator('.site-navigation > ' + selector)
          if (await visibleHeaderLink.isVisible()) {
            await page.keyboard.press('Tab')
            await expect(visibleHeaderLink).toBeFocused()
          }
        }
        await page.keyboard.press('Tab')
        await expect(trigger).toBeFocused()
        await trigger.press('Enter')
        await expect(menu).toHaveJSProperty('open', true)
        const choices = menu.locator('.site-language-menu-list > a, .site-language-menu-list > button')
        assert.deepEqual(await choices.evaluateAll(elements => elements.map(el => el.getAttribute('lang'))), ['ru', 'en', 'es'])
        for (const choice of await choices.all()) await inViewport(choice, label + '/language-choice')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Open menu overflow: ' + label)
        await trigger.press('Tab')
        await expect(choices.first()).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(menu).toHaveJSProperty('open', false)
        await expect(trigger).toBeFocused()
        await inViewport(trigger, label + '/language-after-escape')
        await header.screenshot({ path: evidence + '/header-' + engine + '-' + locale + '-' + surface + '-' + width + '.png' })
        const bottom = page.locator('.mobile-bottom-navigation')
        const expectedBottom = await assertPublicBottomNavigation(bottom, { locale, surface, label })
        const bottomLinks = bottom.locator('[data-nav-item]')
        assert.deepEqual(await bottomLinks.evaluateAll(elements => elements.map(el => ({ id: el.getAttribute('data-nav-item'), href: el.getAttribute('href') }))), expectedBottom.map(item => ({ id: item.id, href: item.href })), label + ': exact seven bottom destinations')
        await expect(bottomLinks).toHaveCount(7)
        await expect(bottom.locator('[aria-current="page"]')).toHaveCount(surface === 'home' ? 1 : 0)
        if (surface === 'home') await expect(bottom.locator('[data-nav-item="home"]')).toHaveAttribute('aria-current', 'page')
        if (width < 768) {
          await inViewport(bottom, label + '/bottom-navigation')
          await bottomLinks.first().focus()
          let previousRight = 0
          for (let index = 0; index < expectedBottom.length; index++) {
            const link = bottomLinks.nth(index)
            await inViewport(link, label + '/bottom-' + expectedBottom[index].id)
            await expect(link).toHaveAccessibleName(expectedBottom[index].ariaLabel)
            await expect(link).toBeFocused()
            const box = await link.boundingBox()
            assert.ok(box.x >= previousRight - 1, label + ': bottom navigation items must not overlap')
            previousRight = box.x + box.width
            if (index < expectedBottom.length - 1) await link.press('Tab')
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Bottom navigation overflow: ' + label)
          await bottom.screenshot({ path: evidence + '/bottom-' + engine + '-' + locale + '-' + surface + '-' + width + '.png' })
        } else {
          await expect(bottom).toBeHidden()
        }
        await verifySiteMenu(page, header, { locale, surface, label, expectedMenu, inViewport })
        pass('Public navigation: ' + label)
      }
    }
  }
  await page.setViewportSize(originalViewport)
  pass(engine + ': public header Home/Energy/Love/Business/Library EN/RU/ES at ' + publicHeaderWidths.join('/') + 'px; visible Cabinet/language controls, menu bounds, keyboard Enter/Tab/Escape and focus return; exact accessible seven-slot mobile bottom navigation')
  } finally { diagnostic.stop() }
}
async function verifyPublicDiscoveryNavigation(page, engine) {
  const originalViewport = page.viewportSize()
  for (const locale of ['en', 'ru', 'es']) {
    for (const suffix of ['client', 'client/tests']) {
      for (const width of [320, 390, 768, 1280]) {
        const path = '/' + locale + '/' + suffix
        const label = engine + '/' + locale + '/' + suffix + '/' + width
        await resizePublicViewport(page, { width, height: 900 })
        const response = await go(page, path)
        assert.equal(response.status(), 200, label)
        await expect(page).toHaveURL(origin + path)
        await page.waitForLoadState('networkidle')
        // Public discovery retains the stricter privacy and media policy.
        assert.match(response.headers()['cache-control'], /no-store/, label)
        assert.match(response.headers()['x-robots-tag'], /noindex/, label)
        assert.equal(response.headers()['referrer-policy'], 'no-referrer', label)
        await expect(page.locator('body')).toHaveAttribute('data-csp-class', 'private')
        const bottom = page.locator('.mobile-bottom-navigation')
        const expected = await assertPublicBottomNavigation(bottom, { locale, surface: 'profile', label })
        if (width < 768) {
          await expect(bottom).toBeVisible()
          const links = bottom.locator('[data-nav-item]')
          await links.first().focus()
          let previousRight = 0
          for (let index = 0; index < expected.length; index++) {
            const link = links.nth(index)
            await expect(link).toBeVisible()
            await expect(link).toBeFocused()
            const box = await link.boundingBox()
            assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= previousRight - 1 && box.x + box.width <= width + 1 && box.y >= -1 && box.y + box.height <= 901, label + ': visible non-overlapping 44px mobile control')
            previousRight = box.x + box.width
            if (index < expected.length - 1) await link.press('Tab')
          }
        } else await expect(bottom).toBeHidden()
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': discovery overflow')
      }
    }
  }
    // Real mobile click into the canonical existing service, once per language.
    // A working link is not evidence of booking or payment.
    for (const locale of ['en', 'ru', 'es']) {
      await resizePublicViewport(page, { width: 390, height: 900 })
      const from = '/' + locale + '/services/free-situation-review'
      assert.equal((await go(page, from)).status(), 200, locale + ': free-review entry')
      const alchemy = page.locator('.mobile-bottom-navigation [data-nav-item="alchemy"]')
      await expect(alchemy).toBeVisible()
      await expect(alchemy).toHaveAttribute('href', '/' + locale + '/services/alchemy-of-soul')
      await alchemy.click()
      await expect(page).toHaveURL(origin + '/' + locale + '/services/alchemy-of-soul')
      await expect(page.locator('[data-alchemy-soul-landing]')).toHaveCount(1)
      await expect(page.locator('.mobile-bottom-navigation [data-nav-item="alchemy"]')).toHaveAttribute('aria-current', 'page')
    }
  await resizePublicViewport(page, originalViewport)
  pass(engine + ': public client and client/tests discovery retain seven-slot navigation with My Profile active on free tests, keyboard order, responsive bounds and private headers in EN/RU/ES')
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
    let headers
    try { headers = loopbackHeaders(incoming.headers) } catch { outgoing.writeHead(400); outgoing.end(); return }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: 3203, path: incoming.url, method: incoming.method, headers }, response => {
      try {
        const responseHeaders = { ...response.headers }
        if (responseHeaders.location) responseHeaders.location = loopbackLocation(responseHeaders.location)
        outgoing.writeHead(response.statusCode || 502, responseHeaders); response.pipe(outgoing)
      } catch { response.resume(); outgoing.writeHead(502); outgoing.end() }
    })
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end() })
    incoming.pipe(upstream)
  })
  proxy.listen(3444, '127.0.0.1'); await once(proxy, 'listening')
  // Seed the same isolated owner fixture used by site-video admin E2E.
  const db = new pg.Client({connectionString:adminDb.toString()})
  await db.connect()
  try {
    const changed=await db.query('update auth.users set email=$1 where id=$2 returning id',[ownerEmail,ownerId])
    assert.equal(changed.rowCount,1)
    const inserted=await db.query("insert into app.accounts(id,display_name,onboarding_state,status) values($1,$2,'active','active') on conflict(id) do nothing returning id",[ownerId,'Synthetic CI Owner'])
    assert.equal(inserted.rowCount,1)
  } finally { await db.end() }
  authProvider=createHttpServer((request,response)=>{
    const path=new URL(request.url || '/',authOrigin).pathname
    if(request.method==='GET' && path==='/auth/v1/user' && request.headers.authorization==='Bearer '+ownerJwt){
      response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(ownerUser));return
    }
    response.writeHead(401,{'Content-Type':'application/json'});response.end(JSON.stringify({code:'unauthorized'}))
  })
  authProvider.listen(54321,'127.0.0.1'); await once(authProvider,'listening')
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
  // Bad/missing origins never acquire a session; the real application guard remains enabled.
  const probe = await browser.newContext(common)
  for (const badOrigin of [undefined, 'null', 'https://foreign.invalid', 'http://127.0.0.1:3444', 'https://localhost:3203']) {
    const response = await probe.request.post(origin + '/api/client-access', {
      headers: badOrigin === undefined ? {} : { Origin: badOrigin },
      data: { selector: links.a.selector, secret: links.a.secret },
    })
    assert.ok([400, 404].includes(response.status()), 'A foreign/missing origin must fail closed')
    assert.equal(response.headers()['set-cookie'], undefined)
  }
  const allowed = await probe.request.post(origin + '/api/client-access', {
    headers: { Origin: origin }, data: { selector: links.a.selector, secret: links.a.secret },
  })
  assert.equal(allowed.status(), 204, 'Exact-origin link exchange must work through the TLS proxy')
  const cookie = allowed.headers()['set-cookie']
  assert.match(cookie, /__Host-client_access=/)
  for (const attr of [/httponly/i, /secure/i, /samesite=strict/i, /path=\//i]) assert.match(cookie, attr)
  assert.doesNotMatch(cookie, /domain=/i)
  redactions.push(...(await probe.cookies()).map(c => c.value))
  await probe.close()
  pass('TLS proxy preserves negative same-origin checks and establishes only secure host-bound sessions')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  if (!messengerOnly) {
  assert.equal((await go(page, '/')).status(), 200)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  for (const locale of ['en', 'ru', 'es']) {
    for (const width of [320, 360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal((await go(page, `/${locale}/library`)).status(), 200)
      const expected = getSiteNavigation(locale)
      for (const selector of ['.site-navigation', '.mobile-bottom-navigation']) {
        const nav = page.locator(selector)
        if (selector === '.site-navigation') {
          await verifyDirectNavigation(nav, { locale, surface: 'library', expected, label: locale + '/library/' + width })
          const current = nav.locator('.site-main-menu-panel a[aria-current="page"]')
          await expect(current).toHaveCount(1)
          await expect(current).toHaveAttribute('href', '/' + locale + '/library')
        } else {
          // Library remains in the expanded menu; it is not among the seven fixed tabs.
          const expectedItems = await assertPublicBottomNavigation(nav, { locale, surface: 'library', label: locale + '/library/' + width })
          assert.deepEqual(await nav.locator('[data-nav-item]').evaluateAll(elements => elements.map(el => ({ id: el.getAttribute('data-nav-item'), href: el.getAttribute('href') }))), expectedItems.map(x => ({ id: x.id, href: x.href })))
          await expect(nav.locator('[data-nav-item]')).toHaveCount(7)
          await expect(nav.locator('[aria-current="page"]')).toHaveCount(0)
          await expect(nav.locator('[data-nav-item="profile"]')).toHaveAttribute('href', '/' + locale + '/personality-profiles')
        }
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
  pass('Desktop Cabinet entry and seven-slot mobile navigation with My Profile EN/RU/ES, active states, 320–1280px, tap targets and bottom spacing')
  await verifyPublicHeaderMatrix(page, 'chromium')
  await verifyPublicDiscoveryNavigation(page, 'chromium')
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
  const inventory = await exec(process.execPath, ['scripts/verify-homeopathy-routes.mjs', origin])
  pass('All original remedy/book routes: ' + inventory.stdout.trim())
  } else {
    // Public navigation/layout acceptance is owned by separate public-service QA.
    // Keep real private entry headers on every locale and all owner/client
    // encryption, origin, access isolation, rotation and WebKit checks below.
    for(const path of ['/en/client','/ru/client','/es/client']){
      const response=await publicContext.request.get(origin+path)
      assert.match(response.headers()['cache-control'],/no-store/,path)
      assert.match(response.headers()['x-robots-tag'],/noindex/,path)
      assert.equal(response.headers()['referrer-policy'],'no-referrer',path)
    }
    pass('Messenger-only: EN/RU/ES private no-store/noindex headers; public menu matrices deferred to public QA')
  }
  if (!messengerOnly) {
  const owner = await browser.newContext(common)
  await owner.addCookies([{ name: 'prescriptions_admin', value: createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url'), domain: '127.0.0.1', path: '/admin', secure: true, httpOnly: true, sameSite: 'Strict' }])
  const legacy=await owner.request.get(origin+'/admin',{maxRedirects:0})
  assert.ok([303,307,308].includes(legacy.status()), 'legacy admin cookie must remain unauthorized')
  await owner.clearCookies()
  await authenticateOwner(owner)
  const admin = await owner.newPage()
  // Isolated synthetic document: exercise the actual newly dedicated preview
  // route with the same owner permissions as the practitioner UI. Never use
  // production reports or a guessed private client.
  const previewId = randomUUID()
  await store.save({
    id: previewId,
    clientId: a.id,
    kind: 'recommendation',
    status: 'active',
    patientName: 'Synthetic Preview Client',
    dateIssued: '2026-10-13',
    recommendationType: 'homeopathy',
    languagePreference: 'ru',
    analysis: 'Было: напряжение 3/10\nПосле сессии: напряжение 6/10\nSynthetic analysis, not a clinical claim.',
    additionalNotes: 'Synthetic client-visible notes',
    internalNotes: 'DO NOT DISPLAY — PRIVATE SYNTHETIC PRACTITIONER NOTE',
    items: [{ remedySlug: 'colchicum-autumnale', itemType: 'homeopathy' }],
  })
  await admin.setViewportSize({ width: 390, height: 844 })
  assert.equal((await go(admin, `/admin/documents/${previewId}?locale=ru`)).status(), 200)
  const openReport = admin.getByRole('link', { name: 'Предпросмотр / открыть', exact: true })
  await expect(openReport).toBeVisible()
  await expect(openReport).toHaveAttribute('href', `/admin/documents/${previewId}/session-preview?locale=ru`)
  const pdfPreview = admin.getByRole('link', { name: 'Просмотреть PDF крупно', exact: true })
  await expect(pdfPreview).toBeVisible()
  await expect(pdfPreview).toHaveAttribute('href', `/admin/api/documents/${previewId}/pdf?locale=ru&preview=1`)
  const pdfResponse = await admin.request.get(origin + await pdfPreview.getAttribute('href'))
  assert.equal(pdfResponse.status(), 200, 'owner can open the separate PDF')
  assert.match(pdfResponse.headers()['content-type'] || '', /^application\/pdf\b/i)
  assert.equal((await pdfResponse.body()).subarray(0, 5).toString(), '%PDF-', 'separate PDF is actual PDF bytes')
  await openReport.click()
  await expect(admin).toHaveURL(origin + `/admin/documents/${previewId}/session-preview?locale=ru`)
  await expect(admin.getByRole('heading', { name: 'Гомеопатическая рекомендация' })).toBeVisible()
  await expect(admin.locator('.canonical-progress-item')).toHaveCount(2)
  await expect(admin.locator('.canonical-report-analysis')).toContainText('Synthetic analysis')
  // Remedy profiles are now native collapsed disclosures, not the retired
  // .canonical-remedy-profiles wrapper. Exercise the visible summary and expansion. 
  const remedyDisclosure = admin.locator('details.canonical-remedy-profile-disclosure').first()
  await expect(remedyDisclosure.locator('summary')).toContainText('Colchicum')
  await remedyDisclosure.locator('summary').click()
  await expect(remedyDisclosure).toHaveAttribute('open', '')
  await expect(remedyDisclosure.locator('.canonical-remedy-profile-content')).toContainText('Colchicum')
  assert.ok(!(await admin.content()).includes('DO NOT DISPLAY — PRIVATE SYNTHETIC'))
  const mobileBounds = await admin.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')].map((node) => {
      const rect = node.getBoundingClientRect()
      return { tag: node.tagName, className: typeof node.className === 'string' ? node.className.slice(0, 95) : '', right: Math.round(rect.right), left: Math.round(rect.left), scrollWidth: node.scrollWidth }
    }).filter((item) => item.right > innerWidth + 2 || item.left < -2).slice(0, 12),
  }))
  assert.ok(mobileBounds.scrollWidth <= mobileBounds.innerWidth + 1, '390px preview must not overflow: ' + JSON.stringify(mobileBounds))
  await admin.screenshot({ path: `${evidence}/report-premium-mobile-ru.png`, fullPage: false })
  await go(admin, `/admin/documents/${previewId}/session-preview?locale=en`)
  await expect(admin.getByRole('heading', { name: 'Homeopathic recommendation' })).toBeVisible()
  await expect(admin.locator('.canonical-progress-item')).toHaveCount(2)
  assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '390px EN preview must not overflow')
  await admin.screenshot({ path: `${evidence}/report-premium-mobile-en.png`, fullPage: false })
  const leakedPdf = await publicContext.request.get(origin + `/admin/api/documents/${previewId}/pdf?locale=ru&preview=1`, { maxRedirects: 0 })
  assert.equal(leakedPdf.status(), 404, 'anonymous PDF request reveals no document')
  assert.ok(!(await leakedPdf.text()).includes('Synthetic analysis'))
  const leaked = await publicContext.request.get(origin + `/admin/documents/${previewId}/session-preview?locale=ru`, { maxRedirects: 0 })
  assert.equal(leaked.status(), 307, 'Unauthenticated preview must redirect to owner sign-in')
  assert.ok(!(await leaked.text()).includes('Synthetic analysis'))
  await admin.setViewportSize({ width: 1280, height: 800 })
  pass('Working Preview/Open navigates to the exact protected full report, both languages, 2 real gauges, source appendix, 390px and no practitioner notes')
  const ca = await browser.newContext(common), cb = await browser.newContext(common)
  const pa = await ca.newPage(), pb = await cb.newPage()
  const exchangeA = pa.waitForResponse(response => response.url().endsWith('/api/client-access') && response.request().method() === 'POST')
  await go(pa, `/en/client/${links.a.selector}#${links.a.secret}`)
  assert.equal((await exchangeA).status(), 204, 'Client A fragment exchange')
  await expect(pa.getByRole('heading', { name: 'Welcome, Synthetic Client A', exact: true })).toBeVisible()
  await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  const exchangeB = pb.waitForResponse(response => response.url().endsWith('/api/client-access') && response.request().method() === 'POST')
  await go(pb, `/ru/client/${links.b.selector}#${links.b.secret}`)
  assert.equal((await exchangeB).status(), 204, 'Client B fragment exchange')
  await expect(pb.getByRole('heading', { name: 'Здравствуйте, Synthetic Client B', exact: true })).toBeVisible()
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
  const stale = await owner.newPage()
  await stale.goto(admin.url())
  await expect(stale.locator('input[name="title"]')).toHaveValue('Supplied test · synthetic')
  await admin.getByRole('button', { name: 'Share with client', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Unshare', exact: true })).toBeVisible()
  await expect(admin.locator('textarea[name="originalResult"]')).toHaveCount(0)
  await stale.locator('input[name="title"]').fill('Stale edit must not be saved')
  await stale.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(stale.getByRole('alert')).toBeVisible()
  assert.equal((await fresh.findClientAssessment(id)).title, 'Supplied test · synthetic')
  await stale.close()
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
  pass('Actual owner Draft/Share, shared edit lock, stale-tab rejection and client detail; two-client HTML/RSC isolation; literal source safely escaped')
  await admin.getByRole('button', { name: 'Unshare', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible()
  assert.equal((await ca.request.get(origin + `/en/client/${links.a.selector}/assessments/${id}`)).status(), 404)
  const unsharedRevision = (await fresh.findClientAssessment(id)).revision
  await expect(admin.locator('.assessment-form input[name="expectedRevision"]')).toHaveValue(String(unsharedRevision))
  await admin.locator('textarea[name="practitionerComment"]').fill('Explicitly edited comment')
  await admin.getByRole('button', { name: 'Save draft', exact: true }).click()
  // Await the completed same-URL save, rather than aborting a pending Server Action with reload.
  await expect(admin.locator('.assessment-form input[name="expectedRevision"]')).toHaveValue(String(unsharedRevision + 1))
  await admin.reload(); await expect(admin.locator('textarea[name="practitionerComment"]')).toHaveValue('Explicitly edited comment')
  await admin.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(admin.getByText('This record is archived and is not visible to the client.', { exact: true })).toBeVisible()
  assert.equal((await fresh.findClientAssessment(id)).status, 'archived')
  // Client reports use the new consultation studio, not the retired research-result editor.
  await go(admin, '/admin/reports/new')
  await expect(admin).toHaveURL(origin + '/admin/consultations/new')
  await admin.locator('.consultation-client-search input').fill(a.fullName)
  const clientReportChoice = admin.locator('.consultation-client-results button').filter({ hasText: a.fullName })
  await expect(clientReportChoice).toBeVisible()
  await clientReportChoice.click()
  await expect(admin.locator('.consultation-client-selector input[name="clientId"]')).toHaveValue(a.id)
  await expect(admin.locator('.consultation-client-selected-row strong')).toHaveText(a.fullName)
  await expect(admin.locator('textarea[name="analysis"]')).toBeVisible()
  await expect(admin.locator('textarea[name="additionalNotes"]')).toBeVisible()
  await expect(admin.locator('input[name="includeRecommendation"]')).toBeChecked()
  await expect(admin.locator('input[name="includeInvoice"]')).not.toBeChecked()
  await expect(admin.locator('select[name="kind"]')).toHaveCount(0)
  await admin.screenshot({ path: `${evidence}/synthetic-practitioner-new-consultation.png`, fullPage: true })
  // Previously shared bookmarks should reach the same studio after owner/client validation.
  await go(admin, `/admin/clients/${a.id}/assessments/new?kind=research_result`)
  await expect(admin).toHaveURL(origin + `/admin/consultations/new?clientId=${a.id}`)
  await expect(admin.locator('.consultation-client-selector input[name="clientId"]')).toHaveValue(a.id)
  pass('Actual owner Unshare/Edit/Archive, report picker handoff and old research-result redirect to the new consultation studio')
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + '/en/client')
  await expect(pa.locator(`a[href="/en/client/${links.a.selector}"]`)).toBeHidden()
  await pa.getByText('Already have a private link from Andy?', { exact: true }).click()
  await expect(pa.locator(`a[href="/en/client/${links.a.selector}"]`)).toBeVisible()
  await pa.locator(`a[href="/en/client/${links.a.selector}"]`).click(); await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  await go(pa, '/ru/client'); await expect(pa).toHaveURL(origin + '/ru/client')
  await expect(pa.locator(`a[href="/ru/client/${links.a.selector}"]`)).toBeHidden()
  await pa.getByText('Уже есть приватная ссылка от Andy?', { exact: true }).click()
  await expect(pa.locator(`a[href="/ru/client/${links.a.selector}"]`)).toBeVisible()
  await pa.locator(`a[href="/ru/client/${links.a.selector}"]`).click(); await expect(pa).toHaveURL(origin + `/ru/client/${links.a.selector}`)
  await go(pa, '/es/client'); await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
  await stopApp(); await startApp()
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + '/en/client')
  await expect(pa.locator(`a[href="/en/client/${links.a.selector}"]`)).toBeHidden()
  await pa.getByText('Already have a private link from Andy?', { exact: true }).click()
  await expect(pa.locator(`a[href="/en/client/${links.a.selector}"]`)).toBeVisible()
  assert.equal((await createPrescriptionStore({ environment }).findClientAssessment(id)).status, 'archived')
  await rotateCabinetAccess(store, a.id, environment)
  await go(pa, '/en/client'); await expect(pa).toHaveURL(origin + '/en/client')
  await revokeCabinetAccess(store, b.id)
  await go(pb, '/ru/client'); await expect(pb).toHaveURL(origin + '/ru/client')
  assert.equal(await pa.evaluate(() => localStorage.length + sessionStorage.length), 0)
  pass('Resume EN/RU/ES, application restart persistence, rotation/revocation invalidation and no private browser storage')
  secondBrowser = await webkit.launch()
  const safari = await secondBrowser.newContext({ ...common, viewport: { width: 390, height: 844 } }), sp = await safari.newPage()
  sp.on('pageerror', error => errors.push(error.message))
  if(!messengerOnly){
    await verifyPublicHeaderMatrix(sp, 'webkit')
    await verifyPublicDiscoveryNavigation(sp, 'webkit')
  }
  await authenticateOwner(safari)
  await go(sp, `/admin/documents/${previewId}/session-preview?locale=ru`)
  await expect(sp.getByRole('heading', { name: 'Гомеопатическая рекомендация' })).toBeVisible()
  await expect(sp.locator('.canonical-progress-item')).toHaveCount(2)
  assert.ok(await sp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'WebKit 390px report must not overflow')
  await sp.screenshot({ path: `${evidence}/report-premium-mobile-ru-webkit.png`, fullPage: false })
  pass('WebKit 390px: secure original report viewer remains readable with exactly two measurements')
  if(!messengerOnly){
    await go(sp, '/ru/library')
    await expect(sp.locator('.mobile-bottom-navigation [data-nav-item="home"]')).toBeVisible()
    assert.ok(await sp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await sp.screenshot({ path: `${evidence}/library-ru-webkit.png`, fullPage: true })
    pass('WebKit narrow navigation')
  }
  assert.deepEqual(errors, [])
  pass('No public or private browser JavaScript errors')
  } else {
    // The old owner UI harness below still models the retired v1 admin cookie.
    // Actual owner authentication now requires a verified Google/Supabase bridge
    // plus a persisted v2 admin session. Never re-enable the old bypass to
    // satisfy a test. Messenger-only PRs are instead required to prove the
    // current private/legacy boundaries and both independent client sessions.
    const privateMarker = 'SYNTHETIC-PRIVATE-MESSENGER-IA-DO-NOT-LEAK'
    const previewId = randomUUID()
    await store.save({
      id: previewId, clientId: a.id, kind: 'recommendation', status: 'active',
      patientName: 'Synthetic Private Report', dateIssued: '2026-10-13',
      recommendationType: 'homeopathy', languagePreference: 'ru',
      analysis: privateMarker, additionalNotes: 'Private synthetic notes',
      internalNotes: 'SYNTHETIC-PRIVATE-OWNER-ONLY',
      items: [{ remedySlug: 'colchicum-autumnale', itemType: 'homeopathy' }],
    })
    const retiredCookie = createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url')
    const legacyOwner = await browser.newContext(common)
    await legacyOwner.addCookies([{
      name: 'prescriptions_admin', value: retiredCookie,
      domain: '127.0.0.1', path: '/admin', secure: true, httpOnly: true,
      sameSite: 'Strict',
    }])
    const deniedLegacy = await legacyOwner.request.get(origin + `/admin/documents/${previewId}?locale=ru`, { maxRedirects: 0 })
    assert.equal(deniedLegacy.status(), 307, 'Retired admin cookie MUST NOT grant owner access')
    assert.ok(!(await deniedLegacy.text()).includes(privateMarker))
    const leakedPdf = await publicContext.request.get(origin + `/admin/api/documents/${previewId}/pdf?locale=ru&preview=1`, { maxRedirects: 0 })
    assert.equal(leakedPdf.status(), 404, 'Anonymous PDF request MUST deny saved records')
    assert.ok(!(await leakedPdf.text()).includes(privateMarker))
    const leakedViewer = await publicContext.request.get(origin + `/admin/documents/${previewId}/session-preview?locale=ru`, { maxRedirects: 0 })
    assert.equal(leakedViewer.status(), 307, 'Anonymous private client page preview MUST redirect')
    assert.ok(!(await leakedViewer.text()).includes(privateMarker))
    pass('Messenger-only: retired admin cookie denied; real saved report, private PDF and session preview remain inaccessible to guests')

    const ca = await browser.newContext({ ...common, viewport: { width: 390, height: 844 } })
    const cb = await browser.newContext({ ...common, viewport: { width: 390, height: 844 } })
    const pa = await ca.newPage(), pb = await cb.newPage()
    pa.on('pageerror', error => errors.push(error.message))
    pb.on('pageerror', error => errors.push(error.message))
    const exchangeA = pa.waitForResponse(response => response.url().endsWith('/api/client-access') && response.request().method() === 'POST')
    await go(pa, `/en/client/${links.a.selector}#${links.a.secret}`)
    assert.equal((await exchangeA).status(), 204, 'Client A verified fragment exchange')
    await expect(pa.getByRole('heading', { name: 'Welcome, Synthetic Client A', exact: true })).toBeVisible()
    await expect(pa).toHaveURL(origin + `/en/client/${links.a.selector}`)
    const exchangeB = pb.waitForResponse(response => response.url().endsWith('/api/client-access') && response.request().method() === 'POST')
    await go(pb, `/ru/client/${links.b.selector}#${links.b.secret}`)
    assert.equal((await exchangeB).status(), 204, 'Client B verified fragment exchange')
    await expect(pb.getByRole('heading', { name: 'Здравствуйте, Synthetic Client B', exact: true })).toBeVisible()
    await expect(pb).toHaveURL(origin + `/ru/client/${links.b.selector}`)
    const crossClient = await cb.request.get(origin + `/en/client/${links.a.selector}/assessments/${pair[0].id}`)
    assert.equal(crossClient.status(), 404, 'Client B MUST NOT open Client A private records')
    assert.ok(!(await crossClient.text()).includes(supplied.originalResult))
    const anonClient = await publicContext.request.get(origin + `/en/client/${links.a.selector}/assessments/${pair[0].id}`)
    assert.equal(anonClient.status(), 404, 'Anonymous browser MUST NOT open Client A private records')
    assert.ok(!(await anonClient.text()).includes(supplied.originalResult))
    assert.equal(await pa.evaluate(() => localStorage.length + sessionStorage.length), 0, 'No private browser local/session storage')
    await rotateCabinetAccess(store, a.id, environment)
    await go(pa, '/en/client')
    await revokeCabinetAccess(store, b.id)
    await go(pb, '/ru/client')
    pass('Messenger-only: isolated EN/RU clients, 204 fragment exchanges, cross-client 404, zero private storage, rotation and revocation')

    secondBrowser = await webkit.launch()
    const safari = await secondBrowser.newContext({ ...common, viewport: { width: 390, height: 844 } })
    await safari.addCookies([{
      name: 'prescriptions_admin', value: retiredCookie,
      domain: '127.0.0.1', path: '/admin', secure: true, httpOnly: true,
      sameSite: 'Strict',
    }])
    const safariDenied = await safari.request.get(origin + `/admin/documents/${previewId}/session-preview?locale=ru`, { maxRedirects: 0 })
    assert.equal(safariDenied.status(), 307, 'WebKit must also deny retired admin credentials')
    assert.ok(!(await safariDenied.text()).includes(privateMarker))
    assert.deepEqual(errors, [])
    pass('Messenger-only: WebKit retired-owner denial; no client browser JavaScript errors')
  }
  results.push({ status: 'BLOCKED', message: 'Deployed Preview/Production private-storage configuration and real-data isolation are not inspected by this synthetic harness.' })
} catch (error) {
  results.push({ status: 'FAIL', message: sanitize(error.message) })
  console.error(sanitize(error.stack)); process.exitCode = 1
} finally {
  writeFileSync(`${evidence}/public-navigation-diagnostics.json`, JSON.stringify(publicNavigationDiagnostics, null, 2))
  await browser?.close(); await secondBrowser?.close(); await stopApp()
  bridge?.close(); proxy?.close(); authProvider?.close()
  writeFileSync(`${evidence}/results.json`, JSON.stringify(results, null, 2))
  writeFileSync(`${evidence}/app.log`, sanitize(logs))
}
