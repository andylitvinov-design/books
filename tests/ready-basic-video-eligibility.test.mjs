import test from 'node:test';
import assert from 'node:assert/strict';
import {readyBasicVideoAccess} from '../lib/video-credits/ready-basic-eligibility.mjs';

const catalog={chargeRequired:true,ready:true,blocked:false,priceCredits:10};
const access=(patch={})=>readyBasicVideoAccess({catalog,session:'guest',balanceCredits:null,guestFirstVideoUsed:false,...patch});

test('first guest Basic export stays free; a repeated guest export must sign in',()=>{
  assert.deepEqual(access(),{allowed:true,reason:null,chargeCredits:0});
  assert.deepEqual(access({guestFirstVideoUsed:true}),{allowed:false,reason:'guest_used',chargeCredits:0});
});
test('signed-in Basic uses included free credits through original server ledger',()=>{
  assert.deepEqual(access({session:'signed_in',balanceCredits:1300}),{allowed:true,reason:null,chargeCredits:10});
  assert.deepEqual(access({session:'signed_in',balanceCredits:10}),{allowed:true,reason:null,chargeCredits:10});
  assert.deepEqual(access({session:'signed_in',balanceCredits:9}),{allowed:false,reason:'insufficient',chargeCredits:0});
  assert.deepEqual(access({session:'signed_in',balanceCredits:0}),{allowed:false,reason:'insufficient',chargeCredits:0});
});
test('API unavailable, absent status, unknown balance and disabled schema fail closed',()=>{
  assert.equal(access({catalog:null}).reason,'checking');
  assert.equal(access({session:'checking'}).reason,'checking');
  assert.equal(access({session:'unavailable'}).reason,'unavailable');
  assert.equal(access({session:'signed_in',balanceCredits:null}).reason,'unavailable');
  assert.equal(access({catalog:{...catalog,blocked:true}}).reason,'unavailable');
  assert.equal(access({catalog:{...catalog,ready:false}}).reason,'unavailable');
  assert.equal(access({catalog:{...catalog,priceCredits:NaN}}).reason,'unavailable');
});
test('credit feature disabled preserves the original entirely local free exporter',()=>{
  assert.deepEqual(access({catalog:{...catalog,chargeRequired:false},session:'unavailable'}),{allowed:true,reason:null,chargeCredits:0});
});
