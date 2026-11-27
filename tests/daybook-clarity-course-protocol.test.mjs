import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityProtocolView,clarityDraftLog,claritySessionProtocol} from '../lib/coaching/clarity-course-protocol.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('only reviewed protocol from exact selected day, no hidden private fields',()=>{
 const record={id:'saved',courseSessionId:'clarity_day_1',personaId:'mira',savedAt:'2026-11-26T10:00:00Z',provenance:'client_reviewed_dialogue',secret:'x',turns:[{role:'user',content:'hello',private:'x'},{role:'assistant',content:'welcome',authorPersonaId:'caesar',interrupted:true,private:'x'}]}
 assert.equal(clarityProtocolView(record,2),null)
 assert.equal(clarityProtocolView({...record,provenance:'draft'},1),null)
 assert.equal(clarityProtocolView({...record,courseSessionId:'clarity_discover'},1),null)
 const view=clarityProtocolView(record,1)
 assert.deepEqual(view.turns,[{role:'user',content:'hello'},{role:'assistant',content:'welcome',personaId:'caesar',interrupted:true}])
 assert.equal(view.secret,undefined)
 assert.equal(view.day,1)
 assert.equal(clarityProtocolView({...record,turns:[{role:'assistant',content:'hi'}]},1).turns[0].personaId,'mira')
})
test('exact owner-scoped archive lookup and explicit lazy view',()=>{
 const route=read('app/api/app/clarity-course/protocol/route.js')
 const store=read('lib/app/personal-coaching.js')
 const ui=read('components/app/clarity-course-protocol.jsx')
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id'\)!==actor.id/)
 assert.match(route,/clarityProtocolView\(reviewed,day\)/)
 assert.match(route,/await readClarityRunDraft\(config,actor,id,day\)/)
 assert.match(route,/await readMyCoachProtocol\(config,actor,id\)/)
 assert.ok(route.indexOf('await readClarityRunDraft')<route.indexOf('await readMyCoachProtocol'))
 assert.match(route,/view:'summary',courseSessionId:clarityCourseId\(day\)/)
 assert.match(ui,/data-clarity-structured-protocol/)
 assert.match(ui,/data-clarity-dialogue-log/)
 assert.match(ui,/data-clarity-unfinished-protocols/)
 assert.match(store,/where account_id=\$1 and protocol_id=\$2/)
 assert.match(ui,/onClick=\{\(\)=>void open\(\)\}/)
 assert.match(ui,/AbortController/)
 assert.match(ui,/protocol\?\.id!==report\.id\|\|protocol\.day!==report\.day/)
})

import {CLARITY_DAY_ONE_VERSION,CLARITY_DAY_ONE_REVIEW_VERSION} from '../lib/coaching/clarity-day-one-scenario.mjs'
import {coachCourseProtocolSchema} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {checkpointConfirmation} from '../lib/coaching/coach-course-question-binding.mjs'
test('unfinished protocol is separately projected from the stored review, not from the browser or generated results',()=>{
 const courseSessionId='clarity_day_1',locale='en',updatedAt='2026-11-26T20:00:00Z'
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion:CLARITY_DAY_ONE_VERSION})
 const question=schema.checkpoints.find(r=>r.id==='situation').question,answer='I am looking for stable income'
 const turns=[{role:'assistant',content:question},{role:'user',content:answer,coachId:'mira',visitId:'visit-one'},{role:'assistant',content:checkpointConfirmation(question,answer,locale)},{role:'user',content:'Yes'},{role:'assistant',content:'Next question?',interrupted:true,authorPersonaId:'caesar'}]
 const review={version:CLARITY_DAY_ONE_REVIEW_VERSION,courseSessionId,events:[{fieldId:'situation',status:'confirmed',turnIndex:1,quote:answer,revision:1,binding:{questionTurnIndex:0,confirmationTurnIndex:3}}]}
 const record={id:'saved',courseSessionId,personaId:'mira',provenance:'client_autosaved_unreviewed_draft',turns,courseFieldReview:review,clientSummary:'Do not expose this generated result',private:'secret'}
 const opts={draftReview:review,scenarioVersion:CLARITY_DAY_ONE_VERSION,updatedAt}
 const view=claritySessionProtocol(record,1,locale,opts)
 assert.equal(view.reviewed,false);assert.equal(view.updatedAt,updatedAt)
 assert.equal(view.rows.find(r=>r.id==='situation').quote,answer);assert.equal(view.rows.find(r=>r.id==='situation').coachId,'mira')
 assert.equal(view.rows.find(r=>r.id==='situation').status,'confirmed')
 assert.equal(view.rows.find(r=>r.id==='outer_finance').status,'not_explored')
 assert.equal(view.rows.find(r=>r.id==='outer_finance').quote,'')
 assert.equal(view.clientSummary,undefined);assert.equal(view.private,undefined);assert.equal(view.events,undefined)
 assert.equal(claritySessionProtocol(record,2,locale,opts),null)
 assert.equal(claritySessionProtocol(record,1,locale,{scenarioVersion:CLARITY_DAY_ONE_VERSION,updatedAt}),null)
 assert.ok(claritySessionProtocol(record,1).rows.every(r=>r.status!=='confirmed'))
 assert.throws(()=>claritySessionProtocol({...record,turns:turns.slice(0,2)},1,locale,opts))
 const log=clarityDraftLog(record,1,updatedAt)
 assert.equal(log.reviewed,false);assert.equal(log.turns.length,turns.length);assert.equal(log.turns.at(-1).personaId,'caesar');assert.equal(log.turns.at(-1).interrupted,true)
 assert.equal(clarityDraftLog(record,3,updatedAt),null)
 const final=claritySessionProtocol({...record,provenance:'client_reviewed_dialogue',savedAt:updatedAt},1,locale)
 assert.equal(final.reviewed,true);assert.equal(final.rows.find(r=>r.id==='situation').quote,answer)
})
