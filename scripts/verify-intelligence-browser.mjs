// Run against a locally built site, never an authenticated production account.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

const tools = process.env.HH_INTELLIGENCE_BROWSER_TOOLS
if (!tools) throw new Error('HH_INTELLIGENCE_BROWSER_TOOLS_REQUIRED')
const require = createRequire(`${tools}/package.json`)
const browsers = require('playwright')
const name = process.env.HH_TEST_BROWSER || 'chromium'
if (!['chromium','webkit'].includes(name)) throw new Error('UNSUPPORTED_BROWSER')
const base = process.env.HH_INTELLIGENCE_BASE_URL || 'http://127.0.0.1:3187'
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('LOCAL_SITE_REQUIRED')
const copy = {
  en:{next:'Continue',no:'No',yes:'Yes',skip:'Skip',other:'Another option',help:'If you may be in danger'},
  ru:{next:'Продолжить',no:'Нет',yes:'Да',skip:'Пропустить',other:'Другой вариант',help:'Если вам угрожает опасность'},
  es:{next:'Continuar',no:'No',yes:'Sí',skip:'Omitir',other:'Otra opción',help:'Si puedes estar en peligro'},
}
for (let i=0;i<60;i++) {
  try { if ((await fetch(`${base}/en/holistic-support`)).ok) break } catch { /* server starting */ }
  if (i===59) throw new Error('LOCAL_SITE_UNAVAILABLE')
  await new Promise(resolve=>setTimeout(resolve,1000))
}
const browser = await browsers[name].launch({headless:true,
  ...(process.env.HH_BROWSER_EXECUTABLE ? {executablePath:process.env.HH_BROWSER_EXECUTABLE} : {})})
