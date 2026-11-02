import { TANTRIC_REFLECTION_KEYS } from '../data/assessments/tantric-reflections-v1.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY, RIGHTS_STATUS } from '../data/assessments/mind-body-monitor-registry.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
import { PERSONALITY_TYPE_DEFINITIONS, PERSONALITY_TYPE_CATALOG } from '../data/assessments/personality-types-original-2026.js'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS } from '../data/assessments/ipip-via-r-completion-2026.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, getDefinitionById } from '../lib/assessments/definitions.js'
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
  assert.equal(MONITORING_CATALOG.filter(item=>item.startable).length,150)
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
        const scored=scoreAssessment(def,value, syntheticTraumaContext(def))
        assert.deepEqual(scored.dimensions.map(d=>d.value),def.scoring.dimensions.map(d=>value===null?0:(value[def.questions[0].id]===1?d.min:d.max)))
      }
    }
  }
})

test('socionics: all 16 codes are reachable without converting to MBTI, ties abstain',()=>{
  assert.equal(SOCIONICS_TYPE_CODES.length,16)
  assert.equal(new Set(SOCIONICS_TYPE_CODES).size,16)
  const d=getAssessmentDefinition('hh-socionics-32','v1','en')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['e','n','l','p'])), syntheticTraumaContext(d)),'en').code,'ILE')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['e','n','l','j'])), syntheticTraumaContext(d)),'en').code,'LIE')
  assert.equal(personalityTypeHypothesis(scoreAssessment(d,orientedAnswers(d,new Set(['i','s','f','p'])), syntheticTraumaContext(d)),'en').code,'SEI')
  const tied=personalityTypeHypothesis(scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,3])), syntheticTraumaContext(d)),'ru')
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
    const result=scoreAssessment(d,orientedAnswers(d,new Set([high])), syntheticTraumaContext(d))
    const analysis=personalityTypeHypothesis(result,'ru')
    assert.equal(analysis.code,wanted)
    assert.ok(analysis.headline.length>20)
    assert.ok(analysis.description.length>70)
    const tie=personalityTypeHypothesis(scoreAssessment(d,minAnswers(d), syntheticTraumaContext(d)),'en')
    assert.equal(tie.code,null)
    assert.ok(tie.alternatives.length>0)
  }
})

test('personal result reports carry bilingual type hypotheses and distinct, safe concrete next steps',()=>{
  for(const [key] of CASES){
    for(const locale of ['ru','en']){
      const def=getAssessmentDefinition(key,'v1',locale)
      const report=buildAssessmentResultReport(scoreAssessment(def,minAnswers(def), syntheticTraumaContext(def)),locale)
      assert.equal(report.sections.length,def.scoring.dimensions.length)
      assert.ok(report.personalityType?.headline)
      assert.ok(report.personalityType.warning.length>50)
      assert.equal(report.seekSupport,null)
      for(const section of report.sections){
        assert.equal(section.domain,'personality')
        assert.ok(section.meaning.length>100)
        assert.ok(section.steps.length>=2 && section.steps.every(x=>x.length>40))
        assert.match(section.meaning,locale==='ru'?/не является нормативным рейтингом/:/not a population ranking/)
        assert.ok(section.followUp.length>50)
      }
    }
  }
})

