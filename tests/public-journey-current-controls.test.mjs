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

test('topic cards reach the existing gallery shell without private record or upload operations',()=>{
  const filter=read('components/holistic-support-topic-filter.tsx')
  const page=read('app/[locale]/holistic-support/page.tsx')
  const verifier=read('scripts/verify-holistic-topics-browser.mjs')
  assert.match(filter,/if \(offer === "talisman"\) return "#talismans"/)
  assert.match(page,/id="talismans"[^>]+data-holistic-talismans/)
  assert.match(page,/<SupportTalismanGallery locale=\{locale\}/)
  assert.match(verifier,/"#talismans", label/)
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
