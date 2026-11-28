import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeBatches} from '../scripts/coach-speech-merge-batches.mjs'
const hash='a'.repeat(64)
const r=(id,text=null,latencyMs=null)=>({id,audioId:hash,text,latencyMs})
const a={name:'model',results:[r('1','да',12),r('2')]},b={name:'model',results:[r('1'),r('2',null,7)]}
test('merge preserves attempted failures and explicit missing rows',()=>{
 const m=mergeBatches([a,b]);assert.equal(m.partial,false);assert.equal(m.attempted,2);assert.equal(m.results[1].text,null);assert.equal(mergeBatches([a]).partial,true)
})
test('reject duplicate attempts, changed model or audio',()=>{
 assert.throws(()=>mergeBatches([a,a]));assert.throws(()=>mergeBatches([a,{...b,name:'other'}]));assert.throws(()=>mergeBatches([a,{...b,results:[r('1'),{...r('2',null,7),audioId:'b'.repeat(64)}]}]))
})
