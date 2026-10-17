import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { FOCUS_KEYS, SCALE_FOCUS, getTestScaleGuide, scaleAxisFor, scaleOverlap } from '../lib/assessments/scale-guides.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, rankExplorerEntries } from '../lib/assessments/test-explorer.js'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const active = MONITORING_CATALOG.filter(item => item.startable && item.rightsStatus === 'cleared')
const defFor = (item,lang) => getAssessmentDefinition(item.key,item.version,item.instrumentLocale==='dynamic'?lang:item.instrumentLocale)
const answers = definition => Object.fromEntries(definition.questions.map(q => [q.id,q.min??definition.answerScale?.min]))

test('every active test has one separate bilingual source document and correct scored scale guide', () => {
  assert.ok(active.length >= 76)
  assert.equal(new Set(active.map(x=>x.key)).size,active.length)
  assert.equal(FOCUS_KEYS.length,18)
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
      const result=scoreAssessment(def,answers(def), syntheticTraumaContext(def))
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

test('simple picker uses topic cards as measured-scale intent, without a duplicate scale rail',()=>{
  const simple=read('components/app/simple-test-picker.jsx')
  const full=read('components/app/test-explorer.jsx')
  const ui=read('components/app/test-scale-guide.jsx')
  const intent=read('lib/app/test-selection-intent.js')
  const css=read('components/app/simple-test-picker.module.css')
  assert.doesNotMatch(simple,/data-scale-first-selection|scalesSection|onToggleAxis/)
  assert.doesNotMatch(css,/\.scalesSection|\.scalesRail/)
  assert.match(simple,/hh-simple-topic-title/)
  assert.match(simple,/onToggleFocus\(key\)/)
  assert.match(simple,/data-topic-problem-filter/)
  assert.match(simple,/TestScaleGuide guide=\{entry\.scaleGuide\} locale=\{locale\}/)
  assert.match(full,/preserveScaleFilters = false/)
  assert.match(full,/simpleMode && !preserveScaleFilters \? \[\] : \(initialPreferences\?\.axes \?\? \[\]\)/)
  assert.match(full,/if \(!preserveScaleFilters\) setAxes\(\[\]\); setBrowseFull\(false\)/)
  // The full database keeps its explicit measured-scale refinement controls.
  assert.match(full,/data-scale-first-selection/)
  assert.match(full,/measurementAxes\?\.includes\(key\)/)
  assert.match(ui,/data-scale-guide=\{guide\.key\}/)
  assert.match(ui,/row\.bands\.rows/)
  assert.match(intent,/axes: TEST_EXPLORER_AXES/)
  const ready=buildExplorerEntries({locale:'en',audience:'guest'}).filter(entry=>entry.selectable)
  for(const [topic,scale] of [['stress','stress'],['anxiety','anxiety'],['mood','mood'],['sleep','sleep'],['body','energy'],['relationships','relationships']]) {
    const ranked=rankPublicTestMatches(ready,{focus:[topic],axes:[],depth:'balanced'})
    assert.ok(ranked.slice(0,5).some(entry=>entry.measurementAxes.includes(scale)),
      'Topic '+topic+' must prioritize tests that actually score '+scale)
  }
})

test('unknown/restricted catalog items never gain runnable test guides',()=>{
  assert.equal(getTestScaleGuide('mmpi-3','en'),null)
  assert.equal(getTestScaleGuide('functioning-review','en'),null)
  assert.equal(getTestScaleGuide('not-a-real-instrument','en'),null)
})


test('every runnable test reports the scored numerical range for every actual scale in both languages', () => {
  let checked = 0
  for (const item of active) {
    for (const locale of ['en', 'ru']) {
      const definition = defFor(item, locale)
      const scored = scoreAssessment(definition, answers(definition), syntheticTraumaContext(definition))
      const guide = getTestScaleGuide(item.key, locale)
      const report = buildAssessmentResultReport(scored, locale)
      assert.ok(guide?.scales?.length, item.key + '/' + locale)
      assert.equal(report.sections.length, scored.dimensions.length, item.key + '/' + locale)
      assert.equal(guide.scales.length, scored.dimensions.length, item.key + '/' + locale)
      for (const [index, dimension] of scored.dimensions.entries()) {
        const scale = guide.scales[index]
        const section = report.sections[index]
        assert.equal(section.key, dimension.key, item.key + '/' + locale)
        assert.equal(scale.key, dimension.key, item.key + '/' + locale)
        assert.equal(scale.min, dimension.min, item.key + '/' + dimension.key)
        assert.equal(scale.max, dimension.max, item.key + '/' + dimension.key)
        assert.ok(Number.isFinite(dimension.min) && Number.isFinite(dimension.max) && dimension.max > dimension.min)
        assert.ok(section.meaning?.length > 35, item.key + '/' + dimension.key)
        checked++
      }
    }
  }
  assert.ok(checked > active.length * 2, 'Audit covers multidimensional scales, not only test counts')
})

test('weekly connection 5/10 has bilingual score-linked analysis and real questionnaire endpoints', () => {
  for (const locale of ['en', 'ru']) {
    const definition = getAssessmentDefinition('hh-weekly-pulse', 'v1', locale)
    const answerSet = answers(definition)
    answerSet['weekly.connection'] = 5
    const scored = scoreAssessment(definition, answerSet)
    const report = buildAssessmentResultReport(scored, locale)
    const section = report.sections.find(item => item.key === 'weekly.connection')
    assert.ok(section)
    assert.equal(section.value, 5)
    assert.equal(section.min, 0)
    assert.equal(section.max, 10)
    assert.deepEqual(section.responseAnchors, locale === 'ru'
      ? {low: 'Совсем не чувствовал(а)', high: 'Очень сильно'}
      : {low: 'Not at all', high: 'Very much'})
    assert.match(section.summary, locale === 'ru' ? /посередине шкалы ответов/ : /halfway along the response scale/)
    assert.ok(!/no verified categorical cutoffs/i.test(section.summary), locale)
    const low = buildAssessmentResultReport(scoreAssessment(definition, answers(definition)), locale)
      .sections.find(item => item.key === 'weekly.connection')
    const highAnswers = {...answerSet, 'weekly.connection': 10}
    const high = buildAssessmentResultReport(scoreAssessment(definition, highAnswers), locale)
      .sections.find(item => item.key === 'weekly.connection')
    assert.notEqual(section.summary, low.summary, 'Midpoint must not reuse low-range text')
    assert.notEqual(section.summary, high.summary, 'Midpoint must not reuse high-range text')
    assert.equal(section.bandBasis, 'descriptive', 'Original scales are not clinical categories')
    assert.ok(section.steps.some(step => locale === 'ru' ? /контакт|поддержк/i.test(step) : /connection|support/i.test(step)))
    assert.equal(buildAssessmentResultReport({...scored, contentHash:'tampered'}, locale)
      .sections.find(item => item.key === 'weekly.connection').responseAnchors, null,
      'An unverified result must never gain verified response anchors')
  }
})

test('compact result UI prioritizes useful analysis and keeps methodological caveats collapsed', () => {
  const component = read('components/app/compact-assessment-report.jsx')
  assert.match(component, /data-questionnaire-anchors/)
  assert.match(component, /data-scale-meaning/)
  assert.match(component, /styles\.quietGauge/)
  assert.match(component, /showCaveatsInline/)
  assert.match(read('components/app/compact-assessment-report.module.css'), /\.quietGauge figure > small/)
  assert.match(component, /!showCaveatsInline && section\.limitations\?\.map/)
  assert.doesNotMatch(component, /\{!anchor && section\.limitations\?\.map/)
})
