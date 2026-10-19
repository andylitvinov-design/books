import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_DEFINITIONS } from '../data/assessments/tantric-reflections-v1.js'
import { MHC_SF_DEFINITIONS } from '../data/assessments/mhc-sf-adult-dec2011.js'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS } from '../data/assessments/ipip-via-r-completion-2026.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { buildClientReport } from '../lib/profile/client-report.js'

const d = getAssessmentDefinition('mhc-sf', 'v1', 'en')
// Independently transcribed from the printed adult form, p.4, and scoring syntax, p.6.
const sourceItems = [
  'happy', 'interested in life', 'satisfied with life',
  'that you had something important to contribute to society',
  'that you belonged to a community (like a social group, or your neighborhood)',
  'that our society is a good place, or is becoming a better place, for all people',
  'that people are basically good', 'that the way our society works makes sense to you',
  'that you liked most parts of your personality', 'good at managing the responsibilities of your daily life',
  'that you had warm and trusting relationships with others',
  'that you had experiences that challenged you to grow and become a better person',
  'confident to think or express your own ideas and opinions',
  'that your life has a sense of direction or meaning to it',
]
const groups = [[1,2,3,4,5,6,7,8,9,10,11,12,13,14],[1,2,3],[4,5,6,7,8],[9,10,11,12,13,14]]
const maxima = [70,15,25,30]
const mixed = [0,1,2,3,4,5,0,1,2,3,4,5,0,1]
const answers = values => Object.fromEntries(values.map((v,i)=>[`mhc_sf.${String(i+1).padStart(2,'0')}`,v]))
const score = values => scoreAssessment(d, answers(values), syntheticTraumaContext(d))
const values = result => result.dimensions.map(s=>s.value)

test('adult December 2011 MHC-SF pins all original items, revised item 6, anchors, identity and source version',()=>{
  assert.equal(d.id,'fe2feb75-6428-52a1-a9a6-ea45f0e43242')
  assert.equal(d.contentHash,'sha256:c70b5b61ad92d2daad15dbaf4e145d27262abe94cc9f2a64eda275c257b6a853')
  const {contentHash,...body}=d
  assert.equal('sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'),contentHash)
  assert.ok(Object.isFrozen(d.questions[0])&&Object.isFrozen(d.scoring.dimensions))
  assert.deepEqual(d.questions.map(q=>q.text),sourceItems)
  assert.deepEqual(d.questions.map(q=>q.id),Object.keys(answers(Array(14).fill(0))))
  assert.ok(d.questions.every(q=>q.required))
  assert.deepEqual(d.responseAnchors,['Never','Once or twice','About once a week','About 2 or 3 times a week','Almost every day','Every day'])
  assert.deepEqual(d.answerScale,{min:0,max:5})
  assert.equal(d.timeframe,'past-month');assert.equal(d.source.minimumAge,18)
  assert.equal(d.translationVersion,'original-en-adult-dec2011-v1')
  assert.match(d.source.formVersion,/December 2011.*revised item 6/)
  assert.match(d.instructions,/During the past month, how often did you feel …$/)
  assert.doesNotMatch(d.questions[5].text,/people like you/)
  assert.equal(d.source.permissionUrl,d.source.url+'#page=1')
  assert.equal(d.source.scoringUrl,d.source.url+'#page=6')
  assert.match(d.source.title,/Keyes/)
  assert.equal(ASSESSMENT_DEFINITIONS.filter(x=>x.key==='mhc-sf').length,1)
  assert.throws(()=>getAssessmentDefinition('mhc-sf','v1','ru'),/UNKNOWN_INSTRUMENT/)
})

