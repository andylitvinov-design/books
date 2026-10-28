import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {openContactChannelChooser} from '../scripts/helpers/contact-channel-verifier.mjs'
import {HYPNOTHERAPY_CONTACT, HYPNOTHERAPY_REFERENCE, HYPNOTHERAPY_RECEIPT_KEY, assertHypnotherapyBoundary,
  assertHypnotherapyRequest, createHypnotherapyRequestGuard, installHypnotherapyPopupProbe,
  assertHypnotherapyLink, verifyHypnotherapyRequest} from '../scripts/helpers/hypnotherapy-request-verifier.mjs'
import {runtimePage, expectRuntime, compactSource} from './helpers/hypnotherapy-request-fixture.mjs'
const origin='http://127.0.0.1:3100'
const env={CI:'true',HH_APP_TEST_RUNTIME:'isolated',HH_TEST_ADMIN_DATABASE_URL:'postgres://localhost/hh_app_test'}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const payload=(locale='en',channel='whatsapp')=>({operationId:'27d6bba7-c626-4b2d-986f-3b1de4c62f2c',serviceTitle:locale==='en'?'Guided Imagery Hypnotherapy':'Курс гипнотерапии',description:'Preferred reply channel: '+(channel==='whatsapp'?'WhatsApp':'Telegram'),sourcePath:'/'+locale+'/services/hypnotherapy-course',locale,contact:{displayName:'',email:HYPNOTHERAPY_CONTACT,phone:''},contactConsent:true,website:''})
function fakeRoute({url=origin+'/api/service-enquiries',method='POST',body=payload(),contentType='application/json'}={}){const calls=[];return{calls,request:()=>({url:()=>url,method:()=>method,headers:()=>({'content-type':contentType}),postDataJSON:()=>body}),fulfill:async value=>calls.push(['fulfill',value]),abort:async value=>calls.push(['abort',value]),fallback:async()=>calls.push(['fallback'])}}

for(const locale of ['en','ru']) test(locale+' same page/context preserves WhatsApp and Telegram registration with earlier receipt intact until save',async()=>{
  const prior=JSON.stringify({referenceCode:'HH-000000000001',createdAt:1})
  const page=runtimePage(locale,{priorReceipt:prior}), context=page.context()
  try{
    for(const channel of ['whatsapp','telegram']){
      await verifyHypnotherapyRequest(page,expectRuntime,{origin,locale,channel},env)
      const s=page.snapshot()
      assert.equal(page.context(),context)
      assert.equal(s.window.open,s.originalOpen)
      assert.equal(s.window.__hhHypnotherapyProbe,undefined)
      assert.equal(s.handlers.length,0)
      assert.deepEqual(s.fallbacks,[])
      assert.equal(s.values.get('unrelated-session-state'),'preserved')
      assert.equal(JSON.parse(s.values.get(HYPNOTHERAPY_RECEIPT_KEY)).referenceCode,HYPNOTHERAPY_REFERENCE)
      page.reloadComponent()
    }
    assert.equal(page.snapshot().requests.length,2)
    assert.deepEqual(page.snapshot().routeCalls,['route','unroute','route','unroute'])
  }finally{page.unmount()}
})

test('original chooser assertion reproduces current exact source mismatch without any request',async()=>{
  const page=runtimePage('en')
  try{
    const scope=page.locator('[data-sitewide-capture="core-service"][data-core-service-capture="hypnotherapy"]')
    await assert.rejects(openContactChannelChooser(scope,expectRuntime),/count \[data-contact-channel-chooser\]/)
    assert.deepEqual(page.snapshot().requests,[])
  }finally{page.unmount()}
})

