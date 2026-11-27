import test from 'node:test'
import assert from 'node:assert/strict'
import {projectCoachPreconsultation,formatCoachPreconsultation,COACH_PRECONSULTING_GUIDANCE,projectCoachReviewedFields,coachReviewedFieldContext} from '../lib/coaching/coach-preconsulting.mjs'
import {projectCoachPriorSessions} from '../lib/coaching/coach-staged-memory.mjs'
import {coachLiveMemoryNote} from '../lib/coaching/coach-live-memory-note.mjs'
import {coachOpeningProgress,coachOpeningNextReply} from '../lib/coaching/coach-opening-protocol.mjs'
import {withCoachContext} from '../lib/coaching/context-cloud-messages.mjs'
const record={provenance:'client_reviewed_dialogue',completedAt:'2026-11-22T10:00:00.000Z',opening:{name:'Анна'},goal:'Рабочие границы',clientSummary:'Известный контекст',clientNextStep:'Обсудить расписание'}
test('only reviewed records; a next step outcome is unknown, not automatically unfinished',()=>{
 assert.equal(projectCoachPreconsultation({...record,provenance:'draft'}),null)
 const data=projectCoachPreconsultation(record)
 assert.equal(data.checkStep,true)
 assert.deepEqual(data.notRecorded,[])
 assert.match(formatCoachPreconsultation(data),/Check agreed step outcome/)
 assert.equal(projectCoachPreconsultation({...record,clientNextStep:''}),null)
})
test('latest reviewed session, not oldest or unreviewed draft, supplies the advisory',()=>{
 const old={...record,completedAt:'2026-11-01T10:00:00.000Z',clientNextStep:''}
 const draft={...record,completedAt:'2026-11-24T10:00:00.000Z',provenance:'draft'}
 assert.equal(projectCoachPriorSessions([old,draft,record]).preconsultation.checkStep,true)
})
test('pending consented Live lookup carries topic only; full follow-up only on previous choice',()=>{
 const prior=projectCoachPriorSessions([record])
 const pending=coachLiveMemoryNote({prior,priorAllowed:true,continuity:'pending'})
 assert.match(pending,/Рабочие границы/)
 assert.doesNotMatch(pending,/Обсудить расписание|Check agreed step outcome/)
 assert.doesNotMatch(coachLiveMemoryNote({prior,priorAllowed:true,continuity:'new'}),/Рабочие границы/)
 assert.equal(coachLiveMemoryNote({prior,priorAllowed:false,continuity:'previous'}),'')
 const note=coachLiveMemoryNote({prior,priorAllowed:true,continuity:'previous'})
 assert.match(note,/Check agreed step outcome/)
 assert.match(note,/Обсудить расписание/)
})
test('returning opening mentions actual prior topic only once at continuity; no implied timer consent',()=>{
 const input={locale:'ru',turns:['Да','Да'],allowPrior:true,priorSession:{name:'Анна',topic:'Рабочие границы'}}
 const p=coachOpeningProgress(input)
 assert.equal(p.current,'continuity')
 assert.equal(p.completed,false)
 assert.match(coachOpeningNextReply(p),/Рабочие границы/)
 assert.doesNotMatch(coachOpeningNextReply({...p,attempts:1}),/Рабочие границы/)
 assert.doesNotMatch(coachOpeningNextReply(coachOpeningProgress({...input,allowPrior:false})),/Рабочие границы/)
})
test('text model uses the same adaptive gap instruction and preserves the latest turn',()=>{
 const turns=[{role:'user',content:'Я уже это объясняла'}]
 const snapshot={version:2,purpose:'coaching_dialogue',items:[{kind:'preconsulting',sourceKind:'reviewed_coaching_protocol',text:'Not verified: frequency'}]}
 const result=withCoachContext(turns,snapshot)
 assert.equal(result.at(-1),turns[0])
 assert.match(result.at(-3).content,/ONE useful missing-detail question/)
 assert.match(COACH_PRECONSULTING_GUIDANCE,/Never repeat a known answer/)
 assert.equal(withCoachContext(turns,{...snapshot,items:[{...snapshot.items[0],sourceKind:'saved_life_plan'}]}),turns)
})

test('historical field memory is literal, reviewed and bounded; never a current answer',()=>{
 const quote='I need a more predictable schedule.'
 const protocol={...record,locale:'en',courseSessionId:'clarity_discover',
  turns:[{role:'user',content:quote},{role:'assistant',content:'What is important?'},{role:'user',content:'PRIVATE UNREVIEWED'}],
  courseFieldReview:{version:'hh-coach-course-review-v1',courseSessionId:'clarity_discover',events:[{fieldId:'needs',status:'confirmed',turnIndex:0,quote,revision:1}]}}
 const projection=projectCoachReviewedFields(protocol)
 assert.equal(projection.fields.length,1)
 assert.equal(projection.fields[0].answer,quote)
 assert.equal(projectCoachReviewedFields({...protocol,provenance:'draft'}),null)
 assert.equal(projectCoachReviewedFields({...protocol,courseFieldReview:null}),null)
 assert.equal(projectCoachReviewedFields({...protocol,turns:[{role:'user',content:'different quote'}]}),null)
 const items=coachReviewedFieldContext(projection)
 assert.equal(items.length,1);assert.match(items[0].text,/Historical reviewed answer/)
 assert.doesNotMatch(JSON.stringify(projectCoachPriorSessions([protocol])),/PRIVATE UNREVIEWED/)
 assert.doesNotMatch(coachLiveMemoryNote({prior:projectCoachPriorSessions([protocol]),priorAllowed:true,continuity:'previous'}),/more predictable schedule/)
 assert.deepEqual(coachReviewedFieldContext({...projection,source:'draft'}),[])
})
