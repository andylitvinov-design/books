import assert from 'node:assert/strict'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'
import { gaugeModel } from '../../lib/assessments/dashboard-gauges.js'
import { interpretationBandModel } from '../../lib/assessments/interpretation-registry.js'

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
// Shared exact instrument checks apply to both guest cards and selected account scales.
function assertScoredGaugeSnapshot(actual, result, section, locale, account = false) {
  const ru = locale === 'ru'
  const dimension = result.dimensions.find(item => item.key === section.key)
  assert.ok(dimension, 'Every verified scale must retain its scored dimension')
  for (const field of ['value', 'min', 'max']) assert.equal(section[field], dimension[field], 'Exact scored ' + field)
  assert.equal(normalized(actual.numeric), `${numeral(section.value, locale)} / ${numeral(section.max, locale)}`, 'Exact localized score and upper bound')
  assert.equal(actual.gaugeCount, 1, 'Exactly one gauge per scored scale')
  assert.equal(actual.progressCount, 0, 'Scores must not be presented as progress or health percentages')
  const model = interpretationBandModel(result, dimension, locale)
  assert.notEqual(model.basis, 'unavailable', 'Scale verifier requires exact source-scored provenance')
  const answerBands = account ? model.answerBands || [] : []
  assert.equal(actual.answerScale, answerBands.length ? 'source-responses' : undefined,
    'Original response anchors remain separate from published screening intervals and guest scores')
  assert.equal(actual.answerSegments.length, answerBands.length, 'Exact original response-anchor sector count')
  for (const [index, band] of answerBands.entries()) {
    const segment = actual.answerSegments[index]
    assert.equal(segment.code, band.code, 'Exact ordered original response anchor')
    assert.equal(segment.width, band.code === model.currentAnswerBand?.code ? '16' : '12', 'Only the closest original response is emphasized')
    const direction = dimension.dimensionClass === 'trait' || dimension.direction === 'non-normative'
      ? 'neutral' : model.presentationDirection
    const orient = value => direction === 'difficulty' ? 1 - value : value
    const start = orient((band.from - section.min) / (section.max - section.min))
    const end = orient((band.to - section.min) / (section.max - section.min))
    const coordinate = fraction => [100 + 78 * Math.cos(Math.PI * (1 - fraction)), 98 - 78 * Math.sin(Math.PI * (1 - fraction))]
    const expected = [...coordinate(Math.min(start, end)), ...coordinate(Math.max(start, end))]
    const tokens = typeof segment.path === 'string' ? segment.path.trim().split(/\s+/) : []
    assert.equal(tokens.length, 11, 'One move and one arc per response anchor')
    assert.deepEqual([tokens[0], tokens[3], ...tokens.slice(4, 9)], ['M', 'A', '78', '78', '0', '0', '1'])
    for (const [coordinateIndex, tokenIndex] of [1, 2, 9, 10].entries()) {
      assert.match(tokens[tokenIndex], /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/)
      assert.ok(Number.isFinite(Number(tokens[tokenIndex])) && Math.abs(Number(tokens[tokenIndex]) - expected[coordinateIndex]) < 1e-6,
        'Exact source-derived response-anchor geometry: ' + band.code)
    }
  }
  const expectedIntervals = model.bands.map(band => ({
    text: normalized(`${numeral(band.from, locale)}–${numeral(band.to, locale)} ${band.label}${band.code === model.currentBand?.code ? ru ? ' · Ваш диапазон' : ' · Your range' : ''}`),
    current: band.code === model.currentBand?.code, markedCurrent: band.code === model.currentBand?.code,
  }))
  assert.deepEqual(actual.intervals, account ? [] : expectedIntervals, 'Exact published endpoints, labels and current range; none on continuous scales')
  if (dimension.key === 'symptoms.asrs6.shaded_count') {
    assert.equal(dimension.displayKind, 'screening-count')
    assert.equal(dimension.min, 0); assert.equal(dimension.max, 6)
    assert.ok(Number.isInteger(dimension.value) && dimension.value >= 0 && dimension.value <= 6)
    assert.equal(actual.gaugeKind, 'screening-count')
    assert.ok(actual.gaugeScale == null, 'ASRS is not a continuous or sector dial')
    assert.equal(actual.svgCount, 0, 'ASRS must remain a discrete count, not a severity dial')
    assert.equal(actual.needle, null)
    assert.deepEqual(actual.segmentCodes, [], 'ASRS has no severity segments')
    assert.deepEqual(actual.segments, [], 'ASRS must not acquire severity-sector geometry')
    assert.equal(normalized(actual.endpoints), '')
    assert.equal(normalized(actual.caption), dimension.value >= 4
      ? ru ? 'На уровне или выше скринингового порога (4)' : 'At or above screening threshold (4)'
      : ru ? 'Ниже скринингового порога (4)' : 'Below screening threshold (4)')
    assert.equal(normalized(actual.caution), account ? '' : ru ? 'Скрининг, не диагноз и не шкала тяжести' : 'Screening, not a diagnosis or severity scale')
  } else {
    const kind = dimension.dimensionClass === 'trait' || dimension.direction === 'non-normative' ? 'neutral'
      : model.presentationDirection
    const direction = kind === 'difficulty' ? ru ? 'Меньше описанных трудностей →' : 'Fewer reported difficulties →'
      : kind === 'resource' ? ru ? 'Больше описанных ресурсов →' : 'More reported resources →'
        : ru ? 'Описательная шкала' : 'Descriptive scale'
    const caption = model.continuous ? ru ? 'Непрерывная шкала' : 'Continuous scale'
      : model.basis === 'screening' ? ru ? 'Скрининговые диапазоны' : 'Screening intervals'
        : ru ? 'Справочные диапазоны' : 'Reference intervals'
    const originalAnswer = account ? model.currentAnswerBand : null
    const displayedCaption = originalAnswer
      ? (ru ? 'Ближе к ответу: ' : 'Closest answer: ') + originalAnswer.label : caption
    const caution = originalAnswer
      ? ru ? 'Ответы анкеты, не клиническая категория' : 'Questionnaire responses, not a clinical category'
      : model.continuous ? ru ? 'Без подтверждённых границ категорий' : 'No validated category cutoffs' : direction
    assert.equal(actual.gaugeKind, kind)
    assert.equal(actual.gaugeScale, model.continuous ? 'continuous' : 'published-bands')
    assert.deepEqual(actual.segmentCodes, model.bands.map(band => band.code), 'Only published intervals may become dial sectors')
    const orient = fraction => kind === 'difficulty' ? 1 - fraction : fraction
    const coordinate = fraction => ({ x: 100 + 78 * Math.cos(Math.PI * (1 - fraction)), y: 98 - 78 * Math.sin(Math.PI * (1 - fraction)) })
    const expectedSegments = model.bands.map((band, index) => {
      const start = orient((band.from - section.min) / (section.max - section.min))
      const end = orient(((model.bands[index + 1]?.from ?? section.max) - section.min) / (section.max - section.min))
      const from = coordinate(Math.min(start, end)), to = coordinate(Math.max(start, end))
      return { code: band.code, coordinates: [from.x, from.y, to.x, to.y],
        width: band.code === model.currentBand?.code ? '16' : '12' }
    })
    assert.equal(actual.segments.length, expectedSegments.length, 'Exact number of published sectors')
    for (const [index, expected] of expectedSegments.entries()) {
      const segment = actual.segments[index]
      assert.equal(segment.code, expected.code, 'Exact ordered source sector code')
      assert.equal(segment.width, expected.width, 'Exact current-band emphasis')
      const tokens = typeof segment.path === 'string' ? segment.path.trim().split(/\s+/) : []
      assert.equal(tokens.length, 11, 'A sector must contain exactly one move and one arc')
      assert.deepEqual([tokens[0], tokens[3], ...tokens.slice(4, 9)], ['M', 'A', '78', '78', '0', '0', '1'], 'Exact sector commands, radii, rotation and arc flags')
      for (const [coordinateIndex, tokenIndex] of [1, 2, 9, 10].entries()) {
        assert.match(tokens[tokenIndex], /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/, 'A sector coordinate must be a finite numeric token')
        const value = Number(tokens[tokenIndex])
        // JSC and V8 may differ in the final bits of Math.sin/cos. Match the
        // source geometry to the same tolerance as the needle, not as text.
        assert.ok(Number.isFinite(value) && Math.abs(value - expected.coordinates[coordinateIndex]) < 1e-6, 'Exact source-bound sector coordinate: ' + tokenIndex)
      }
    }
    assert.equal(normalized(actual.caption), displayedCaption)
    assert.equal(normalized(actual.caution), account ? '' : caution)
    const left = kind === 'difficulty' ? section.max : section.min
    const right = kind === 'difficulty' ? section.min : section.max
    assert.equal(normalized(actual.endpoints), numeral(left, locale) + numeral(right, locale), 'Both exact axis endpoints')
    assert.equal(normalized(actual.gaugeLabel), `${ru ? 'Баллы' : 'Score'}: ${numeral(section.value, locale)}. ${ru ? 'Диапазон' : 'Range'} ${numeral(section.min, locale)}–${numeral(section.max, locale)}. ${caption}. ${originalAnswer?.label || model.currentBand?.label || direction}`)
    assert.equal(actual.svgCount, 1)
    // Verify the actual needle against
    // BOTH persisted bounds, including nonzero minima and reversed difficulty.
    assert.ok(Number.isFinite(section.value) && Number.isFinite(section.min) && Number.isFinite(section.max))
    assert.ok(section.max > section.min && section.value >= section.min && section.value <= section.max)
    const fraction = (section.value - section.min) / (section.max - section.min)
    const angle = (kind === 'difficulty' ? fraction : 1 - fraction) * Math.PI
    const expected = { x1: 100, y1: 98, x2: 100 + 65 * Math.cos(angle), y2: 98 - 65 * Math.sin(angle) }
    for (const [key, value] of Object.entries(expected)) assert.ok(Number.isFinite(actual.needle?.[key]) && Math.abs(actual.needle[key] - value) < 1e-6, 'Exact range-normalized gauge needle: ' + key)
  }
}

