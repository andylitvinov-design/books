import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { recommendUnmeasuredPortraitTests } from '../lib/profile/portrait-test-suggestions.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { PORTRAIT_AXIS_ORDER } from '../lib/assessments/portrait-sectors.js'

const entry = (key, axes, options = {}) => ({
  key, title:key, selectable:true, startable:true, rightsStatus:'cleared',
  free:true, starterEligible:true, explicitOptIn:false,
  durationMinutes:4, questionCount:9,
  scaleGuide:{scales:axes.map(axis=>({axis,portraitMode:'directional'}))},
  ...options,
})

test('recommends short, uncompleted questionnaires covering real missing portrait scales', () => {
  const ranked=recommendUnmeasuredPortraitTests({
    missingAxes:['mood','focus','boundaries','meaning'],
    results:[{definitionKey:'completed-boundaries'}],
    entries:[
      entry('mood-and-focus',['mood','focus'],{durationMinutes:6}),
      entry('meaning',['meaning'],{durationMinutes:3}),
      entry('boundaries',['boundaries'],{durationMinutes:2}),
      entry('completed-boundaries',['boundaries'],{durationMinutes:1}),
      entry('unrelated',['sleep'],{durationMinutes:1}),
    ],
  })
  assert.deepEqual(ranked.map(item=>item.key),['mood-and-focus','boundaries','meaning'])
  assert.deepEqual(ranked[0].covers,['mood','focus'])
  assert.equal(ranked.every(item=>item.key!=='completed-boundaries'),true)
  assert.equal(ranked.every(item=>!('score' in item)),true)
})

test('never offers paid, non-startable, unaudited or opt-in-only questionnaires', () => {
  const ranked=recommendUnmeasuredPortraitTests({
    missingAxes:['embodiment'],
    entries:[
      entry('paid',['embodiment'],{free:false}),
      entry('not-cleared',['embodiment'],{rightsStatus:'research_only'}),
      entry('not-selectable',['embodiment'],{selectable:false}),
      entry('opt-in',['embodiment'],{explicitOptIn:true}),
      entry('not-startable',['embodiment'],{startable:false}),
      entry('unreviewed',['embodiment'],{scaleGuide:{scales:[{axis:'embodiment',portraitMode:'unreviewed'}]}}),
      entry('descriptive',['embodiment'],{scaleGuide:{scales:[{axis:'embodiment',portraitMode:'descriptive'}]}}),
    ],
  })
  assert.deepEqual(ranked.map(item=>item.key),['descriptive'])
})

test('respects completed keys, missing-axis bounds, limit and empty-state safety', () => {
  const entries=[entry('one',['focus']),entry('two',['mood'])]
  assert.deepEqual(recommendUnmeasuredPortraitTests({entries,missingAxes:['invented']}),[])
  assert.deepEqual(recommendUnmeasuredPortraitTests({entries,missingAxes:['focus'],results:[{definitionKey:'one'}]}),[])
  assert.equal(recommendUnmeasuredPortraitTests({entries,missingAxes:['mood','focus'],limit:1}).length,1)
})

test('the real cleared free catalog provides at least two quick profile suggestions', () => {
  const options=buildExplorerEntries({locale:'en',audience:'account'})
  const ranked=recommendUnmeasuredPortraitTests({
    entries:options, results:[], missingAxes:PORTRAIT_AXIS_ORDER,
  })
  assert.ok(ranked.length >= 2, 'Expected at least two free audited questionnaires')
  for (const item of ranked.slice(0,2)) {
    assert.ok(options.find(entry=>entry.key===item.key)?.free)
    assert.ok(item.covers.length > 0)
  }
})

test('development tab places a distinct profile module before course recommendations', () => {
  const view=readFileSync(new URL('../components/app/development-program.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/development-program.module.css',import.meta.url),'utf8')
  const profilePos=view.indexOf('className={styles.profileInvitation}')
  const coursesPos=view.indexOf('className={styles.courseSection}')
  assert.ok(profilePos>0&&coursesPos>profilePos)
  assert.match(view,/recommendedTests\.slice\(0, 2\)/)
  assert.match(view,/recommendedTests\.slice\(2\)/)
  assert.match(view,/<details className=\{styles\.profileTestMore\}>/)
  assert.match(view,/\/app\/monitoring\//)
  assert.match(view,/aria-labelledby="hh-profile-invitation-title"/)
  assert.match(view,/buildPsychPortrait\(results\)/)
  assert.doesNotMatch(view,/\{missing\.length > 0 && <div className=\{styles\.missing\}>/)
  assert.match(css,/@media\(max-width:620px\)/)
  assert.match(css,/\.profileTestCard\{/)
})
