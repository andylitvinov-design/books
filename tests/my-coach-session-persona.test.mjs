import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('Mira begins in a goal-clarifying, non-financial GROW model',()=>{
 const runner=read('components/public-coaching-discovery.jsx')
 assert.match(runner,/mira:\['grow_reflect_v1','oskar_wellbeing_resources_v1'/)
 assert.match(runner,/const found=safe.find\(s=>s.schemeKey===key\)/)
 assert.match(runner,/coachingSchemeRequiresAdultConsent\(s\)/)
 assert.match(runner,/!=='career'\?50:0/)
})
test('all eight coaches use their own public identity, not the human presenter',()=>{
 const runner=read('components/public-coaching-discovery.jsx')
 const thread=read('components/coaching-chat-thread.jsx')
 const css=read('components/coaching-chat-thread.module.css')
 const voice=read('components/app/coaching-question-voice.jsx')
 for(const id of ['mira','max','sofia','alex','lea','noah','iris','ray'])
   assert.match(runner,new RegExp(id+':\\['))
 assert.equal((runner.match(/coachPersona=\{selectedPersona\}/g)||[]).length,2)
 assert.match(thread,/personaName=coachPersona\?localCoachText/)
 assert.match(thread,/guideLabel=personaName\?personaName/)
 assert.match(thread,/portrait-static\/andy-96-b9d7800d1448.webp/)
 assert.match(css,/my-coach-portraits\.avif/)
 assert.match(voice,/fictionalPersona\?t.characterDevice:t.device/)
})
