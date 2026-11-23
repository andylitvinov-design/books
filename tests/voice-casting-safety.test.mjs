import test from 'node:test';
import assert from 'node:assert/strict';
import {myCoachFishVoice,myCoachFishConfig,myCoachFishProsody,normalizeMyCoachFishRequest,MY_COACH_FISH_VOICES,OWNER_FISH_EN_CAST,OWNER_FISH_RU_CAST} from '../lib/coaching/my-coach-fish-voice.mjs';

test('voice rights gates are closed by default and preserve existing Genie',()=>{
 assert.equal(myCoachFishVoice('merlin','en',{}),MY_COACH_FISH_VOICES.merlin);
 assert.equal(myCoachFishVoice('harry','en',{}),MY_COACH_FISH_VOICES.harry);
 assert.equal(myCoachFishVoice('genie','en',{}),MY_COACH_FISH_VOICES.genie);
 for(const id of Object.keys(OWNER_FISH_RU_CAST))assert.equal(myCoachFishVoice(id,'ru',{}),null,id);
 assert.equal(myCoachFishVoice('merlin','en',{HH_MY_COACH_FISH_EN_CAST_RIGHTS_APPROVED:'true'}),OWNER_FISH_EN_CAST.merlin);
 assert.equal(myCoachFishVoice('max','ru',{HH_MY_COACH_FISH_RU_CAST_RIGHTS_APPROVED:'true'}),OWNER_FISH_RU_CAST.max);
 assert.equal(myCoachFishVoice('max','es',{HH_MY_COACH_FISH_RU_CAST_RIGHTS_APPROVED:'true'}),null);
});
test('ambiguous reference IDs cannot bleed into other personas',()=>{
 const env={HH_MY_COACH_FISH_RU_CAST_RIGHTS_APPROVED:'true',HH_MY_COACH_FISH_RU_SOFIA_IDENTITY_CONFIRMED:'true',HH_MY_COACH_FISH_RU_SOFIA_REFERENCE_ID:'f'.repeat(32)};
 assert.equal(myCoachFishVoice('sofia','ru',env),'f'.repeat(32));
 for(const id of ['mira','genie','lea','noah','iris','ray'])assert.equal(myCoachFishVoice(id,'ru',env),null,id);
 assert.equal(myCoachFishVoice('sofia','ru',{...env,HH_MY_COACH_FISH_RU_SOFIA_REFERENCE_ID:'invalid'}),null);
 assert.equal(myCoachFishVoice('sofia','ru',{...env,HH_MY_COACH_FISH_RU_SOFIA_IDENTITY_CONFIRMED:'false'}),null);
});
test('provider expiry and explicit voice consents remain mandatory',()=>{
 const env={HH_MY_COACH_FISH_TTS_ENABLED:'true',HH_MY_COACH_FISH_TTS_APPROVED:'true',HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED:'true',HH_COACHING_FISH_API_KEY:'synthetic'};
 assert.equal(myCoachFishConfig(env,Date.parse('2026-12-01T00:00:00Z')),null);
 assert.equal(myCoachFishConfig({...env,HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED:'false'},Date.parse('2026-11-23T00:00:00Z')),null);
 assert.deepEqual(myCoachFishProsody('sofia','en'),{speed:0.9});
 assert.throws(()=>normalizeMyCoachFishRequest({locale:'en',text:'synthetic',voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:false}));
});
