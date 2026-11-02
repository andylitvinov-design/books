import { TANTRIC_REFLECTION_KEYS } from '../data/assessments/tantric-reflections-v1.js'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { ASRS6_DEFINITIONS } from '../data/assessments/asrs-v1-6-nyu.js'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS } from '../data/assessments/ipip-via-r-completion-2026.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers, provenance } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { makeTestSelectionIntent, readTestSelectionIntent } from '../lib/app/test-selection-intent.js'
import { validateTestPlanInput, appendSavedTestIds } from '../lib/app/test-plans.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { normalizeDimension } from '../lib/profile/summary.js'
import { scorePortraitDimension } from '../lib/assessments/psych-portrait.js'
import { buildProfileAssessmentView } from '../lib/profile/profile-assessment-view.js'
import { courseMeasuredProfile, courseSuggestedFocus, goalForChosenScale } from '../lib/inner-growth/course-strategy.js'
import { buildClientReport } from '../lib/profile/client-report.js'

const source = JSON.parse(readFileSync(new URL('../docs/assessments/sources/asrs6/instrument-extraction.json',import.meta.url),'utf8'))
const digest = value => createHash('sha256').update(canonicalJSON(value)).digest('hex')
const answers = values => Object.fromEntries(values.map((value,i)=>[`asrs6.${String(i+1).padStart(2,'0')}`,value]))
const score = (values,language='en') => scoreAssessment(getAssessmentDefinition('asrs-6','v1',language),answers(values), syntheticTraumaContext(getAssessmentDefinition('asrs-6','v1',language)))
const text = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('source-exact EN/RU six items, anchors, instructions, safety, attribution and immutable identities',()=>{
  assert.equal(ASRS6_DEFINITIONS.length,2)
  for(const d of ASRS6_DEFINITIONS){
    const l=source.locales[d.instrumentLocale]
    const {contentHash,...body}=d
    assert.equal(contentHash,'sha256:'+digest(body))
    assert.ok(Object.isFrozen(d.questions)&&Object.isFrozen(d.scoring.positiveMinimumResponse))
    assert.deepEqual(d.questions.map(q=>q.text),l.items)
    assert.deepEqual(d.responseAnchors,l.anchors)
    assert.equal(d.instructions,l.instructions)
    assert.equal(d.eligibilityText,l.eligibility)
    assert.equal(d.printedScoringText,l.printed_scoring_text)
    assert.equal(d.safetyText,l.safety_text)
    assert.equal(d.requiredSiteAttribution,source.required_site_attribution)
    assert.equal(d.source.minimumAge,18)
    assert.equal(d.timeframe,'past-6-months')
    assert.equal(d.scoringKey,'asrs-v1-6-classic')
    assert.deepEqual(d.scoring.positiveMinimumResponse,[2,2,2,3,3,3])
    assert.deepEqual(d.questions.map(q=>q.shadedFrom),[2,2,2,3,3,3])
    assert.equal(d.scoring.positiveScreenMinimum,4)
    assert.equal(d.questions.length,6)
    assert.ok(d.questions.every(q=>q.required===true))
    assert.equal(d.suggestedRepeatDays,null)
    const pdf=readFileSync(new URL('../docs/assessments/sources/asrs6/'+l.file,import.meta.url))
    assert.equal(createHash('sha256').update(pdf).digest('hex'),d.source.masterSha256)
  }
  assert.equal(ASRS6_DEFINITIONS[0].id,'7d84b0f8-027a-5992-a752-27133aa897ea')
  assert.equal(ASRS6_DEFINITIONS[1].id,'132782f6-fe16-5d66-956c-ea47596f085a')
  assert.match(ASRS6_DEFINITIONS[1].source.languageNote,/Exact-version Russian validation was not established/)
})

test('independently source-derived 60 EN/RU item-response cells and classic-vs-continuous fork',()=>{
  const expected=[[0,0,1,1,1],[0,0,1,1,1],[0,0,1,1,1],[0,0,0,1,1],[0,0,0,1,1],[0,0,0,1,1]]
  for(const language of ['en','ru']){
    for(let item=0;item<6;item++)for(let answer=0;answer<=4;answer++){
      const fixture=Array(6).fill(0);fixture[item]=answer
      const result=score(fixture,language)
      assert.equal(result.dimensions.length,1)
      assert.equal(result.dimensions[0].value,expected[item][answer],`${language} item${item+1} response${answer}`)
    }
    for(const fixture of source.synthetic_test_fixtures.filter(f=>f.classic_count!==null)){
      const r=score(fixture.responses,language)
      assert.equal(r.dimensions[0].value,fixture.classic_count)
      const band=interpretationForDimension(r,r.dimensions[0],language)
      assert.equal(band.recommendedReview,fixture.positive)
      assert.equal(band.basis,'screening')
    }
  }
})

