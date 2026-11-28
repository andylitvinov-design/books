import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeSpeechAmendments,addSpeechAmendment,speechAmendmentsExtend} from '../lib/personal-coaching/speech-amendments.mjs'
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
 assert.equal(myCoachProtocolPdfOptions(n,{documentKind:'transcript'}).entries.at(-1).answer,'Уставшим')
})
test('draft prefix allows append-only corrections but never deletion or edits',()=>{
 const a=normalizeMyCoachProtocol(p),b=normalizeMyCoachProtocol({...p,speechAmendments:[event]})
 assert.equal(draftTranscriptPrefix(a,b),true);assert.equal(draftTranscriptPrefix(b,a),false)
 assert.equal(speechAmendmentsExtend(b,{...b,speechAmendments:[{...event,text:'changed'}]}),false)
 assert.equal(draftTranscriptPrefix(b,{...b,turns:[{...turns[0],content:'changed'},turns[1]]}),false)
})
