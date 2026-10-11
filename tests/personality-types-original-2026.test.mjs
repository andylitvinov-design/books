import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY, RIGHTS_STATUS } from '../data/assessments/mind-body-monitor-registry.js'
import { PERSONALITY_TYPE_DEFINITIONS, PERSONALITY_TYPE_CATALOG } from '../data/assessments/personality-types-original-2026.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { getAssessmentDefinition, getDefinitionById } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { personalityTypeHypothesis, SOCIONICS_TYPE_CODES } from '../lib/assessments/personality-type-interpretation.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { createProfileSnapshot } from '../lib/profile/history.js'
import { MINI_IPIP_20_EN_V1 } from '../data/assessments/mini-ipip-20-en-v1.js'
import { IPIP_BIG_FIVE_50_EN_V1 } from '../data/assessments/ipip-big-five-50-en-v1.js'

const CASES = [
  ['hh-socionics-32','socionics',32,8],
  ['hh-enneagram-36','enneagram',36,9],
  ['hh-disc-style-20','disc',20,4],
  ['hh-temperaments-16','temperament',16,4],
]
const minAnswers = def => Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale?.min]))
const maxAnswers = def => Object.fromEntries(def.questions.map(q=>[q.id,q.max??def.answerScale?.max]))
const orientedAnswers = (def, highs) => Object.fromEntries(def.questions.map(q=>{
  const dim = def.scoring.dimensions.find(s=>s.items.includes(q.id))
  return [q.id,highs.has(dim.key.split('.').at(-1))?5:1]
}))

test('four original EN/RU questionnaires are unique, content-hashed and genuinely complete',()=>{
  assert.equal(PERSONALITY_TYPE_DEFINITIONS.length,8)
  assert.equal(PERSONALITY_TYPE_CATALOG.length,4)
  assert.equal(new Set(PERSONALITY_TYPE_DEFINITIONS.map(d=>d.id)).size,8)
  assert.equal(MONITORING_CATALOG.filter(item=>item.startable).length,79)
  for(const [key,,questionCount,scaleCount] of CASES){
    const item=MONITORING_CATALOG.find(c=>c.key===key)
    assert.ok(item?.startable && item.rightsStatus==='cleared' && item.guestEligible)
    assert.equal(item.testStyle,'engaging')
    assert.equal(item.starterEligible,false)
    assert.equal(item.questionCount,questionCount)
    const english=getAssessmentDefinition(key,'v1','en')
    const russian=getAssessmentDefinition(key,'v1','ru')
    assert.equal(english.questions.length,questionCount)
    assert.equal(russian.questions.length,questionCount)
    assert.equal(english.scoring.dimensions.length,scaleCount)
    assert.equal(russian.scoring.dimensions.length,scaleCount)
    assert.deepEqual(english.questions.map(x=>x.id),russian.questions.map(x=>x.id))
    assert.notDeepEqual(english.questions.map(x=>x.text),russian.questions.map(x=>x.text))
    for(const def of [english,russian]){
      assert.equal(def.source.permission,'original-holistic-house')
      assert.match(def.source.interpretation,/not an official, validated, or clinical diagnostic/)
      const {contentHash,...body}=def
      assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
      assert.equal(getDefinitionById(def.id),def)
      assert.equal(new Set(def.questions.map(q=>q.id)).size,questionCount)
      assert.ok(def.questions.every(q=>q.text.length>=15 && q.required))
      assert.equal(new Set(def.scoring.dimensions.map(d=>d.key)).size,scaleCount)
      assert.equal(new Set(def.scoring.dimensions.flatMap(d=>d.items)).size,questionCount)
      assert.ok(def.scoring.dimensions.every(d=>d.dimensionClass==='trait' && d.direction==='non-normative'))
      for(const value of [minAnswers(def),maxAnswers(def)]){
        const scored=scoreAssessment(def,value)
        assert.deepEqual(scored.dimensions.map(d=>d.value),def.scoring.dimensions.map(d=>value===null?0:(value[def.questions[0].id]===1?d.min:d.max)))
      }
    }
  }
})

test('socionics: all 16 codes are reachable without converting to MBTI, ties abstain',()=>{
  assert.equal(SOCIONICS_TYPE_CODES.length,16)
  assert.equal(new Set(SOCIONICS_TYPE_CODES).size,16)
  const d=getAssessmentDefinition('hh-socionics-32','v1','en')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['e','n','l','p']))),'en').code,'ILE')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['e','n','l','j']))),'en').code,'LIE')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['i','s','f','p']))),'en').code,'SEI')
  const tied=personalityTypeHypothesis(scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,3]))),'ru')
  assert.equal(tied.code,null)
  assert.match(tied.headline,/не определяется/)
  assert.match(tied.warning,/MBTI/)
})

