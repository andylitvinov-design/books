import test from 'node:test'
import assert from 'node:assert/strict'
import {lukasOwnerCheckActor,parseLukasOwnerCheck} from '../lib/coaching/lukas-owner-check.mjs'
const actor={id:'verified-owner'}
const access={actor,googleVerified:true,ownerExempt:true}
const start={action:'start',provider:'simli',target:'chatbot',syntheticOnly:true,freeOnly:true}
const audio={action:'lukas-check-audio',target:'chatbot',locale:'ru',syntheticOnly:true,freeOnly:true}
test('only the verified Google practitioner owner can enter the fixed check',()=>{
  assert.equal(lukasOwnerCheckActor(access),actor)
  for(const value of [null,{},actor,{...access,googleVerified:false},{...access,ownerExempt:false},{...access,actor:null}])assert.equal(lukasOwnerCheckActor(value),null)
})
test('only a fixed Lukas Simli test or an approved locale greeting is accepted',()=>{
  assert.deepEqual(parseLukasOwnerCheck(start),{action:'start'})
  for(const locale of ['ru','en','es'])assert.deepEqual(parseLukasOwnerCheck({...audio,locale}),{action:'audio',locale})
})
test('never accept arbitrary speech, history, face overrides, coaching tokens or paid starts',()=>{
  for(const value of [null,[],{}, {...start,action:'start-dialogue'}, {...start,provider:'sequencer'}, {...start,target:'coach'}, {...start,freeOnly:false}, {...start,faceId:'custom'}, {...audio,text:'private'}, {...audio,history:[]}, {...audio,locale:'constructor'}, {...audio,syntheticOnly:false}])assert.equal(parseLukasOwnerCheck(value),null)
})
