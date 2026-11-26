import test from 'node:test'
import assert from 'node:assert/strict'
import {videoAccessView as view} from '../lib/coaching/lukas-video-ui.mjs'
const customer={eligible:true,ownerExempt:false,personalLimitSeconds:300,remainingSeconds:220,code:'BUSY',videoAvailable:false}
test('guest gets Google login, not video, even if spoofed available',()=>{const r=view({...customer,code:'AVAILABLE',videoAvailable:true},{authenticated:false,locale:'ru'});assert.equal(r.signIn,true);assert.equal(r.canStart,false)})
test('busy preserves exact balance and voice fallback in all languages',()=>{for(const locale of ['ru','en','es']){const r=view(customer,{authenticated:true,voiceSupported:true,locale});assert.equal(r.code,'BUSY');assert.match(r.balance,/3:40/);assert.equal(r.canVoice,true);assert.equal(r.canStart,false);assert.ok(r.message)}})
test('owner exemption uses server response and never promises global availability',()=>{const r=view({...customer,ownerExempt:true,personalLimitSeconds:null,remainingSeconds:null},{authenticated:true,locale:'ru'});assert.equal(r.allowance,'Без личного лимита');assert.equal(r.canStart,false)})
test('unknown balance is never fabricated as five minutes of usable video',()=>{const r=view({...customer,remainingSeconds:null,code:'UNAVAILABLE'},{authenticated:true});assert.equal(r.balance,'Balance not confirmed yet');assert.equal(r.canStart,false)})
test('start requires verified available state and known positive balance',()=>{for(const p of [{remainingSeconds:0},{remainingSeconds:null},{remainingSeconds:301},{videoAvailable:false},{eligible:false}])assert.equal(view({...customer,code:'AVAILABLE',videoAvailable:true,...p},{authenticated:true}).canStart,false);assert.equal(view({...customer,code:'AVAILABLE',videoAvailable:true},{authenticated:true}).canStart,true)})
test('unsupported audio offers text fallback, never an automatic audio call',()=>{assert.equal(view(customer,{authenticated:true,voiceSupported:false}).canVoice,false)})
