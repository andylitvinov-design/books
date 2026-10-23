import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { PORTRAIT_AXIS_ORDER } from '../lib/assessments/portrait-sectors.js'
import { recommendPortraitSectorTests } from '../lib/profile/portrait-test-suggestions.js'

const item = (key, axes, settings = {}) => ({
  key, title:key, selectable:true, startable:true, rightsStatus:'cleared',
  free:true, explicitOptIn:false, starterEligible:true, questionCount:8,
  durationMinutes:3, topics:['work'],
  scaleGuide:{scales:axes.map(axis=>({axis,portraitMode:'directional'}))},
  ...settings,
})

test('selected Work sector recommends only real matching Work scales, never generic tests', () => {
  const rows = recommendPortraitSectorTests({
    sector:'work',
    entries:[
      item('stress-only',['stress'],{durationMinutes:1}),
      item('focus',['focus'],{durationMinutes:3}),
      item('clarity',['clarity'],{durationMinutes:1}),
      item('functioning',['functioning'],{durationMinutes:2}),
      item('mood',['mood']),
    ],
    portrait:{axes:{clarity:{percent:45}}},
  })
  assert.deepEqual(rows.map(row=>row.key),['functioning','focus','clarity'])
  assert.deepEqual(rows.map(row=>row.covers),[['functioning'],['focus'],['clarity']])
  assert.deepEqual(rows[0].questionCount,8)
  assert.equal(rows[0].durationMinutes,2)
  assert.ok(rows.every(row=>row.covers.every(axis=>['clarity','focus','functioning'].includes(axis))))
})

test('recommendations exclude completed or restricted tests and unreviewed score claims', () => {
  const rows = recommendPortraitSectorTests({
    sector:'relationships',
    entries:[
      item('good',['boundaries'],{topics:['relationships']}),
      item('done',['intimacy']),
      item('paid',['relationships'],{free:false}),
      item('blocked',['boundaries'],{rightsStatus:'research_only'}),
      item('not-selected',['boundaries'],{selectable:false}),
      item('not-startable',['boundaries'],{startable:false}),
      item('needs-opt-in',['boundaries'],{explicitOptIn:true}),
      item('no-scales',[],{topics:['relationships']}),
      item('not-a-grade',['relationships'],{scaleGuide:{scales:[{axis:'relationships',portraitMode:'unreviewed'}]}}),
      item('false-work',['focus']),
    ],
    results:[{definitionKey:'done'}],
  })
  assert.deepEqual(rows.map(row=>row.key),['good'])
  assert.deepEqual(rows[0].covers,['boundaries'])
})

test('All and named portrait categories cover only the established audited axes', () => {
  const entries = [
    item('body',['energy','sleep'],{topics:['energy']}),
    item('work',['focus'],{topics:['work']}),
    item('love',['intimacy'],{topics:['intimacy']}),
    item('growth',['meaning'],{topics:['meaning']}),
  ]
  const all=recommendPortraitSectorTests({entries})
  assert.deepEqual(new Set(all.map(row=>row.key)),new Set(entries.map(row=>row.key)))
  for (const [sector,key] of [['body','body'],['work','work'],['relationships','love'],['growth','growth']]) {
    assert.deepEqual(recommendPortraitSectorTests({entries,sector}).map(row=>row.key),[key])
  }
  assert.deepEqual(recommendPortraitSectorTests({entries,sector:'unknown'}),[])
  assert.deepEqual(recommendPortraitSectorTests({entries,sector:'work',limit:0}),[])
  assert.deepEqual(recommendPortraitSectorTests({entries:[],sector:'work'}),[])
  assert.ok(PORTRAIT_AXIS_ORDER.includes('focus'))
})

test('production catalog recommendations use only cleared, audited, free questionnaires', () => {
  const entries=buildExplorerEntries({locale:'en',audience:'account'})
  const options=new Map(entries.map(entry=>[entry.key,entry]))
  for(const sector of ['all','body','work','relationships','growth']){
    const rows=recommendPortraitSectorTests({entries,sector,limit:6})
    assert.ok(rows.length>0,sector+' should suggest at least one real questionnaire')
    for(const row of rows) {
      const entry=options.get(row.key)
      assert.equal(entry.selectable,true)
      assert.equal(entry.rightsStatus,'cleared')
      assert.equal(entry.free,true)
      assert.equal(entry.startable,true)
      assert.notEqual(entry.explicitOptIn,true)
      assert.ok(entry.definition)
      assert.ok(row.covers.length>0)
      assert.ok(row.covers.every(axis=>entry.scaleGuide.scales.some(scale=>
        scale.axis===axis && ['directional','descriptive'].includes(scale.portraitMode))))
    }
  }
})
