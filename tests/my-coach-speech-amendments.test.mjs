import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeSpeechAmendments,addSpeechAmendment,speechAmendmentsExtend,speechPersonalCorrection,speechAmendmentsByPosition} from '../lib/personal-coaching/speech-amendments.mjs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs'
import {normalizeMyCoachDraft,draftTranscriptPrefix} from '../lib/personal-coaching/protocol-draft.mjs'
const id='8afbf841-49a0-46e1-b5c1-124a116efa28',other='8afbf841-49a0-46e1-b5c1-124a116efa29'
const turns=[{role:'assistant',content:'Как вы себя чувствуете?'},{role:'assistant',content:'Что вызвало усталость?'}]
const event={id:other,sessionId:id,afterTurnCount:1,raw:'postawszym',text:'Уставшим',source:'client_confirmed',confirmedAt:'2026-11-27T20:00:00.000Z'}
const p={id,personaId:'mira',locale:'ru',courseSessionId:'introductory',turnLayout:'chronological',startedAt:'2026-11-27T19:50:00.000Z',completedAt:'2026-11-27T20:00:00.000Z',turns}
test('explicit correction stays outside original turn history and retains session scope',()=>{
 const a=addSpeechAmendment([],event,turns,id)
 assert.deepEqual(a,[event]);assert.deepEqual(addSpeechAmendment(a,event,turns,id),a)
 for(const patch of [{sessionId:other},{afterTurnCount:3},{source:'machine'},{text:''},{confirmedAt:'bad'}])assert.throws(()=>normalizeSpeechAmendments([{...event,...patch}],turns,id))
 const n=normalizeMyCoachProtocol({...p,speechAmendments:a})
 assert.deepEqual(n.turns,turns);assert.deepEqual(n.speechAmendments,a)
 const d=normalizeMyCoachDraft({courseSessionId:'introductory',protocol:n})
 assert.deepEqual(d.protocol.speechAmendments,a)
 const entries=myCoachProtocolPdfOptions(n,{documentKind:'transcript'}).entries
 assert.equal(entries.length,3)
 assert.match(entries[0].answer,/Как вы себя/)
 assert.equal(entries[1].answer,'Уставшим')
 assert.match(entries[1].question,/postawszym/)
 assert.match(entries[2].answer,/Что вызвало/)
})
test('draft prefix allows append-only corrections but never deletion or edits',()=>{
 const a=normalizeMyCoachProtocol(p),b=normalizeMyCoachProtocol({...p,speechAmendments:[event]})
 assert.equal(draftTranscriptPrefix(a,b),true);assert.equal(draftTranscriptPrefix(b,a),false)
 assert.equal(speechAmendmentsExtend(b,{...b,speechAmendments:[{...event,text:'changed'}]}),false)
 assert.equal(draftTranscriptPrefix(b,{...b,turns:[{...turns[0],content:'changed'},turns[1]]}),false)
})

test('same-session same-language personal suggestion never picks conflicting corrections',()=>{
 const a={...event,locale:'ru'}
 assert.equal(speechPersonalCorrection([a],turns,id,'POSTAWSZYM','ru'),'Уставшим')
 assert.equal(speechPersonalCorrection([event],turns,id,'postawszym','ru'),'')
 assert.equal(speechPersonalCorrection([a],turns,id,'postawszym','en'),'')
 assert.equal(speechPersonalCorrection([a],turns,other,'postawszym','ru'),'')
 assert.equal(speechPersonalCorrection([a,{...a,id:'8afbf841-49a0-46e1-b5c1-124a116efa30',text:'Сосредоточенным'}],turns,id,'postawszym','ru'),'')
 assert.throws(()=>addSpeechAmendment([a],{...a,text:'other'},turns,id),/SPEECH_AMENDMENT_CONFLICT/)
 assert.deepEqual(addSpeechAmendment([a],{...a,confirmedAt:'2026-11-27T20:00:01.000Z'},turns,id),[a])
})

test('confirmed corrections display in chronological positions, not confirmation order or course evidence',()=>{
 const first={...event,id:'8afbf841-49a0-46e1-b5c1-124a116efa30',afterTurnCount:0,raw:'before',text:'first'}
 const last={...event,id:'8afbf841-49a0-46e1-b5c1-124a116efa31',afterTurnCount:2,raw:'after',text:'last'}
 const rows=[last,event,first]
 const normalized=normalizeMyCoachProtocol({...p,speechAmendments:rows})
 const positions=speechAmendmentsByPosition(normalized)
 assert.deepEqual([...positions.get(0)],[first])
 assert.deepEqual([...positions.get(1)],[event])
 assert.deepEqual([...positions.get(2)],[last])
 assert.deepEqual(normalized.speechAmendments,rows)
 assert.deepEqual(normalized.turns,turns)
 for(const locale of ['ru','en','es']){
  const entries=myCoachProtocolPdfOptions(normalized,{documentKind:'transcript',locale}).entries
  assert.equal(entries[0].answer,'first')
  assert.equal(entries[2].answer,'Уставшим')
  assert.equal(entries[4].answer,'last')
  assert.match(entries[2].question,/postawszym/)
 }
 const oldPair=normalizeMyCoachProtocol({...p,turnLayout:undefined,turns:[{role:'user',content:'before'},{role:'assistant',content:'after'}],speechAmendments:[event]})
 const entries=myCoachProtocolPdfOptions(oldPair,{documentKind:'transcript'}).entries
 assert.equal(entries.length,3)
 assert.match(entries[0].question,/before/)
 assert.equal(entries[1].answer,'Уставшим')
 assert.match(entries[2].answer,/after/)
})
