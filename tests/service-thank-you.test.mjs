import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { videoKey, videoPagePath, prepareVideoChange, toPublishedSiteVideo } from '../lib/site-videos/model.js'
import { parseEnquiryReceipt, RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { telegramEnquiryUrlFromWhatsApp } from '../lib/whatsapp-enquiry.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const referenceCode='HH-AABBCCDDEEFF'
const createdAt=Date.UTC(2026,9,21,14)
const receipt={referenceCode,createdAt}

test('temporary confirmation receipt contains only an opaque reference and expires',()=>{
  assert.equal(RECEIPT_SESSION_KEY,'hh-service-enquiry-receipt:v1')
  assert.deepEqual(parseEnquiryReceipt(JSON.stringify(receipt),createdAt+60000),receipt)
  for(const item of [
    null,'{not json}',{}, {referenceCode:'HH-INVALID',createdAt},
    {...receipt,email:'private@example.test'}, {...receipt,contact:'sensitive'},
    {...receipt,createdAt:createdAt+100000},
    {...receipt,createdAt:createdAt-25*3600000},
  ])assert.equal(parseEnquiryReceipt(item,createdAt),null)
})

test('page and service form only acknowledge a successful server-saved reply request',()=>{
  const form=source('components/contact-channel-chooser.tsx')
  const page=source('app/[locale]/thank-you/page.tsx')
  const ui=source('components/service-enquiry-thank-you.tsx')
  assert.match(form,/response\.ok \|\| data\.saved !== true/)
  assert.match(form,/setSaved\(\{ saved: true, referenceCode: data\.referenceCode, whatsappUrl: attempt\.whatsappUrl \}\)/)
  assert.match(form,/typeof data\.referenceCode !== "string"/)
  assert.equal(typeof receiptTransitionFactory(form), "function")
  assert.match(form,/sessionStorage\.setItem\(RECEIPT_SESSION_KEY/)
  assert.match(form,/router\.push\("\/" \+ locale \+ "\/thank-you"\)/)
  assert.doesNotMatch(form,/localStorage|sendBeacon/i)
  assert.match(page,/robots: \{ index: false, follow: false/)
  assert.match(ui,/parseEnquiryReceipt\(window\.sessionStorage\.getItem/)
  assert.match(ui,/const confirmed = \/\^HH-/)
  assert.doesNotMatch(ui,/gtag|fbq|sendBeacon|fetch\(|localStorage/i)
  for(const locale of ['en','ru','es']) {
    assert.ok(ui.includes('  '+locale+': {'), 'missing locale '+locale)
    assert.equal(videoPagePath('thank-you',locale),'/'+locale+'/thank-you')
    assert.equal(videoKey('thank-you',locale),'thank-you:'+locale)
  }
  const analytics = source('lib/public-analytics.ts')
  assert.match(analytics,/PUBLIC_ANALYTICS_AVAILABLE = false/)
  assert.match(analytics,/app\|client\|report\|prescriptions\|thank-you/)
})

test('video is draft-only until explicit checked publication, with no default auto-post',()=>{
  const draft=prepareVideoChange(null,{
    slot:'thank-you',locale:'ru',intent:'draft',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',
  })
  assert.equal(toPublishedSiteVideo(draft),undefined)
  assert.throws(()=>prepareVideoChange(draft,{
    slot:'thank-you',locale:'ru',intent:'publish',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',reviewed:false,
  }))
  assert.match(source('app/[locale]/thank-you/page.tsx'),/getPublishedSiteVideo\("thank-you:" \+ locale\)/)
  assert.doesNotMatch(source('app/[locale]/thank-you/page.tsx'),/getPublishedSiteVideos\(/)
  assert.match(source('components/site-video-manager.tsx'),/\["about-intro", "thank-you"\]\.includes\(item\.id\)/)
  assert.match(source('components/service-enquiry-thank-you.tsx'),/\{video && \(/)
})

test('server-side owner analytics counts committed enquiries with consent and RLS',()=>{
  const code=source('lib/practitioners/repository.js')
  const ui=source('components/app/practice-service-statistics.jsx')
  assert.match(code,/from app\.public_service_enquiries where recipient_practitioner_id=\$1/)
  assert.match(code,/contact_ciphertext is not null/)
  assert.match(code,/registrationStats/)
  assert.match(code,/getMyPractice\(actor\)/)
  assert.match(ui,/registrationStats\.last7/)
  assert.match(ui,/registrationStats\.last30/)
  assert.match(ui,/not a confirmed booking or payment/)
  assert.doesNotMatch(source('app/[locale]/thank-you/page.tsx'),/lead_created|recordPublicServiceEvent/)
})

function loadThankYouPage(getPublishedSiteVideo){
  const imports={
    'react/jsx-runtime':{jsx:(type,props)=>{assert.equal(type,'thank-you');return {type,props}}},
    'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')}},
    '@/app/site-videos.css':{},
    '@/components/service-enquiry-thank-you':{ServiceEnquiryThankYou:'thank-you'},
    '@/lib/site-videos/public':{getPublishedSiteVideo},
  }
  const moduleValue={exports:{}}
  vm.runInNewContext(ts.transpileModule(source('app/[locale]/thank-you/page.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module:moduleValue,exports:moduleValue.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected page dependency: '+id);return imports[id]},
  })
  return moduleValue.exports.default
}
for(const locale of ['en','ru','es'])test(`${locale} thank-you reads only its exact public video key and keeps missing/draft/hidden media absent`,async()=>{
  const draft=prepareVideoChange(null,{slot:'thank-you',locale,intent:'draft',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Fictional thank-you'})
  const published=prepareVideoChange(draft,{slot:'thank-you',locale,intent:'publish',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Fictional thank-you',reviewed:true})
  const hidden=prepareVideoChange(published,{slot:'thank-you',locale,intent:'hide'})
  assert.equal(toPublishedSiteVideo(draft),undefined)
  assert.equal(toPublishedSiteVideo(hidden),undefined)
  assert.equal(toPublishedSiteVideo(published).youtubeId,'OkLEN8Zb-sY')
  for(const video of [undefined,toPublishedSiteVideo(draft),toPublishedSiteVideo(hidden),toPublishedSiteVideo(published)]){
    const keys=[]
    const page=loadThankYouPage(async key=>{keys.push(key);return video})
    const tree=await page({params:Promise.resolve({locale})})
    assert.deepEqual(keys,['thank-you:'+locale])
    assert.equal(tree.props.locale,locale)
    assert.equal(tree.props.video,video??null)
  }
})
test('invalid thank-you locale performs no video read; unavailable store cannot invent published media',async()=>{
  const keys=[]
  const page=loadThankYouPage(async key=>{keys.push(key);throw Error('FICTIONAL_UNAVAILABLE')})
  for(const locale of ['fr','../en','en?private=1',''])await assert.rejects(()=>page({params:Promise.resolve({locale})}),/NOT_FOUND/)
  assert.equal(keys.length,0)
  await assert.rejects(()=>page({params:Promise.resolve({locale:'en'})}),/FICTIONAL_UNAVAILABLE/)
  assert.deepEqual(keys,['thank-you:en'])
})


// Execute the actual handler and lifecycle callbacks, not a restated guard.
// This is a source-bound unit fixture: no React mount, DOM, browser, server or DB.
// Mutable refs and external effects are controlled; the real pure input validator
// and the complete saveEnquiry body (including response validation) are executed.
function receiptTransitionFactory(form=source('components/contact-channel-chooser.tsx')) {
  const ast=ts.createSourceFile('contact-channel-chooser.tsx',form,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length,0)
  const one=(nodes,label)=>{assert.equal(nodes.length,1,'Exactly one actual '+label);return nodes[0]}
  const component=one(ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ContactChannelChooser'),'ContactChannelChooser')
  const statements=component.body.statements
  const handler=one(statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='saveEnquiry'),'saveEnquiry')
  const effects=statements.filter(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='useLayoutEffect')
    .map(n=>n.expression.arguments[0])
  const mountEffect=one(effects.filter(n=>n.getText(ast).includes('mounted.current = true')),'mount effect')
  const contextEffect=one(effects.filter(n=>n.getText(ast).includes('activeContext.current = contextKey')),'context effect')
  const declarations=statements.filter(ts.isVariableStatement).flatMap(n=>Array.from(n.declarationList.declarations))
  const revision=one(declarations.filter(n=>n.name.getText(ast)==='renderRevision'),'renderRevision').initializer
  const code=`(contextKey) => {
    const renderRevision = ${revision.getText(ast)};
    ${handler.getText(ast)}
    return {saveEnquiry, mount: ${mountEffect.getText(ast)}, commitContext: ${contextEffect.getText(ast)}};
  }`
  const javascript=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  return env=>vm.runInNewContext(javascript,env)
}
function receiptTransition({locale='en',channel,denyStorage=false}={}) {
  const writes=[],routes=[],requests=[],saved=[],locks=[],errors=[],popups=[]
  let resolveResponse
  const response=new Promise(resolve=>{resolveResponse=resolve})
  const env={
    mounted:{current:false},activeContext:{current:'A'},contextRevision:{current:0},
    operation:{current:null},operationPending:{current:false},pendingHandoff:{current:null},authAttempt:{current:null},
    busy:false,googleBusy:false,saved:null,phone:'+14165550123',method:'email',compactPhone:Boolean(channel),
    serviceTitle:'Fictional service',description:'Fictional optional note',displayName:'Fixture Person',email:'fixture@example.test',
    consent:true,website:'',expressReview:false,quick:false,publicTopic:undefined,stayAfterSave:false,
    pathname:'/'+locale+'/services',locale,panelId:'fixture-panel',
    referredWhatsappUrl:'https://wa.me/14376066502?text=Fictional%20public%20service',
    c:{error:'NOT_SAVED',contextChanged:'STALE_CONTEXT',contactError:'INVALID_CONTACT',compactPhoneError:'INVALID_PHONE',reference:'Enquiry',compactHandoff:'NO_HANDOFF'},
    setLocked:value=>locks.push(value),setBusy:()=>{},setError:value=>errors.push(value),setSaved:value=>saved.push(value),
    onSubmissionLockChange:()=>{},onChannelClick:undefined,analyticsEvent:undefined,
    emitPublicAnalyticsEvent:()=>assert.fail('Receipt must not emit analytics'),
    normalizePublicServiceEnquiry,telegramEnquiryUrlFromWhatsApp,RECEIPT_SESSION_KEY,URL,JSON,
    crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},Date:class extends Date {static now(){return createdAt}},
    router:{push:path=>routes.push(path)},
    window:{sessionStorage:{setItem:(key,value)=>{if(denyStorage)throw Error('STORAGE_DENIED');writes.push([key,value])}}},
    fetch:(url,options)=>{assert.equal(url,'/api/service-enquiries');assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');requests.push(options);return response},
  }
  env.lockCallback={current:env.onSubmissionLockChange}
  env.window.open=(url,target)=>{
    assert.equal(url,'about:blank');assert.equal(target,'_blank')
    const popup={closed:false,opener:{},destinations:[],close(){this.closed=true},location:{replace:url=>popup.destinations.push(url)}}
    popups.push(popup);return popup
  }
  const frame=receiptTransitionFactory()(env)
  const original=frame('A'),unmount=original.mount()
  original.commitContext()
  return {env,original,unmount,writes,routes,requests,saved,locks,errors,popups,
    commitContext:key=>{const next=frame(key);next.commitContext();return next},
    start:()=>original.saveEnquiry(channel),
    finish:async(pending,data={saved:true,referenceCode},ok=true)=>{
      resolveResponse({ok,json:async()=>{if(data instanceof Error)throw data;return data}})
      await pending
    },
  }
}
function assertNoReceipt(f) {
  assert.equal(f.saved.length,0,'No saved state for an unconfirmed/stale response')
  assert.deepEqual(f.writes,[],'No receipt storage for an unconfirmed/stale response')
  assert.deepEqual(f.routes,[],'No confirmation navigation for an unconfirmed/stale response')
  assert.notEqual(f.env.operation.current?.confirmed,true,'Do not confirm the operation')
  assert.ok(!f.locks.includes(false),'Do not unlock as a confirmed receipt')
  for(const popup of f.popups){assert.equal(popup.closed,true,'Close the unsent stale popup');assert.deepEqual(popup.destinations,[])}
  assert.equal(f.env.pendingHandoff.current,null)
}
for(const locale of ['en','ru','es'])test(`${locale} actual save transition persists only the validated opaque receipt and then navigates`,async()=>{
  const f=receiptTransition({locale}),pending=f.start()
  assert.equal(f.requests.length,1);assert.deepEqual(f.writes,[]);assert.deepEqual(f.routes,[])
  await f.finish(pending)
  assert.equal(f.env.operation.current.confirmed,true);assert.equal(f.saved.length,1)
  assert.equal(f.saved[0].referenceCode,referenceCode);assert.deepEqual(f.locks,[true,false])
  assert.equal(f.writes.length,1);assert.equal(f.writes[0][0],RECEIPT_SESSION_KEY)
  assert.deepEqual(JSON.parse(f.writes[0][1]),receipt)
  assert.deepEqual(parseEnquiryReceipt(f.writes[0][1],createdAt),receipt)
  assert.deepEqual(f.routes,['/'+locale+'/thank-you'])
})
for(const channel of ['whatsapp','telegram'])test(`actual ${channel} receipt handoff uses only the saved opaque reference`,async()=>{
  const f=receiptTransition({channel}),pending=f.start();await f.finish(pending)
  assert.equal(f.saved.length,1);assert.equal(f.writes.length,1)
  assert.deepEqual(JSON.parse(f.writes[0][1]),receipt);assert.deepEqual(f.routes,[])
  assert.equal(f.popups.length,1);assert.equal(f.popups[0].closed,false)
  assert.equal(f.popups[0].opener,null);assert.equal(f.popups[0].destinations.length,1)
  const destination=new URL(f.popups[0].destinations[0])
  assert.equal(destination.hostname,channel==='whatsapp'?'wa.me':'t.me')
  assert.equal(destination.searchParams.get('text'),'Fictional public service\n\nEnquiry: '+referenceCode)
  assert.equal(f.env.pendingHandoff.current,null)
})
test('actual saved transition survives denied receipt storage without inventing confirmation navigation',async()=>{
  const f=receiptTransition({denyStorage:true}),pending=f.start();await f.finish(pending)
  assert.equal(f.saved.length,1);assert.equal(f.env.operation.current.confirmed,true)
  assert.deepEqual(f.writes,[]);assert.deepEqual(f.routes,[])
})
const staleTransitions={
  unmount:f=>f.unmount(),
  'context A→B':f=>f.commitContext('B'),
  'context A→B→A':f=>{f.commitContext('B');f.commitContext('A');assert.equal(f.env.contextRevision.current,2)},
  'revision only':f=>{f.env.contextRevision.current+=1},
  'context only':f=>{f.env.activeContext.current='B'},
  'operation identity':f=>{f.env.operation.current={...f.env.operation.current}},
}
for(const [name,invalidate] of Object.entries(staleTransitions))for(const channel of [undefined,'whatsapp'])test(`actual receipt transition rejects ${name}${channel?' and closes reserved popup':''}`,async()=>{
  const f=receiptTransition({channel}),pending=f.start()
  assert.equal(f.requests.length,1);invalidate(f);await f.finish(pending);assertNoReceipt(f)
})
for(const [name,invalidate] of Object.entries(staleTransitions).filter(([name])=>name!=='operation identity'))test(`actual stale submit handler rejects ${name} before any request`,async()=>{
  const f=receiptTransition();invalidate(f);const pending=f.start();assert.equal(f.requests.length,0);await pending;assertNoReceipt(f)
})
for(const [name,data,ok] of [
  ['HTTP failure',{saved:true,referenceCode},false],['not saved',{saved:false,referenceCode},true],
  ['truthy saved',{saved:'true',referenceCode},true],['missing reference',{saved:true},true],
  ['numeric reference',{saved:true,referenceCode:123},true],['bad prefix',{saved:true,referenceCode:'XX-AABBCCDDEEFF'},true],
  ['short reference',{saved:true,referenceCode:'HH-AABBCCDDEE'},true],['long reference',{saved:true,referenceCode:'HH-AABBCCDDEEFF00'},true],
  ['lowercase reference',{saved:true,referenceCode:'HH-aabbccddeeff'},true],['malformed JSON',Error('BAD_JSON'),true],
])test(`actual receipt transition rejects ${name} without storage, navigation or handoff`,async()=>{
  const f=receiptTransition({channel:'whatsapp'}),pending=f.start();await f.finish(pending,data,ok)
  assert.equal(f.requests.length,1);assertNoReceipt(f);assert.ok(f.errors.includes('NOT_SAVED'))
})
