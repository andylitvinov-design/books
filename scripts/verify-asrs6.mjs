import { assertCabinetPortrait, openCabinetMyTests } from './helpers/cabinet-navigation-verifier.mjs'
import { assertQuestionnaireMode, enterGuestQuestionnaireMode } from './helpers/direct-questionnaire-verifier.mjs'
import { guestFinishLabel, assertGuestScaleResult, assertAccountScaleReport } from './helpers/guest-scale-verifier.mjs'
// Prepared synthetic loopback-only ASRS6 browser checks. Never run against production.
// Requires the approved isolated database, app and provider protocol double.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'
import { ASRS6_DEFINITIONS as definitions } from '../data/assessments/asrs-v1-6-nyu.js'
import { provenance } from '../lib/assessments/definitions.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { exactAsrs6DefinitionForResult } from '../lib/assessments/interpretation-registry.js'

assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine = process.env.HH_TEST_BROWSER === 'webkit' ? webkit : chromium
const browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE } : {})
const output = 'artifacts/app-r1/asrs6-' + engine.name()
await mkdir(output, { recursive: true })
const checks = [], errors = [], blockedRemote = []
const mixed = [2, 2, 2, 3, 0, 0] // Classic count 4; continuous sum 9 is not used.
const passed = label => { checks.push(label); console.log('PASS ' + label) }
let page

