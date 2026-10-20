import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { IPIP_VIA_R_PROFILE_96_DEFINITIONS, IPIP_VIA_R_PROFILE_96_CATALOG } from '../data/assessments/ipip-via-r-profile-96.js'
import { CFPB_FINANCIAL_WELLBEING_SHORT_DEFINITIONS, CFPB_FINANCIAL_WELLBEING_SHORT_CATALOG } from '../data/assessments/cfpb-financial-wellbeing-short-v1.js'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS } from '../data/assessments/ipip-via-r-completion-2026.js'
import { OPEN_PROFESSIONAL_2026_DEFINITIONS } from '../data/assessments/open-professional-2026.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CFPB_SHORT_2017_LOOKUP, scoreCfpbShort2017 } from '../lib/assessments/cfpb-short-scoring.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { buildExplorerEntries, buildStarterBattery } from '../lib/assessments/test-explorer.js'
import { interpretationPlan, interpretationRegistryCoverage } from '../lib/assessments/interpretation-registry.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const via = IPIP_VIA_R_PROFILE_96_DEFINITIONS[0]
const cfpb = CFPB_FINANCIAL_WELLBEING_SHORT_DEFINITIONS[0]
const answer = (definition, score = 3) => Object.fromEntries(definition.questions.map(q => [q.id, score]))
const sourceScales = [...OPEN_PROFESSIONAL_2026_DEFINITIONS, ...IPIP_VIA_R_COMPLETION_DEFINITIONS]
  .filter(d => /^ipip-via-r-.*-4$/.test(d.key))

test('full IPIP profile reuses exactly 24 original immutable four-item components, not the official proprietary VIA Survey', () => {
  assert.equal(IPIP_VIA_R_PROFILE_96_DEFINITIONS.length, 1)
  assert.equal(sourceScales.length, 24)
  assert.equal(via.questions.length, 96)
  assert.equal(via.scoring.dimensions.length, 24)
  assert.equal(new Set(via.questions.map(q => q.id)).size, 96)
  assert.equal(new Set(via.scoring.dimensions.map(d => d.key)).size, 24)
  assert.deepEqual(new Set(via.questions.map(q => q.id)), new Set(sourceScales.flatMap(d => d.questions.map(q => q.id))))
  for (const source of sourceScales) {
    const dimension = source.scoring.dimensions[0]
    assert.deepEqual(via.scoring.dimensions.find(d => d.key === dimension.key), dimension)
    for (const original of source.questions) assert.deepEqual(via.questions.find(q => q.id === original.id), original)
  }
  assert.match(via.source.permission, /public domain/)
  assert.match(via.source.permission, /Not the proprietary VIA Survey/)
  assert.equal(via.instrumentLocale, 'en')
  assert.equal(IPIP_VIA_R_PROFILE_96_CATALOG[0].starterEligible, false)
  assert.equal(getAssessmentDefinition(via.key, via.version, via.instrumentLocale), via)
})

test('full profile has 24 descriptive reverse-scored 1–5 dimensions, not fabricated percentage ranks', () => {
  const center = scoreAssessment(via, answer(via, 3))
  assert.equal(center.dimensions.length, 24)
  assert.ok(center.dimensions.every(d => d.value === 3 && d.direction === 'non-normative' && d.dimensionClass === 'trait'))
  const perfect = Object.fromEntries(via.scoring.dimensions.flatMap(d => d.items.map(id => [id,d.reverseItems.includes(id)?1:5])))
  const bottom = Object.fromEntries(via.scoring.dimensions.flatMap(d => d.items.map(id => [id,d.reverseItems.includes(id)?5:1])))
  for (const [answers, expected] of [[perfect,5],[bottom,1]]) {
    const scored = scoreAssessment(via, answers)
    assert.equal(scored.dimensions.length, 24)
    assert.ok(scored.dimensions.every(d => d.value === expected))
    assert.ok(scored.dimensions.every(d => d.min === 1 && d.max === 5))
  }
  assert.throws(()=>scoreAssessment(via, answer(via, 6)))
  assert.throws(()=>scoreAssessment(via, Object.fromEntries(via.questions.slice(1).map(q=>[q.id,3]))))
  const report=buildAssessmentResultReport(center,'en')
  assert.equal(report.sections.length, 24)
  assert.ok(report.sections.every(section => section.bandBasis === 'descriptive'))
  assert.equal(getTestScaleGuide(via.key, 'ru').scales.length,24)
})

test('CFPB short form uses official five questions plus required age and mode scoring qualifiers', () => {
  assert.equal(cfpb.questions.length, 7)
  assert.equal(cfpb.scoring.dimensions.length, 1)
  assert.equal(cfpb.scoring.dimensions[0].items.length, 5)
  assert.deepEqual(cfpb.questions.map(q => q.responseAnchors.length), [5,5,5,5,5,2,2])
  assert.equal(cfpb.questions[3].text, 'I have money left over at the end of the month')
  assert.equal(cfpb.questions[5].text, 'How old are you?')
  assert.equal(cfpb.questions[6].text, 'How did you take the questionnaire?')
  assert.match(cfpb.source.scoringUrl, /short-scorecard\.pdf/)
  assert.match(cfpb.source.permission, /without permission/)
  assert.equal(CFPB_FINANCIAL_WELLBEING_SHORT_CATALOG[0].starterEligible,false)
  assert.equal(CFPB_FINANCIAL_WELLBEING_SHORT_CATALOG[0].questionCount, 7)
  assert.equal(getAssessmentDefinition(cfpb.key, cfpb.version, cfpb.instrumentLocale),cfpb)
})

