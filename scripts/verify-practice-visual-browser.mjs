// Automated, synthetic public-first Practice layout acceptance.
// Not a substitute for real Google sign-in, private API, upload or payment E2E.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PRACTICE_QA_ORIGIN || 'http://127.0.0.1:3119'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error('Synthetic browser test requires loopback')
const out = 'artifacts/practice-visual'
await mkdir(out, { recursive:true })
const approved = JSON.parse(await readFile(new URL('./fixtures/practice-approved-reference-20261028.json', import.meta.url),'utf8'))

// Data is synthetic, never copied from a real account, browser or Supabase.
const bootstrap = {
  account:{ id:'synthetic-practice-qa-account', onboardingState:'complete' },
  results:[], runs:[], requests:[], consents:[], services:[],
}
const practitioner = {
  practitioner:{ profile:{ displayName:'' }, draftProfile:{ displayName:'' } },
  services:[], requests:[],
}
const reply = (route, status, data) => route.fulfill({
  status, contentType:'application/json', body:JSON.stringify(data),
})
const title = {
  ru:'Кабинет практика',
  en:'Practitioner workspace',
  es:'Espacio profesional',
}
const report = []
const measure = async page => page.evaluate(() => {
  const root = document.querySelector('[data-practice-showcase]')
  const rect = el => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom}
  }
  const el = key => root?.querySelector('[class*="' + key + '"]')
  const quickButtons = [...root.querySelectorAll('[class*="quickGrid"] > button')]
  const offerButtons = [...root.querySelectorAll('[class*="offerRail"] > button')]
  const bottomNav = root.querySelector('nav')
  const hero = el('hero')
  return {
    url:location.pathname + location.search,
    state:root.dataset.authState,
    viewport:document.documentElement.clientWidth,
    documentWidth:document.documentElement.scrollWidth,
    header:rect(root.querySelector('header')),
    identity:rect(el('identity')),
    grid:rect(el('quickGrid')),
    hero:rect(hero),
    offers:rect(el('offers')),
    nav:rect(bottomNav),
    tileRects:quickButtons.map(rect),
    offerRects:offerButtons.map(rect),
    navPosition:bottomNav ? getComputedStyle(bottomNav).position : 'missing',
    heroBackground:hero ? getComputedStyle(hero).backgroundImage : 'missing',
    heading:root.querySelector('header h1')?.textContent?.trim() || '',
  }
})

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({headless:true})
  try {
    for (const locale of ['ru','en','es']) {
      const cases = [
        ...[320,354,390,430].map(width => ({width, state:'guest', ready:false})),
        {width:390, state:'synthetic-signed', ready:false},
      ]
      if (locale === 'ru') cases.push({width:390, state:'synthetic-signed', ready:true})
      for (const item of cases) {
        const label = [browserType.name(),locale,item.width,item.state,item.ready?'ready':'home'].join('-')
        const page = await browser.newPage({
          viewport:{width:item.width,height:844},deviceScaleFactor:1,
          isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block',
        })
        const pageErrors = []
        page.on('pageerror',e=>pageErrors.push(e.message))
        await page.route('**/api/app/**', async route => {
          const path = new URL(route.request().url()).pathname
          if (item.state === 'guest') return reply(route,401,{error:'UNAUTHORIZED'})
          if (path === '/api/app/bootstrap') return reply(route,200,bootstrap)
          if (path === '/api/app/practice') return reply(route,200,practitioner)
          if (path === '/api/app/auth/contact-profile') return reply(route,200,{displayName:''})
          return reply(route,401,{error:'SYNTHETIC_FIXTURE_ONLY'})
        })
        try {
          const address = origin + '/' + locale + '/practice' + (item.ready?'?ready=service':'')
          const response = await page.goto(address,{waitUntil:'domcontentloaded',timeout:90000})
          assert.equal(response?.status(),200,label+' canonical route must return HTML')
          const root = page.locator('[data-practice-showcase]')
          await root.waitFor({state:'visible',timeout:35000})
          const expected = item.state==='guest'?'guest':'signed'
          await page.waitForFunction(state => document.querySelector('[data-practice-showcase]')?.dataset.authState===state,
            expected,{timeout:35000})
          await page.evaluate(async()=>{await document.fonts.ready})
          await page.waitForFunction(() => [...document.querySelectorAll('[data-practice-showcase] img')].every(
            img => img.complete && img.naturalWidth > 0),null,{timeout:20000})
          await page.waitForTimeout(250)
          assert.equal(await root.locator('header h1').innerText(),title[locale],label+' exact original dashboard')
          assert.equal(await root.locator('[class*="quickGrid"] > button').count(),6,label+' original six creation actions')
          assert.equal(await root.locator('[class*="offerRail"] > button').count(),6,label+' six miniature covers')
          assert.equal(await root.locator('nav button').count(),5,label+' five original bottom tabs')
          assert.equal(await root.locator('nav button[aria-current="page"]').count(),1,label+' Practice active')
          assert.equal(await root.locator('[class*="hero"] button').first().isVisible(),true,label+' real create CTA')
          const g = await measure(page)
          assert.equal(g.state,expected,label+' proper auth/view state')
          if (locale==='ru' && item.width===390 && item.state==='synthetic-signed' && !item.ready) {
            assert.equal(g.url,approved.referenceRoute,label+' exactly the approved main dashboard, not an editor')
            for (const [landmark,setting] of Object.entries(approved.landmarksCssPx)) {
              const metric = ({
                headerY:g.header.y,identityY:g.identity.y,gridY:g.grid.y,
                heroY:g.hero.y,offersY:g.offers.y,
              })[landmark]
              assert.ok(Math.abs(metric-setting.value)<=setting.tolerance,
                label+' reference screenshot landmark '+landmark+' expected '+setting.value+
                '±'+setting.tolerance+' CSS px; actual '+metric)
            }
          }
          assert.ok(g.documentWidth <= g.viewport+3,label+' unexpected horizontal overflow: '+JSON.stringify(g))
          for (const key of ['header','identity','grid','hero','offers','nav'])
            assert.ok(g[key] && g[key].width>0,label+' missing original region '+key)
          assert.ok(g.header.y < g.identity.y && g.identity.bottom <= g.grid.y+3,
            label+' header/profile/creation order: '+JSON.stringify(g))
          assert.ok(g.grid.bottom <= g.hero.y+3 && g.hero.bottom<=g.offers.y+3,
            label+' original six tiles -> scenic hero -> offers: '+JSON.stringify(g))
          assert.ok(g.grid.height<175 && g.identity.height<155,
            label+' design unexpectedly became tall generic cards: '+JSON.stringify(g))
          assert.ok(g.hero.height>=180 && g.hero.height<=290,label+' scenic hero proportions: '+JSON.stringify(g))
          assert.ok(g.navPosition==='fixed',label+' fixed original bottom navigation')
          assert.ok(g.nav.bottom<=845 && g.nav.bottom>=810,label+' bottom dock geometry: '+JSON.stringify(g.nav))
          assert.ok(g.offerRects.every(r=>r.right<=g.viewport+3&&r.x>=-3),
            label+' six covers cannot clip outside mobile width')
          assert.ok(g.tileRects.every(r=>r.right<=g.viewport+3&&r.x>=-3),
            label+' creation tiles cannot clip outside mobile width')
          assert.ok(/url\(/.test(g.heroBackground),label+' hero landscape must be a real image')
          if (item.width===390 && !item.ready) {
            await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
            await page.screenshot({path:out+'/'+label+'-full.png',fullPage:true})
          }
          if (item.ready) {
            // Historical OAuth ?ready=service URLs must be cleaned, not show
            // the banner that displaced the owner-approved iPhone dashboard.
            await page.waitForURL(url => url.pathname==='/'+locale+'/practice' && !url.search,
              {timeout:10000})
            assert.equal(await root.locator('[data-practice-after-google]').count(),0,
              label+' no extra post-Google Continue banner')
            assert.ok(g.grid.y-g.identity.bottom<35,
              label+' original profile must lead directly to six creation tiles')
            // Only a deliberate creation click can open the protected editor.
            await root.locator('[class*="quickGrid"] > button').first().click()
            await page.waitForURL(url => url.pathname==='/'+locale+'/app/practice' &&
              url.searchParams.get('panel')==='services' && url.searchParams.get('create')==='1',
              {timeout:35000})
          } else if (item.state==='guest' && item.width===390) {
            await root.locator('[class*="quickGrid"] > button').first().click()
            const dialog=root.getByRole('dialog')
            await dialog.waitFor({state:'visible',timeout:5000})
            assert.ok((await dialog.innerText()).length>25,label+' guest action really opens Google gate')
            await dialog.locator('button').last().click()
            await dialog.waitFor({state:'hidden',timeout:5000})
            assert.ok(page.url().endsWith('/'+locale+'/practice'),
              label+' cancelling login must not send user to editor')
          }
          assert.deepEqual(pageErrors,[],label+' browser runtime exceptions')
          report.push({label,ok:true,geometry:g,fixture:'synthetic; no real OAuth or private data'})
        } catch(error) {
          await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
          throw new Error(label+': '+error.message,{cause:error})
        } finally {
          await page.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
}
await writeFile(out+'/manifest.json',JSON.stringify({
  kind:'synthetic UI geometry and route acceptance, NOT real auth/DB E2E',
  origin, cases:report,
},null,2)+'\n')
console.log('Practice screenshot, geometry and route checks: '+report.length+' passed')
