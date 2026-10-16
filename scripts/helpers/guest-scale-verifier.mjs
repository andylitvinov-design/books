import assert from 'node:assert/strict'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'

const normalized = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const numeral = (value, locale) => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)
export const guestFinishLabel = locale => locale === 'ru' ? 'Посмотреть шкалы и баллы' : 'See my scores and scales'
export const guestAnalysisLabel = locale => locale === 'ru' ? 'Создать кабинет и получить пояснения' : 'Create my Cabinet and get explanations'
export function assertGuestSaveIntent(body, result) {
  assert.deepEqual(Object.keys(body).sort(), ['operationId', 'sourceId', 'sourceKind'])
  assert.equal(body.sourceKind, 'guest_result')
  assert.equal(body.sourceId, result.id, 'Cabinet analysis must save only the displayed result')
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
}
export function assertGuestSnapshot(snapshot, result, locale) {
  const report = buildAssessmentResultReport(result, locale), ru = locale === 'ru'
  assert.ok(report.sections.length, 'Expected scored sections must not be empty')
  assert.equal(snapshot.scoreOnly, true, 'Guest result must declare its score-only contract')
  assert.equal(snapshot.scaleCount, report.sections.length)
  assert.equal(snapshot.detailsCount, 0, 'Full explanations must not be hidden in guest disclosures')
  assert.equal(snapshot.accountAnalysisCount, 0, 'Guest must not render account analysis')
  assert.equal(snapshot.analysisCtaCount, 1, 'Exactly one optional Cabinet analysis CTA')
  assert.equal(snapshot.analysisLabel, guestAnalysisLabel(locale))
  assert.equal(snapshot.scales.length, report.sections.length, 'Every scored scale must be shown exactly once')
  for (const [index, section] of report.sections.entries()) {
    const actual = snapshot.scales[index]
    const dimension = result.dimensions.find(item => item.key === section.key)
    assert.ok(dimension, 'Every verified scale must retain its scored dimension')
    for (const field of ['value', 'min', 'max']) assert.equal(section[field], dimension[field], 'Exact scored ' + field)
    assert.equal(actual.key, section.key, 'Exact ordered scale key')
    assert.equal(normalized(actual.title), normalized(section.construct || section.title || section.key))
    assert.equal(normalized(actual.numeric), `${numeral(section.value, locale)} / ${numeral(section.max, locale)}`, 'Exact localized score and upper bound')
    assert.equal(actual.gaugeCount, 1, 'Exactly one gauge per scored scale')
    assert.equal(actual.progressCount, 0, 'Scores must not be presented as progress or health percentages')
    assert.equal(normalized(actual.band), section.bandBasis === 'screening' ? normalized(section.band) : '', 'Only the exact source screening band may be shown')
    if (dimension.key === 'symptoms.asrs6.shaded_count') {
      assert.equal(dimension.displayKind, 'screening-count')
      assert.equal(dimension.min, 0); assert.equal(dimension.max, 6)
      assert.ok(Number.isInteger(dimension.value) && dimension.value >= 0 && dimension.value <= 6)
      assert.equal(actual.gaugeKind, 'screening-count')
      assert.equal(actual.svgCount, 0, 'ASRS must remain a discrete count, not a severity dial')
      assert.equal(actual.needle, null)
      assert.equal(normalized(actual.caption), dimension.value >= 4
        ? ru ? 'На уровне или выше скринингового порога (4)' : 'At or above screening threshold (4)'
        : ru ? 'Ниже скринингового порога (4)' : 'Below screening threshold (4)')
      assert.equal(normalized(actual.caution), ru ? 'Скрининг, не диагноз' : 'Screening, not a diagnosis')
    } else {
      const kind = dimension.dimensionClass === 'trait' || dimension.direction === 'non-normative' ? 'neutral'
        : dimension.direction?.startsWith('higher-reported-') ? 'resource'
          : dimension.direction?.startsWith('lower-reported-') ? 'difficulty' : 'neutral'
      const caption = kind === 'difficulty' ? ru ? 'Меньше трудностей →' : 'Fewer difficulties →'
        : kind === 'resource' ? ru ? 'Больше ресурсов →' : 'More resources →'
          : ru ? 'Описательная шкала' : 'Descriptive scale'
      assert.equal(actual.gaugeKind, kind)
      assert.equal(normalized(actual.caption), caption)
      assert.equal(normalized(actual.caution), '')
      assert.equal(normalized(actual.gaugeLabel), `${ru ? 'Шкала' : 'Scale'}: ${numeral(section.value, locale)} / ${numeral(section.max, locale)}. ${caption}`)
      assert.equal(actual.svgCount, 1)
      // The score-only UI has no range paragraph. Verify the actual needle against
      // BOTH persisted bounds, including nonzero minima and reversed difficulty.
      assert.ok(Number.isFinite(section.value) && Number.isFinite(section.min) && Number.isFinite(section.max))
      assert.ok(section.max > section.min && section.value >= section.min && section.value <= section.max)
      const fraction = (section.value - section.min) / (section.max - section.min)
      const angle = (kind === 'difficulty' ? fraction : 1 - fraction) * Math.PI
      const expected = { x1: 100, y1: 98, x2: 100 + 65 * Math.cos(angle), y2: 98 - 65 * Math.sin(angle) }
      for (const [key, value] of Object.entries(expected)) assert.ok(Number.isFinite(actual.needle?.[key]) && Math.abs(actual.needle[key] - value) < 1e-6, 'Exact range-normalized gauge needle: ' + key)
    }
    assert.doesNotMatch(actual.text, /%/, 'Guest scales must not imply health percentages')
    assert.equal(normalized(actual.text), normalized([actual.title, actual.numeric, actual.caption, actual.caution, actual.band].join('')), 'Guest card contains only its scale, gauge and source screening label')
  }
  const accountOnly = [report.methodology, report.note, report.contextNote,
    report.personalityType?.headline, report.personalityType?.description,
    ...report.sections.flatMap(section => [section.meaning, section.followUp, ...(section.steps || [])])].filter(Boolean)
  for (const text of accountOnly) assert.ok(!normalized(snapshot.text).includes(normalized(text)), 'Account-only explanation or advice leaked into guest result')
  assert.ok(normalized(snapshot.source).includes(`${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`), 'Exact versioned instrument source')
}