async function isolatedContext(fixtureIp = '192.0.2.61', guestProbe = false) {
  // RFC 5737 TEST-NET-1 fixtures, sent only to the asserted loopback app.
  // Keep this suite independent from the other suites' 12/IP/hour budget.
  // The application limiter and its headers contract remain unchanged.
  assert.ok(['192.0.2.61', '192.0.2.62', '192.0.2.63'].includes(fixtureIp))
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, timezoneId: 'UTC',
    // Only the guest result probe deliberately intercepts its save-intent POST.
    serviceWorkers: guestProbe ? 'block' : 'allow',
    extraHTTPHeaders: { 'X-Forwarded-For': fixtureIp },
  })
  // Keep all browser traffic on loopback, including the synthetic auth provider.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      blockedRemote.push(url.origin)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  return context
}
function observe(target) { target.on('pageerror', error => errors.push(error.message)) }
async function navigate(target, url) {
  await target.waitForLoadState('networkidle')
  await target.goto(url)
  await target.waitForLoadState('networkidle')
}
async function api(context, path, body) {
  const response = await context.request.fetch(origin + '/api/app/' + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { Origin: origin, 'Content-Type': 'application/json' } : {}, data: body,
  })
  const value = await response.json()
  assert.ok(response.ok(), path + ': ' + JSON.stringify(value))
  return value
}
async function sourceNotice(target, definition, guest, locale) {
  const instructions = target.locator((guest ? '.cabinet-test-note' : '.hh-runner-instructions') + '[lang="' + definition.instrumentLocale + '"]')
  await expect(instructions).toHaveText(definition.instructions)
  if (!guest) await expect(target.locator('.hh-runner-instructions').first()).toHaveText(locale === 'ru' ? 'За последние 6 месяцев' : 'Over the past 6 months')
  const notice = target.locator('[data-asrs6-source-notice]')
  await expect(notice).toBeVisible()
  for (const text of [definition.eligibilityText, definition.safetyText, definition.printedScoringText, definition.requiredSiteAttribution, definition.formCopyright].filter(Boolean)) {
    await expect(notice.getByText(text, { exact: true })).toBeVisible()
  }
  const date = notice.getByRole('textbox')
  await expect(date).toHaveAttribute('readonly', '')
  assert.ok((await date.inputValue()).trim().length > 0)
  await expect(notice).toContainText(locale === 'ru' ? 'Пояснение Holistic House' : 'Holistic House explanation')
  if (definition.instrumentLocale === 'ru') await expect(notice).toContainText(locale === 'ru' ? 'Валидация именно этого русского текста не подтверждена' : 'Validation of this exact Russian wording is unverified')
  return date.inputValue()
}
async function assertQuestion(scope, definition, index, guest) {
  await expect(scope.getByRole('heading', { name: definition.questions[index].text, exact: true })).toBeVisible()
  const buttons = scope.locator(guest ? '.cabinet-answer-list button' : '.hh-scale button')
  await expect(buttons).toHaveCount(5)
  for (let value = 0; value < 5; value++) {
    const button = buttons.nth(value)
    await expect(button.locator('span[lang="' + definition.instrumentLocale + '"]')).toHaveText(definition.responseAnchors[value])
    const markers = button.locator('small')
    if (value >= definition.questions[index].shadedFrom) {
      await expect(markers).toHaveText(definition.instrumentLocale === 'ru' ? '▧ Заштриховано' : '▧ Shaded')
    } else await expect(markers).toHaveCount(0)
    assert.ok(await button.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Full response label must not be clipped')
  }
  const shaded = await buttons.nth(definition.questions[index].shadedFrom).evaluate(element => getComputedStyle(element).backgroundColor)
  const plain = await buttons.nth(0).evaluate(element => getComputedStyle(element).backgroundColor)
  assert.notEqual(shaded, plain, 'Shading must be visible as well as text-labelled')
  return buttons
}
// Restrict ancestor checks to this report: the page may itself be an article.
function collectCourseLinkContext(links) {
  return links.map(link => {
    const report = link.closest('[data-personal-result-report]')
    const banner = link.closest('[data-free-course-banner]')
    const article = link.closest('article')
    return {
      href: link.getAttribute('href'),
      insideBanner: Boolean(report && banner && report.contains(banner)),
      insideScore: Boolean(report && article && report.contains(article)),
    }
  })
}
// A generic optional banner is separate from ASRS score-derived guidance.
function assertCourseLinkBoundary(links, locale) {
  assert.equal(links.length, 1, 'ASRS reports permit only the single optional banner course link')
  assert.equal(links[0].href, '/' + locale + '/app/course?program=stress', 'The optional course link must use the report language and the reviewed Anti-Stress programme')
  assert.equal(links[0].insideBanner, true, 'No ASRS score-derived course recommendation is permitted')
  assert.equal(links[0].insideScore, false, 'The generic course banner must remain outside scored articles')
}
async function assertReport(target, definition, locale, expected) {
  const report = target.locator('[data-personal-result-report]')
  await expect(report).toBeVisible({ timeout: 20000 })
  await expect(report.locator('article')).toHaveCount(1)
  const count = report.locator('[data-assessment-gauge="screening-count"]')
  await expect(count).toHaveCount(1)
  await expect(count.locator(':scope > strong')).toHaveText(expected + ' / 6')
  await expect(count.locator('svg')).toHaveCount(0)
  await expect(report.locator('[role="progressbar"]')).toHaveCount(0)
  await expect(report.locator('[data-assessment-gauge="difficulty"], [data-assessment-gauge="resource"]')).toHaveCount(0)
  assert.doesNotMatch(await count.innerText(), /%/)
  await expect(count.locator(':scope > figcaption')).toHaveText((locale === 'ru'
    ? expected >= 4 ? 'На уровне или выше скринингового порога' : 'Ниже скринингового порога'
    : expected >= 4 ? 'At or above screening threshold' : 'Below screening threshold') + ' (4)')
  const labels = locale === 'ru'
    ? ['Ниже скринингового порога', 'На уровне или выше скринингового порога']
    : ['Below the screening threshold', 'At or above the screening threshold']
  const bands = report.locator('[data-all-score-ranges] > li')
  await expect(bands).toHaveCount(2)
  const publishedBands = await bands.evaluateAll(nodes => nodes.map(node => ({
    range: node.querySelector('b')?.textContent,
    label: node.querySelector('span')?.textContent.trim(),
    current: node.getAttribute('aria-current') === 'true',
  })))
  assert.deepEqual(publishedBands, ['0–3', '4–6'].map((range, index) => ({
    range, label: labels[index], current: index === Number(expected >= 4),
  })), 'Published ASRS bands retain exact source bounds, labels and current range')
  for (const band of await bands.all()) await expect(band).toBeVisible()
  const currentBand = report.locator('[data-all-score-ranges] > li[aria-current="true"]')
  await expect(currentBand).toHaveCount(1)
  await expect(currentBand.locator('b')).toHaveText(expected >= 4 ? '4–6' : '0–3')
  for (const detail of await report.locator('details').all()) {
    if (await detail.getAttribute('open') === null) await detail.locator(':scope > summary').click()
  }
  const instrument = report.locator('[data-asrs6-instrument-text]')
  await expect(instrument).toBeVisible()
  await expect(instrument.locator('div[lang="' + definition.instrumentLocale + '"]')).toHaveCount(1)
  for (const text of [definition.eligibilityText, definition.printedScoringText, definition.safetyText, definition.requiredSiteAttribution, definition.formCopyright].filter(Boolean)) {
    await expect(instrument.getByText(text, { exact: true })).toBeVisible()
  }
  if (definition.instrumentLocale === 'ru') await expect(report).toContainText(locale === 'ru' ? 'Валидация именно этой русской формулировки не подтверждена' : 'Validation of this exact Russian wording has not been established')
  await expect(report).toContainText(locale === 'ru' ? 'не рекомендованный интервал повторного теста' : 'not a recommended retesting interval')
  const banner = report.locator('[data-free-course-banner]')
  await expect(banner).toHaveCount(1)
  await expect(banner).toBeVisible()
  await expect(banner.locator('a[href="/' + locale + '/app/course?program=stress"]')).toBeVisible()
  await expect(banner.locator('details')).toHaveAttribute('open', '')
  await expect(banner).toContainText(locale === 'ru' ? 'Следующий шаг — по желанию' : 'An optional next step')
  await expect(banner).toContainText(locale === 'ru' ? 'требуют вашего согласия' : 'requires your consent')
  await expect(banner).toContainText(locale === 'ru' ? 'а не диагноз, психотерапия или экстренная помощь' : 'not a diagnosis, psychotherapy or emergency support')
  await expect(banner).toContainText(locale === 'ru' ? 'Курс необязателен и не меняет результаты теста' : 'Taking the course is optional and does not change your test results')
  const courseLinks = await report.locator('a[href$="/app/course"], a[href*="/app/course?"], a[href*="/app/course#"]').evaluateAll(collectCourseLinkContext)
  assertCourseLinkBoundary(courseLinks, locale)
  assert.ok(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal mobile overflow')
}
async function fill(target, definition, mode, guest, locale, values) {
  const initialDate = await sourceNotice(target, definition, guest, locale)
  const quick = guest ? '.cabinet-quick-question' : '.hh-quick-question'
  for (let index = 0; index < 6; index++) {
    const scope = mode === 'quick' ? target.locator(quick).nth(index) : target.locator(guest ? '.cabinet-guided-question' : '.hh-runner-question')
    const buttons = await assertQuestion(scope, definition, index, guest)
    const saved = target.waitForResponse(response => response.url().includes('/runs/') && response.url().endsWith('/save') && response.request().method() === 'POST')
    await buttons.nth(values[index]).click()
    assert.ok((await saved).ok())
    if (index < 5) await expect(target.getByRole('button', { name: guest ? guestFinishLabel(locale) : locale === 'ru' ? 'Сохранить результат и получить рекомендации' : 'Save results and get recommendations', exact: true })).toHaveCount(0)
    // A saved zero must remain distinct from an unanswered question after reload.
    if (mode === 'quick' && index === 2) {
      await target.waitForLoadState('networkidle')
      await target.reload()
      await assertQuestionnaireMode(target, expect, { mode: 'quick', guest, definition })
      assert.equal(await sourceNotice(target, definition, guest, locale), initialDate)
      for (let prior = 0; prior <= index; prior++) await expect(target.locator(quick).nth(prior).locator(guest ? '.cabinet-answer-list button' : '.hh-scale button').nth(values[prior])).toHaveAttribute('aria-pressed', 'true')
      await expect(target.locator(quick).nth(3).locator('[aria-pressed="true"]')).toHaveCount(0)
      passed((guest ? 'guest' : 'account') + ' ' + locale + ' quick: zero saved, missing distinct, resumed date unchanged')
    }
    if (mode === 'guided' && index < 5) await target.getByRole('button', { name: locale === 'ru' ? 'Далее' : 'Next', exact: true }).click()
  }
  const finish = target.getByRole('button', { name: guest ? guestFinishLabel(locale) : locale === 'ru' ? 'Сохранить результат и получить рекомендации' : 'Save results and get recommendations', exact: true })
  await expect(finish).toBeEnabled()
  await finish.click()
}
function assertStored(result, definition, expected) {
  assert.ok(result)
  for (const [key, value] of Object.entries(provenance(definition))) assert.equal(result[key], value, key)
  assert.equal(exactAsrs6DefinitionForResult(result), definition)
  assert.deepEqual(result.dimensions.map(dimension => dimension.value), [expected])
}

try {
  // Negative control: fixture isolation must not disable or raise the limiter.
  const limited = await isolatedContext('192.0.2.62')
  for (let attempt = 0; attempt < 12; attempt++) {
    await api(limited, 'guest/session', { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' })
  }
  const rejected = await limited.request.post(origin + '/api/app/guest/session', {
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    data: { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' },
  })
  assert.equal(rejected.status(), 429)
  assert.equal((await rejected.json()).error, 'RATE_LIMITED')
  const independent = await isolatedContext('192.0.2.63')
  await api(independent, 'guest/session', { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' })
  await limited.close(); await independent.close()
  passed('Unchanged guest rate limit rejects the 13th same-IP session; an independent synthetic IP remains available')
  for (const locale of ['en', 'ru']) for (const audience of ['guest', 'account']) {
    const full = buildExplorerEntries({ locale, audience }).find(entry => entry.key === 'asrs-v1-18')
    assert.ok(full); assert.equal(full.selectable, false)
  }
  passed('ASRS-18 remains a non-selectable reference in both languages and audiences')
  const account = await isolatedContext()
  page = await account.newPage(); observe(page)
  await navigate(page, origin + '/en/app')
  await page.getByRole('button', { name: 'Open my Cabinet with Google', exact: true }).click()
  const onboarding = page.getByRole('heading', { name: 'Create my private space', exact: true })
  await expect(onboarding.or(page.locator('[data-profile-domains]')).first()).toBeVisible({ timeout: 60000 })
  if (await onboarding.isVisible()) {
    await page.getByLabel('I am 18 or older.').check()
    await page.getByLabel('I agree to private processing', { exact: false }).check()
    await page.getByRole('button', { name: 'Create my private space', exact: true }).click()
  }
  await assertCabinetPortrait(page, expect, { origin })
  await openCabinetMyTests(page, expect, { origin })
  for (const definition of definitions) for (const mode of ['quick', 'guided']) {
    const locale = definition.instrumentLocale, values = mode === 'quick' ? Array(6).fill(0) : mixed, expected = mode === 'quick' ? 0 : 4
    const run = await api(account, 'runs', { definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: locale, operationId: randomUUID() })
    await navigate(page, origin + '/' + locale + '/app/runs/' + run.id + '?mode=' + mode)
    await assertQuestionnaireMode(page, expect, { mode, guest: false, definition })
    await fill(page, definition, mode, false, locale, values)
    await assertReport(page, definition, locale, expected)
    const stored = (await api(account, 'bootstrap')).results.find(result => result.runId === run.id)
    assertStored(stored, definition, expected)
    await assertAccountScaleReport(page, expect, stored, locale)
    // Check a persisted RU result with an EN report too; validation must follow its source language.
    const reportLocale = locale === 'ru' ? 'en' : locale
    await navigate(page, origin + '/' + reportLocale + '/app/results/' + stored.id)
    await assertReport(page, definition, reportLocale, expected)
    await assertAccountScaleReport(page, expect, stored, reportLocale)
    await page.screenshot({ path: output + '/account-' + locale + '-' + mode + '.png', fullPage: true })
    passed('account ' + locale + ' ' + mode + ': exact source, five anchors, shading, saved count, provenance and reopened report')
  }
  await navigate(page, origin + '/en/app/portfolio')
  const insight = page.locator('.hh-insights-test-card').filter({ hasText: 'ASRS-v1.1' })
  await expect(insight).toHaveCount(1)
  await expect(insight.locator('[data-assessment-gauge="screening-count"]')).toHaveCount(1)
  await expect(insight.locator('[data-assessment-gauge] svg')).toHaveCount(0)
  await expect(insight.locator('[data-gauge-trend="improved"], [data-gauge-trend="worsened"]')).toHaveCount(0)
  passed('Insights retains discrete screening count without favorable gradient or clinical improvement inference')
  await account.close()

  // One consented guest session for four journeys, within the unchanged IP/session limits.
  const guest = await isolatedContext(undefined, true), resultIds = new Set()
  await api(guest, 'guest/session', { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' })
  for (const definition of definitions) for (const mode of ['quick', 'guided']) {
    const locale = definition.instrumentLocale, values = mode === 'quick' ? Array(6).fill(0) : mixed, expected = mode === 'quick' ? 0 : 4
    const plan = await api(guest, 'guest/test-plans', { items: [{ definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: locale }], operationId: randomUUID() })
    page = await guest.newPage(); observe(page)
    await navigate(page, origin + '/' + locale + '/client?plan=' + plan.id)
    await enterGuestQuestionnaireMode(page, expect, { mode, definition })
    await fill(page, definition, mode, true, locale, values)
    await expect(page.locator('[data-guest-scale-interpretation]')).toBeVisible({ timeout: 20000 })
    const stored = (await api(guest, 'guest/bootstrap')).results.find(result => result.definitionId === definition.id && !resultIds.has(result.id))
    assertStored(stored, definition, expected); resultIds.add(stored.id)
    await assertGuestScaleResult(page, expect, stored, locale)
    await page.screenshot({ path: output + '/guest-' + locale + '-' + mode + '.png', fullPage: true })
    passed('guest ' + locale + ' ' + mode + ': exact source, five anchors, shading, private saved count, exact scales and item-scoped optional analysis')
    await page.close()
  }
  assert.equal(resultIds.size, 4)
  await guest.close()
  assert.deepEqual(errors, [])
  await writeFile(output + '/verification.json', JSON.stringify({ commit: process.env.GITHUB_SHA, browser: await browser.version(), checks, blockedRemoteOrigins: [...new Set(blockedRemote)], guestSessions: 14, guestJourneySessions: 1, rateControlSessions: 13, guestResults: resultIds.size, auth: 'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE', production: 'UNCHANGED' }, null, 2))
} catch (error) {
  await page?.screenshot({ path: output + '/failure.png', fullPage: true }).catch(() => {})
  await writeFile(output + '/verification.json', JSON.stringify({ commit: process.env.GITHUB_SHA, checks, failure: error.message }, null, 2))
  throw error
} finally { await browser.close() }
