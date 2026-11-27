import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_CHARACTER_SIGNATURE,COACH_CHARACTER_SCENARIO,getCoachCharacterSignature,normalizeCoachCharacterSeenIds,coachCharacterObservedIds,coachCharacterTurn,coachCharacterReplyGuidance,coachCharacterSetupGuidance,insertCoachCharacterLine} from '../lib/coaching/coach-character-signature.mjs'
import {coachPersonalityTurn,coachPersonalityBaseInstruction} from '../lib/coaching/coach-personality-dialogue.mjs'
import {withCoachLivePersonality} from '../lib/coaching/coach-personality-live.mjs'
import {getCoachStylePassport} from '../lib/coaching/coach-style-passports.mjs'
const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar']
const langs=['ru','en','es']
test('80 original character expressions and 240 localized variants are shared by passports and localized setup',()=>{
 assert.equal(Object.keys(COACH_CHARACTER_SIGNATURE).length,8)
 for(const id of ids){
  const bank=getCoachCharacterSignature(id)
  assert.equal(bank.length,10);assert.equal(bank.filter(x=>x.early).length,4)
  assert.equal(getCoachStylePassport(id).characterSignature,bank)
  for(const lang of langs){assert.equal(new Set(bank.map(x=>x[lang])).size,10)
   for(const row of bank){assert.ok(row[lang].length>=12&&row[lang].length<=220);assert.doesNotMatch(row[lang],/[?？¿]/);assert.ok(Object.isFrozen(row))}
   assert.ok(coachCharacterSetupGuidance(id,lang).includes(bank[0][lang]))
   assert.ok(coachPersonalityBaseInstruction(id,lang).includes(bank[0][lang]))
  }
 }
 assert.equal(getCoachCharacterSignature('__proto__'),null)
 assert.equal(COACH_CHARACTER_SCENARIO.length,6)
})
test('two early distinct opportunities and optional third, inclusive 420 boundary, stage and safety precedence',()=>{
 for(const personaId of ids)for(const locale of langs){
  const choose=(elapsedSeconds,seenIds=[],extra={})=>coachCharacterTurn({personaId,locale,mode:'explore',stage:'goal',elapsedSeconds,seenIds,...extra})
  const a=choose(30),b=choose(150,[a.id]),c=choose(300,[a.id,b.id])
  assert.equal(a.priority,'early_target');assert.equal(b.priority,'early_target');assert.equal(c.priority,'optional_context')
  assert.equal(new Set([a.id,b.id,c.id]).size,3)
  assert.equal(choose(119,[a.id]),null);assert.equal(choose(239,[a.id,b.id]),null)
  assert.equal(choose(420,[a.id,b.id,c.id]),null)
  assert.equal(choose(419).early,true);assert.equal(choose(420).early,true);assert.equal(choose(421).early,false)
  assert.equal(choose(100,[],{distress:true}),null);assert.equal(choose(100,[],{noAdvice:true}),null)
  for(const interventionId of ['answer_first','respect_no','repair_misunderstanding','allow_close','respond_socially','reflect_without_question'])assert.equal(choose(100,[],{interventionId}),null)
  assert.equal(choose(150,[],{recentTurns:[{role:'assistant',content:a.text}]}),null)
  assert.deepEqual(coachCharacterObservedIds([{role:'assistant',content:a.text,interrupted:true},{role:'user',content:b.text}]),[])
  assert.deepEqual(coachCharacterObservedIds([{role:'assistant',content:a.text.toUpperCase()}]),[a.id])
  assert.deepEqual(normalizeCoachCharacterSeenIds([a.id,a.id]),[a.id]);assert.throws(()=>normalizeCoachCharacterSeenIds(['private raw text']))
  const turn=coachPersonalityTurn({personaId,locale,stage:'goal',sessionSignature:true,timebox:{elapsedSeconds:30}})
  assert.equal(turn.characterReply.id,a.id);assert.equal(turn.signatureReply,null)
  assert.ok(coachCharacterReplyGuidance(a,personaId,locale).includes(a.text))
  assert.equal(coachCharacterReplyGuidance({...a,text:'spoof'},personaId,locale),'')
  const prefix='Director: mandatory field and consent.'
  assert.doesNotMatch(withCoachLivePersonality({guidance:prefix,openingProgress:{completed:false}},turn).guidance,/Character cue/)
  const checked=withCoachLivePersonality({guidance:prefix,openingProgress:{completed:true}},turn)
  assert.ok(checked.guidance.startsWith(prefix)&&checked.guidance.includes(a.text)&&checked.guidance.length<=620)
  assert.equal(withCoachLivePersonality({guidance:'X'.repeat(620),openingProgress:{completed:true}},turn).guidance,'X'.repeat(620))
  const reflection='That sounds like a difficult choice. What matters now?'
  const final=insertCoachCharacterLine(reflection,turn)
  assert.equal(final,reflection) // Do not turn a complete reaction and question into three sentences.
  assert.equal(insertCoachCharacterLine(final,turn),final)
  assert.equal(insertCoachCharacterLine('What matters now?',turn),'What matters now?')
 }
})
