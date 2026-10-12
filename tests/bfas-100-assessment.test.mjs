import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {BFAS_100_DEFINITIONS} from '../data/assessments/bfas-100-en-v1.js'
import {RELATIONSHIPS_INTIMACY_DEFINITIONS} from '../data/assessments/relationships-intimacy-v1.js'
import {ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers} from '../lib/assessments/definitions.js'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {gaugeModel} from '../lib/assessments/dashboard-gauges.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {buildExplorerEntries, filterExplorerEntries} from '../lib/assessments/test-explorer.js'
import {buildAssessmentResultReport} from '../lib/assessments/result-report.js'
import {getTestScaleGuide} from '../lib/assessments/scale-guides.js'
import {interpretationForDimension, classificationDirection} from '../lib/assessments/interpretation-registry.js'

// Independent transcription of the numerical key on the author's BFAS self-rating form.
// Negative item numbers mean 6-response, not an omitted or negative response.
const aspectKeys = [
 [-1,11,-21,31,-41,51,61,-71,81,91],
 [6,-16,26,-36,46,-56,66,-76,86,96],
 [-2,12,22,-32,42,-52,-62,72,-82,92],
 [7,-17,27,-37,47,57,-67,-77,-87,-97],
 [3,-13,-23,-33,43,-53,63,73,-83,-93],
 [-8,18,28,38,-48,58,-68,-78,88,98],
 [4,-14,-24,-34,44,-54,-64,74,84,94],
 [9,19,-29,39,-49,59,69,-79,89,-99],
 [5,-15,25,35,-45,-55,65,75,-85,95],
 [10,20,30,40,-50,-60,70,-80,-90,100],
]
const aspectNames=['withdrawal','volatility','compassion','politeness','industriousness','orderliness','enthusiasm','assertiveness','intellect','openness']
const domainNames=['neuroticism','agreeableness','conscientiousness','extraversion','openness_intellect']
const domainPairs=[[0,1],[2,3],[4,5],[6,7],[8,9]]
const groups=[...domainPairs.map(([a,b])=>[...aspectKeys[a],...aspectKeys[b]]),...aspectKeys]
const reverse=aspectKeys.flat().filter(n=>n<0).map(n=>-n)
const id=n=>'bfas100.'+String(n).padStart(3,'0')
const answers=arr=>Object.fromEntries(arr.map((v,i)=>[id(i+1),v]))
const score=arr=>scoreAssessment(d,answers(arr))
const values=arr=>score(arr).dimensions.map(s=>s.value)
const digest=obj=>createHash('sha256').update(canonicalJSON(obj)).digest('hex')
const d=BFAS_100_DEFINITIONS[0]
const transcript=JSON.parse(readFileSync(new URL('./fixtures/bfas-author-transcript.json',import.meta.url),'utf8'))

test('BFAS-100 preserves exactly one original author form, interleaved items, anchors and immutable identity',()=>{
 assert.equal(BFAS_100_DEFINITIONS.length,1)
 assert.equal(d.id,'1412085c-c923-55bb-946f-c611554bcd6d')
 assert.equal(d.contentHash,'sha256:fc322ecc17c3f2f9e16578596a12ef7ded4a40a346fed665c3d96cde896dc021')
 const {contentHash,...body}=d
 assert.equal(contentHash,'sha256:'+digest(body))
 assert.ok(Object.isFrozen(d)&&Object.isFrozen(d.questions[0])&&Object.isFrozen(d.scoring.dimensions))
 assert.equal(d.questions.length,100)
 assert.deepEqual(d.questions.map(q=>q.id),Array.from({length:100},(_,i)=>id(i+1)))
 assert.deepEqual(d.questions.map(q=>q.text),transcript.questions)
 assert.equal(d.instructions,transcript.instructions)
 for(const n of [1,60,80,90])assert.match(d.questions[n-1].text,/Rarely/)
 assert.deepEqual(d.responseAnchors,['Strongly Disagree','2','Neither Agree Nor Disagree','4','Strongly Agree'])
 assert.deepEqual(d.answerScale,{min:1,max:5})
 assert.equal(d.source.authorFormSha256,'a9ee90dca1c8f31ac2a9f0fcaa1b8058cc12c4f27b2c98bd29c6fe0930ccfdb9')
 assert.match(d.source.missingResponsePolicy,/requires all 100/)
 assert.equal(getAssessmentDefinition('bfas-100','v1','en'),d)
 assert.throws(()=>getAssessmentDefinition('bfas-100','v1','ru'),/UNKNOWN_INSTRUMENT/)
})