test('CFPB lookup exactly matches official table and applies positive item reverse scoring, age and administration', () => {
  assert.equal(CFPB_SHORT_2017_LOOKUP.length,21)
  assert.deepEqual(CFPB_SHORT_2017_LOOKUP[0],[19,20,22,24])
  assert.deepEqual(CFPB_SHORT_2017_LOOKUP[10],[50,53,54,53])
  assert.deepEqual(CFPB_SHORT_2017_LOOKUP[20],[82,90,87,84])
  const low={'cfpb5.01':0,'cfpb5.02':0,'cfpb5.03':0,'cfpb5.04':4,'cfpb5.05':0}
  const high={'cfpb5.01':4,'cfpb5.02':4,'cfpb5.03':4,'cfpb5.04':0,'cfpb5.05':4}
  for (const age of [0,1])for(const mode of [0,1]){
    const column=mode*2+age
    assert.equal(scoreAssessment(cfpb,{...low,'cfpb5.06':age,'cfpb5.07':mode}).dimensions[0].value,CFPB_SHORT_2017_LOOKUP[0][column])
    assert.equal(scoreAssessment(cfpb,{...high,'cfpb5.06':age,'cfpb5.07':mode}).dimensions[0].value,CFPB_SHORT_2017_LOOKUP[20][column])
  }
  const moderate={...low,'cfpb5.01':4,'cfpb5.02':2,'cfpb5.03':2,'cfpb5.04':2,'cfpb5.05':0,'cfpb5.06':0,'cfpb5.07':0}
  assert.equal(scoreCfpbShort2017(moderate).responseTotal,10)
  assert.equal(scoreAssessment(cfpb,moderate).dimensions[0].value,50)
  const result=scoreAssessment(cfpb,moderate)
  assert.equal(result.dimensions[0].dimensionClass, 'resources')
  assert.equal(result.dimensions[0].direction, 'higher-reported-resource')
  assert.throws(()=>validateAnswers(cfpb,{...moderate,'cfpb5.06':2}))
  assert.throws(()=>validateAnswers(cfpb,{...moderate,'cfpb5.07':-1}))
  assert.throws(()=>scoreAssessment(cfpb,{...moderate,'cfpb5.01':undefined}))
})

test('both measures have immutable SHA256 and appear as optional selectable cards, with no default 96-question battery',()=>{
  for(const def of [via,cfpb]){
    const {contentHash,...rest}=def
    assert.equal(contentHash, 'sha256:'+createHash('sha256').update(canonicalJSON(rest)).digest('hex'))
    assert.ok(interpretationPlan(def.key,'v1'))
  }
  const coverage=interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.deepEqual(coverage,{total:150,registered:150,uncovered:[],obsolete:[]})
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale,audience})
    for(const key of [via.key,cfpb.key]){
      const entry=entries.find(x=>x.key===key)
      assert.ok(entry?.selectable,locale+' '+audience+' '+key)
      assert.equal(entry.starterEligible,false)
    }
    const starter=buildStarterBattery(entries,{focus:['resources','personality'],depth:'deep'})
    assert.ok(starter.every(e=>e.key!==via.key && e.key!==cfpb.key))
  }
})

test('new SQL registrations match exact definition ids/hashes and additive bootstrap',async()=>{
  const migrations=[
    '../supabase/migrations/20261015221000_hh_ipip_via_r_strengths_96.sql',
    '../supabase/migrations/20261015222000_hh_cfpb_financial_wellbeing_short.sql',
  ]
  for(const [index,path] of migrations.entries()){
    const sql=await readFile(new URL(path,import.meta.url),'utf8')
    const def=[via,cfpb][index]
    assert.ok(sql.includes(def.id))
    assert.ok(sql.includes(def.contentHash))
    assert.match(sql,/insert into app\.assessment_versions/i)
    assert.match(sql,/on conflict \(id\) do nothing/i)
    assert.match(sql,/content_hash<>d->>'contentHash'/)
  }
  const bootstrap=await readFile(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8')
  assert.ok(bootstrap.includes('20261015221000_hh_ipip_via_r_strengths_96.sql'))
  assert.ok(bootstrap.includes('20261015222000_hh_cfpb_financial_wellbeing_short.sql'))
})


test('advanced Explorer groups 27 VIA-R standalone cards without hiding saved selections or search hits', async () => {
  const source = await readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  assert.match(source, /showStandaloneVia, setShowStandaloneVia/)
  assert.match(source, /const visibleCatalog = visible\.filter/)
  assert.match(source, /selectedKeys\.includes\(entry\.key\) \|\| !isStandaloneVia\(entry\.key\)/)
  assert.match(source, /data-via-family-collapsed=\{collapsedViaCount\}/)
  assert.match(source, /aria-expanded=\{showStandaloneVia\}/)
  assert.match(source, /\(showAll \? visibleCatalog : visibleCatalog\.slice\(0, 8\)\)/)
  assert.match(source, /query\.trim\(\) \|\| selectedKeys\.includes\(entry\.key\)/)
  assert.ok(!/^ipip-via-r-(?!strengths-96$).+-(4|6)$/.test(via.key), 'full 96 item card is never collapsed')
  assert.equal(sourceScales.length + IPIP_VIA_R_COMPLETION_DEFINITIONS.filter(d => d.questions.length===6).length,27)
})
