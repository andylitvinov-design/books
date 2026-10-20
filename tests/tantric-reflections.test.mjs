import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { TANTRIC_REFLECTION_KEYS, TANTRIC_REFLECTION_DEFINITIONS, TANTRIC_REFLECTION_CATALOG, TANTRIC_DIMENSION_AXES } from '../data/assessments/tantric-reflections-v1.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationRegistryCoverage, interpretationDimensionPlan, interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

const expected = new Map([
 ['hh-tantric-energy-sensitivity', [12, 3]],
 ['hh-tantric-intimacy-connection', [12, 3]],
 ['hh-sexual-freedom-inhibition', [12, 3]],
 ['hh-chakra-kundalini-profile', [21, 7]],
 ['hh-tantra-development-levels', [20, 5]],
 ['hh-tantric-personality-portrait', [64, 8]],
])

test('six original EN/RU tantra questionnaires include the full 64-question portrait', () => {
 assert.equal(TANTRIC_REFLECTION_KEYS.length, 6)
 assert.equal(TANTRIC_REFLECTION_DEFINITIONS.length, 12)
 assert.equal(new Set(TANTRIC_REFLECTION_DEFINITIONS.map(d => d.id)).size, 12)
 assert.deepEqual(new Set(TANTRIC_REFLECTION_KEYS), new Set(expected.keys()))
 assert.equal([...expected.values()].reduce((sum, [count]) => sum + count, 0), 141)
 for(const [key, [count, dimensions]] of expected) {
   const catalog = TANTRIC_REFLECTION_CATALOG.find(c => c.key === key)
   assert.ok(catalog?.startable && catalog.rightsStatus === 'cleared' && catalog.starterEligible === false)
   assert.equal(catalog.questionCount, count)
   for(const lang of ['en','ru']) {
     const definition = getAssessmentDefinition(key, 'v1', lang)
     assert.equal(definition.questions.length, count)
     assert.equal(definition.scoring.dimensions.length, dimensions)
     assert.equal(definition.source.status, 'original-non-diagnostic-tantric-reflection')
     assert.equal(definition.contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(
       Object.fromEntries(Object.entries(definition).filter(([k]) => k !== 'contentHash'))
     )).digest('hex'))
     assert.ok(definition.questions.every(q => q.text.length >= 20))
     assert.equal(new Set(definition.questions.map(q => q.id)).size, count)
     assert.equal(Object.keys(validateAnswers(definition, Object.fromEntries(definition.questions.map(q => [q.id, 0])))).length, count)
     for(const response of [0,2,4]) {
       const answers = Object.fromEntries(definition.questions.map(q => [q.id, response]))
       const result = scoreAssessment(definition, answers)
       assert.equal(result.dimensions.length, dimensions)
       assert.ok(result.dimensions.every(d => d.value === response && d.min === 0 && d.max === 4))
       for(const reportLanguage of ['en','ru']) {
         const report = buildAssessmentResultReport(result, reportLanguage)
         assert.equal(report.sections.length, dimensions)
         assert.ok(report.contextNote.includes(reportLanguage === 'ru' ? 'Экспериментальные' : 'Original experimental'))
         for(const section of report.sections) {
           assert.equal(section.bandBasis, 'descriptive')
           assert.ok(section.construct.length > 4)
           assert.ok(section.meaning.length > 45)
           assert.ok(section.steps.length >= 2)
           assert.equal(interpretationDimensionPlan(result, section.key)?.explicit, true)
           const band = interpretationBandModel(result, result.dimensions.find(d => d.key === section.key), reportLanguage)
           assert.equal(band.continuous, true)
           assert.deepEqual(band.bands, [])
         }
       }
     }
   }
 }
 const coverage = interpretationRegistryCoverage(MONITORING_CATALOG)
 assert.equal(coverage.total, 150)
 assert.equal(coverage.registered, 150)
 assert.deepEqual(coverage.uncovered, [])
 assert.deepEqual(coverage.obsolete, [])
})

