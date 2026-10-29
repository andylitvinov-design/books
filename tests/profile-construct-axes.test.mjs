import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { buildExplorerEntries, TEST_EXPLORER_AXES } from '../lib/assessments/test-explorer.js'
import { auditProfileConstructLinks, buildAuthorAxisReview, authorAxisReviewCsv } from '../scripts/audit-profile-construct-links.mjs'
import {
  PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES, PROFILE_RESEARCH_AXES,
  buildProfileScaleGroups, defaultProfileScaleIds, profileAreasWithTests,
  selectedProfileResearchAxes, researchAxisForScale, profileResearchAxisLabel,
  recommendProfileAxisBattery, recommendProfileTopThreeTests, rankProfileAxisTests, previewProfileScales,
} from '../lib/profile/profile-scale-selection.js'

const accountEntries = buildExplorerEntries({ locale: 'en', audience: 'account' })
const guestEntries = buildExplorerEntries({ locale: 'en', audience: 'guest' })

// This mirrors the existing publicly rights-cleared route without granting
// new privileges to any protected / sensitive / account-only instruments.
const isGuest = entry => entry.selectable === true && entry.startable === true &&
  entry.guestEligible === true && entry.starterEligible !== false &&
  entry.free === true && entry.rightsStatus === 'cleared' &&
  entry.explicitOptIn !== true && entry.scaleGuide?.measurementAxes?.length

const toSource = entry => ({
  key: entry.key, version: entry.definition?.version || entry.version,
  title: entry.title, topics: entry.topics, testKind: entry.testKind,
  axes: entry.measurementAxes, minutes: entry.durationMinutes, questions: entry.questionCount,
  // Immutable scorer dimensions, not guessed questionnaire/diagnostic facets.
  scales: (entry.scaleGuide?.scales || []).filter(scale =>
    typeof scale.key === 'string' && typeof scale.label === 'string' &&
    entry.scaleGuide.measurementAxes.includes(scale.axis))
    .map(scale => ({ key: scale.key, label: scale.label, axis: scale.axis })),
})

const full = accountEntries.filter(entry =>
  entry.selectable === true && entry.startable === true &&
  entry.rightsStatus === 'cleared' && entry.scaleGuide?.measurementAxes?.length).map(toSource)
const guest = guestEntries.filter(isGuest).map(toSource)
const areas = [...new Set(Object.values(PROFILE_FOCUS_AREAS).flat())]

test('34 source-backed research facets describe 5 profiles and 10 topics without inventing scoring axes', () => {
  assert.deepEqual(Object.keys(PROFILE_FOCUS_AREAS), ['wellbeing','relationships','work','identity','goal'])
  assert.deepEqual(new Set(areas), new Set(Object.keys(PROFILE_AREA_AXES)))
  assert.equal(Object.values(PROFILE_RESEARCH_AXES).flat().length, 34)
  assert.deepEqual(new Set(Object.values(PROFILE_AREA_AXES).flat()), new Set(TEST_EXPLORER_AXES))
  for (const [area, specs] of Object.entries(PROFILE_RESEARCH_AXES)) {
    assert.ok(specs.length > 0, area)
    assert.equal(new Set(specs.map(spec => spec.id)).size, specs.length, area + ': duplicate facet ID')
    for (const spec of specs) {
      assert.ok(PROFILE_AREA_AXES[area].includes(spec.sourceAxis), area + ':' + spec.id)
      for (const language of ['en','ru','es'])
        assert.ok(typeof spec.label[language] === 'string' && spec.label[language].trim(),
          area + ':' + spec.id + ': missing ' + language)
      assert.equal(profileResearchAxisLabel(area + '::' + spec.id, 'es'), spec.label.es)
    }
  }
})

test('all 295 catalogue entries are still classified; active and guest scored sources are not orphaned', () => {
  assert.ok(accountEntries.length >= 295)
  assert.equal(new Set(accountEntries.map(item => item.key)).size, accountEntries.length)
  assert.ok(accountEntries.every(item => item.category && item.topics?.length && item.areas?.length))
  assert.ok(full.length >= 140)
  assert.ok(guest.length >= 40)
  for (const [name, source] of [['account',full],['guest',guest]]) {
    const groups = buildProfileScaleGroups(source, areas, PROFILE_AREA_AXES)
    const attached = new Set(groups.flatMap(group => group.scales.map(scale => scale.testKey)))
    assert.deepEqual(attached, new Set(source.map(item => item.key)),
      name + ' has a scored questionnaire outside every profile')
    assert.ok(groups.every(group => group.scales.every(scale =>
      source.some(item => item.key === scale.testKey &&
        item.scales.some(def => def.key === scale.key && def.axis === scale.axis)))),
      'every mapped scale must exist in the registered source scorer')
    for (const focus of Object.keys(PROFILE_FOCUS_AREAS)) {
      const visible = profileAreasWithTests(source, [focus])
      assert.ok(visible.length > 0)
      assert.ok(visible.every(area => groups.find(group => group.area === area)?.scales.length > 0))
    }
  }
})

