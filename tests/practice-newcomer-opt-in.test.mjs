import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source=readFileSync(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8')
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)]
const text=t=>t==null||typeof t==='boolean'?'':typeof t!=='object'?String(t):Array.isArray(t)?t.map(text).join(' '):text(t.props?.children)
const find=(tree,p)=>nodes(tree).find(p)
async function mount(data,{locale='en',search='',unauthorized=false}={}){
  const slots=[],effects=[],calls=[];let index=0,tree
  const hooks={useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useMemo(fn){index++;return fn()},useEffect(fn){const i=index++;if(!(i in slots)){slots[i]=true;effects.push(fn)}}}
  const stub=name=>Object.assign(()=>null,{displayName:name})
  const components=['crm-manager','practitioner-client-profiles','practice-materials','practice-events','practice-service-statistics','practice-requests-overview','public-enquiry-contact','my-services-dashboard','simple-service-editor','practice-photo-upload','practice-video-field']
  const modules={react:hooks,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'next/link':{default:stub('Link')},'next/image':{default:stub('Image')},'lucide-react':Object.fromEntries('Plus FileText Film IdCard UsersRound Leaf ReceiptText BarChart3 ChevronRight ClipboardList Share2 CheckCircle2 CalendarDays Megaphone BookOpen Headphones'.split(' ').map(n=>[n,stub(n)])), './practice-dashboard.css':{},'@/lib/practitioners/service-quota.js':{getHobbyServiceQuota:()=>({canAdd:true,used:0,limit:10})},'@/lib/practitioners/public-service-links.js':{getPublicServiceDetailHref:(locale,p,s)=>`/${locale}/services/${p}/${s}`}}
  for(const name of components)modules['./'+name]={default:stub(name)}
  const exports={};const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(output.diagnostics.length,0)
  vm.runInNewContext(output.outputText,{exports,require(name){assert.ok(Object.hasOwn(modules,name),'Unexpected import: '+name);return modules[name]},URL,URLSearchParams,window:{location:{search,href:'https://synthetic.invalid/en/app/practice'+search},history:{replaceState(){}}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},fetch:async(path,options)=>{calls.push({path,...options});assert.equal(options.method,'GET','No automatic writes');return {ok:!unauthorized,json:async()=>unauthorized?{error:'AUTH_REQUIRED'}:data}}})
  const render=()=>{index=0;return tree=exports.default({locale,ownerTools:{type:'synthetic-owner-tools',props:{}}})}
  render();for(const effect of effects.splice(0))effect();await new Promise(resolve=>setImmediate(resolve));render()
  return {get tree(){return tree},calls,render}
}
const fixture=(extra={})=>({practiceActivated:false,practitioner:null,services:[],requests:[],newServices:{recent:[{practitionerSlug:'synthetic-practitioner',slug:'introduction',titles:{en:'Synthetic public introduction'},pricingMode:'free',displayLocales:['en','es']}]},...extra})
const privateNames=['practice-requests-overview','practice-service-statistics','practice-materials','crm-manager']
function noPrivate(tree){assert.ok(!find(tree,n=>privateNames.includes(n.type?.displayName)));assert.ok(!find(tree,n=>n.props?.['data-practitioner-v4-dashboard']!==undefined));assert.ok(!find(tree,n=>n.props?.['data-practice-detail-panel']));assert.ok(!find(tree,n=>n.props?.className==='hh-practice-more-tools'));assert.ok(!find(tree,n=>n.props?.className==='hh-practice-setup'))}
test('newcomer sees public examples first and existing form only after deliberate Start, without writes',async()=>{
 const m=await mount(fixture(),{search:'?panel=materials'});noPrivate(m.tree);assert.match(text(m.tree),/Synthetic public introduction/);assert.ok(!find(m.tree,n=>n.props?.id==='hh-practice-onboarding'))
 const start=find(m.tree,n=>n.type==='button'&&text(n)==='Start my practice');assert.ok(start);start.props.onClick();m.render();noPrivate(m.tree)
 const form=find(m.tree,n=>n.type?.name==='MasterOnboarding');assert.ok(form);assert.equal(form.props.service,null);assert.equal(form.props.data.practiceActivated,false);assert.equal(m.calls.length,1);assert.equal(m.calls[0].method,'GET')
})
test('existing draft offers Continue and retains the current practitioner and free-service objects',async()=>{
 const p={status:'draft',revision:3,draftProfile:{displayName:'Synthetic practitioner'}},s={id:'synthetic-service',revision:2,pricingMode:'free'};const m=await mount(fixture({practitioner:p,services:[s]}));const b=find(m.tree,n=>n.type==='button'&&text(n)==='Continue registration');assert.ok(b);b.props.onClick();m.render();const form=find(m.tree,n=>n.type?.name==='MasterOnboarding');assert.equal(form.props.practitioner,p);assert.equal(form.props.service,s);noPrivate(m.tree);assert.equal(m.calls.length,1)
})
test('activated V4 keeps overview and single-panel deep links, without onboarding or automatic writes',async()=>{
 for(const search of ['', '?panel=materials', '?panel=services']){const m=await mount(fixture({practiceActivated:true,practitioner:{status:'approved',slug:'synthetic',profile:{displayName:'Synthetic'}}}),{search});assert.ok(!find(m.tree,n=>n.props?.className==='hh-practice-join'));assert.ok(!find(m.tree,n=>n.type?.name==='MasterOnboarding'));assert.ok(find(m.tree,n=>n.props?.['data-practitioner-v4-dashboard']!==undefined));assert.equal(Boolean(find(m.tree,n=>n.type?.displayName==='practice-requests-overview')),!search);assert.equal(Boolean(find(m.tree,n=>n.props?.['data-practice-detail-panel']===(search.includes('services')?'services':'materials'))),Boolean(search));assert.equal(Boolean(find(m.tree,n=>n.props?.className==='hh-practice-v4-community')),!search);assert.equal(m.calls.length,1)}
})
test('unauthenticated response exposes no form, public data or private tools and makes no writes',async()=>{const m=await mount(null,{unauthorized:true});noPrivate(m.tree);assert.ok(!find(m.tree,n=>n.type?.name==='MasterOnboarding'));assert.doesNotMatch(text(m.tree),/Synthetic public introduction/);assert.match(text(m.tree),/AUTH_REQUIRED/);assert.equal(m.calls.length,1)})
test('newcomer explicit action is localized in Russian and Spanish',async()=>{for(const [locale,label]of [['ru','Начать свою практику'],['es','Empezar mi práctica']]){const m=await mount(fixture(),{locale});assert.ok(find(m.tree,n=>n.type==='button'&&text(n)===label));noPrivate(m.tree);assert.equal(m.calls.length,1)}})

test('services deep link cannot bypass newcomer activation or explicit opt-in', async()=>{
 const m=await mount(fixture(),{search:'?panel=services'});noPrivate(m.tree)
 assert.ok(find(m.tree,n=>n.type==='button'&&text(n)==='Start my practice'))
 assert.ok(!find(m.tree,n=>n.type?.name==='MasterOnboarding'))
 assert.equal(m.calls.length,1)
})
