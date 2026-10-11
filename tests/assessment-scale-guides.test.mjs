import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { FOCUS_KEYS, SCALE_FOCUS, getTestScaleGuide, scaleAxisFor, scaleOverlap } from '../lib/assessments/scale-guides.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, rankExplorerEntries } from '../lib/assessments/test-explorer.js'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const active = MONITORING_CATALOG.filter(item => item.startable && item.rightsStatus === 'cleared')
const defFor = (item,lang) => getAssessmentDefinition(item.key,item.version,item.instrumentLocale==='dynamic'?lang:item.instrumentLocale)
const answers = definition => Object.fromEntries(definition.questions.map(q => [q.id,q.min??definition.answerScale?.min]))

test('every active test has one separate bilingual source document and correct scored scale guide', () => {
  assert.ok(active.length >= 76)
  assert.equal(new Set(active.map(x=>x.key)).size,active.length)
  assert.equal(FOCUS_KEYS.length,14)
  for (const key of FOCUS_KEYS) {
    const axis=SCALE_FOCUS[key]
    assert.ok(axis.en.length>4 && axis.ru.length>4 && axis.watch.every(v=>v.length>25) && axis.skill.every(v=>v.length>12),key)
  }
  for (const item of active) {
    const path='docs/assessments/guides/'+item.key+'.md'
    assert.equal(existsSync(new URL('../'+path,import.meta.url)),true,'Missing individual guide: '+item.key)
    const document=read(path)
    assert.ok(document.includes('**Instrument ID:** `'+item.key+'`'),item.key)
    assert.match(document,/Что исследует тест|What this test explores/)
    assert.match(document,/Шкалы, наблюдение и добровольная работа/)
    assert.match(document,/Что можно попробовать/)
    assert.match(document,/What this test explores/)
    for (const language of ['en','ru']) {
      const def=defFor(item,language)
      const result=scoreAssessment(def,answers(def))
      const guide=getTestScaleGuide(item.key,language)
      assert.ok(guide,item.key+'/'+language)
      assert.equal(guide.scales.length,result.dimensions.length,item.key+'/'+language)
      assert.equal(guide.questions,def.questions.length)
      assert.equal(guide.version,def.version)
      assert.deepEqual(guide.scales.map(x=>x.key),result.dimensions.map(x=>x.key))
      assert.ok(guide.scales.every(x=>x.label&&x.watch.length>25&&x.action.length>20),item.key)
      assert.ok(guide.scales.every(x=>Number.isFinite(x.min)&&Number.isFinite(x.max)&&x.max>x.min),item.key)
      assert.ok(guide.scales.every(x=>x.bands.note.length>30),item.key)
      assert.ok(guide.scales.every(x=>x.axis===null||FOCUS_KEYS.includes(x.axis)))
      if(guide.scales.length>1) {
        for(const scale of guide.scales) assert.ok(document.includes('`'+scale.key+'`'),'Guide lacks actual multidimensional scale '+item.key+'/'+scale.key)
      }
    }
  }
  assert.ok(read('docs/assessments/guides/README.md').includes('separate bilingual guides'))
})

test('score guides preserve symptoms, resource direction, personality neutrality and Bach symbolic identity',()=>{
  const weekly=getTestScaleGuide('hh-weekly-pulse','ru')
  const tension=weekly.scales.find(s=>s.key==='weekly.tension')
  const recovery=weekly.scales.find(s=>s.key==='weekly.recovery')
  assert.equal(tension.type,'reported_difficulty')
  assert.equal(recovery.type,'reported_resource')
  assert.equal(tension.axis,'anxiety')
  assert.equal(recovery.axis,'sleep')
  const phq=getTestScaleGuide('phq-4','ru')
  assert.ok(phq.scales.some(s=>s.bands.basis==='screening'&&s.bands.rows.length>1))
  const personality=getTestScaleGuide('mini-ipip-20','ru')
  assert.equal(personality.scales.length,5)
  assert.ok(personality.scales.every(s=>s.axis==='personality' && s.canChooseSkill===false && s.bands.basis==='descriptive'))
  const ipip=getTestScaleGuide('ipip-big-five-50','en')
  assert.equal(ipip.scales.length,5)
  assert.ok(ipip.scales.every(s=>s.type==='trait'))
  const bach=getTestScaleGuide('hh-bach-flower-profile','en')
  assert.equal(bach.scales.length,38)
  assert.equal(bach.kind,'traditional')
  assert.ok(bach.scales.every(s=>s.axis===null && s.canChooseSkill===false && s.bands.basis==='descriptive'))
  assert.ok(bach.scales.every(s=>s.action.length>25))
})

