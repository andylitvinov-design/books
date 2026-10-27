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
  assert.equal(data.buttonCount, 6, 'All and five life-profile buttons')
  assert.ok(data.sixInRow, `${locale} ${width}px: six focus buttons must share one row`)
  assert.ok(data.minTapHeight >= 44 && data.minTapWidth >= 44, `${locale} ${width}px: all six profile chips need at least 44×44px tap targets`)
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
    const mini = card().locator('[data-testid="portrait-view-switch"]')
    const chartTab = mini.locator('[data-portrait-view="chart"]')
    const axesTab = mini.locator('[data-portrait-view="axes"]')
    const testsTab = mini.locator('[data-portrait-view="tests"]')
    await expect(mini.locator('[role="tab"]')).toHaveCount(3)
    await expect(chartTab).toHaveAttribute('aria-selected','true')
    await expect(axesTab).toContainText(locale === 'ru' ? 'Оси' : 'Axes')
    await expect(testsTab).toContainText(locale === 'ru' ? 'Тесты' : 'Tests')
    const goalsAction = actions.locator('[data-testid="portrait-goals-action"]')
    await expect(goalsAction).toContainText(locale === 'ru' ? 'Цели' : 'Goals')
    await expect(goalsAction).toHaveAttribute('href','#hh-development-program')
    await expect(actions.locator('[data-testid="portrait-analyses-action"]')).toBeVisible()
    await expect(actions.locator('[data-testid="portrait-recommendations-action"]')).toBeVisible()

        // Owner's iPhone requirement: the first and last teal control rows must
    // share one visible mobile frame. Check geometry in the authenticated
    // isolated browser, including a short 550px screen and EN/RU wrapping.
    for (const width of [320, 390, 430]) {
      for (const height of [550, 768, 844]) {
        await page.setViewportSize({ width, height })
        await card().locator('[data-portrait-sectors]').evaluate(async el => {
          // Align the *viewport* after scrollIntoView: a clipping <details>
          // ancestor may consume its scroll request on short iPhones. Keep the
          // exact 470/535px size, no-clipping, and >=44px touch assertions.
          el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
          const viewportOffset = el.getBoundingClientRect().top
          window.scrollBy({ top: viewportOffset - 6, behavior: 'instant' })
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        })
        const frame = await card().evaluate(el => {
          const rect = node => node.getBoundingClientRect()
          const upper = rect(el.querySelector('[data-portrait-sectors]'))
          const lower = rect(el.querySelector('[data-testid="portrait-quick-actions"]'))
          const middle = el.querySelector('[data-testid="portrait-view-switch"]')
          const middleButtons = [...(middle?.querySelectorAll('button') || [])]
          const picture = rect(el.querySelector('[data-radar-layout="full-circle"]'))
          const upperButtons = [...el.querySelectorAll('[data-portrait-sectors] button')]
          const lowerButtons = [...el.querySelectorAll('[data-testid="portrait-quick-actions"] a, [data-testid="portrait-quick-actions"] button')]
          return {
            firstTop: upper.top,
            lastBottom: lower.bottom,
            pageScrollY: window.scrollY,
            maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
            span: lower.bottom - upper.top,
            pictureWidth:picture.width,
            pictureHeight:picture.height,
            minTopTap: Math.min(...upperButtons.map(node => rect(node).height)),
            miniTabCount: middleButtons.length,
            middleVisible: Boolean(middle && rect(middle).top >= upper.bottom && rect(middle).bottom <= lower.top),
            minMiddleTap: middleButtons.length ? Math.min(...middleButtons.map(node => rect(node).height)) : 0,
            minBottomTap: Math.min(...lowerButtons.map(node => rect(node).height)),
            viewportHeight: innerHeight,
            overflow: document.documentElement.scrollWidth - innerWidth,
          }
        })
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
        assert.ok(frame.miniTabCount === 3 && frame.middleVisible && frame.minMiddleTap >= 44,
          `${locale} ${width}x${height}: Chart / Axes / Tests must remain between green focus chips and chart, at least 44px tall`)
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

    // None of the three mini-tabs starts a test or mutates assessment scores.
    // The Pro / Check-in filter is a genuine catalogue-backed subset.
    const work = card().locator('button[data-portrait-sector="work"]')
    await work.click()
    const reportUrl = page.url()
    await testsTab.click()
    await expect(testsTab).toHaveAttribute('aria-selected','true')
    const panel = card().locator('[data-testid="portrait-profile-test-catalogue"]')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(locale === 'ru' ? 'Дело' : 'Work')
    const suggested = panel.locator('button[data-testid^="portrait-take-test-"]')
    assert.ok(await suggested.count() > 0, 'Work needs real cleared test options')
    assert.equal(page.url(),reportUrl,'Opening test catalogue must not create a run')
    const keys = await panel.locator('[data-test-definition]').evaluateAll(items => items.map(item => item.dataset.testDefinition))
    const proFilter = panel.locator('[data-portrait-test-kind="professional"]')
    const checkinFilter = panel.locator('[data-portrait-test-kind="monitoring"]')
    await proFilter.click()
    await expect(proFilter).toHaveAttribute('aria-pressed','true')
    const proKinds = await panel.locator('[data-test-definition]').evaluateAll(items => items.map(item => item.dataset.testKind))
    assert.ok(proKinds.every(kind => kind === 'professional'),'Pro filter must not leak Check-ins')
    await checkinFilter.click()
    await expect(checkinFilter).toHaveAttribute('aria-pressed','true')
    const checkinKinds = await panel.locator('[data-test-definition]').evaluateAll(items => items.map(item => item.dataset.testKind))
    assert.ok(checkinKinds.every(kind => kind === 'monitoring'),'Check-in filter must not leak Pro')
    await panel.locator('[data-portrait-test-kind="all"]').click()
    const relationships = card().locator('button[data-portrait-sector="relationships"]')
    await relationships.click()
    await expect(panel).toContainText(locale === 'ru' ? 'Отношения' : 'Relationships')
    const relKeys = await panel.locator('[data-test-definition]').evaluateAll(items => items.map(item => item.dataset.testDefinition))
    assert.ok(relKeys.length > 0, 'Relationships needs real matching tests')
    assert.ok(keys.some(key => !relKeys.includes(key)) || relKeys.some(key => !keys.includes(key)),
      'Different life profiles should use different catalogue measurements')
    assert.equal(page.url(),reportUrl,'Test filters and categories must not navigate')

    // Axes selected in the second mini-tab control the full-circle wheel.
    await axesTab.click()
    await expect(card().locator('[data-testid="portrait-axes-panel"]')).toBeVisible()
    const axisCheckbox = card().locator('[data-portrait-ray="relationships"] input[type="checkbox"]')
    await expect(axisCheckbox).toBeChecked()
    await axisCheckbox.uncheck()
    await chartTab.click()
    await expect(chartTab).toHaveAttribute('aria-selected','true')
    const chartChoices = card().locator('[data-testid="portrait-chart-options"]')
    await expect(chartChoices).toHaveCount(0)
    // The optional wheel variant lives behind a second deliberate Chart tap,
    // keeping the entire three-tab menu and photograph visible on short phones.
    await chartTab.click()
    await expect(chartChoices).toBeVisible()
    const allProfiles = chartChoices.locator('[data-chart-mode="profiles"]')
    const chosenAxes = chartChoices.locator('[data-chart-mode="axes"]')
    await chosenAxes.click()
    await expect(chosenAxes).toHaveAttribute('aria-pressed','true')
    const wheel = card().locator('svg[data-radar-mode="axes"]')
    await expect(wheel).toBeVisible()
    await expect(wheel.locator('[data-detail-axis="relationships"]')).toHaveCount(0)
    assert.ok(await wheel.locator('[data-detail-axis]').count() >= 12,'The chosen wheel combines axes from all four profiles')
    await allProfiles.click()
    await expect(allProfiles).toHaveAttribute('aria-pressed','true')
    await all.click()
    await expect(card().locator('svg[data-radar-mode="summary"]')).toBeVisible()

    // Lower Goals is a link to the existing *private* saved programme editor;
    // Analyses and Recommendations still switch their inline panels.
    const analysesTab = actions.locator('[data-testid="portrait-analyses-action"]')
    const recommendationsTab = actions.locator('[data-testid="portrait-recommendations-action"]')
    await expect(actions).toHaveAttribute('role','group')
    await expect(actions.locator('a,button')).toHaveCount(3)
    for (const width of [320,390,430]) {
      await page.setViewportSize({width,height:900})
      await actions.scrollIntoViewIfNeeded()
      const before = page.url()
      const y = await page.evaluate(()=>window.scrollY)
      await analysesTab.click()
      await expect(analysesTab).toHaveAttribute('aria-pressed','true')
      await expect(card().locator('#hh-portrait-panel-analyses')).toBeVisible()
      await expect(card().locator('[data-testid="portrait-analyses"]')).toBeVisible()
      assert.ok(Math.abs((await page.evaluate(()=>window.scrollY))-y)<100,
        'Analyses should not scroll away from the portrait')
      await recommendationsTab.click()
      await expect(recommendationsTab).toHaveAttribute('aria-pressed','true')
      await expect(card().locator('#hh-portrait-panel-analyses')).toBeHidden()
      await expect(card().locator('#hh-portrait-panel-recommendations')).toBeVisible()
      await expect(card().locator('[data-testid="portrait-recommendations"]')).toBeVisible()
      assert.equal(page.url(),before,'Recommendations must stay on Reports')
      assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth - innerWidth))<=1,
        'Recommendations must not overflow the mobile viewport')
    }
    // Keyboard navigation belongs to the three mini-tabs (Home/End/Arrow).
    await chartTab.focus()
    await page.keyboard.press('End')
    await expect(testsTab).toHaveAttribute('aria-selected','true')
    await testsTab.focus()
    await page.keyboard.press('Home')
    await expect(chartTab).toHaveAttribute('aria-selected','true')

    if (locale === 'en') {
      await work.click()
      await testsTab.click()
      const action = panel.locator('button[data-testid^="portrait-take-test-"]').first()
      await expect(action).toBeVisible()
      await action.click()
      await expect(page).toHaveURL(/\/en\/app\/runs\/[^/?#]+\?mode=quick/,{timeout:60000})
      console.log('PORTRAIT_QA',name,'explicit test start reached synthetic authenticated run')
    } else {
      await goalsAction.click()
      await expect(page.locator('#hh-development-goals-panel')).toBeVisible({timeout:30000})
      await expect(page.locator('[data-development-target-editor]').first()).toBeVisible()
      console.log('PORTRAIT_QA',name,'Goals opened existing private programme editor')
    }
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
