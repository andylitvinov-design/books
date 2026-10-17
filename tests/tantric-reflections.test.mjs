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
 assert.equal(coverage.total, 145)
 assert.equal(coverage.registered, 145)
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
