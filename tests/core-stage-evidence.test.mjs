import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { createCoreStageEvidence, emitCoreSummary, sanitizeCoreSummary, CORE_STAGES } from '../scripts/helpers/core-stage-evidence.mjs'
import { OPORA_PUBLIC_ENTRY, verifyOporaPublicEntry } from '../scripts/helpers/opora-public-entry-verifier.mjs'
import { withPublicPickerActionDiagnostics } from '../scripts/helpers/public-picker-action-diagnostics.mjs'
// Inert lifecycle double only: does not execute product/browser/provider code.
const antiStressBlueprint = () => ({days:Array.from({length:14},(_,i)=>({day:i+1})),tests:['hh-weekly-pulse','gad-7','hh-resource-pulse'].map(key=>({key}))})
const renderedPreview = locale => { const t=OPORA_PUBLIC_ENTRY[locale]; return {snapshot:{
 title:t.title,weekCount:'7',days:t.days.map((title,i)=>({day:String(i+1),title})),
 accept:{tag:'BUTTON',type:'button',google:true,fastConsent:false,disabled:false,text:t.accept},
 explore:{tag:'A',href:'/'+locale+'/courses/antistress',text:t.explore},privacy:t.privacy,
}}}
function lifecycleFixture(options = {}) {
 const origin = 'http://127.0.0.1:3100', context = new EventEmitter(), pages = [], screenshots = [], requests = [], journey = [], evidence = []
 const routes = new Set(), snapshots = new Map()
 context.route = async (_pattern, handler) => { routes.add(handler) }
 context.unroute = async (_pattern, handler) => {
  await options.onUnroute?.({ context, pages, requests })
  if (options.unrouteError) throw options.unrouteError
  routes.delete(handler)
 }
 context.dispatch = async (url, method = 'GET', behavior = {}) => {
  const record = { url, method, aborted: false, forwarded: false }; requests.push(record)
  const handler = [...routes].at(-1)
  if (!handler) { record.forwarded = true; return }
  await handler({ request: () => ({ url: () => url, method: () => method }),
   abort: async () => { record.aborted = true; if (behavior.abortError) throw behavior.abortError },
   fallback: async () => { if (behavior.fallback) await behavior.fallback(); record.forwarded = true },
  })
 }
 const createPage = (opener = null) => {
  const page = new EventEmitter()
  Object.assign(page, { locale: 'en', phase: 'blank', currentUrl: 'about:blank', closed: false, viewports: [],
   context: () => context, opener: async () => opener, isClosed: () => page.closed,
   url: () => page.currentUrl, mainFrame: () => page,
   viewportSize: () => page.viewports.at(-1) || null,
   setViewportSize: async viewport => { page.viewports.push({ ...viewport }) },
   goto: async url => {
    assert.ok(routes.size, 'Fence must exist before owned navigation')
    await context.dispatch(url)
    if (options.primaryError) throw options.primaryError
    page.currentUrl = url; page.locale = new URL(url).pathname.split('/')[1]; page.phase = 'invite'
    journey.push(page.locale + ':entry')
   },
   evaluate: async () => true,
   close: async () => {
    assert.ok(routes.size, 'Owned pages close under the active fence')
    await options.onClose?.({ page, context, pages, createPage })
    if (options.closeError && !opener) throw options.closeError
    page.closed = true
   },
  })
  if (options.observerSetupError) {
   const on = page.on.bind(page)
   page.on = (type, listener) => {
    if (type === 'request') throw options.observerSetupError
    return on(type, listener)
   }
  }
  const locator = (kind, value) => {
   const t = OPORA_PUBLIC_ENTRY[page.locale]
   if (!snapshots.has(page.locale)) snapshots.set(page.locale, renderedPreview(page.locale).snapshot)
   const snapshot = snapshots.get(page.locale)
   const exists = () => {
    if (['landing', 'preview', 'previewDays', 'previewTitles', 'accept', 'privacy', 'explore'].includes(kind)) return page.phase === 'invite'
    if (['programme', 'enrollment', 'overview', 'phases', 'skills', 'skillSummary', 'detailed', 'daySummary', 'days', 'questionnaires', 'card', 'cardText'].includes(kind)) return page.phase === 'programme'
    if (kind === 'heading') return value === (page.phase === 'invite' ? t.title : t.programmeTitle)
    return false
   }
   const result = { kind, value, exists,
    first: () => result,
    locator: selector => {
     if (selector === 'summary') return locator(kind === 'detailed' ? 'daySummary' : 'skillSummary')
     return select(selector)
    },
    getByRole: (role, settings = {}) => locator(role === 'heading' ? 'heading' : role === 'button' ? 'accept' : 'explore', settings.name),
    getByText: text => locator(kind === 'card' ? 'cardText' : 'privacy', text),
    click: async () => {
     assert.ok(exists(), 'Only a present node may be activated')
     if (kind === 'explore') {
      await options.onExplore?.({ page, context })
      if (options.renderedProgrammeAtOldUrl) page.phase = 'programme'
      if (options.failedExplore) return
      page.phase = 'programme'; page.currentUrl = origin + '/' + page.locale + '/courses/antistress'
      await context.dispatch(page.currentUrl); journey.push(page.locale + ':programme')
     } else if (kind === 'enrollment') {
      page.phase = 'invite'; page.currentUrl = origin + '/' + page.locale + '/app/course?program=stress'
      await context.dispatch(page.currentUrl); journey.push(page.locale + ':back')
     } else if (kind === 'skillSummary') page.skillOpen = true
     else if (kind === 'daySummary') page.daysOpen = true
     else assert.fail('No OAuth, enrolment, test or unrelated control may be clicked')
    },
    evaluate: async () => { assert.equal(kind, 'preview'); return snapshot },
    evaluateAll: async () => {
     if (kind === 'days') return antiStressBlueprint(page.locale).days.map(day => String(day.day))
     assert.equal(kind, 'questionnaires')
     return antiStressBlueprint(page.locale).tests.map(test => test.key)
    },
    count: () => ['previewDays', 'previewTitles', 'phases', 'skills'].includes(kind) ? 7 : kind === 'days' ? 14 : kind === 'questionnaires' ? 3 : 1,
    text: () => kind === 'previewTitles' ? snapshot.days.map(day => day.title) : kind === 'privacy' ? snapshot.privacy : kind === 'accept' ? snapshot.accept.text : value,
    attribute: name => name === 'href' ? kind === 'explore' ? snapshot.explore.href : '/' + page.locale + '/app/course?program=stress' :
     name === 'open' && (kind === 'detailed' ? page.daysOpen : page.skillOpen) ? '' : null,
   }
   return result
  }
  const selectors = {
   '[data-opora-guest-landing]': 'landing', '[data-opora-first-week-intro]': 'preview', '[data-opora-preview-day]': 'previewDays',
   '[data-opora-preview-day] strong': 'previewTitles', 'button[data-opora-week-one-accept][data-course-google-signin]': 'accept',
   '[data-opora-antistress-landing]': 'programme', 'a[data-antistress-start]': 'enrollment',
   '[data-course-before-signup="guest"]': 'overview', '[data-course-phase]': 'phases', '[data-course-skill-accordion]': 'skills',
   '[data-course-14-day-list]': 'detailed', '[data-course-day]': 'days', '[data-antistress-test]': 'questionnaires',
  }
  const select = selector => {
   if (/^\[data-antistress-test="[a-z0-9-]+"\]$/.test(selector)) return locator('card', selector)
   assert.ok(selectors[selector], 'Unexpected helper selector: ' + selector)
   return locator(selectors[selector])
  }
  page.locator = select
  pages.push(page)
  context.emit('page', page)
  if (opener) opener.emit('popup', page)
  return page
 }
 context.newPage = async () => createPage()
 const caller = { context: () => context, viewportSize: () => ({ width: 375, height: 812 }),
  close: async () => assert.fail('Caller ownership must be preserved'), setViewportSize: async () => assert.fail('Caller viewport must not change') }
 const expect = target => ({
  toHaveURL: async expected => assert.equal(target.currentUrl, expected),
  toBeVisible: async () => assert.ok(target.exists(), 'Expected rendered node ' + target.kind),
  toHaveCount: async count => assert.equal(target.count(), count),
  toHaveText: async value => assert.deepEqual(target.text(), value),
  toBeEnabled: async () => assert.equal(target.kind, 'accept'),
  toHaveAttribute: async (name, value) => assert.equal(target.attribute(name), value),
 })
 return { origin, caller, context, pages, routes, requests, screenshots, journey, evidence, createPage,
  run: async (verify = verifyOporaPublicEntry) => {
   const original = console.log
   console.log = (label, value) => {
    assert.equal(label, 'SYNTHETIC_OPORA_NAVIGATION_DIAGNOSTIC')
    evidence.push(JSON.parse(value)); if (options.recordError) throw options.recordError
   }
   try { return await verify(caller, expect, { origin, runtime: 'isolated', diagnosticSink: options.diagnosticSink, output: '/not-written', screenshotEvidence: async target => {
    assert.notEqual(target, caller); assert.ok(pages.includes(target)); screenshots.push(target)
   } }) } finally { console.log = original }
  },
 }
}
const pickerRecord = () => ({action:'depth-shorter',locale:'en',result:'passed',setup:'completed',capture:'completed',cleanup:'completed',installed:true})
test('unsupported Promise constructor/species/proxy/thenable returns are never inspected',()=>{
 let reads=0
 const native=Promise.resolve();Object.defineProperty(native,'constructor',{get(){reads++;throw Error('constructor hook')}})
 const returns=[native,new Proxy({}, {get(){reads++;throw Error('proxy hook')}}),{get then(){reads++;throw Error('then hook')}}]
 for(const value of returns)emitCoreSummary(()=>value,'picker',pickerRecord())
 assert.equal(reads,0)
})
test('actual wired collectors are synchronous and serialize only strict bounded records',()=>{
 const core=createCoreStageEvidence({now:()=>10})
 assert.equal(core.picker(pickerRecord()),undefined)
 const record={phase:'complete',firstBlockedEndpoint:'none',firstBlockedMethod:'none',firstBlockedOrigin:'none',stage:'owned-page',locale:'unknown',category:'none',cleanupStage:'complete',blockedCount:0,pageErrorCount:0,cleanupErrorCount:0,ownedCount:0,routeInstalled:false,primaryFailed:false}
 assert.equal(core.opora(record),undefined)
 const evidence=JSON.parse(JSON.stringify(core.snapshot()))
 assert.deepEqual(evidence.picker,[pickerRecord()]);assert.deepEqual(evidence.opora,[record])
})
test('optional OPORA summary never inspects primary or cleanup thrown values',async()=>{
 for(const kind of ['getter','proxy','revoked-proxy'])for(const field of ['primaryError','closeError','unrouteError']) {
  let reads=0
  let error
  if(kind==='getter')error=Object.defineProperties({},{message:{get(){reads++;return 'secret'}},name:{get(){reads++;return 'secret'}}})
  else if(kind==='proxy')error=new Proxy({}, {get(){reads++;return 'secret'},getPrototypeOf(){reads++;return null},ownKeys(){reads++;return []},getOwnPropertyDescriptor(){reads++;return undefined}})
  else {const value=Proxy.revocable({},{});value.revoke();error=value.proxy}
  const records=[],h=lifecycleFixture({[field]:error,diagnosticSink:r=>records.push(r)})
  let caught;try{await h.run()}catch(value){caught=value}
  assert.equal(caught===error,true);assert.equal(reads,0)
  assert.equal(records.length,1);assert.equal(records[0].category,'unclassified_error')
 }
})
test('numeric limits reject nonfinite and noninteger counts; unknown enum/kind never coerced',()=>{
 const record={phase:'cleanup',firstBlockedEndpoint:'none',firstBlockedMethod:'none',firstBlockedOrigin:'none',stage:'owned-page',locale:'unknown',category:'timeout',cleanupStage:'close-owned',blockedCount:0,pageErrorCount:0,cleanupErrorCount:1,ownedCount:2,routeInstalled:true,primaryFailed:false}
 for(const value of [NaN,Infinity,-1,0.5,'2'])assert.equal(sanitizeCoreSummary('opora',{...record,blockedCount:value}),null)
 assert.equal(sanitizeCoreSummary('opora',{...record,blockedCount:1e12}).blockedCount,1000000)
 assert.equal(sanitizeCoreSummary('opora',{...record,stage:'secret-url'}),null)
 assert.equal(sanitizeCoreSummary({toString(){assert.fail('kind coercion')}},record),null)
 const {proxy,revoke}=Proxy.revocable(record,{});revoke();assert.equal(sanitizeCoreSummary('opora',proxy),null)
})
test('strict evidence rejects getters, proxies, symbols, inherited and unknown fields without invoking them',()=>{
 let touched=0
 const hostile=[new Proxy(pickerRecord(),{ownKeys(){touched++;throw Error()}}),Object.assign(Object.create({}),pickerRecord()),{...pickerRecord(),extra:'secret'},{...pickerRecord(),[Symbol()]:1}]
 const getter=pickerRecord();Object.defineProperty(getter,'action',{get(){touched++;return 'depth-shorter'},enumerable:true});hostile.push(getter)
 for(const value of hostile)assert.equal(sanitizeCoreSummary('picker',value),null)
 assert.equal(touched,0);assert.equal(sanitizeCoreSummary('__proto__',pickerRecord()),null)
})
test('fixed enum clock bounds and immutable capped records',()=>{
 let time=10;const c=createCoreStageEvidence({now:()=>time})
 for(const stage of CORE_STAGES){c.mark(stage);assert.equal(c.snapshot().stage,stage)}
 c.mark('https://secret');assert.equal(c.snapshot().stage,'after-cabinet-navigation')
 for(let i=0;i<10;i++)c.picker(pickerRecord())
 time=Infinity;assert.equal(c.snapshot().elapsedMs,null)
 time=1e12;assert.equal(c.snapshot().elapsedMs,86400000)
 assert.equal(c.snapshot().picker.length,4)
 const snap=c.snapshot();snap.picker.length=0;assert.equal(c.snapshot().picker.length,4)
})
test('synchronous sinks ignore throws, proxies and unsupported returns without adopting them',async()=>{
 for(const sink of [undefined,()=>{throw Error('secret')},async()=>{assert.fail('async sink must not run')},()=>({get then(){throw Error('never')}}),new Proxy(()=>assert.fail('proxy called'),{})])emitCoreSummary(sink,'picker',pickerRecord())
 await new Promise(resolve=>setImmediate(resolve))
})
test('OPORA default and optional success preserve exact lifecycle action trace',async()=>{
 const a=lifecycleFixture(),records=[],b=lifecycleFixture({diagnosticSink:r=>records.push(r)})
 await a.run();await b.run();assert.deepEqual(a.journey,b.journey);assert.deepEqual(a.requests,b.requests)
 assert.equal(a.screenshots.length,b.screenshots.length);assert.equal(b.routes.size,0)
 assert.equal(records.length,1);assert.equal(records[0].phase,'complete');assert.equal(records[0].cleanupStage,'complete')
})
test('OPORA primary and cleanup failures retain original identity/precedence with throwing sink',async()=>{
 const primary=Error('original-primary'),cleanup=Error('original-cleanup'),records=[]
 for(const sink of [r=>records.push(r),()=>{throw Error('sink')}]) {
  const h=lifecycleFixture({primaryError:primary,closeError:cleanup,diagnosticSink:sink})
  await assert.rejects(h.run(),e=>e===primary)
 }
 assert.deepEqual(records.map(r=>r.phase),['primary','cleanup'])
 assert.equal(records[1].cleanupStage,'close-owned');assert.equal(records[1].primaryFailed,true)
})
test('OPORA cleanup-only failure is emitted and remains fatal',async()=>{
 const cleanup=Error('original-cleanup'),records=[],h=lifecycleFixture({closeError:cleanup,diagnosticSink:r=>records.push(r)})
 await assert.rejects(h.run(),e=>e===cleanup)
 assert.equal(records.length,1);assert.equal(records[0].phase,'cleanup');assert.equal(records[0].category,'unclassified_error')
 assert.equal(records[0].primaryFailed,false);assert.ok(h.routes.size)
})
test('OPORA fence-removal-only failure remains fatal and classified separately',async()=>{
 const failure=Error('original-unroute'),records=[],h=lifecycleFixture({unrouteError:failure,diagnosticSink:r=>records.push(r)})
 await assert.rejects(h.run(),e=>e===failure)
 assert.equal(records[0].cleanupStage,'fence-removal');assert.ok(h.routes.size)
})
test('picker optional sink preserves native value and failure identity, unchanged log/capture',async()=>{
 for(const fail of [false,true])for(const sink of [undefined,()=>{throw Error('sink')}]) {
  const calls=[],error=Error('original'),page={evaluate:async()=>{calls.push('capture');return null}},target={evaluate:async()=>{calls.push('setup');return false}}
  const op=()=>{calls.push('operation');if(fail)throw error;return 'value'}
  const work=withPublicPickerActionDiagnostics(page,target,{action:'depth-shorter',locale:'en'},op,{log:()=>calls.push('log'),diagnosticSink:sink})
  if(fail)await assert.rejects(work,e=>e===error);else assert.equal(await work,'value')
  assert.deepEqual(calls,['setup','operation','capture','log'])
 }
 await new Promise(resolve=>setImmediate(resolve))
})
test('picker successful and failed operation emit only strict scalar evidence',async()=>{
 for(const fail of [false,true]) {
  const records=[],error=Error('secret'),page={evaluate:async()=>null},target={evaluate:async()=>false}
  const work=withPublicPickerActionDiagnostics(page,target,{action:'depth-shorter',locale:'en'},()=>{if(fail)throw error;return 42},{log:()=>{},diagnosticSink:r=>records.push(r)})
  if(fail)await assert.rejects(work,e=>e===error);else await work
  assert.equal(records.length,1);assert.equal(records[0].result,fail?'failed':'passed')
  assert.equal(JSON.stringify(records).includes('secret'),false)
 }
})

test('OPORA existing blocked request aliases survive primary and cleanup summaries without weakening the fence',async()=>{
 for(const [path,endpoint] of [['/api/analytics/public-page','public_page_stat'],['/__nextjs_original-stack-frames','development_stack_frames'],['/unknown','unclassified']]){
  const records=[],h=lifecycleFixture({onExplore:async({context})=>context.dispatch('http://127.0.0.1:3100'+path+'?PRIVATE_QUERY=discarded','POST'),diagnosticSink:r=>records.push(r)})
  await assert.rejects(h.run(),{code:'ERR_ASSERTION'})
  assert.deepEqual(records.map(r=>r.phase),['primary','cleanup'])
  for(const evidence of records){assert.equal(evidence.blockedCount,1);assert.equal(evidence.firstBlockedEndpoint,endpoint);assert.equal(evidence.firstBlockedMethod,'POST');assert.equal(evidence.firstBlockedOrigin,'same-origin');assert.equal(evidence.primaryFailed,true)}
  assert.equal(JSON.stringify(records).includes('PRIVATE_QUERY'),false)
 }
})
