import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { GOAL_RATING_KEYS, GOAL_RATING_LABELS, GOAL_SUPPORT_RULES, goalSupportFacetForScale, normalizeGoalCheckin } from '../lib/profile/goal-profile.js'
import { normalizeDevelopmentGoals, DEVELOPMENT_GOALS_VERSION, DEFAULT_DEVELOPMENT_TARGETS } from '../lib/profile/development-program.js'
import { PROFILE_FOCUS_AREAS, PROFILE_RESEARCH_AXES, isProfileScaleRelevant } from '../lib/profile/profile-scale-selection.js'
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
  assert.equal(goalSupportFacetForScale('hh-weekly-pulse','clarity'),'clarity')
  assert.equal(goalSupportFacetForScale('hh-weekly-pulse','relationships'),null)
  assert.equal(goalSupportFacetForScale('hh-motivation-spark','energy'),'motivation')
  assert.equal(goalSupportFacetForScale('hh-confidence-pulse','self_support'),'confidence')
  assert.equal(goalSupportFacetForScale('fictional','self_support'),null)
  for(const rule of GOAL_SUPPORT_RULES){
    assert.ok(GOAL_RATING_KEYS.includes(rule.facet))
    assert.ok(isProfileScaleRelevant({key:rule.testKey},{axis:rule.axis},'goal'))
    assert.equal(isProfileScaleRelevant({key:'unrelated'},{axis:rule.axis},'goal'),false)
  }
  assert.equal(isProfileScaleRelevant({key:'hh-weekly-pulse'},{axis:'clarity'},'work'),false)
})

test('live eligible account catalogue is used for supplementary Goal tests, never invented psychometrics', () => {
  for (const locale of ['en','ru','es']) {
    const source=buildExplorerEntries({locale,audience:'account'})
    const relevant=source.filter(entry=>entry.selectable && entry.startable &&
      entry.rightsStatus==='cleared' && entry.free && !entry.explicitOptIn &&
      GOAL_SUPPORT_RULES.some(rule=>rule.testKey===entry.key &&
        (entry.scaleGuide?.scales||[]).some(scale=>scale.axis===rule.axis)))
    assert.ok(relevant.length >= 1,locale)
    assert.ok(relevant.every(entry=>entry.definition),locale)
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
  assert.match(panel,/explicitOptIn !== true/)
  assert.match(panel,/SERVICE_PATH/)
  assert.match(panel,/completed/)
  assert.match(editor,/data-goal-checkin-editor/)
  assert.match(editor,/data-goal-checkin-control=\{key\}/)
  assert.match(editor,/goalCheckin: values\.every/)
  assert.match(editor,/measuredAt: new Date\(\)\.toISOString\(\)/)
  assert.match(backend,/onlyKeys\(input, \['version', 'targets', 'details', 'goalCheckin', 'revision'\]\)/)
  assert.match(backend,/openSealed/)
  assert.match(backend,/seal\(/)
  assert.match(backend,/account_id=\$1/)
  assert.match(visual,/data-portrait-sector="goal"/)
  assert.match(visual,/selectedSector !== 'goal' && <section/)
  assert.match(workspace,/goalProfileProps=\{\{ accountId, entriesByKey, results: data\.results \|\| \[\] \}\}/)
})
