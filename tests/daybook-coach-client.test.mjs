import test from 'node:test'
import assert from 'node:assert/strict'
import {createDaybookCoachClient} from '../lib/app/daybook-coach-client.mjs'
const owner='11111111-1111-4111-8111-111111111111'
test('private request uses the captured account and never completes after owner disposal',async()=>{
 let finish,call
 const client=createDaybookCoachClient((...args)=>{call=args;return new Promise(resolve=>{finish=resolve})},owner)
 const pending=client.run({operation:'issue',kind:'journal'})
 assert.deepEqual(call,['daybook-coach',{operation:'issue',kind:'journal'},'POST',{accountId:owner}])
 client.dispose();finish({token:'opaque'})
 await assert.rejects(pending,{code:'DAYBOOK_COACH_STALE'})
 await assert.rejects(client.run({operation:'issue'}),{code:'DAYBOOK_COACH_STALE'})
})
test('newer request supersedes an older response without exposing its private preview',async()=>{
 const done=[]
 const client=createDaybookCoachClient(()=>new Promise(resolve=>done.push(resolve)),owner)
 const first=client.run({operation:'resolve',token:'old'})
 const second=client.run({operation:'resolve',token:'new'})
 done[1]({source:{text:'new current source'}})
 assert.equal((await second).source.text,'new current source')
 done[0]({source:{text:'old source'}})
 await assert.rejects(first,{code:'DAYBOOK_COACH_STALE'})
})
test('suspension rejects both successful and failed outstanding requests as stale',async()=>{
 for(const outcome of ['resolve','reject']){
  let complete
  const client=createDaybookCoachClient(()=>new Promise((yes,no)=>{complete=outcome==='resolve'?yes:no}),owner)
  const pending=client.run({operation:'resolve'})
  client.invalidate();complete(new Error('old private failure'))
  await assert.rejects(pending,{code:'DAYBOOK_COACH_STALE'})
 }
})
