// Exercises the EXACT Lua scripts against an isolated Redis 7 container.
// No patient records, credentials, network egress or paid inference.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'

const code=readFileSync(new URL('../lib/clients/local-narration-redis.js',import.meta.url),'utf8')
const container='andrey-voice-redis-ci'
const ttl='1209600'
function lua(name) {
  const marker='const '+name+'=`'
  const start=code.indexOf(marker)
  assert.ok(start>=0,'Lua script missing: '+name)
  const end=code.indexOf('`',start+marker.length)
  assert.ok(end>start)
  return code.slice(start+marker.length,end)
}
function evalLua(name,keys,args) {
  const output=execFileSync('docker',[
    'exec',container,'redis-cli','--raw','EVAL',lua(name),
    String(keys.length),...keys,...args.map(String),
  ],{encoding:'utf8',maxBuffer:120_000,timeout:5000})
  return output.trim()
}
function get(key) {
  return execFileSync('docker',['exec',container,'redis-cli','--raw','GET',key],
    {encoding:'utf8',timeout:5000}).trim()
}
const fixture=()=> {
  const prefix='hh:test:voice:'+randomUUID()+':'
  const id=randomUUID(),key=prefix+'item',queue=prefix+'queue',idKey=prefix+'id',now=5000
  const original={
    id,queueKey:'a'.repeat(64),version:'b'.repeat(64),locale:'ru',part:0,
    status:'queued',attempts:0,createdAt:now,nextAttemptAt:now,
    leaseId:null,leaseExpiresAt:null,audio:null,encryptedPayload:'ENCRYPTED_FAKE_ONLY',
  }
  return {id,key,queue,idKey,now,original}
}

test('atomic enqueue deduplicates same report/locale and cannot create second id mapping',()=>{
  const f=fixture()
  const first=evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,f.idKey],
    [JSON.stringify(f.original),ttl,f.now])
  assert.equal(JSON.parse(first).id,f.id)
  const second={...f.original,id:randomUUID(),createdAt:f.now+1}
  const otherIdKey=f.idKey+'-another'
  const out=evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,otherIdKey],
    [JSON.stringify(second),ttl,f.now+1])
  assert.equal(JSON.parse(out).id,f.id)
  assert.equal(get(otherIdKey),'')
})

test('lease excludes concurrent worker and completion eliminates encrypted text',()=>{
  const f=fixture()
  evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,f.idKey],
    [JSON.stringify(f.original),ttl,f.now])
  const lease=randomUUID(),now=6000
  const objectKey='narration/'+randomUUID()+'/'+'1'.repeat(64)+'.mp3'
  const first=JSON.parse(evalLua('CLAIM_SCRIPT',[f.queue],
    [now,lease,60000,objectKey,ttl]))
  assert.equal(first.status,'leased')
  assert.equal(first.attempts,1)
  assert.equal(evalLua('CLAIM_SCRIPT',[f.queue],
    [now+1,randomUUID(),60000,objectKey,ttl]),'')
  assert.equal(evalLua('COMPLETE_SCRIPT',[f.key,f.queue],
    [randomUUID(),now+2,'audio/mpeg',12345,'a'.repeat(64),ttl]),'')
  const done=JSON.parse(evalLua('COMPLETE_SCRIPT',[f.key,f.queue],
    [lease,now+2,'audio/mpeg',12345,'a'.repeat(64),ttl]))
  assert.equal(done.status,'ready')
  assert.equal(done.encryptedPayload,null)
  assert.equal(done.audio.assetPath,objectKey)
  assert.equal(evalLua('CANCEL_STALE_SCRIPT',[f.key,f.queue,f.idKey],[lease]),'0')
})

test('stale lease cancellation removes metadata; valid readers may enqueue again',()=>{
  const f=fixture()
  evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,f.idKey],
    [JSON.stringify(f.original),ttl,f.now])
  const lease=randomUUID(),objectKey='narration/'+randomUUID()+'/'+'b'.repeat(64)+'.mp3'
  evalLua('CLAIM_SCRIPT',[f.queue],[6000,lease,60000,objectKey,ttl])
  assert.equal(evalLua('CANCEL_STALE_SCRIPT',[f.key,f.queue,f.idKey],
    [randomUUID()]),'0')
  assert.equal(evalLua('CANCEL_STALE_SCRIPT',[f.key,f.queue,f.idKey],[lease]),'1')
  assert.equal(get(f.key),'')
  assert.equal(get(f.idKey),'')
  const newer=evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,f.idKey],
    [JSON.stringify(f.original),ttl,10000])
  assert.equal(JSON.parse(newer).status,'queued')
})

test('three failed attempts stop retries and discard sealed payload',()=>{
  const f=fixture()
  evalLua('ENQUEUE_SCRIPT',[f.key,f.queue,f.idKey],
    [JSON.stringify(f.original),ttl,f.now])
  let now=6000
  for(let n=1;n<=3;n++) {
    const lease=randomUUID(),objectKey='narration/'+randomUUID()+'/'+'e'.repeat(64)+'.mp3'
    const claimed=JSON.parse(evalLua('CLAIM_SCRIPT',[f.queue],
      [now,lease,60000,objectKey,ttl]))
    assert.equal(claimed.attempts,n)
    const failed=JSON.parse(evalLua('FAILURE_SCRIPT',[f.key,f.queue],
      [lease,now+100,ttl]))
    if(n<3){assert.equal(failed.status,'retry_wait');now=failed.nextAttemptAt+10}
    else{assert.equal(failed.status,'failed');assert.equal(failed.encryptedPayload,null)}
  }
  assert.equal(evalLua('CLAIM_SCRIPT',[f.queue],
    [now+99999,randomUUID(),60000,'narration/'+randomUUID()+'/'+'f'.repeat(64)+'.mp3',ttl]),'')
})