test('Big Five are five distinct facets, not one interchangeable personality result', () => {
  const profile = guest.find(test => test.key === 'mini-ipip-20')
  assert.ok(profile, 'rights-cleared Big Five source must be in guest catalogue')
  const traits = buildProfileScaleGroups([profile], ['traits'], PROFILE_AREA_AXES)[0]
  assert.deepEqual(new Set(traits.scales.map(scale => scale.researchAxisId)), new Set([
    'traits::extraversion','traits::agreeableness','traits::conscientiousness',
    'traits::emotional_reactivity','traits::openness',
  ]))
  const chosen = traits.scales.find(scale => scale.key === 'trait.extraversion')
  assert.ok(chosen)
  assert.deepEqual(selectedProfileResearchAxes([traits], [chosen.id]), ['traits::extraversion'])
  const professional = recommendProfileAxisBattery(guest, [
    ...buildProfileScaleGroups(guest,['traits'],PROFILE_AREA_AXES),
  ], [chosen.id], 'pro')
  assert.ok(professional.includes('mini-ipip-20'))
  assert.ok(!professional.includes('ipip-empathic-concern-10'),
    'empathy must not substitute for extraversion merely because both are personality')
  assert.deepEqual(recommendProfileAxisBattery(guest, [traits], [chosen.id], 'questionnaires'), [])
  assert.equal(researchAxisForScale(profile,{ key:'unregistered_trait',axis:'not_an_axis' },'traits'),null)
})

test('financial well-being, money pressure and coping have separate real sources', () => {
  const groups=buildProfileScaleGroups(full,['money','support','work'],PROFILE_AREA_AXES)
  const finance=groups[0].scales
  const cfpb=finance.filter(scale=>scale.testKey==='cfpb-financial-wellbeing-5')
  const money=finance.filter(scale=>scale.testKey==='hh-money-pressure')
  assert.equal(cfpb.length,1)
  assert.equal(cfpb[0].researchAxisId,'money::financial_wellbeing')
  assert.deepEqual(new Set(money.map(scale=>scale.researchAxisId)),
    new Set(['money::money_pressure','money::financial_coping']))
  assert.ok(!groups.find(group=>group.area==='support').scales.some(scale=>
    scale.testKey==='cfpb-financial-wellbeing-5'),
    'financial wellbeing is not a scale for psychological resilience')
  assert.ok(!guest.some(item=>item.key==='cfpb-financial-wellbeing-5' ||
    item.key==='hh-money-pressure'), 'guest access gates must stay intact')
  assert.ok(!profileAreasWithTests(guest,['work']).includes('money'),
    'public finance topic must stay hidden while no finance-specific guest questionnaire is eligible')
})

test('physical experience, work stress, empathy and sexuality are never inferred from generic axes', () => {
  const groups=buildProfileScaleGroups(full,['body','work','connection','traits'],PROFILE_AREA_AXES)
  const body=groups.find(group=>group.area==='body').scales
  const work=groups.find(group=>group.area==='work').scales
  const connection=groups.find(group=>group.area==='connection').scales
  const traits=groups.find(group=>group.area==='traits').scales
  assert.ok(body.every(scale => scale.axis === 'embodiment' ||
    full.find(item => item.key === scale.testKey)?.topics.includes('body')))
  assert.ok(!work.some(scale=>scale.testKey==='k6' && scale.researchAxisId==='work::workload'),
    'general K6 distress is not an occupational-stress score')
  assert.ok(!work.some(scale=>scale.key==='trait.via.spirituality' ||
    scale.key==='trait.via.appreciation_beauty' ||
    scale.key==='trait.via.capacity_for_love'),
    'broad VIA strengths are not automatically occupational dispositions')
  assert.ok(connection.some(scale=>scale.researchAxisId==='connection::boundaries'))
  assert.ok(connection.some(scale=>scale.researchAxisId==='connection::intimacy'))
  assert.ok(connection.some(scale=>scale.researchAxisId==='connection::sexual_wellbeing'))
  assert.ok(traits.some(scale=>scale.researchAxisId==='traits::typologies'),
    'exploratory typologies remain distinguishable from standardized Big Five')
  assert.ok(!traits.some(scale => scale.testKey === 'ipip-empathic-concern-10' &&
    scale.researchAxisId === 'traits::extraversion'))
})

