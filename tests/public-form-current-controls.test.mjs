// Source/handler contract only: this does not claim native-browser layout proof.
import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const browser=read('scripts/verify-contact-channel-chooser-browser.mjs')
const compact=read('components/compact-lead-capture.tsx')
const landing=read('components/free-entry-landing.tsx')
const ast=source=>ts.createSourceFile('actual.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
function find(source,predicate){const found=[];const walk=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,walk)};walk(ast(source));assert.equal(found.length,1);return found[0]}
const fn=(source,name)=>find(source,node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText()
const variable=(source,name)=>find(source,node=>ts.isVariableDeclaration(node)&&node.name.getText()===name).parent.parent.getText()
const compile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor


function daoSnippet(source=browser){
  const start=source.indexOf('            const consent = daoForm.locator'),end=source.indexOf('\n          }\n          if (name === "chromium"',start)
  assert.ok(start>0&&end>start);return source.slice(start,end)
}
function daoRuntime(locale,source=compact){
  const serviceTitles=runInNewContext(compile(variable(landing,'serviceTitles')+'\nserviceTitles;'))
  const requests=[],popups=[],writes=[]
  const state={locale,address:'',consent:false,busy:null,reference:'',error:'',phoneOnly:false,formatOptions:undefined,selectedFormat:'',sourcePath:undefined,
    pathname:'/'+locale+'/services/dao-health-profile',serviceTitle:serviceTitles.dao,operationId:{current:null},
    RECEIPT_SESSION_KEY:'synthetic-receipt',URL,JSON,Date}
  for(const [setter,key] of [['setError','error'],['setBusy','busy'],['setReference','reference'],['setSubmittedFormat','submittedFormat'],['setSubmittedServiceTitle','submittedServiceTitle']])state[setter]=value=>{state[key]=value}
  state.window={crypto:{randomUUID:()=> '2af7b724-b015-4f10-bf75-5a045a5fd445'},sessionStorage:{setItem:(...args)=>writes.push(args)},open:(url,target)=>{assert.equal(url,'about:blank');assert.equal(target,'_blank');const popup={opener:undefined,closed:false,destinations:[],close(){this.closed=true},location:{replace:href=>popup.destinations.push(href)}};popups.push(popup);return popup}}
  // A URL string is recorded, never fetched or opened; URL composition is not
  // the scope of this source-handler adapter (the hosted suite checks it).
  state.channelUrl=(reference,channel)=>'inert:'+channel+':'+reference
  state.fetch=async(url,options)=>{assert.equal(url,'/api/service-enquiries');assert.equal(options.method,'POST');requests.push(JSON.parse(options.body));return{ok:true,status:201,json:async()=>({saved:true,referenceCode:'HH-CA5016DE79E4'})}}
  runInNewContext(compile(variable(source,'copy')+'\n'+fn(source,'parseContact')+'\n'+fn(source,'chooseChannel')+'\nglobalThis.chooseChannel=chooseChannel;globalThis.t=copy[locale];'),state)
  const submit={getAttribute:async name=>{assert.equal(name,'type');return'button'},click:async()=>{await state.chooseChannel('whatsapp')}}
  const consent={count:async()=>1,isChecked:async()=>state.consent,check:async()=>{state.consent=true;state.error='';state.operationId.current=null}}
  const contact={fill:async value=>{state.address=value;state.error='';state.operationId.current=null}}
  const error={waitFor:async()=>assert.ok(state.error,'Validation must render before observation'),innerText:async()=>state.error}
  const saved={count:async()=>state.reference?1:0,waitFor:async()=>assert.equal(state.reference,'HH-CA5016DE79E4')}
  const daoForm={locator(selector){
    if(selector==='input[type="checkbox"][required]')return consent
    if(selector==='button[data-compact-channel="whatsapp"]')return submit
    if(selector==='button[data-compact-channel]')return{count:async()=>2}
    if(selector==='input[name="contact"]')return contact
    if(selector==='[role="alert"]')return error
    assert.fail('Retired or unknown Dao control '+selector)
  }}
  const page={locator(selector){if(selector==='[data-free-entry-landing="dao"] [data-contact-channel-chooser]')return{count:async()=>0};assert.equal(selector,'main[data-free-entry-landing="dao"] [data-lead-saved]');return saved}}
  return{state,requests,popups,writes,run:async code=>new AsyncFunction('daoForm','page','submissions','assert','locale',code)(daoForm,page,requests,assert,locale)}
}
for(const locale of ['en','ru','es'])test(locale+' Dao verifier exercises actual contact and consent gates before exactly one synthetic channel request',async()=>{
  const runtime=daoRuntime(locale);await runtime.run(daoSnippet())
  assert.equal(runtime.requests.length,1);assert.equal(runtime.popups.length,1);assert.equal(runtime.writes.length,1)
  assert.deepEqual(runtime.popups[0].destinations,['inert:whatsapp:HH-CA5016DE79E4'])
})
for(const [name,from,to,expected] of [
  ['missing contact gate','if (!contact || (phoneOnly && !contact.phone))','if (false)',/Expected values to be strictly equal/],
  ['missing consent gate','if (!consent) { setError(t.consentRequired); return; }','/* removed consent gate */',/Validation must render before observation/],
  ['wrong request contact','contact: { displayName: "", ...contact },','contact: { displayName: "wrong", ...contact },',/Expected values to be strictly deep-equal/],
])test('Dao source negative control rejects '+name,async()=>{
  assert.ok(compact.includes(from));const runtime=daoRuntime('en',compact.replace(from,to));await assert.rejects(runtime.run(daoSnippet()),expected)
})
test('Dao verifier rejects the retired submit selector and pins real authored channel markup',async()=>{
  const runtime=daoRuntime('en')
  await assert.rejects(runtime.run(daoSnippet().replace('button[data-compact-channel="whatsapp"]','button[type="submit"]')),/Retired or unknown Dao control/)
  for(const channel of ['whatsapp','telegram']){
    const button=find(compact,node=>ts.isJsxOpeningElement(node)&&node.tagName.getText()==='button'&&node.attributes.properties.some(p=>p.name?.getText()==='data-compact-channel'&&p.initializer?.text===channel))
    assert.ok(button.attributes.properties.some(p=>p.name?.getText()==='type'&&p.initializer?.text==='button'))
    assert.match(button.getText(),new RegExp('chooseChannel\\("'+channel+'"\\)'))
  }
  assert.match(landing,/kind !== "situation" \? <CompactLeadCapture/)
  const intake=find(landing,node=>ts.isJsxSelfClosingElement(node)&&node.tagName.getText()==='CompactLeadCapture').getText()
  assert.doesNotMatch(intake,/phoneOnly|formatOptions/)
})
test('public runtime and synthetic request fences, inert popup, locales and browser matrix remain intact',()=>{
  for(const invariant of ['assertPublicJourneyRuntime(origin)','serviceWorkers:"block"',"await context.route('**/*'",'non-synthetic-enquiry','No real API/write/provider operation attempted outside the exact synthetic enquiry','window.open=()=>({opener:null,closed:false','[320,390,1188]','["en","ru","es"]'])assert.ok(browser.includes(invariant),invariant)
  assert.doesNotMatch(daoSnippet(),/force:\s*true|dispatchEvent\(|route\.(?:continue|fetch)\(|\.evaluate\(|\.goto\(/)
})
