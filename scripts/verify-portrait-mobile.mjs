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
  assert.equal(data.buttonCount, 4, 'Four category buttons')
  assert.ok(data.fourInRow, `${locale} ${width}px: category buttons must share one row`)
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
    const buttons = [...header.querySelectorAll('button[data-portrait-sector]')]
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
      fourInRow: tops.length === 4 && Math.max(...tops)-Math.min(...tops)<2,
      minTapHeight: Math.min(...buttons.map(button=>rect(button).height)),
      pressedCount: pressed.length, pressedKey: pressed[0]?.getAttribute('data-portrait-sector'),
      overflow: document.documentElement.scrollWidth-innerWidth,
      radarWidth: image.width, ringWidth: rect(outer).width,
      labelCount:texts.length,dotCount:dots.length,
      labelsWithinSvg:labelRects.every(b=>b.left >= image.left-2 && b.right <= image.right+2 && b.top >= image.top-2 && b.bottom <= image.bottom+2),
      noOverlap:overlaps.length === 0, overlaps,
      fourDirections:coords.some(p=>p.x>20)&&coords.some(p=>p.x< -20)&&coords.some(p=>p.y>20)&&coords.some(p=>p.y< -20),
    }
  })
  console.log('PORTRAIT_QA', JSON.stringify({ engine:name, locale, width, sector, ...data }))
  assertMobileEvidence({locale,width,sector,data})
  await card().screenshot({ path:`${output}/${name}-${locale}-${width}-${sector}.png`, animations:'disabled', timeout:30000 })
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
  await expect(page.locator('.hh-mobile-app-nav')).toBeVisible({timeout:90000})
  console.log('PORTRAIT_QA',name,'synthetic Google PKCE double signed in (no real account)')

  for (const locale of ['en','ru']) {
    await open('/'+locale+'/app/portfolio')
    await expect(card()).toBeVisible({timeout:90000})
    await expect(buttons()).toHaveCount(4,{timeout:30000})
    await expect(card().locator('[class*="visualState"]')).toHaveCount(0)
    await expect(card().locator('[data-portrait-sector-all]')).toHaveCount(0)
    await expect(card().locator('[data-radar-layout="full-circle"]')).toBeVisible()
    await expect(buttons().filter({has:page.locator('[name="nonexistent"]')})).toHaveCount(0)
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
    await expect(card().locator('[data-testid="portrait-quick-actions"]')).toBeVisible()
  }
  assert.equal(problems.length,0,'Browser script errors: '+problems.join('; '))
  console.log('PORTRAIT_QA_SUCCESS',name, '2 locales x 3 widths x 4 categories')
} finally {
  await context.close()
  await browser.close()
}
