import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {aliGeminiRequest,aliGeminiResult,ALI_GEMINI_FREE_ENDPOINT} from '../lib/holistic-support/ali-gemini-consultant.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Pro uses only existing consented Gemini Free text API, not paid or invented Gemini',()=>{
 assert.equal(ALI_GEMINI_FREE_ENDPOINT,'/api/app/my-coach/turn')
 const msg='I want to understand my goals and a useful next step.'
 const input={message:msg,personaId:'max',locale:'en',consent:true,freeDataConsent:true}
 const request=aliGeminiRequest(input)
 assert.equal(request.engine,'gemini_free')
 assert.equal(request.geminiConsent,true)
 assert.equal(request.geminiFreeDataConsent,true)
 assert.equal(request.message,msg)
 assert.equal(request.settings.questionsPerTurn,1)
 for(const bad of [{...input,consent:false},{...input,freeDataConsent:false},
   {...input,personaId:'invalid'},{...input,message:'x'.repeat(1201)}]){
   assert.throws(()=>aliGeminiRequest(bad))
 }
 assert.equal(aliGeminiResult({mode:'ai',inference:{provider:'gemini_free'},message:'What matters most to you?'}).kind,'gemini')
 assert.throws(()=>aliGeminiResult({mode:'offline',message:'Pretend Gemini response'}))
 assert.throws(()=>aliGeminiResult({mode:'ai',inference:{provider:'gemini_paid'},message:'Paid without consent'}))
 assert.equal(aliGeminiResult({mode:'safety',reflection:'Pause here.',question:'Seek urgent help.'}).kind,'safety')
})
test('approved iPhone layout removes journey; microphone follows Send; Pro consent before model',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx')
 const agent=read('components/holistic-agent-chat.tsx')
 const css=read('components/holistic-agent-chat.module.css')
 const art=read('components/app/messenger-ai-landing.module.css')
 assert.doesNotMatch(landing,/data-hh-alchemist-journey|How it works — in 3 simple steps/)
 assert.match(landing,/data-hh-ai-chat-shortcuts/)
 assert.match(landing,/data-hh-alchemist-topics/)
 assert.match(agent,/data-hh-ai-gemini-tier/)
 assert.match(agent,/data-hh-ai-tier="free"/)
 assert.match(agent,/data-hh-ai-tier="pro"/)
 assert.match(agent,/data-hh-ai-gemini-consent/)
 assert.match(agent,/freeDataConsent:proDataConsent/)
 assert.match(agent,/fetch\(ALI_GEMINI_FREE_ENDPOINT/)
 assert.match(agent,/aliGeminiResult\(result\)/)
 assert.match(agent,/data-hh-conversation-mic/)
 const form=agent.slice(agent.indexOf('const composer=('),agent.indexOf('    </form>',agent.indexOf('const composer=(')))
 assert.ok(form.indexOf('type="submit"')<form.lastIndexOf('className={styles.recorderToggle}'))
 assert.match(css,/\.freeProSwitch/)
 assert.match(css,/\.geminiConsent/)
 assert.match(art,/\.root \.welcomeRow\{min-height:157px/)
 assert.doesNotMatch(agent,/silent Gemini Paid fallback/)
})