test('source sums cover minima, maxima, mixed values, each item membership and no reversal',()=>{
  assert.deepEqual(d.scoring.dimensions.map(s=>s.items.map(id=>Number(id.split('.').at(-1)))),groups)
  assert.ok(d.scoring.dimensions.every(s=>s.method==='sum'&&s.reverseItems.length===0))
  assert.deepEqual(values(score(Array(14).fill(0))),[0,0,0,0])
  assert.deepEqual(values(score(Array(14).fill(5))),maxima)
  assert.deepEqual(values(score(mixed)),[31,3,13,15])
  assert.deepEqual(values(score(Array(14).fill(1))),[14,3,5,6])
  for(let n=1;n<=14;n++){
    const fixture=Array(14).fill(0);fixture[n-1]=5
    assert.deepEqual(values(score(fixture)),groups.map(g=>g.includes(n)?5:0),`source item ${n}`)
  }
})

test('zero is a complete answer; missing, null, fractional and out-of-range responses never score',()=>{
  const complete=answers(Array(14).fill(0))
  assert.equal(Object.keys(validateAnswers(d,complete)).length,14)
  for(const q of d.questions){
    const missing={...complete};delete missing[q.id]
    assert.throws(()=>scoreAssessment(d,missing, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
    assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:null}, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
    assert.equal(Object.keys(validateAnswers(d,missing,{requireComplete:false})).length,13)
    for(const bad of [-1,6,0.5,'0',false,NaN,Infinity])assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:bad}, syntheticTraumaContext(d)),/INVALID_ANSWER/)
  }
  assert.throws(()=>scoreAssessment(d,{...complete,unexpected:0}, syntheticTraumaContext(d)))
})

test('EN/RU reports provide four continuous sums, attribution, form-specific limits and no categorical labels',()=>{
  for(const locale of ['en','ru'])for(let n=0;n<=5;n++){
    const result=score(Array(14).fill(n)),report=buildAssessmentResultReport(result,locale)
    assert.equal(report.sections.length,4)
    report.sections.forEach((s,i)=>{
      assert.equal(s.band,(locale==='ru'?'Сумма ответов':'Response sum')+` (0–${maxima[i]})`)
      assert.equal(s.bandBasis,'descriptive');assert.equal(s.source,d.source.scoringUrl)
      assert.match(s.meaning,/Corey L\. M\. Keyes/)
      assert.match(s.meaning,locale==='ru'?/английский оригинал/:/English original/)
      assert.match(s.meaning,locale==='ru'?/не исключает психическое расстройство/:/cannot rule out mental illness/)
      assert.doesNotMatch(s.band,/flourish|languish|moderate|high|low|высок|низк/i)
      assert.ok(s.steps.length>=2)
    })
    assert.match(report.sections[2].meaning,/PHAC \(2017\)/)
    const guide=getTestScaleGuide('mhc-sf',locale)
    assert.equal(guide.scales.length,4);assert.equal(guide.instrumentLanguage,'en')
    assert.deepEqual(guide.scales.map(s=>s.axis),['resource','mood','relationships','resource'])
    assert.ok(guide.scales.every(s=>s.bands.rows.length===0))
    assert.match(guide.sourceTitle,/Keyes/)
    for(const patch of [{definitionVersion:'v2'},{translationVersion:'original-en-2009'},{contentHash:'sha256:'+'0'.repeat(64)},{instrumentLocale:'ru'}])
      assert.equal(interpretationForDimension({...result,...patch},result.dimensions[0],locale).basis,'unavailable')
  }
})