test('enneagram, behavioral and temperament results select only an unambiguous highest-ranked style',()=>{
  for(const [key,high,wanted] of [
    ['hh-enneagram-36','five','five'],
    ['hh-disc-style-20','c','c'],
    ['hh-temperaments-16','melancholic','melancholic'],
  ]){
    const d=getAssessmentDefinition(key,'v1','ru')
    const result=scoreAssessment(d,orientedAnswers(d,new Set([high])))
    const analysis=personalityTypeHypothesis(result,'ru')
    assert.equal(analysis.code,wanted)
    assert.ok(analysis.headline.length>20)
    assert.ok(analysis.description.length>70)
    const tie=personalityTypeHypothesis(scoreAssessment(d,minAnswers(d)),'en')
    assert.equal(tie.code,null)
    assert.ok(tie.alternatives.length>0)
  }
})

test('personal result reports carry bilingual type hypotheses and distinct, safe concrete next steps',()=>{
  for(const [key] of CASES){
    for(const locale of ['ru','en']){
      const def=getAssessmentDefinition(key,'v1',locale)
      const report=buildAssessmentResultReport(scoreAssessment(def,minAnswers(def)),locale)
      assert.equal(report.sections.length,def.scoring.dimensions.length)
      assert.ok(report.personalityType?.headline)
      assert.ok(report.personalityType.warning.length>50)
      assert.equal(report.seekSupport,null)
      for(const section of report.sections){
        assert.equal(section.domain,'personality')
        assert.ok(section.meaning.length>100)
        assert.ok(section.steps.length===2 && section.steps.every(x=>x.length>40))
        assert.match(section.meaning,locale==='ru'?/не является нормативным рейтингом/:/not a population ranking/)
        assert.ok(section.followUp.length>50)
      }
    }
  }
})

test('public and Account explorers expose new original self-reflection, never protected MMPI or official MBTI',()=>{
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length,139)
  assert.equal(new Set(MIND_BODY_MONITOR_REGISTRY.map(x=>x.key)).size,139)
  const restricted=['mmpi-3','mmpi-2','mmpi-2-rf','mbti-step-i','mbti-step-ii','neo-pi-3','hexaco-60','hexaco-100','16pf-fifth-edition','mcmi-iv','cpi-260']
  for(const locale of ['en','ru']){
    for(const audience of ['guest','account']){
      const entries=buildExplorerEntries({locale,audience})
      for(const [key,,questionCount] of CASES){
        const x=entries.find(e=>e.key===key)
        assert.ok(x?.selectable,key)
        assert.equal(x.questionCount,questionCount)
        assert.equal(x.definition.instrumentLocale,locale)
      }
      for(const key of restricted){
        const row=MIND_BODY_MONITOR_REGISTRY.find(x=>x.key===key)
        assert.ok(row,key)
        assert.equal(row.enabled,false)
        assert.ok([RIGHTS_STATUS.CLINICIAN_ONLY,RIGHTS_STATUS.LICENSED_ONLY,RIGHTS_STATUS.PERMISSION_REQUIRED].includes(row.rightsStatus))
        const entry=entries.find(e=>e.key===key)
        assert.ok(entry && !entry.selectable && entry.definition===null,key)
      }
    }
  }
})

test('new typology scales coexist with Mini-IPIP and IPIP-50 in one owner-scoped complete profile',()=>{
  const accountId='10000000-0000-4000-8000-000000000001'
  const values=[MINI_IPIP_20_EN_V1,IPIP_BIG_FIVE_50_EN_V1,...CASES.map(([key])=>getAssessmentDefinition(key,'v1','en'))]
  const results=values.map((d,index)=>({
    id:randomUUID(),accountId,measurementAt:'2026-10-11T19:00:00.000Z',
    ...scoreAssessment(d,minAnswers(d)),
  }))
  const snapshot=createProfileSnapshot({
    id:randomUUID(),accountId,generatedResult:results.at(-1),carriedResults:results.slice(0,-1),
    createdAt:'2026-10-11T20:00:00.000Z',
  })
  assert.equal(snapshot.dimensions.length,values.reduce((sum,d)=>sum+(d.scoring?.dimensions?.length||d.factors.length),0))
  assert.equal(new Set(snapshot.dimensions.map(d=>d.key)).size,snapshot.dimensions.length)
})

test('migration, desktop and phone report paths preserve safety and private report content',async()=>{
 const migration=await readFile('supabase/migrations/20261011230000_hh_personality_types_original.sql','utf8')
 const helper=await readFile('tests/helpers/app-db-setup.mjs','utf8')
 const reportUi=await readFile('components/app/personal-result-report.jsx','utf8')
 const pdf=await readFile('lib/profile/client-report-pdf.js','utf8')
 for(const d of PERSONALITY_TYPE_DEFINITIONS)assert.ok(migration.includes(d.contentHash),d.key)
 assert.match(migration,/on conflict\(id\) do nothing/)
 assert.match(helper,/20261011230000_hh_personality_types_original.sql/)
 assert.match(reportUi,/data-personality-type-summary/)
 assert.match(reportUi,/report\.personalityType\.headline/)
 assert.match(pdf,/Personality type hypothesis/)
 assert.doesNotMatch(reportUi,/localStorage|sessionStorage/)
})
