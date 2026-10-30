import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { GOAL_RATING_KEYS, GOAL_RATING_LABELS, GOAL_SUPPORT_RULES, goalSupportFacetForScale, eligibleGoalSupportEntry, normalizeGoalCheckin } from '../lib/profile/goal-profile.js'
import { normalizeDevelopmentGoals, DEVELOPMENT_GOALS_VERSION, DEFAULT_DEVELOPMENT_TARGETS } from '../lib/profile/development-program.js'
import { PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES, PROFILE_RESEARCH_AXES,
  buildProfileScaleGroups, isProfileScaleRelevant } from '../lib/profile/profile-scale-selection.js'
import { PORTRAIT_SECTORS, PORTRAIT_AXIS_ORDER } from '../lib/assessments/portrait-sectors.js'

const view = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
const initial = () => ({ version: DEVELOPMENT_GOALS_VERSION, targets:{...DEFAULT_DEVELOPMENT_TARGETS}, details:{} })
const rating = () => ({ measuredAt:new Date().toISOString(), values:{clarity:6,motivation:8,confidence:5} })

test('fifth Goal Profile has exactly three personal 0–10 ratings, EN/RU/ES labels', () => {
  assert.deepEqual(GOAL_RATING_KEYS,['clarity','motivation','confidence'])
  assert.deepEqual(Object.keys(PROFILE_FOCUS_AREAS),['wellbeing','relationships','work','identity','goal'])
  assert.deepEqual(PROFILE_FOCUS_AREAS.goal,['goal'])
  assert.deepEqual(PROFILE_RESEARCH_AXES.goal.map(s=>s.id),GOAL_RATING_KEYS)
  for(const key of GOAL_RATING_KEYS) for(const locale of ['en','ru','es'])
    assert.ok(GOAL_RATING_LABELS[key][locale]?.length > 4,key+'/'+locale)
  // The authenticated psychometric wheel MUST remain four source-audited sectors.
  assert.equal(PORTRAIT_SECTORS.length,4)
  assert.equal(PORTRAIT_AXIS_ORDER.length,17)
  assert.equal(PORTRAIT_AXIS_ORDER.includes('confidence'),false)
})

test('unanswered ratings stay absent, old encrypted development goals stay compatible', () => {
  assert.deepEqual(normalizeDevelopmentGoals(initial()), initial())
  const saved={...initial(),goalCheckin:rating()}
  assert.deepEqual(normalizeDevelopmentGoals(saved), saved)
  assert.deepEqual(normalizeGoalCheckin(saved.goalCheckin), saved.goalCheckin)
  assert.deepEqual(normalizeDevelopmentGoals({...initial(),goalCheckin:null}),{...initial(),goalCheckin:null})
})

test('self-ratings reject inferred or malformed scores and fields that might leak personal data', () => {
  const base=rating()
  for(const bad of [
    {...base, values:{clarity:6,motivation:8}},
    {...base, values:{...base.values,health:3}},
    {...base, values:{...base.values,confidence:11}},
    {...base, values:{...base.values,confidence:-1}},
    {...base, values:{...base.values,confidence:4.5}},
    {...base, values:{...base.values,motivation:'8'}},
    {...base, values:{...base.values,motivation:true}},
    {...base, goalText:'My protected goal'},
    {...base, measuredAt:'not-a-date'},
    {...base, measuredAt:'2036-10-27T12:00:00.000Z'},
  ]) {
    assert.equal(normalizeGoalCheckin(bad),null)
    assert.equal(normalizeDevelopmentGoals({...initial(), goalCheckin:bad}),null)
  }
})

