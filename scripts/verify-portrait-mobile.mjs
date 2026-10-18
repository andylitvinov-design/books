/**
 * Isolated, account-authenticated mobile QA for the Reports portrait.
 * Unlike the long App R1 journey, this script signs in once through the
 * synthetic PKCE provider and goes DIRECTLY to the radar.
 * No live user, Google, personal answers or production database is touched.
 */
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'

assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Only isolated loopback browser QA allowed')
const name = process.env.HH_TEST_BROWSER === 'webkit' ? 'webkit' : 'chromium'
const engine = name === 'webkit' ? webkit : chromium
const output = 'artifacts/portrait-mobile'
await mkdir(output, { recursive: true })
const browser = await engine.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const page = await context.newPage()
const problems = []
page.on('pageerror', error => problems.push(String(error.message).slice(0, 250)))
const open = path => page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 90000 })
const card = () => page.locator('[data-testid="insights-psychological-portrait"]')
const buttons = () => card().locator('button[data-portrait-sector]')
const labels = ['body','work','relationships','growth']
const expected = { body: 5, work: 3, relationships: 4, growth: 5 }

function assertMobileEvidence({ locale, width, sector, data }) {
  assert.equal(data.buttonCount, 5, 'All and four category buttons')
  assert.ok(data.fiveInRow, `${locale} ${width}px: five portrait buttons must share one row`)
  assert.ok(data.minTapHeight >= 44, `${locale} ${width}px: all category buttons need >=44px tap height`)
  assert.ok(data.overflow <= 1, `${locale} ${width}px: no horizontal document overflow`)
  assert.ok(data.radarWidth > 0 && data.ringWidth / data.radarWidth > .78,
    `${locale} ${width}px: outer ring must fill most of the picture`)
  assert.equal(data.dotCount, expected[sector], `${locale}: true scale count for ${sector}`)
  assert.equal(data.labelCount, expected[sector], `${locale}: a caption for each real scale`)
  assert.ok(data.labelsWithinSvg, `${locale} ${width}px: all labels inside artwork`)
  assert.ok(data.noOverlap, `${locale} ${width}px: scale captions must not overlap each other`)
  assert.ok(data.fourDirections, `${locale}: selected category must occupy full circle`)
  assert.equal(data.pressedCount, 1, `${locale}: exactly one pressed category`)
  assert.equal(data.pressedKey, sector)
}

async function measure(locale, width, sector) {
  await page.setViewportSize({ width, height: 900 })
  const data = await card().evaluate(cardEl => {
    const rect = element => element.getBoundingClientRect()
    const header = cardEl.querySelector('[data-portrait-sectors]')
    const buttons = [...header.querySelectorAll('button[data-portrait-sector-all], button[data-portrait-sector]')]
    const tops = buttons.map(button => rect(button).top)
    const svg = cardEl.querySelector('svg[data-radar-layout="full-circle"]')
    const outer = svg.querySelector('circle[class*="radarReference"]')
    const image = rect(svg)
    const texts = [...svg.querySelectorAll('text[class*="radarInlineLabel"]')]
    const labelRects = texts.map(rect)
    const intersect = (a,b) => {
      const x = Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))
      const y = Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))
      return x*y
    }
    const overlaps = []
    for(let i=0;i<labelRects.length;i++) for(let j=i+1;j<labelRects.length;j++) {
      const area = intersect(labelRects[i],labelRects[j])
      if(area > 5) overlaps.push([i,j,Math.round(area)])
    }
    const dots = [...svg.querySelectorAll('circle[data-contour-axis]')]
    const coords = dots.map(dot => ({ x: Number(dot.getAttribute('cx'))-180, y: Number(dot.getAttribute('cy'))-182 }))
    const pressed = buttons.filter(button => button.getAttribute('aria-pressed') === 'true')
    return {
      buttonCount: buttons.length,
      fiveInRow: tops.length === 5 && Math.max(...tops)-Math.min(...tops)<2,
      minTapHeight: Math.min(...buttons.map(button=>rect(button).height)),
      pressedCount: pressed.length, pressedKey: pressed[0]?.getAttribute('data-portrait-sector'),
      overflow: document.documentElement.scrollWidth-innerWidth,
      radarWidth: image.width, ringWidth: rect(outer).width,
      labelCount:texts.length,dotCount:dots.length,
      labelsWithinSvg:labelRects.every(b=>b.left >= image.left-2 && b.right <= image.right+2 && b.top >= image.top-2 && b.bottom <= image.bottom+2),
      outsideLabels:labelRects.flatMap((b,i)=> b.left < image.left-2 || b.right > image.right+2 ||
        b.top < image.top-2 || b.bottom > image.bottom+2 ? [{
          label:texts[i].textContent,
          left:Math.round(b.left-image.left),right:Math.round(b.right-image.right),
          top:Math.round(b.top-image.top),bottom:Math.round(b.bottom-image.bottom),
        }] : []),
      noOverlap:overlaps.length === 0, overlaps,
      fourDirections:coords.some(p=>p.x>20)&&coords.some(p=>p.x< -20)&&coords.some(p=>p.y>20)&&coords.some(p=>p.y< -20),
    }
  })
  console.log('PORTRAIT_QA', JSON.stringify({ engine:name, locale, width, sector, ...data }))
  await card().screenshot({ path:`${output}/${name}-${locale}-${width}-${sector}.png`, animations:'disabled', timeout:30000 })
  assertMobileEvidence({locale,width,sector,data})
}

