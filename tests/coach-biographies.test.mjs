import test from 'node:test';import assert from 'node:assert/strict';
import {COACH_LEGEND_IDS,getCoachBiography,buildCoachBiographyInstruction} from '../lib/coaching/coach-biographies.mjs';
import {COACH_PERSONALITY_CORE_IDS} from '../lib/coaching/coach-personality-core.mjs';
import {buildCoachBehaviorPolicy} from '../lib/coaching/persona-registry.mjs';
test('all twelve character biographies have four unique immutable events and separate success and attitude algorithms',()=>{assert.deepEqual([...COACH_LEGEND_IDS].sort(),[...COACH_PERSONALITY_CORE_IDS].sort());assert.equal(COACH_LEGEND_IDS.length,12);const names=new Set();for(const id of COACH_LEGEND_IDS){const b=getCoachBiography(id);assert.ok(Object.isFrozen(b)&&Object.isFrozen(b.events));for(const k of ['title','origin','people','flaw','success','attitude','limits','motif'])assert.ok(b[k].length>15,id+' '+k);assert.notEqual(b.success,b.attitude);assert.equal(b.events.length,4);for(const event of b.events){assert.ok(Object.isFrozen(event)&&event[1].length>80);names.add(event[0]);}const prompt=buildCoachBiographyInstruction(id);assert.match(prompt,/fixed fictional anchors/);assert.match(prompt,/Explicitly frame first-person stories as fictional/);assert.match(prompt,/Never contradict established anchors/);for(const locale of ['en','ru','es'])assert.ok(buildCoachBehaviorPolicy(id,{},locale).systemInstructions.includes(prompt),id+' '+locale);}assert.equal(names.size,48);assert.equal(getCoachBiography('__proto__'),null);assert.equal(buildCoachBiographyInstruction('unknown'),'');});


import {getCoachPersonalityMemory,buildCoachPersonalityMemoryInstruction,validateCoachMemoryReleases} from '../lib/coaching/coach-personality-memory.mjs';
test('editorial personality memory is isolated, immutable, versioned and wired for each coach and locale',()=>{
 const episodeTitles=new Set();
 for(const id of COACH_LEGEND_IDS){
  const first=getCoachPersonalityMemory(id,1),latest=getCoachPersonalityMemory(id);
  assert.equal(first.personaId,id);assert.equal(first.revision,1);
  assert.deepEqual(first.entries.map(e=>e.kind),['episode','judgment','reaction']);
  assert.ok(Object.isFrozen(latest)&&Object.isFrozen(latest.entries)&&Object.isFrozen(first.entries[0]));
  episodeTitles.add(first.entries[0].topic);
  const history=[{revision:1,previous:0,entries:first.entries}];
  assert.equal(validateCoachMemoryReleases(id,history),true);
  const next={...first.entries[1],id:'judgment-02',topic:'Another editorial topic'};
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:2,previous:1,entries:[next]}]),true);
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:3,previous:1,entries:[next]}]),false);
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:2,previous:1,entries:[first.entries[0]]}]),false);
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:2,previous:1,entries:[{...next,anchor:'noncanonical'}]}]),false);
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:2,previous:1,entries:[{...next,clientId:'private'}]}]),false);
  assert.equal(validateCoachMemoryReleases(id,[...history,{revision:2,previous:1,entries:[{...first.entries[0],id:'episode-02'}]}]),false);
  const instruction=buildCoachPersonalityMemoryInstruction(id);
  assert.match(instruction,/New improvised examples are not canonical/);
  for(const lang of ['ru','en','es']){
   const policy=buildCoachBehaviorPolicy(id,{clientMemory:'DO_NOT_INGEST_CLIENT_MEMORY'},lang).systemInstructions;
   assert.ok(policy.includes(instruction));assert.ok(policy.includes(buildCoachBiographyInstruction(id)));
   assert.ok(!policy.includes('DO_NOT_INGEST_CLIENT_MEMORY'));
   for(const other of COACH_LEGEND_IDS.filter(x=>x!==id))assert.ok(!instruction.includes(getCoachPersonalityMemory(other,1).entries[0].text));
  }
 }
 assert.equal(episodeTitles.size,12);
 for(const id of ['__proto__','constructor','unknown'])assert.equal(getCoachPersonalityMemory(id),null);
 assert.equal(getCoachPersonalityMemory('mira',0),null);
 assert.equal(getCoachPersonalityMemory('mira','1'),null);
});


