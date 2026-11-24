import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geminiLiveLocalRecovery,geminiLiveContinueMessage,geminiLiveStartMessage} from '../lib/coaching/gemini-live-transport.mjs';

test('restart retains completed local coaching evidence but not unheard or unanswered turns',()=>{
 const rows=[{role:'assistant',content:'Welcome'},{role:'user',content:'My confirmed goal'},
 {role:'assistant',content:'Unheard response',interrupted:true},{role:'user',content:'Unsent draft',unanswered:true},
 {role:'user',content:'Actual next step'}];
 const r=geminiLiveLocalRecovery(rows);
 assert.equal(r.continuing,true);
 assert.deepEqual(r.openingHistory,['My confirmed goal','Actual next step']);
 assert.deepEqual(r.history.map(x=>x.content),['Welcome','My confirmed goal','Actual next step']);
 assert.equal(geminiLiveLocalRecovery([]).continuing,false);
 const long=geminiLiveLocalRecovery(Array.from({length:50},(_,i)=>({role:'user',content:'turn '+i})));
 assert.equal(long.history.length,20);assert.equal(long.openingHistory.length,32);
 assert.equal(long.openingHistory[0],'turn 0');
});
test('restart control packet contains no prior text or profile and does not repeat introduction',()=>{
 const resume=geminiLiveContinueMessage(),serialized=JSON.stringify(resume);
 assert.equal(resume.clientContent.turnComplete,true);
 assert.match(serialized,/APPLICATION CONTINUATION EVENT/);
 assert.match(serialized,/Do not introduce yourself again/);
 assert.ok(!serialized.includes('My confirmed goal'));
 assert.notDeepEqual(resume,geminiLiveStartMessage());
});
const component=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8');
const host=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8');
test('recovery wired to current in-tab host, incomplete ASR never treated as confirmed',()=>{
 assert.match(component,/geminiLiveLocalRecovery\(p.localRecoveryTurns\)/);
 assert.match(component,/r.continuing\?geminiLiveContinueMessage\(\):geminiLiveStartMessage\(\)/);
 assert.match(component,/history:recovery.history,openingHistory:recovery.openingHistory/);
 const preserve=component.slice(component.indexOf('function preserveUnconfirmedInput'),component.indexOf('function commitInput'));
 assert.match(preserve,/onUnconfirmedInput/);
 assert.ok(!preserve.includes('onInputFinal'));
 assert.ok(!preserve.includes('checkpoint('));
 assert.match(host,/localRecoveryTurns=\{turns\}/);
 assert.match(host,/onUnconfirmedInput=\{text=>setDraft\(previous=>previous.trim\(\)\?previous:text\)\}/);
});
test('voice outage keeps text available without a new external provider call',()=>{
 assert.match(host,/if\(!liveVoiceReady\|\|voiceState.phase==='idle'\)return await sendMessage\(message,\{forceLocal:true\}\)/);
 assert.match(host,/const modelReady=!forceLocal&&/);
 assert.match(host,/if\(forceLocal\|\|localInterruption\|\|authRequired/);
 assert.match(host,/if\(role==='user'\)\{setSpeechPreview\(''\)\}/);
});
