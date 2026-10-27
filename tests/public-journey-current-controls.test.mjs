import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDecision } from '../scripts/helpers/public-journey-verifier.mjs'
import { blockedApiDetails } from '../scripts/helpers/contact-request-diagnostics.mjs'
import { createAnonymousAcademyBootstrapFixture } from '../scripts/helpers/anonymous-bootstrap-fixture.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const ast = (source, name='source.tsx') => ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
function findNode(source, predicate) {
  let found
  const visit=node=>{if(!found&&predicate(node))found=node;ts.forEachChild(node,visit)}
  visit(ast(source));assert.ok(found,'Expected exact source node');return found
}
function constant(source,name) {
  const node=findNode(source,node=>ts.isVariableDeclaration(node)&&node.name.getText()===name)
  const initial=ts.isAsExpression(node.initializer)?node.initializer.expression:node.initializer
  return vm.runInNewContext('('+initial.getText()+')',Object.create(null),{timeout:1000})
}
const business=read('scripts/verify-business-quiz-mobile.mjs')
const direction=read('components/direction-offers.tsx')
const home=read('scripts/verify-home-consultation-first-screen.mjs')
const tantra=read('scripts/verify-contact-channel-chooser-browser.mjs')

test('actual mobile intent toggle and verifier exercise every category twice without desktop-only reset',async()=>{
  const start=business.indexOf("    for(const intent of ['test','advice','course','session']){")
  const end=business.indexOf("    await extras.locator('summary')",start)
  assert.ok(start>0&&end>start)
  const loop=business.slice(start,end)
  const button=findNode(direction,node=>ts.isJsxOpeningElement(node)&&node.attributes.properties.some(prop=>
    ts.isJsxAttribute(prop)&&prop.name.getText()==='data-direction-intent'))
  const handler=button.attributes.properties.find(prop=>ts.isJsxAttribute(prop)&&prop.name.getText()==='onClick').initializer.expression.getText()
  assert.match(read('components/direction-offers.module.css'),/@media\(max-width:780px\)[\s\S]*?\.actionReset\{display:none\}/)
  assert.match(direction,/if \(intent && intent !== kind\) return null/)
  const state={intent:null,clicks:0,targets:0}
  const scope={get intent(){return state.intent},id:null,selectAction:value=>{state.intent=value}}
  const actualToggle=vm.runInNewContext(handler,scope,{timeout:1000})
  const fakeDirection={locator(selector){
    const id=selector.match(/^\[data-direction-intent="(test|advice|course|session)"\]$/)?.[1]
    if(id)return {click:async()=>{scope.id=id;actualToggle();state.clicks++},getAttribute:async()=>String(state.intent===id)}
    if(selector==='[data-direction-section]')return {evaluateAll:async fn=>fn((state.intent?[state.intent]:['test','course','session']).map(kind=>({getAttribute:()=>kind})))}
    if(selector==='[data-offer-action="advice"]')return {getAttribute:async()=>'/en/services/free-situation-review'}
    throw new Error('Unexpected or hidden control: '+selector)
  }}
  const panel={locator(selector){assert.equal(selector,'[data-direction-filter="all"]');return {getAttribute:async()=> 'true'}}}
  const run=source=>new (Object.getPrototypeOf(async()=>{}).constructor)('direction','panel','target','assert','locale','label',source)(fakeDirection,panel,async()=>{state.targets++},assert,'en','synthetic')
  await run(loop);assert.equal(state.intent,null);assert.equal(state.clicks,8);assert.equal(state.targets,4)
  await assert.rejects(()=>run(loop.replace('await chip.click()\n      assert.equal(await chip.getAttribute(\'aria-pressed\'),\'false\'',"await direction.locator('[data-direction-action-reset]').click()\n      assert.equal(await chip.getAttribute('aria-pressed'),'false'")),/hidden control/)
})

test('home browser contract pins all six actual slide routes plus separate Home without relaxing geometry',()=>{
  const carousel=read('components/home-section-carousel.tsx')
  const keys=['services','academy','business','tests','ideas','cabinet']
  const routes=['/explore/energy','/explore/love','/explore/business','/client/tests','/books','/app']
  assert.deepEqual(Array.from(constant(carousel,'navKeys')),keys)
  assert.deepEqual(Array.from(constant(carousel,'slides'),slide=>slide.href),routes)
  assert.deepEqual(Array.from(constant(home,'keys')),keys)
  assert.deepEqual(Array.from(constant(home,'suffixes')),routes)
  for(const preserved of ['book.y + book.height <= 844 - 72','book.height >= 44 && review.height >= 44',
    'target.height >= 44','overflow <= 1','navBox.x + navBox.width <= card.x + card.width + 1'])assert.ok(home.includes(preserved),preserved)
  assert.match(home,/homeLink\.getAttribute\('href'\), locale === 'en' \? '\/' : '\/' \+ locale/)
  assert.match(home,/free\.getAttribute\('href'\), freeHref/)
  assert.match(home,/\[data-home-offer-card="review"\]\[data-home-offer-free="true"\]/)
  assert.match(read('components/home-featured-workspace.tsx'),/review: "\/" \+ locale \+ "\/services\/free-situation-review"/)
})