test('all six valid answers required, including zero; missing/null never become zero and invalid types never score',()=>{
  for(const d of ASRS6_DEFINITIONS){
    const complete=answers([0,0,0,0,0,0])
    assert.equal(Object.keys(validateAnswers(d,complete)).length,6)
    for(const q of d.questions){
      const missing={...complete};delete missing[q.id]
      assert.throws(()=>scoreAssessment(d,missing, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
      assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:null}, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
      assert.equal(Object.keys(validateAnswers(d,missing,{requireComplete:false})).length,5)
      for(const invalid of [-1,5,.5,'0',false,NaN,Infinity])assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:invalid}, syntheticTraumaContext(d)),/INVALID_ANSWER/)
    }
    assert.throws(()=>scoreAssessment(d,answers([2,2,2,3,0,null]), syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
    assert.throws(()=>scoreAssessment(d,{...complete,extra:0}, syntheticTraumaContext(d)),/UNKNOWN_FIELD/)
    assert.throws(()=>scoreAssessment({...d,title:'changed'},complete, syntheticTraumaContext({...d,title:'changed'})),/INVALID_PROVENANCE/)
  }
})

test('one separate ASRS6 catalog entry supports EN/RU filters, persistent selection and run definition without activating 18Q',()=>{
  assert.equal(MONITORING_CATALOG.filter(c=>c.key==='asrs-6').length,1)
  assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,150)
  for(const locale of ['en','ru'])for(const audience of ['guest','account']){
    const entries=buildExplorerEntries({locale,audience})
    const matches=entries.filter(e=>e.key==='asrs-6')
    assert.equal(matches.length,1)
    const entry=matches[0]
    assert.ok(entry.startable&&entry.selectable)
    assert.equal(entry.definition.instrumentLocale,locale)
    assert.ok(filterExplorerEntries(entries,{availability:'available',styles:['professional'],language:'bilingual'}).some(e=>e.key==='asrs-6'))
    const intent=makeTestSelectionIntent(['asrs-6'],1000000)
    assert.deepEqual(readTestSelectionIntent(intent,1000100).keys,['asrs-6'])
    const plan=validateTestPlanInput({items:[{definitionKey:'asrs-6',definitionVersion:'v1',instrumentLocale:locale}],operationId:randomUUID()},{audience})
    assert.equal(plan.definitionIds[0],entry.definition.id)
    assert.deepEqual(appendSavedTestIds(plan.definitionIds,plan.definitionIds),plan.definitionIds)
    const full=entries.find(e=>e.key==='asrs-v1-18')
    assert.equal(full.selectable,false);assert.equal(full.startable,false);assert.equal(full.definition,null)
    assert.throws(()=>getAssessmentDefinition('asrs-v1-18','v1',locale),/UNKNOWN_INSTRUMENT/)
    assert.throws(()=>getAssessmentDefinition('asrs-5','v1',locale),/UNKNOWN_INSTRUMENT/)
  }
})

test('all counts yield only two source-backed screening interpretations with exact provenance and honest language status',()=>{
  for(const language of ['en','ru'])for(const locale of ['en','ru'])for(let count=0;count<=6;count++){
    const result=score([2,2,2,3,3,3].map((v,i)=>i<count?v:0),language)
    const report=buildAssessmentResultReport(result,locale),section=report.sections[0]
    assert.equal(report.sections.length,1)
    assert.equal(section.bandBasis,'screening')
    assert.equal(section.recommendedReview,count>=4)
    assert.ok(section.steps.length>=2)
    assert.doesNotMatch(section.band,/mild|moderate|severe|lower part|middle|upper part|лёгк|умерен|тяжёл|части шкалы/i)
    assert.match(section.meaning,locale==='ru'?/не (устанавливает|является).*диагноз|не диагноз/:/not.*diagnos|does not.*diagnos/i)
    assert.ok(report.instrumentText)
    assert.equal(report.instrumentText.printedScoringText,source.locales[language].printed_scoring_text)
    assert.equal(report.instrumentText.safetyText,source.locales[language].safety_text)
    assert.equal(report.instrumentText.requiredSiteAttribution,source.required_site_attribution)
    if(language==='ru')assert.match(report.contextNote,locale==='ru'?/не подтвержден|не установлена/:/unverified|not (been )?established/i)
    for(const key of Object.keys(provenance(ASRS6_DEFINITIONS.find(d=>d.instrumentLocale===language)))){
      const malformed={...result,[key]:'wrong'}
      assert.equal(interpretationForDimension(malformed,result.dimensions[0],locale).basis,'unavailable',key)
    }
    for(const patch of [{value:.5},{max:24},{min:1},{unit:'points'},{timeframe:'today'},{key:'other'},{displayKind:'continuous'}])
      assert.equal(interpretationForDimension(result,{...result.dimensions[0],...patch},locale).basis,'unavailable')
  }
})

