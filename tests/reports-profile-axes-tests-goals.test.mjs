import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { PORTRAIT_AXIS_ORDER, PORTRAIT_SECTORS } from '../lib/assessments/portrait-sectors.js'
import { listPortraitProfileTests } from '../lib/profile/portrait-test-suggestions.js'

function entry(key, kind, axes, extras = {}) {
  return {
    key, title:key, testKind:kind, free:true, selectable:true, startable:true,
    rightsStatus:'cleared', explicitOptIn:false, definition:{ id:'def-' + key },
    durationMinutes:2, questionCount:8,
    scaleGuide:{ scales:axes.map(([axis, portraitMode]) => ({axis,portraitMode})) },
    ...extras,
  }
}

test('portrait Tests lists complete and missing questionnaires for exactly the chosen axes', () => {
  const entries = [
    entry('first', 'professional', [['stress','unreviewed']]),
    entry('second', 'monitoring', [['stress','directional'],['sleep','directional']]),
    entry('third', 'monitoring', [['focus','directional']]),
    entry('fourth', 'professional', [['boundaries','unreviewed']]),
    entry('unrelated','professional',[['mood','unreviewed']]),
  ]
  const rows = listPortraitProfileTests({
    entries, results:[{definitionKey:'first'}], sector:'body', selectedAxes:['stress','sleep','focus'],
  })
  assert.deepEqual(rows.map(item => item.key), ['second','first'])
  assert.deepEqual(rows.map(item => item.completed), [false,true])
  assert.deepEqual(rows.map(item => item.covers), [['stress','sleep'],['stress']])
  assert.deepEqual(rows.map(item => item.chartReady), [true,false])
  assert.equal(rows[1].kind, 'professional')
  assert.equal(rows[0].questionCount,8)
})

test('clearing axes returns zero tests; changing profile never invents cross-category matches', () => {
  const entries = [
    entry('body','monitoring',[['sleep','directional']]),
    entry('work','professional',[['focus','unreviewed']]),
    entry('love','monitoring',[['relationships','directional']]),
    entry('growth','monitoring',[['meaning','directional']]),
  ]
  assert.deepEqual(listPortraitProfileTests({entries,selectedAxes:[]}), [])
  assert.deepEqual(listPortraitProfileTests({entries,sector:'other',selectedAxes:['focus']}), [])
  for(const [sector,axis,key] of [
    ['body','sleep','body'],['work','focus','work'],
    ['relationships','relationships','love'],['growth','meaning','growth'],
  ]) {
    const list=listPortraitProfileTests({entries,sector,selectedAxes:[axis,'stress']})
    assert.deepEqual(list.map(item=>item.key),[key],sector)
  }
  assert.deepEqual(listPortraitProfileTests({entries,selectedAxes:['meaning','sleep']}).map(row=>row.key).sort(),['body','growth'])
})

test('only rights-cleared, free, startable, source-mapped tests expose a Take test action', () => {
  const valid=entry('valid','professional',[['focus','unreviewed']])
  const candidates=[
    valid, entry('licensed','professional',[['focus','unreviewed']],{rightsStatus:'license_required'}),
    entry('paid','professional',[['focus','directional']],{free:false}),
    entry('consent','monitoring',[['focus','directional']],{explicitOptIn:true}),
    entry('disabled','professional',[['focus','directional']],{startable:false}),
    entry('unselectable','professional',[['focus','directional']],{selectable:false}),
    entry('missing','professional',[['focus','directional']],{definition:null}),
    entry('hobby','hobby',[['focus','directional']]),
    entry('unknown','professional',[['not-an-axis','directional']]),
  ]
  assert.deepEqual(listPortraitProfileTests({entries:candidates,selectedAxes:['focus']}).map(r=>r.key),['valid'])
})

test('actual cleared catalogue contains both Pro and Check-in profile options without fictional wheel scores', () => {
  for (const locale of ['en','ru','es']) {
    const entries=buildExplorerEntries({locale,audience:'account'})
    const all=listPortraitProfileTests({entries,selectedAxes:PORTRAIT_AXIS_ORDER})
    assert.ok(all.some(row=>row.kind==='monitoring'),locale+'/check-in')
    assert.ok(all.some(row=>row.kind==='professional'),locale+'/pro')
    assert.ok(all.length >= 20)
    assert.ok(all.every(row => row.covers.length > 0 && row.covers.every(axis=>PORTRAIT_AXIS_ORDER.includes(axis))))
    assert.ok(all.some(row => !row.chartReady),locale+'/explore only')
    const keys=new Set(all.map(row=>row.key))
    assert.equal(keys.size,all.length)
    for (const sector of PORTRAIT_SECTORS) {
      const matching=listPortraitProfileTests({entries,sector:sector.key,selectedAxes:sector.axes})
      assert.ok(matching.length>0,locale+'/'+sector.key)
      assert.ok(matching.every(row => row.covers.every(axis=>sector.axes.includes(axis))))
    }
  }
})

test('Reports uses precisely three mini tabs and keeps private Goals in the existing plan', () => {
  const visual=readFileSync(new URL('../components/app/test-explorer-visual.jsx', import.meta.url),'utf8')
  const actions=readFileSync(new URL('../components/app/portrait-test-quick-actions.jsx', import.meta.url),'utf8')
  const programme=readFileSync(new URL('../components/app/development-program.jsx', import.meta.url),'utf8')
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url),'utf8')
  assert.match(visual, /\['chart', 'axes', 'tests'\]/)
  assert.match(visual, /data-portrait-sector="goal"/)
  assert.match(visual, /selectedSector === 'goal' && <GoalProfilePanel/)
  assert.match(workspace, /goalProfileProps=\{\{ accountId, entriesByKey/)
  assert.match(visual, /chartMode === 'axes'/)
  assert.match(visual, /selectedAxes: chosenForProfile/)
  assert.match(visual, /data-radar-mode=\{chartMode === 'axes' \? 'axes' : 'detail'\}/)
  assert.match(actions, /data-portrait-test-kind=\{value\}/)
  assert.match(actions, /data-completed=\{item\.completed\}/)
  assert.match(actions, /!item\.chartReady/)
  assert.match(actions, /href="#hh-development-program"/)
  assert.match(programme, /hh:open-development-goals/)
  assert.match(programme, /appFetch\('development-goals'/)
  assert.match(workspace, /<DevelopmentProgram accountId=\{accountId\}/)
  assert.equal((workspace.match(/<DevelopmentProgram accountId=\{accountId\}/g)||[]).length >= 1,true)
})
