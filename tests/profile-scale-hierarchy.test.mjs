import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  buildProfileScaleGroups, defaultProfileScaleIds, selectedProfileAxes,
  recommendProfileMode, profileBatteryTotals,
} from '../lib/profile/profile-scale-selection.js'

const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

const catalogue = [
  { key:'weekly', title:'Weekly', testKind:'monitoring', axes:['mood','stress','sleep'], minutes:2, questions:8,
    scales:[
      {key:'weekly.mood',axis:'mood',label:'Emotional state',scaleQuestions:1},
      {key:'weekly.stress',axis:'stress',label:'Stress load',scaleQuestions:1},
      {key:'weekly.sleep',axis:'sleep',label:'Sleep and rest',scaleQuestions:1},
    ] },
  { key:'stress-short', title:'Current load', testKind:'monitoring', axes:['stress'], minutes:1, questions:5,
    scales:[{key:'state.load',axis:'stress',label:'Current load',scaleQuestions:1}] },
  { key:'k6', title:'K6', testKind:'professional', axes:['stress'], minutes:2, questions:6,
    scales:[{key:'symptoms.k6.total',axis:'stress',label:'K6 load',scaleQuestions:6}] },
  { key:'personality', title:'Trait profile', testKind:'professional', axes:['personality'], minutes:3, questions:20,
    scales:[{key:'trait.extra',axis:'personality',label:'Extraversion',scaleQuestions:null},
      {key:'trait.agree',axis:'personality',label:'Agreeableness',scaleQuestions:null}] },
]

test('each selected topic expands to documented source scales, with original questionnaire totals', () => {
  const groups = buildProfileScaleGroups(catalogue,['emotions','recovery','traits'],{
    emotions:['mood','stress'],recovery:['sleep'],traits:['personality'],
  })
  assert.deepEqual(groups.map(g=>g.area),['emotions','recovery','traits'])
  assert.ok(groups[0].scales.length>=3)
  assert.equal(groups[2].scales.length,2)
  const mood=groups[0].scales.find(scale=>scale.key==='weekly.mood')
  assert.deepEqual([mood.scaleQuestions,mood.questions,mood.minutes,mood.testKey],[1,8,2,'weekly'])
  assert.equal(groups[2].scales[0].scaleQuestions,null,'unknown item count stays unknown')
  assert.equal(buildProfileScaleGroups(catalogue,['body'],{body:['embodiment']})[0].scales.length,0,
    'no invented body scale when no eligible source measurement exists')
})

test('scales are preselected per topic and adjustable without creating questionnaire data', () => {
  const groups=buildProfileScaleGroups(catalogue,['emotions','traits'],{
    emotions:['mood','stress'],traits:['personality'],
  })
  const selected=defaultProfileScaleIds(groups,3)
  assert.ok(groups.every(g=>g.scales.filter(scale=>selected.includes(scale.id)).length>=2))
  assert.ok(selected.length<=6)
  assert.deepEqual(defaultProfileScaleIds(groups,0),[])
  assert.deepEqual(selectedProfileAxes(groups,selected).sort(),['mood','personality','stress'])
  assert.deepEqual(selectedProfileAxes(groups,[]),[])
})

test('questionnaires and Pro only propose matching registered test kinds, totals count shared tests once', () => {
  const quick=recommendProfileMode(catalogue,['stress','mood','sleep'],'questionnaires')
  const pro=recommendProfileMode(catalogue,['stress','personality'],'pro')
  assert.ok(quick.length)
  assert.ok(pro.length)
  assert.ok(quick.every(key=>catalogue.find(e=>e.key===key)?.testKind==='monitoring'))
  assert.ok(pro.every(key=>catalogue.find(e=>e.key===key)?.testKind==='professional'))
  assert.deepEqual(recommendProfileMode(catalogue,['sleep'],'pro'),[])
  assert.deepEqual(profileBatteryTotals(catalogue,['weekly','weekly']),{count:1,questions:8,minutes:2})
  assert.equal(profileBatteryTotals(catalogue,[]).minutes,0)
})

test('five localized screens separate research scales, topics, tests and Ready', () => {
  const ui=source('components/personality-profiles-builder.tsx')
  const css=source('components/personality-profiles-builder.module.css')
  const page=source('app/[locale]/personality-profiles/page.tsx')
  for(const stages of [
    '["Focus", "Scales", "Topics", "Tests", "Ready"]',
    '["Запрос", "Шкалы", "Темы", "Тесты", "Начало"]',
    '["Interés", "Escalas", "Temas", "Pruebas", "Inicio"]',
  ]) assert.ok(ui.includes(stages))
  const scaleStep=ui.slice(ui.indexOf('{step === 1 && <section'),ui.indexOf('{step === 2 && <section'))
  const topicStep=ui.slice(ui.indexOf('{step === 2 && <section'),ui.indexOf('{step === 3 && <section'))
  const testStep=ui.slice(ui.indexOf('{step === 3 && <section'),ui.indexOf('{step === 4 && <section'))
  assert.ok(scaleStep.includes('data-profile-research-scale-options'))
  assert.ok(scaleStep.includes('data-profile-research-choice={axis.id}'))
  assert.ok(scaleStep.includes('selectedResearchIds.includes(axis.id)'))
  assert.ok(topicStep.includes('data-profile-scales-by-topic'))
  assert.ok(topicStep.includes('data-profile-scale-topic={group.area}'))
  assert.ok(topicStep.includes('data-profile-topic-choice={scale.id}'))
  assert.ok(topicStep.includes('selectedScaleIds.includes(scale.id)'))
  assert.ok(!topicStep.includes('scale.testTitle'))
  assert.ok(!topicStep.includes('scale.scaleQuestions'))
  assert.ok(!topicStep.includes('scale.minutes'))
  assert.ok(testStep.includes('data-profile-test-mode'))
  assert.ok(testStep.includes('data-profile-mode={mode}'))
  assert.ok(testStep.includes('data-profile-additional-kind-filter'))
  assert.ok(testStep.includes('\["all", "questionnaires", "pro"\]'))
  assert.ok(testStep.indexOf('data-profile-recommended-tests')<testStep.indexOf('data-profile-test-mode'))
  assert.ok(testStep.indexOf('data-profile-start-tests')<testStep.indexOf('data-profile-additional-tests'))
  assert.ok(page.includes('entry.selectable === true'))
  assert.ok(page.includes('entry.guestEligible === true'))
  assert.ok(page.includes('entry.rightsStatus === "cleared"'))
  assert.ok(page.includes('scales: (entry.scaleGuide?.scales || [])'))
  assert.ok(page.includes('spec.items.every((id: string) => itemIds.has(id))'))
  assert.match(css,/grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  assert.match(css,/\.topicAccordion\[open\]/)
  assert.match(css,/\.batteryModeChoices button\[aria-pressed=true\]/)
  assert.ok(ui.includes('data-profile-google-signin'))
  assert.ok(ui.includes('makeTestSelectionIntent(selectedKeys)'))
  assert.ok(!ui.includes('localStorage'))
})

test('additional tests remain strictly scoped and removable in the chosen mode', () => {
  const ui=source('components/personality-profiles-builder.tsx')
  assert.match(ui,/selectedKeys\.flatMap\(key => tests\.filter\(test => test\.key === key/)
  assert.ok(ui.includes('if (!eligibleTestKeys.has(key)) return;'))
  assert.ok(ui.includes('remainingTestKeys.has(test.key) &&'))
  assert.match(ui,/previous\.length < 12/)
})
