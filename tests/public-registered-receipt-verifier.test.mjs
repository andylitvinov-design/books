// Actual component hooks/handlers and thank-you renderer, with native details
// modelled only for source contracts. Native navigation/layout remains CI proof.
import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import * as verifier from '../scripts/helpers/contact-channel-verifier.mjs'
import * as enquiries from '../lib/whatsapp-enquiry.js'
import * as receipts from '../lib/practitioners/enquiry-receipt.mjs'
import {environment,mount,turn,compileContactModule} from './helpers/contact-channel-verifier-fixture.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const chooserSource=read('components/contact-channel-chooser.tsx')
const thankYouSource=read('components/service-enquiry-thank-you.tsx')
const choiceSource=read('components/consultation-choice-capture.tsx')
const choiceAst=ts.createSourceFile('choice.tsx',choiceSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const choiceCopyStatement=choiceAst.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText()==='copy'))
assert.ok(choiceCopyStatement)
const choiceCopy=runInNewContext(ts.transpileModule(choiceCopyStatement.getText()+'\ncopy;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)
const children=node=>{const all=[];function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v?.props)return;all.push(v);walk(v.props.children)}walk(node);return all}
const text=node=>Array.isArray(node)?node.map(text).join(''):typeof node==='string'?node:node?.props?text(node.props.children):''

