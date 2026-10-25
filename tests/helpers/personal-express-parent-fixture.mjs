// Executes actual FreeEntryLanding, PersonalExpressEnquiry, chooser and PhoneCountryInput.
// Header/video/testimonial leaf markers are explicit; no fake parent. Synthetic
// hooks/DOM refs only: proves handler/effect/key lifecycles, not browser layout.
import assert from 'node:assert/strict'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import * as videoModel from '../../lib/site-videos/model.js'
import {environment as contactEnvironment, readContactSource as read, whatsapp, organic, paid, input, receipt, phoneCountry} from './contact-component-fixture.mjs'
export {read, receipt}
export const reference = 'HH-F4E3D2C1B0A9'
export const success = () => ({ok:true,status:201,json:async()=>({saved:true,referenceCode:reference})})
export const unknown = () => ({ok:false,status:503,json:async()=>({saved:false})})
export const deferred = () => {let resolve;const promise=new Promise(done=>resolve=done);return {resolve,promise}}
export async function turn(f) {await new Promise(resolve=>setImmediate(resolve));f.flush()}
export function expressFixture({locale='en',pageSource=read('components/free-entry-landing.tsx'),parentSource=read('components/personal-express-enquiry.tsx'),chooserSource=read('components/contact-channel-chooser.tsx'),denyReceiptStorage=false,pathname='/'+locale+'/services/free-situation-review',hash='',standalone=false}={}) {
  const env=contactEnvironment(locale,{denyReceiptStorage,pathname}), instances=new Map(), listeners=new Map(), windowListeners=new Map(), focusCalls=[]
  class Element {constructor(id,path,props={}){this.id=id;this.path=path;this.props=props;this.connected=true} focus(){env.document.activeElement=this;focusCalls.push(this.id)} contains(node){return !!node?.path && node.path.startsWith(this.path)} closest(selector){return selector==='a[href="#request-free-review"]'&&this.props.href==='#request-free-review'?this:null} }
  env.document.activeElement=new Element('outside'); env.document.body.style.overflow='auto'
  env.document.addEventListener=(name,handler)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(handler)}
  env.document.removeEventListener=(name,handler)=>assert.ok(listeners.get(name)?.delete(handler),'Remove exact handler')
  env.document.dispatch=(name,event)=>{for(const handler of listeners.get(name)||[])handler(event)}
  env.window.location.hash=hash
  env.window.addEventListener=(name,handler)=>{if(!windowListeners.has(name))windowListeners.set(name,new Set());windowListeners.get(name).add(handler)}
  env.window.removeEventListener=(name,handler)=>assert.ok(windowListeners.get(name)?.delete(handler),'Remove exact window handler')
  let current, tree, dirty=true, effects=[], mounted=true, visited, nextId=0
  let props={locale,kind:'situation'}
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const slot=init=>{const i=current.index++;return current.slots[i]??=(init())}
  const hooks={
    useState(initial){const s=slot(()=>({value:typeof initial==='function'?initial():initial}));return [s.value,value=>{const next=typeof value==='function'?value(s.value):value;if(!Object.is(next,s.value)){s.value=next;dirty=true}}]},
    useRef(initial){return slot(()=>({current:initial}))},
    useId(){return slot(()=>({value:'diagnosis-'+(++nextId)})).value},
    useCallback(value,deps){const s=slot(()=>({}));if(!same(s.deps,deps)){s.value=value;s.deps=deps}return s.value},
    useEffect(effect,deps){const s=slot(()=>({}));if(!same(s.deps,deps)){s.deps=deps;effects.push(()=>{s.cleanup?.();s.cleanup=effect()})}},
  };hooks.useLayoutEffect=hooks.useEffect
  const element=(type,props,key)=>{assert.ok(type,'Actual JSX dependency exists');return {type,props:props||{},key}}
  const jsx={jsx:element,jsxs:element,Fragment:'fragment'}
  const css={default:new Proxy({},{get:(_,p)=>String(p)})}
  const icons=Object.fromEntries('ArrowLeft ArrowRight CheckCircle2 ChevronDown ExternalLink ShieldCheck Sparkles MessageCircle X Send ShoppingBag HeartPulse'.split(' ').map(name=>[name,'icon-'+name]))
  const imports={react:hooks,'react/jsx-runtime':jsx,'next/navigation':{usePathname:()=>env.window.location.pathname,useRouter:()=>env.router},
    'next/image':{default:'img'},'next/link':{default:'a'},'lucide-react':icons,
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'independent-compact-capture'},
    '@/components/free-drawing-intake':{FreeDrawingIntake:'private-intake-leaf'},
    '@/components/site-video-player':{SiteVideoPlayer:'video-leaf'},
    '@/components/personal-testimonials':{PersonalTestimonials:'testimonials-leaf'},
    '@/lib/site-videos/model':videoModel,
    '@/components/acquisition-event-link':{AcquisitionEventLink:({attributes,...p})=>element('a',{...p,...attributes})},'@/data/local-acquisition':{ACQUISITION_EVENTS:[]},
    '@/lib/public-analytics':{emitPublicAnalyticsEvent:()=>{throw Error('No diagnosis analytics expected')}},
    '@/lib/contact/phone-country':phoneCountry,'@/lib/whatsapp-enquiry':whatsapp,
    '@/lib/organic-event-referrals':organic,'@/lib/paid-ad-referrals':paid,
    '@/lib/practitioners/public-service-enquiry-input.mjs':input,'@/lib/practitioners/enquiry-receipt.mjs':receipt,
  }
  function compile(source,name) {
    const parsed=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
    assert.equal(parsed.parseDiagnostics.length,0,'Actual TSX parses')
    const module={exports:{}}
    const code=ts.transpileModule(source,{fileName:name,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    runInNewContext(code,{module,exports:module.exports,require:name=>{if(name.endsWith('.module.css'))return css;assert.ok(Object.hasOwn(imports,name),'Unexpected dependency '+name);return imports[name]},
      window:env.window,document:env.document,HTMLElement:Element,Element,fetch:env.fetch,crypto:env.window.crypto,URL,URLSearchParams,Date,
    },{filename:name,timeout:5000});return module.exports
  }
  imports['@/components/phone-country-input']=compile(read('components/phone-country-input.tsx'),'phone-country-input.tsx')
  imports['@/components/contact-channel-chooser']=compile(chooserSource,'contact-channel-chooser.tsx')
  imports['@/data/service-video-library']=compile(read('data/service-video-library.ts'),'service-video-library.ts')
  imports['@/components/free-situation-review-form']=compile(read('components/free-situation-review-form.tsx'),'free-situation-review-form.tsx')
  imports['@/components/personal-express-enquiry']=compile(parentSource,'personal-express-enquiry.tsx')
  const Parent=standalone?imports['@/components/personal-express-enquiry'].PersonalExpressEnquiry:compile(pageSource,'free-entry-landing.tsx').FreeEntryLanding
  function renderComponent(component,p,path) {
    visited.add(path);let entry=instances.get(path)
    if(!entry){entry={component,path,slots:[],index:0};instances.set(path,entry)}
    assert.equal(entry.component,component,'Stable keyed component identity')
    entry.index=0;const prev=current;current=entry;const result=component(p);current=prev;return renderNode(result,path+'.r')
  }
  const domRefs=new Map()
  function renderNode(node,path) {
    if(Array.isArray(node))return node.map((child,i)=>renderNode(child,path+'.'+i))
    if(!node||typeof node!=='object'||!('type'in node))return node
    path+=':'+String(node.key??'')
    if(typeof node.type==='function')return renderComponent(node.type,node.props,path)
    const result={...node,props:{...node.props,children:renderNode(node.props.children,path+'.c')}}
    if(!domRefs.has(path))domRefs.set(path,new Element(node.props.id||(Object.hasOwn(node.props,'data-express-reveal')?'express-reveal':null)||node.props['aria-label']||node.type,path,node.props))
    result.element=domRefs.get(path)
    result.element.scrollIntoView=()=>{}
    if(result.props.ref)result.props.ref.current=result.element
    return result
  }
  function flush() {
    for(let i=0;dirty&&mounted;i++){
      assert.ok(i<30,'No render loop');dirty=false;effects=[];visited=new Set();tree=renderComponent(Parent,props,'parent')
      for(const [path,entry] of instances)if(!visited.has(path)){for(const s of entry.slots)s.cleanup?.();instances.delete(path)}
      for(const effect of effects)effect()
    }
  }
  function nodes() {const out=[];function walk(node,hidden=false){if(Array.isArray(node))return node.forEach(n=>walk(n,hidden));if(!node||typeof node!=='object'||!('type'in node))return;const invisible=hidden||!!node.props.hidden||node.props['data-open']==='false'||node.props['aria-hidden']===true||node.props['aria-hidden']==='true'||node.props.style?.display==='none'||node.props.style?.visibility==='hidden';out.push({...node,hidden:invisible});walk(node.props.children,invisible)}walk(tree);return out}
  const f={env,focusCalls,listeners,windowListeners,flush,nodes,get tree(){return tree},
    find(type,p=()=>true){const found=nodes().filter(n=>n.type===type&&p(n.props));assert.equal(found.length,1,'One actual '+type+' '+p);return found[0]},
    change(type,p,value){const node=f.find(type,p);node.props.onChange({target:{value,checked:value}});flush()},
    click(type,p){const node=f.find(type,p);node.element.focus();node.props.onClick();flush()},
    select(focus){f.change('input',p=>p.type==='radio'&&p.value===focus,true)},
    reveal(){f.click('button',p=>Object.hasOwn(p,'data-express-reveal'))},
    escape({inside=true}={}){if(inside)f.find('input',p=>p.type==='tel').element.focus();else env.document.activeElement=new Element('outside');env.document.dispatch('keydown',{key:'Escape'});flush()},
    hash(value){env.window.location.hash=value;for(const handler of windowListeners.get('hashchange')||[])handler();flush()},
    anchor(){const anchors=nodes().filter(n=>n.type==='a'&&n.props.href==='#request-free-review');assert.ok(anchors.length);env.document.dispatch('click',{target:anchors[0].element});flush()},
    phone(value){f.change('input',p=>p.type==='tel',value)},
    consent(value=true){f.change('input',p=>p.type==='checkbox',value)},
    send(channel='whatsapp'){f.click('button',p=>p['data-contact-channel-submit']===channel)},
    links(){return nodes().filter(n=>!n.hidden&&n.type==='a'&&n.props['data-contact-channel'])},
    update(next={}){props={...props,...next};dirty=true;flush()},
    unmount(){mounted=false;for(const entry of instances.values())for(const s of entry.slots)s.cleanup?.();instances.clear()},
  };flush();return f
}