import {getCoachPersonalityMemoryHistory,validateCoachMemoryAppend} from '../lib/coaching/coach-personality-memory.mjs';
// Regression fingerprints for published editorial revisions; not a cryptographic approval/security boundary.
// Append a new pin for a new revision, never replace old pins to accommodate a changed story.
const memoryPins={
  "mira": [
    "a97380617e68f7c9",
    "48f23a4c1229a91c"
  ],
  "max": [
    "fc9c37612d65783b",
    "abaaaea260121c4c"
  ],
  "sofia": [
    "321e08c22c435383",
    "0ec06b7893fe7409"
  ],
  "alex": [
    "32062ffdd6d5722a",
    "66916a143014f16d"
  ],
  "merlin": [
    "0d00084ae455f737",
    "43e7a7f5cbb0b2d3"
  ],
  "harry": [
    "2a3abf9650d207f3",
    "aadd5cc1a3e9294f"
  ],
  "genie": [
    "99265dbff0afc988",
    "b88e5a1d008115d8"
  ],
  "caesar": [
    "ac805d33a3e558f5",
    "4bcd15b1f6ccc711"
  ],
  "lea": [
    "8eed2fe11efde8dc",
    "cd75af9b500670b1"
  ],
  "noah": [
    "b50584282524a40c",
    "b2cd03467cc1c036"
  ],
  "iris": [
    "519d0e3b980c4064",
    "b3746b26ce01e6c4"
  ],
  "ray": [
    "2e7679a0df7d3220",
    "ceadddb0db11695c"
  ]
};
const biographyPins={
  "mira": "5c811c7354227cf3",
  "max": "692c23eaa11674be",
  "sofia": "f133b3476b86394d",
  "alex": "36be5d0edb4c059d",
  "merlin": "4d4e5d58e91da8e8",
  "harry": "848b33fa803c7b83",
  "genie": "e91e89653ec77417",
  "caesar": "323118617354764b",
  "lea": "7861d5b80a08c320",
  "noah": "e0bb7057d4bca293",
  "iris": "07b73086c1af72d1",
  "ray": "1cb867e0550b3df9"
};
function editorialFingerprint(value){
 let h=14695981039346656037n;const s=JSON.stringify(value);
 for(let i=0;i<s.length;i++)h=BigInt.asUintN(64,(h^BigInt(s.charCodeAt(i)))*1099511628211n);
 return h.toString(16).padStart(16,'0');
}
const fingerprintRelease=r=>editorialFingerprint([r.revision,r.previous,r.entries.map(e=>[e.id,e.kind,e.anchor,e.topic,e.text])]);
test('published canon and editorial revisions remain intact when memory evolves',()=>{
 for(const id of COACH_LEGEND_IDS){
  const history=getCoachPersonalityMemoryHistory(id),b=getCoachBiography(id);
  assert.equal(editorialFingerprint([b.title,b.origin,b.people,b.flaw,b.events,b.success,b.attitude,b.limits,b.motif]),biographyPins[id],id+' base canon');
  assert.ok(Object.isFrozen(history)&&Object.isFrozen(history[0])&&Object.isFrozen(history[0].entries));
  assert.ok(history.length>=2);
  assert.deepEqual(history.slice(0,memoryPins[id].length).map(fingerprintRelease),memoryPins[id],id+' prior revision');
  assert.equal(validateCoachMemoryAppend(id,history.slice(0,1),history.slice(0,2)),true);
  assert.equal(getCoachPersonalityMemory(id,1).entries.length,3);
  const second=getCoachPersonalityMemory(id,2);
  assert.equal(second.entries.length,5);
  assert.equal(second.entries.filter(e=>e.kind==='judgment').length,2);
  assert.equal(second.entries.filter(e=>e.kind==='reaction').length,2);
  const next=[...history,{revision:history.length+1,previous:history.length,entries:[{...history[0].entries[1],id:'judgment-future-test',topic:'Synthetic future editorial topic',text:'A synthetic test opinion; never a published record.'}]}];
  assert.equal(validateCoachMemoryAppend(id,history,next),true);
  const rewritten=structuredClone(next);rewritten[0].entries[0].text+=' Changed.';
  assert.equal(validateCoachMemoryReleases(id,rewritten),true);
  assert.equal(validateCoachMemoryAppend(id,history,rewritten),false);
  const removed=structuredClone(next);removed[0].entries.pop();
  assert.equal(validateCoachMemoryAppend(id,history,removed),false);
  const reordered=structuredClone(next);reordered[0].entries.reverse();
  assert.equal(validateCoachMemoryAppend(id,history,reordered),false);
  assert.equal(validateCoachMemoryAppend(id,history,history),false);
  for(const lang of ['ru','en','es']){
   const policy=buildCoachBehaviorPolicy(id,{},lang).systemInstructions;
   const selected=['episode','judgment','reaction'].flatMap(kind=>getCoachPersonalityMemory(id).entries.filter(e=>e.kind===kind).slice(-4));
   for(const e of selected)assert.ok(policy.includes(e.text),id+' '+lang+' '+e.id);
  }
 }
 assert.equal(getCoachPersonalityMemoryHistory('constructor'),null);
});


