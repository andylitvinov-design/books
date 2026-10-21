import { assertCabinetPortrait, openCabinetMyTests } from './helpers/cabinet-navigation-verifier.mjs'
// Synthetic loopback-only native disclosure and keyboard regression.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'

assertIsolated()
const origin = process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine = process.env.HH_TEST_BROWSER === 'webkit' ? webkit : chromium
const browser = await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.HH_TEST_BROWSER_EXECUTABLE } : {})
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage(), checks = [], pageErrors = [], consoleErrors = []
const output = 'artifacts/app-r1/status-filters-' + engine.name()
await mkdir(output, { recursive: true })
page.on('pageerror', error => pageErrors.push(error.message))
const passed = name => { checks.push(name); console.log('PASS ' + name) }
try {
  await page.goto(origin + '/en/app')
  await page.getByRole('button', { name: 'Open my Cabinet with Google', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create my private space', exact: true }).or(page.locator('[data-profile-domains]')).first()).toBeVisible({ timeout: 60000 })
  if (await page.getByRole('heading', { name: 'Create my private space', exact: true }).isVisible()) {
    await page.getByLabel('I am 18 or older.').check()
    await page.getByLabel('I agree to private processing', { exact: false }).check()
    await page.getByRole('button', { name: 'Create my private space', exact: true }).click()
  }
  await assertCabinetPortrait(page, expect, { origin })
  await openCabinetMyTests(page, expect, { origin })
  await page.waitForLoadState('networkidle')
  // The unsigned bootstrap's expected 401 precedes this authenticated scope.
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  const response = await context.request.post(origin + '/api/app/test-plans', {
    headers: { Origin: origin },
    data: { items: [{ definitionKey: 'hh-current-state', definitionVersion: 'v2', instrumentLocale: 'en' }], operationId: randomUUID(), appendActive: true },
  })
  assert.ok(response.ok(), await response.text())
  for (const locale of ['en', 'ru']) {
    for (const filtered of [false, true]) {
      await page.goto(origin + '/' + locale + '/app/tests' + (filtered ? '?filter=all' : ''))
      const summary = page.getByText(locale === 'ru' ? 'Отфильтровать список по статусу' : 'Filter this list by status', { exact: true })
      await expect(summary).toBeVisible({ timeout: 30000 })
      const details = summary.locator('..')
      await expect(details).toHaveJSProperty('open', filtered)
      await summary.focus()
      await summary.press(filtered ? 'Space' : 'Enter')
      await expect(details).toHaveJSProperty('open', !filtered)
      await expect(summary).toBeFocused()
      if (filtered) {
        await summary.press('Enter')
        await expect(details).toHaveJSProperty('open', true)
      }
      const group = details.getByRole('group', { name: locale === 'ru' ? 'Фильтр по статусу' : 'Filter by status', exact: true })
      await expect(group).toBeVisible()
      const pending = group.getByRole('button', { name: locale === 'ru' ? 'Не начат' : 'Not started', exact: true })
      await pending.click()
      await expect(pending).toHaveAttribute('aria-pressed', 'true')
      await expect(details).toHaveJSProperty('open', true)
      await summary.focus()
      await summary.press('Space')
      await expect(details).toHaveJSProperty('open', false)
      await expect(group).toBeHidden()
      await expect(summary).toBeFocused()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: output + '/' + locale + (filtered ? '-filtered' : '-default') + '.png' })
      passed(locale + ' status disclosure: ' + (filtered ? 'requested filter opens' : 'default closed') + ', Enter/Space toggle, focus and state survive rerender')
    }
  }
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
} finally {
  await writeFile(output + '/verification.json', JSON.stringify({ commit: process.env.GITHUB_SHA, checks, pageErrors, consoleErrors, auth: 'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE' }, null, 2))
  await browser.close()
}
