import assert from 'node:assert/strict'
import {coachExplicitRecall,projectPrivateCoachRecall,privateCoachRecallText} from '../lib/coaching/coach-private-recall.mjs'
for(const [s,e] of [["Вспомни, на чём мы закончили",true],["Что мы обсуждали на прошлой сессии?",true],["Напомни, на чём остановились",true],["Where did we leave off?",true],["Remember our previous session",true],["¿En qué nos quedamos?",true],["Привет",false],["I remember my mother",false],["Вспомни упражнение",false],["Что мы будем делать сегодня?",false]])assert.equal(coachExplicitRecall(s),e,s)
const reviewed={provenance:'client_reviewed_dialogue',savedAt:'2026-11-25T12:00:00Z',completedAt:'2026-11-25T11:00:00Z',goal:'Work',clientSummary:'My decision',clientNextStep:'Walk'}
const draft={updatedAt:'2026-11-26T12:00:00Z',protocol:{provenance:'client_autosaved_unreviewed_draft',turns:[{role:'user',content:'I want to rest today'},{role:'assistant',content:'Invented conclusion'}]}}
assert.equal(projectPrivateCoachRecall(reviewed,draft).kind,'draft')
assert.equal(projectPrivateCoachRecall(reviewed,draft).lastWords,'I want to rest today')
assert.equal(projectPrivateCoachRecall(reviewed,{...draft,updatedAt:'2026-11-24T12:00:00Z'}).kind,'reviewed')
assert.equal(projectPrivateCoachRecall(null,null).kind,'none')
assert.ok(!privateCoachRecallText(projectPrivateCoachRecall(reviewed,draft),'ru').includes('Invented conclusion'))
assert.ok(privateCoachRecallText({kind:'unavailable'},'ru').includes('Не удалось'))
assert.ok(privateCoachRecallText({kind:'none'},'ru').includes('нет предыдущего'))

// A newer draft remains newer even when there are no safe quotable words.
for(const turns of [[],null,{},[null,{role:'assistant',content:'Fabricated conclusion'},{role:'user',content:'My password is secret'},{role:'user',interim:true,content:'Unconfirmed partial words'}]]){
 const newer={...draft,protocol:{...draft.protocol,turns}};
 assert.deepEqual(projectPrivateCoachRecall(reviewed,newer),{kind:'draft',date:'2026-11-26',lastWords:''});
}