test('supporting tests must match canonical key AND an actual scored axis, not keywords or general traits', () => {
  assert.equal(goalSupportFacetForScale('hh-weekly-pulse',{key:'weekly.clarity',axis:'clarity'},'v1'),'clarity')
  assert.equal(goalSupportFacetForScale('hh-weekly-pulse',{key:'weekly.connection',axis:'relationships'}),null)
  assert.equal(goalSupportFacetForScale('hh-weekly-pulse',{key:'weekly.clarity',axis:'clarity'},'v2'),null)
  assert.equal(goalSupportFacetForScale('hh-motivation-spark',{key:'resources.motivation_spark.overall',axis:'energy'}),'motivation')
  assert.equal(goalSupportFacetForScale('hh-confidence-pulse',{key:'resources.confidence_pulse.overall',axis:'self_support'}),'confidence')
  assert.equal(goalSupportFacetForScale('fictional',{key:'resource.self_support',axis:'self_support'}),null)
  for(const rule of GOAL_SUPPORT_RULES){
    assert.ok(GOAL_RATING_KEYS.includes(rule.facet))
    assert.ok(rule.dimensionKey.length > 4 && rule.version === 'v1')
    const correct = {key:rule.dimensionKey,axis:rule.axis}
    assert.equal(goalSupportFacetForScale(rule.testKey,correct,rule.version),rule.facet)
    assert.ok(isProfileScaleRelevant({key:rule.testKey,version:rule.version},correct,'goal'))
    assert.equal(isProfileScaleRelevant({key:'unrelated',version:rule.version},correct,'goal'),false)
    assert.equal(goalSupportFacetForScale(rule.testKey,{...correct,key:'unrelated'},rule.version),null)
    assert.equal(goalSupportFacetForScale(rule.testKey,correct,'v999'),null)
  }
  assert.equal(isProfileScaleRelevant({key:'hh-weekly-pulse',version:'v1'},{key:'weekly.clarity',axis:'clarity'},'work'),false)
})

test('every goal source maps an exact registered versioned scorer dimension, not generic axes', () => {
  for (const locale of ['en','ru','es']) {
    const source = buildExplorerEntries({locale:locale==='es'?'en':locale,audience:'account'})
    for (const rule of GOAL_SUPPORT_RULES) {
      const entry = source.find(item => item.key === rule.testKey)
      assert.ok(entry && entry.definition,locale+': missing source '+rule.testKey)
      assert.equal(entry.definition.version,rule.version,rule.testKey+' version')
      assert.ok(entry.scaleGuide?.scales?.some(scale => scale.key === rule.dimensionKey &&
        scale.axis === rule.axis),locale+': missing EXACT score '+rule.testKey+'/'+rule.dimensionKey)
      assert.equal(goalSupportFacetForScale(rule.testKey,{
        key:rule.dimensionKey,axis:rule.axis},rule.version),rule.facet)
      assert.equal(eligibleGoalSupportEntry({
        ...entry, rightsStatus:'restricted'},rule),false)
      assert.equal(eligibleGoalSupportEntry({
        ...entry, explicitOptIn:true},rule),false)
      assert.equal(eligibleGoalSupportEntry({
        ...entry, definition:{...entry.definition,version:'v999'}},rule),false)
    }
  }
})

test('all three goal axes have real, rights-cleared free guest starter scales', () => {
  for (const locale of ['en','ru','es']) {
    const source = buildExplorerEntries({locale:locale==='es'?'en':locale,audience:'guest'})
    const supported = GOAL_SUPPORT_RULES.filter(rule => {
      const entry = source.find(item => item.key === rule.testKey)
      return eligibleGoalSupportEntry(entry,rule,'guest')
    })
    for(const facet of GOAL_RATING_KEYS) {
      assert.ok(supported.some(rule => rule.facet === facet),
        locale+': no eligible source backing goal facet '+facet)
    }
    assert.ok(supported.every(rule => {
      const entry = source.find(item => item.key === rule.testKey)
      return entry.guestEligible===true && entry.free===true &&
        entry.starterEligible!==false && entry.rightsStatus==='cleared' &&
        entry.definition?.version===rule.version
    }))
    assert.equal(eligibleGoalSupportEntry({
      ...source.find(e=>e.key==='hh-weekly-pulse'),guestEligible:false
    }, GOAL_SUPPORT_RULES.find(r=>r.testKey==='hh-weekly-pulse'),'guest'),false)
  }
})

