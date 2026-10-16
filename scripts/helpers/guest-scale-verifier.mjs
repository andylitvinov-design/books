import assert from 'node:assert/strict'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'

const normalized = value => String(value ?? '').replace(/\s+/g, ' ').trim()
export const guestFinishLabel = locale => locale === 'ru' ? 'Посмотреть шкалы и расшифровку' : 'See scores and scale explanations'
export const guestAnalysisLabel = locale => locale === 'ru' ? 'Создать / войти в мой кабинет и получить анализ (бесплатно)' : 'Create / sign in to my Cabinet — get free analysis'
export function assertGuestSaveIntent(body, result) {
  assert.deepEqual(Object.keys(body).sort(), ['operationId', 'sourceId', 'sourceKind'])
  assert.equal(body.sourceKind, 'guest_result')
  assert.equal(body.sourceId, result.id, 'Cabinet analysis must save only the displayed result')
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
}
export function assertGuestSnapshot(snapshot, result, locale) {
  const report = buildAssessmentResultReport(result, locale), ru = locale === 'ru'
  assert.ok(report.sections.length, 'Expected scored sections must not be empty')
  assert.equal(snapshot.accountAnalysisCount, 0, 'Guest must not render account analysis')
  assert.equal(snapshot.analysisCtaCount, 1, 'Exactly one optional Cabinet analysis CTA')
  assert.equal(snapshot.analysisLabel, guestAnalysisLabel(locale))
  assert.equal(snapshot.scales.length, report.sections.length, 'Every scored scale must be shown exactly once')
  for (const [index, section] of report.sections.entries()) {
    const actual = snapshot.scales[index]
    assert.equal(actual.key, section.key, 'Exact ordered scale key')
    assert.equal(normalized(actual.title), normalized(section.construct || section.title || section.key))
    assert.equal(normalized(actual.numeric), `${ru ? 'Баллы' : 'Score'}: ${section.value} · ${ru ? 'Диапазон' : 'Range'} ${section.min}–${section.max}`, 'Exact scored value and range')
    for (const text of [section.band, section.meaning].filter(Boolean)) assert.ok(normalized(actual.text).includes(normalized(text)), 'Exact scale explanation: ' + section.key)
    const caution = section.bandBasis === 'screening'
      ? ru ? 'Опубликованный скрининговый диапазон. Это не диагноз.' : 'Published screening band. This is not a diagnosis.'
      : ru ? 'Описательный балл — не клинический диагноз и не процент здоровья.' : 'This descriptive score is not a clinical diagnosis or health percentage.'
    assert.ok(normalized(actual.text).includes(caution), 'Scale limitations remain visible')
    for (const step of section.steps || []) assert.ok(!normalized(snapshot.text).includes(normalized(step)), 'Account-only practical advice leaked into guest result')
  }
  for (const text of [report.methodology, report.note].filter(Boolean)) assert.ok(normalized(snapshot.methodology).includes(normalized(text)), 'Exact methodology/source limitations must remain available')
  assert.ok(normalized(snapshot.source).includes(`${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`), 'Exact versioned instrument source')
}

export async function assertGuestScaleResult(page, expect, result, locale) {
  const root = page.locator('[data-guest-scale-interpretation]')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).toHaveCount(1)
  await expect(root.locator('button, a')).toHaveCount(0)
  await expect(page.getByRole('button', { name: guestAnalysisLabel(locale), exact: true })).toHaveCount(1)
  for (const detail of await root.locator('details').all()) if ((await detail.getAttribute('open')) === null) await detail.locator('summary').click()
  const snapshot = await page.evaluate(() => {
    const root = document.querySelector('[data-guest-scale-interpretation]')
    const gate = document.querySelector('[data-guest-analysis-gate]')
    return {
      scales: [...root.querySelectorAll('[data-guest-scale]')].map(card => ({ key: card.dataset.guestScale, title: card.querySelector('h5')?.textContent, numeric: card.querySelector('p strong')?.closest('p')?.textContent, text: card.textContent })),
      text: root.closest('.cabinet-guest-result')?.textContent || root.textContent,
      methodology: [...root.querySelectorAll('details')].map(node => node.textContent).join(' '),
      source: document.querySelector('.cabinet-result-footer')?.textContent,
      analysisCtaCount: gate?.querySelectorAll('button, a').length || 0,
      analysisLabel: gate?.querySelector('button')?.textContent,
      accountAnalysisCount: document.querySelectorAll('[data-personal-result-report], [data-personality-type-summary], [data-assessment-context], [data-free-course-banner], [data-report-scale]').length,
    }
  })
  assertGuestSnapshot(snapshot, result, locale)
  if (result.definitionKey === 'asrs-6') {
    const count = root.locator('[data-assessment-gauge="screening-count"]')
    await expect(count).toHaveCount(1)
    await expect(count.locator('strong')).toHaveText(result.dimensions[0].value + ' / 6')
    await expect(count.locator('svg')).toHaveCount(0)
    await expect(root.locator('[role="progressbar"], [data-assessment-gauge="difficulty"], [data-assessment-gauge="resource"]')).toHaveCount(0)
    assert.doesNotMatch(await count.innerText(), /%/)
  }
  const button = page.locator('[data-guest-analysis-gate]').getByRole('button', { name: guestAnalysisLabel(locale), exact: true })
  await expect(button).toBeEnabled()
  // Observe the actual item-scoped payload without creating an intent or opening auth.
  // A deterministic local rejection exercises the existing recoverable-error branch.
  const endpoint = '**/api/app/save-intents'
  let captured
  const intercept = async route => {
    captured = route.request().postDataJSON()
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'synthetic_verifier_stop_before_auth' }) })
  }
  await page.route(endpoint, intercept)
  try {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/app/save-intents' && r.request().method() === 'POST')
    await button.click()
    await response
    await expect(button).toBeEnabled()
    assertGuestSaveIntent(captured, result)
    await expect(root).toBeVisible()
  } finally { await page.unroute(endpoint, intercept) }
}
