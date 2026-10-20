import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { boundedBestEffort, preserveBrowserFailure } from '../scripts/helpers/browser-failure-evidence.mjs'

test('failure record precedes browser work and excludes raw errors and unknown stages', async () => {
 const order=[], logs=[]
 await preserveBrowserFailure({error:new Error('token=secret'),stage:'secret',elapsedMs:12.4,
  log:(name,value)=>{order.push(name);logs.push(value)},write:async value=>{order.push('write');assert.equal(value.category,'unclassified_error')},screenshot:async()=>order.push('image')})
 assert.deepEqual(order,['SYNTHETIC_FAILURE_ENTERED','write','SYNTHETIC_FAILURE_RECORD','image','SYNTHETIC_FAILURE_SCREENSHOT'])
 assert.ok(!JSON.stringify(logs).includes('secret'));assert.equal(logs[0].stage,'outside-history')
})
test('hanging and rejecting screenshot or cleanup are bounded and classified', async () => {
 for(const [operation,expected] of [[()=>new Promise(()=>{}),'timed_out'],[()=>Promise.reject(new Error('secret')),'rejected'],[()=>{},'completed']]) {
  assert.equal(await boundedBestEffort(operation,10),expected)
  const logs=[]
  await preserveBrowserFailure({error:new Error('Timeout 30000ms exceeded'),stage:'goto-start',elapsedMs:30001,
   write:async()=>{},screenshot:operation,timeoutMs:10,log:(name,value)=>logs.push([name,value])})
  assert.equal(logs[0][1].stage,'goto-start');assert.equal(logs[0][1].category,'timeout')
  assert.equal(logs.at(-1)[1].outcome,expected)
 }
})
test('failure recording rejection or hang does not prevent bounded screenshot attempt', async () => {
 for(const write of [()=>new Promise(()=>{}),()=>{throw Error('secret')}]) {
  let screenshot=false
  await preserveBrowserFailure({error:Error('original'),write,screenshot:()=>{screenshot=true},log:()=>{},timeoutMs:10})
  assert.equal(screenshot,true)
 }
})
test('verifier retains original failure, readiness and assertion semantics', async () => {
 const s=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 assert.match(s,/historyDiagnostic\('goto-start'\)\s+await page.goto\(origin\+'\/en\/app\/history'\)\s+historyDiagnostic\('goto-complete'\)/)
 assert.match(s,/await ready\(\)\s+historyDiagnostic\('ready-complete'\)/)
 assert.match(s,/await expect\(page.locator\('\.hh-change'\)\).toContainText\('7 → 4'\)/)
 assert.match(s,/finally \{ throw error \}/)
 assert.match(s,/boundedBestEffort\(\(\)=>browser.close\(\)\)/)
 assert.match(s,/outcome!=='completed'&&!primaryFailure/)
})
test('original error identity survives hung screenshots and rejected cleanup', async () => {
 const original=new Error('original navigation failure')
 async function run() {
  let primaryFailure=false
  try { throw original } catch(error) {
   primaryFailure=true
   try { await preserveBrowserFailure({error,stage:'goto-start',elapsedMs:30000,write:()=>{},log:()=>{},screenshot:()=>new Promise(()=>{}),timeoutMs:10}) }
   finally { throw error }
  } finally {
   const outcome=await boundedBestEffort(()=>Promise.reject(new Error('cleanup')),10)
   if(outcome!=='completed'&&!primaryFailure)throw Error('cleanup')
  }
 }
 await assert.rejects(run(),error=>error===original)
})
