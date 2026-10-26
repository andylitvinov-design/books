import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createHash } from 'node:crypto'
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

// Execute the actual verifier's top-level try/catch/finally without launching a
// browser. Its first public journey fails; any later case/browser read is a
// forbidden effect in the unsafe case. Short evidence-only clocks keep this an
// offline control-flow test, not a change to production or acceptance budgets.
async function actualCallerFailure({unsafe=true,writeOutcome='completed',closeOutcome='completed'}={}) {
 const source=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 const start=source.indexOf('try {\n await verifyPublicServiceConversionJourneys()')
 assert.ok(start>0)
 const events=[],logs=[],writes=[]
 let laterCases=0,pageReads=0,screenshots=0,publicCases=0,closed=0
 const original=Object.freeze(Object.assign(new Error('CONSENT_NATIVE_ACCEPTANCE_FAILED mode=keyboard phase=keyboard-ready cleanup=cleanup-close boundary=none'),{privateValue:'PRIVATE_CALLER_MARKER'}))
 const finish=outcome=>{
  if(outcome==='timed_out')return new Promise(()=>{})
  if(outcome==='rejected')throw new Error('PRIVATE_SECONDARY_MARKER')
 }
 const page={
  async evaluate(){pageReads++;events.push('evaluate');if(unsafe)assert.fail('unsafe browser evaluation');return false},
  async screenshot(){screenshots++;events.push('screenshot');if(unsafe)assert.fail('unsafe browser screenshot')},
 }
 const shotStart=source.indexOf('async function screenshotEvidence(')
 const shotEnd=source.indexOf('\nasync function api(',shotStart)
 assert.ok(shotStart>0&&shotEnd>shotStart)
 const execution='(async()=>{'+source.slice(shotStart,shotEnd)+'\n'+source.slice(start)+'})()'
 const bounded=async operation=>{
  events.push('bound')
  return boundedBestEffort(operation,10)
 }
 let thrown
 try {
  await runInNewContext(execution,{
   primaryFailure:false,checks:['earlier synthetic check'],historyNavigationDiagnostics:null,
   historyDiagnosticStage:null,historyDiagnosticStartedAt:null,
   performance:{now:()=>100},process:{env:{GITHUB_SHA:'f84-synthetic'}},output:'artifacts/app-r1',page,
   async verifyPublicServiceConversionJourneys(){publicCases++;events.push('public-case');throw original},
   unsafeConsentCleanup:error=>unsafe&&error===original,
   collectHistoryNavigationEvidence(){events.push('local-history');return {localOnly:true}},
   async writeFile(path,body){events.push('write');writes.push({path,record:JSON.parse(body)});return finish(writeOutcome)},
   boundedBestEffort:bounded,
   preserveBrowserFailure:args=>{events.push('normal-failure');return preserveBrowserFailure({...args,timeoutMs:10})},
   browser:{async newContext(){laterCases++;assert.fail('later case after failure')},async close(){closed++;events.push('browser-close');return finish(closeOutcome)}},
   console:{log(name,body){logs.push([name,JSON.parse(body)])}},
  })
 } catch(error) {thrown=error}
 assert.equal(thrown,original,'The actual catch/finally retains the sanitized primary error identity')
 assert.equal(publicCases,1);assert.equal(laterCases,0);assert.equal(closed,1)
 assert.equal(writes.length,1)
 assert.equal(writes[0].path,'artifacts/app-r1/verification.json')
 assert.deepEqual(writes[0].record.checks,['earlier synthetic check'])
 assert.equal(writes[0].record.commit,'f84-synthetic')
 assert.equal(writes[0].record.auth,'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE')
 assert.deepEqual(writes[0].record.historyNavigationEvidence,{localOnly:true})
 assert.ok(events.indexOf('write')<events.indexOf('browser-close'))
 assert.ok(!JSON.stringify({logs,writes}).includes('PRIVATE_'))
 assert.equal(logs.find(([name])=>name==='SYNTHETIC_FAILURE_RECORD')[1].outcome,writeOutcome)
 assert.equal(logs.find(([name])=>name==='SYNTHETIC_BROWSER_CLEANUP')[1].outcome,closeOutcome)
 return {events,logs,writes,pageReads,screenshots}
}

for(const writeOutcome of ['completed','rejected','timed_out'])for(const closeOutcome of ['completed','rejected','timed_out']) {
 test('actual unsafe consent caller skips browser reads with '+writeOutcome+' record / '+closeOutcome+' terminal close',async()=>{
  const result=await actualCallerFailure({writeOutcome,closeOutcome})
  assert.equal(result.pageReads,0);assert.equal(result.screenshots,0)
  assert.ok(!result.events.includes('normal-failure'))
  assert.equal(result.writes[0].record.status,'FAIL')
  assert.equal(result.writes[0].record.consentCleanup,'unconfirmed')
  assert.deepEqual(result.writes[0].record.failure,{category:'consent_cleanup_unconfirmed',stage:'outside-history',elapsedMs:null})
  assert.equal(result.logs.find(([name])=>name==='SYNTHETIC_FAILURE_SCREENSHOT')[1].outcome,'skipped_unsafe_consent_cleanup')
 })
}

test('actual ordinary failure still uses the existing record-before-screenshot path',async()=>{
 const result=await actualCallerFailure({unsafe:false,closeOutcome:'rejected'})
 assert.ok(result.events.includes('normal-failure'))
 assert.equal(result.pageReads,1);assert.equal(result.screenshots,1)
 assert.ok(result.events.indexOf('write')<result.events.indexOf('evaluate'))
 assert.equal(result.writes[0].record.status,undefined)
 assert.equal(result.writes[0].record.consentCleanup,undefined)
 assert.equal(result.logs.find(([name])=>name==='SYNTHETIC_FAILURE_SCREENSHOT')[1].outcome,'completed')
})

test('unsafe caller wiring changes only its import and top-level failure branch',async()=>{
 const source=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 assert.match(source,/import \{ verifyContactConsentNativeAcceptance, unsafeConsentCleanup \} from '\.\/helpers\/contact-consent-native-acceptance\.mjs'/)
 const restored=source.replace('import { verifyContactConsentNativeAcceptance, unsafeConsentCleanup }','import { verifyContactConsentNativeAcceptance }')
 const start=restored.lastIndexOf(' } catch(error){\n primaryFailure=true')
 const end=restored.indexOf('} finally {\n const outcome=await boundedBestEffort(()=>browser.close())',start)
 assert.ok(start>0&&end>start)
 const masked=restored.slice(0,start)+'/* CONSENT CALLER FAILURE REGION */\n'+restored.slice(end)
 // QA-only OPORA compact guest contract: exact helper import + guest block update.
 // Retain the same consent-only mask; all other App bytes stay digest-protected.
 assert.equal(createHash('sha256').update(masked).digest('hex'),'0696042b8360ba8ed709ce3027b198dafcf967dc9cc84df6a02f33c7a2b899be')
 const journeys=source.slice(source.indexOf('async function verifyPublicServiceConversionJourneys(){'),source.indexOf('\ntry {\n await verifyPublicServiceConversionJourneys()'))
 assert.match(journeys,/await verifyContactConsentNativeAcceptance\(servicePage,expect,locale\)/)
 assert.doesNotMatch(journeys.slice(journeys.indexOf('await verifyContactConsentNativeAcceptance(servicePage,expect,locale)')),/\bcatch\s*\(|\bfinally\s*\{/)
})