function fixture(locale,{chooserOverride=chooserSource,thankYouOverride=thankYouSource,fault}={}){
  const pathname='/'+locale+'/services/imagery-therapy',title=choiceCopy[locale].serviceOptions.questions
  const env=environment(locale,{pathname}),sourceUrl='http://127.0.0.1:3100'+pathname+'#request-session'
  const whatsappUrl=enquiries.whatsappEnquiryUrl({locale,service:'Imagery therapy',request:title,pagePath:pathname})
  const f=mount('contact-channel-chooser','ContactChannelChooser',{locale,whatsappUrl,publicServiceTitle:title},env,{sourceOverride:chooserOverride})
  let routeHandler,nameOpen=false,summaryClicks=0,receiptState='checking',effectRan=false,pendingEffect
  const element=(type,props)=>({type,props:props||{}})
  const ui=compileContactModule(thankYouOverride,{
    'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},
    react:{useState:()=>[receiptState,value=>{receiptState=value}],useEffect:fn=>{if(!effectRan)pendingEffect=fn}},
    'next/image':{default:'img'},'next/link':{default:'a'},
    'lucide-react':Object.fromEntries(['CheckCircle2','ArrowRight','MailCheck','ShieldCheck'].map(x=>[x,'icon-'+x])),
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},'@/components/site-video-player':{SiteVideoPlayer:'site-video'},
    '@/lib/practitioners/enquiry-receipt.mjs':receipts,'./service-enquiry-thank-you.module.css':{default:{}},
  },env).ServiceEnquiryThankYou
  function receiptNodes(){
    if(!env.navigations.length)return[]
    let tree=ui({locale,video:null});if(pendingEffect){effectRan=true;pendingEffect();pendingEffect=null;tree=ui({locale,video:null})}
    return children(tree)
  }
  env.setRespond(()=>new Promise((resolve,reject)=>{
    assert.ok(routeHandler,'No unintercepted enquiry')
    const route={request:()=>({url:()=> 'http://127.0.0.1:3100/api/service-enquiries',method:()=> 'POST',postDataJSON:()=>JSON.parse(env.requests.at(-1))}),
      fulfill:async result=>resolve({ok:true,status:result.status,json:async()=>JSON.parse(result.body)}),abort:async()=>reject(Error('Request blocked'))}
    routeHandler(route).catch(reject)
  }))
  const rawNodes=()=>{f.flush();return f.nodes()}
  function pick(selector){
    if(selector==='[data-service-thank-you]')return receiptNodes().filter(n=>Object.hasOwn(n.props,'data-service-thank-you'))
    if(selector===':scope > section:first-child strong')return receiptNodes().filter(n=>n.type==='strong')
    if(selector==='a[href^="https://wa.me"], a[href^="https://t.me"]')return receiptNodes().filter(n=>n.type==='a'&&/^https:\/\/(?:wa.me|t.me)/.test(n.props.href||''))
    if(selector==='details:has(input[autocomplete="name"])')return rawNodes().filter(n=>n.type==='details'&&children(n).some(c=>c.type==='input'&&c.props.autoComplete==='name'))
    if(selector==='summary')return pick('details:has(input[autocomplete="name"])').flatMap(children).filter(n=>n.type==='summary')
    if(selector==='form')return rawNodes().filter(n=>n.type==='form')
    const match=selector.match(/^(a|button|input)?\[([\w-]+)(?:="([^"]+)")?\]$/);assert.ok(match,'Known actual selector '+selector)
    const key=match[2]==='autocomplete'?'autoComplete':match[2]
    return rawNodes().filter(n=>(!match[1]||n.type===match[1]||(match[1]==='a'&&n.type==='acquisition-link'))&&Object.hasOwn(n.props,key)&&(match[3]===undefined||n.props[key]===match[3]))
  }
  function locator(selector){
    const loc={selector,all:()=>pick(selector),one:()=>{const nodes=pick(selector);assert.equal(nodes.length,1,'One '+selector);return nodes[0]},locator,
      hidden:()=>loc.one().hidden===true||(selector==='input[autocomplete="name"]'&&!nameOpen),
      getAttribute:async key=>key==='open'?(nameOpen?'':null):(loc.one().props[key]??null)}
    loc.click=async options=>{
      assert.equal(options,undefined,'Never force interaction');const n=loc.one();assert.notEqual(n.type,'acquisition-link','Never follow provider');assert.notEqual(n.props.disabled,true)
      if(selector==='summary'){summaryClicks++;if(fault!=='blocked disclosure')nameOpen=true}
      else if(n.props.type==='submit')f.find('form').props.onSubmit({preventDefault(){}})
      else n.props.onClick()
      f.flush();await turn(f)
    }
    loc.fill=async value=>{assert.equal(loc.hidden(),false,'Never fill a hidden optional field');loc.one().props.onChange({target:{value}});f.flush()}
    loc.check=async()=>{loc.one().props.onChange({target:{checked:true}});f.flush()}
    return loc
  }
  const page={url:()=>env.navigations.length?'http://127.0.0.1:3100'+env.navigations.at(-1):sourceUrl,locator,
    route:async(pattern,handler)=>{assert.equal(pattern,'**/api/service-enquiries');routeHandler=handler},
    evaluate:async fn=>runInNewContext('('+fn.toString()+')()',{window:env.window})}
  async function observe(fn){let error;for(let i=0;i<10;i++){try{return fn()}catch(e){error=e;await turn(f)}}throw error}
  const expect=loc=>({
    toHaveCount:n=>observe(()=>assert.equal(loc.all().length,n,'Count '+loc.selector)),
    toBeVisible:()=>observe(()=>assert.equal(loc.hidden(),false)),toBeHidden:()=>observe(()=>assert.equal(loc.hidden(),true)),
    toBeDisabled:()=>observe(()=>assert.equal(loc.one().props.disabled,true)),
    toHaveAttribute:(key,value)=>observe(()=>assert.equal(String(key==='open'?(nameOpen?'':null):loc.one().props[key]),value)),
    toHaveText:value=>observe(()=>assert.equal(text(loc.one()),value)),
    toHaveURL:value=>observe(()=>assert.equal(loc.url(),value)),
    not:{toContainText:value=>observe(()=>assert.doesNotMatch(text(loc.one()),value))},
  })
  expect.poll=fn=>({toBe:value=>observe(()=>assert.equal(fn(),value))})
  return{page,scope:{locator},expect,env,f,title,summaryClicks:()=>summaryClicks}
}
for(const locale of ['en','ru','es'])test(locale+' actual optional-name registration retains selected tariff and renders native same-tab receipt',async()=>{
  assert.equal(typeof verifier.registerContactChannelRequest,'function','Receipt verifier export')
  const t=fixture(locale)
  try{
    const result=await verifier.registerContactChannelRequest(t.scope,t.expect,t.page)
    assert.equal(result.request.serviceTitle,t.title);assert.ok(result.request.serviceTitle.includes('€50'))
    assert.equal(t.env.requests.length,1);assert.equal(t.summaryClicks(),1)
    assert.deepEqual(t.env.navigations,['/'+locale+'/thank-you']);assert.deepEqual(t.env.popups,[])
    assert.equal(t.env.writes.length,1);assert.doesNotMatch(JSON.stringify(t.env.writes),/Public QA Visitor|enquiry-qa@example/)
  }finally{t.f.unmount()}
})
for(const [name,options,expected] of [
  ['blocked disclosure',{fault:'blocked disclosure'},/Expected values to be strictly equal/],
  ['missing receipt navigation',{chooserOverride:chooserSource.replace('if (!stayAfterSave) router.push("/" + locale + "/thank-you");','/* no native navigation */')},/Expected values to be strictly equal/],
  ['wrong displayed receipt',{thankYouOverride:thankYouSource.replace('<strong>{receipt}</strong>','<strong>HH-000000000000</strong>')},/Expected values to be strictly equal/],
  ['contact leaked to receipt',{chooserOverride:chooserSource.replace('referenceCode: data.referenceCode, createdAt: Date.now(),','referenceCode: data.referenceCode, createdAt: Date.now(), email,')},/One :scope|Count :scope|Expected values to be strictly equal/],
])test('receipt negative control rejects '+name,async()=>{
  assert.equal(typeof verifier.registerContactChannelRequest,'function')
  const t=fixture('en',options);try{await assert.rejects(verifier.registerContactChannelRequest(t.scope,t.expect,t.page),expected)}finally{t.f.unmount()}
})
test('personal and core callers keep exact service/tariff and original core disclosure checks; business tariff registration remains explicit',()=>{
  const production=read('scripts/verify-public-services-production.mjs')
  assert.match(production,/registerContactChannelRequest\(target, expect, page\)/)
  assert.match(production,/assert.equal\(request.serviceTitle, selectedTitle/)
  assert.match(production,/request.serviceTitle.includes\("€50"\)/)
  assert.match(production,/registerContactChannelRequest\(capture, expect, page\)/)
  assert.match(production,/assert.equal\(request.serviceTitle, selectedService/)
  assert.ok(production.indexOf('"alternative starts collapsed"')<production.indexOf('registerContactChannelRequest(capture'))
  assert.match(production,/registerContactChannelRequest\(express, expect, page\)/)
  assert.match(production,/assert.equal\(request.serviceTitle, expectedBusinessTitle/)
  assert.match(production,/Business express service, duration and €50 must survive registration/)
  const choice=read('components/consultation-choice-capture.tsx')
  assert.match(choice,/publicServiceTitle=\{t.serviceOptions\[serviceChoice\]\}/)
  assert.doesNotMatch(choice,/stayAfterSave/)
  assert.doesNotMatch(read('components/core-service-detail.tsx'),/stayAfterSave/)
  const helper=read('scripts/helpers/contact-channel-verifier.mjs')
  const ordinary=helper.slice(helper.indexOf('async function submitRegisteredContactChannelRequest'),helper.indexOf('export async function openRegisteredCompactPhoneChooser'))
  assert.doesNotMatch(ordinary,/\.goto\(|\.reload\(|sessionStorage\.(?:setItem|removeItem|clear)|force:\s*true|dispatchEvent\(/)
})
