// Actual TSX execution with deterministic hooks and synthetic browser/transport.
// No DOM/browser layout, real account, CRM, database, payment or messenger call.
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import {jsx,nodes,text,parse,sourceModule,denied,ts} from './helpers/current-source-render.mjs'
import {assertCurrentFreeEntry,assertCurrentDiagnosisOffers,currentFreeEntrySource as read} from './helpers/current-free-entry-contract.mjs'
import * as intakeModel from '../lib/coaching/intake-model.js'
import * as diagnostic from '../lib/coaching/diagnostic-enquiry.mjs'
const css={default:new Proxy({},{get:(_,p)=>String(p)})}
const icons=Object.fromEntries('ArrowLeft ArrowRight Check ClipboardCopy LockKeyhole Plus ShieldCheck Sparkles Trash2'.split(' ').map(name=>[name,'icon-'+name]))
const privacy={
  en:'These details stay in this browser tab until you explicitly send your completed questionnaire. No call is booked.',
  ru:'Контакты остаются в этой вкладке до вашей явной отправки анкеты. Запись на сессию не производится.',
  es:'Los datos quedan en esta pestaña hasta que envíes expresamente el formulario. No hay reserva.',
}
const consentText={
  en:'I explicitly agree to send all my completed coaching answers and contact details securely to Andrey in Holistic House CRM for one personal response. No marketing.',
  ru:'Я явно согласен(на) отправить все ответы коучинговой анкеты и контакты Андрею в защищённую CRM Holistic House для одного личного ответа. Без рекламы и рассылок.',
  es:'Acepto expresamente enviar todas mis respuestas y datos de contacto a Andrey mediante el CRM privado de Holistic House para recibir una respuesta personal. Sin publicidad.',
}
const receiptLimit={
  en:'Your request awaits personal review. This does not book an appointment, collect payment or guarantee availability.',
  ru:'Андрей рассмотрит заявку. Это пока не подтверждённая запись, не оплата и не гарантия свободного времени.',
  es:'Andrey revisará la solicitud. No confirma una cita, disponibilidad ni pago.',
}
const reference='HH-123456789ABC' 
const response=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body})
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function harness({locale='en',kind='start',source,storage=new Map(),storageBlocked=false}={}){
  const filename=kind==='start'?'components/free-diagnostic-start.tsx':'components/coaching-intake-form.tsx'
  source??=read(filename);parse(source,filename)
  let slots=[],index=0,dirty=false,pending=[],tree,uuid=0
  const calls=[],writes=[],removes=[],navigation=[],queue=[],auth=[]
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const hooks={
    useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true}]},
    useRef(initial){return slots[index++]??={current:initial}},
    useMemo(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  const browserStorage={getItem:key=>{if(storageBlocked)throw Error('blocked');return storage.get(key)??null},setItem(key,value){if(storageBlocked)throw Error('blocked');writes.push({key,value});storage.set(key,value)},removeItem(key){if(storageBlocked)throw Error('blocked');removes.push(key);storage.delete(key)}}
  const modules={react:hooks,'react/jsx-runtime':jsx,'next/link':{default:'a'},'lucide-react':icons,
    '@/lib/coaching/intake-model':intakeModel,'@/lib/coaching/diagnostic-enquiry.mjs':diagnostic,
    './free-diagnostic-start.module.css':css,'./coaching-intake-form.module.css':css,
    '@/lib/app/client-fetch':{appFetch:async(...args)=>{assert.deepEqual(args,['coaching-intake'],'Only synthetic account-read probe allowed');auth.push(args);throw {status:401}}},
  }
  const module={exports:{}}
  vm.runInNewContext(ts.transpileModule(source,{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module,exports:module.exports,require:name=>{assert.ok(Object.hasOwn(modules,name),'Unapproved dependency '+name);return modules[name]},
    URL,URLSearchParams,sessionStorage:browserStorage,localStorage:{getItem:denied,setItem:denied},
    window:{location:{search:'',assign:href=>navigation.push(href)},crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`}},
    BroadcastChannel:class{constructor(name){assert.equal(name,'hh-app-session')}close(){}},
    navigator:{clipboard:{writeText:denied}},XMLHttpRequest:denied,WebSocket:denied,
    fetch:async(url,options)=>{assert.equal(url,'/api/coaching-diagnostic','Only the actual diagnostic endpoint');assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');calls.push({url,...options});assert.ok(queue.length,'Unplanned external operation');return queue.shift()()},
  },{filename,timeout:5000})
  const render=()=>{index=0;pending=[];dirty=false;tree=module.exports[kind==='start'?'FreeDiagnosticStart':'CoachingIntakeForm']({locale});pending.forEach(fn=>fn())}
  const h={calls,writes,removes,navigation,queue,auth,storage,get tree(){return tree},all:()=>nodes(tree),one:predicate=>nodes(tree).find(predicate),
    async settle(){for(let i=0;i<30;i++){await Promise.resolve();if(dirty)render()}},
    async change(node,value){assert.ok(node,'Actual control exists');node.props.onChange({target:{value,checked:value}});await h.settle()},
    submitStart(){h.one(n=>n.type==='form').props.onSubmit({preventDefault(){}})},
    request(){return h.one(n=>Object.hasOwn(n.props,'data-coaching-request'))},
    submit(){return nodes(h.request()).find(n=>n.type==='button')},
    consent(){return nodes(h.request()).find(n=>n.type==='input'&&n.props.type==='checkbox')},
    receipt(){return h.one(n=>Object.hasOwn(n.props,'data-coaching-enquiry-saved'))},
    async fillRequired(){for(const field of intakeModel.COACHING_FIELDS.filter(f=>f.required))await h.change(h.one(n=>n.props.id==='coaching-field-'+field.id),'Synthetic answer: '+field.id)},
  };render();return h
}
async function stagedStart(locale='en',options={}){
  const h=harness({locale,...options});await h.settle()
  assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);assert.equal(h.navigation.length,0)
  assert.equal(text(h.one(n=>n.props.className==='privacy')),privacy[locale],'Exact local-staging disclosure, no claim of remote save')
  const field=complete=>h.one(n=>n.type==='input'&&n.props.autoComplete===complete)
  assert.equal(field('email').props.required,true,'Contact visibly required')
  await h.change(field('name'),' Synthetic visitor ')
  await h.change(field('email'),' synthetic@example.test ')
  await h.change(h.one(n=>n.type==='select'),'career')
  await h.change(h.one(n=>n.type==='textarea'),' Synthetic private question ')
  h.submitStart();await h.settle()
  assert.deepEqual(h.navigation,['/'+locale+'/coaching/intake'],'Actual localized intake route; no private query data')
  assert.equal(h.calls.length,0,'Pre-intake never sends a CRM request')
  if(!options.storageBlocked){
    assert.equal(h.writes.length,1,'One explicitly local staged record')
    assert.equal(h.writes[0].key,diagnostic.DIAGNOSTIC_START_KEY,'Exact existing staging key')
    const payload=JSON.parse(h.writes[0].value)
    assert.deepEqual(Object.keys(payload).sort(),['createdAt','email','locale','name','phone','question','topic'],'Only existing intended fields, no invented consent/receipt')
    assert.equal(payload.locale,locale);assert.equal(payload.name,'Synthetic visitor');assert.equal(payload.email,'synthetic@example.test');assert.equal(payload.phone,'');assert.equal(payload.question,'Synthetic private question');assert.equal(payload.topic,'career')
    assert.ok(Number.isFinite(payload.createdAt))
  }
  assert.equal(h.receipt(),undefined,'Local staging is not a saved CRM receipt')
  return h
}
async function assertDiagnosticSubmission({locale='en',source}={}){
  const start=await stagedStart(locale),h=harness({locale,kind:'intake',storage:start.storage,source});await h.settle()
  assert.equal(h.auth.length,1);assert.equal(h.calls.length,0,'Hydrating staged record is not submission')
  assert.equal(h.one(n=>n.type==='input'&&n.props.type==='email').props.value,'synthetic@example.test','Intake restores staged contact')
  assert.equal(h.one(n=>n.props.id==='coaching-field-request').props.value,'Synthetic private question','Intake restores staged question')
  assert.equal(h.consent().props.checked,false,'Sending all completed answers requires fresh explicit consent')
  assert.equal(text(h.one(n=>n.props.className==='sendConsent')),consentText[locale],'Actual consent covers answers/contact delivery and no marketing')
  assert.equal(h.submit().props.disabled,true)
  h.submit().props.onClick();await h.settle();assert.equal(h.calls.length,0,'Handler also rejects missing answers/consent')
  await h.fillRequired();h.submit().props.onClick();await h.settle();assert.equal(h.calls.length,0,'Completed answers alone do not authorize delivery')
  await h.change(h.consent(),true)
  const d=deferred();h.queue.push(()=>d.promise);h.submit().props.onClick();await h.settle()
  assert.equal(h.calls.length,1,'Only explicit final submit makes one diagnostic request')
  assert.equal(h.receipt(),undefined,'No receipt before server confirmation')
  assert.ok(h.storage.has(diagnostic.DIAGNOSTIC_START_KEY),'Retain staged details while save unconfirmed')
  assert.equal(h.submit().props.disabled,true,'Pending submit stays locked')
  const body=JSON.parse(h.calls[0].body)
  assert.equal(body.locale,locale);assert.equal(body.offer,'free','Default review is free, not paid');assert.equal(body.topic,'career')
  assert.equal(body.contactConsent,true);assert.equal(body.contact.email,'synthetic@example.test')
  const validated=diagnostic.buildCoachingDiagnosticEnquiry(body)
  assert.equal(validated.serviceTitle,'Free Express Coaching Diagnostic · written review');assert.equal(validated.sourcePath,'/'+locale+'/coaching/intake')
  d.resolve(response(200,{saved:false,referenceCode:reference}));await h.settle()
  assert.equal(h.receipt(),undefined,'saved:false never becomes receipt')
  assert.ok(h.storage.has(diagnostic.DIAGNOSTIC_START_KEY),'Failed response does not erase staging')
  h.queue.push(()=>response(201,{saved:true,referenceCode:reference}));h.submit().props.onClick();await h.settle()
  assert.equal(h.calls[0].body,h.calls[1].body,'Uncertain result retries exact payload and operation ID')
  assert.ok(text(h.receipt()).includes(reference),'Only actual saved reference becomes receipt')
  assert.ok(text(h.receipt()).includes(receiptLimit[locale]),'Receipt does not claim booking, payment or guaranteed availability')
  assert.equal(h.storage.has(diagnostic.DIAGNOSTIC_START_KEY),false,'Confirmed receipt clears only staging')
  assert.deepEqual(h.navigation,[],'No automatic messenger/payment navigation')
  assert.equal(h.submit(),undefined,'Confirmed request is not immediately resubmittable')
  return h
}
for(const locale of ['en','ru','es']){
  test(locale+': actual free entry composes exact three offers and independent DAO',()=>assertCurrentFreeEntry({locale}))
  test(locale+': situation stages locally then submits only completed consented questionnaire and confirms receipt',()=>assertDiagnosticSubmission({locale}))
}
test('pre-intake rejects invalid contact and allows blocked storage without fake save',async()=>{
  for(const value of ['','not-email','123','+1234567890123456']){
    const h=harness();await h.change(h.one(n=>n.type==='input'&&n.props.required),value);h.submitStart();await h.settle()
    assert.equal(h.writes.length,0);assert.equal(h.navigation.length,0);assert.equal(h.calls.length,0);assert.ok(h.one(n=>n.props.role==='alert'))
  }
  await stagedStart('en',{storageBlocked:true})
})
test('staged hydration respects existing locale and 30-minute expiry policy',async()=>{
  const start=await stagedStart('en'),raw=JSON.parse(start.writes[0].value)
  for(const invalid of [{...raw,locale:'ru'},{...raw,createdAt:Date.now()-31*60*1000},{...raw,createdAt:Date.now()+60000}]){
    const h=harness({kind:'intake',storage:new Map([[diagnostic.DIAGNOSTIC_START_KEY,JSON.stringify(invalid)]])});await h.settle()
    assert.equal(h.one(n=>n.type==='input'&&n.props.type==='email').props.value,'');assert.equal(h.calls.length,0)
  }
})
test('intake route actually mounts the matching localized questionnaire',async()=>{
  const Form=()=>{throw Error('Actual questionnaire is executed separately above')}
  const {default:Page}=sourceModule(read('app/[locale]/coaching/intake/page.tsx'),'page.tsx',{
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'next/link':{default:'a'},'next/navigation':{notFound:denied},'lucide-react':icons,
    '@/components/public-site-header':{PublicSiteHeader:'header'},'@/components/coaching-intake-form':{CoachingIntakeForm:Form},
    '@/data/academy/catalog':{isPublicLocale:locale=>['en','ru','es'].includes(locale)},'@/data/site-metadata':{metadataBaseFor:()=>new URL('https://synthetic.invalid')},'../coaching-page.module.css':css,
  })
  for(const locale of ['en','ru','es']){const forms=nodes(await Page({params:Promise.resolve({locale})})).filter(n=>n.type===Form);assert.equal(forms.length,1);assert.equal(forms[0].props.locale,locale)}
})
for(const [name,before,after,reason] of [
  ['missing selector','<FreeDiagnosisOffers locale={locale} />','<div />',/visible three-offer/],
  ['hidden selector','<FreeDiagnosisOffers locale={locale} />','<div hidden><FreeDiagnosisOffers locale={locale} /></div>',/visible three-offer/],
  ['wrong selector locale','<FreeDiagnosisOffers locale={locale} />','<FreeDiagnosisOffers locale="ru" />',/Offers keep selected locale/],
])test('landing rejects '+name,()=>{const source=read('components/free-entry-landing.tsx');assert.ok(source.includes(before));assert.throws(()=>assertCurrentFreeEntry({source:source.replace(before,after)}),reason)})
for(const [name,before,after,reason] of [
  ['wrong free price','price: "FREE"','price: "€50"',/Free versus exact/],
  ['wrong paid price','price: "30 MIN · €50"','price: "60 MIN · €100"',/Free versus exact/],
  ['wrong DAO route','moreHref: "/services/dao-health-profile"','moreHref: "/services/wrong"',/Details preserves actual/],
  ['wrong form target','href="#request-free-review"','href="#wrong"',/Order reaches/],
  ['wrong selected offer','setSelected(offer.id)','setSelected("wu-xing-free")',/Order selects matching/],
  ['open Details','<details className={styles.details}>','<details open className={styles.details}>',/initially closed/],
  ['hidden cards','<article className={styles.card}','<article hidden className={styles.card}',/three visible intended/],
  ['missing pre-intake','<FreeDiagnosticStart locale={locale} />','<div />',/real pre-intake/],
  ['wrong downstream locale','<FreeDiagnosticStart locale={locale} />','<FreeDiagnosticStart locale="ru" />',/Downstream enquiry receives/],
  ['wrong paid format','selectedFormatValue={selected}','selectedFormatValue="wu-xing-free"',/Controlled capture selection/],
  ['missing full limitations','disclaimer={t.safety}','disclaimer="Safe"',/complete actual limitations/],
  ['invisible limitations','<p className={styles.safety}>','<p hidden className={styles.safety}>',/Visible symbolic/],
])test('offer contract rejects '+name,()=>{const source=read('components/free-diagnosis-offers.tsx');assert.ok(source.includes(before));assert.throws(()=>assertCurrentDiagnosisOffers({source:source.replace(before,after)}),reason)})
for(const [name,before,after,reason] of [
  ['wrong destination','"/" + locale + "/coaching/intake"','"/" + locale + "/checkout"',/Actual localized intake route/],
  ['wrong staging key','sessionStorage.setItem(DIAGNOSTIC_START_KEY','sessionStorage.setItem("wrong-key"',/Exact existing staging key/],
  ['missing local disclosure','{t.privacy}','{"Already sent"}',/Exact local-staging disclosure/],
])test('pre-intake contract rejects '+name,async()=>{const source=read('components/free-diagnostic-start.tsx');assert.ok(source.includes(before));await assert.rejects(stagedStart('en',{source:source.replace(before,after)}),reason)})
for(const [name,before,after,reason] of [
  ['prechecked send consent','[sendConsent, setSendConsent] = useState(false)','[sendConsent, setSendConsent] = useState(true)',/fresh explicit consent/],
  ['wrong default service','useState<"free" | "short" | "full">("free")','useState<"free" | "short" | "full">("short")',/Default review is free/],
  ['unconfirmed receipt','result?.saved !== true','false',/saved:false never becomes receipt/],
  ['new request on retry','if (!leadAttempt.current) {','if (true) {',/exact payload and operation ID/],
  ['missing consent explanation','<span>{t.sendConsent}</span>','<span>Continue</span>',/Actual consent covers/],
  ['false booking receipt','<p>{t.sendNext}</p>','<p>Appointment confirmed</p>',/Receipt does not claim/],
])test('downstream contract rejects '+name,async()=>{const source=read('components/coaching-intake-form.tsx');assert.ok(source.includes(before));await assert.rejects(assertDiagnosticSubmission({source:source.replace(before,after)}),reason)})