test('home optional guide remains lazy while every current topic/catalogue route remains explicit',()=>{
  const source=read('components/home-more-disclosure.tsx')
  const keys=['energy','love','business','temple','services','courses']
  for(const key of keys)assert.ok(source.includes('data-home-topic-filter="'+key+'"'))
  assert.match(source,/expanded \? <HomeConversationGuide locale=\{locale\}/)
  assert.match(source,/ssr: false/)
  assert.match(home,/\['energy','love','business','temple','services','courses'\]/)
  assert.match(home,/guide\.getAttribute\('data-guide-phase'\),'ready'/)
  assert.match(home,/await guide\.waitFor\(\{state:'detached'\}\)/)
  assert.doesNotMatch(home,/data-home-start|data-core-service-id|\.fill\(|\.check\(/)
})

test('topic cards open explicit inline requests while the private gallery remains a separate anonymous shell',()=>{
  const filter=read('components/holistic-support-topic-filter.tsx')
  const page=read('app/[locale]/holistic-support/page.tsx')
  const verifier=read('scripts/verify-holistic-topics-browser.mjs')
  assert.match(filter,/data-holistic-order-trigger=\{id\}/)
  assert.match(filter,/onClick=\{\(\) => openOrder\(id === "talisman" \? "talisman" : "energy"\)\}/)
  assert.match(filter,/<HolisticInlineSupportOrder locale=\{locale\} kind=\{orderKind\}/)
  assert.match(page,/id="talismans"[^>]+data-holistic-talismans/)
  assert.match(page,/<TaoistTalismanCatalog locale=\{locale\}/)
  const catalog=read('components/taoist-talisman-catalog.tsx')
  assert.match(catalog,/archiveOpen && <div/)
  assert.match(catalog,/<SupportTalismanGallery locale=\{locale\}/)
  for(const preserved of ['await archive.click()', 'private gallery is not mounted before explicit opening',
    'fence.summary().anonymousTalismanReads, 0', 'fence.summary().anonymousTalismanReads, 1',
    'archiveTarget.height >= 44 && archiveTarget.width >= 44'])assert.ok(verifier.includes(preserved),preserved)
  for(const preserved of ['installInlineOrderDirectoryDenial(page.context(), origin, locale)',
    'directory.matchesResponse(response)', 'await trigger.click()', 'await deniedResponse',
    "'[data-holistic-inline-order=\"' + kind + '\"]'", "order.locator('[role=\"alert\"]')",
    'await order.locator("button").first().click()', 'await order.waitFor({ state: "detached" })',
    'repeat < 2', 'await directory.close()', 'directory.assertCompleted()'])assert.ok(verifier.includes(preserved),preserved)
  assert.match(verifier,/anonymousTalismans:true/)
  assert.match(verifier,/fence\.assertNoSideEffects\(label\)/)
  assert.doesNotMatch(verifier,/\.fill\(|\.setInputFiles\(|\.check\(|\.selectOption\(/)
  assert.match(verifier,/bbox\.height >= 44 && bbox\.width >= 44/)
  assert.match(verifier,/geometry\.document <= geometry\.viewport \+ 2/)
})

test('Tantra actual component preserves all five intents, keys, public draft context and deep links in all locales',()=>{
  const source=read('components/tantra-initiation-choice.tsx')
  const translations=constant(read('components/tantra-initiation-form.tsx'),'copy')
  const signatures=constant(tantra,'signatures')
  const intents=['free','personal','session','answers','feedback']
  assert.deepEqual(Array.from(constant(tantra,'intents')),intents,'browser must exercise all five, not lower a count')
  for(const locale of ['en','ru','es']){
    const t=translations[locale],options=intents.map(intent=>({intent,label:t[intent],whatsappUrl:'https://wa.me/14376066502?text='+encodeURIComponent(t.requests[intent])}))
    let state='free',effect,hashListener
    const jsx=(type,props,key)=>({type,props:props||{},key})
    const window={location:{hash:''},addEventListener:(name,fn)=>{assert.equal(name,'hashchange');hashListener=fn},removeEventListener:()=>{}}
    const modules={'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:()=>[state,next=>{state=next}],useEffect:fn=>{effect=fn}},
      'lucide-react':{ChevronDown:'svg'},'@/components/contact-channel-chooser':{ContactChannelChooser:'Chooser'},
      './tantra-free-initiation.module.css':{default:{}}}
    const exports={}
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
    assert.deepEqual(compiled.diagnostics.filter(item=>item.category===ts.DiagnosticCategory.Error),[])
    vm.runInNewContext(compiled.outputText,{exports,window,require:name=>{assert.ok(Object.hasOwn(modules,name));return modules[name]}},{timeout:1000})
    const render=()=>{
      let tree=exports.TantraInitiationChoice({locale,service:t.service,heading:t.heading,lead:t.lead,choose:t.choose,note:t.note,options})
      const nodes=[];const visit=node=>{if(Array.isArray(node))return node.forEach(visit);if(node&&typeof node==='object'){nodes.push(node);visit(node.props?.children)}};visit(tree);return nodes
    }
    render();effect()
    for(const intent of intents){
      render().find(node=>node.type==='select').props.onChange({target:{value:intent}})
      let nodes=render(),chooser=nodes.find(node=>node.type==='Chooser')
      assert.equal(chooser.key,intent,'intent remount isolates prior contact/consent/receipt')
      assert.equal(chooser.props.compactPhone,true);assert.equal(chooser.props.stayAfterSave,true)
      assert.equal(chooser.props.publicTopic,t.service+' · '+t[intent])
      assert.match(new URL(chooser.props.whatsappUrl).searchParams.get('text'),signatures[locale][intent])
      assert.ok(nodes.some(node=>node.props.id==='apply-'+intent))
      window.location.hash='#apply-'+intent;state='unknown';hashListener();assert.equal(state,intent)
    }
    assert.equal(render().filter(node=>node.type==='Chooser').length,1)
  }
})

test('contact context fence fulfills only one exact synthetic POST; all writes/API reads/providers stay closed',async()=>{
  const node=findNode(tantra,node=>ts.isCallExpression(node)&&node.expression.getText()==='context.route')
  const callback=node.arguments[1],body=callback.body.getText().slice(1,-1)
  const fn=new (Object.getPrototypeOf(async()=>{}).constructor)('route','origin','submissions','blocked','publicJourneyRequestDecision','blockedApiDetails','requestPhase','bootstrapFixture',body)
  const origin='http://127.0.0.1:3100',submissions=[],blocked=[],actions=[]
  const bootstrapFixture=createAnonymousAcademyBootstrapFixture(origin,'en')
  const payload={contactConsent:true,contact:{email:'qa-browser@example.test'}}
  const send=async(url,method,navigation=false,data=payload)=>fn({request:()=>({url:()=>url,method:()=>method,isNavigationRequest:()=>navigation,resourceType:()=> 'fetch',frame:()=>({url:()=>origin+'/en/academy'}),postData:()=>method==='POST'?JSON.stringify(data):''}),
    fulfill:async data=>actions.push(['fulfill',data.status]),continue:async()=>actions.push(['continue']),abort:async()=>actions.push(['abort'])},origin,submissions,blocked,publicJourneyRequestDecision,blockedApiDetails,'academy',bootstrapFixture)
  await send(origin+'/api/service-enquiries','POST')
  assert.deepEqual(submissions,[payload]);assert.deepEqual(actions,[['fulfill',200]])
  for(const [url,method,nav] of [[origin+'/api/service-enquiries?other=1','POST'],[origin+'/api/service-enquiries','GET'],
    [origin+'/api/private-records','GET'],[origin+'/anything','POST'],['https://holistichouse.vercel.app/api/service-enquiries','POST'],
    ['https://accounts.google.com','GET',true],['https://wa.me/14376066502','GET',true]])await send(url,method,nav)
  assert.equal(submissions.length,1);assert.equal(blocked.length,7)
  await send(origin+'/api/service-enquiries','POST',false,{contactConsent:true,contact:{email:'not-a-fixture@example.invalid'}})
  await send(origin+'/api/service-enquiries','POST',false,{...payload,contactConsent:false})
  await send(origin+'/en/academy?note=PRIVATE_QA_NOTE_NOT_FOR_MESSENGER','GET')
  assert.equal(submissions.length,1);assert.equal(blocked.length,10)
  assert.equal(actions.filter(action=>action[0]==='continue').length,0)
  // Source-recognized reads without complete header evidence still abort.
  // The explicit denial fixture is tested separately; never anonymous success.
  for(const [path,apiKind] of [['/api/app/bootstrap','account-bootstrap'],['/api/app/bootstrap?view=portrait','portrait-bootstrap'],['/api/app/auth/contact-profile','contact-profile'],['/api/academy/reiki-guide?course=yggdrasil&locale=en','yggdrasil-guide']]) {
    await send(origin+path,'GET')
    assert.deepEqual(blocked.at(-1),{method:'GET',category:'unexpected-api',apiKind,framePageAtBlock:'academy',scenarioPhase:'academy',resourceType:'fetch',navigation:false})
    assert.deepEqual(actions.at(-1),['abort'])
  }
  assert.equal(blocked.length,14);assert.equal(submissions.length,1)
  assert.equal(actions.filter(action=>action[0]==='continue').length,0)
  assert.equal(actions.filter(action=>action[0]==='fulfill').length,1)
  assert.match(tantra,/process\.argv\.includes\("--live"\)\) throw/)
  assert.match(tantra,/assertPublicJourneyRuntime\(origin\)/)
  assert.match(tantra,/assert\.deepEqual\(blocked,\[\]/)
})

test('provider popup interface is stubbed before page load and never navigates',()=>{
  const call=findNode(tantra,node=>ts.isCallExpression(node)&&node.expression.getText()==='context.addInitScript')
  const window={}
  vm.runInNewContext('('+call.arguments[0].getText()+')()',{window},{timeout:1000})
  const popup=window.open('about:blank','_blank')
  assert.equal(popup.closed,false);assert.equal(popup.opener,null)
  assert.equal(popup.location.replace('https://wa.me/14376066502'),undefined)
  assert.deepEqual(Object.keys(popup.location),['replace'])
  assert.match(tantra,/channel\.click\(\{trial:true,timeout:8000\}\)/)
})

async function directoryFixture(locale='en',deadlineMs=10000) {
  const source=read('scripts/verify-holistic-topics-browser.mjs')
  const node=findNode(source,node=>ts.isFunctionDeclaration(node)&&node.name?.getText()==='installInlineOrderDirectoryDenial')
  const timers=new Set()
  const startTimer=(callback,delay)=>{const timer=setTimeout(()=>{timers.delete(timer);callback()},delay);timers.add(timer);return timer}
  const stopTimer=timer=>{timers.delete(timer);clearTimeout(timer)}
  const install=vm.runInNewContext('('+node.getText()+')',{assert,URL,setTimeout:startTimer,clearTimeout:stopTimer},{timeout:1000})
  const origin='http://127.0.0.1:3100',handlers=[],actions=[]
  const context={route:async(pattern,handler)=>{assert.equal(pattern,'**/*');handlers.push(handler)},
    unroute:async(pattern,handler)=>{assert.equal(pattern,'**/*');assert.equal(handlers.pop(),handler)}}
  const fixture=await install(context,origin,locale,deadlineMs)
  const request=(patch={})=>({url:()=>origin+'/api/public/remote-energy-support-masters?locale='+locale,
    method:()=> 'GET',resourceType:()=> 'fetch',isNavigationRequest:()=> false,postData:()=>null,
    allHeaders:async()=>({accept:'*/*'}),...patch})
  const send=async req=>{assert.equal(handlers.length,1);await handlers[0]({request:()=>req,
    fulfill:async data=>actions.push(['fulfill',data]),abort:async reason=>actions.push(['abort',reason]),
    fallback:async()=>actions.push(['fallback'])})}
  return {fixture,origin,handlers,actions,request,send,timers}
}

test('each explicit inline opening receives one own synthetic directory denial, never data or transport',async()=>{
  for(const locale of ['en','ru','es']) for(let repeat=0;repeat<2;repeat++) {
    const f=await directoryFixture(locale),request=f.request()
    f.fixture.arm();await f.send(request);f.fixture.assertCompleted()
    assert.equal(f.actions.length,1);assert.equal(f.actions[0][0],'fulfill')
    assert.equal(f.actions[0][1].status,503)
    assert.deepEqual(JSON.parse(f.actions[0][1].body),{error:'QA_DIRECTORY_UNAVAILABLE'})
    assert.equal(f.fixture.matchesResponse({request:()=>request,status:()=>503}),true)
    assert.equal(f.fixture.matchesResponse({request:()=>f.request(),status:()=>503}),false,'Unrelated same-URL 503 is not correlated')
    assert.equal(f.fixture.matchesResponse({request:()=>request,status:()=>200}),false)
    await f.fixture.close();assert.equal(f.handlers.length,0)
    assert.throws(()=>f.fixture.arm(),{code:'ERR_ASSERTION'})
  }
})

test('inline directory fixture fails closed for wrong route, locale, query, method, body, auth, prefetch and excess requests',async()=>{
  const origin='http://127.0.0.1:3100'
  const patches=[
    {url:()=>origin+'/api/public/remote-energy-support-masters?locale=ru'},
    {url:()=>origin+'/api/public/remote-energy-support-masters/extra?locale=en'},
    {url:()=>origin+'/api/public/remote-energy-support-masters?locale=en&extra=1'},
    {url:()=> 'https://example.invalid/api/public/remote-energy-support-masters?locale=en'},
    {method:()=> 'POST'}, {method:()=> 'HEAD'}, {postData:()=> 'private'},
    {resourceType:()=> 'document'}, {isNavigationRequest:()=>true},
    {allHeaders:async()=>undefined},{allHeaders:async()=>{throw Error('Unavailable evidence')}},
    ...['authorization','proxy-authorization','cookie','purpose','sec-purpose','next-router-prefetch','rsc']
      .map(name=>({allHeaders:async()=>({[name]:'fixture'})})),
  ]
  for(const patch of patches) {
    const f=await directoryFixture();f.fixture.arm();await f.send(f.request(patch))
    assert.deepEqual(f.actions,[['abort','blockedbyclient']])
    assert.throws(()=>f.fixture.assertCompleted(),{code:'ERR_ASSERTION'})
    await assert.rejects(f.fixture.close(),{code:'ERR_ASSERTION'});assert.equal(f.handlers.length,0)
  }
  const early=await directoryFixture();await early.send(early.request())
  assert.deepEqual(early.actions,[['abort','blockedbyclient']])
  assert.throws(()=>early.fixture.arm(),{code:'ERR_ASSERTION'});await assert.rejects(early.fixture.close(),{code:'ERR_ASSERTION'})
  const duplicate=await directoryFixture();duplicate.fixture.arm();await duplicate.send(duplicate.request());await duplicate.send(duplicate.request())
  assert.equal(duplicate.actions[0][0],'fulfill');assert.deepEqual(duplicate.actions[1],['abort','blockedbyclient'])
  assert.throws(()=>duplicate.fixture.assertCompleted(),{code:'ERR_ASSERTION'});await assert.rejects(duplicate.fixture.close(),{code:'ERR_ASSERTION'})
})

test('inline fixture delegates non-API transport only to the unchanged fail-closed fence',async()=>{
  const f=await directoryFixture(),url='https://provider.invalid/next'
  await f.send(f.request({url:()=>url}));assert.deepEqual(f.actions,[['fallback']])
  assert.equal(publicJourneyRequestDecision({url,method:'GET',navigation:true},f.origin),'external-navigation')
  assert.throws(()=>f.fixture.assertCompleted(),{code:'ERR_ASSERTION'});await f.fixture.close()
})

async function assertInlineUnavailable(input=read('components/holistic-inline-support-order.tsx')) {
  const compiled=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const jsx=(type,props)=>({type,props:props||{}})
  const children=node=>{const nodes=[];const walk=node=>{if(Array.isArray(node))return node.forEach(walk);if(!node||typeof node!=='object')return;nodes.push(node);walk(node.props?.children)};walk(node);return nodes}
  for(const locale of ['en','ru','es']) for(const kind of ['talisman','energy']) {
    const states=[null,false,0],effects=[],requests=[];let index=0,closed=0
    const modules={react:{useState:()=>{const i=index++;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},useEffect:fn=>effects.push(fn)},
      'react/jsx-runtime':{jsx,jsxs:jsx},'@/components/remote-energy-support-booking':{RemoteEnergySupportBooking:'booking'},
      './holistic-inline-support-order.module.css':{default:{},__esModule:true}}
    const exports={}
    vm.runInNewContext(compiled,{exports,AbortController,require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]},
      fetch:async(url,options)=>{requests.push({url,options});return {ok:false,status:503,json:async()=>assert.fail('A denial must not consume practitioner data')}}},{timeout:1000})
    const render=()=>{index=0;return children(exports.HolisticInlineSupportOrder({locale,kind,initialGoal:'Work and money',onKindChange:()=>assert.fail('No order submission'),onClose:()=>{closed++}}))}
    const first=render();assert.equal(first.filter(node=>node.props.role==='status').length,1)
    const cleanup=effects[0]();await new Promise(resolve=>setImmediate(resolve))
    const failed=render(),alerts=failed.filter(node=>node.props.role==='alert')
    assert.equal(alerts.length,1,'Directory denial must expose a visible error state')
    const text=node=>Array.isArray(node)?node.map(text).join(''):typeof node==='string'?node:text(node?.props?.children||'')
    assert.ok(text(alerts[0]).includes({en:'The practitioner directory is temporarily unavailable.',ru:'Список мастеров временно недоступен.',es:'El directorio no está disponible por el momento.'}[locale]))
    assert.equal(failed.filter(node=>node.type==='booking'||['form','input','textarea','select'].includes(node.type)).length,0)
    assert.equal(failed[0].props['data-holistic-inline-order'],kind)
    assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/public/remote-energy-support-masters?locale='+locale)
    assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.signal.aborted,false)
    failed.find(node=>node.type==='button'&&node.props['aria-label']).props.onClick();assert.equal(closed,1)
    cleanup();assert.equal(requests[0].options.signal.aborted,true)
  }
}

test('actual inline component renders the scoped directory error in every locale and kind without any booking data',async()=>{
  await assertInlineUnavailable()
})

test('inline unavailable-state controls reject hidden errors and credential-bearing fetches',async()=>{
  const source=read('components/holistic-inline-support-order.tsx')
  for(const [before,after] of [['setFailed(true)','setFailed(false)'],['credentials: "omit"','credentials: "include"']]) {
    assert.ok(source.includes(before));await assert.rejects(assertInlineUnavailable(source.replace(before,after)),{code:'ERR_ASSERTION'})
  }
})

test('directory cleanup drains delayed headers and rejects late excess traffic after a completed opening',async()=>{
  const f=await directoryFixture();f.fixture.arm();await f.send(f.request());f.fixture.assertCompleted()
  let finishHeaders,closeSettled=false
  const late=f.send(f.request({method:()=> 'POST',allHeaders:()=>new Promise(resolve=>{finishHeaders=resolve})}))
  f.fixture.assertCompleted() // Header inspection is deliberately still pending.
  const closing=f.fixture.close();closing.then(()=>{closeSettled=true},()=>{closeSettled=true})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closeSettled,false)
  assert.equal(f.handlers.length,0,'Only the fixture handler is removed before draining pending requests')
  finishHeaders({});await late
  await assert.rejects(closing,{code:'ERR_ASSERTION',message:/No late or unexpected directory requests/})
  assert.deepEqual(f.actions.map(action=>action[0]),['fulfill','abort'])
})

test('directory cleanup retains handler failures even if the rejected callback already left the pending set',async()=>{
  const f=await directoryFixture();f.fixture.arm()
  const failure=new Error('synthetic fulfilment failure')
  await assert.rejects(f.handlers[0]({request:()=>f.request(),fulfill:async()=>{throw failure},abort:async()=>{},fallback:async()=>{}}),error=>error===failure)
  await new Promise(resolve=>setImmediate(resolve))
  await assert.rejects(f.fixture.close(),error=>error===failure)
  assert.equal(f.handlers.length,0)
  const verifier=read('scripts/verify-holistic-topics-browser.mjs')
  assert.match(verifier,/openingFailure = error;\s*throw error;/)
  assert.match(verifier,/try \{ await directory\.close\(\); fence\.assertNoSideEffects\(label\); \} catch \(error\) \{\s*if \(!openingFailure\) throw error;/)
})

test('unresolved directory header evidence has a bounded deadline and leaves no timer or route after cleanup',async()=>{
  const f=await directoryFixture('en',20);f.fixture.arm()
  await f.send(f.request({allHeaders:()=>new Promise(()=>{})}))
  assert.deepEqual(f.actions,[['abort','blockedbyclient']])
  await assert.rejects(f.fixture.close(),{code:'ERR_ASSERTION'})
  assert.equal(f.handlers.length,0);assert.equal(f.timers.size,0)
})

test('a callback queued after removal returns to the original fence and remains an explicit violation',async()=>{
  const f=await directoryFixture(),lateHandler=f.handlers[0]
  f.fixture.arm();await f.send(f.request());await f.fixture.close()
  await lateHandler({request:()=>f.request(),fallback:async()=>f.actions.push(['fallback']),
    fulfill:async()=>assert.fail('No second synthetic response'),abort:async()=>assert.fail('Do not hide late requests from the original fence')})
  assert.deepEqual(f.actions.at(-1),['fallback'])
  assert.equal(publicJourneyRequestDecision({url:f.request().url(),method:'GET',navigation:false},f.origin),'unplanned-route')
  assert.throws(()=>f.fixture.assertCompleted(),{code:'ERR_ASSERTION'})
  assert.equal(f.timers.size,0)
})

for(const method of ['abort','fallback'])test('cleanup retains rejected '+method+' transport callbacks without leaving its handler',async()=>{
  const f=await directoryFixture(),failure=new Error('synthetic '+method+' failure')
  const request=method==='abort'?f.request():f.request({url:()=>f.origin+'/en/holistic-support'})
  await assert.rejects(f.handlers[0]({request:()=>request,fulfill:async()=>assert.fail('No response expected'),
    abort:async()=>{if(method==='abort')throw failure},fallback:async()=>{if(method==='fallback')throw failure}}),error=>error===failure)
  await assert.rejects(f.fixture.close(),error=>error===failure)
  assert.equal(f.handlers.length,0);assert.equal(f.timers.size,0)
})

// Unit-level authored parent state/prop/effect contract; children remain explicit
// boundaries. The real inline denial component is exercised above, not replaced.
function assertCatalogCoordination(catalogSource=read('components/taoist-talisman-catalog.tsx'), topicSource=read('components/holistic-support-topic-filter.tsx')) {
  const compile=(source,modules,globals={})=>{
    const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
    assert.deepEqual(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[])
    const exports={};vm.runInNewContext(result.outputText,{exports,...globals,require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]}},{timeout:1000});return exports
  }
  const data=compile(read('lib/practitioners/taoist-talismans.js'),{})
  for(const locale of ['en','ru','es']) {
    const listeners=new Set(),events=[],scrolls=[]
    class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail}}
    const window={addEventListener(name,fn){assert.equal(name,'hh-support-order-open');listeners.add(fn)},
      removeEventListener(name,fn){assert.equal(name,'hh-support-order-open');assert.equal(listeners.delete(fn),true)},
      dispatchEvent(event){assert.equal(event.type,'hh-support-order-open');assert.ok(['topics','catalog'].includes(event.detail.source));events.push(event.detail.source);for(const fn of listeners)fn(event);return true},
      matchMedia(query){assert.equal(query,'(prefers-reduced-motion: reduce)');return {matches:true}}}
    const document={getElementById(id){
      assert.equal(id,'holistic-inline-order')
      return {
        scrollIntoView(options){assert.equal(options.behavior,'auto');scrolls.push('scroll')},
        querySelector(selector){
          assert.equal(selector,'#holistic-inline-order-title')
          return {focus(options){assert.equal(options.preventScroll,true);scrolls.push('focus')}}
        },
      }
    }}
    const jsx=(type,props,key)=>({type,props:props||{},key})
    function mount(source,name,extra) {
      const states=[],effects=[],pending=[];let index=0,effectIndex=0
      const react={useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},
        useEffect(fn,deps){const i=effectIndex++,old=effects[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))pending.push(()=>{old?.cleanup?.();effects[i]={deps,cleanup:fn()}})}}
      const component=compile(source,{'react/jsx-runtime':{jsx,jsxs:jsx},react,'next/image':{default:'img'},'next/link':{default:'a'},
        './holistic-inline-support-order':{HolisticInlineSupportOrder:'InlineOrderBoundary'},...extra},{window,document,CustomEvent})[name]
      return {render(){index=0;effectIndex=0;const tree=component({locale}),nodes=[];const walk=node=>{if(Array.isArray(node))return node.forEach(walk);if(!node||typeof node!=='object')return;nodes.push(node);walk(node.props?.children)};walk(tree);while(pending.length)pending.shift()();return nodes},close(){for(const effect of effects)effect.cleanup?.()}}
    }
    const catalog=mount(catalogSource,'TaoistTalismanCatalog',{'@/lib/practitioners/taoist-talismans':data,
      './support-talisman-gallery':{SupportTalismanGallery:'PrivateGalleryBoundary'},'./taoist-talisman-catalog.module.css':{default:{}}})
    const topics=mount(topicSource,'HolisticSupportTopicFilter',{'./holistic-support-topic-filter.module.css':{default:{}},
      'lucide-react':{ArrowRight:'icon',BriefcaseBusiness:'icon',Heart:'icon',HeartPulse:'icon'}})
    const initial=catalog.render();topics.render();assert.equal(listeners.size,2)
    assert.equal(initial.filter(n=>n.type==='PrivateGalleryBoundary'||n.type==='InlineOrderBoundary').length,0)
    assert.deepEqual(initial.filter(n=>n.props['data-tao-talisman']).map(n=>n.props['data-tao-talisman']),Array.from(data.TAOIST_TALISMANS,item=>item.id))
    const archive=initial.find(n=>n.props['aria-controls']==='tao-talisman-private-gallery')
    assert.equal(archive.props['aria-expanded'],false);archive.props.onClick()
    let nodes=catalog.render();assert.equal(nodes.filter(n=>n.type==='PrivateGalleryBoundary').length,1)
    assert.equal(nodes.find(n=>n.type==='PrivateGalleryBoundary').props.locale,locale)
    nodes.find(n=>n.props['aria-controls']==='tao-talisman-private-gallery').props.onClick()
    assert.equal(catalog.render().filter(n=>n.type==='PrivateGalleryBoundary').length,0)
    for(const item of data.TAOIST_TALISMANS) {
      let before=events.length
      catalog.render().find(n=>n.props['data-tao-talisman-order']===item.id).props.onClick()
      nodes=catalog.render();assert.equal(events.length,before+1);assert.equal(events.at(-1),'catalog')
      let order=nodes.filter(n=>n.type==='InlineOrderBoundary');assert.equal(order.length,1)
      assert.equal(order[0].key,item.id);assert.equal(order[0].props.kind,'talisman');assert.equal(order[0].props.initialGoal,item.goal)
      assert.equal(order[0].props.initialTalismanId,item.id);assert.equal(order[0].props.locale,locale)
      assert.equal(topics.render().filter(n=>n.type==='InlineOrderBoundary').length,0)
      topics.render().find(n=>n.props['data-holistic-order-trigger']==='expert').props.onClick()
      assert.equal(events.at(-1),'topics');assert.equal(catalog.render().filter(n=>n.type==='InlineOrderBoundary').length,0)
      order=topics.render().filter(n=>n.type==='InlineOrderBoundary');assert.equal(order.length,1);assert.equal(order[0].props.kind,'energy')
      catalog.render().find(n=>n.props['data-tao-talisman-order']===item.id).props.onClick()
      assert.equal(topics.render().filter(n=>n.type==='InlineOrderBoundary').length,0)
      catalog.render().find(n=>n.type==='InlineOrderBoundary').props.onClose()
      assert.equal(catalog.render().filter(n=>n.type==='InlineOrderBoundary').length,0)
    }
    assert.ok(scrolls.length>0);assert.equal(scrolls.length%2,0)
    catalog.close();topics.close();assert.equal(listeners.size,0)
  }
}

