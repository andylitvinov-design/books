/**
 * Isolated, account-authenticated mobile QA for the Reports portrait.
 * Unlike the long App R1 journey, this script signs in once through the
 * synthetic PKCE provider and goes DIRECTLY to the radar.
 * No live user, Google, personal answers or production database is touched.
 */
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { observePortraitNavigation } from './helpers/portrait-navigation-diagnostics.mjs'
import { alignAndMeasureStablePortraitFrame } from './helpers/portrait-frame-readiness.mjs'
import { precompilePortraitClaim } from './helpers/portrait-claim-precompile.mjs'

assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Only isolated loopback browser QA allowed')
// Complete the observed cold route's unauthenticated compile before browser creation.
await precompilePortraitClaim({ origin })
const name = process.env.HH_TEST_BROWSER === 'webkit' ? 'webkit' : 'chromium'
const engine = name === 'webkit' ? webkit : chromium
const output = 'artifacts/portrait-mobile'
await mkdir(output, { recursive: true })
const browser = await engine.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const page = await context.newPage()
const problems = []
page.on('pageerror', error => problems.push(String(error.message).slice(0, 250)))
const navigationDiagnostics = observePortraitNavigation(page, { origin })
let completed = false
const open = async path => {
  navigationDiagnostics.mark('goto-start', path)
  try {
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 90000 })
    navigationDiagnostics.mark('goto-complete', path)
    return response
  } catch (error) {
    navigationDiagnostics.mark('goto-failed', path)
    throw error
  }
}
const card = () => page.locator('[data-testid="insights-psychological-portrait"]')
const buttons = () => card().locator('button[data-portrait-sector]')
const labels = ['body','work','relationships','growth']
const expected = { body: 5, work: 3, relationships: 4, growth: 5 }