test('Insights, all scales and profile show discrete count, never favorable gauge, severity percentage or course deficiency',()=>{
  for(const locale of ['en','ru']){
    const guide=getTestScaleGuide('asrs-6',locale)
    assert.equal(guide.scales.length,1)
    assert.equal(guide.scales[0].axis,'focus')
    assert.equal(guide.scales[0].canChooseSkill,false)
    assert.equal(guide.scales[0].skill,null)
    assert.equal(guide.scales[0].bands.rows.length,2)
    assert.deepEqual(guide.skillAxes,[])
    assert.equal(guide.suggestedRepeatDays,null)
    const result={...score([2,2,2,3,0,0],locale),id:'synthetic',accountId:'synthetic-account',measurementAt:'2026-10-12T20:00:00Z'}
    const d=result.dimensions[0],display=gaugeModel(d,result)
    assert.equal(display.displayKind,'screening-count')
    assert.equal(display.fraction,null)
    assert.equal(display.rawFraction,null)
    assert.equal(display.screenPositive,true)
    assert.equal(normalizeDimension(d),null)
    assert.equal(scorePortraitDimension(d),null)
    const previous={...result,id:'prior',measurementAt:'2026-10-11T20:00:00Z',dimensions:[{...d,value:3}]}
    assert.equal(gaugeChange(result,previous,d.key).state,'changed')
    const view=buildProfileAssessmentView({results:[result]},locale)
    assert.equal(view.measured[0].ratio,null)
    assert.equal(view.measured[0].displayKind,'screening-count')
    const course=courseMeasuredProfile({results:[result],testKeys:['asrs-6'],locale,now:Date.parse('2026-10-12T21:00:00Z')})
    assert.equal(course.scales[0].eligible,false)
    assert.equal(course.scales[0].priorityPercent,null)
    assert.equal(course.eligible.length,0)
    assert.deepEqual(courseSuggestedFocus(course),[])
    assert.equal(goalForChosenScale('asrs-6::'+d.key,locale),null)
    const client=buildClientReport({results:[previous,result],locale,now:new Date('2026-10-12T21:00:00Z')})
    assert.equal(client.counts.tests,1);assert.equal(client.counts.attempts,2)
    assert.equal(client.tests[0].dimensions[0].value,4)
    assert.equal(client.tests[0].interpretation.sections[0].bandBasis,'screening')
  }
})

