// Real local site and isolated PostgreSQL only; never target production.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const base=process.env.HH_INTELLIGENCE_BASE_URL || 'http://127.0.0.1:3187'
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('LOCAL_SITE_REQUIRED')
const tools=process.env.HH_INTELLIGENCE_BROWSER_TOOLS
if (!tools) throw new Error('HH_INTELLIGENCE_BROWSER_TOOLS_REQUIRED')
const {chromium}=createRequire(`${tools}/package.json`)('playwright')
for(let i=0;i<90;i++) {
  try {if((await fetch(`${base}/en/holistic-support`)).ok) break} catch { /* starting */ }
  if(i===89) throw new Error('LOCAL_SITE_UNAVAILABLE')
  await new Promise(resolve=>setTimeout(resolve,1000))
}
const browser=await chromium.launch({headless:true,...(process.env.HH_BROWSER_EXECUTABLE?{executablePath:process.env.HH_BROWSER_EXECUTABLE}:{})})
try {
  const page=await browser.newPage({viewport:{width:390,height:844}})
  await page.goto(`${base}/en/holistic-support`,{waitUntil:'networkidle'})
  await page.locator('[data-meditation-finder-toggle]').click()
  const card=page.locator('[data-holistic-intelligence]')
  await card.locator('select').selectOption('energy')
  await card.getByRole('button',{name:'Continue',exact:true}).click()
  await card.locator('select').selectOption('test')
  await card.getByRole('button',{name:'Continue',exact:true}).click()
  await card.getByRole('button',{name:'No',exact:true}).click()
  await card.getByRole('button',{name:'No',exact:true}).click()
  await card.getByRole('button',{name:'Skip',exact:true}).click()
  const consent=card.locator('#hh-intelligence-test-consent-meditation')
  await consent.waitFor()
  assert.equal(await card.getByRole('link').count(),0,'test start must require consent')
  await consent.check()
  await consent.uncheck()
  assert.equal(await card.getByRole('link').count(),0,'withdrawing consent must remove the test link')
  await consent.check()
  const link=card.getByRole('link').first(), firstHref=await link.getAttribute('href')
  assert.match(firstHref,/^\/en\/client\?startTests=[a-z0-9-]+$/)
  const opened=page.waitForEvent('popup');await link.click();const testPage=await opened
  const fields=testPage.locator('.cabinet-quick-question')
  await fields.first().waitFor({state:'visible',timeout:60000})
  const count=await fields.count()
  assert.equal(count,6,'expected real resource pulse questions')
  for(let i=0;i<count;i++) {
    await fields.nth(i).getByRole('button').first().click()
    await testPage.waitForFunction(index=>{
      const button=document.querySelectorAll('.cabinet-quick-question')[index]?.querySelector('button')
      return button?.getAttribute('aria-pressed')==='true' && !button.disabled
    },i,{timeout:15000})
  }
  await testPage.getByRole('button',{name:'See my scores and scales'}).click()
  await testPage.locator('.cabinet-guest-result').waitFor({state:'visible',timeout:30000})
  await testPage.reload({waitUntil:'domcontentloaded'})
  await testPage.locator('.cabinet-guest-result').waitFor({state:'visible',timeout:30000})
  await page.bringToFront()
  await card.getByRole('button',{name:'Yes',exact:true}).click()
  await card.getByText('Thank you. Your feedback stays in this session.').waitFor()
  await card.getByRole('button',{name:'Another option',exact:true}).click()
  await card.getByText('Current State Check',{exact:true}).waitFor({state:'visible',timeout:15000})
  await consent.waitFor()
  assert.equal(await consent.isChecked(),false,'consent is renewed for a different test')
  await consent.check()
  assert.notEqual(await card.getByRole('link').first().getAttribute('href'),firstHref)
  await testPage.close();await page.close()
  console.log(JSON.stringify({browser:'chromium',storage:'isolated-postgresql',consent:'passed',questions:count,result:'visible-after-reload',feedback:'session-only',next:'different-test'}))
} finally {await browser.close()}