test('scale matching filters by actual scored measurements, not catalog illustration heuristics',()=>{
  const available=buildExplorerEntries({locale:'en',audience:'guest'})
  const ready=available.filter(row=>row.selectable)
  assert.ok(ready.length>30)
  for(const row of ready){
    assert.ok(row.scaleGuide && row.scaleGuide.scales.length)
    assert.deepEqual(row.measurementAxes,row.scaleGuide.measurementAxes)
    assert.ok(row.measurementAxes.every(key=>FOCUS_KEYS.includes(key)))
  }
  const onlyStress=filterExplorerEntries(available,{availability:'available',axes:['stress']})
  assert.ok(onlyStress.length>2)
  assert.ok(onlyStress.every(item=>item.measurementAxes.includes('stress')))
  const accountEntries=buildExplorerEntries({locale:'en',audience:'account'})
  const onlySleep=filterExplorerEntries(accountEntries,{availability:'available',axes:['sleep']})
  assert.ok(onlySleep.some(item=>item.key==='hh-sleep-reset'),'Account-accessible original checks may not be guest eligible')
  const selected=filterExplorerEntries(available,{availability:'available',axes:['sleep'],selectedKeys:['mini-ipip-20']})
  assert.ok(selected.some(item=>item.key==='mini-ipip-20'),'A chosen test remains visible during filter changes')
  assert.equal(scaleOverlap(available.find(e=>e.key==='hh-sleep-reset'),['sleep']),1)
  assert.equal(scaleOverlap(available.find(e=>e.key==='mini-ipip-20'),['sleep']),0)
  const ranked=rankPublicTestMatches(ready,{axes:['sleep'],depth:'balanced'})
  assert.ok(ranked[0].measurementAxes.includes('sleep'))
  assert.ok(ranked[0].matchPercent>ranked.find(x=>x.key==='mini-ipip-20').matchPercent)
  const chosenFocus=rankExplorerEntries(ready,{axes:['anxiety'],focus:['relationships']})
  assert.ok(chosenFocus[0].measurementAxes.includes('anxiety'), 'Direct scale takes priority over unrelated topics')
})

test('scale-first public UI remains opt-in, bilingual and retains topic/problem controls',()=>{
  const simple=read('components/app/simple-test-picker.jsx')
  const full=read('components/app/test-explorer.jsx')
  const ui=read('components/app/test-scale-guide.jsx')
  const intent=read('lib/app/test-selection-intent.js')
  assert.ok(simple.indexOf('data-scale-first-selection')<simple.indexOf('hh-simple-topic-title'))
  assert.match(simple,/axes\.includes\(key\)/)
  assert.match(simple,/onToggleAxis\?\.\(key\)/)
  assert.match(full,/onToggleAxis=\{\(key\)/)
  assert.match(full,/data-scale-first-selection/)
  assert.match(full,/measurementAxes\?\.includes\(key\)/)
  assert.match(ui,/data-scale-guide=\{guide\.key\}/)
  assert.match(ui,/row\.bands\.rows/)
  assert.match(simple,/data-topic-problem-filter/)
  assert.match(intent,/axes: TEST_EXPLORER_AXES/)
  const css=read('components/app/simple-test-picker.module.css')
  assert.match(css,/\.scalesRail/)
})

test('unknown/restricted catalog items never gain runnable test guides',()=>{
  assert.equal(getTestScaleGuide('mmpi-3','en'),null)
  assert.equal(getTestScaleGuide('scs-sf','en'),null)
  assert.equal(getTestScaleGuide('not-a-real-instrument','en'),null)
})
