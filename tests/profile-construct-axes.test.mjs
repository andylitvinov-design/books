import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildExplorerEntries, TEST_EXPLORER_AXES } from '../lib/assessments/test-explorer.js'
import { auditProfileConstructLinks, buildAuthorAxisReview, authorAxisReviewCsv } from '../scripts/audit-profile-construct-links.mjs'
import {
  PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES, PROFILE_RESEARCH_AXES,
  buildProfileScaleGroups, defaultProfileScaleIds, profileAreasWithTests,
  selectedProfileResearchAxes, researchAxisForScale, profileResearchAxisLabel,
  recommendProfileAxisBattery, previewProfileScales,
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
  assert.ok(raw.includes('recommendProfileAxisBattery(tests, scaleGroups'))
  assert.ok(raw.includes('selectedProfileResearchAxes(scaleGroups, selectedScaleIds)'))
  assert.ok(!/setResearchScore|createPsychometricNorm|autoEnroll|patientAnswers/.test(raw),
    'research axes must remain a read-only selection classification')
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
  assert.match(builder, /const shortlist = previewProfileScales\(group\.scales, 8\)/)
})