test('one MHC-SF replaces its research reference in EN/RU guest/account filters without duplication',()=>{
  assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,150)
  assert.equal(MONITORING_CATALOG.filter(c=>c.startable&&c.testStyle==='professional').length,77)
  const digest=value=>createHash('sha256').update(canonicalJSON(value)).digest('hex')
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
  const tantricIds=new Set(TANTRIC_REFLECTION_DEFINITIONS.map(d=>d.id))
  const additions=new Set(ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(d=>d.id))
  const prior=ASSESSMENT_DEFINITIONS.filter(d=>!tantricIds.has(d.id)&&!additions.has(d.id)).filter(d=>!splitV2Ids.has(d.id)&&!bachV2Ids.has(d.id)).filter(d=>!['ipip-via-r-strengths-96','cfpb-financial-wellbeing-5'].includes(d.key)).filter(d=>!['pcl-5','itq-adult'].includes(d.key)).filter(d=>!(d.key==='gad-7'&&d.instrumentLocale==='ru')).filter(d=>!newViaIds.has(d.id)).filter(d=>!['ipip-cognitive-failures-10','ipip-optimism-10','ipip-attending-to-emotions-10','ipip-locus-of-control-internality-10','ipip-locus-of-control-powerful-others-10','ipip-locus-of-control-chance-10','ipip-positive-expressivity-9','ipip-negative-expressivity-10'].includes(d.key)).filter(x=>x.key!=='asrs-6'&&x.key!=='mhc-sf'&&!['hh-socionics-32','hh-enneagram-36','hh-disc-style-20','hh-temperaments-16'].includes(x.key))
  assert.equal(prior.length,169)
  assert.equal(digest(prior),'6258ebd96876d8ce3af28b49ee2437746a33bf80b2c6e8e2060fd1e20c98126c')
  const relationshipIds=new Set(RELATIONSHIPS_INTIMACY_DEFINITIONS.map(d=>d.id))
  const originalPrior=prior.filter(d=>!relationshipIds.has(d.id))
  assert.equal(originalPrior.length,153)
  assert.equal(digest(originalPrior),'1743fb49e9f78bde406bc5055349a95c8b961961b21ab9d1a0fcb05fca1fb0bc')
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale,audience}),matches=entries.filter(e=>e.key==='mhc-sf')
    assert.equal(matches.length,1)
    assert.ok(matches[0].selectable&&matches[0].startable&&matches[0].definition===d)
    assert.ok(filterExplorerEntries(entries,{availability:'available',styles:['professional']}).some(e=>e.key==='mhc-sf'))
    assert.equal(matches[0].questionCount,14)
    if(locale==='ru')assert.match(matches[0].title,/EN/)
  }
})

test('guarded registration matches exact definition; guide documents sums, attribution and revised item',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261012041529_hh_mhc_sf_adult_dec2011.sql',import.meta.url),'utf8')
  assert.deepEqual(JSON.parse(sql.split('$mhcsf$')[1]),MHC_SF_DEFINITIONS)
  assert.match(sql,/on conflict \(id\) do nothing/)
  assert.match(sql,/id is distinct from \(d->>'id'\)::uuid/)
  assert.match(sql,/content_hash is distinct from d->>'contentHash'/)
  assert.match(sql,/definition is distinct from d/)
  assert.doesNotMatch(sql,/^\s*(update app\.|delete from|alter table|create policy|grant )/im)
  const guide=readFileSync(new URL('../docs/assessments/guides/mhc-sf.md',import.meta.url),'utf8')
  for(const text of [d.id,d.contentHash,d.source.url,'December 2011','0–70','0–15','0–25','0–30','PHAC'])assert.ok(guide.includes(text),text)
})

test('confidential bilingual PDF/history model retains zero and compatible repeated sums',()=>{
  const results=[{...score(Array(14).fill(0)),id:'mhc-zero',measurementAt:'2026-10-12T01:00:00Z'},{...score(mixed),id:'mhc-mixed',measurementAt:'2026-10-12T02:00:00Z'}]
  for(const locale of ['en','ru']){
    const report=buildClientReport({results,locale,now:new Date('2026-10-12T03:00:00Z')})
    assert.equal(report.counts.tests,1);assert.equal(report.counts.attempts,2)
    const row=report.tests[0];assert.equal(row.attemptCount,2);assert.equal(row.language,'en');assert.equal(row.dimensions.length,4)
    assert.deepEqual(row.dimensions.map(s=>s.value),[31,3,13,15])
    assert.ok(row.interpretation.sections.every(s=>s.source===d.source.scoringUrl))
  }
})