function assertMobileEvidence({ locale, width, sector, data }) {
  assert.equal(data.buttonCount, 6, 'All plus five life-profile buttons')
  assert.ok(data.sixInRow, `${locale} ${width}px: all six profile buttons must share one row`)
  assert.ok(data.minTapHeight >= 44 && data.minTapWidth >= 44, `${locale} ${width}px: six category buttons need >=44px tap targets`)
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
      sixInRow: tops.length === 6 && Math.max(...tops)-Math.min(...tops)<2,
      minTapHeight: Math.min(...buttons.map(button=>rect(button).height)),
      minTapWidth: Math.min(...buttons.map(button=>rect(button).width)),
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
  // The current guest Cabinet entry uses the self-contained Google CTA.
  // Avoid a second redirect through /en/app before synthetic PKCE begins.
  await open('/en/app/portrait')
  const signin = page.getByRole('button',{name:/^(Open my Cabinet with Google|Continue with Google)$/})
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
  navigationDiagnostics.mark('signed-in')
  console.log('PORTRAIT_QA',name,'synthetic Google PKCE double signed in (no real account)')

  for (const locale of ['en','ru']) {
    await open('/'+locale+'/app/portfolio')
    await expect(card()).toBeVisible({timeout:90000})
    await expect(buttons()).toHaveCount(5,{timeout:30000})
    await expect(card().locator('[class*="visualState"]')).toHaveCount(0)
    const all = card().locator('[data-portrait-sector-all]')
    await expect(all).toHaveCount(1)
    await expect(all).toHaveAttribute('aria-pressed','true')
    const overview = card().locator('svg[data-radar-mode="summary"]')
    await expect(overview).toBeVisible()
    await expect(overview.locator('[data-summary-sector]')).toHaveCount(4)
    await expect(card().locator('[data-detail-axis]')).toHaveCount(0)
    // Fifth life profile is NOT a fifth psychometric radar sector.
    // Exercise a real click: the private three-rating panel replaces the
    // diagram, while the four original sectors still retain their exact rays.
    const goalButton = card().locator('button[data-portrait-sector="goal"]')
    await goalButton.click()
    await expect(goalButton).toHaveAttribute('aria-pressed','true')
    const goalPanel = card().locator('[data-goal-profile]')
    await expect(goalPanel).toBeVisible()
    await expect(goalPanel.locator('[data-goal-support-facet]')).toHaveCount(3)
    await expect(card().locator('[data-radar-layout="full-circle"]')).toHaveCount(0)
    for (const width of [320,390,430]) {
      await page.setViewportSize({width,height:900})
      const fit = await card().locator('[data-portrait-sectors]').evaluate(parent => {
        const buttons = [...parent.querySelectorAll('button')]
        const rects = buttons.map(item=>item.getBoundingClientRect())
        return {
          buttons:buttons.length,
          minWidth:Math.min(...rects.map(r=>r.width)),
          minHeight:Math.min(...rects.map(r=>r.height)),
          rows:Math.max(...rects.map(r=>r.top))-Math.min(...rects.map(r=>r.top)),
          overflow:document.documentElement.scrollWidth-innerWidth,
        }
      })
      console.log('GOAL_PORTRAIT_NAV',JSON.stringify({engine:name,locale,width,...fit}))
      assert.equal(fit.buttons,6,locale+' goal profile must have All plus five options')
      assert.ok(fit.minWidth>=44 && fit.minHeight>=44,
        `${locale} ${width}px: all life profile taps must be at least 44px`)
      assert.ok(fit.rows<2 && fit.overflow<=1,
        `${locale} ${width}px: goal profile selector must stay one row, without overflow`)
    }
    await all.click()
    await expect(all).toHaveAttribute('aria-pressed','true')
    await expect(card().locator('svg[data-radar-mode="summary"]')).toBeVisible()
    await expect(card().locator('[data-summary-sector]')).toHaveCount(4)
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
    const takeTest = actions.locator('[data-testid="portrait-completion-action"]')
    await expect(takeTest).toContainText(locale === 'ru' ? 'Пройти тест' : 'Take Test')
    await expect(takeTest).toHaveAttribute('aria-expanded','false')
    await expect(actions.locator('[data-testid="portrait-analyses-action"]')).toContainText(locale === 'ru' ? 'Анализы' : 'Analyses')
    await expect(actions.locator('[data-testid="portrait-recommendations-action"]')).toContainText(locale === 'ru' ? 'Рекомендации' : 'Recommendations')

    // Owner's iPhone requirement: the first and last teal control rows must
    // share one visible mobile frame. Check geometry in the authenticated
    // isolated browser, including a short 550px screen and EN/RU wrapping.
    for (const width of [320, 390, 430]) {
      for (const height of [550, 768, 844]) {
        await page.setViewportSize({ width, height })
        // WebKit can finish resize/scroll placement after the viewport command.
        // Wait for measured stability, align once, then retain every hard gate.
        const frame = await card().evaluate(alignAndMeasureStablePortraitFrame, { width, height })
        // Log the *actual* browser geometry before gating short/regular phones.
        console.log('PORTRAIT_ONE_SCREEN', JSON.stringify({ engine:name, locale, width, height, ...frame }))
        const shortViewport = height <= 630
        const maxSpan = shortViewport ? 470 : 535
        assert.ok(frame.span <= maxSpan,
          `${locale} ${width}x${height}: portrait separates menus by ${frame.span}px (max ${maxSpan})`)
        assert.ok(frame.pictureWidth >= (shortViewport ? 228 : 262) && Math.abs(frame.pictureHeight / frame.pictureWidth - 390 / 360) < .025,
          `${locale} ${width}x${height}: image must fill available space while preserving its native aspect ratio`)
        assert.ok(frame.firstTop >= -2 && frame.lastBottom <= frame.viewportHeight - 70,
          `${locale} ${width}x${height}: both menu rows must be onscreen above bottom nav`)
        assert.ok(frame.minTopTap >= 44 && frame.minBottomTap >= 44,
          `${locale} ${width}x${height}: both menu rows need 44px touch targets`)
        assert.ok(frame.overflow <= 1, `${locale} ${width}x${height}: horizontal overflow`)
        if (width === 390 && height === 768) {
          await card().screenshot({
            path:`${output}/${name}-${locale}-390x768-both-menus.png`,
            animations:'disabled', timeout:30000,
          })
        }
      }
    }

    // Selecting a category, or even expanding Take Test, must not start a
    // questionnaire. Only a specific test button creates/resumes a run.
    const work = card().locator('button[data-portrait-sector="work"]')
    await work.click()
    const reportUrl = page.url()
    await takeTest.click()
    await expect(takeTest).toHaveAttribute('aria-expanded','true')
    const panel = card().locator('[data-testid="portrait-test-recommendations"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(locale === 'ru' ? 'Дело' : 'Work')
    const suggested = panel.locator('button[data-testid^="portrait-take-test-"]')
    assert.ok(await suggested.count() > 0, 'Work needs real cleared test suggestions')
    assert.equal(page.url(),reportUrl, 'Opening recommendations must not create a run')
    const testNames = await suggested.evaluateAll(items=>items.map(item=>item.dataset.testid))
    const relationships = card().locator('button[data-portrait-sector="relationships"]')
    await relationships.click()
    await expect(panel).toContainText(locale === 'ru' ? 'Отношения' : 'Relationships')
    assert.equal(page.url(),reportUrl, 'Changing the category must not navigate')
    const relationshipTests = await suggested.evaluateAll(items=>items.map(item=>item.dataset.testid))
    assert.ok(relationshipTests.length>0, 'Relationships needs real cleared test suggestions')
    assert.ok(testNames.some(key=>!relationshipTests.includes(key)) ||
      relationshipTests.some(key=>!testNames.includes(key)), 'Category should change recommended tests')
    await takeTest.click()
    await expect(takeTest).toHaveAttribute('aria-expanded','false')
    await expect(panel).not.toBeVisible()

    // Switch all three views on a real authenticated synthetic account.
    // Neither Analyses nor Recommendations may jump to a lower-page section.
    const analysesTab = actions.locator('[data-testid="portrait-analyses-action"]')
    const recommendationsTab = actions.locator('[data-testid="portrait-recommendations-action"]')
    await expect(actions).toHaveAttribute('role','tablist')
    await expect(actions.locator('[role="tab"]')).toHaveCount(3)
    for (const width of [320,390,430]) {
      await page.setViewportSize({width,height:900})
      await actions.scrollIntoViewIfNeeded()
      const before=page.url()
      const y=await page.evaluate(()=>window.scrollY)
      await analysesTab.click()
      await expect(analysesTab).toHaveAttribute('aria-selected','true')
      await expect(card().locator('#hh-portrait-panel-analyses')).toBeVisible()
      await expect(card().locator('[data-testid="portrait-analyses"]')).toBeVisible()
      await expect(panel).not.toBeVisible()
      await expect(card().locator('[data-portrait-ray-options]')).toHaveCount(0)
      assert.ok(Math.abs((await page.evaluate(()=>window.scrollY))-y)<100,
        `${locale} ${width}px: Analyses tab unexpectedly scrolled away from portrait`)
      await recommendationsTab.click()
      await expect(recommendationsTab).toHaveAttribute('aria-selected','true')
      await expect(card().locator('#hh-portrait-panel-analyses')).toBeHidden()
      await expect(card().locator('#hh-portrait-panel-recommendations')).toBeVisible()
      await expect(card().locator('[data-testid="portrait-recommendations"]')).toBeVisible()
      assert.equal(page.url(),before,'Recommendations tab must stay on Reports')
      assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth - innerWidth))<=1,
        `${locale} ${width}px: inline recommendations overflow the mobile viewport`)
      await takeTest.click()
      await expect(takeTest).toHaveAttribute('aria-selected','true')
      await expect(takeTest).toHaveAttribute('aria-expanded','true')
      await expect(panel).toBeVisible()
      await expect(card().locator('#hh-portrait-panel-recommendations')).toBeHidden()
      await expect(card().locator('[data-portrait-ray-options]')).toBeVisible()
      await takeTest.click()
      await expect(panel).not.toBeVisible()
      await takeTest.focus()
      await page.keyboard.press('End')
      await expect(recommendationsTab).toHaveAttribute('aria-selected','true')
      await page.keyboard.press('Home')
      await expect(takeTest).toHaveAttribute('aria-selected','true')
      await expect(panel).toBeVisible()
      await takeTest.click()
      await expect(panel).not.toBeVisible()
      assert.equal(page.url(),before,'Local keyboard tabs must not navigate')
      console.log('PORTRAIT_TABS_QA',JSON.stringify({engine:name,locale,width,local:true}))
    }
    if(locale==='en'){
      await work.click()
      await takeTest.click()
      await suggested.first().click()
      await expect(page).toHaveURL(/\/en\/app\/runs\/[^/?#]+\?mode=quick/,{timeout:60000})
      // A changed URL alone does not prove the destination's bootstrap and run loaded.
      // Assert the real quick-runner UI before starting the next locale; do not answer it.
      const openedRun = page.url()
      await expect(page.locator('.hh-runner.hh-runner--quick')).toBeVisible()
      const firstQuestion = page.locator('.hh-runner.hh-runner--quick .hh-quick-form > fieldset.hh-quick-question').first()
      await expect(firstQuestion).toBeVisible()
      await expect(firstQuestion).toHaveJSProperty('disabled', false)
      await expect(page).toHaveURL(openedRun)
      console.log('PORTRAIT_QA',name,'one explicit Take test click opened a real synthetic account test')
    }
  }
  // Next's development error-overlay may emit a blocked /__nextjs_original-stack-frames
  // request (plus an opaque Event) under the isolated loopback/CSP browser.
  // Ignore only that known tooling noise; real application pageerrors still fail.
  const devOverlayBlocked = problems.some(item => item.includes('/__nextjs_original-stack-frames'))
  const appProblems = problems.filter(item => !item.includes('/__nextjs_original-stack-frames') &&
    !(devOverlayBlocked && item === '[object Event]'))
  assert.equal(appProblems.length,0,'Browser script errors: '+appProblems.join('; '))
  console.log('PORTRAIT_QA_SUCCESS',name, '2 locales x 3 widths x 4 scored sectors + separate Goal profile')
  completed = true
} finally {
  navigationDiagnostics.mark(completed ? 'success' : 'failure')
  try {
    await writeFile(`${output}/${name}-navigation.json`, JSON.stringify(navigationDiagnostics.stop(), null, 2) + '\n')
  } catch {
    // A diagnostic write must never replace the original browser failure.
    console.warn('PORTRAIT_NAVIGATION_DIAGNOSTICS_UNAVAILABLE')
  }
  await context.close()
  await browser.close()
}
