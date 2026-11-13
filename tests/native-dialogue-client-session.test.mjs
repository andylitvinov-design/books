import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newNativeSessionTurn,acceptNativeSession,advanceNativeClientSession} from '../lib/holistic-support/native-dialogue-client-session.mjs';

const turn='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('client sends only opaque session metadata and accepts one revision advance',()=>{
 const first=newNativeSessionTurn(null,turn);
 assert.deepEqual(first,{id:null,revision:0,turnId:turn});
 assert.deepEqual(acceptNativeSession(first,{id,revision:1}),{id,revision:1});
 const next=newNativeSessionTurn({id,revision:1},turn);
 assert.deepEqual(next,{id,revision:1,turnId:turn});
 assert.deepEqual(acceptNativeSession(next,{id,revision:2}),{id,revision:2});
});
test('a response without state metadata clears the old pointer; malformed metadata fails closed',()=>{
 const request=newNativeSessionTurn({id,revision:1},turn);
 assert.equal(advanceNativeClientSession(request,undefined),null);
 assert.equal(advanceNativeClientSession(request,null),null);
 assert.deepEqual(advanceNativeClientSession(request,{id,revision:2}),{id,revision:2});
 assert.throws(()=>advanceNativeClientSession(request,{id,revision:1}),/INVALID_NATIVE_SESSION_RESPONSE/);
});
test('missing or malformed server metadata cannot replace existing state',()=>{
 const request=newNativeSessionTurn({id,revision:1},turn);
 for(const response of [undefined,null,{id,revision:1},{id,revision:3},{id:'invalid',revision:2},
  {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',revision:2},{id,revision:2,state:{goal:'consultation'}}])
  assert.equal(acceptNativeSession(request,response),null);
});
