// Public/account picker parity against a disposable loopback database only.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated, adminClient, A } from '../tests/helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'

assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine = process.env.HH_TEST_BROWSER === 'webkit' ? webkit : chromium
const browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE } : {})
const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
context.setDefaultTimeout(15000); context.setDefaultNavigationTimeout(60000)
const page = await context.newPage(), checks = [], errors = [], devNavigationDiagnostics = []
const output = 'artifacts/app-r1/account-test-picker-' + engine.name()
await mkdir(output, { recursive: true })
page.on('pageerror', error => {
  if (engine.name() === 'webkit' && process.env.NODE_ENV === 'development' && /\/_next\/static\/webpack\/[a-f0-9]+\.webpack\.hot-update\.json due to access control checks\.$/.test(error.message)) { devNavigationDiagnostics.push(error.message); return }
  errors.push(error.message)
})
const setupAdmin = await adminClient()
const accountExisted = Boolean((await setupAdmin.query('select 1 from app.accounts where id=$1', [A])).rowCount)
await setupAdmin.end()
const passed = name => { checks.push(name); console.log('PASS ' + name) }
async function api(path, data) {
  const response = await context.request.fetch(origin + '/api/app/' + path, {
    method: data ? 'POST' : 'GET', headers: data ? { Origin: origin, 'Content-Type': 'application/json' } : {}, data,
  })
  const body = await response.json()
  assert.ok(response.ok(), path + ': ' + JSON.stringify(body))
  return body
}
async function navigate(path) {
  await page.waitForLoadState('networkidle')
  await page.goto(origin + path)
  await page.waitForLoadState('networkidle')
}
try {
  await page.goto(origin + '/en/app')
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
  const consent = page.getByRole('heading', { name: 'Create my private space', exact: true })
  await expect(consent.or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({ timeout: 60000 })
  if (await consent.isVisible()) {
    await page.getByLabel('I am 18 or older.').check()
    await page.getByLabel('I agree to private processing', { exact: false }).check()
    await page.getByRole('button', { name: 'Create my private space', exact: true }).click()
  }
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible()
  const base = getAssessmentDefinition('hh-current-state', 'v2', 'en')
  await api('test-plans', { items: [{ definitionKey: base.key, definitionVersion: base.version, instrumentLocale: 'en' }], appendActive: true, operationId: randomUUID() })
  const run = await api('runs', { definitionKey: base.key, definitionVersion: base.version, instrumentLocale: 'en', operationId: randomUUID() })
  const draft = await api('runs/' + run.id + '/save', { expectedRevision: run.revision, operationId: randomUUID(), answers: { [base.questions[0].id]: 2 }, context: {}, progress: 1 })
  // Preserve a genuinely completed result as well as the earlier partial draft.
  const completedDefinition = getAssessmentDefinition('cbi-personal', 'v1', 'en')
  const completedRun = await api('runs', { definitionKey: completedDefinition.key, definitionVersion: completedDefinition.version, instrumentLocale: 'en', operationId: randomUUID() })
  const completedAnswers = await api('runs/' + completedRun.id + '/save', { expectedRevision: completedRun.revision, operationId: randomUUID(), answers: Object.fromEntries(completedDefinition.questions.map(question => [question.id, 2])), context: {}, progress: completedDefinition.questions.length })
  const completedResult = await api('runs/' + completedRun.id + '/submit', { expectedRevision: completedAnswers.revision })
  for (const locale of ['en', 'ru']) {
    const ru = locale === 'ru'
    const before = await api('bootstrap')
    assert.ok(before.results.some(result => result.id === completedResult.id))
    const oldIds = before.activeTestPlan.definitionIds
    await navigate('/' + locale + '/app/tests')
    const open = page.locator('[data-my-tests-dashboard]').getByRole('button', { name: ru ? /Открыть фильтр тестов/ : /Open test filters/ })
    await open.focus(); await open.press('Enter')
    const picker = page.locator('[data-modern-test-picker="account"]')
    await expect(picker).toBeVisible()
    const add = picker.getByRole('button', { name: ru ? /Добавить выбранные тесты/ : /Add selected tests/ })
    await expect(add).toBeDisabled()
    await expect(picker.locator('[data-selected-test-key]')).toHaveCount(0)
    const stress = picker.getByRole('button', { name: ru ? 'Стресс' : 'Stress', exact: true })
    await stress.click(); await expect(stress).toHaveAttribute('aria-pressed', 'true')
    const entries = buildExplorerEntries({ locale, audience: 'account' })
    const visibleKeys = await picker.locator('[data-test-match]').evaluateAll(nodes => nodes.map(node => node.dataset.testMatch))
    const key = visibleKeys.find(candidate => !oldIds.includes(entries.find(entry => entry.key === candidate)?.definition?.id))
    assert.ok(key, 'synthetic fixture has at least one new matching test')
    const chosen = entries.find(entry => entry.key === key)
    await picker.locator('[data-test-match="' + key + '"] input').check()
    await expect(add).toBeEnabled()
    await picker.getByRole('button', { name: ru ? 'Открыть всю базу тестов' : 'Browse full database', exact: true }).click()
    await page.getByRole('button', { name: ru ? '← Назад к простому подбору' : '← Back to easy selection', exact: true }).click()
    await expect(picker.locator('[data-selected-test-key="' + key + '"]')).toBeVisible()
    await expect(stress).toHaveAttribute('aria-pressed', 'true')
    await picker.getByRole('button', { name: ru ? '← Назад к моим тестам' : '← Back to My tests', exact: true }).click()
    await expect(picker).toBeHidden()
    await open.click(); await expect(picker).toBeVisible()
    await expect(picker.locator('[data-selected-test-key="' + key + '"]')).toBeVisible()
    await expect(stress).toHaveAttribute('aria-pressed', 'true')
    await picker.getByRole('button', { name: ru ? 'Сбросить все фильтры' : 'Reset all filters', exact: true }).click()
    await expect(stress).toHaveAttribute('aria-pressed', 'false')
    await expect(picker.locator('[data-selected-test-key="' + key + '"]')).toBeVisible()
    await picker.getByRole('button', { name: ru ? 'Сон' : 'Sleep', exact: true }).click()
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await picker.scrollIntoViewIfNeeded()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' picker overflow at ' + width)
      await page.screenshot({ path: output + '/modern-picker-' + locale + '-' + width + '.png', fullPage: false })
    }
    await add.click()
    await expect(picker).toBeHidden()
    const after = await api('bootstrap')
    assert.ok(oldIds.every(id => after.activeTestPlan.definitionIds.includes(id)))
    assert.ok(after.activeTestPlan.definitionIds.includes(chosen.definition.id))
    assert.ok(before.results.every(result => after.results.some(saved => saved.id === result.id)))
    assert.deepEqual((await api('runs/' + draft.id)).answers, draft.answers)
    assert.ok(after.activeTestPlan.selectionPreferences.focus.includes('sleep'))
    await navigate('/' + locale + '/app/tests')
    await open.click()
    await expect(picker.getByRole('button', { name: ru ? 'Сон' : 'Sleep', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(add).toBeDisabled()
    // Category links use this same route and component, including non-home topics.
    await navigate('/' + locale + '/app/tests?explore=1&filters=topics&category=personality')
    await expect(picker).toBeVisible()
    await expect(picker.locator('[data-picker-filter-state]')).toContainText(ru ? 'Личность' : 'Personality')
    await expect(add).toBeDisabled()
    passed(locale + ': shared modern picker, manual selection, filters/category, reset, Back persistence, additive save and saved-answer/result preservation at 320/390/1280px')
  }
  assert.deepEqual(errors, [])
  await writeFile(output + '/verification.json', JSON.stringify({ commit: process.env.GITHUB_SHA, checks, errors, devNavigationDiagnostics, fixture: 'SYNTHETIC_LOOPBACK_ONLY' }, null, 2))
} catch (error) {
  await page.screenshot({ path: output + '/failure.png', fullPage: false }).catch(() => {})
  await writeFile(output + '/verification.json', JSON.stringify({ commit: process.env.GITHUB_SHA, checks, errors, devNavigationDiagnostics, failure: error.message }, null, 2))
  throw error
} finally {
  await browser.close()
  if (!accountExisted) {
    const cleanup = await adminClient()
    try { await cleanup.query('delete from app.accounts where id=$1', [A]) } finally { await cleanup.end() }
  }
}
