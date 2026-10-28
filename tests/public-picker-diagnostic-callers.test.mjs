import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { classifyDiagnosticError } from '../scripts/helpers/isolated-browser-diagnostics.mjs'

const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')

function depthOperation(script=source){
  const marker=" await withPublicPickerActionDiagnostics(guestPickerPage,shorterPriority,{action:'depth-shorter',locale:'en'},async()=>{"
  assert.equal(script.split(marker).length,2,'Exactly one passive depth diagnostic wraps the original operation')
  const terminator="\n },{diagnosticSink:coreStageEvidence.picker})"
  assert.equal(script.split(terminator).length,2,'Exactly one source-fixed synchronous diagnostic sink closes this operation')
  const start=script.indexOf(marker)+marker.length,end=script.indexOf(terminator,start)
  assert.ok(end>start)
  const operation=script.slice(start,end)
  assert.equal(operation.trim(),"await shorterPriority.click()\n  await expect(shorterPriority).toHaveAttribute('aria-pressed','true')")
  return operation
}

test('Shorter diagnostic retains one normal native click and exact pressed assertion',async()=>{
  const operation=depthOperation(),calls=[]
  const shorterPriority={click:async()=>calls.push('native-click')}
  const expect=target=>({toHaveAttribute:async(name,value)=>{assert.equal(target,shorterPriority);assert.equal(name,'aria-pressed');assert.equal(value,'true');calls.push('exact-pressed')}})
  await new Function('shorterPriority','expect','return(async()=>{'+operation+'})()')(shorterPriority,expect)
  assert.deepEqual(calls,['native-click','exact-pressed'])
  const terminator="\n },{diagnosticSink:coreStageEvidence.picker})"
  for(const changed of [source.replace(terminator,'\n })'),source+terminator])
    assert.throws(()=>depthOperation(changed),{code:'ERR_ASSERTION'})
  for(const changed of [source.replace('await shorterPriority.click()',"await shorterPriority.click({force:true})"),source.replace("await expect(shorterPriority).toHaveAttribute('aria-pressed','true')",'')])
    assert.throws(()=>depthOperation(changed),{code:'ERR_ASSERTION'})
})

test('original click and pressed failures propagate from the exact wrapped operation',async()=>{
  const operation=depthOperation()
  for(const fail of ['click','pressed']){
    const original=new Error('synthetic-'+fail),calls=[]
    const shorterPriority={click:async()=>{calls.push('click');if(fail==='click')throw original}}
    const expect=()=>({toHaveAttribute:async()=>{calls.push('pressed');throw original}})
    await assert.rejects(new Function('shorterPriority','expect','return(async()=>{'+operation+'})()')(shorterPriority,expect),error=>error===original)
    assert.deepEqual(calls,fail==='click'?['click']:['click','pressed'])
  }
})

function guestRecorder(){
  const marker=" guestPickerPage.on('pageerror',",start=source.indexOf(marker)+marker.length,end=source.indexOf('\n',start)
  assert.ok(start>marker.length&&end>start)
  const callback=source.slice(start,end).slice(0,-1)
  const errors=[],logs=[]
  const record=new Function('classifyDiagnosticError','errors','console','return('+callback+')')(classifyDiagnosticError,errors,{log:(...args)=>logs.push(args)})
  return{record,errors,logs,callback}
}

test('guest error recorder preserves all existing accepted exclusions byte-for-byte',()=>{
  const {record,errors,logs,callback}=guestRecorder()
  const start=source.indexOf('const capturePageError=error=>{')+'const capturePageError=error=>{'.length
  const exclusion=source.slice(start,source.indexOf('return;',start)+'return;'.length)
  assert.ok(callback.includes(exclusion))
  for(const message of [
    '/api/app/bootstrap due to access control checks.',
    '/api/app/course due to access control checks.',
    '/api/app/results/synthetic-only due to access control checks.',
    '/__nextjs_original-stack-frames due to access control checks.',
  ])record(new Error(message))
  assert.deepEqual(errors,[]);assert.deepEqual(logs,[])
})

