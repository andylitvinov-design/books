import test from 'node:test'
import assert from 'node:assert/strict'
import {feedbackForActiveVideoState as allowed} from '../lib/crm/telegram-video-feedback-gate.mjs'
import {beginVideoEffect,advanceVideoEffect,markVideoEffectDelivered} from '../lib/crm/telegram-video-effect.mjs'
const UUID='12345678-1234-4234-9234-1234567890ab',chat=effect=>({effect})
test('a message without effect or with completed state is never claimed',()=>{
 for(const x of ['0','Да','/watched','/stop_checkin'])assert.equal(allowed({},x),false)
 assert.equal(allowed(null,'0'),false)
 assert.equal(allowed(chat({v:1,phase:'done'}),'3'),false)
})
test('before feedback is strictly 0-10, not an unsolicited chat or reaction',()=>{
 let s=beginVideoEffect(UUID,'ru')
 for(const x of ['Да','/watched','11','random message'])assert.equal(allowed(chat(s),x),false)
 for(let i=0;i<7;i++){assert.equal(allowed(chat(s),String(i)),true);s=advanceVideoEffect(s,String(i)).state}
 assert.equal(s.phase,'waiting')
 assert.equal(allowed(chat(s),'1'),false)
 assert.equal(allowed(chat(s),'/stop_checkin'),true)
})
test('reaction and watched require actual accepted video',()=>{
 let s=beginVideoEffect(UUID,'ru')
 for(let i=0;i<7;i++)s=advanceVideoEffect(s,'5').state
 s=markVideoEffectDelivered(s).state
 assert.equal(s.phase,'reaction')
 assert.equal(allowed(chat({...s,videoAccepted:false}),'Да'),false)
 assert.equal(allowed(chat(s),'Да'),true)
 s=advanceVideoEffect(s,'Да').state
 assert.equal(allowed(chat(s),'/watched'),true)
 s=advanceVideoEffect(s,'/watched').state
 assert.equal(s.phase,'after')
 assert.equal(allowed(chat(s),'10'),true)
})