import {selectCoachMemoryEntry,buildCoachMemoryCue,getCoachMemoryIndexedIds} from '../lib/coaching/coach-personality-memory-retrieval.mjs';
import {coachPersonalityTurn,coachPersonalityTurnGuidance} from '../lib/coaching/coach-personality-dialogue.mjs';
import {withCoachLivePersonality} from '../lib/coaching/coach-personality-live.mjs';
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs';
import {coachSessionDirective,coachSessionDirectivePrompt} from '../lib/coaching/coach-session-director.mjs';
const contextualCases={
 mira:['judgment-01','caregiving','забота','cuidado'],
 max:['judgment-02','budget','бюджет','presupuesto'],
 sofia:['judgment-02','unanswered message','без ответа','sin respuesta'],
 alex:['judgment-02','priorities','приоритеты','prioridades'],
 merlin:['judgment-01','purpose','смысл','propósito'],
 harry:['judgment-02','loyalty','верность','lealtad'],
 genie:['judgment-02','budget','бюджет','presupuesto'],
 caesar:['judgment-02','fairness','справедливость','equidad'],
 lea:['judgment-01','approval','одобрение','aprobación'],
 noah:['judgment-02','money','деньги','dinero'],
 iris:['judgment-02','changed my mind','изменил мнение','cambié de opinión'],
 ray:['judgment-02','creative collaboration','творческое сотрудничество','colaboración creativa']
};
test('contextual memory chooses only relevant persona-owned editorial entries in all three languages',()=>{
 for(const [id,[expected,...messages]] of Object.entries(contextualCases)){
  const entries=getCoachPersonalityMemory(id,2).entries;
  assert.deepEqual([...getCoachMemoryIndexedIds(id)].sort(),getCoachPersonalityMemory(id).entries.map(e=>e.id).sort());
  const selected=entries.find(e=>e.id===expected);
  for(const [i,locale] of ['en','ru','es'].entries()){
   const input={message:messages[i],locale,mode:'answer'};
   assert.equal(selectCoachMemoryEntry(id,input),expected,id+' '+locale);
   for(const guard of ['blocked','noAdvice','distress'])assert.equal(selectCoachMemoryEntry(id,{...input,[guard]:true}),null);
   for(const mode of ['close','repair','listen','support','contact'])assert.equal(selectCoachMemoryEntry(id,{...input,mode}),null);
   assert.equal(selectCoachMemoryEntry(id,{...input,message:'ZXQJ-PRIVATE-TEXT'}),null);
   assert.ok(buildCoachMemoryCue(id,expected,{mode:'answer'}).includes(selected.text));
   const turn=coachPersonalityTurn({personaId:id,locale,interventionId:'answer_first',latestMessage:messages[i]+' ZXQJ-PRIVATE-TEXT'});
   assert.equal(turn.memoryEntryId,expected);
   assert.ok(coachPersonalityTurnGuidance(turn).includes(selected.text));
   assert.doesNotMatch(JSON.stringify(turn),/ZXQJ-PRIVATE-TEXT/);
   const checkpoint={guidance:'Mandatory course instruction.'};
   const live=withCoachLivePersonality(checkpoint,turn).guidance;
   assert.ok(live.startsWith(checkpoint.guidance)&&live.length<=620);
   assert.ok(live.includes(selected.text));
   assert.ok(!withCoachLivePersonality({...checkpoint,openingProgress:{completed:false}},turn).guidance.includes(selected.text));
   assert.ok(!withCoachLivePersonality({...checkpoint,profileProgress:{pending:true}},turn).guidance.includes(selected.text));
   const full='x'.repeat(620);
   assert.equal(withCoachLivePersonality({guidance:full},turn).guidance,full);
  }
 }
 assert.equal(selectCoachMemoryEntry('noah',{message:'routine',mode:'answer'}),null);
 assert.equal(selectCoachMemoryEntry('mira',{message:'I feel guilt about saying no',mode:'explore'}),'reaction-01');
 assert.equal(selectCoachMemoryEntry('max',{message:'Tell me a fictional story about a prototype',mode:'answer',storyRequested:true}),'episode-01');
 assert.equal(buildCoachMemoryCue('max','episode-01',{mode:'answer'}),'');
 assert.equal(buildCoachMemoryCue('max','reaction-01',{mode:'answer'}),'');
 assert.equal(buildCoachMemoryCue('max','ZXQJ-PRIVATE-TEXT',{mode:'answer'}),'');
 assert.equal(selectCoachMemoryEntry('constructor',{message:'budget',mode:'answer'}),null);
});
test('actual Director passes current topic to editorial memory without changing answer-first authority',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({personaId:'max',locale:'en',message:'What is your opinion about the budget?',consent:true,turns:[],elapsedSeconds:60});
 const directive=coachSessionDirective(input,persona);
 assert.equal(directive.interventionId,'answer_first');
 assert.equal(directive.personality.memoryEntryId,'judgment-02');
 assert.ok(coachSessionDirectivePrompt(directive).includes(getCoachPersonalityMemory('max',2).entries.find(e=>e.id==='judgment-02').text));
});