try {
  const evidence = process.env.HH_INTELLIGENCE_EVIDENCE_DIR || '/tmp/hh-intelligence-evidence'
  await mkdir(evidence,{recursive:true})
  let checked=0
  for (const locale of ['en','ru','es']) for (const width of [320,375,390,430]) {
    const page=await browser.newPage({viewport:{width,height:844}}), t=copy[locale]
    try {
      const privateCalls=[]
      page.on('request',request=>{if(new URL(request.url()).pathname==='/api/app/intelligence/plan')privateCalls.push(request.url())})
      await page.goto(`${base}/${locale}/holistic-support`,{waitUntil:'networkidle'})
      await page.locator('[data-meditation-finder-toggle]').click()
      await page.locator('[data-meditation-audio-language]').selectOption('en')
      const card=page.locator('[data-holistic-intelligence]')
      await card.locator('select').selectOption('energy')
      await card.getByRole('button',{name:t.next,exact:true}).click()
      await card.locator('#hh-intelligence-format-meditation').selectOption('video')
      await card.getByRole('button',{name:t.next,exact:true}).click()
      await card.getByRole('button',{name:t.no,exact:true}).click()
      await card.getByRole('button',{name:t.no,exact:true}).click()
      await card.getByRole('button',{name:t.skip,exact:true}).click()
      const link=card.getByRole('link').first()
      await link.waitFor({state:'visible',timeout:15000})
      const href=await link.getAttribute('href')
      assert.match(href,/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/)
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale} ${width} overflow`)
      assert.deepEqual(privateCalls,[], 'guest request unexpectedly reached the private API')
      if(width===390) await card.screenshot({path:`${evidence}/${name}-${locale}-${width}.png`})
      await card.getByRole('button',{name:t.other,exact:true}).click()
      await card.locator('[class*="result"]').waitFor({state:'visible'})
      const nextLink=card.getByRole('link').first()
      if (await nextLink.count()) assert.notEqual(await nextLink.getAttribute('href'),href,'dismissed item repeated')
      checked++
    } finally { await page.close() }
  }
  const page=await browser.newPage({viewport:{width:320,height:700}})
  try {
    await page.goto(`${base}/en/holistic-support`,{waitUntil:'networkidle'})
    await page.locator('[data-meditation-finder-toggle]').click()
    const card=page.locator('[data-holistic-intelligence]')
    await card.locator('select').selectOption('energy')
    const next=card.getByRole('button',{name:copy.en.next,exact:true})
    await next.focus();await page.keyboard.press('Enter')
    await card.locator('#hh-intelligence-format-meditation').selectOption('video')
    await next.focus();await page.keyboard.press('Enter')
    const yes=card.getByRole('button',{name:copy.en.yes,exact:true})
    await yes.focus();await page.keyboard.press('Enter')
    assert.equal(await card.getByText(copy.en.help,{exact:false}).isVisible(),true)
    assert.equal(await card.getByRole('link').count(),0)
  } finally { await page.close() }
  const checkinPage=await browser.newPage({viewport:{width:390,height:844}})
  try {
    await checkinPage.context().route('https://www.youtube.com/**',route=>route.abort())
    await checkinPage.goto(`${base}/en/holistic-support`,{waitUntil:'networkidle'})
    await checkinPage.locator('[data-meditation-finder-toggle]').click()
    const card=checkinPage.locator('[data-holistic-intelligence]')
    await card.locator('select').selectOption('energy')
    await card.getByRole('button',{name:'Continue',exact:true}).click()
    await card.locator('#hh-intelligence-format-meditation').selectOption('video')
    await card.getByRole('button',{name:'Continue',exact:true}).click()
    await card.getByRole('button',{name:'No',exact:true}).click()
    await card.getByRole('button',{name:'No',exact:true}).click()
    await card.locator('#hh-checkin-before-meditation').fill('3')
    await card.getByRole('button',{name:'Use this answer',exact:true}).click()
    const link=card.getByRole('link').first();await link.waitFor({state:'visible',timeout:15000})
    const popup=checkinPage.waitForEvent('popup');await link.click();await (await popup).close()
    await card.locator('#hh-checkin-after-meditation').fill('5')
    await card.getByRole('button',{name:'Use this answer',exact:true}).click()
    await card.getByText('Change in your self-report: +2.',{exact:false}).waitFor()
    assert.equal(await card.getByText('not proof of a treatment effect',{exact:false}).isVisible(),true)
  } finally { await checkinPage.close() }
  const testPage=await browser.newPage({viewport:{width:390,height:844}})
  try {
    const privateCalls=[]
    testPage.on('request',request=>{if(new URL(request.url()).pathname==='/api/app/intelligence/plan')privateCalls.push(request.url())})
    await testPage.goto(`${base}/es/holistic-support`,{waitUntil:'networkidle'})
    await testPage.locator('[data-meditation-finder-toggle]').click()
    const card=testPage.locator('[data-holistic-intelligence]')
    await card.locator('select').selectOption('energy')
    await card.getByRole('button',{name:copy.es.next,exact:true}).click()
    await card.locator('#hh-intelligence-format-meditation').selectOption('test')
    await card.getByRole('button',{name:copy.es.next,exact:true}).click()
    await card.getByRole('button',{name:copy.es.no,exact:true}).click()
    await card.getByRole('button',{name:copy.es.no,exact:true}).click()
    await card.getByRole('button',{name:copy.es.skip,exact:true}).click()
    const link=card.getByRole('link').first()
    await link.waitFor({state:'visible',timeout:15000})
    assert.match(await link.getAttribute('href'),/^\/en\/client\?startTests=[a-z0-9-]+$/)
    assert.equal(await card.getByText('Idioma del cuestionario: English',{exact:false}).isVisible(),true)
    assert.deepEqual(privateCalls,[])
  } finally { await testPage.close() }
  const servicePage=await browser.newPage({viewport:{width:390,height:844}})
  try {
    await servicePage.goto(`${base}/en/holistic-support`,{waitUntil:'networkidle'})
    await servicePage.locator('[data-meditation-finder-toggle]').click()
    const card=servicePage.locator('[data-holistic-intelligence]')
    await card.locator('select').selectOption('money')
    await card.getByRole('button',{name:copy.en.next,exact:true}).click()
    await card.locator('#hh-intelligence-format-meditation').selectOption('service')
    await card.getByRole('button',{name:copy.en.next,exact:true}).click()
    await card.getByRole('button',{name:'Include paid options',exact:true}).click()
    await card.getByRole('button',{name:copy.en.no,exact:true}).click()
    await card.getByRole('button',{name:copy.en.no,exact:true}).click()
    const link=card.getByRole('link').first();await link.waitFor({state:'visible',timeout:15000})
    assert.equal(await link.getAttribute('href'),'/en/services/business-consulting')
    assert.equal(await card.getByText('Paid service · check terms on the service page',{exact:true}).isVisible(),true)
    assert.equal(await card.getByText('Opening details does not book, pay, or share your answers.',{exact:true}).isVisible(),true)
    const opened=servicePage.waitForEvent('popup')
    await link.click()
    const details=await opened
    await details.waitForLoadState('domcontentloaded')
    assert.equal(new URL(details.url()).pathname,'/en/services/business-consulting')
    assert.equal(await details.locator('h1').count()>0,true)
    await details.close()
    await card.getByRole('button',{name:copy.en.other,exact:true}).click()
    assert.equal(await card.getByRole('link').first().getAttribute('href'),'/en/services/free-situation-review')
  } finally { await servicePage.close() }
  console.log(JSON.stringify({browser:name,localeViewportCases:checked,crisisAndKeyboard:'passed',voluntaryCheckin:'passed',testRecommendation:'passed',serviceOptIn:'passed'}))
} finally { await browser.close() }
