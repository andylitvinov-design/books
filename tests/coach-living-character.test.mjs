import test from 'node:test'
import assert from 'node:assert/strict'
import {coachPersonalityBaseInstruction,coachPersonalityTurn,coachPersonalityTurnGuidance} from '../lib/coaching/coach-personality-dialogue.mjs'
import {coachLivePersonalityGuidance,withCoachLivePersonality} from '../lib/coaching/coach-personality-live.mjs'
const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray']
test('all registered characters get ongoing personalized guidance in all supported languages',()=>{
 for(const locale of ['en','ru','es']){
  const prompts=ids.map(id=>coachPersonalityBaseInstruction(id,locale))
  assert.equal(new Set(prompts).size,ids.length)
  for(const prompt of prompts){
   assert.match(prompt,/LIVING CHARACTER/)
   assert.match(prompt,/first two suitable exchanges after consent/)
   assert.match(prompt,/Do not initiate pause, postponement or stopping/)
   assert.match(prompt,/client-requested pause\/stop/)
   assert.match(prompt,/no slogans, forced optimism, humor or metaphor/)
   assert.match(prompt,/at most one question/)
  }
 }
 assert.match(coachPersonalityBaseInstruction('mira','ru'),/даст вам опору/)
 assert.equal(coachPersonalityBaseInstruction('not-a-coach','ru'),'')
})
test('Mira retains her stance during ordinary and supportive turns',()=>{
 for(const interventionId of ['explore','reduce_scope']){
  const turn=coachPersonalityTurn({personaId:'mira',stage:'reality',interventionId,locale:'ru',timebox:{elapsedSeconds:60},sessionSignature:true})
  const guidance=coachPersonalityTurnGuidance(turn)
  assert.match(guidance,/specific support or a tentative character-specific observation/)
  assert.match(guidance,/not optional/)
  assert.match(guidance,/Direct requests, refusal, safety/)
 }
})
test('due cue uses remaining live space without clipping Director text',()=>{
 const turn=coachPersonalityTurn({personaId:'mira',stage:'goal',interventionId:'explore',locale:'ru',timebox:{elapsedSeconds:60},sessionSignature:true})
 assert.ok(turn.characterReply)
 const empty=coachLivePersonalityGuidance('',turn,620)
 assert.ok(empty.includes(turn.characterReply.text))
 const cueLength=(' Character cue if relevant, once: '+JSON.stringify(turn.characterReply.text)+'.').length
 const core='D'.repeat(620-cueLength)
 const result=coachLivePersonalityGuidance(core,turn,620)
 assert.equal(result.length,620)
 assert.ok(result.startsWith(core))
 assert.ok(result.includes(turn.characterReply.text))
 const opening=withCoachLivePersonality({guidance:core,openingProgress:{completed:false}},turn)
 assert.ok(!opening.guidance.includes(turn.characterReply.text))
})
