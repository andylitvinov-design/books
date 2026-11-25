import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExplorerEntries, TEST_EXPLORER_AXES } from '../lib/assessments/test-explorer.js'
import {
  PROFILE_AREA_AXES, PROFILE_FOCUS_AREAS, buildProfileScaleGroups,
  profileAreasWithTests, isProfileScaleRelevant, recommendProfileMode,
} from '../lib/profile/profile-scale-selection.js'

const source = buildExplorerEntries({ locale: 'en', audience: 'guest' })
const publicTests = source.filter(entry =>
  entry.selectable === true && entry.startable === true &&
  entry.guestEligible === true && entry.starterEligible !== false &&
  entry.free === true && entry.rightsStatus === 'cleared' &&
  entry.explicitOptIn !== true && entry.scaleGuide?.measurementAxes?.length)
  .map(entry => ({
    key: entry.key, title: entry.title, testKind: entry.testKind, topics: entry.topics,
    axes: entry.measurementAxes, minutes: entry.durationMinutes, questions: entry.questionCount,
    scales: entry.scaleGuide.scales.filter(scale =>
      entry.measurementAxes.includes(scale.axis)).map(scale => ({
      key: scale.key, label: scale.label, axis: scale.axis,
    })),
  }))

const allAreas = [...new Set(Object.values(PROFILE_FOCUS_AREAS).flat())]

test('all catalogued methods, including non-startable research references, retain a traceable category', () => {
  assert.ok(source.length >= 295, 'do not silently drop previously registered catalogue entries')
  assert.equal(new Set(source.map(item => item.key)).size, source.length,
    'each method has a unique canonical key')
  assert.ok(source.some(item => item.source === 'research'))
  assert.ok(source.some(item => item.source === 'product'))
  for (const item of source) {
    assert.ok(item.key && typeof item.category === 'string' && item.category.length > 0,
      item.key + ': missing category')
    assert.ok(Array.isArray(item.topics) && item.topics.some(topic =>
      typeof topic === 'string' && topic.length > 0), item.key + ': no authored topics')
    assert.ok(Array.isArray(item.areas) && item.areas.length > 0,
      item.key + ': no discovery category')
    assert.ok(['monitoring','professional','hobby'].includes(item.testKind),
      item.key + ': missing test kind')
  }
})

test('five profile directions cover public axes and every area has a parent', () => {
  assert.deepEqual(Object.keys(PROFILE_FOCUS_AREAS), ['wellbeing','relationships','work','identity','goal'])
  assert.deepEqual(new Set(allAreas), new Set(Object.keys(PROFILE_AREA_AXES)))
  assert.deepEqual(new Set(Object.values(PROFILE_AREA_AXES).flat()), new Set(TEST_EXPLORER_AXES),
    'every measured axis must be reachable through at least one topic')
  for (const focus of Object.keys(PROFILE_FOCUS_AREAS))
    assert.ok(PROFILE_FOCUS_AREAS[focus].length > 0)
})

test('every guest-startable scored test appears in at least one real topic without phantom scales', () => {
  assert.ok(publicTests.length >= 40, 'source/rights gating must not silently lose runnable assessments')
  const groups = buildProfileScaleGroups(publicTests, allAreas, PROFILE_AREA_AXES)
  const mapped = new Set(groups.flatMap(group => group.scales.map(scale => scale.testKey)))
  const keys = new Set(publicTests.map(item => item.key))
  assert.deepEqual(mapped, keys, 'no eligible test should be orphaned from the profile')
  assert.ok(groups.every(group => group.scales.every(scale => {
    const sourceTest = publicTests.find(item => item.key === scale.testKey)
    return sourceTest && sourceTest.scales.some(item =>
      item.key === scale.key && item.axis === scale.axis && item.label === scale.label) &&
      isProfileScaleRelevant(sourceTest, scale, group.area)
  })))
  assert.ok(groups.find(group => group.area === 'emotions').scales
    .some(scale => scale.testKey === 'gad-7'), 'anxiety test must be discoverable')
  assert.ok(groups.find(group => group.area === 'emotions').scales
    .some(scale => scale.testKey === 'hh-uncertainty-flexibility'))
})

test('offered topics are nonempty, strictly under selected focus, and never mislabel generic tests as finance', () => {
  for (const focus of Object.keys(PROFILE_FOCUS_AREAS)) {
    const offered = profileAreasWithTests(publicTests, [focus])
    assert.ok(offered.length > 0, focus + ': entire profile would be empty')
    assert.ok(offered.every(area => PROFILE_FOCUS_AREAS[focus].includes(area)))
    const groups = buildProfileScaleGroups(publicTests, offered, PROFILE_AREA_AXES)
    assert.ok(groups.every(group => group.scales.length > 0), 'no empty displayed topic')
  }
  const body = buildProfileScaleGroups(publicTests, ['body'], PROFILE_AREA_AXES)[0]
  assert.ok(body.scales.length > 0, 'body-specific eligible sources should be available')
  assert.ok(body.scales.every(scale => {
    const record = publicTests.find(test => test.key === scale.testKey)
    return record.topics.includes('body') || scale.axis === 'embodiment'
  }), 'body must not inherit unrelated fatigue or energy tests')
  const finance = buildProfileScaleGroups(publicTests, ['money'], PROFILE_AREA_AXES)[0]
  assert.ok(finance.scales.every(scale => {
    const record = publicTests.find(test => test.key === scale.testKey)
    return record.topics.some(topic => ['money','financial_wellbeing'].includes(topic)) ||
      record.key === 'hh-money-pressure'
  }), 'financial topic cannot inherit generic self-support and meaning tests')
  if (!finance.scales.length)
    assert.ok(!profileAreasWithTests(publicTests, ['work']).includes('money'),
      'empty finance topic must be hidden rather than recommended')
})

test('a scored dimension may belong to adjacent topics only with a source-backed link', () => {
  const groups = buildProfileScaleGroups(publicTests, allAreas, PROFILE_AREA_AXES)
  const mapped = new Map()
  for (const group of groups)
    for (const scale of group.scales) {
      const areas = mapped.get(scale.id) || new Set()
      areas.add(group.area)
      mapped.set(scale.id, areas)
    }
  assert.ok([...mapped.values()].some(areas => areas.size > 1),
    'one legitimate questionnaire may inform several related topics')
  assert.ok(groups.some(group => group.scales.some(scale =>
    publicTests.find(item => item.key === scale.testKey)?.axes.includes(scale.axis))))
  // Every recommendation must come from a source-backed test in the chosen topic.
  const stressScales = groups.find(group => group.area === 'emotions').scales
  const sourceTests = new Set(stressScales.map(scale => scale.testKey))
  const options = publicTests.filter(item => sourceTests.has(item.key))
  const picked = recommendProfileMode(options, ['stress','anxiety'], 'questionnaires')
  assert.ok(picked.every(key => sourceTests.has(key)))
})

test('unavailable, sensitive or symbolic tests remain in their rightful catalogue categories without fake psychometric axes', () => {
  for (const key of ['pcl-5','itq-adult','hh-bach-flower-profile']) {
    const entry = source.find(item => item.key === key)
    assert.ok(entry, key)
    assert.ok(entry.topics.length > 0, key)
    assert.ok(entry.areas.length > 0, key)
    assert.ok(!publicTests.some(item => item.key === key),
      key + ' must not become a guest source-declared scale without reviewed scoring access')
  }
})