test('BFAS-100 exact keyed ten aspects and five paired domains, with no total',()=>{
 assert.deepEqual(d.scoring.dimensions.map(s=>s.key),[
 ...domainNames.map(n=>'trait.bfas100.domain.'+n),...aspectNames.map(n=>'trait.bfas100.aspect.'+n)])
 assert.equal(new Set(aspectKeys.flat().map(Math.abs)).size,100)
 assert.deepEqual(d.scoring.dimensions.map(s=>s.items),groups.map(g=>g.map(n=>id(Math.abs(n)))))
 assert.deepEqual(d.scoring.dimensions.map(s=>s.reverseItems),groups.map(g=>g.filter(n=>n<0).map(n=>id(-n))))
 assert.ok(d.scoring.dimensions.every(s=>s.method==='mean'&&s.dimensionClass==='trait'&&s.direction==='non-normative'))
})

test('BFAS independent extrema, uniform answers, mixed answers and every reverse-key contribution',()=>{
 const high=Array.from({length:100},(_,i)=>reverse.includes(i+1)?1:5)
 assert.deepEqual(values(high),Array(15).fill(5))
 assert.deepEqual(values(high.map(v=>6-v)),Array(15).fill(1))
 assert.deepEqual(values(Array(100).fill(3)),Array(15).fill(3))
 assert.deepEqual(values(Array(100).fill(1)),[2.6,3.2,3,2.8,2.6,2.6,2.6,3,3.4,3.4,2.6,3,2.6,2.6,2.6])
 assert.deepEqual(values(Array(100).fill(5)),[3.4,2.8,3,3.2,3.4,3.4,3.4,3,2.6,2.6,3.4,3,3.4,3.4,3.4])
 // Different answers within and across aspects; independently compute expected keyed means.
 const mixed=Array.from({length:100},(_,i)=>((i*7+Math.floor(i/10))%5)+1)
 const expected=groups.map(g=>g.reduce((s,n)=>s+(n<0?6-mixed[-n-1]:mixed[n-1]),0)/g.length)
 assert.deepEqual(values(mixed),expected)
 const v=values(mixed)
 domainPairs.forEach(([a,b],i)=>assert.equal(v[i],Math.round((v[5+a]+v[5+b])*50)/100))
 for(let n=1;n<=100;n++){
  const a=Array(100).fill(3);a[n-1]=5
  const expected=groups.map(g=>Math.round((3+(g.some(k=>Math.abs(k)===n)?(reverse.includes(n)?-2:2)/g.length:0))*100)/100)
  assert.deepEqual(values(a),expected,'item '+n)
 }
})

test('BFAS requires all 100 answers; zero, missing, fractional and out-of-range answers fail',()=>{
 const valid=answers(Array(100).fill(3))
 for(let n=1;n<=100;n++){
  const partial={...valid};delete partial[id(n)]
  assert.throws(()=>scoreAssessment(d,partial),/REQUIRED_ANSWER/)
  assert.equal(Object.keys(validateAnswers(d,partial,{requireComplete:false})).length,99)
  for(const bad of [null,undefined])assert.throws(()=>scoreAssessment(d,{...valid,[id(n)]:bad}),/REQUIRED_ANSWER/)
  for(const bad of [0,6,-1,2.5,'3',NaN,Infinity])assert.throws(()=>scoreAssessment(d,{...valid,[id(n)]:bad}),/INVALID_ANSWER/)
 }
 assert.throws(()=>scoreAssessment(d,{...valid,extra:3}))
})

test('BFAS reports and scale guides cover every construct in both UI languages with neutral continuous interpretation',()=>{
 for(const locale of ['en','ru'])for(const n of [1,3,5]){
  const result=score(Array(100).fill(n)),report=buildAssessmentResultReport(result,locale),guide=getTestScaleGuide('bfas-100',locale)
  assert.equal(report.sections.length,15);assert.equal(guide.scales.length,15)
  assert.equal(guide.instrumentLanguage,'en');assert.equal(guide.kind,'trait')
  assert.ok(guide.scales.every(s=>s.type==='trait'&&s.axis==='personality'&&s.canChooseSkill===false&&s.bands.rows.length===0))
  assert.ok(result.dimensions.every(s=>classificationDirection(s)==='neutral'&&gaugeModel(s).orientation==='neutral'))
  for(const section of report.sections){
   assert.equal(section.bandBasis,'descriptive')
   assert.equal(section.source,d.source.scoringUrl)
   assert.equal(section.band,locale==='ru'?'Среднее ответов (1–5)':'Response mean (1–5)')
   assert.ok(section.steps.length>=2&&section.steps.every(s=>s.length>25))
   assert.equal(section.recommendedReview,false)
   assert.match(section.meaning,locale==='ru'?/не диагноз/:/not a diagnosis/)
   assert.match(section.meaning,locale==='ru'?/английский оригинал/:/English original/)
   assert.match(section.meaning,locale==='ru'?/процентил/:/percentile/)
   assert.doesNotMatch(section.meaning,/lower part|middle part|upper part|clinical category/)
  }
  for(const change of [{definitionId:'other'},{definitionVersion:'v2'},{instrumentLocale:'ru'},{translationVersion:'other'},{contentHash:'other'}])
   assert.equal(interpretationForDimension({...result,...change},result.dimensions[0],locale).basis,'unavailable')
 }
})