test('actual catalog and topic state coordinate selected IDs, one order, lazy archive and listener cleanup in all locales',()=>{
  assertCatalogCoordination()
})

test('catalog coordination rejects wrong IDs/goals, eager private mount and missing cross-panel notification',()=>{
  const catalog=read('components/taoist-talisman-catalog.tsx'),topic=read('components/holistic-support-topic-filter.tsx')
  for(const [before,after] of [['initialTalismanId={selection.id}','initialTalismanId="wrong"'],
    ['initialGoal={selection.goal}','initialGoal="wrong"'],['useState(false)','useState(true)'],
    ['setSelection(null);','void 0;']]){
    assert.ok(catalog.includes(before));assert.throws(()=>assertCatalogCoordination(catalog.replace(before,after)),{code:'ERR_ASSERTION'})
  }
  const dispatch='window.dispatchEvent(new CustomEvent("hh-support-order-open", {detail:{source:"topics"}}));'
  assert.ok(topic.includes(dispatch));assert.throws(()=>assertCatalogCoordination(catalog,topic.replace(dispatch,'')),{code:'ERR_ASSERTION'})
})

async function assertAnonymousArchive(input=read('components/support-talisman-gallery.tsx')) {
  const compiled=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
  for(const locale of ['en','ru','es']) {
    const states=[],effects=[],requests=[];let index=0
    const jsx=(type,props)=>({type,props:props||{}})
    const modules={'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},
      './support-talisman-gallery.module.css':{default:{}},
      react:{useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},
        useEffect(fn){effects.push(fn)},useCallback:fn=>fn,useRef:()=>({current:null})}}
    const exports={}
    vm.runInNewContext(compiled,{exports,require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]},
      fetch:async(url,options)=>{assert.equal(url,'/api/holistic-support/talismans');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.method,undefined);requests.push(url);return {status:401,ok:false,json:async()=>assert.fail('Anonymous archive must not consume private payload')}}},{timeout:1000})
    const render=()=>{index=0;const nodes=[],walk=node=>{if(Array.isArray(node))return node.forEach(walk);if(!node||typeof node!=='object')return;nodes.push(node);walk(node.props?.children)};walk(exports.SupportTalismanGallery({locale}));return nodes}
    const initial=render();assert.equal(initial.filter(n=>n.props.role==='status').length,1)
    assert.equal(effects.length,1);effects[0]();await new Promise(resolve=>setImmediate(resolve))
    const denied=render(),links=denied.filter(n=>n.type==='a')
    assert.equal(requests.length,1);assert.equal(links.length,1);assert.equal(links[0].props.href,'/'+locale+'/app');assert.equal(links[0].props.prefetch,false)
    assert.equal(denied.filter(n=>['img','form','input','textarea','select'].includes(n.type)||Object.hasOwn(n.props,'data-talisman-upload')).length,0)
  }
}