test('default choices cover different conceptual facets, and mode switches preserve source-only suggestions', () => {
  const groups=buildProfileScaleGroups(guest,['traits','emotions','body'],PROFILE_AREA_AXES)
  const ids=defaultProfileScaleIds(groups,3)
  assert.ok(ids.length > 0 && ids.length <= 9)
  for(const group of groups) {
    const covered = group.scales.filter(scale => ids.includes(scale.id))
    assert.equal(new Set(covered.map(scale => scale.researchAxisId)).size,
      Math.min(3,new Set(group.scales.map(scale => scale.researchAxisId)).size))
  }
  const quick=recommendProfileAxisBattery(guest,groups,ids,'questionnaires')
  const pro=recommendProfileAxisBattery(guest,groups,ids,'pro')
  assert.ok(quick.every(key=>guest.find(item=>item.key===key)?.testKind==='monitoring'))
  assert.ok(pro.every(key=>guest.find(item=>item.key===key)?.testKind==='professional'))
  assert.ok(quick.length<=5 && pro.length<=5)
  assert.deepEqual(recommendProfileAxisBattery(guest,groups,[],'pro'),[])
})

test('EN/RU/ES use identical eligibility while retaining precise localized axis names', () => {
  const enKeys=guest.map(item=>item.key).sort()
  for (const locale of ['ru','es']) {
    const entries=buildExplorerEntries({locale:locale==='es'?'en':locale,audience:'guest'})
    const actual=entries.filter(isGuest).map(item=>item.key).sort()
    assert.deepEqual(actual,enKeys,locale)
  }
  const raw=readFileSync(new URL('../components/personality-profiles-builder.tsx',import.meta.url),'utf8')
  assert.ok(raw.includes('data-profile-research-axis={axis.id}'))
  // The visual label can override the three goal facets, but every other
  // construct still falls back to the existing localized source taxonomy.
  assert.ok(raw.includes('researchLabel(axis.id, locale)'))
  assert.ok(raw.includes('goalScaleLabels[locale][id] || profileResearchAxisLabel(id, locale)'))
  for (const facet of ['clarity', 'motivation', 'confidence']) {
    assert.ok(raw.includes('"goal::' + facet + '"'), facet + ' has its own scale choice')
  }
  assert.ok(raw.includes('selectedProfileResearchAxes(scaleGroups, selectedScaleIds)'))
  assert.ok(!/setResearchScore|createPsychometricNorm|autoEnroll|patientAnswers/.test(raw),
    'research axes must remain a read-only selection classification')
})

