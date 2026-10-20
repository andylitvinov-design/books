import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('the Values/Dynamics tablist lives in Results, not My Tests', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const battery = read('components/app/account-test-battery.jsx')
  const css = read('app/[locale]/app/[[...path]]/assessment-dashboard.css')
  assert.match(workspace, /data-results-view-tabs/)
  assert.match(workspace, /id=\{'hh-results-tab-' \+ key\}/)
  assert.match(workspace, /\['values', ru \? 'Значения' : 'Values'\]/)
  assert.match(workspace, /\['dynamics', ru \? 'Динамика' : 'Dynamics'\]/)
  assert.match(workspace, /hh-results-panel-values/)
  assert.match(workspace, /hh-results-panel-dynamics/)
  assert.match(workspace, /<TestDynamics results=\{data\.results \|\| \[\]\}/)
  assert.match(workspace, /app\/portfolio\?tab=dynamics/)
  assert.match(css, /hh-insights-view-tabs/)
  assert.doesNotMatch(battery, /data-my-tests-tabs|<TestDynamics|activeTab === 'dynamics'/)
  assert.match(battery, /legacyDynamics/)
  assert.match(battery, /app\/portfolio\?tab=dynamics/)
  assert.match(battery, /<MyTestsDashboard/)
})

test('Dynamics shows a question mark until a retake and has range-aware gauges', () => {
  const view = read('components/app/test-dynamics.jsx')
  const model = read('lib/assessments/test-dynamics.js')
  const css = read('components/app/test-dynamics.module.css')
  assert.match(model, /const firstValue = track\.length \? track\[0\]\.value : null/)
  assert.match(model, /const lastValue = track\.length > 1 \? track\.at\(-1\)\.value : null/)
  assert.match(model, /verified\.get\(latest\) && verified\.get\(candidate\)/)
  assert.match(model, /new Map\(history\.map\(result => \[result, verifiedHistoryResult\(result\)\]\)\)/)
  assert.match(model, /candidate === latest \|\| gaugeChange/)
  assert.doesNotMatch(model, /verified\.get\([^)]*\.id\)|candidate\.id === latest\.id/)
  assert.match(model, /gaugeChange\(latest, candidate, dimension\.key\)\.state !== 'baseline'/)
  assert.match(view, /hasRepeat=\{item\.track\.length > 1\}/)
  assert.doesNotMatch(view, /hasRepeat=\{group\.count > 1\}/)
  assert.match(model, /gaugeDimension: dimension/)
  assert.match(view, /hasRepeat \? number\(item\.lastValue\) : '\?'/)
  assert.match(view, /<ScoreGauge dimension=\{item\.gaugeDimension\} locale=\{locale\} compact/)
  assert.match(view, /aria-label=\{!hasRepeat \? c\.awaiting : undefined\}/)
  assert.match(view, /labelFor\(item\.key, locale\)/)
  assert.match(css, /\.scaleDial/)
  assert.match(css, /@media\(max-width:480px\)/)
})

test('a retake still opens the saved run or a real new run', () => {
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(workspace, /const draft = \(data\.runs \|\| \[\]\)\.find/)
  assert.match(workspace, /const run = draft \|\| await appFetch\('runs'/)
  assert.match(workspace, /router\.push\('\/' \+ locale \+ '\/app\/runs\/'/)
  assert.match(workspace, /retakeDefinitions\.has\(id\)/)
})

test('Results retake binds the owner and rejects stale owner, view and lifetime continuations', async () => {
  const source = read('components/app/app-workspace.jsx')
  const body = source.slice(source.indexOf('  async function retakeTest('), source.indexOf('  const allGroups', source.indexOf('  async function retakeTest(')))
  for (const outcome of ['resolve','reject']) for (const change of ['none','owner','view','unmount','remount']) {
    const scope={accountId:'owner-a',tab:'dynamics',locale:'en'}
    const retakeScope={current:scope},retakeOperation={current:null},retakeLifetime={current:{mounted:true,epoch:0}}
    const calls=[],navigation=[],errors=[];let release,reject
    const response=new Promise((resolve,fail)=>{release=resolve;reject=fail})
    const build=new Function('retakeDefinitions','renderedRetakeScope','retakeScope','retakeOperation','retakeLifetime','accountId','setRetakeBusy','setRetakeError','data','appFetch','crypto','router','locale','ru',body+';return retakeTest')
    const run=build(new Map([['test-id',{key:'test-key',version:'1',instrumentLocale:'en'}]]),scope,retakeScope,retakeOperation,retakeLifetime,'owner-a',()=>{},x=>errors.push(x),{runs:[]},async(...args)=>{calls.push(args);return response},{randomUUID:()=> 'op'}, {push:x=>navigation.push(x)},'en',false)
    const pending=run('test-id');await run('test-id')
    assert.equal(calls.length,1,'duplicate click cannot create another run')
    assert.equal(calls[0][2],'POST');assert.equal(calls[0][3].accountId,'owner-a')
    if(change==='owner')retakeScope.current={...scope,accountId:'owner-b'}
    if(change==='view')retakeScope.current={...scope,tab:'values'}
    if(change==='unmount')retakeLifetime.current.mounted=false
    if(change==='remount')retakeLifetime.current.epoch++
    if(outcome==='resolve')release({id:'new-run'});else reject(Object.assign(new Error('synthetic failure'),{code:'TEST_ERROR'}))
    await pending
    assert.equal(navigation.length,change==='none'&&outcome==='resolve'?1:0)
    assert.equal(errors.length,change==='none'&&outcome==='reject'?2:1)
    if(errors.length===2)assert.match(errors[1],/TEST_ERROR/)
  }
  assert.match(source,/if \(next === activeTab\) return/)
  assert.match(source,/retakeLifetime\.current\.epoch \+= 1/)
  assert.match(source,/retakeScope\.current = null; retakeOperation\.current = null/)
})
