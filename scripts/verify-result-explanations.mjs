// All credentials and records belong to the loopback-only synthetic CI double.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine = process.env.HH_TEST_BROWSER === 'webkit' ? webkit : chromium
const browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? {executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE} : {})
const output = 'artifacts/app-r1/result-explanations-' + engine.name()
await mkdir(output, {recursive: true})
const checks = [], errors = []
const passed = name => {checks.push(name); console.log('PASS ' + name)}
async function navigate(page, path) {
  await page.waitForLoadState('networkidle')
  await page.goto(origin + path)
  await page.waitForLoadState('networkidle')
}
async function api(context, path, body) {
  const response = await context.request.fetch(origin + '/api/app/' + path, {
    method: body ? 'POST' : 'GET', headers: body ? {Origin: origin, 'Content-Type': 'application/json'} : {}, data: body,
  })
  const value = await response.json()
  assert.ok(response.ok(), path + ': ' + JSON.stringify(value))
  return value
}
let page
try {
  const account = await browser.newContext({viewport: {width: 390, height: 844}})
  page = await account.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await navigate(page, '/en/app')
  await page.getByRole('button', {name: 'Continue with Google', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Create my private space', exact: true}).or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({timeout: 60000})
  if (await page.getByRole('heading', {name: 'Create my private space', exact: true}).isVisible()) {
    await page.getByLabel('I am 18 or older.').check()
    await page.getByLabel('I agree to private processing', {exact: false}).check()
    await page.getByRole('button', {name: 'Create my private space', exact: true}).click()
  }
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({timeout: 30000})
  // Complete a standalone CBI through the same quick runner used by clients.
  const definition = getAssessmentDefinition('cbi-personal', 'v1', 'en')
  const run = await api(account, 'runs', {definitionKey: definition.key, definitionVersion: 'v1', instrumentLocale: 'en', operationId: randomUUID()})
  await navigate(page, '/en/app/runs/' + run.id + '?mode=quick')
  for (let index = 0; index < definition.questions.length; index++) {
    const scope = page.locator('.hh-quick-question').nth(index)
    await expect(scope.getByRole('heading', {name: definition.questions[index].text, exact: true})).toBeVisible()
    const saved = page.waitForResponse(response => response.url().includes('/runs/') && response.url().endsWith('/save') && response.request().method() === 'POST')
    await scope.locator('.hh-scale button').nth(2).click()
    assert.ok((await saved).ok())
  }
  await page.getByRole('button', {name: 'Save results and get recommendations', exact: true}).click()
  const report = page.locator('[data-personal-result-report]')
  await expect(report).toBeVisible({timeout: 30000})
  await expect(report.locator('[data-scale-construct]')).toContainText('prolonged physical and psychological exhaustion')
  await expect(report.locator('[data-score-calculation]')).toContainText('Mean across 6 items: 50')
  await expect(report.locator('[data-score-reading]')).toContainText('50 (sometimes)')
  await expect(report.locator('[data-explanation-source]')).toHaveAttribute('href', 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf#page=1')
  assert.equal(await report.locator('[data-result-explanation]').evaluate(node => Boolean(node.closest('details:not([open])'))), false)
  passed('CBI after-test result visibly explains construct, calculation, response anchors and primary source without opening details')
  const data = await api(account, 'bootstrap')
  const result = data.results.find(item => item.runId === run.id)
  assert.ok(result)
  assert.equal(result.dimensions[0].value, 50)
  for (const locale of ['en', 'ru']) {
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({width, height: 844})
      await navigate(page, '/' + locale + '/app/results/' + result.id)
      await expect(report).toBeVisible({timeout: 30000})
      await expect(report.locator('[data-score-reading]')).toContainText(locale === 'ru' ? '50 (иногда)' : '50 (sometimes)')
      await expect(report.locator('[data-response-anchors]')).toBeVisible()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' report overflow at ' + width)
      await page.screenshot({path: output + '/cbi-' + locale + '-' + width + '.png', fullPage: true})
      await navigate(page, '/' + locale + '/app/portfolio')
      const explanation = page.locator('[data-insights-explanation="cbi-personal"]')
      await expect(explanation).toContainText(locale === 'ru' ? 'физическое и психологическое истощение' : 'physical and psychological exhaustion')
      await expect(explanation).toContainText(locale === 'ru' ? 'Практический шаг' : 'Practical next step')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' Insights overflow at ' + width)
      if (width === 390) await page.screenshot({path: output + '/insights-' + locale + '.png', fullPage: true})
      await explanation.locator('..').locator('.hh-insights-test-link').click()
      await expect(report.locator('[data-score-calculation]')).toBeVisible({timeout: 20000})
    }
    passed(locale + ': saved report and Insights explanation, practical next step and working full-report link at 320/390/1280px')
  }
  assert.deepEqual(errors, [])
  await writeFile(output + '/verification.json', JSON.stringify({commit: process.env.GITHUB_SHA, checks, browser: await browser.version(), records: 'SYNTHETIC_ONLY', auth: 'ISOLATED_PROTOCOL_DOUBLE_NOT_GOOGLE'}, null, 2))
} catch (error) {
  await page?.screenshot({path: output + '/failure.png', fullPage: true}).catch(() => {})
  await writeFile(output + '/verification.json', JSON.stringify({commit: process.env.GITHUB_SHA, checks, failure: error.message}, null, 2))
  throw error
} finally { await browser.close() }
