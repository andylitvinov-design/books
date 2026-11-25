import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TRAUMA_SCREENING_DEFINITIONS } from '../data/assessments/trauma-screening-2026.js'
import { TRAUMA_SCREENING_CATALOG } from '../data/assessments/trauma-screening-catalog-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { seedTraumaTestVersions } from './helpers/seed-trauma-versions.mjs'

test('trauma catalog is explicit opt-in, English-only, without auto-battery or prescribed skills',()=>{
 for(const row of TRAUMA_SCREENING_CATALOG){
  assert.equal(row.starterEligible,false);assert.deepEqual(row.analysisAxes,[]);assert.deepEqual(row.moodAffinities,[]);assert.deepEqual(row.categoryAffinities,[])
  assert.equal(row.instrumentLocale,'en');assert.equal(row.suggestedRepeatDays,null)
  assert.equal(MONITORING_CATALOG.filter(x=>x.key===row.key).length,1)
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
   const entry=buildExplorerEntries({locale,audience}).find(x=>x.key===row.key)
   assert.ok(entry.selectable);assert.equal(entry.definition.instrumentLocale,'en')
   const guide=getTestScaleGuide(row.key,locale)
   assert.deepEqual(guide.skillAxes,[]);assert.deepEqual(guide.measurementAxes,[])
   assert.ok(guide.scales.every(scale=>scale.type==='symptom_sum'&&!scale.canChooseSkill&&scale.skill===null&&scale.bands.rows.length===0))
  }
 }
})
test('isolated test seed matches exact two immutable versions and refuses non-isolated use',async()=>{
 const names=['CI','HH_APP_TEST_RUNTIME','HH_TEST_ADMIN_DATABASE_URL','VERCEL'],saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));const rows=[];let queries=0
 const db={query:async(sql,args)=>{
  queries++
  if(sql.startsWith('select'))return {rows:rows.filter(r=>r.id===args[0]||(args.length>1&&r.definition_key===args[1]&&r.definition_version===args[2]&&r.instrument_locale===args[3]))}
  const columns=sql.match(/\(([^)]+)\) values/)[1].split(',');rows.push(Object.fromEntries(columns.map((name,i)=>[name,['definition','questions','answer_schema','result_schema','source_metadata'].includes(name)?JSON.parse(args[i]):args[i]])));return {rows:[]}
 }}
 try{
  process.env.CI='false';process.env.HH_APP_TEST_RUNTIME='isolated';process.env.HH_TEST_ADMIN_DATABASE_URL='postgres://localhost/hh_app_test';delete process.env.VERCEL
  await assert.rejects(seedTraumaTestVersions(db),/Isolated loopback/);assert.equal(queries,0)
  process.env.CI='true';await seedTraumaTestVersions(db);assert.equal(rows.length,2)
  assert.deepEqual(rows.map(r=>r.definition),TRAUMA_SCREENING_DEFINITIONS)
  await seedTraumaTestVersions(db);assert.equal(rows.length,2)
  rows[0].content_hash='changed';await assert.rejects(seedTraumaTestVersions(db),/TRAUMA_FIXTURE_CONFLICT/)
 }finally{for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name]}
 const setup=readFileSync(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8');assert.match(setup,/await seedTraumaTestVersions\(db\)/)
 const productionSeed=readFileSync(new URL('../scripts/app-seed.mjs',import.meta.url),'utf8');assert.doesNotMatch(productionSeed,/seedTraumaTestVersions|TRAUMA_SCREENING/)
})

test('trauma remains manually selectable but never enters automatic recommendations, including exhaustion and large counts',async()=>{
 const {rankExplorerEntries,rankPublicTestMatches,buildStarterBattery,buildPublicStarterBattery}=await import('../lib/assessments/test-explorer.js')
 const {rankAssessmentDefinitions}=await import('../lib/assessments/test-recommendations.js')
 const {courseRecommendedTests}=await import('../lib/inner-growth/course-strategy.js')
 const {recommendMonitoring}=await import('../lib/assessments/monitoring.js')
 const {profileCompletionRecommendations}=await import('../lib/profile/summary.js')
 const keys=new Set(TRAUMA_SCREENING_DEFINITIONS.map(d=>d.key))
 const hasTrauma=rows=>rows.some(row=>keys.has(row.key||row.definition?.key||row.item?.key))
 for(const locale of ['en','ru']){
  const entries=buildExplorerEntries({locale,audience:'account'}),onlyTrauma=entries.filter(entry=>keys.has(entry.key))
  assert.equal(onlyTrauma.length,2);assert.ok(onlyTrauma.every(entry=>entry.selectable&&entry.explicitOptIn))
  assert.equal(rankExplorerEntries(onlyTrauma,{focus:['stress']}).length,2,'manual catalog discovery remains possible')
  assert.deepEqual(rankPublicTestMatches(onlyTrauma,{focus:['stress']}),[])
  assert.deepEqual(buildStarterBattery(onlyTrauma),[]);assert.deepEqual(buildPublicStarterBattery(onlyTrauma),[])
  assert.deepEqual(rankAssessmentDefinitions(TRAUMA_SCREENING_DEFINITIONS,{focus:['stress']}),[])
  assert.equal(hasTrauma(courseRecommendedTests({locale,focusTags:['stress'],count:10000})),false)
  assert.equal(hasTrauma(profileCompletionRecommendations({locale,limit:10000}).recommendations),false)
  const now='2026-10-14T12:00:00.000Z'
  // Verified scoring fixtures rather than unfinished metadata stubs: the
  // monitoring engine must reject a bare test key as proof of completion.
  const {getAssessmentDefinition}=await import('../lib/assessments/definitions.js')
  const {scoreAssessment}=await import('../lib/assessments/scoring.js')
  const {syntheticTraumaContext}=await import('./helpers/trauma-context-fixtures.mjs')
  const results=MONITORING_CATALOG.filter(item=>item.startable&&!keys.has(item.key)).map((item,index)=>{
    const instrumentLocale=item.instrumentLocale==='dynamic'?locale:item.instrumentLocale
    const def=getAssessmentDefinition(item.key,item.version,instrumentLocale)
    const answers=Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale?.min]))
    const scored=scoreAssessment(def,answers,syntheticTraumaContext(def))
    return { ...scored,id:'verified-synthetic-'+locale+'-'+index,
      accountId:'10000000-0000-4000-8000-000000000001',measurementAt:now }
  })
  assert.equal(recommendMonitoring({results,locale,now}),null,'completed ordinary forms must never trigger trauma screening')
  const runs=TRAUMA_SCREENING_DEFINITIONS.map(d=>({definitionId:d.id}))
  assert.equal(recommendMonitoring({results,runs,locale,now}),null,'even a previous opt-in does not create an automatic screening recommendation')
 }
})
