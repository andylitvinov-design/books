import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {ASSESSMENT_DEFINITIONS} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {HH_FIVE_BLOCK_ACTIONS} from '../data/assessments/hh-five-block-actions-2026.js'
import {resolveStoredInterpretation,STORED_INTERPRETATION_VERSION} from '../lib/assessments/stored-interpretation.js'
import {insightScaleOrder} from '../lib/assessments/insight-scale-order.js'
import {SUPPORT_GOAL_IDS} from '../lib/assessments/course-targets.js'
import {TRACKS} from '../lib/inner-growth/lesson-library.js'
const rows=JSON.parse(gunzipSync(readFileSync(new URL('../data/assessment-interpretations/'+STORED_INTERPRETATION_VERSION+'.json.gz',import.meta.url)))).records
const sample=(d,n=0)=>scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,n? q.max??d.answerScale.max:q.min??d.answerScale.min])))
const active=MONITORING_CATALOG.filter(c=>c.startable)
test('every runnable key has five prepared blocks, one standalone support suggestion, sources and next step',()=>{
 assert.equal(new Set(active.map(c=>c.key)).size,109)
 const seen=new Set()
 for(const row of rows){const d=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.definitionId);for(const endpoint of [0,1]){
  const r=resolveStoredInterpretation(sample(d,endpoint),row.payload,row.uiLocale,row.payloadHash)
  assert.equal(r.status,'available',d.key);seen.add(d.key)
  assert.equal(r.presentation.labels.length,5);assert.match(r.presentation.labels[4],/About this test|Об этом тесте/)
  for(const s of r.sections){assert.ok(s.compact.status&&s.compact.meaning&&s.compact.recommendation&&s.compact.nextStep,d.key+'/'+s.key)
   assert.doesNotMatch(s.compact.status,/middle part|upper part|lower part|средн\w+ част|верхн\w+ част|нижн\w+ част/iu)
   assert.doesNotMatch(s.compact.nextStep,/^This is not|^Это не|undefined|NaN/)
   if(s.compact.course)assert.ok(SUPPORT_GOAL_IDS.includes(s.compact.course.goalId))
  }
 }}
 for(const c of active)assert.ok(seen.has(c.key),c.key)
})
test('specific meanings and recommendations cannot borrow unrelated clinical domains',()=>{
 for(const key of ['erq','rses-10','scs-sf','compassion-scale','mhc-sf','hh-inner-imagery','hh-money-pressure']){
  const row=rows.find(r=>r.payload.identity.definitionKey===key&&r.uiLocale==='en');assert.ok(row,key)
  const d=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.definitionId),r=resolveStoredInterpretation(sample(d),row.payload,'en',row.payloadHash)
  for(const s of r.sections)assert.doesNotMatch(s.compact.nextStep,/depress|workplace diagnosis|quality of the relationship/i,key)
  if(key==='erq')assert.ok(r.sections.every(s=>/higher mean/.test(s.compact.meaning)))
  if(key==='scs-sf')assert.match(r.sections[0].compact.meaning,/self-compassion/)
  if(key==='hh-money-pressure')assert.match(r.sections[0].compact.nextStep,/factual question/)
  if(key==='hh-inner-imagery')assert.doesNotMatch(r.sections[0].compact.nextStep,/self-worth/)
 }
 assert.equal(Object.keys(HH_FIVE_BLOCK_ACTIONS).length,93)
 for(const key of ['state.problem_intensity','state.tension'])for(const locale of ['en','ru'])assert.doesNotMatch(HH_FIVE_BLOCK_ACTIONS[key][locale].nextStep,/Try the chosen|After the pause|Попробуйте выбранное|После паузы/)
})
test('malformed five-block and course payloads fail closed, including Bach',()=>{
 for(const key of ['cbi-personal','hh-bach-flower-profile']){
  const row=rows.find(r=>r.payload.identity.definitionKey===key&&r.uiLocale==='en'),d=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.definitionId),result=sample(d)
  const mutateCompact=(p,fn)=>{if(p.kind==='bach'){fn(p.scales[0].compactZero);fn(p.scales[0].compactMarked)}else {fn(p.scales[0].base.compact);for(const c of p.scales[0].cases)if(c.delta.compact)fn(c.delta.compact)}}
  for(const mutate of [p=>{p.report.presentation.about.context={bad:true}},p=>{p.report.presentation.about.languageNote=[]},p=>mutateCompact(p,c=>{c.referralIncluded='true'}),p=>{delete p.report.presentation.course},p=>{p.report.presentation.course.path='https://example.com'},p=>{p.report.presentation.course.infoPath='/app/settings'},p=>{delete p.report.presentation.scaleChoiceLabel},p=>mutateCompact(p,c=>{delete c.recommendation}),p=>mutateCompact(p,c=>{c.course={goalId:'untrusted',matchScope:'related-general-practice',title:'x',description:'x'}})]){
   const payload=structuredClone(row.payload);mutate(payload);assert.equal(resolveStoredInterpretation(result,payload,'en',row.payloadHash).status,'unavailable',key)
  }
 }
})
test('Insights begins with lowest normalized position, keeps registry ties and never treats missing as zero',()=>{
 const ds=[{key:'first',value:5,min:0,max:10},{key:'second',value:2,min:1,max:7},{key:'tie',value:1,min:0,max:6},{key:'missing',value:null,min:0,max:10},{key:'invalid',value:-1,min:0,max:10}]
 assert.deepEqual(insightScaleOrder(ds).map(d=>d.key),['second','tie','first','missing','invalid']);assert.equal(ds[0].key,'first')
})
test('course handoff names only existing lesson tracks, preserves opt-in and has no scores or result ids in the URL',()=>{
 assert.deepEqual([...SUPPORT_GOAL_IDS].sort(),Object.keys(TRACKS).sort())
 for(const values of Object.values(TRACKS))assert.ok(values.length)
 const ui=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8'),course=readFileSync(new URL('../components/app/my-course.jsx',import.meta.url),'utf8')
 assert.match(ui,/\?support=/);assert.doesNotMatch(ui,/encodeURIComponent\(result\.(id|value)/)
 assert.match(course,/disabled=\{!optIn \|\| busy\}/);assert.match(course,/act\('start', \{ consent: true \}\)/)
 const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8');assert.match(workspace,/sessionStorage.removeItem\('hh-pending-course-goal'\)/);assert.match(workspace,/if \(validSupportGoal\(goal\)\) router.replace/)
})

test('CBI attribution remains visible in About and the PDF content path',()=>{
 for(const row of rows.filter(r=>r.payload.identity.definitionKey.startsWith('cbi-'))){assert.match(row.payload.report.presentation.about.evidence,/Borritz.*2006.*PUMA/)}
 const pdf=readFileSync(new URL('../lib/profile/client-report-pdf.js',import.meta.url),'utf8');assert.match(pdf,/p.about.evidence/)
})


test('report topic handoff preserves canonical six-step R3 enrollment without reviving obsolete local goals',()=>{
 const course=readFileSync(new URL('../components/app/my-course.jsx',import.meta.url),'utf8')
 assert.match(course, /<CourseR3Steps/)
 assert.match(course, /progress max=\{6\}/)
 assert.match(course, /data-requested-support-topic=\{requestedGoal\}/)
 assert.match(course, /You choose tests and directions in the course steps/)
 assert.doesNotMatch(course, /setGoals|setFocusTags|Choose this direction/)
})