// Authenticated reports display one selected scale at a time; verify that every
// original versioned scale stays reachable and its source-bound copy intact.
export function assertAccountReportSnapshot(snapshot, result, locale) {
  const report = buildAssessmentResultReport(result, locale), ru = locale === 'ru'
  assert.ok(report.sections.length)
  assert.equal(snapshot.guestCount, 0, 'Authenticated reports must not fall back to guest scales')
  assert.equal(snapshot.scales.length, report.sections.length)
  for (const [index, section] of report.sections.entries()) {
    const actual = snapshot.scales[index]
    assert.equal(actual.key, section.key, 'Selected instrument scale key stays exact')
    assert.equal(normalized(actual.title), normalized(section.construct || section.title))
    if (section.bandBasis !== 'unavailable') {
      const number = value => new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)
      const expectedScore = number(section.value) + ' / ' + number(section.max)
      assert.ok(normalized(actual.text).includes(normalized(expectedScore)),
        'Exact scale instrument score (no pooled health percentage): ' + section.key)
    }
    for (const value of [section.band, section.meaning, section.followUp, ...(section.steps || [])].filter(Boolean))
      assert.ok(normalized(actual.text).includes(normalized(value)), 'Exact account explanation/advice: ' + section.key)
  }
  if (report.methodology) assert.ok(normalized(snapshot.methodology).includes(normalized(report.methodology)), 'Exact authenticated methodology')
  if (report.note) assert.ok(normalized(snapshot.text).includes(normalized(report.note)), 'Exact authenticated source limitations')
}
export async function assertAccountScaleReport(page, expect, result, locale) {
  const root = page.locator('[data-personal-result-report]')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).toHaveCount(1)
  const report = buildAssessmentResultReport(result, locale)
  const selector = root.locator('[data-assessment-scale-picker]')
  await expect(selector).toBeVisible()
  const tabs = selector.locator('[data-assessment-scale-trigger]')
  await expect(tabs).toHaveCount(report.sections.length)
  const scales = []
  for (const [index, section] of report.sections.entries()) {
    await tabs.nth(index).click()
    await expect(tabs.nth(index)).toHaveAttribute('aria-pressed', 'true')
    const card = root.locator('[data-active-scale]')
    await expect(card).toHaveCount(1)
    await expect(card).toHaveAttribute('data-active-scale', section.key)
    const details = card.locator(':scope > details')
    if (await details.count() && await details.getAttribute('open') === null)
      await details.locator(':scope > summary').click()
    scales.push(await card.evaluate(element => ({
      key: element.getAttribute('data-active-scale'),
      title: element.querySelector('h3')?.textContent,
      text: element.textContent,
    })))
  }
  const methodology = root.locator('[data-assessment-methodology]')
  if (await methodology.count() && await methodology.getAttribute('open') === null)
    await methodology.locator(':scope > summary').click()
  const snapshot = await root.evaluate(element => ({
    text: element.textContent,
    methodology: element.querySelector('[data-assessment-methodology]')?.textContent,
    guestCount: document.querySelectorAll('[data-guest-scale-interpretation]').length,
  }))
  assertAccountReportSnapshot({ ...snapshot, scales }, result, locale)
}