test('all dimensions have bilingual labels, optional steps, axes and stable versioned SQL definitions', async () => {
 for(const def of TANTRIC_REFLECTION_DEFINITIONS) {
   const guide = getTestScaleGuide(def.key, def.instrumentLocale)
   assert.equal(guide.scales.length, def.scoring.dimensions.length)
   for(const scale of guide.scales) {
     assert.ok(scale.label?.length > 3)
     assert.ok(scale.action?.length > 15)
     assert.equal(scale.axis, TANTRIC_DIMENSION_AXES[scale.key])
   }
 }
 const sql = await readFile('supabase/migrations/20261017145500_hh_tantric_assessment_suite.sql', 'utf8')
 const match = sql.match(/jsonb_array_elements\((\$[^$]+\$)/)
 assert.ok(match)
 const serialized = sql.split(match[1])[1].split(match[1])[0].trim()
 assert.deepEqual(JSON.parse(serialized), TANTRIC_REFLECTION_DEFINITIONS)
 assert.match(sql, /on conflict \(id\) do nothing/)
 assert.doesNotMatch(sql, /drop table|alter role|grant\s|disable row level security/i)
})

test('all six are discoverable to guests; the 6-item Tantric Presence express test remains unchanged', () => {
 for(const lang of ['en','ru']) {
   const entries = buildExplorerEntries({locale:lang, audience:'guest'})
   for(const key of TANTRIC_REFLECTION_KEYS) {
     const found=entries.find(e => e.key === key)
     assert.equal(found?.selectable, true, key)
     assert.ok(found.searchText.includes('tantra') || found.searchText.includes('тантр'))
     assert.ok(found.measurementAxes.length > 0)
   }
   assert.ok(filterExplorerEntries(entries,{focus:['tantra']}).some(e => e.key === 'hh-tantric-personality-portrait'))
   const express = entries.find(e => e.key === 'hh-tantra-presence')
   assert.equal(express.questionCount, 6)
   assert.equal(express.selectable, true)
 }
})

test('six external research questionnaires are reference-only and rights-gated', () => {
 const refs=[
 'tantric-sex-scale-25','sexual-mindfulness-measure-7','maia-2-37',
 'scale-body-connection-20','ecr-r-36','new-sexual-satisfaction-scale-20'
 ]
 for(const key of refs) {
   const research=MIND_BODY_MONITOR_REGISTRY.find(item=>item.key===key)
   assert.ok(research,key)
   assert.equal(research.enabled,false)
   assert.ok(['permission_required','rights_review'].includes(research.rightsStatus))
   assert.ok(research.sourceUrl.startsWith('https://'))
   assert.ok(research.rightsNote.length>40)
   assert.equal(MONITORING_CATALOG.some(row=>row.key===key),false)
   for(const locale of ['en','ru']) {
     const candidate=buildExplorerEntries({locale,audience:'guest'}).find(entry=>entry.key===key)
     assert.ok(candidate && !candidate.selectable && candidate.source==='research')
   }
 }
})


test('tantric library exposes nine explicit EN/RU paths without protected or automatic tests', async () => {
  const { TANTRA_TEST_PATHS, availableTantraTestPaths } = await import('../lib/assessments/test-collections.js')
  assert.equal(TANTRA_TEST_PATHS.length, 9)
  assert.equal(new Set(TANTRA_TEST_PATHS.map(path => path.id)).size, 9)
  for (const locale of ['en','ru']) {
    const entries = buildExplorerEntries({locale, audience:'guest'})
    const routes = availableTantraTestPaths(entries)
    assert.equal(routes.length, 9, locale)
    for (const route of routes) {
      assert.equal(route.testCount, route.keys.length, route.id)
      assert.ok(route.questionCount >= 6 && route.scaleCount >= 2, route.id)
      assert.ok(route.durationMinutes > 0 && route.durationMinutes <= 20, route.id)
      assert.ok(route.keys.every(key => entries.find(e=>e.key===key)?.selectable), route.id)
      assert.ok(route.title[locale] && route.detail[locale], route.id)
      assert.ok(route.keys.every(key => !/tantric-sex-scale|maia-2|sexual-mindfulness/.test(key)))
    }
    assert.equal(routes.find(route=>route.id==='gentle-start')?.questionCount, 6)
    assert.equal(routes.find(route=>route.id==='deep-portrait')?.questionCount, 64)
    // Fail closed: removing eligibility from one member hides the whole route.
    const altered = entries.map(entry => entry.key==='hh-sensual-joy'
      ? {...entry, selectable:false} : entry)
    assert.ok(!availableTantraTestPaths(altered).some(route=>route.id==='body-sensitivity'))
  }
})

test('every authored tantric scale has five scored response levels with distinct context and no invented norms', () => {
  for (const key of [...TANTRIC_REFLECTION_KEYS, 'hh-tantra-presence', 'hh-sensual-joy']) {
    for (const language of ['en','ru']) {
      const definition = getAssessmentDefinition(key,'v1',language)
      for (const response of [0,1,2,3,4]) {
        const result = scoreAssessment(definition,
          Object.fromEntries(definition.questions.map(item => [item.id,response])))
        const report = buildAssessmentResultReport(result,language)
        assert.equal(report.sections.length,result.dimensions.length,key)
        for (const dimension of result.dimensions) {
          const scale = interpretationBandModel(result,dimension,language)
          assert.equal(scale.verified,true,key+'/'+language)
          assert.equal(scale.basis,'descriptive')
          assert.equal(scale.continuous,true)
          assert.deepEqual(scale.bands,[], 'descriptive levels are NOT clinical cutoffs')
          assert.equal(scale.currentBand,null)
          assert.equal(scale.answerBands.length,5)
          assert.equal(new Set(scale.answerBands.map(item=>item.levelLabel)).size,5)
          assert.deepEqual(scale.answerBands.map(item=>item.displayRange),
            ['0–<0.5','0.5–<1.5','1.5–<2.5','2.5–<3.5','3.5–4'])
          assert.equal(scale.currentAnswerBand?.code,'answer-'+response)
          assert.equal(scale.currentAnswerBand?.label,definition.responseAnchors[response])
          const plan = interpretationDimensionPlan(result,dimension.key)
          assert.ok(plan?.explicit,key+'/'+dimension.key)
          const label = plan.label[language]
          assert.ok(label.length>4)
          for (const item of scale.answerBands) {
            assert.ok(item.note.includes(label),key+'/'+dimension.key+'/'+item.code)
            assert.ok(item.note.length>65,key+'/'+item.code)
            assert.equal(item.optionalPractice,plan.step[language])
          }
          assert.equal(report.sections.find(section=>section.key===dimension.key)?.bandBasis,'descriptive')
        }
      }
    }
  }
})

test('tampered tantric versions never receive explanatory answer levels', () => {
  const definition=getAssessmentDefinition('hh-tantric-personality-portrait','v1','en')
  const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,2])))
  const wrong={...result,contentHash:'sha256:not-the-original-translation'}
  for(const d of result.dimensions) {
    const model=interpretationBandModel(wrong,d,'en')
    assert.equal(model.basis,'unavailable')
    assert.deepEqual(model.answerBands,[])
    assert.equal(model.currentAnswerBand,null)
  }
})