test('unknown guest errors remain failures while category-only logging is bounded and redacted',()=>{
  const {record,errors,logs}=guestRecorder(),secret='PRIVATE_QUERY_SENTINEL'
  for(let i=0;i<100;i++)record(new Error('https://invalid.example/'+secret+'?value='+secret))
  assert.deepEqual(errors,['guest-picker:unclassified_error']);assert.equal(logs.length,1)
  const message=JSON.parse(logs[0][1]);assert.deepEqual(message,{page:'guest-picker',category:'unclassified_error'})
  assert.ok(!JSON.stringify({errors,logs}).includes(secret))
  record(new TypeError(secret));assert.ok(errors.includes('guest-picker:javascript_type_error'))
  // Do not inherit a wider URL or request-error waiver.
  record(new Error('/api/app/billing/status due to access control checks.'))
  assert.equal(errors.length,2)
  assert.ok(source.includes("assert.deepEqual(errors,[]);passed('no uncaught browser errors')"))
})

function failureScreenshot(){
  const marker='  screenshot:',start=source.indexOf(marker,source.indexOf(' } catch(error){\n primaryFailure=true'))+marker.length,end=source.indexOf('\n',start)
  assert.ok(start>marker.length&&end>start)
  return source.slice(start,end).replace(/,$/,'')
}

test('active guest failure screenshot targets that page and masks all editable field values',async()=>{
  const callback=failureScreenshot(),calls=[]
  const page={name:'main'},guestPickerFailurePage={name:'guest-picker',locator:selector=>({selector})}
  const screenshotEvidence=async(target,options)=>calls.push({target,options})
  await new Function('guestPickerFailurePage','page','screenshotEvidence','output','return('+callback+')()')(guestPickerFailurePage,page,screenshotEvidence,'synthetic-output')
  assert.equal(calls[0].target,guestPickerFailurePage)
  assert.equal(calls[0].options.path,'synthetic-output/failure-synthetic-only.png')
  assert.equal(calls[0].options.fullPage,true)
  assert.deepEqual(calls[0].options.mask,[{selector:'input,textarea,[contenteditable]'}])
})

test('after guest flow the original main/history screenshot fallback remains unchanged',async()=>{
  const calls=[],page={name:'main'}
  await new Function('guestPickerFailurePage','page','screenshotEvidence','output','return('+failureScreenshot()+')()')(null,page,async(target,options)=>calls.push({target,options}),'synthetic-output')
  assert.equal(calls[0].target,page)
  assert.deepEqual(calls[0].options,{path:'synthetic-output/failure-synthetic-only.png',fullPage:true})
})

test('guest failure reference covers navigation, all locales and collection actions until successful close',()=>{
  const created=source.indexOf('const guestPickerPage=await guestPickerContext.newPage()')
  const assigned=source.indexOf('guestPickerFailurePage=guestPickerPage',created)
  const goto=source.indexOf("await guestPickerPage.goto(origin+'/en/client')",assigned)
  const depth=source.indexOf('await withPublicPickerActionDiagnostics(guestPickerPage,shorterPriority,',goto)
  const es=source.indexOf("await exercisePublicCollections(guestPickerPage,expect,'es')",depth)
  const close=source.indexOf('await guestPickerContext.close()',es)
  const clear=source.indexOf('guestPickerFailurePage=null',close)
  const passed=source.indexOf("passed('pre-login test picker",clear)
  assert.ok(created>0&&assigned>created&&goto>assigned&&depth>goto&&es>depth&&close>es&&clear>close&&passed>clear)
  assert.equal(source.split('guestPickerFailurePage=guestPickerPage').length,2)
})

test('failure classification, original error rethrow and browser cleanup gates are preserved',()=>{
  assert.match(source,/error, stage:historyDiagnosticStage,/)
  assert.match(source,/historyNavigationEvidence,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE'/)
  assert.match(source,/\}\) \} finally \{ throw error \}/)
  assert.match(source,/const outcome=await boundedBestEffort\(\(\)=>browser.close\(\)\)/)
  assert.match(source,/if\(outcome!=='completed'&&!primaryFailure\)throw new Error/)
})