test('current builder derives stable 3+5 suggestions and fit from selected source facets, not checked tests', () => {
  const ts = createRequire(import.meta.url)('typescript')
  const raw = readFileSync(new URL('../components/personality-profiles-builder.tsx', import.meta.url), 'utf8')
  const source = ts.createSourceFile('profile.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.deepEqual(source.parseDiagnostics, [])
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
    node.name?.text === 'PersonalityProfilesBuilder')
  assert.ok(component?.body)
  // Execute only the actual pure recommendation declarations, not React, auth,
  // network or scoring. A helper rename alone is not the acceptance criterion.
  const names = ['rankedCandidates', 'recommendedKeys', 'recommendedTests', 'additionalCandidates', 'fiveMoreTests']
  const declarations = component.body.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(node => ts.isIdentifier(node.name) && names.includes(node.name.text))
  assert.deepEqual(declarations.map(node => node.name.text), names)
  assert.ok(declarations.every(node => node.initializer))
  const script = ts.transpileModule('(() => {\n' + declarations.map(node =>
    `const ${node.name.text} = ${node.initializer.getText(source)};`).join('\n') +
    '\nreturn { ranking: rankedCandidates, primary: recommendedTests.map(({test, matchPercent}) => ({key: test.key, matchPercent})), additional: fiveMoreTests.map(({test, matchPercent}) => ({key: test.key, matchPercent})) };\n})()',
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  const entry = (key, extra = {}) => ({ key, testKind: 'monitoring',
    free: true, startable: true, selectable: true, rightsStatus: 'cleared', ...extra })
  const extras = Array.from({ length: 7 }, (_, index) => 'extra-0' + (index + 1))
  const tests = [entry('broad'), entry('focused'), ...extras.map(key => entry(key)),
    entry('unrelated'), entry('other-topic'), entry('restricted', { rightsStatus: 'restricted' }),
    entry('paid', { free: false }), entry('no-start', { startable: false }),
    entry('unselectable', { selectable: false }), entry('optin', { explicitOptIn: true }),
    entry('professional', { testKind: 'professional' })]
  const scale = (testKey, key, researchAxisId) => ({ id: testKey + '::' + key, testKey, researchAxisId })
  const scaleGroups = [{ area: 'work', scales: [
    scale('broad', 'f', 'work::focus'), scale('broad', 'p', 'work::functioning'),
    scale('focused', 'f', 'work::focus'), ...extras.map(key => scale(key, 'f', 'work::focus')),
    scale('unrelated', 's', 'emotions::stress'), scale('other-topic', 'f', 'connection::empathy'),
    ...['restricted', 'paid', 'no-start', 'unselectable', 'optin', 'professional']
      .map(key => scale(key, 'f', 'work::focus')),
  ] }]
  const input = { tests, scaleGroups, selectedScaleIds: ['focused::f', 'broad::p'], batteryMode: 'questionnaires' }
  const original = JSON.stringify(input)
  const evaluate = extra => JSON.parse(JSON.stringify(runInNewContext(script, {
    recommendProfileAxisBattery, recommendProfileTopThreeTests, rankProfileAxisTests,
    ...input, selectedKeys: [], ...extra,
  }, { timeout: 1000 })))
  const result = evaluate({})
  assert.deepEqual(result.primary, [
    { key: 'broad', matchPercent: 90 }, { key: 'focused', matchPercent: 50 },
    { key: 'extra-01', matchPercent: 40 },
  ])
  assert.deepEqual(result.additional, extras.slice(1, 6).map(key => ({ key, matchPercent: 40 })))
  assert.deepEqual(result.ranking.map(item => item.key), ['broad', 'focused', ...extras, 'professional'])
  assert.ok(result.ranking.every(item => item.matchedAxes.length > 0 &&
    item.matchedAxes.every(axis => ['work::focus', 'work::functioning'].includes(axis))))
  // Unchecking every card or retaining only one must not remove suggestions.
  for (const selectedKeys of [[], ['broad'], [...result.primary, ...result.additional].map(item => item.key)])
    assert.deepEqual(evaluate({ selectedKeys }), result)
  assert.deepEqual(evaluate({ tests: [...tests].reverse() }), result)
  assert.deepEqual(evaluate({ selectedScaleIds: [] }), { ranking: [], primary: [], additional: [] })
  const other = evaluate({ selectedScaleIds: ['unrelated::s'] })
  assert.deepEqual(other.primary, [{ key: 'unrelated', matchPercent: 100 }])
  assert.deepEqual(other.additional, [])
  assert.deepEqual(other.ranking[0].matchedAxes, ['emotions::stress'])
  const pro = evaluate({ batteryMode: 'pro' })
  assert.deepEqual(pro.primary, result.primary, 'top-three remains stable when filtering other tests')
  assert.deepEqual(pro.additional, [{ key: 'professional', matchPercent: 40 }])
  const all = evaluate({ batteryMode: 'all' })
  assert.equal(all.primary.length, 3)
  assert.equal(all.additional.length, 5)
  // A high-ranking cluster for one facet must not crowd out another chosen
  // facet merely to fill the three featured slots by rank alone.
  const coverageKeys = ['a-focus-1', 'a-focus-2', 'a-focus-3', 'a-focus-4', 'z-purpose']
  const coverage = evaluate({ tests: coverageKeys.map(key => entry(key)),
    scaleGroups: [{ area: 'work', scales: coverageKeys.map(key =>
      scale(key, 'f', key === 'z-purpose' ? 'work::functioning' : 'work::focus')) }],
    selectedScaleIds: coverageKeys.map(key => key + '::f'),
  })
  assert.deepEqual(coverage.primary.map(item => item.key), ['a-focus-1', 'a-focus-2', 'z-purpose'])
  assert.equal(coverage.additional.length, 2)
  assert.equal(JSON.stringify(input), original, 'recommendations must not mutate source metadata or chosen facets')
})

test('sensitive and reference-only measures never become new public source scores', () => {
  const keys=new Set(guest.map(entry=>entry.key))
  for(const key of ['pcl-5','itq-adult','hh-bach-flower-profile',
    'hh-intimacy-consent','hh-tantra-presence','hh-money-pressure']) {
    assert.ok(accountEntries.find(entry=>entry.key===key),key)
    assert.ok(!keys.has(key),key+' must not bypass the public starter/rights gates')
  }
  for(const reference of accountEntries.filter(entry=>entry.source==='research')) {
    assert.ok(reference.category && reference.topics.length,
      'reference-only instrument must retain authored topic and category')
    assert.ok(!keys.has(reference.key),'reference-only method must not start')
  }
})

test('all 73 author-owned EN/RU families have an item-level qualified-review queue, never fake validation', () => {
  const report = auditProfileConstructLinks()
  const review = buildAuthorAxisReview(report)
  assert.equal(report.counts.catalogue, 295)
  assert.equal(report.counts.scoredAccount, 147)
  assert.equal(report.counts.scoredGuest, 40)
  assert.equal(report.counts.authorMethodsAwaitingIndependentReview, 73)
  assert.equal(report.emptyResearchFacets.length, 0)
  assert.deepEqual(report.unlinked, [])
  assert.deepEqual(report.guestUnlinked, [])
  assert.equal(review.methods, 73)
  assert.equal(review.editions, 146)
  assert.equal(review.items, 1498)
  assert.equal(review.flaggedItems, 362)
  assert.deepEqual(review.missingVersions, [])
  assert.ok(review.unlinkedItemRows > 0,
    'specialist scorer item-to-dimension mapping must not be inferred')
  assert.ok(review.rows.every(row =>
    row.reviewStatus === 'pending_qualified_content_review' &&
    row.cognitiveInterviewStatus === 'not_completed' &&
    row.psychometricValidation === 'not_established'))
  assert.ok(review.rows.some(row => row.researchFacets.length > 0),
    'some exact item-score mappings are available for reviewers')
  assert.ok(review.rows.some(row => row.dimensionMapping === 'manual_construct_link_review'),
    'unknown mappings remain visibly pending')
  assert.equal(new Set(review.rows.map(row =>
    [row.key,row.version,row.locale,row.itemId].join('::'))).size, review.items)
  const csv=authorAxisReviewCsv(review)
  assert.ok(csv.startsWith('key,version,locale,itemId,itemOrder,text,timeframe,'))
  assert.equal(csv.trimEnd().split('\n').length, review.items + 1)
})

test('collapsed topic preview preserves all distinct real facets before duplicate source alternatives', () => {
  const traits = buildProfileScaleGroups(guest, ['traits'], PROFILE_AREA_AXES)[0]
  assert.ok(traits.scales.length > 8, 'fixture must exercise collapsed source scales')
  const shown = previewProfileScales(traits.scales, 8)
  const expected = new Set(traits.researchAxes.map(axis => axis.id))
  assert.equal(shown.length, 8, 'remain compact when eight rows cover the axes')
  assert.deepEqual(new Set(shown.map(scale => scale.researchAxisId)), expected,
    'every Big Five facet must be immediately visible before Show more')
  for (const facet of ['extraversion','agreeableness','conscientiousness',
    'emotional_reactivity','openness']) {
    assert.ok(shown.some(scale => scale.researchAxisId === 'traits::' + facet),
      'hidden Big Five facet: ' + facet)
  }
  assert.equal(new Set(shown.map(scale => scale.id)).size, shown.length,
    'do not duplicate a source scale while selecting representatives')
  assert.deepEqual(previewProfileScales(traits.scales, 0)
    .map(scale => scale.researchAxisId).sort(),
    [...expected].sort(), 'zero secondary rows still lists every documented axis')
  const builder = readFileSync(new URL('../components/personality-profiles-builder.tsx', import.meta.url), 'utf8')
  // The legacy helper still covers all source facets for audit use, but the
  // simple wizard now presents one topic axis, never source-scale variants.
  const topics = builder.slice(builder.indexOf('{step === 2 && <section'),
    builder.indexOf('{step === 3 && <section'))
  assert.doesNotMatch(topics, /previewProfileScales|data-profile-source-scale/)
  assert.match(topics, /group\.researchAxes\.map\(axis => <label/)
  assert.match(topics, /data-profile-research-axis=\{axis\.id\}/)

})

// Execute the actual component's pure declarations and event handlers only.
// This deliberately excludes React rendering, authentication, network and scores.
const wizardScriptCache = new Map()
function actualWizardLogic(names, functions, context) {
  const cacheKey = [...names, '|', ...functions].join(',')
  if (wizardScriptCache.has(cacheKey)) return runInNewContext(wizardScriptCache.get(cacheKey), context, { timeout: 1000 })
  const ts = createRequire(import.meta.url)('typescript')
  const raw = readFileSync(new URL('../components/personality-profiles-builder.tsx', import.meta.url), 'utf8')
  const source = ts.createSourceFile('profile.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.deepEqual(source.parseDiagnostics, [])
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
    node.name?.text === 'PersonalityProfilesBuilder')
  assert.ok(component?.body)
  const declarations = component.body.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(node => ts.isIdentifier(node.name) && names.includes(node.name.text))
  const handlers = component.body.statements.filter(node => ts.isFunctionDeclaration(node) &&
    functions.includes(node.name?.text))
  assert.deepEqual(declarations.map(node => node.name.text), names)
  assert.deepEqual(handlers.map(node => node.name.text), functions)
  const script = ts.transpileModule('(() => {\n' + declarations.map(node =>
    `const ${node.name.text} = ${node.initializer.getText(source)};`).join('\n') + '\n' +
    handlers.map(node => node.getText(source)).join('\n') +
    '\nreturn {' + [...names, ...functions].join(',') + '};\n})()',
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  wizardScriptCache.set(cacheKey, script)
  return runInNewContext(script, context, { timeout: 1000 })
}

test('actual 3-kind finder preserves chosen-scope safety, stable cards and a mixed 12-test cap', () => {
  const names = ['rankedCandidates', 'recommendedKeys', 'recommendedTests', 'additionalCandidates',
    'fiveMoreTests', 'featuredTestKeys', 'eligibleTestKeys', 'fitByKey', 'extraMatchPercent',
    'remainingTestKeys', 'extraMatches', 'displayTests']
  const keys = Array.from({ length: 15 }, (_, i) => 'match-' + String(i).padStart(2, '0'))
  const entry = (key, extra = {}) => ({ key, title: key, minutes: 2, questions: 5,
    testKind: 'monitoring', selectable: true, free: true, startable: true, rightsStatus: 'cleared', ...extra })
  const tests = [...keys.map(key => entry(key)), entry('unrelated'), entry('same-area-unselected'),
    entry('professional', { testKind: 'professional' }), entry('paid', { free: false }),
    entry('reference', { startable: false }), entry('restricted', { rightsStatus: 'restricted' })]
  const scaleGroups = [{ area: 'work', scales: tests.map(test => ({
    id: test.key + '::f', testKey: test.key, label: 'Focus',
    researchAxisId: test.key === 'unrelated' ? 'connection::empathy' :
      test.key === 'same-area-unselected' ? 'work::functioning' : 'work::focus',
  })) }]
  const context = { tests, scaleGroups, selectedScaleIds: ['match-00::f'],
    selectedAxisRefs: ['work::focus'], batteryMode: 'all', selectedKeys: [], showMore: false,
    search: '', timeFilter: 'all', sortFilter: 'relevant', locale: 'en',
    recommendProfileTopThreeTests, rankProfileAxisTests, profileResearchAxisLabel }
  const plain = value => JSON.parse(JSON.stringify(value))
  const evaluate = (extra = {}) => actualWizardLogic(names, ['toggleTest'], {
    ...context, ...extra, setSelectedKeys: () => { throw Error('unexpected selection change') },
  })
  const snapshot = result => plain({ primary: result.recommendedTests.map(item => item.test.key),
    five: result.fiveMoreTests.map(item => item.test.key),
    more: result.displayTests.map(item => item.key) })
  for (const locale of ['en', 'ru', 'es']) {
    const view = extra => evaluate({ locale, ...extra })
    const all = snapshot(view({ showMore: true }))
    assert.deepEqual(all.primary, keys.slice(0, 3))
    assert.deepEqual(all.five, keys.slice(3, 8))
    assert.deepEqual(all.more, [...keys.slice(8), 'professional'])
    assert.equal(new Set([...all.primary, ...all.five, ...all.more]).size, 16)
    assert.deepEqual(snapshot(view({ batteryMode: 'questionnaires', showMore: true })).more,
      keys.slice(8))
    const professional = snapshot(view({ batteryMode: 'pro', showMore: true }))
    assert.deepEqual(professional.primary, all.primary)
    assert.deepEqual(professional.five, ['professional'])
    assert.deepEqual(professional.more, [])
    for (const selectedKeys of [[], keys.slice(0, 12), ['professional']])
      assert.deepEqual(snapshot(view({ selectedKeys, showMore: true })), all)
    const result = view({ showMore: true })
    for (const invalid of ['unrelated', 'same-area-unselected', 'paid', 'reference', 'restricted'])
      assert.equal(result.eligibleTestKeys.has(invalid), false, invalid)
    assert.equal(result.eligibleTestKeys.has('professional'), true)
    assert.deepEqual(snapshot(view({ selectedScaleIds: [], selectedAxisRefs: [], showMore: true })),
      { primary: [], five: [], more: [] })
    assert.deepEqual(snapshot(view({ showMore: true, search: 'match-10' })).more, ['match-10'])
    assert.deepEqual(snapshot(view({ showMore: true, timeFilter: '1' })).more, [])
    let selectedKeys = [keys[0], 'professional']
    const handler = actualWizardLogic(names, ['toggleTest'], { ...context, locale,
      setSelectedKeys: update => { selectedKeys = plain(update(selectedKeys)) } })
    for (const invalid of ['unrelated', 'same-area-unselected', 'paid', 'reference', 'restricted', 'missing'])
      handler.toggleTest(invalid)
    assert.deepEqual(selectedKeys, [keys[0], 'professional'])
    selectedKeys = keys.slice(0, 11).concat('professional')
    handler.toggleTest(keys[11])
    assert.equal(selectedKeys.length, 12, 'both kinds count toward the same limit')
    handler.toggleTest(keys[12])
    assert.equal(selectedKeys.length, 12, '13th selection is blocked')
    handler.toggleTest('professional')
    handler.toggleTest(keys[12])
    assert.ok(selectedKeys.includes(keys[12]))
    assert.equal(selectedKeys.length, 12)
  }
})

test('actual upstream handlers clear only dependent drafts and unchanged back/forward preserves unchecked choices', () => {
  const tests = ['a', 'b', 'c'].map(key => ({ key, testKind: 'monitoring', minutes: 1 }))
  const scaleGroups = [{ area: 'goal', scales: tests.map(test => ({ id: test.key + '::f', testKey: test.key,
    researchAxisId: 'goal::motivation' })), researchAxes: [{ id: 'goal::motivation' }] }]
  const initial = { tests, scaleGroups, visibleScaleGroups: scaleGroups, focuses: ['goal'],
    selectedResearchIds: ['goal::motivation'], selectedScaleIds: ['a::f'], selectedAxes: ['energy'],
    selectedByMode: { questionnaires: ['a'], pro: ['saved-pro'] }, batteryMode: 'questionnaires',
    batterySignature: 'a::f', selectedKeys: [], step: 2, scalesInitialized: true, showMore: true,
    recommendProfileTopThreeTests, defaultProfileScaleIds }
  const plain = value => JSON.parse(JSON.stringify(value))
  const setup = (extra = {}) => {
    const state = { ...initial, ...extra }
    for (const name of ['Focuses', 'SelectedResearchIds', 'SelectedScaleIds', 'SelectedByMode',
      'BatteryMode', 'BatterySignature', 'Step', 'ScalesInitialized', 'ShowMore']) {
      const key = name[0].toLowerCase() + name.slice(1)
      state['set' + name] = update => { state[key] = plain(typeof update === 'function' ? update(state[key]) : update) }
    }
    const handlers = actualWizardLogic([], ['toggleFocus', 'toggleResearchAxis', 'toggleScale', 'goForward'],
      { ...state, eligibleTestKeys: new Set() })
    return { state, handlers }
  }
  let current = setup({ selectedByMode: { questionnaires: [], pro: [] } })
  current.handlers.goForward()
  assert.equal(current.state.step, 3)
  assert.deepEqual(current.state.selectedByMode, { questionnaires: [], pro: [] },
    'going back then forward without topic changes must not re-check tests')
  current = setup({ batterySignature: '' })
  current.handlers.goForward()
  assert.deepEqual(current.state.selectedByMode, { questionnaires: ['a', 'b', 'c'], pro: [] })
  current = setup({ step: 3, selectedKeys: [] })
  current.handlers.goForward()
  assert.equal(current.state.step, 3, 'zero checked tests cannot reach save step')
  current = setup({ step: 3, selectedKeys: ['a'] })
  current.handlers.goForward()
  assert.equal(current.state.step, 4)
  for (const [handler, key] of [['toggleScale', 'a::f'], ['toggleResearchAxis', 'goal::motivation'], ['toggleFocus', 'goal']]) {
    current = setup()
    current.handlers[handler](key)
    assert.deepEqual(current.state.selectedByMode, { questionnaires: [], pro: [] }, handler)
    assert.equal(current.state.batterySignature, '', handler)
    assert.equal(current.state.showMore, false, handler)
    assert.deepEqual(current.state.selectedScaleIds, [], handler)
  }
  for (const handler of ['toggleResearchAxis', 'toggleScale']) {
    current = setup()
    current.handlers[handler]('outside-chosen-scope')
    assert.deepEqual(current.state.selectedByMode, initial.selectedByMode, 'invalid source choice must be a no-op')
    assert.equal(current.state.batterySignature, 'a::f')
  }
  const scope = actualWizardLogic(['visibleAreas', 'visibleScaleGroups', 'activeAreas', 'scaleGroups'], [], {
    tests: guest, focuses: ['goal'], selectedResearchIds: ['goal::motivation'],
    areaAxes: PROFILE_AREA_AXES, profileAreasWithTests, buildProfileScaleGroups,
  })
  assert.ok(scope.scaleGroups.length > 0)
  assert.ok(scope.scaleGroups.every(group => group.researchAxes.every(axis => axis.id === 'goal::motivation') &&
    group.scales.every(scale => scale.researchAxisId === 'goal::motivation')),
  'choosing one Goal facet must not silently include clarity or confidence')
})


test('actual main-scale and topic handlers never leak other areas or test drafts', () => {
  const visibleScaleGroups = [
    { area: 'emotions', researchAxes: [{id:'emotions::stress'}, {id:'emotions::anxiety'},
      {id:'emotions::mood'}] },
    { area: 'goal', researchAxes: [{id:'goal::clarity'},{id:'goal::motivation'},
      {id:'goal::confidence'}] },
  ]
  const scaleGroups = [{ area: 'emotions', scales: [
    {id:'a::stress', researchAxisId:'emotions::stress'},
    {id:'b::stress', researchAxisId:'emotions::stress'},
    {id:'c::anxiety', researchAxisId:'emotions::anxiety'},
  ] }]
  const plain = value => JSON.parse(JSON.stringify(value))
  const original = { selectedResearchIds: [], selectedScaleIds:['a::stress'],
    selectedByMode:{questionnaires:['a'],pro:['saved-pro']},
    batterySignature:'old-topic', showMore:true }
  const run = (fn, arg, source = original) => {
    const state = plain(source)
    const ctx = { ...state, visibleScaleGroups, scaleGroups }
    for (const key of ['SelectedResearchIds','SelectedScaleIds','SelectedByMode',
      'BatterySignature','ShowMore']) {
      const field = key[0].toLowerCase() + key.slice(1)
      ctx['set' + key] = next => {
        state[field] = plain(typeof next === 'function' ? next(state[field]) : next)
      }
    }
    const handlers = actualWizardLogic([], ['toggleMainScale','toggleTopicAxis'], ctx)
    handlers[fn](arg)
    return state
  }
  const broad = run('toggleMainScale','emotions')
  assert.deepEqual(broad.selectedResearchIds,
    ['emotions::stress','emotions::anxiety','emotions::mood'])
  assert.deepEqual(broad.selectedScaleIds, [])
  assert.deepEqual(broad.selectedByMode, {questionnaires:[],pro:[]})
  assert.equal(broad.batterySignature, '')
  assert.equal(broad.showMore, false)
  assert.deepEqual(run('toggleMainScale','emotions',broad).selectedResearchIds,[])
  assert.deepEqual(run('toggleMainScale','goal'),original,'Goal keeps independent controls')
  assert.deepEqual(run('toggleTopicAxis','emotions::stress').selectedScaleIds, [],
    'an already-partially-selected research topic must be deselected cleanly')
  const selected = run('toggleTopicAxis','emotions::stress',
    { ...original, selectedScaleIds: [] })
  assert.deepEqual(selected.selectedScaleIds,['a::stress','b::stress'],
    'one newly selected research topic matches only registered source scales in its own axis')
  assert.deepEqual(selected.selectedByMode,{questionnaires:[],pro:[]})
  assert.deepEqual(run('toggleTopicAxis','emotions::stress',selected).selectedScaleIds,[])
  assert.deepEqual(run('toggleTopicAxis','emotions::unknown'),original,
    'unknown/unsupported topics cannot add tests or reset the draft')
})
