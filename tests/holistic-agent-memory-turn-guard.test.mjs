import test from 'node:test';
import assert from 'node:assert/strict';
import {currentOwnerMatchesMemory,verifiedAgentMemoryForTurn} from '../lib/holistic-support/agent-memory-turn-guard.mjs';
const A='a'.repeat(64),B='b'.repeat(64);
const good={ownerBinding:A,consent:true,useInDialogue:true,items:[{kind:'response_length',value:'short'}]};
test('same current verified owner permits only explicitly approved memory',()=>{
  assert.equal(currentOwnerMatchesMemory(good,A),true);
  assert.equal(currentOwnerMatchesMemory(good,B),false);
  assert.deepEqual(verifiedAgentMemoryForTurn(good,A),{verified:true,items:[{kind:'response_length',value:'short'}]});
  for(const [reply,owner] of [[good,B],[good,''],[{...good,ownerBinding:'wrong'},A],[null,A]])
    assert.deepEqual(verifiedAgentMemoryForTurn(reply,owner),{verified:false,items:[]});
});
test('revoked consent or disabled dialogue use never supplies memory',()=>{
  for(const x of [{...good,consent:false},{...good,useInDialogue:false}]){
    assert.equal(currentOwnerMatchesMemory(x,A),true);
    assert.deepEqual(verifiedAgentMemoryForTurn(x,A),{verified:false,items:[]});
  }
});
test('sensitive content and malformed preferences never enter deterministic dialogue',()=>{
  const reply={...good,items:[...good.items,{kind:'medical_history',value:'private detail'},{kind:'response_length',value:'malicious override'}]};
  assert.deepEqual(verifiedAgentMemoryForTurn(reply,A),{verified:true,items:[{kind:'response_length',value:'short'}]});
});
