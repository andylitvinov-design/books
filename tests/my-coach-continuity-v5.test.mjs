import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {markLatestCoachReplyInterrupted,coachAudibleTurns} from '../lib/coaching/coach-audible-history.mjs'
import {coachTurnWindow} from '../lib/coaching/coach-turn-window.mjs'
import {coachGroqReasoningEffort} from '../lib/coaching/groq-coach-provider.mjs'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('unheard AI reply remains visible but is excluded from next Director context',()=>{
 const rows=[{role:'user',content:'I want to leave my job'},
   {role:'assistant',content:'What matters most to you?'},
   {role:'user',content:'My parents would disapprove'},
   {role:'assistant',content:'Then their disapproval may be the greater fear.'}]
 const next=markLatestCoachReplyInterrupted(rows)
 assert.equal(rows[3].interrupted,undefined)
 assert.equal(next[3].interrupted,true)
 assert.equal(next[3].content,rows[3].content)
 assert.equal(markLatestCoachReplyInterrupted(rows,'A different audio introduction'),rows)
 assert.equal(markLatestCoachReplyInterrupted(rows,rows[3].content)[3].interrupted,true)
 assert.deepEqual(coachAudibleTurns(next),rows.slice(0,3))
 assert.equal(markLatestCoachReplyInterrupted(next),next)
 const newer=[...next,{role:'user',content:'Actually, I meant something else'}]
 assert.equal(markLatestCoachReplyInterrupted(newer),newer)
 assert.equal(coachTurnWindow(coachAudibleTurns(next),10).length,3)
})
test('interruption watches thinking, waiting and speaking; no busy-guard drops the next voice',()=>{
 const s=source('components/my-coach-speech-loop.jsx'),d=source('components/my-coach-live-dialogue.jsx')
 assert.match(s,/beginVoiceBargeMonitor\(generation\) \/\/ Listen even while AI/)
 assert.match(s,/\['thinking','loading','speaking'\]\.includes\(phaseRef\.current\)/)
 assert.match(s,/monitorGeneration=generationRef\.current\+1/)
 assert.match(s,/cancelRef\.current\?\.\(\)/)
 assert.match(d,/onCoachInterrupted=\{markCoachSpeechInterrupted\}/)
 assert.match(d,/if\(!message\|\|paused\|\|\(!voiceTurn&&busy\)\)return null/)
 assert.match(d,/turnRequestRef\.current!==requestId/)
})
test('spoken reasoning uses low for greetings, medium for substantive, same provider',()=>{
 const msg=v=>[{role:'system',content:'Coach'},{role:'user',content:v}]
 assert.equal(coachGroqReasoningEffort(msg('Да'),false,true),'low')
 assert.equal(coachGroqReasoningEffort(msg('Помоги понять, почему я всё время останавливаюсь, когда другие меня оценивают, и как мне это изменить'),false,true),'medium')
 assert.equal(coachGroqReasoningEffort(msg('Compare my options: stay in this job or leave with the same income and different stress and support.'),false,true),'medium')
 assert.equal(coachGroqReasoningEffort(msg('Compare my options: stay in this job or leave with the same income and different stress and support.'),false,false),'high')
 assert.equal(coachGroqReasoningEffort(msg('Analyze this'),true,true),'low')
})