test('responsive five-position explanations and unified collection test journeys use the real UI', async () => {
  const read=(file)=>import('node:fs').then(({readFileSync})=>
    readFileSync(new URL('../'+file,import.meta.url),'utf8'))
  const [picker,explorer,report,reportCss,pathCss]=await Promise.all([
    read('components/app/simple-test-picker.jsx'),
    read('components/app/test-explorer.jsx'),
    read('components/app/compact-assessment-report.jsx'),
    read('components/app/compact-assessment-report.module.css'),
    read('components/app/simple-test-picker.module.css'),
  ])
  assert.match(picker,/data-test-topic-collections/)
  assert.match(picker,/data-test-collection-marker/)
  assert.match(picker,/className=\{styles\.takeTest\}/)
  assert.match(explorer,/setActiveCollectionId\(id\)/)
  assert.match(explorer,/collectionId: activeCollectionId/)
  assert.match(report,/data-answer-level=\{index \+ 1\}/)
  assert.match(report,/band\.levelLabel/)
  assert.match(report,/band\.note/)
  assert.match(reportCss,/\.answerRanges \.rangeList\{display:grid;grid-template-columns:repeat\(2/)
  assert.match(reportCss,/@media\(max-width:680px\)/)
  assert.match(pathCss,/\.collectionMarker/)
  assert.doesNotMatch(picker,/data-tantra-test-paths/)
})
