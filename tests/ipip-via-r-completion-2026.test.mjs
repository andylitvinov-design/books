import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS as definitions, IPIP_VIA_R_COMPLETION_CATALOG as catalog, IPIP_VIA_R_COMPLETION_ROWS as steps, IPIP_VIA_R_COMPLETION_DIMENSION_ROWS as dimensions } from '../data/assessments/ipip-via-r-completion-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationPlan, interpretationRegistryCoverage, classificationDirection } from '../lib/assessments/interpretation-registry.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'

const keyed = new Set(definitions.map(d => d.key))
const source1 = 'https://ipip.ori.org/IPIP-VIA-R_Key.html'
const source2 = 'https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html'

test('17 new legal professional IPIP-VIA-R forms complete the existing 24 strengths plus three separate core composites', () => {
  assert.equal(definitions.length,17)
  assert.equal(definitions.filter(d=>d.questions.length===4).length,14)
  assert.equal(definitions.filter(d=>d.questions.length===6).length,3)
  assert.equal(definitions.flatMap(d=>d.questions).length,74)
  assert.equal(catalog.length,17)
  assert.equal(steps.length,17)
  assert.equal(dimensions.length,17)
  assert.equal(new Set(definitions.map(d=>d.id)).size,17)
  assert.equal(new Set(definitions.map(d=>d.key)).size,17)
  const existing = ASSESSMENT_DEFINITIONS.filter(d=>d.key.startsWith('ipip-via-r-'))
  assert.equal(new Set(existing.map(d=>d.key)).size,28,'24 standalone strengths, three global cores, and one complete profile')
  assert.equal(new Set(MONITORING_CATALOG.filter(x=>x.startable).map(x=>x.key)).size,150)
  assert.deepEqual(interpretationRegistryCoverage(MONITORING_CATALOG),{total:150,registered:150,uncovered:[],obsolete:[]})
})

test('published verbatim EN items, source names, key signs and immutable hashes remain consistent', () => {
  const allQuestions = definitions.flatMap(d=>d.questions)
  assert.equal(new Set(allQuestions.map(q=>q.id)).size,74)
  for (const d of definitions) {
    const core=d.key.startsWith('ipip-via-r-core-')
    assert.equal(d.scoringKey,'configured')
    assert.equal(d.scoringVersion,'v1')
    assert.equal(d.instrumentLocale,'en')
    assert.equal(d.translationVersion,'original-en-v1')
    assert.equal(d.answerScale.min,1)
    assert.equal(d.answerScale.max,5)
    assert.equal(d.responseAnchors.length,5)
    assert.equal(d.source.url,core?source2:source1)
    assert.equal(d.source.permissionUrl,'https://ipip.ori.org/newPermission.htm')
    assert.ok(d.questions.every(q=>q.text.length>12&&q.required===true))
    const spec=d.scoring.dimensions[0]
    assert.equal(d.scoring.dimensions.length,1)
    assert.equal(spec.dimensionClass,'trait')
    assert.equal(spec.direction,'non-normative')
    assert.equal(spec.method,'mean')
    assert.equal(spec.items.length,d.questions.length)
    assert.deepEqual(spec.items,d.questions.map(q=>q.id))
    assert.deepEqual(spec.reverseItems,d.questions.slice(core?3:2).map(q=>q.id))
    assert.equal(spec.min,1)
    assert.equal(spec.max,5)
    const {contentHash,...body}=d
    assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'),d.key)
    assert.equal(getAssessmentDefinition(d.key,'v1','en'),d)
    const item=catalog.find(c=>c.key===d.key)
    assert.ok(item&&item.startable&&item.free&&item.guestEligible&&!item.starterEligible)
    assert.equal(item.testStyle,'professional')
    assert.equal(item.rightsStatus,'cleared')
    assert.equal(item.questionCount,d.questions.length)
    assert.ok(interpretationPlan(d.key,'v1'))
    assert.ok(steps.some(row=>row[0]===d.key&&row[3].length>25))
    assert.ok(dimensions.some(row=>row[0]===d.key&&row[1]===spec.key))
  }
  assert.equal(definitions.find(d=>d.key==='ipip-via-r-teamwork-4').questions[0].text,'Am an extremely loyal person.')
  assert.equal(definitions.find(d=>d.key==='ipip-via-r-core-positivity-6').questions[0].text,'Remain hopeful despite challenges.')
})

