import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {MY_COACH_FISH_VOICES,myCoachFishVoice,myCoachFishProsody,OWNER_FISH_EN_CAST,OWNER_FISH_RU_CAST,OWNER_FISH_RU_UNRESOLVED} from '../lib/coaching/my-coach-fish-voice.mjs'
import {FISH_PUBLIC_VOICES,validateFishRequest} from '../lib/mandala/voice-studio-fish.mjs'
import {approvedFishReference,FISH_COMMUNITY_LICENSE_FLAGS} from '../lib/mandala/voice-studio-fish-provider.mjs'

test('EN Mira, Max and Alex stay unchanged; Merlin and Harry recast only with rights',()=>{
 for(const id of ['mira','max','sofia','alex'])
   assert.equal(myCoachFishVoice(id,'en',{}),MY_COACH_FISH_VOICES[id])
 for(const id of ['merlin','harry']){
   assert.equal(myCoachFishVoice(id,'en',{}),MY_COACH_FISH_VOICES[id])
   assert.equal(myCoachFishVoice(id,'en',{HH_MY_COACH_FISH_EN_CAST_RIGHTS_APPROVED:'true'}),OWNER_FISH_EN_CAST[id])
 }
 assert.deepEqual(myCoachFishProsody('sofia','en'),{speed:0.9})
 assert.equal(myCoachFishProsody('sofia','ru'),null)
 assert.equal(myCoachFishProsody('mira','en'),null)
 for(const route of ['app/api/app/my-coach/voice/synthesize/route.js','app/api/coaching/intro/[locale]/[coach]/route.js']){
   const src=readFileSync(new URL('../'+route,import.meta.url),'utf8')
   assert.match(src,/myCoachFishProsody/)
   assert.match(src,/prosody:/)
 }
})
test('native RU voice mapping requires separate rights; unknown original IDs fail closed',()=>{
 const verified={HH_MY_COACH_FISH_RU_CAST_RIGHTS_APPROVED:'true'}
 for(const [id,voice] of Object.entries(OWNER_FISH_RU_CAST)){
   assert.equal(myCoachFishVoice(id,'ru',verified),voice)
   assert.equal(myCoachFishVoice(id,'ru',{}),null,
     'Russian speech must not use the English voice if native rights are pending')
 }
 assert.deepEqual(OWNER_FISH_RU_UNRESOLVED,['mira','sofia'])
 for(const id of OWNER_FISH_RU_UNRESOLVED)
   assert.equal(myCoachFishVoice(id,'ru',verified),null)
 const approved={...verified,HH_MY_COACH_FISH_RU_MIRA_IDENTITY_CONFIRMED:'true',HH_MY_COACH_FISH_RU_MIRA_REFERENCE_ID:'ab'.repeat(16)}
 assert.equal(myCoachFishVoice('mira','ru',approved),'ab'.repeat(16))
 assert.equal(myCoachFishVoice('mira','ru',{...approved,HH_MY_COACH_FISH_RU_MIRA_REFERENCE_ID:'invalid'}),null)
 assert.equal(myCoachFishVoice('mira','ru',{...approved,HH_MY_COACH_FISH_RU_MIRA_IDENTITY_CONFIRMED:'false'}),null)
})
test('meditation choices are language-specific and licensed per community reference',()=>{
 const voices=FISH_PUBLIC_VOICES.filter(v=>v.purpose==='meditation')
 assert.deepEqual(voices.filter(v=>v.language==='en').map(v=>v.id),['fish-selene','fish-calm-meditation','fish-e1'])
 assert.deepEqual(voices.filter(v=>v.language==='ru').map(v=>v.id),['fish-zorya','fish-sasha','fish-m4'])
 const refs={'fish-calm-meditation':'14c13e72d4644b0dbd2f147df20f6d80',
   'fish-e1':'e517c0350c5043c09112b763a75892be',
   'fish-zorya':'1723d5fc6a4041178bef80a3d9ed4067',
   'fish-sasha':'aeca68fc0f82475eb9d9c0d5b106d8bc',
   'fish-m4':'e293d74f83aa4e8fb97805154819c565'}
 for(const [id,ref] of Object.entries(refs)){
   const flag=FISH_COMMUNITY_LICENSE_FLAGS[id]
   assert.ok(flag,id+' has an individual license flag')
   assert.equal(approvedFishReference(id),null)
   assert.equal(approvedFishReference(id,{[flag]:'true'}),ref)
   assert.equal(approvedFishReference(id,{[flag]:'false'}),null)
 }
 assert.equal(validateFishRequest({provider:'fish',mode:'sample',voiceId:'fish-m4',language:'ru'}).voiceId,'fish-m4')
 assert.throws(()=>validateFishRequest({provider:'fish',mode:'sample',voiceId:'fish-m4',language:'en'}))
})
test('both studio pickers enable voices by server whitelist, not just client flags',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 for(const p of ['components/mandala-affirmation-voice.tsx','components/mandala-cloud-voice-studio.tsx']){
   const source=read(p)
   assert.match(source,/fishLicensedIds/)
   assert.doesNotMatch(source,/disabled=\{Boolean\((?:v|voice)\.requiresProviderLicense\)\}/)
 }
 const api=read('app/api/holistic-support/voice/route.js')
 assert.match(api,/fishLicensedVoices/)
 assert.match(api,/approvedFishReference\(v.id,process.env\)/)
})

test('all six Russian and four historical personas refuse implicit English synthesis',()=>{
 for(const id of [...Object.keys(MY_COACH_FISH_VOICES)]){
   assert.equal(myCoachFishVoice(id,'ru',{}),null,id+' RU requires explicit native model')
   assert.equal(myCoachFishVoice(id,'es',{}),null,id+' ES must not use English')
 }
 const speech=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
 assert.match(speech,/if\(replyLocale!=='en'&&!matches\.length\)return false/)
})
test('WebKit audio recipient Continue commits same-tap Montage navigation',()=>{
 const ui=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8')
 const part=ui.slice(ui.indexOf('const goRecipientAudioToMontage='),ui.indexOf('// Existing recorder, STT API, shot matcher'))
 assert.match(part,/flushSync\(\(\)=>\{setActiveWorkspace\("editor"\)/)
 assert.match(part,/function goRecipientAudioToManualMontage/)
 assert.match(part,/data-video-montage-concept/)
})
