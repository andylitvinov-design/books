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
  assert.match(section,/await store\.verifyPersistence\(\)/)
  assert.match(section,/storage_unavailable/)
  assert.doesNotMatch(section,/publishGrowthTelegram|sendTelegram|fetch\(|getClient|readClient/)
  assert.match(panel,/checkGrowthStudioStorageAction/)
  assert.match(panel,/onClick=\{verifyStorage\}/)
  assert.match(panel,/storageChecking/)
  assert.match(panel,/storageState==='verified'/)
  assert.doesNotMatch(panel,/PRESCRIPTIONS_KV_REST_API_TOKEN|PRESCRIPTIONS_KV_REST_API_URL|synthetic-token/)
})
