import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createGrowthStudioStore} from '../lib/growth-studio/store.js'

const ENV = {
  PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic-redis.invalid',
  PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-token-for-offline-tests-only',
}
const PREFIX='holistic-house:growth-studio:healthcheck:v1:'

function simulatedRedis({alterRead=false,failDelete=false,failSet=false}={}) {
  const entries = new Map()
  const requests = []
  const fetchFn = async (url, opts) => {
    assert.equal(url,ENV.PRESCRIPTIONS_KV_REST_API_URL)
    assert.equal(opts.method,'POST')
    assert.equal(opts.redirect,'error')
    assert.equal(opts.credentials,'omit')
    assert.equal(opts.cache,'no-store')
    assert.equal(opts.headers.Authorization,'Bearer '+ENV.PRESCRIPTIONS_KV_REST_API_TOKEN)
    const [command,...args]=JSON.parse(opts.body)
    requests.push([command,...args])
    let result
    if (command==='SET') {
      const [key,value,expiryFlag,seconds,nx] = args
      assert.match(key,/^holistic-house:growth-studio:healthcheck:v1:[0-9a-f-]{36}$/)
      assert.equal(expiryFlag,'EX')
      assert.equal(seconds,30)
      assert.equal(nx,'NX')
      assert.equal(typeof value,'string')
      assert.match(value,/^[0-9a-f-]{36}$/)
      if (failSet) return {ok:false,status:503}
      result=entries.has(key)?null:'OK'
      if (result==='OK')entries.set(key,value)
    } else if(command==='GET') {
      assert.match(args[0],new RegExp('^'+PREFIX+'[0-9a-f-]{36}$'))
      result=alterRead?'mismatched diagnostic value':entries.get(args[0])??null
    } else if(command==='DEL') {
      assert.match(args[0],new RegExp('^'+PREFIX+'[0-9a-f-]{36}$'))
      result=failDelete?0:Number(entries.delete(args[0]))
    } else throw new Error('Unexpected Redis call: '+command)
    return {ok:true,json:async()=>({result})}
  }
  return {store:createGrowthStudioStore({environment:ENV,fetchFn}),requests,entries}
}

test('the owner-triggered check writes/reads/deletes one isolated expiring key, not editorial data',async()=>{
  const probe=simulatedRedis()
  assert.equal(await probe.store.verifyPersistence(),true)
  assert.equal(probe.requests.length,3)
  assert.deepEqual(probe.requests.map(r=>r[0]),['SET','GET','DEL'])
  assert.equal(probe.requests[0][1],probe.requests[1][1])
  assert.equal(probe.requests[0][1],probe.requests[2][1])
  assert.equal(probe.entries.size,0)
  assert.ok(probe.requests.every(r=>!r.includes('holistic-house:growth-studio:editorial:v1')))
  assert.ok(probe.requests.every(r=>!r.join('|').includes('client')&&!r.join('|').includes('contacts')))
})

test('temporary key is cleaned on mismatched read; provider errors do not claim success',async()=>{
  const wrong=simulatedRedis({alterRead:true})
  await assert.rejects(wrong.store.verifyPersistence(),/storage_unavailable/)
  assert.deepEqual(wrong.requests.map(r=>r[0]),['SET','GET','DEL'])
  assert.equal(wrong.entries.size,0)
  const setFailed=simulatedRedis({failSet:true})
  await assert.rejects(setFailed.store.verifyPersistence(),/storage_unavailable/)
  assert.deepEqual(setFailed.requests.map(r=>r[0]),['SET'])
  const deleteFailed=simulatedRedis({failDelete:true})
  await assert.rejects(deleteFailed.store.verifyPersistence(),/storage_unavailable/)
  assert.deepEqual(deleteFailed.requests.map(r=>r[0]),['SET','GET','DEL','DEL'])
})

test('no real Redis config yields no writable store',()=>{
  assert.equal(createGrowthStudioStore({environment:{}}),null)
  assert.equal(createGrowthStudioStore({environment:{PRESCRIPTIONS_KV_REST_API_TOKEN:'token'}}),null)
})

