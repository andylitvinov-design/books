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
