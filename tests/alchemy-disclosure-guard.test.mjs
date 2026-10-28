import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { installAlchemyDisclosureGuard } from '../scripts/helpers/alchemy-disclosure-guard.mjs'
const source = readFileSync(new URL('../scripts/verify-alchemy-one-screen.mjs',import.meta.url),'utf8')
async function fixture() {
  const events=[], violations=[], page={}, popup={close:async()=>events.push('popup closed')}
  let handler, onPage, closed=false
  const context={
    on:(event,callback)=>{assert.equal(event,'page');onPage=callback},
    route:async(pattern,callback)=>{assert.equal(pattern,'**/*');handler=callback},
    close:async()=>{events.push('context closed');closed=true},
  }
  const settle = await installAlchemyDisclosureGuard(context,page,'http://127.0.0.1:3100',violations)
  const request = (phase,{method='POST',url='http://127.0.0.1:3100/api/service-enquiries',owner=page,delay}={}) => {
    assert.equal(closed,false,'no new requests after context disposal')
    events.push(phase)
    return handler({request:()=>({method:()=>method,url:()=>url,frame:()=>({page:()=>owner})}),
      abort:async()=>{if(delay)await delay;events.push('aborted '+phase)},
      continue:async()=>events.push('continued '+phase)})
  }
  return {events,violations,page,popup,context,settle,request,popupEvent:()=>onPage(popup)}
}
for (const phase of ['Book click','authored close','late before context close']) {
  for (const kind of ['mutation','external GET','popup first navigation']) test(phase+' blocks '+kind,async()=>{
    const f=await fixture()
    const options=kind==='external GET'?{method:'GET',url:'https://provider.invalid/'}:kind==='popup first navigation'?{method:'GET',owner:f.popup}:{}
    await f.request(phase,options)
    if(kind==='popup first navigation')f.popupEvent()
    await f.context.close();await f.settle()
    assert.ok(f.events.includes('aborted '+phase))
    assert.equal(f.events.some(x=>x.startsWith('continued')),false)
    assert.ok(f.violations.includes('unexpected booking disclosure network request'))
    if(kind==='popup first navigation'){
      assert.ok(f.violations.includes('unexpected booking popup'))
      assert.ok(f.events.includes('popup closed'))
    }
  })
}
test('same-origin public GET remains allowed; disposal drains an already pending abort',async()=>{
  const f=await fixture()
  await f.request('sample public route',{method:'GET'})
  let finish
  const gate=new Promise(resolve=>{finish=resolve})
  const pending=f.request('in-flight mutation',{delay:gate})
  await Promise.resolve()
  await f.context.close()
  let drained=false
  const drain=f.settle().then(()=>{drained=true})
  await Promise.resolve()
  assert.equal(drained,false,'must not report acceptance while abort remains unsettled')
  finish();await pending;await drain
  assert.ok(f.events.includes('continued sample public route'))
  assert.ok(f.events.includes('aborted in-flight mutation'))
  assert.equal(f.violations.length,1)
})
test('actual native finally closes context and drains late interception after thrown action',async()=>{
  const f=await fixture()
  const begin=source.indexOf('      try { await context.close(); } finally { await settleDisclosure(); }')
  const end=source.indexOf('\n    }\n  }',begin)
  assert.ok(begin>=0&&end>begin,'complete per-case disposal and error gate')
  const cleanup=source.slice(begin,end)
  const failures=[]
  const realClose=f.context.close
  f.context.close=async()=>{await f.request('late during disposal');await realClose()}
  await assert.rejects(runInNewContext('(async()=>{try{throw Error("action failed")}finally{'+cleanup+'}})()',{
    context:f.context,settleDisclosure:f.settle,disclosureViolations:f.violations,disclosureDiagnostics:[],caseDiagnostics:[],locale:"ru",width:390,height:844,failures,key:'ru/390x844',console:{error:()=>{}},
  }),/action failed/)
  assert.ok(f.events.includes('context closed'))
  assert.ok(f.events.includes('aborted late during disposal'))
  assert.equal(failures.length,1,'late violation remains fatal even on thrown action')
})
test('native context ownership is per case, worker-blocked, and guard is never removed early',()=>{
  assert.match(source,/browser\.newContext\(\{viewport:\{width,height\}, serviceWorkers:"block"\}\)/)
  assert.match(source,/page\.on\("pageerror"/)
  assert.doesNotMatch(source,/\.unroute\(|page\.close\(/)
  assert.ok(source.indexOf('installAlchemyDisclosureGuard(context, page')<source.indexOf('await trigger.click()'))
  assert.match(source,/assert\.deepEqual\(failures, \[\]/)
})