test('actual lazily opened archive consumes only an anonymous denial and exposes no private images or upload form',async()=>{
  await assertAnonymousArchive()
})

test('archive denial negatives reject authorization drift and accidental credential-mode changes',async()=>{
  const source=read('components/support-talisman-gallery.tsx')
  for(const [before,after] of [['setAuthorized(false)','setAuthorized(true)'],['credentials:"same-origin"','credentials:"include"']]){
    assert.ok(source.includes(before));await assert.rejects(assertAnonymousArchive(source.replace(before,after)),{code:'ERR_ASSERTION'})
  }
})

test('executed master archive opener requires closed lazy state, exact prior reads, touch geometry and explicit tap',async()=>{
  const source=read('scripts/verify-holistic-master-browser.mjs')
  const node=findNode(source,n=>ts.isFunctionDeclaration(n)&&n.name?.getText()==='openAnonymousArchive')
  assert.equal((source.match(/await openAnonymousArchive\(0\)/g)||[]).length,1)
  assert.equal((source.match(/await openAnonymousArchive\(1\)/g)||[]).length,1)
  assert.match(source,/anonymousTalismanReads, width === 390 \? 2 : 1/)
  const run=async(patch={},expected=0)=>{
    let opened=false,taps=0
    const archive={count:async()=>patch.count??1,getAttribute:async name=>{assert.equal(name,'aria-expanded');return opened?(patch.after??'true'):(patch.before??'false')},
      boundingBox:async()=>patch.target??{height:44,width:44},tap:async()=>{taps++;opened=true}}
    const catalog={waitFor:async()=>{},locator(selector){
      if(selector==='button[aria-controls="tao-talisman-private-gallery"]')return archive
      assert.equal(selector,'[data-support-talismans]');return {count:async()=>patch.eager??0}
    }}
    const page={locator(selector){assert.equal(selector,'[data-taoist-talisman-catalog]');return catalog}}
    const fence={summary:()=>({anonymousTalismanReads:patch.reads??expected})}
    const open=new Function('page','fence','assert','label','return ('+node.getText()+')')(page,fence,assert,'synthetic')
    await open(expected);assert.equal(taps,1)
  }
  await run({},0);await run({},1)
  for(const patch of [{count:0},{count:2},{before:'true'},{after:'false'},{eager:1},{reads:1},
    {target:{height:43,width:44}},{target:{height:44,width:43}}])await assert.rejects(run(patch),{code:'ERR_ASSERTION'})
})