test('BFAS adds one selectable professional instrument; existing immutable forms are byte-for-byte unchanged',()=>{
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,110)
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable&&c.testStyle==='professional').length,43)
 const prior=ASSESSMENT_DEFINITIONS.filter(x=>x.key!=='bfas-100')
 assert.equal(prior.length,178)
 assert.equal(digest(prior),'a6c1b0cca75863dc951a02003aa914437dff637d9dd61f9f0dc36925b40e12c0')
 const beforeTypologies=prior.filter(d=>!['hh-socionics-32','hh-enneagram-36','hh-disc-style-20','hh-temperaments-16'].includes(d.key))
 assert.equal(beforeTypologies.length,170)
 assert.equal(digest(beforeTypologies),'2b7a4c102bbcf65ed0b6f3d3530d803c93dfa8f27456b5c2bf4a490ea6fc3e93')
 const earlierPrior=beforeTypologies.filter(d=>d.key!=='mhc-sf')
 assert.equal(earlierPrior.length,169)
 assert.equal(digest(earlierPrior),'6258ebd96876d8ce3af28b49ee2437746a33bf80b2c6e8e2060fd1e20c98126c')
 const relationshipIds=new Set(RELATIONSHIPS_INTIMACY_DEFINITIONS.map(d=>d.id))
 const originalPrior=earlierPrior.filter(d=>!relationshipIds.has(d.id))
 assert.equal(originalPrior.length,153)
 assert.equal(digest(originalPrior),'1743fb49e9f78bde406bc5055349a95c8b961961b21ab9d1a0fcb05fca1fb0bc')
 for(const locale of ['en','ru'])for(const audience of ['guest','account']){
  const entries=buildExplorerEntries({locale,audience}),matches=entries.filter(e=>e.key==='bfas-100')
  assert.equal(matches.length,1);assert.ok(matches[0].selectable&&matches[0].definition)
  assert.ok(filterExplorerEntries(entries,{availability:'available',styles:['professional'],axes:['personality']}).some(e=>e.key==='bfas-100'))
 }
 const c=MONITORING_CATALOG.find(c=>c.key==='bfas-100')
 assert.equal(c.questionCount,100);assert.match(c.title.ru,/EN/);assert.equal(c.starterEligible,false)
})

test('BFAS registration is append-only with exact identity/hash/content guards and correspondence',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261012045314_hh_bfas_100_author_form.sql',import.meta.url),'utf8')
 assert.deepEqual(JSON.parse(sql.split('$bfas100$')[1]),BFAS_100_DEFINITIONS)
 assert.match(sql,/on conflict \(id\) do nothing/)
 assert.match(sql,/id is distinct from \(d->>'id'\)::uuid/)
 assert.match(sql,/content_hash is distinct from d->>'contentHash'/)
 assert.match(sql,/definition is distinct from d/)
 assert.doesNotMatch(sql,/^\s*(update app\.|delete from|alter table|create policy|grant )/im)
 const guide=readFileSync(new URL('../docs/assessments/guides/bfas-100.md',import.meta.url),'utf8')
 assert.ok(guide.includes(d.id)&&guide.includes(d.contentHash)&&guide.includes(d.source.url))
})

test('BFAS persists one instrument and all 15 dimensions in bilingual PDF model and compatible history',async()=>{
 const {buildClientReport}=await import('../lib/profile/client-report.js')
 const results=[1,3].map((n,i)=>({...score(Array(100).fill(n)),id:'synthetic-'+i,measurementAt:`2026-10-12T0${i+1}:00:00Z`}))
 for(const locale of ['en','ru']){
  const report=buildClientReport({results,locale,now:new Date('2026-10-12T04:00:00Z')})
  assert.equal(report.counts.tests,1);assert.equal(report.counts.attempts,2)
  assert.equal(report.tests[0].language,'en');assert.equal(report.tests[0].dimensions.length,15)
  assert.equal(report.tests[0].interpretation.sections.length,15)
  assert.ok(report.tests[0].interpretation.sections.every(s=>s.source===d.source.scoringUrl))
 }
})