export function assertGuestSnapshot(snapshot, result, locale) {
  const report = buildAssessmentResultReport(result, locale)
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
    assert.equal(actual.key, section.key, 'Exact ordered scale key')
    assert.equal(normalized(actual.title), normalized(section.construct || section.title || section.key))
    assert.equal(normalized(actual.band), section.bandBasis === 'screening' ? normalized(section.band) : '', 'Only the exact source screening band may be shown')
    assertScoredGaugeSnapshot(actual, result, section, locale)
    assert.doesNotMatch(actual.text, /%/, 'Guest scales must not imply health percentages')
    assert.equal(normalized(actual.text), normalized([actual.title, actual.numeric, actual.endpoints, actual.caption, actual.caution, ...actual.intervals.map(band => band.text), actual.band].join('')), 'Guest card contains only its scale, raw bounds, gauge and exact source intervals')
  }
  const accountOnly = [report.methodology, report.note, report.contextNote,
    report.personalityType?.headline, report.personalityType?.description,
    ...report.sections.flatMap(section => [section.meaning, section.followUp, ...(section.steps || []), ...(section.limitations || [])])].filter(Boolean)
  for (const text of accountOnly) assert.ok(!normalized(snapshot.text).includes(normalized(text)), 'Account-only explanation or advice leaked into guest result')
  assert.ok(normalized(snapshot.source).includes(`${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`), 'Exact versioned instrument source')
}