const changes=[
  ['missing compact form','data-compact-lead-form','data-retired-form'],
  ['contact validation removed','if (!contact || (phoneOnly && !contact.phone))','if (false)'],
  ['consent gate removed','if (!consent) { setError(t.consentRequired); return; }','/* removed consent gate */'],
  ['early receipt','    setBusy(channel);','    setReference("'+HYPNOTHERAPY_REFERENCE+'");\n    setBusy(channel);'],
  ['early provider handoff','    setBusy(channel);','    handoffWindow.location.replace("https://wa.me/14376066502");\n    setBusy(channel);'],
  ['wrong service','          serviceTitle,\n          description:','          serviceTitle: "Wrong service",\n          description:'],
  ['contact leaked into draft','request: t.message + " " + t.reference + ": " + referenceCode,','request: address + " " + t.message + " " + t.reference + ": " + referenceCode,'],
  ['wrong Telegram destination','<a href={channelUrl(reference, "telegram")}','<a href={channelUrl(reference, "whatsapp")}'],
  ['missing safe target','target="_blank" rel="noopener noreferrer"','target="_self" rel="noopener noreferrer"'],
  ['missing safe rel','rel="noopener noreferrer"','rel="noreferrer"'],
]
for(const [name,from,to] of changes)test('actual-source negative control: '+name,async()=>{
  assert.ok(compactSource.includes(from),'Exact current mutation target')
  const page=runtimePage('en',{sourceOverride:compactSource.replace(from,to)})
  try{
    await assert.rejects(verifyHypnotherapyRequest(page,expectRuntime,{origin,locale:'en'},env))
    const s=page.snapshot()
    assert.deepEqual(s.fallbacks,[],'No request forwarded even on failure')
    assert.equal(s.handlers.length,1,'Failed interaction remains protected through caller cleanup')
    assert.notEqual(s.window.open,s.originalOpen,'Provider remains inert on failure')
  }finally{page.unmount()}
})
for(const [name,status,data] of [
  ['failed save',503,{saved:false}],['unconfirmed saved flag',201,{saved:false,referenceCode:HYPNOTHERAPY_REFERENCE}],
  ['missing reference',201,{saved:true}],['malformed reference',201,{saved:true,referenceCode:'not-a-receipt'}],
])test('actual source rejects '+name+' without receipt or provider handoff',async()=>{
  const page=runtimePage('ru',{responseOverride:()=>({status,body:JSON.stringify(data)})})
  try{
    await assert.rejects(verifyHypnotherapyRequest(page,expectRuntime,{origin,locale:'ru',channel:'telegram'},env))
    const s=page.snapshot();assert.deepEqual(s.writes,[]);assert.deepEqual(s.fallbacks,[])
    assert.deepEqual(structuredClone(s.window.__hhHypnotherapyProbe.popups.map(p=>p.destinations)),[[]])
    assert.ok(s.window.__hhHypnotherapyProbe.popups[0].closed)
  }finally{page.unmount()}
})