test('correct reverse coding yields 1..5 means without synthetic norms or diagnoses',()=>{
  for(const d of definitions){
    const spec=d.scoring.dimensions[0]
    const balanced=Object.fromEntries(d.questions.map(q=>[q.id,3]))
    const high=Object.fromEntries(d.questions.map(q=>[q.id,spec.reverseItems.includes(q.id)?1:5]))
    const low=Object.fromEntries(d.questions.map(q=>[q.id,spec.reverseItems.includes(q.id)?5:1]))
    for(const [answers,expected] of [[balanced,3],[high,5],[low,1]]){
      const result=scoreAssessment(d,answers, syntheticTraumaContext(d))
      assert.equal(result.dimensions.length,1)
      assert.equal(result.dimensions[0].value,expected,d.key)
      assert.equal(result.dimensions[0].key,spec.key)
      assert.equal(classificationDirection(result.dimensions[0]),'neutral')
      for(const lang of ['en','ru']){
        const report=buildAssessmentResultReport(result,lang)
        assert.equal(report.sections.length,1)
        assert.equal(report.sections[0].bandBasis,'descriptive')
        assert.ok(report.sections[0].meaning.length>50)
        assert.ok(report.sections[0].steps.length>=2)
        assert.ok(report.sections[0].followUp.length>20)
        assert.ok(!report.sections[0].recommendedReview)
      }
    }
    const guideEN=getTestScaleGuide(d.key,'en')
    const guideRU=getTestScaleGuide(d.key,'ru')
    assert.equal(guideEN.instrumentLanguage,'en')
    assert.equal(guideRU.instrumentLanguage,'en')
    assert.ok(guideEN.scales[0].type==='trait'&&!guideEN.scales[0].canChooseSkill)
    assert.ok(guideRU.scales[0].label.length>3)
    assert.ok(guideRU.scales[0].action.length>25)
    assert.throws(()=>scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,6])), syntheticTraumaContext(d)))
    assert.throws(()=>scoreAssessment(d,Object.fromEntries(d.questions.slice(1).map(q=>[q.id,3])), syntheticTraumaContext(d)))
  }
})

test('all 17 visible and selectable in EN/RU guest/account explorer and correctly themed',()=>{
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale,audience})
    const ours=entries.filter(e=>keyed.has(e.key))
    assert.equal(ours.length,17,locale+' '+audience)
    assert.ok(ours.every(e=>e.selectable&&e.startable&&e.source==='product'&&e.definition&&e.testKind==='professional'))
    assert.ok(ours.every(e=>e.questionCount===e.definition.questions.length))
    assert.ok(ours.every(e=>e.title.includes('IPIP-VIA-R')))
    const legal=filterExplorerEntries(entries,{availability:'available',styles:['professional']})
    assert.ok(legal.filter(e=>keyed.has(e.key)).length===17)
    assert.ok(ours.some(e=>e.topics.includes('work')))
    assert.ok(ours.some(e=>e.topics.includes('relationships')))
    assert.ok(ours.some(e=>e.topics.includes('meaning')))
    const method=assessmentMethodology({key:'ipip-via-r-core-mastery-6',definition:definitions.find(d=>d.key==='ipip-via-r-core-mastery-6'),locale})
    assert.match(method.text,locale==='ru'?/шестипунктовая/:/six-item/)
    assert.ok(method.sourceUrl===source2)
  }
})

test('append-only Supabase migration carries every reviewed version and checks hash conflicts',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/20261014130000_hh_ipip_via_r_completion_2026.sql',import.meta.url),'utf8')
  assert.match(sql,/insert into app\.assessment_versions/)
  assert.match(sql,/Conflicting VIA-R/)
  assert.match(sql,/on conflict \(id\) do nothing/i)
  for(const d of definitions){
    assert.ok(sql.includes(d.contentHash),d.key)
    assert.ok(sql.includes(d.id),d.key)
  }
})