// Authenticated reports display one selected scale at a time. Every original
// versioned scale must remain reachable with its exact gauge and source-bound copy.
export function assertAccountReportSnapshot(snapshot, result, locale) {
  const report = buildAssessmentResultReport(result, locale), ru = locale === 'ru'
  assert.ok(report.sections.length)
  assert.equal(snapshot.guestCount, 0, 'Authenticated reports must not fall back to guest scales')
  assert.deepEqual(snapshot.scaleKeys, report.sections.map(section => section.key), 'Every scale trigger appears exactly once in source order')
  assert.equal(snapshot.scales.length, report.sections.length)
  for (const [index, section] of report.sections.entries()) {
    const actual = snapshot.scales[index]
    assert.equal(actual.key, section.key, 'Selected instrument scale key stays exact')
    assert.equal(actual.activeCount, 1, 'Only one selected account panel is rendered')
    assert.deepEqual(actual.pressedKeys, [section.key], 'The selected scale alone is pressed and reachable')
    assert.equal(actual.rootGaugeCount, 1, 'The account report renders only its selected instrument gauge')
    const phqTitle = result.definitionKey === 'phq-4' ? { 'symptoms.phq4.total': ru ? 'Общий результат' : 'Overall', 'symptoms.phq4.depression': ru ? 'Настроение' : 'Mood', 'symptoms.phq4.anxiety': ru ? 'Тревога' : 'Anxiety' }[section.key] : null
    assert.equal(normalized(actual.title), normalized(phqTitle || section.construct || section.title))
    assertScoredGaugeSnapshot(actual, result, section, locale, true)
    const dimension = result.dimensions.find(item => item.key === section.key)
    const model = interpretationBandModel(result, dimension, locale)
    const reading = gaugeModel(dimension, result, locale)?.rangeReading
    assert.deepEqual(actual.publishedBands, reading ? reading.rows.map(band => ({
      range: band.displayRange,
      label: (band.originalAnswerCode !== null && band.originalAnswerCode !== undefined
        ? `${ru ? '≈ вариант ' : '≈ option '}${band.originalAnswerCode} · ` : '') + band.label,
      current: band.current,
    })) : model.bands.map(band => ({range: `${band.from}–${band.to}`,label: band.label,current: band.code === model.currentBand?.code})), 'Exact source-aware range rows and current selection')
    if (reading) {
      assert.equal(normalized(actual.rangeHeading), normalized(reading.heading))
      assert.equal(normalized(actual.rangeNarrative), normalized(reading.narrative))
      assert.deepEqual(actual.rangeDetails, reading.rows.length > 1 ? reading.rows.map(row => ({code:row.code,heading:row.displayRange+' — '+row.label,note:row.note,current:row.current})) : [], 'Exact complete explanation of every source-aware interval')
      for (const text of [reading.narrative, reading.caution, ...reading.rows.map(row => row.note)]) assert.ok(normalized(actual.text).includes(normalized(text)), 'Every range explanation remains available')
    }
    const anchor = reading ? null : model.currentAnswerBand
    assert.equal(actual.answerReadingCount, anchor ? 1 : 0)
    assert.equal(actual.answerRangesCount, anchor ? 1 : 0)
    assert.deepEqual(actual.answerRanges, (anchor ? model.answerBands : []).map((band, index) => ({
      level: String(index + 1), range: band.displayRange,
      levelLabel: band.levelLabel || band.label, label: band.label, note: band.note,
      current: band.code === anchor.code, markedCurrent: band.code === anchor.code,
      marker: band.code === anchor.code ? ru ? 'Ваш диапазон' : 'Your range' : '',
    })), 'Exact ordered response levels, original ranges, labels, narratives and single current range')
    if (anchor) {
      assert.equal(normalized(actual.answerReadingLabel), ru ? 'Что означает ваш результат' : 'What your result means')
      assert.equal(normalized(actual.answerReadingTitle), normalized((anchor.levelLabel ? anchor.levelLabel + ' · ' : '') + anchor.label),
        'Exact source-bound descriptive level and original response label')
      assert.equal(normalized(actual.answerRangesHeading), ru ? 'Пять описательных диапазонов' : 'Five descriptive response ranges')
      assert.ok(normalized(actual.answerReading).includes(normalized(actual.answerReadingTitle)), 'The selected response title remains in its visible interpretation')
      assert.ok(normalized(actual.answerReading).includes(normalized(anchor.note)), 'Source-bound response interpretation remains available')
      assert.equal(normalized(actual.answerCaveat), ru
        ? 'Диапазоны показывают, к какому исходному варианту ответа ближе средний балл. Это ориентир для самонаблюдения, не медицинские нормы и не оценка «хорошо/плохо».'
        : 'These ranges show which original answer option is closest to your average. They guide self-reflection, not clinical norms or a pass/fail judgement.')
    }
    assert.ok(normalized(actual.text).includes(`${ru ? 'Баллы' : 'Score'}: ${section.value} · ${ru ? 'шкала' : 'range'} ${section.min}–${section.max}`), 'Exact account score and complete range')
    for (const text of [section.band, section.meaning, section.followUp, ...(section.steps || []), ...(section.limitations || [])].filter(Boolean))
      assert.ok(normalized(actual.text).includes(normalized(text)), 'Exact account explanation/advice: ' + section.key)
    assert.deepEqual(actual.sources, section.source ? [section.source] : [], 'Exact selected source reference in final methodology')
    const primary = section.recommendedReview && section.followUp || section.primarySupport || section.steps?.[0] || section.followUp
    assert.equal(actual.primaryCount, primary ? 1 : 0, 'One primary support option per selected scale')
    assert.equal(normalized(actual.primaryText), normalized(primary), 'Source-derived primary support stays exact')
  }
  if (report.methodology) assert.ok(normalized(snapshot.methodology).includes(normalized(report.methodology)), 'Exact authenticated methodology')
  if (report.note) assert.ok(normalized(snapshot.text).includes(normalized(report.note)), 'Exact authenticated source limitations')
  if (report.contextNote) assert.ok(normalized(snapshot.text).includes(normalized(report.contextNote)), 'Exact authenticated instrument context')
}
export async function assertAccountScaleReport(page, expect, result, locale) {
  const root = page.locator('[data-personal-result-report]')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).toHaveCount(1)
  const report = buildAssessmentResultReport(result, locale)
  const selector = root.locator('[data-assessment-scale-picker]')
  await expect(selector).toHaveCount(1)
  await expect(selector).toBeVisible()
  const tabs = selector.locator('[data-assessment-scale-trigger]')
  await expect(tabs).toHaveCount(report.sections.length)
  const scales = []
  for (const [index, section] of report.sections.entries()) {
    const tab = tabs.nth(index)
    await expect(tab).toHaveAttribute('data-assessment-scale-trigger', section.key)
    await expect(tab).toBeEnabled()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-pressed', 'true')
    const card = root.locator('[data-active-scale]')
    await expect(card).toHaveCount(1)
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('data-active-scale', section.key)
    const dimension = result.dimensions.find(item => item.key === section.key)
    const reading = gaugeModel(dimension, result, locale)?.rangeReading
    const anchor = reading ? null : interpretationBandModel(result, dimension, locale).currentAnswerBand
    if (reading) {
      await expect(card.locator('[data-assessment-range-report]')).toBeVisible()
      await expect(card.locator('[data-range-characterization]')).toBeVisible()
      await expect(card.locator('[data-all-score-ranges] > li')).toHaveCount(reading.rows.length)
      for (const row of await card.locator('[data-all-score-ranges] > li').all()) await expect(row).toBeVisible()
      await expect(card.locator('[data-range-evidence-status]')).toBeVisible()
    }
    if (anchor) {
      await expect(card.locator('[data-answer-interpretation]')).toBeVisible()
      await expect(card.locator('[data-answer-ranges]')).toBeVisible()
      await expect(card.locator('[data-answer-ranges] > p')).toBeVisible()
      await expect(card.locator('[data-answer-interpretation] > p').nth(1)).toBeVisible()
      await expect(card.locator('[data-answer-ranges] > h4')).toBeVisible()
      for (const range of await card.locator('[data-answer-ranges] li').all()) await expect(range).toBeVisible()
    }
    for (const detail of await card.locator('details').all())
      if (await detail.getAttribute('open') === null) await detail.locator(':scope > summary').click()
    const methodology = root.locator('[data-assessment-methodology]')
    await expect(methodology).toHaveCount(1)
    const methodologySummary = methodology.locator(':scope > summary')
    if (await methodology.getAttribute('open') === null) {
      await methodologySummary.focus()
      await expect(methodologySummary).toBeFocused()
      await methodologySummary.press('Enter')
    }
    if (section.source) {
      const source = methodology.locator('a[href]')
      await expect(source).toHaveCount(1)
      await expect(source).toBeVisible()
      await expect(source).toHaveAttribute('href', section.source)
    }
    await expect(card.locator('[data-primary-support]')).toHaveCount(1)
    await expect(card.locator('[data-primary-support]')).toBeVisible()
    scales.push(await card.evaluate(element => {
      const root = element.closest('[data-personal-result-report]')
      const gauge = element.querySelector('[data-assessment-gauge]')
      const needle = gauge?.querySelector('svg line')
      return {
        key: element.getAttribute('data-active-scale'),
        title: element.querySelector('h3')?.textContent, text: element.textContent,
        activeCount: root.querySelectorAll('[data-active-scale]').length,
        pressedKeys: [...root.querySelectorAll('[data-assessment-scale-trigger][aria-pressed="true"]')].map(node => node.getAttribute('data-assessment-scale-trigger')),
        rootGaugeCount: root.querySelectorAll('[data-assessment-gauge]').length,
        rangeHeading: element.querySelector('[data-assessment-range-report] > h4')?.textContent,
        rangeNarrative: element.querySelector('[data-range-characterization]')?.textContent,
        rangeDetails: [...element.querySelectorAll('[data-score-range-description]')].map(node => ({code:node.getAttribute('data-score-range-description'),heading:node.querySelector('strong')?.textContent,note:node.querySelector('p')?.textContent,current:node.hasAttribute('data-selected-score-description')})),
        publishedBands: [...element.querySelectorAll('[data-all-score-ranges] > li, [data-score-band-strip] > span')].map(node => ({
          range: node.querySelector('b')?.textContent,
          label: node.querySelector(':scope > span')?.textContent.trim() || [...node.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/ · (?:ваш|yours)$/, '').trim(),
          current: node.getAttribute('aria-current') === 'true',
        })),
        primaryCount: element.querySelectorAll('[data-primary-support]').length,
        primaryText: element.querySelector('[data-primary-support]')?.textContent,
        sources: [...root.querySelectorAll('[data-assessment-methodology] a[href]')].map(node => node.getAttribute('href')),
        answerReadingCount: element.querySelectorAll('[data-answer-interpretation]').length,
        answerRangesCount: element.querySelectorAll('[data-answer-ranges]').length,
        answerReading: element.querySelector('[data-answer-interpretation]')?.textContent,
        answerReadingLabel: element.querySelector('[data-answer-interpretation] > p:first-of-type')?.textContent,
        answerReadingTitle: element.querySelector('[data-answer-interpretation] > p:nth-of-type(2)')?.textContent,
        answerRangesHeading: element.querySelector('[data-answer-ranges] > h4')?.textContent,
        answerCaveat: element.querySelector('[data-answer-ranges] > p')?.textContent,
        answerRanges: [...element.querySelectorAll('[data-answer-ranges] li')].map(node => ({
          level: node.getAttribute('data-answer-level'),
          range: node.querySelector('strong')?.textContent,
          levelLabel: node.querySelector('b')?.textContent,
          label: (node.querySelector('small') || node.querySelector('b'))?.textContent,
          note: node.querySelector(':scope > span:not([aria-hidden]) > span:last-of-type')?.textContent,
          current: node.getAttribute('aria-current') === 'true', markedCurrent: node.hasAttribute('data-active-answer-range'),
          marker: node.querySelector('em')?.textContent || '',
        })),
        numeric: gauge?.querySelector('strong')?.textContent,
        gaugeCount: element.querySelectorAll('[data-assessment-gauge]').length,
        gaugeScale: gauge?.dataset.gaugeScale,
        answerScale: gauge?.dataset.answerAnchorScale,
        answerSegments: [...(gauge?.querySelectorAll('path[data-answer-anchor]') || [])].map(node => ({ code: node.dataset.answerAnchor, path: node.getAttribute('d'), width: node.getAttribute('stroke-width') })),
        segmentCodes: [...(gauge?.querySelectorAll('path[data-band-code]') || [])].map(node => node.dataset.bandCode),
        segments: [...(gauge?.querySelectorAll('path[data-band-code]') || [])].map(node => ({ code: node.dataset.bandCode, path: node.getAttribute('d'), width: node.getAttribute('stroke-width') })),
        endpoints: gauge?.querySelector(':scope > div[aria-hidden="true"]')?.textContent,
        intervals: [...(gauge?.querySelectorAll('ol > li') || [])].map(node => ({
          text: node.textContent.replace(/\s+/g, ' ').trim(), current: node.getAttribute('aria-current') === 'true', markedCurrent: node.hasAttribute('data-current-band'),
        })),
        gaugeKind: gauge?.dataset.assessmentGauge, gaugeLabel: gauge?.getAttribute('aria-label'),
        caption: gauge?.querySelector('figcaption')?.textContent, caution: gauge?.querySelector('small')?.textContent,
        svgCount: element.querySelectorAll('svg').length, progressCount: element.querySelectorAll('[role="progressbar"]').length,
        needle: needle ? Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(needle.getAttribute(key))])) : null,
      }
    }))
  }
  const methodology = root.locator('[data-assessment-methodology]')
  if (await methodology.count() && await methodology.getAttribute('open') === null)
    await methodology.locator(':scope > summary').click()
  const snapshot = await root.evaluate(element => ({
    scaleKeys: [...element.querySelectorAll('[data-assessment-scale-trigger]')].map(node => node.getAttribute('data-assessment-scale-trigger')),
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
          gaugeScale: gauge?.dataset.gaugeScale,
          answerScale: gauge?.dataset.answerAnchorScale,
          answerSegments: [...(gauge?.querySelectorAll('path[data-answer-anchor]') || [])].map(node => ({ code: node.dataset.answerAnchor, path: node.getAttribute('d'), width: node.getAttribute('stroke-width') })),
          segmentCodes: [...(gauge?.querySelectorAll('path[data-band-code]') || [])].map(node => node.dataset.bandCode),
          segments: [...(gauge?.querySelectorAll('path[data-band-code]') || [])].map(node => ({ code: node.dataset.bandCode, path: node.getAttribute('d'), width: node.getAttribute('stroke-width') })),
          endpoints: gauge?.querySelector(':scope > div[aria-hidden="true"]')?.textContent,
          intervals: [...(gauge?.querySelectorAll('ol > li') || [])].map(node => ({
            text: node.textContent.replace(/\s+/g, ' ').trim(), current: node.getAttribute('aria-current') === 'true', markedCurrent: node.hasAttribute('data-current-band'),
          })),
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
      accountAnalysisCount: document.querySelectorAll('[data-personal-result-report], [data-personality-type-summary], [data-assessment-context], [data-assessment-methodology], [data-free-course-banner], [data-report-scale], [data-answer-interpretation], [data-answer-ranges]').length,
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
