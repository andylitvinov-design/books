import assert from 'node:assert/strict'

const COPY = {
  en: { choose: 'Choose matching tests', review: 'Review new test selection', hint: 'Topics, concerns & recommended tests', close: 'Hide test picker Tap to collapse the selection panel' },
  ru: { choose: 'Подобрать тесты', review: 'Проверить новый подбор', hint: 'Темы, проблемы и рекомендованные тесты', close: 'Скрыть подбор тестов Нажмите, чтобы свернуть подбор' },
}

export async function assertAccountPickerDisclosure(page, expect, { locale = 'en', expanded } = {}) {
  const copy = COPY[locale]
  assert.ok(copy, 'Account picker locale must be EN or RU')
  const dashboard = page.locator('[data-my-tests-dashboard]')
  await expect(dashboard).toHaveCount(1)
  await expect(dashboard).toBeVisible()
  const toggle = dashboard.locator('#my-tests-picker-toggle')
  const panel = dashboard.locator('#my-test-explorer')
  await expect(toggle).toHaveCount(1)
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-controls', 'my-test-explorer')
  if (expanded !== undefined) await expect(toggle).toHaveAttribute('aria-expanded', String(expanded))
  const state = await toggle.getAttribute('aria-expanded')
  assert.ok(state === 'true' || state === 'false', 'Picker must expose its actual disclosure state')
  await expect(toggle).toHaveAccessibleName(state === 'true' ? copy.close : new RegExp('^(' + copy.choose + '|' + copy.review + ') ' + copy.hint + '$'))
  await expect(panel).toHaveCount(1)
  if (state === 'true') await expect(panel).toBeVisible()
  else await expect(panel).toBeHidden()
  return { toggle, panel, expanded: state === 'true' }
}

export async function openAccountTestPicker(page, expect, options = {}) {
  const before = await assertAccountPickerDisclosure(page, expect, options)
  if (!before.expanded) await before.toggle.click()
  return (await assertAccountPickerDisclosure(page, expect, { ...options, expanded: true })).panel
}

export async function assertCompactAccountPicker(panel, expect, { locale = 'en' } = {}) {
  const picker = panel.locator('[data-account-test-picker="true"]')
  const header = picker.locator('[data-client-tests-hero]')
  const title = locale === 'ru' ? 'Подобрать подходящие тесты' : locale === 'es' ? 'Encuentra tus pruebas' : 'Find the right tests'
  await expect(picker).toHaveCount(1)
  await expect(picker).toBeVisible()
  await expect(panel.locator('[data-public-test-picker="true"]')).toHaveCount(0)
  await expect(header.getByRole('heading', { name: title, level: 2, exact: true })).toBeVisible()
  await expect(header.getByRole('heading', { level: 1 })).toHaveCount(0)
  await expect(header.getByRole('navigation')).toHaveCount(0)
  const search = header.locator('#hh-test-hero-search')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('type', 'search')
  await expect(header.getByRole('button', { name: locale === 'ru' ? 'Найти' : locale === 'es' ? 'Buscar' : 'Search', exact: true })).toBeVisible()
  await expect(picker.getByRole('button', { name: locale === 'ru' ? 'Открыть всю базу тестов' : locale === 'es' ? 'Explorar base completa' : 'Browse full database', exact: true })).toBeVisible()
}

// Collapse/reopen only the visible disclosure. Preserve the exact checked draft,
// its filter choices and URL without starting a test or saving a selection.
export async function exerciseAccountPickerDraftRetention(page, expect, { locale = 'en' } = {}) {
  const { toggle, panel } = await assertAccountPickerDisclosure(page, expect, { locale, expanded: true })
  const readDraft = () => panel.locator('input[type="checkbox"]:checked, button[aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => ({
    tag: node.tagName, name: node.getAttribute('aria-label') || node.textContent.trim(), value: node.value || null,
  })))
  const before = await readDraft(), url = page.url(), writes = []
  assert.ok(before.some(node => node.tag === 'INPUT'), 'Draft proof needs an explicitly checked test')
  const observe = request => { if (new URL(request.url()).pathname.startsWith('/api/app/') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.method() + ' ' + new URL(request.url()).pathname) }
  page.on('request', observe)
  try {
    await toggle.click()
    await assertAccountPickerDisclosure(page, expect, { locale, expanded: false })
    assert.deepEqual(await readDraft(), before, 'Collapsed picker retains the mounted exact draft')
    await openAccountTestPicker(page, expect, { locale })
    assert.deepEqual(await readDraft(), before, 'Reopened picker preserves selected tests and filters')
    await expect(page).toHaveURL(url)
    assert.deepEqual(writes, [], 'Disclosure must not write account data')
  } finally { page.off('request', observe) }
}