try {
  await open('/en/app')
  const signin = page.getByRole('button',{name:'Continue with Google',exact:true})
  await expect(signin).toBeVisible({timeout:60000})
  await signin.click()
  await expect(page.getByRole('heading',{name:'Create my private space'})).toBeVisible({timeout:60000})
  await page.getByLabel('I am 18 or older.').check()
  await page.getByLabel('I agree to private processing',{exact:false}).check()
  await page.getByRole('button',{name:'Create my private space'}).click()
  // The consent transition is asynchronous: a visible tab bar may briefly
  // precede the app's own /app/portrait or /app/tests navigation. Await the
  // settled account landing, otherwise WebKit may interrupt the first goto.
  await expect(page).toHaveURL(/\/en\/app\/(?:portrait|tests)(?:[?#]|$)/,{timeout:90000})
  await expect(page.locator('.hh-mobile-app-nav')).toBeVisible({timeout:90000})
  // The current signed-in Profile is ProfileDomains (not the older
  // PersonalPortraitSummary/My Tests landing referenced in legacy E2E tests).
  await expect(page.locator('[data-profile-domains]')).toBeVisible({timeout:90000})
  console.log('PORTRAIT_QA',name,'synthetic Google PKCE double signed in (no real account)')

  for (const locale of ['en','ru']) {
    await open('/'+locale+'/app/portfolio')
    await expect(card()).toBeVisible({timeout:90000})
    await expect(buttons()).toHaveCount(4,{timeout:30000})
    await expect(card().locator('[class*="visualState"]')).toHaveCount(0)
    const all = card().locator('[data-portrait-sector-all]')
    await expect(all).toHaveCount(1)
    await expect(all).toHaveAttribute('aria-pressed','true')
    const overview = card().locator('svg[data-radar-mode="summary"]')
    await expect(overview).toBeVisible()
    await expect(overview.locator('[data-summary-sector]')).toHaveCount(4)
    await expect(card().locator('[data-detail-axis]')).toHaveCount(0)
    for (const width of [320,390,430]) {
      await page.setViewportSize({width,height:900})
      for (const sector of labels) {
        const button = card().locator('button[data-portrait-sector="'+sector+'"]')
        await button.click()
        await expect(button).toHaveAttribute('aria-pressed','true')
        await expect(card().locator('[data-detail-axis]')).toHaveCount(expected[sector])
        await measure(locale,width,sector)
      }
    }
    await all.click()
    await expect(all).toHaveAttribute('aria-pressed','true')
    await expect(card().locator('svg[data-radar-mode="summary"]')).toBeVisible()
    await expect(card().locator('[data-summary-sector]')).toHaveCount(4)
    await expect(card().locator('[data-portrait-ray-options]')).toHaveCount(0)
    const actions = card().locator('[data-testid="portrait-quick-actions"]')
    await expect(actions).toBeVisible()
    await expect(actions.locator('a, button')).toHaveCount(3)
    await expect(actions.locator('[data-testid="portrait-completion-action"]')).toContainText(locale === 'ru' ? 'Тесты' : 'Tests')
    await expect(actions.locator('[data-testid="portrait-analyses-action"]')).toContainText(locale === 'ru' ? 'Анализы' : 'Analyses')
    await expect(actions.locator('[data-testid="portrait-recommendations-action"]')).toContainText(locale === 'ru' ? 'Рекомендации' : 'Recommendations')
  }
  // Next's development error-overlay may emit a blocked /__nextjs_original-stack-frames
  // request (plus an opaque Event) under the isolated loopback/CSP browser.
  // Ignore only that known tooling noise; real application pageerrors still fail.
  const devOverlayBlocked = problems.some(item => item.includes('/__nextjs_original-stack-frames'))
  const appProblems = problems.filter(item => !item.includes('/__nextjs_original-stack-frames') &&
    !(devOverlayBlocked && item === '[object Event]'))
  assert.equal(appProblems.length,0,'Browser script errors: '+appProblems.join('; '))
  console.log('PORTRAIT_QA_SUCCESS',name, '2 locales x 3 widths x 4 categories')
} finally {
  await context.close()
  await browser.close()
}