test('self-test is behind the existing real owner session and requires a manual UI click',()=>{
  const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  const panel=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
  const start=actions.indexOf('export async function checkGrowthStudioStorageAction()')
  const end=actions.indexOf('export async function listGrowthStudioPostsAction()',start)
  assert.ok(start>=0&&end>start)
  const section=actions.slice(start,end)
  assert.match(section,/requireAdminRequest\(\)/)
  assert.match(section,/await store\.verifyEditorialRoundTrip\(\)/)
  assert.match(section,/storage_unavailable/)
  assert.doesNotMatch(section,/publishGrowthTelegram|sendTelegram|fetch\(|getClient|readClient/)
  assert.match(panel,/checkGrowthStudioStorageAction/)
  assert.match(panel,/onClick=\{verifyStorage\}/)
  assert.match(panel,/storageChecking/)
  assert.match(panel,/storageState==='verified'/)
  assert.doesNotMatch(panel,/PRESCRIPTIONS_KV_REST_API_TOKEN|PRESCRIPTIONS_KV_REST_API_URL|synthetic-token/)
})


test('editor-write self test exercises actual CAS Lua, exact HGETALL/HGET and deletes isolated HASH',async()=>{
  const hashes=new Map()
  const calls=[]
  const fetchFn=async(url,opts)=>{
    assert.equal(url,ENV.PRESCRIPTIONS_KV_REST_API_URL)
    assert.equal(opts.method,'POST')
    assert.equal(opts.credentials,'omit')
    assert.equal(opts.redirect,'error')
    assert.equal(opts.headers.Authorization,'Bearer '+ENV.PRESCRIPTIONS_KV_REST_API_TOKEN)
    const [method,...args]=JSON.parse(opts.body)
    calls.push([method,...args])
    const key=method==='EVAL'?args[2]:args[0]
    assert.match(key,/^holistic-house:growth-studio:healthcheck:v1:[a-f0-9-]{36}$/i)
    let result
    if(method==='EVAL'){
      const [script,n,hash,identity,revisionOrData,restPayload,maxRecords]=args
      assert.equal(n,1)
      const bucket=hashes.get(hash)
      if(script.includes("redis.call('EXISTS',KEYS[1])")){
        assert.equal(bucket,undefined)
        assert.match(script,/EXPIRE/)
        assert.match(script,/30/)
        assert.ok(typeof revisionOrData==='string')
        const initial=JSON.parse(revisionOrData)
        assert.equal(initial.revision,1)
        assert.equal(initial.status,'draft')
        assert.equal(initial.id,identity)
        hashes.set(hash,new Map([[identity,revisionOrData]]))
        result=1
      }else{
        assert.ok(script.includes("redis.call('HGET', KEYS[1], ARGV[1])"))
        const old=bucket?.get(identity)
        const expected=Number(revisionOrData)
        if(!old||JSON.parse(old).revision!==expected)result=0
        else {
          const updated=JSON.parse(restPayload)
          assert.equal(updated.id,identity)
          assert.equal(updated.revision,2)
          assert.equal(updated.status,'approved')
          assert.equal(maxRecords,1)
          bucket.set(identity,restPayload)
          result=1
        }
      }
    }else if(method==='HGETALL'){
      result=[...hashes.get(key)||[]].flat()
    }else if(method==='HGET'){
      result=hashes.get(key)?.get(args[1])??null
    }else if(method==='DEL'){
      result=Number(hashes.delete(key))
    }else throw new Error('Unexpected Redis command '+method)
    return {ok:true,json:async()=>({result})}
  }
  const store=createGrowthStudioStore({environment:ENV,fetchFn})
  assert.equal(await store.verifyEditorialRoundTrip(),true)
  assert.deepEqual(calls.map(c=>c[0]),['EVAL','HGETALL','EVAL','HGET','EVAL','DEL'])
  assert.equal(hashes.size,0)
  assert.ok(!JSON.stringify(calls).includes('holistic-house:growth-studio:editorial:v1'))
  assert.ok(!JSON.stringify(calls).match(/client_id|medical|patient|test_scores|crm_contacts/))
})

test('editor-write self test fails closed, cleans isolated key and never marks CAS mismatch as success',async()=>{
  for(const failOn of ['HGETALL','CAS','DEL']){
    const hashes=new Map()
    const calls=[]
    const fetchFn=async(_url,{body})=>{
      const [method,...args]=JSON.parse(body)
      calls.push(method)
      const key=method==='EVAL'?args[2]:args[0]
      let result
      if(method==='EVAL'){
        if(args[0].includes("redis.call('EXISTS',KEYS[1])")){
          const id=args[3]
          hashes.set(key,new Map([[id,args[4]]]))
          result=1
        }else if(failOn==='CAS')result=0
        else {
          const id=args[3]
          hashes.get(key).set(id,args[5])
          result=1
        }
      }else if(method==='HGETALL'){
        const values=[...hashes.get(key)].flat()
        result=failOn==='HGETALL'?[]:values
      }else if(method==='HGET'){
        result=hashes.get(key)?.get(args[1])??null
      }else if(method==='DEL'){
        result=failOn==='DEL'?0:Number(hashes.delete(key))
      }else throw Error('Unexpected command')
      return {ok:true,json:async()=>({result})}
    }
    const store=createGrowthStudioStore({environment:ENV,fetchFn})
    await assert.rejects(store.verifyEditorialRoundTrip(),/storage_unavailable/,failOn)
    assert.ok(calls.includes('DEL'),failOn+' must try cleanup')
    assert.ok(calls.every(name=>['EVAL','HGETALL','HGET','DEL'].includes(name)))
  }
})

test('the already-authenticated owner auto-checks storage without posts, public endpoints or passwords',()=>{
  const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
  const page=readFileSync(new URL('../app/admin/growth-studio/page.js',import.meta.url),'utf8')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(actions,/export async function checkGrowthStudioStorageAction\(\)[\s\S]*?requireAdminRequest\(\)/)
  assert.match(actions,/await store\.verifyEditorialRoundTrip\(\)/)
  assert.match(ui,/useEffect\(\(\)=>\{void verifyStorage\(\)\},\[verifyStorage\]\)/)
  assert.match(ui,/if\(storageProbeInFlight\.current\)return/)
  assert.match(ui,/onClick=\{verifyStorage\}/)
  assert.match(ui,/t\.storagePassShort/)
  assert.match(ui,/t\.channelCount/)
  assert.doesNotMatch(ui,/PRESCRIPTIONS_KV_REST_API_TOKEN|client_id|test_scores|accessToken/)
})