// Deliberate routing probes require a SW-blocked fixture context in WebKit.
// Keep production worker/privacy coverage in the other, unmodified contexts.
export function assertGuestProbeIntercept(hitCount, status) {
  assert.equal(hitCount, 1, 'Guest analysis probe must intercept exactly one request')
  assert.equal(status, 409, 'Guest analysis probe must observe its synthetic rejection')
}

export async function assertGuestScaleResult(page, expect, result, locale) {
  const root = page.locator('[data-guest-scale-interpretation]')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).toHaveCount(1)
  await expect(root.locator('button, a')).toHaveCount(0)
  await expect(page.getByRole('button', { name: guestAnalysisLabel(locale), exact: true })).toHaveCount(1)
  const resultCard = page.locator('.cabinet-guest-result').filter({ has: root })
  const options = resultCard.locator(':scope > details')
  await expect(options).toHaveCount(1)
  if ((await options.getAttribute('open')) === null) await options.locator(':scope > summary').click()
  const snapshot = await root.evaluate(root => {
    const resultCard = root.closest('.cabinet-guest-result')
    const gate = resultCard.querySelector('[data-guest-analysis-gate]')
    const label = gate?.querySelector('button')?.cloneNode(true)
    label?.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove())
    return {
      scoreOnly: root.hasAttribute('data-score-only'),
      scaleCount: Number(root.getAttribute('data-scale-count')),
      detailsCount: root.querySelectorAll('details').length,
      scales: [...root.querySelectorAll('[data-guest-scale]')].map(card => {
        const gauge = card.querySelector('[data-assessment-gauge]')
        const needle = gauge?.querySelector('svg line')
        return {
          key: card.dataset.guestScale, title: card.querySelector('h5')?.textContent,
          numeric: gauge?.querySelector('strong')?.textContent, text: card.textContent,
          band: card.querySelector(':scope > p')?.textContent,
          gaugeCount: card.querySelectorAll('[data-assessment-gauge]').length,
          gaugeKind: gauge?.dataset.assessmentGauge, gaugeLabel: gauge?.getAttribute('aria-label'),
          caption: gauge?.querySelector('figcaption')?.textContent, caution: gauge?.querySelector('small')?.textContent,
          svgCount: card.querySelectorAll('svg').length, progressCount: card.querySelectorAll('[role="progressbar"]').length,
          needle: needle ? Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(needle.getAttribute(key))])) : null,
        }
      }),
      text: resultCard.textContent,
      source: resultCard.querySelector(':scope > details')?.textContent,
      analysisCtaCount: gate?.querySelectorAll('button, a').length || 0,
      analysisLabel: label?.textContent.trim(),
      accountAnalysisCount: document.querySelectorAll('[data-personal-result-report], [data-personality-type-summary], [data-assessment-context], [data-assessment-methodology], [data-free-course-banner], [data-report-scale]').length,
    }
  })
  assertGuestSnapshot(snapshot, result, locale)
  const button = page.locator('[data-guest-analysis-gate]').getByRole('button', { name: guestAnalysisLabel(locale), exact: true })
  await expect(button).toBeEnabled()
  // Observe the actual item-scoped payload without creating an intent or opening auth.
  // A deterministic local rejection exercises the existing recoverable-error branch.
  const endpoint = '**/api/app/save-intents'
  let captured, intercepted = 0
  const intercept = async route => {
    intercepted += 1
    captured = route.request().postDataJSON()
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'synthetic_verifier_stop_before_auth' }) })
  }
  await page.route(endpoint, intercept)
  try {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/app/save-intents' && r.request().method() === 'POST')
    await button.click()
    const observed = await response
    assertGuestProbeIntercept(intercepted, observed.status())
    await expect(button).toBeEnabled()
    assertGuestSaveIntent(captured, result)
    await expect(root).toBeVisible()
  } finally { await page.unroute(endpoint, intercept) }
}