function assertCoreServiceIntegration(script){
  assert.match(script,/for\(const locale of \['en','ru'\]\)/)
  assert.match(script,/for\(const width of \[320,360,390,1280\]\)/)
  assert.match(script,/if\(kind==='hypnotherapy'&&\(width===390\|\|width===1280\)\)/)
  assert.match(script,/await verifyHypnotherapyRequest\(servicePage,expect,\{origin,locale,channel:width===390\?'whatsapp':'telegram'\}\)/)
  assert.ok(script.indexOf('await verifyHypnotherapyRequest(')<script.indexOf('if(width!==390)continue'))
  assert.match(script,/main\[data-core-service-detail="hypnotherapy"\] > section:last-child > details/)
  assert.match(script,/Free review alternative starts collapsed/)
  assert.match(script,/assertDaoFreeEntryCapture\(servicePage/)
  assert.match(script,/const book=pricing\.locator\('\[data-booking-cta="book"\]'\)/)
  assert.match(script,/await book\.click\(\)/)
  assert.match(script,/await expect\(pricing\.locator\('\[data-booking-step="contact"\]'\)\)\.toBeVisible\(\)/)
  assert.match(script,/await expect\(pricing\.locator\('\[data-booking-payment-options\]'\)\)\.toHaveCount\(0\)/)
  assert.match(script,/assertAlchemyPanelGeometry\(measurements\)/)
  assert.match(script,/import \{ assertFreeReviewLanding, verifyFreeReviewPrivateHandoff \} from '.\/helpers\/free-review-private-handoff-verifier.mjs'/)
  assert.match(script,/await assertFreeReviewLanding\(publicPage,expect,locale\)/)
  assert.match(script,/await verifyFreeReviewPrivateHandoff\(publicPage,expect,\{origin,locale,/)
  assert.doesNotMatch(script,/openContactChannelChooser\(capture,expect\)/)
}

test('source integration preserves geometry/locales/other services and tests actual authored footer',()=>{
  assertCoreServiceIntegration(read('scripts/verify-app-r1.mjs'))
  const helper=read('scripts/helpers/hypnotherapy-request-verifier.mjs')
  assert.doesNotMatch(helper,/newContext\(|newPage\(|\.goto\(|\.reload\(|clearCookies\(|sessionStorage\.clear|removeItem\(|force:\s*true|waitForTimeout|route\.continue\(|route\.fetch\(/)
  assert.match(helper,/await context\.unroute\('\*\*\/\*', guard\.route\)/)
  const workflow=read('.github/workflows/hh-app-r1.yml')
  assert.match(workflow,/node --test tests\/hypnotherapy-request-verifier\.test\.mjs/)
  const route=read('app/[locale]/services/hypnotherapy-course/page.tsx')
  assert.match(route,/const kind = "hypnotherapy"/);assert.match(route,/<CoreServiceDetail locale=\{locale as Locale\} kind=\{kind\}/)
})
// Exercise the integration assertions on mutations of the actual current core.
// The retired public copy form is not a Hypnotherapy invariant; its replacement
// must still be imported and called, alongside the unchanged Hypnotherapy flow.
for(const [name,from,to] of [
  ['missing current Alchemy Book action', 'await book.click()', 'await Promise.resolve()'],
  ['premature Alchemy payment options', "await expect(pricing.locator('[data-booking-payment-options]')).toHaveCount(0)", "await expect(pricing.locator('[data-booking-payment-options]')).toHaveCount(1)"],
  ['missing hypnotherapy request', "await verifyHypnotherapyRequest(servicePage,expect,{origin,locale,channel:width===390?'whatsapp':'telegram'})", 'await Promise.resolve()'],
  ['wrong desktop channel', "channel:width===390?'whatsapp':'telegram'", "channel:'whatsapp'"],
  ['wrong authored footer owner', 'main[data-core-service-detail="hypnotherapy"] > section:last-child > details', '[data-sitewide-capture="core-service"] > details'],
  ['mobile-only early gate', "if(kind==='hypnotherapy'&&(width===390||width===1280)){", "if(width!==390)continue\n    if(kind==='hypnotherapy'&&(width===390||width===1280)){"],
  ['missing current free-review import', "import { assertFreeReviewLanding, verifyFreeReviewPrivateHandoff } from './helpers/free-review-private-handoff-verifier.mjs'", ''],
  ['missing current free-review landing', 'await assertFreeReviewLanding(publicPage,expect,locale)', 'await Promise.resolve()'],
  ['retired free-review handoff', 'await verifyFreeReviewPrivateHandoff(publicPage,expect,{origin,locale,', 'await openContactChannelChooser(publicPage,expect,{origin,locale,'],
])test('current core source rejects '+name,()=>{
  const source=read('scripts/verify-app-r1.mjs')
  assert.equal(source.split(from).length-1,1,'Negative control must target exactly one current core statement')
  const changed=source.replace(from,to)
  assert.notEqual(changed,source)
  assert.throws(()=>assertCoreServiceIntegration(changed),{code:'ERR_ASSERTION'})
})

for(const bad of ['https://example.test','http://127.0.0.1:3100/path','http://localhost:3100?query=1','http://127.0.0.2:3100'])test('reject nonisolated origin '+bad,()=>assert.throws(()=>assertHypnotherapyBoundary(bad,'en',env)))
for(const patch of [{CI:'false'},{HH_APP_TEST_RUNTIME:'production'},{VERCEL:'1'},{HH_TEST_ADMIN_DATABASE_URL:'postgres://db.example.test/hh_app_test'},{HH_TEST_ADMIN_DATABASE_URL:'postgres://localhost/production'}])test('reject invalid runtime '+Object.keys(patch)[0]+':'+Object.values(patch)[0],()=>assert.throws(()=>assertHypnotherapyBoundary(origin,'en',{...env,...patch})))
for(const [key,value] of [['contactConsent',false],['serviceTitle','Other'],['sourcePath','/en/app'],['locale','ru'],['description','private'],['operationId','no-uuid'],['contact',{displayName:'real',email:'other@example.test',phone:''}],['website','spam'],['extra','unreviewed']])test('reject invalid payload '+key,()=>assert.throws(()=>assertHypnotherapyRequest({...payload(),[key]:value},'en','whatsapp')))
for(const locale of ['en','ru'])for(const channel of ['whatsapp','telegram'])test(locale+' '+channel+' guard holds exactly one explicitly armed synthetic POST',async()=>{
  const guard=createHypnotherapyRequestGuard(origin,locale,channel,env),r=fakeRoute({body:payload(locale,channel)})
  guard.arm();await guard.route(r);assert.equal(guard.count,1);assert.equal(guard.pending,true);assert.deepEqual(r.calls,[])
  await guard.confirm();assert.equal(guard.pending,false);assert.equal(r.calls[0][0],'fulfill');assert.deepEqual(JSON.parse(r.calls[0][1].body),{saved:true,referenceCode:HYPNOTHERAPY_REFERENCE})
  const duplicate=fakeRoute({body:payload(locale,channel)});await guard.route(duplicate);assert.equal(duplicate.calls[0][0],'abort');assert.equal(guard.count,1)
  await guard.close();await assert.rejects(guard.confirm())
})
test('unarmed request and mismatched content type never forward',async()=>{
  const guard=createHypnotherapyRequestGuard(origin,'en','whatsapp',env),early=fakeRoute()
  await guard.route(early);assert.equal(early.calls[0][0],'abort');assert.equal(guard.count,0)
  guard.arm();const wrong=fakeRoute({contentType:'text/plain'});await guard.route(wrong);assert.equal(wrong.calls[0][0],'abort');assert.equal(guard.count,0);await guard.close()
})
for(const [url,method] of [[origin+'/api/other','POST'],[origin+'/api/service-enquiries?x=1','POST'],[origin+'/api/service-enquiries','PUT'],['https://wa.me/14376066502?text=private','GET'],['https://t.me/AndyTherapist','GET']])test('deny unknown write/external transport '+method+' '+new URL(url).pathname,async()=>{
  const guard=createHypnotherapyRequestGuard(origin,'en','whatsapp',env),r=fakeRoute({url,method});await guard.route(r)
  assert.equal(r.calls[0][0],'abort');assert.equal(r.calls.length,1);assert.equal(guard.blocked.length,1);assert.doesNotMatch(JSON.stringify(guard.blocked),/private|wa\.me|t\.me/);await guard.close()
})
test('read policy is delegated to the existing fence, never enlarged or continued directly',async()=>{
  const guard=createHypnotherapyRequestGuard(origin,'en','whatsapp',env)
  for(const url of [origin+'/_next/static/app.js',origin+'/api/app/bootstrap',origin+'/en/services']){const r=fakeRoute({url,method:'GET'});await guard.route(r);assert.deepEqual(r.calls,[['fallback']])}
  await guard.close()
})
test('closing aborts held request and refuses late synthetic registration',async()=>{
  const guard=createHypnotherapyRequestGuard(origin,'en','whatsapp',env),r=fakeRoute();guard.arm();await guard.route(r);await guard.close();assert.equal(r.calls[0][0],'abort')
  const late=fakeRoute();await guard.route(late);assert.equal(late.calls[0][0],'abort');assert.equal(guard.pending,false)
})
test('popup probe is inert even for malformed popup arguments; caller validates exact arguments',()=>{
  const window={open:()=>assert.fail('Real provider')} ;runInNewContext('('+installHypnotherapyPopupProbe.toString()+')()',{window})
  const popup=window.open('https://provider.invalid','_self','features');popup.location.replace('https://provider.invalid/next');popup.close()
  assert.equal(popup.closed,true);assert.equal(window.__hhHypnotherapyProbe.opens.length,1);assert.equal(popup.destinations.length,1)
})
const link=(locale='en',channel='whatsapp')=>'https://'+(channel==='whatsapp'?'wa.me/14376066502':'t.me/AndyTherapist')+'?text='+encodeURIComponent(payload(locale).serviceTitle+' '+HYPNOTHERAPY_REFERENCE+' https://holistichouse.vercel.app/'+locale+'/services/hypnotherapy-course')
test('strict links reject missing receipt, wrong provider, contact, extra query and nonpublic source',()=>{
  for(const locale of ['en','ru'])for(const channel of ['whatsapp','telegram'])assertHypnotherapyLink(link(locale,channel),locale,channel)
  for(const href of [link().replace(HYPNOTHERAPY_REFERENCE,'HH-000000000000'),link().replace('https://wa.me','https://bad.example'),link()+encodeURIComponent(HYPNOTHERAPY_CONTACT),link()+'&token=private',link().replace('services%2Fhypnotherapy-course','app')])assert.throws(()=>assertHypnotherapyLink(href,'en','whatsapp'))
})

test('successful same-context cleanup preserves a pre-existing caller route fence',async()=>{
  const page=runtimePage('en'),original=async route=>route.abort('blockedbyclient')
  await page.context().route('**/*',original)
  try{
    await verifyHypnotherapyRequest(page,expectRuntime,{origin,locale:'en'},env)
    assert.deepEqual(page.snapshot().handlers,[original])
    assert.deepEqual(page.snapshot().fallbacks,[])
  }finally{page.unmount()}
})
test('pending route callbacks finish before scoped guard removal',async()=>{
  const guard=createHypnotherapyRequestGuard(origin,'en','whatsapp',env),r=fakeRoute({url:origin+'/asset',method:'GET'})
  let finish,closed=false
  r.fallback=()=>new Promise(resolve=>{finish=resolve})
  const pending=guard.route(r)
  const close=guard.close().then(()=>{closed=true})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,false)
  finish();await pending;await close;assert.equal(closed,true)
})

for(const locale of ['en','ru'])test(locale+' current authored CoreServiceDetail owns the collapsed footer alternative',()=>{
  const page=runtimePage(locale)
  try{
    const main=page.publicDetailTree()
    assert.equal(main.type,'main');assert.equal(main.props['data-core-service-detail'],'hypnotherapy')
    const sections=main.props.children.filter(node=>node?.type==='section')
    const details=sections.at(-1).props.children.filter(node=>node?.type==='details')
    assert.equal(details.length,1);assert.equal(Boolean(details[0].props.open),false)
    const summary=details[0].props.children.filter(node=>node?.type==='summary')
    const link=details[0].props.children.filter(node=>node?.type==='a')
    assert.equal(summary.length,1);assert.equal(link.length,1)
    assert.equal(link[0].props.href,'/'+locale+'/services/free-situation-review')
  }finally{page.unmount()}
})