test('public and Account explorers expose new original self-reflection, never protected MMPI or official MBTI',()=>{
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length,168)
  assert.equal(new Set(MIND_BODY_MONITOR_REGISTRY.map(x=>x.key)).size,168)
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
  const results=values.map(d=>({
    id:randomUUID(),accountId,measurementAt:'2026-10-11T19:00:00.000Z',
    ...scoreAssessment(d,minAnswers(d), syntheticTraumaContext(d)),
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
 const reportUi=await readFile('components/app/compact-assessment-report.jsx','utf8')
 const pdf=await readFile('lib/profile/client-report-pdf.js','utf8')
 for(const d of PERSONALITY_TYPE_DEFINITIONS)assert.ok(migration.includes(d.contentHash),d.key)
 assert.match(migration,/on conflict\(id\) do nothing/)
 assert.match(helper,/20261011230000_hh_personality_types_original.sql/)
 assert.match(reportUi,/data-personality-type-summary/)
 assert.match(reportUi,/report\.personalityType\.headline/)
 assert.match(pdf,/Personality type hypothesis/)
 assert.doesNotMatch(reportUi,/localStorage|sessionStorage/)
})

test('source-independent keyed fixtures, missing answers and exact immutable hashes', async () => {
  const hashes = [
    '739325e95feb1f299566200752b0c65de243f3e4e9fee0a4c767e53e84090aa6',
    'c4f7087981e8e4326b978bba6237de8db910679044e2a9e3e343a80f5d56fc4d',
    '1714cac50b4078864bc98ffbdcd3b35f27ae1454abb3a60579213263e226d566',
    '8cbeab16f4bda2b93a26d078d4ea98fe16f1ade9ee3ff3ed45379360a24a0492',
    'd20ee32781a21001b350c244f578041480b6b249665f495443cfb82ec983ec08',
    '88e22bbdb759d4c144879fb886d9b8ed36898a85a4cd48e0ea41f5abf51569d7',
    'c20a70040618f094adb4e71b94b642f1acd1a6ee612434b888a0ce4de27219b0',
    '2540945fab8da34bde976d0340a42642f244fb6538e8dbb3e6b0b069b8629a6f',
  ]
  const expected = {
    'hh-socionics-32': [10,11,12,13,14,10,11,12],
    'hh-enneagram-36': [10,11,12,13,14,10,11,12,13],
    'hh-disc-style-20': [15,15,15,15],
    'hh-temperaments-16': [10,11,12,13],
  }
  const sql = await readFile('supabase/migrations/20261011230000_hh_personality_types_original.sql','utf8')
  const embedded = JSON.parse(sql.split('$hh_personality$')[1])
  assert.deepEqual(embedded, PERSONALITY_TYPE_DEFINITIONS)
  for (const [index,d] of PERSONALITY_TYPE_DEFINITIONS.entries()) {
    assert.equal(d.contentHash,'sha256:'+hashes[index])
    const answers = Object.fromEntries(d.questions.map((q,i)=>[q.id,1+i%5]))
    const score = scoreAssessment(d,answers, syntheticTraumaContext(d))
    assert.deepEqual(score.dimensions.map(x=>x.value), expected[d.key])
    for (const invalid of [undefined,null,0,6,2.5,'3']) {
      const broken={...answers,[d.questions[0].id]:invalid}
      if(invalid===undefined)delete broken[d.questions[0].id]
      assert.throws(()=>scoreAssessment(d,broken, syntheticTraumaContext(d)),d.key+': '+invalid)
    }
    assert.equal(personalityTypeHypothesis({...score,definitionVersion:'v999'}),null)
    assert.equal(personalityTypeHypothesis({...score,dimensions:score.dimensions.slice(1)}),null)
    assert.equal(personalityTypeHypothesis({...score,dimensions:score.dimensions.map(x=>({...x,value:99}))}),null)
  }
})

test('all sixteen socionics mappings use an explicit independent code fixture',()=>{
  const d=getAssessmentDefinition('hh-socionics-32','v1','en')
  const cases={enlp:'ILE',isfp:'SEI',esfj:'ESE',inlj:'LII',enfj:'EIE',islj:'LSI',eslp:'SLE',infp:'IEI',esfp:'SEE',inlp:'ILI',enlj:'LIE',isfj:'ESI',eslj:'LSE',infj:'EII',enfp:'IEE',islp:'SLI'}
  for(const [letters,code] of Object.entries(cases)){
    const answers=Object.fromEntries(d.questions.map(q=>[q.id,letters.includes(q.id.split('.')[1])?5:1]))
    for(const locale of ['en','ru'])assert.equal(personalityTypeHypothesis(scoreAssessment(d,answers, syntheticTraumaContext(d)),locale).code,code)
  }
})


test('canonical 170 prior definitions and earlier 169/153-definition baselines remain unchanged',()=>{
  const ids=new Set(PERSONALITY_TYPE_DEFINITIONS.map(d=>d.id))
  const newViaIds = new Set(IPIP_VIA_R_COMPLETION_DEFINITIONS.map(d=>d.id))
  // Exclude only the six appended split-v2 IDs from this historical baseline.
  const splitV2Ids=new Set([
    '52c75d85-d99e-5178-8ee4-3b7faa802601',
    '7715324b-f54c-5d7c-8ca7-08ff17ba8c8e',
    'f65b9e09-2818-5c01-abb7-438600530e8f',
    '3ea615ee-b188-5c1e-8e41-2bfd221a75d7',
    '0c27f7d6-0280-5dcd-8f10-59447585b1df',
    '9a864e36-7362-567b-923e-ea99228f933d',
  ])
  assert.equal(ASSESSMENT_DEFINITIONS.filter(d=>splitV2Ids.has(d.id)&&d.version==='v2').length,6)
  // The separately approved Bach pair is additive; no historical ID is excluded.
  const bachV2Ids=new Set(['181604ad-23ed-4c9b-952b-299519edcacf','25fe2fac-ccaf-4483-b213-cf78db40af0e'])
  assert.equal(ASSESSMENT_DEFINITIONS.filter(d=>bachV2Ids.has(d.id)&&d.version==='v2').length,2)
  const extraNewIDs=new Set(ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(d=>d.id))
  const historicalDefinitions=ASSESSMENT_DEFINITIONS.filter(d=>!TANTRIC_REFLECTION_KEYS.includes(d.key)&&!extraNewIDs.has(d.id))
  const prior=historicalDefinitions.filter(d=>!splitV2Ids.has(d.id)&&!bachV2Ids.has(d.id)).filter(d=>!['ipip-via-r-strengths-96','cfpb-financial-wellbeing-5'].includes(d.key)).filter(d=>!['pcl-5','itq-adult'].includes(d.key)).filter(d=>!(d.key==='gad-7'&&d.instrumentLocale==='ru')).filter(d=>!newViaIds.has(d.id)).filter(d=>!['ipip-cognitive-failures-10','ipip-optimism-10','ipip-attending-to-emotions-10','ipip-locus-of-control-internality-10','ipip-locus-of-control-powerful-others-10','ipip-locus-of-control-chance-10','ipip-positive-expressivity-9','ipip-negative-expressivity-10'].includes(d.key)).filter(d=>d.key!=='asrs-6'&&!ids.has(d.id))
  const digest=value=>createHash('sha256').update(canonicalJSON(value)).digest('hex')
  assert.equal(prior.length,170)
  assert.equal(digest(prior),'2b7a4c102bbcf65ed0b6f3d3530d803c93dfa8f27456b5c2bf4a490ea6fc3e93')
  const earlierPrior=prior.filter(d=>d.key!=='mhc-sf')
  assert.equal(earlierPrior.length,169)
  assert.equal(digest(earlierPrior),'6258ebd96876d8ce3af28b49ee2437746a33bf80b2c6e8e2060fd1e20c98126c')
  const relationIds=new Set(RELATIONSHIPS_INTIMACY_DEFINITIONS.map(d=>d.id))
  const originalPrior=earlierPrior.filter(d=>!relationIds.has(d.id))
  assert.equal(originalPrior.length,153)
  assert.equal(digest(originalPrior),'1743fb49e9f78bde406bc5055349a95c8b961961b21ab9d1a0fcb05fca1fb0bc')
})
