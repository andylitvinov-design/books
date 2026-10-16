// Hosted-only component acceptance. Do not launch this on a local executor.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit, expect } from '@playwright/test'
import {
  assertHostedBachAcceptance, bachFixtureOrigin, bachFixtureScope, bachViewports,
  buildBachPersonalReportFixture, createBachFixtures,
} from './helpers/bach-personal-report-fixture.mjs'
import { collectBachGeometry, assertBachGeometry } from './helpers/bach-report-geometry.mjs'

assertHostedBachAcceptance(process.env)
const engineName = process.env.HH_TEST_BROWSER
assert.ok(['chromium', 'webkit'].includes(engineName), 'Explicit supported hosted browser required')
const engine = engineName === 'webkit' ? webkit : chromium
const output = `artifacts/app-r1/bach-personal-report-${engineName}`
await mkdir(output, { recursive: true })
const fixture = await buildBachPersonalReportFixture()
const cases = createBachFixtures()
const evidence = { commit: process.env.GITHUB_SHA, browser: engineName, scope: bachFixtureScope,
  sourceProof: fixture.sourceProof, expectedCases: cases.length * bachViewports.length, cases: [], failure: null }
await writeFile(`${output}/source-proof.json`, JSON.stringify(evidence, null, 2) + '\n')
const browser = await engine.launch()
evidence.browserVersion = await browser.version()
let activePage, activeCase
const normalise = text => String(text).replace(/\s+/g, ' ').trim()
try {
  for (const value of cases) for (const width of bachViewports) {
    const id = [value.version, value.instrumentLocale, value.locale, value.pattern, width].join('-')
    activeCase = id
    // Three bounded viewport captures in 20 representative cells per engine.
    // Every one of the 72 cells still gets complete numerical geometry.
    const screenshotSample = value.instrumentLocale === value.locale && (value.pattern === 'mixed' || width === 320)
    const screenshots = []
    const directory = `${output}/${id}`
    await mkdir(directory, { recursive: true })
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' })
    context.setDefaultTimeout(10000)
    const requests = [], errors = []
    // The sole permitted response is the in-memory fixture document. No
    // passthrough, even for same-origin assets, API calls or unknown routes.
    const url = bachFixtureOrigin + value.path
    const html = fixture.document(value)
    await context.route('**/*', route => {
      const request = route.request()
      if (request.url() === url && request.isNavigationRequest() && request.method() === 'GET') {
        return route.fulfill({ contentType: 'text/html', headers: {
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'",
        }, body: html })
      }
      requests.push({ method: request.method(), url: request.url() })
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    activePage = page
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(url, { waitUntil: 'load' })
      const report = page.locator('[data-personal-result-report][data-bach-profile="true"]')
      const details = report.locator('details'), summary = details.locator(':scope > summary')
      const articles = report.locator('article')
      const featured = report.locator(':scope > .bach_fixture_grid > article')
      const remaining = details.locator('article')
      await expect(report).toHaveCount(1)
      await expect(report).toHaveAttribute('aria-label', value.report.title)
      await expect(articles).toHaveCount(38)
      await expect(featured).toHaveCount(value.report.highlightedCount)
      await expect(remaining).toHaveCount(38 - value.report.highlightedCount)
      await expect(details).not.toHaveAttribute('open')
      await expect(summary).toHaveText((value.locale === 'ru' ? 'Посмотреть остальные эмоциональные темы' : 'Explore the remaining emotional themes') + `(${38 - value.report.highlightedCount})`)
      for (const article of await remaining.all()) await expect(article).toBeHidden()
      for (const article of await featured.all()) await expect(article).toBeVisible()
      const expectedSource = value.report.source
      await expect(report.locator('header a')).toBeVisible()
      await expect(report.locator('header a')).toHaveAttribute('href', expectedSource)
      for (const expected of [value.report.purpose, value.report.scaleNote, value.report.methodology, value.report.note, value.report.seekSupport].filter(Boolean)) {
        assert.ok(normalise(await report.innerText()).includes(normalise(expected)), `${id}: visible source/status warning missing: ${expected}`)
      }
      const capture = async state => {
        const geometry = await page.evaluate(collectBachGeometry)
        await writeFile(`${directory}/${state}-geometry.json`, JSON.stringify(geometry, null, 2) + '\n')
        assertBachGeometry(geometry, `${id}/${state}`)
        return { state, documentWidth: geometry.documentWidth, viewportWidth: geometry.viewportWidth,
          visibleArticles: geometry.articles.length, textFragments: geometry.textFragments.length }
      }
      const states = [await capture('closed')]
      assert.equal(states[0].visibleArticles, value.report.highlightedCount)
      if (screenshotSample) {
        const name = value.report.highlightedCount ? 'closed-first-theme.png' : 'closed-all-zero-disclosure.png'
        await (value.report.highlightedCount ? featured.first() : summary).scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${directory}/${name}`, animations: 'disabled' })
        screenshots.push(name)
      }
      // Reach the native summary through real sequential keyboard navigation.
      for (let tab = 0; tab < 12 && !(await summary.evaluate(node => node === document.activeElement)); tab++) {
        await page.keyboard.press('Tab')
      }
      await expect(summary).toBeFocused()
      const focus = await summary.evaluate(node => {
        const style = getComputedStyle(node)
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }
      })
      assert.ok(focus.width > 0 && focus.style !== 'none', `${id}: native summary keyboard focus must be visible`)
      await page.keyboard.press('Enter')
      await expect(details).toHaveAttribute('open', '')
      await expect(summary).toBeFocused()
      for (const [index, section] of value.report.sections.entries()) {
        const card = articles.nth(index)
        await expect(card).toBeVisible()
        for (const selector of ['h3', '.bach_fixture_construct', '.bach_fixture_number', '.bach_fixture_score', 'a']) {
          await expect(card.locator(selector)).toBeVisible()
        }
        await expect(card.locator('h3')).toHaveText(section.title)
        await expect(card.locator('.bach_fixture_construct')).toHaveText(section.construct)
        await expect(card.locator('.bach_fixture_number')).toHaveText(String(index + 1).padStart(2, '0'))
        await expect(card.locator('.bach_fixture_score')).toHaveText(
          `${value.locale === 'ru' ? 'Вес совпадений' : 'Weighted match'}: ${section.value} (${value.locale === 'ru' ? 'диапазон' : 'range'} ${section.min}–${section.max})`)
        await expect(card.locator('a')).toHaveAttribute('href', expectedSource)
        for (const expected of [section.meaning, ...section.steps, ...section.limitations, section.followUp].filter(Boolean)) {
          assert.ok(normalise(await card.innerText()).includes(normalise(expected)), `${id}/${section.key}: full advice or warning missing`)
        }
      }
      states.push(await capture('open'))
      assert.equal(states[1].visibleArticles, 38)
      const longest = value.report.sections.reduce((best, section, index, all) => section.title.length > all[best].title.length ? index : best, 0)
      if (screenshotSample) {
        await articles.nth(longest).scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${directory}/open-longest-title.png`, animations: 'disabled' })
        await articles.last().scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${directory}/open-last-theme.png`, animations: 'disabled' })
        screenshots.push('open-longest-title.png', 'open-last-theme.png')
      }
      // Native Space collapse, Space reopen, Enter close: no custom click shim.
      await summary.focus()
      await page.keyboard.press('Space')
      await expect(details).not.toHaveAttribute('open')
      await expect(summary).toBeFocused()
      for (const article of await remaining.all()) await expect(article).toBeHidden()
      states.push(await capture('collapsed-again'))
      await page.keyboard.press('Space')
      await expect(details).toHaveAttribute('open', '')
      states.push(await capture('reopened'))
      await page.keyboard.press('Enter')
      await expect(details).not.toHaveAttribute('open')
      await expect(summary).toBeFocused()
      assert.equal(page.url(), url, 'Keyboard disclosure must not navigate')
      assert.deepEqual(requests, [], 'Fixture attempted a forbidden request')
      assert.deepEqual(errors, [], 'Browser page errors')
      evidence.cases.push({ id, version: value.version, instrumentLocale: value.instrumentLocale,
        locale: value.locale, pattern: value.pattern, width, allThemes: 38, featured: value.report.highlightedCount,
        remaining: 38 - value.report.highlightedCount, keyboard: ['Tab', 'Enter', 'Space', 'Space', 'Enter'], focus,
        states, screenshots, networkRequests: 0, exactLabelsValuesBoundsSourcesWarnings: true })
      console.log('BACH_PERSONAL_REPORT_PASS ' + id)
    } catch (error) {
      await page.screenshot({ path: `${directory}/failure.png`, animations: 'disabled' }).catch(() => {})
      await writeFile(`${directory}/failure.json`, JSON.stringify({ message: error.message, requests, errors }, null, 2) + '\n')
      throw error
    } finally {
      activePage = null
      await context.close()
    }
  }
  assert.equal(evidence.cases.length, evidence.expectedCases)
} catch (error) {
  evidence.failure = { case: activeCase, message: error.message }
  await activePage?.screenshot({ path: `${output}/failure.png` }).catch(() => {})
  throw error
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify(evidence, null, 2) + '\n')
  await browser.close()
}