test('all five focuses use source-scored eligible tests; goal has three real and non-interchangeable guest facets', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const source = buildExplorerEntries({ locale:locale === 'es' ? 'en' : locale, audience:'guest' })
      .filter(entry => entry.selectable && entry.startable && entry.guestEligible === true &&
        entry.starterEligible !== false && entry.free === true &&
        entry.rightsStatus === 'cleared' && entry.explicitOptIn !== true &&
        entry.scaleGuide?.measurementAxes?.length)
      .map(entry => ({
        key:entry.key, version:entry.definition?.version, title:entry.title,
        topics:entry.topics, testKind:entry.testKind,
        axes:entry.scaleGuide.measurementAxes, minutes:entry.durationMinutes,
        questions:entry.questionCount,
        scales:entry.scaleGuide.scales.filter(scale =>
          entry.scaleGuide.measurementAxes.includes(scale.axis)),
      }))
    const allAreas = [...new Set(Object.values(PROFILE_FOCUS_AREAS).flat())]
    const groups = buildProfileScaleGroups(source, allAreas, PROFILE_AREA_AXES)
    assert.deepEqual(new Set(groups.flatMap(group=>group.scales.map(row=>row.testKey))),
      new Set(source.map(row=>row.key)),locale+': scored public test orphaned')
    const goal = groups.find(group=>group.area==='goal')
    assert.deepEqual(new Set(goal.researchAxes.map(axis=>axis.id)),
      new Set(GOAL_RATING_KEYS.map(key=>'goal::'+key)),locale)
    for(const scale of goal.scales) {
      assert.ok(GOAL_SUPPORT_RULES.some(rule =>
        rule.testKey === scale.testKey && rule.dimensionKey === scale.key &&
        rule.axis === scale.axis && rule.facet === scale.researchAxisId.slice('goal::'.length)),
        locale+': invented or wrong goal scale '+scale.testKey+'::'+scale.key)
      assert.ok(source.some(test=>test.key === scale.testKey && test.version === 'v1'),
        'missing registered guest scorer version '+scale.testKey)
    }
    assert.ok(goal.scales.length >= 3)
    assert.ok(groups.every(group=>group.scales.every(row=>row.researchAxisId.startsWith(group.area+'::'))))
  }
})

test('saved goal check-in is read only under account identity; conversion remains explicit and private', () => {
  const panel=view('components/app/goal-profile-panel.jsx')
  const editor=view('components/app/development-program.jsx')
  const backend=view('lib/app/development-goals.js')
  const visual=view('components/app/test-explorer-visual.jsx')
  const workspace=view('components/app/app-workspace.jsx')
  assert.match(panel,/appFetch\('development-goals', undefined, 'GET', \{ accountId \}\)/)
  assert.match(panel,/data-goal-profile/)
  assert.match(panel,/data-goal-support-facet/)
  assert.match(panel,/eligibleGoalSupportEntry\(test, rule\)/)
  assert.match(panel,/verifiedHistoryView\(results\)\.current/)
  // /app/tests preselects a test only when BOTH the canonical key and the
  // exact source scoring axis are supplied; passing suggest alone did nothing.
  assert.match(panel,/encodeURIComponent\(test\.axis\)/)
  const explorer = view('components/app/test-explorer.jsx')
  assert.match(explorer,/const requestedAxis = params\.get\('axis'\)/)
  assert.match(explorer,/!suggestedKey \|\| !requestedAxis/)
  assert.match(explorer,/item\.measurementAxes\?\.includes\(requestedAxis\)/)
  assert.match(panel,/SERVICE_PATH/)
  assert.match(panel,/completed/)
  assert.match(editor,/data-goal-checkin-editor/)
  assert.match(editor,/data-goal-checkin-control=\{key\}/)
  assert.match(editor,/goalCheckin: values\.every/)
  assert.match(editor,/measuredAt: new Date\(\)\.toISOString\(\)/)
  assert.match(backend,/onlyKeys\(input, \['version', 'targets', 'details', 'goalCheckin', 'supportProfile', 'revision'\]\)/)
  assert.match(backend,/openSealed/)
  assert.match(backend,/seal\(/)
  assert.match(backend,/account_id=\$1/)
  assert.match(visual,/data-portrait-sector="goal"/)
  assert.match(visual,/selectedSector !== 'goal' && <section/)
  assert.match(workspace,/goalProfileProps=\{\{ accountId, entriesByKey, results: data\.results \|\| \[\] \}\}/)
})