test('source-backed runner and report wiring preserve adult guard, accessible shading, timeframe and immutable technical registration',()=>{
  const account=text('components/app/app-workspace.jsx'),guest=text('components/app/cabinet-landing.jsx')
  for(const runner of [account,guest]){
    assert.match(runner,/<Asrs6SourceNotice/)
    assert.match(runner,/<Asrs6ChoiceMarker/)
    assert.match(runner,/asrs6ChoiceClass\(definition, question,/)
  }
  assert.match(account,/def\?\.timeframe === 'past-6-months'/)
  assert.match(text('lib/app/guest-repository.js'),/input.adult !== true/)
  assert.match(text('lib/app/repository.js'),/input.adult !== true/)
  for(const path of ['lib/app/repository.js','lib/app/guest-repository.js']){
    const code=text(path)
    assert.match(code,/row.content_hash !== definition.contentHash/)
    assert.match(code,/canonicalJSON\(row.definition\) !== canonicalJSON\(definition\)/)
    assert.match(code,/INSTRUMENT_UNAVAILABLE/)
  }
  const sql=text('supabase/migrations/20261012202000_hh_asrs6_nyu_classic.sql')
  assert.deepEqual(JSON.parse(sql.split('$asrs6$')[1]),ASRS6_DEFINITIONS)
  assert.match(sql,/on conflict \(id\) do nothing/)
  assert.match(sql,/id is distinct from \(d->>'id'\)::uuid/)
  assert.match(sql,/content_hash is distinct from d->>'contentHash'/)
  assert.match(sql,/definition is distinct from d/)
  assert.doesNotMatch(sql,/^\s*(update app\.|delete from|alter table|create policy|grant )/im)
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
  const newerIDs=new Set(ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(d=>d.id))
  const historicalDefinitions=ASSESSMENT_DEFINITIONS.filter(d=>!TANTRIC_REFLECTION_KEYS.includes(d.key) && !newerIDs.has(d.id))
  const beforeSplit=historicalDefinitions.filter(d=>!splitV2Ids.has(d.id)&&!bachV2Ids.has(d.id))
  assert.equal(beforeSplit.length,210)
  assert.equal(digest(beforeSplit),'2eaa644a6c1d3db5c1a661ce9b9d180a7cc420b54cbe9d0dfe2a6561851efc36')
  const prior=historicalDefinitions.filter(d=>!splitV2Ids.has(d.id)&&!bachV2Ids.has(d.id)).filter(d=>!['ipip-via-r-strengths-96','cfpb-financial-wellbeing-5'].includes(d.key)).filter(d=>!['pcl-5','itq-adult'].includes(d.key)).filter(d=>!(d.key==='gad-7'&&d.instrumentLocale==='ru')).filter(d=>!newViaIds.has(d.id)).filter(d=>!['ipip-cognitive-failures-10','ipip-optimism-10','ipip-attending-to-emotions-10','ipip-locus-of-control-internality-10','ipip-locus-of-control-powerful-others-10','ipip-locus-of-control-chance-10','ipip-positive-expressivity-9','ipip-negative-expressivity-10'].includes(d.key)).filter(d=>d.key!=='asrs-6')
  assert.equal(prior.length,178)
  assert.equal(digest(prior),'a6c1b0cca75863dc951a02003aa914437dff637d9dd61f9f0dc36925b40e12c0')
})

test('synthetic history/snapshot retain zero, count display identity and reject fractional or stripped display results',async()=>{
  const {validateResult,createProfileSnapshot}=await import('../lib/profile/history.js')
  const accountId=randomUUID()
  const result={...score([0,0,0,0,0,0]),id:randomUUID(),accountId,measurementAt:'2026-10-12T20:00:00Z'}
  assert.equal(validateResult(result),result)
  const snapshot=createProfileSnapshot({id:randomUUID(),accountId,generatedResult:result,createdAt:'2026-10-12T20:00:01Z'})
  assert.equal(snapshot.dimensions[0].value,0)
  assert.equal(snapshot.dimensions[0].displayKind,'screening-count')
  assert.equal(normalizeDimension(snapshot.dimensions[0]),null)
  assert.throws(()=>validateResult({...result,dimensions:[{...result.dimensions[0],value:.5}]}),/INVALID_RESULT/)
  assert.throws(()=>validateResult({...result,dimensions:[{...result.dimensions[0],displayKind:undefined}]}),/INVALID_RESULT/)
  const invalid=buildClientReport({results:[{...result,contentHash:'tampered'}],locale:'en'})
  assert.equal(invalid.tests.length,1)
  assert.equal(invalid.tests[0].interpretation.verified,false)
  assert.equal(invalid.tests[0].dimensions[0].value,result.dimensions[0].value)
  assert.ok(invalid.verificationWarnings.length)
})

test('three-run Psi-Monitoring patterns stay higher/lower/unchanged, never improvement or decline',async()=>{
  const {deterministicPatterns}=await import('../lib/assessments/monitoring.js')
  for(const locale of ['en','ru'])for(const [counts,expected] of [[[2,3,4],'higher'],[[4,3,2],'lower'],[[3,4,3],'unchanged']]){
    const accountId=randomUUID()
    const results=counts.map((count,index)=>({...score([2,2,2,3,3,3].map((v,i)=>i<count?v:0),locale),id:randomUUID(),accountId,measurementAt:`2026-10-${10+index}T20:00:00Z`}))
    const patterns=deterministicPatterns({results,locale})
    assert.equal(patterns.length,1)
    assert.equal(patterns[0].state,expected)
    assert.equal(patterns[0].count,3)
    assert.ok(!['improving','declining'].includes(patterns[0].state))
  }
  const ui=text('components/app/psi-monitoring.jsx')
  assert.match(ui,/unchanged: 'unchanged screening count'/)
  assert.match(ui,/unchanged: 'скрининговый подсчёт не изменился'/)
})

test('Advanced charts and all-scale MetricCard explicitly omit ASRS percentage bars without null-to-zero coercion',()=>{
  const ui=text('components/app/app-workspace.jsx')
  const advanced=ui.slice(ui.indexOf('function ProfileOverview('),ui.indexOf('function MetricCard('))
  assert.match(advanced,/profileScreeningPresentation\(row, results, locale\)/)
  assert.match(advanced,/row\.screening \? \(/)
  assert.match(advanced,/Number\.isFinite\(row.currentPercent\) \? <div/)
  assert.doesNotMatch(advanced,/row.currentPercent \|\| 0/)
  assert.match(advanced,/ASRS screening count is shown separately without a percentage bar/)
  assert.match(advanced,/Скрининговый подсчёт ASRS показан отдельным числом без процентной полосы/)
  const metric=ui.slice(ui.indexOf('function MetricCard('),ui.indexOf('function Portrait('))
  assert.match(metric,/dimension\.displayKind === 'screening-count' \|\| dimension\.key === 'symptoms\.asrs6\.shaded_count'/)
  assert.match(metric,/data-screening-count/)
  assert.match(metric,/: <span className="hh-meter"/)
})

test('history titles use the exact catalog instrument instead of a generic Personality label',async()=>{
  const {assessmentHistoryTitle}=await import('../lib/assessments/personal-guidance.js')
  const item=MONITORING_CATALOG.find(c=>c.key==='asrs-6')
  for(const locale of ['en','ru']){
    const result=score([0,0,0,0,0,0],locale)
    assert.equal(assessmentHistoryTitle(result,locale),item.title[locale])
    assert.doesNotMatch(assessmentHistoryTitle(result,locale),/Personality|Личностные особенности/i)
    assert.equal(assessmentHistoryTitle({definitionKey:'unknown-test'},locale),'unknown-test')
  }
  const timeline=text('components/app/app-workspace.jsx').split('function HistoryView(')[1]
  assert.match(timeline,/title: assessmentHistoryTitle\(r, locale\)/)
  assert.doesNotMatch(timeline,/title: r.definitionKey[^\n]*c.personality/)
})


test('actual course-completion summary renders ASRS counts without a meter in EN/RU and preserves ordinary scales',()=>{
  for(const locale of ['en','ru'])for(const count of [0,3,4,6]){
    const result={...score([2,2,2,3,3,3].map((v,i)=>i<count?v:0),locale),id:'synthetic-course-asrs',accountId:'synthetic-account',measurementAt:'2026-10-12T20:00:00Z'}
    const profile=courseMeasuredProfile({results:[result],testKeys:['asrs-6'],locale,now:Date.parse('2026-10-12T21:00:00Z')})
    assert.equal(profile.scales[0].type,'screening_count')
    assert.deepEqual(courseSuggestedFocus(profile),[])
    const html=execFileSync(process.execPath,[new URL('./helpers/render-course-summary.mjs',import.meta.url).pathname],{
      input:JSON.stringify({profile,locale}),encoding:'utf8',maxBuffer:1024*1024,
    })
    assert.match(html,/data-course-screening-count/)
    assert.match(html,/data-course-screening-scale="true"/)
    assert.doesNotMatch(html,/<meter\b/)
    assert.match(html,new RegExp('<strong>'+count+'<small> / 0–6</small></strong>'))
    assert.match(html,locale==='ru'?/не измеряет тяжесть или ежедневный прогресс/:/does not measure severity or daily progress/)
    assert.match(html,locale==='ru'?/не диагноз/:/not diagnosis/)
    assert.doesNotMatch(html,/data-course-use-suggested/)
  }
  assert.match(text('components/app/course-r3-steps.module.css'),/\[data-course-screening-count\]\{grid-column:1 \/ -1;grid-row:2\}/)
  const ordinary={scales:[{id:'hh-weekly-pulse::weekly.tension',testKey:'hh-weekly-pulse',label:'Tension',score:7,min:0,max:10,type:'reported_difficulty',eligible:true,priorityPercent:70,resultId:'synthetic-weekly'}],eligible:[],priority:[]}
  const html=execFileSync(process.execPath,[new URL('./helpers/render-course-summary.mjs',import.meta.url).pathname],{input:JSON.stringify({profile:ordinary,locale:'en'}),encoding:'utf8',maxBuffer:1024*1024})
  assert.match(html,/<meter min="0" max="10" value="7"/)
  assert.doesNotMatch(html,/data-course-screening-count/)
})
