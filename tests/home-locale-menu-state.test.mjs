import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8')
const helper=source.match(/async function chooseHomeLocale\(page, locale\) \{[\s\S]*?\n\}/)?.[0]
assert.ok(helper)
for(const initialOpen of [false,true])test('language selection respects restored native menu open='+initialOpen,async()=>{
 let open=initialOpen, toggles=0, clicks=0
 const trigger={async click(){toggles++;open=!open}}
 const link={async click(){assert.equal(open,true);clicks++}}
 const menu={async evaluate(fn){return fn({open})},locator(selector){return selector==='.site-language-menu-trigger'?trigger:link}}
 const page={locator(selector){assert.equal(selector,'.site-language-menu');return menu}}
 const expect=target=>({async toHaveCount(n){assert.equal(n,1)},async toHaveAttribute(name,value){if(target===menu){assert.equal(name,'open');assert.equal(open,true)}else{assert.equal(name,'href');assert.equal(value,'/')}}})
 const run=new Function('expect','homePath',helper+';return chooseHomeLocale')(expect,locale=>locale==='en'?'/':'/ru')
 await run(page,'en');assert.equal(toggles,initialOpen?0:1);assert.equal(clicks,1)
})

// Run the actual component's refs/effects with controlled commit ordering. This
// checks the native-open state contract, not a claim about browser scheduling.
const navigationSource=readFileSync(new URL('../components/site-navigation.tsx',import.meta.url),'utf8')
const navigationFile=ts.createSourceFile('site-navigation.tsx',navigationSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const component=navigationFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='SiteNavigation')
assert.ok(component?.body)
const hookStatements=component.body.statements.filter(node=>
 ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>
  ts.isCallExpression(declaration.initializer)&&declaration.initializer.expression.getText(navigationFile)==='useRef')
 ||ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(navigationFile)==='useEffect')
const compiledHooks=ts.transpileModule('function render(pathname,activeLocale,locale){'+
 hookStatements.map(node=>node.getText(navigationFile)).join('\n')+
 '\nreturn {languageRef,siteMenuRef}}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText

class MenuNode {
 constructor(parent=null){this.parent=parent;this.open=false;this.focused=false}
 contains(node){return node===this||Boolean(node.parent&&this.contains(node.parent))}
 querySelector(){return this.summary}
 focus(){this.focused=true}
}
function navigationHarness(){
 const refs=[],listeners=new Map(),language=new MenuNode(),sections=new MenuNode()
 language.summary=new MenuNode(language);sections.summary=new MenuNode(sections)
 let refIndex=0,effects=[],previous=[]
 const useRef=value=>{const index=refIndex++;return refs[index]??(refs[index]={current:value})}
 const useEffect=(callback,deps)=>effects.push({callback,deps})
 const document={addEventListener:(name,callback)=>listeners.set(name,callback),
  removeEventListener:(name,callback)=>{if(listeners.get(name)===callback)listeners.delete(name)}}
 const render=new Function('useRef','useEffect','document','Node','savePublicLocale','saveUiLocale',
  compiledHooks+';return render')(useRef,useEffect,document,MenuNode,()=>{},()=>{})
 const h={language,sections,listeners,
  render(pathname='/',locale='en'){
   refIndex=0;effects=[]
   const bindings=render(pathname,locale,locale)
   bindings.languageRef.current=language;bindings.siteMenuRef.current=sections
  },
  commit(){
   effects.forEach((effect,index)=>{
    const last=previous[index]
    if(!last||effect.deps.some((value,i)=>!Object.is(value,last.deps[i]))){
     last?.cleanup?.();effect.cleanup=effect.callback();previous[index]=effect
    }
   })
  },
  replay(){previous.forEach(effect=>{effect.cleanup?.();effect.cleanup=effect.callback()})},
  unmount(){previous.forEach(effect=>effect.cleanup?.())},
  open(){language.open=true;sections.open=true},
  dispatch(name,target){listeners.get(name)?.({target})},
 }
 h.render();return h
}

test('initial effects preserve native menus opened before the first commit',()=>{
 const h=navigationHarness();h.open();h.commit()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
test('unchanged effect replay preserves native open state',()=>{
 const h=navigationHarness();h.commit();h.open();h.replay()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
for(const [label,path,locale] of [['route','/ru','en'],['locale','/','ru']])test(label+' changes still close both menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.render(path,locale);h.commit()
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false);h.unmount()
})
test('unchanged navigation rerender preserves native menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.render();h.commit()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
for(const event of ['pointerdown','focusin'])test('outside '+event+' still dismisses both menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.dispatch(event,new MenuNode())
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false);h.unmount()
})
test('inside pointer keeps the selected menu open and dismisses the other menu',()=>{
 const h=navigationHarness();h.commit();h.open();h.dispatch('pointerdown',h.language.summary)
 assert.equal(h.language.open,true);assert.equal(h.sections.open,false);h.unmount()
})
test('Escape closes both menus and restores the open menu trigger focus',()=>{
 const h=navigationHarness();h.commit();h.open();let prevented=false
 h.listeners.get('keydown')({key:'Escape',preventDefault(){prevented=true}})
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false)
 assert.equal(h.language.summary.focused,true);assert.equal(prevented,true);h.unmount()
})
test('unmount removes all dismissal listeners',()=>{
 const h=navigationHarness();h.commit();assert.equal(h.listeners.size,3)
 h.unmount();assert.equal(h.listeners.size,0)
})

// Execute the actual nested browser observer, not a model of its decisions.
const verifierFile=ts.createSourceFile('verify-home-locale-switch.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
let observerFunction
function findObserver(node){
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='installHomeLocaleObservation')observerFunction=node
 ts.forEachChild(node,findObserver)
}
findObserver(verifierFile);assert.ok(observerFunction)
const observerSource=observerFunction.getText(verifierFile)
class ProbeElement {
 constructor(kind,parent=null){this.kind=kind;this.parent=parent;this.isConnected=true;this.open=false}
 matches(selector){return ({'details.site-language-menu':'menu','summary.site-language-menu-trigger':'summary',
  'details.site-language-menu a[lang]':'locale-link','button.site-video-play':'source-video-play',
  'iframe.site-video-iframe':'source-video-iframe','[data-video-slot="home-intro"]':'intro'})[selector]===this.kind}
 closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null}
}
function observationHarness({registrationFailure=0,observeFailure=false,disconnectFailure=false,recordFailure=false,subframe=false}={}){
 const records=[],pending=[],observers=[],listeners=[];let registrations=0,queries=0
 const document={querySelector(selector){assert.equal(selector,'details.site-language-menu');queries++;return h.menu}}
 const window={};window.top=subframe?{}:window
 for(const target of [document,window]){
  target.addEventListener=(type,callback,options)=>{
   if(typeof options==='object'){assert.equal(options.passive,true);assert.equal(typeof options.capture,'boolean')}
   listeners.push({target,type,callback,capture:typeof options==='object'?options.capture:Boolean(options)});registrations++
   if(registrations===registrationFailure)throw new Error('synthetic registration failure')
  }
  target.removeEventListener=(type,callback,capture)=>{
   const index=listeners.findIndex(row=>row.target===target&&row.type===type&&row.callback===callback&&row.capture===capture)
   if(index>=0)listeners.splice(index,1)
  }
 }
 class Observer{
  constructor(callback){this.callback=callback;this.entries=[];this.disconnected=false;observers.push(this)}
  observe(target,options){assert.deepEqual(options,{attributes:true,attributeFilter:['open'],attributeOldValue:true});this.target=target;if(observeFailure)throw new Error('synthetic observe failure');this.disconnected=false}
  takeRecords(){return this.entries.splice(0)}
  disconnect(){this.disconnected=true;if(disconnectFailure)throw new Error('synthetic disconnect failure')}
 }
 const run=new Function('document','window','Element','MutationObserver','queueMicrotask',observerSource+';return installHomeLocaleObservation;')(
  document,window,ProbeElement,Observer,callback=>pending.push(callback))
 const menu=new ProbeElement('menu'),summary=new ProbeElement('summary',menu),link=new ProbeElement('locale-link',menu)
 const intro=new ProbeElement('intro'),play=new ProbeElement('source-video-play',intro),iframe=new ProbeElement('source-video-iframe',intro),other=new ProbeElement('other')
 const h={menu,summary,link,play,iframe,other,records,listeners,observers,pending,
  environment:{document,window,Element:ProbeElement,MutationObserver:Observer,queueMicrotask:callback=>pending.push(callback)},
  queryCount:()=>queries,
  event(type,target,{capture=true,prevented=false,trusted=true,windowEvent=false}={}){
   const event={type,target,defaultPrevented:prevented,isTrusted:trusted}
   for(const row of [...listeners])if(row.target===(windowEvent?window:document)&&row.type===type&&row.capture===capture)row.callback(event)
  },
  activate(){h.event('pointerdown',play)},
  mutation(oldOpen,target=h.menu){observers.at(-1).entries.push({type:'attributes',attributeName:'open',target,oldValue:oldOpen?'':null})},
  deliver(){const observer=observers.at(-1);observer.callback(observer.takeRecords())},
  flush(){while(pending.length)pending.shift()()},
 }
 h.finish=run((type,details)=>{assert.equal(type,'home-locale-observation');if(recordFailure)throw new Error('synthetic record failure');records.push(details)})
 return h
}
test('passive observation stays dormant until the source video activation',()=>{
 const h=observationHarness();h.event('pointerdown',h.summary);h.event('focusin',h.other)
 assert.equal(h.records.length,0);assert.equal(h.queryCount(),0);assert.equal(h.observers.length,0)
 h.activate();assert.equal(h.records[0].kind,'pointerdown-capture');assert.equal(h.records[0].target,'source-video-play')
 assert.equal(h.observers.length,1);h.finish();assert.equal(h.listeners.length,0)
})
test('passive observation separates pre-default click from coalescible toggle and mutation snapshots',()=>{
 const h=observationHarness();h.activate();h.event('pointerdown',h.summary)
 h.event('pointerup',h.summary);h.event('click',h.summary);h.event('click',h.summary,{capture:false,prevented:true})
 assert.equal(h.records.at(-2).open,false);assert.equal(h.records.at(-2).kind,'click-capture')
 assert.equal(h.records.at(-1).kind,'click-bubble');assert.equal(h.records.at(-1).prevented,true)
 h.menu.open=true;h.mutation(false);h.event('toggle',h.menu);h.deliver()
 const toggle=h.records.find(row=>row.kind==='native-toggle-coalescible');assert.equal(toggle.open,true)
 const mutation=h.records.find(row=>row.kind==='open-mutation-delivered');assert.equal(mutation.oldOpen,false);assert.equal(mutation.openAtDelivery,true)
 assert.equal('newOpen' in mutation,false);assert.equal(h.menu.open,true);h.finish()
})
test('passive observation records iframe versus other focus without causing dismissal',()=>{
 const h=observationHarness();h.activate();h.menu.open=true
 h.event('focusout',h.summary);h.event('focusin',h.iframe);h.event('focusin',h.other)
 assert.deepEqual(h.records.slice(-3).map(row=>[row.kind,row.target,row.open]),[
  ['focusout-capture','summary',true],['focusin-capture','source-video-iframe',true],['focusin-capture','other',true]])
 assert.equal(h.records.at(-1).targetId,null);assert.equal(h.menu.open,true);h.finish()
})
test('passive observation preserves multiple old-open records rather than inventing intermediate snapshots',()=>{
 const h=observationHarness();h.activate();h.mutation(false);h.mutation(true);h.menu.open=false;h.deliver()
 const mutations=h.records.filter(row=>row.kind==='open-mutation-delivered')
 assert.deepEqual(mutations.map(row=>[row.oldOpen,row.openAtDelivery]),[[false,false],[true,false]])
 h.finish()
})
test('passive observation reports a replaced connected node without watching document mutations',()=>{
 const h=observationHarness();h.activate();const old=h.menu,oldId=h.records[0].menuId
 old.isConnected=false;h.menu=new ProbeElement('menu');const nextSummary=new ProbeElement('summary',h.menu)
 h.event('pointerdown',nextSummary)
 const row=h.records.at(-1);assert.notEqual(row.menuId,oldId);assert.equal(row.priorMenuId,oldId)
 assert.equal(row.priorConnected,false);assert.equal(row.connected,true);assert.equal(h.observers[0].target,h.menu);h.finish()
})
test('passive observation drains queued mutations and cleans up at locale-link dispatch',()=>{
 const h=observationHarness();h.activate();h.menu.open=true;h.event('click',h.link)
 assert.equal(h.pending.length,1);assert.notEqual(h.listeners.length,0)
 h.menu.open=false;h.mutation(true);h.event('click',h.link,{capture:false});h.flush()
 assert.equal(h.records.at(-2).kind,'open-mutation-delivered');assert.equal(h.records.at(-2).oldOpen,true)
 assert.equal(h.records.at(-1).reason,'locale-link-capture-checkpoint');assert.equal(h.listeners.length,0);assert.equal(h.observers[0].disconnected,true)
 const count=h.records.length;h.event('focusin',h.other);h.finish();assert.equal(h.records.length,count)
})
for(const reason of ['pagehide','case-cleanup'])test('passive observation cleanup '+reason+' is idempotent and observational',()=>{
 const h=observationHarness();h.activate();h.menu.open=true
 if(reason==='pagehide')h.event('pagehide',h.other,{windowEvent:true});else h.finish()
 assert.equal(h.records.at(-1).reason,reason);assert.equal(h.listeners.length,0);assert.equal(h.observers[0].disconnected,true)
 const count=h.records.length;h.finish();assert.equal(h.records.length,count);assert.equal(h.menu.open,true)
})
test('passive observation caps the entire stream including its terminal row and stops reads',()=>{
 const h=observationHarness();h.activate();for(let i=0;i<200;i++)h.event('focusin',h.other)
 assert.equal(h.records.length,64);assert.equal(h.records.at(-1).reason,'cap');assert.equal(h.records.at(-1).count,64)
 assert.equal(h.listeners.length,0);assert.equal(h.observers[0].disconnected,true)
 const queries=h.queryCount();h.event('focusin',h.other);h.finish();assert.equal(h.queryCount(),queries);assert.equal(h.records.length,64)
})
test('passive observation cleans up partial registration failure without escaping',()=>{
 const h=observationHarness({registrationFailure:4});assert.equal(h.listeners.length,0)
 assert.equal(h.records.at(-1).reason,'observation-error');h.finish();assert.equal(h.records.length,1)
})
test('passive observation cleans up failed observer installation and tolerates recording failures',()=>{
 const h=observationHarness({observeFailure:true});assert.doesNotThrow(()=>h.activate())
 assert.equal(h.listeners.length,0);assert.equal(h.observers[0].disconnected,true);assert.equal(h.records.at(-1).reason,'observation-error')
 const throwing=observationHarness({recordFailure:true});assert.doesNotThrow(()=>{throwing.activate();throwing.finish()});assert.equal(throwing.listeners.length,0)
})
test('passive observation cleanup errors stay diagnostic, never an acceptance failure',()=>{
 const h=observationHarness({disconnectFailure:true});h.activate();assert.doesNotThrow(()=>h.finish())
 assert.equal(h.records.at(-1).cleanupError,true);assert.equal(h.listeners.length,0)
})
test('passive observation emits only bounded fixed-category structural data',()=>{
 const h=observationHarness();h.activate();h.event('focusin',h.iframe);h.event('focusin',h.other);h.finish()
 const allowed=new Set(['kind','menuId','connected','open','priorMenuId','priorConnected','target','targetId','targetConnected','trusted','prevented','reason','count','cleanupError','oldOpen','openAtDelivery'])
 for(const row of h.records)for(const key of Object.keys(row))assert.ok(allowed.has(key),key)
 assert.doesNotMatch(observerSource,/\b(?:setTimeout|setInterval|requestAnimationFrame|fetch)\s*\(|\.(?:focus|click|preventDefault|stopPropagation|stopImmediatePropagation)\s*\(|\b(?:textContent|innerHTML|outerHTML|location|href|value)\b|\.open\s*=/)
 assert.match(source,/items\.push\(type === 'home-locale-observation'\s*\? \{ type, time: Date\.now\(\), probe, \.\.\.details \}/)
 assert.match(source,/const lifecycle = await page\.evaluate\(\(\{ key, localeObservationOwner \}\) =>/)
 assert.match(source,/disposeLocaleObservation = installHomeLocaleObservation\(record\)/)
 assert.match(source,/Object\.defineProperty\(window, cleanupKey, \{ value: ownedCleanup, writable: false, configurable: false \}\)/)
})
let cleanupConsumer
function findCleanupConsumer(node){
 if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='evaluate'
  &&node.arguments[0]?.getText(verifierFile).includes("':locale-owner'"))cleanupConsumer=node.arguments[0]
 ts.forEachChild(node,findCleanupConsumer)
}
findCleanupConsumer(verifierFile);assert.ok(cleanupConsumer)
test('actual init-recorder consumer installs the observer, strips new-row URLs and exposes final cleanup',()=>{
 let initCallback
 function findInit(node){
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='addInitScript')initCallback=node.arguments[0]
  ts.forEachChild(node,findInit)
 }
 findInit(verifierFile);assert.ok(initCallback)
 const h=observationHarness();h.finish()
 const storage=new Map(),environment={...h.environment,
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  history:{state:null,pushState(){},replaceState(){}},location:{href:'https://invalid.test/PRIVATE?q=SECRET'}}
 environment.document.readyState='loading'
 const init=new Function(...Object.keys(environment),'return ('+initCallback.getText(verifierFile)+');')(...Object.values(environment))
 init({key:'probe',localeObservationOwner:'fixture-owner'});assert.equal(typeof environment.window['probe:locale-cleanup'].dispose,'function')
 const installedCount=h.listeners.length;h.activate();h.event('click',h.summary)
 const collect=new Function('window','sessionStorage','return ('+cleanupConsumer.getText(verifierFile)+');')(environment.window,environment.sessionStorage)
 const collected=collect({key:'probe',localeObservationOwner:'fixture-owner'});assert.ok(Array.isArray(collected))
 assert.equal(h.listeners.length,installedCount-10);assert.equal(h.observers.at(-1).disconnected,true)
 const rows=JSON.parse(storage.get('probe')),observations=rows.filter(row=>row.type==='home-locale-observation')
 assert.ok(observations.length>=3);assert.equal(observations.at(-1).reason,'case-cleanup')
 assert.equal(rows.find(row=>row.type==='init').url,environment.location.href)
 for(const row of observations){assert.equal('url' in row,false);assert.equal(JSON.stringify(row).includes('SECRET'),false)}
})
test('actual final-recorder consumer retains original evidence if diagnostic cleanup throws',()=>{
 const original=[{type:'existing-evidence'}]
 const collect=new Function('window','sessionStorage','return ('+cleanupConsumer.getText(verifierFile)+');')(
  new Proxy({}, {getOwnPropertyDescriptor(){throw new Error('synthetic cleanup failure')}}),{getItem:()=>JSON.stringify(original)})
 assert.deepEqual(collect({key:'probe',localeObservationOwner:'fixture-owner'}),original)
})
test('passive observation terminal reasons cannot carry arbitrary caller data',()=>{
 const h=observationHarness();h.activate();h.finish('PRIVATE-SYNTHETIC')
 assert.equal(h.records.at(-1).reason,'observation-error');assert.equal(JSON.stringify(h.records).includes('PRIVATE-SYNTHETIC'),false)
})
test('actual init-recorder consumer cleans listeners if its cleanup slot cannot be installed',()=>{
 let initCallback
 function findInit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='addInitScript')initCallback=node.arguments[0];ts.forEachChild(node,findInit)}
 findInit(verifierFile)
 const h=observationHarness();h.finish();const storage=new Map()
 const environment={...h.environment,sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  history:{state:null,pushState(){},replaceState(){}},location:{href:'https://invalid.test/'}}
 Object.defineProperty(environment.window,'probe:locale-cleanup',{set(){throw new Error('synthetic readonly slot')}})
 const init=new Function(...Object.keys(environment),'return ('+initCallback.getText(verifierFile)+');')(...Object.values(environment))
 assert.doesNotThrow(()=>init({key:'probe',localeObservationOwner:'fixture-owner'}))
 assert.equal(h.listeners.filter(row=>['pointerdown','pointerup','focusin','focusout','toggle'].includes(row.type)).length,0)
 const observations=JSON.parse(storage.get('probe')).filter(row=>row.type==='home-locale-observation')
 assert.equal(observations.length,0);assert.equal(h.observers.length,0)
})
test('passive observation does not instrument cross-origin or other subframes',()=>{
 const h=observationHarness({subframe:true});h.activate();h.finish()
 assert.equal(h.listeners.length,0);assert.equal(h.observers.length,0);assert.equal(h.records.length,0);assert.equal(h.queryCount(),0)
})

function initEnvironment(){
 let initCallback
 function findInit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='addInitScript')initCallback=node.arguments[0];ts.forEachChild(node,findInit)}
 findInit(verifierFile)
 const h=observationHarness();h.finish();const storage=new Map()
 const environment={...h.environment,sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  history:{state:null,pushState(){},replaceState(){}},location:{href:'https://invalid.test/PRIVATE'}}
 const rawInit=new Function(...Object.keys(environment),'return ('+initCallback.getText(verifierFile)+');')(...Object.values(environment))
 const rawCollect=new Function('window','sessionStorage','return ('+cleanupConsumer.getText(verifierFile)+');')(environment.window,environment.sessionStorage)
 const init=options=>rawInit({...options,localeObservationOwner:'fixture-owner'})
 const collect=key=>rawCollect(typeof key==='string'?{key,localeObservationOwner:'fixture-owner'}:key)
 const diagnosticCount=()=>h.listeners.filter(row=>['pointerdown','pointerup','focusin','focusout','toggle'].includes(row.type)).length
 return {h,environment,storage,init,collect,diagnosticCount}
}
test('review collision: a nonwritable cleanup slot must not orphan diagnostic listeners',()=>{
 const x=initEnvironment();Object.defineProperty(x.environment.window,'probe:locale-cleanup',{value:null,writable:false,configurable:false})
 x.init({key:'probe'});x.h.activate();x.collect('probe')
 assert.equal(x.diagnosticCount(),0,'NONWRITABLE_SLOT_ORPHANS_LISTENERS')
})
test('review collision: final collector must not execute an unrelated preexisting cleanup callback',()=>{
 const x=initEnvironment();let foreignCalls=0
 Object.defineProperty(x.environment.window,'probe:locale-cleanup',{value:()=>{foreignCalls++},writable:false,configurable:false})
 x.init({key:'probe'});x.collect('probe')
 assert.equal(foreignCalls,0,'FOREIGN_CLEANUP_EXECUTED')
})
test('review repeated init: all owned diagnostic registrations reach cleanup',()=>{
 const x=initEnvironment();x.init({key:'probe'});x.init({key:'probe'});x.h.activate();x.collect('probe')
 assert.equal(x.diagnosticCount(),0,'EARLIER_INIT_ORPHANED')
})
test('review checkpoint: capture cutoff is allowed to precede target and bubble',()=>{
 const h=observationHarness();h.activate();h.event('click',h.link);h.flush()
 h.menu.open=false;h.mutation(true);h.event('click',h.link,{capture:false})
 assert.equal(h.records.some(r=>r.kind==='click-bubble'),false)
 assert.equal(h.records.some(r=>r.kind==='open-mutation-delivered'),false)
 assert.equal(h.records.at(-1).reason,'locale-link-capture-checkpoint')
 assert.equal(h.listeners.length,0)
})
test('review storage: getter/setter/corrupt-data failures remain bounded and leave original evidence outcome unchanged',()=>{
 for(const mode of ['get','set','corrupt']){
  const x=initEnvironment()
  if(mode==='get')x.environment.sessionStorage.getItem=()=>{throw Error('storage unavailable')}
  if(mode==='set')x.environment.sessionStorage.setItem=()=>{throw Error('storage unavailable')}
  if(mode==='corrupt')x.storage.set('probe','{malformed')
  assert.doesNotThrow(()=>x.init({key:'probe'}));assert.doesNotThrow(()=>{x.h.activate();for(let i=0;i<200;i++)x.h.event('focusin',x.h.other)})
  assert.equal(x.diagnosticCount(),0)
  assert.equal(x.h.observers.at(-1).disconnected,true)
 }
})
test('review replacement: drain old disconnected node and observe current node without false new-open state',()=>{
 const h=observationHarness();h.activate();const old=h.menu,oldId=h.records[0].menuId
 h.mutation(true,old);old.isConnected=false;old.open=false;h.menu=new ProbeElement('menu')
 h.event('focusin',h.other)
 const mutation=h.records.find(row=>row.kind==='open-mutation-delivered')
 assert.deepEqual([mutation.menuId,mutation.connected,mutation.oldOpen,mutation.openAtDelivery],[oldId,false,true,false])
 assert.notEqual(h.records.at(-1).menuId,oldId);h.finish()
})
test('review reservation: reaching 63 rows reserves terminal slot; next relevant event finishes at 64',()=>{
 const h=observationHarness();h.activate();for(let i=0;i<62;i++)h.event('focusin',h.other)
 assert.equal(h.records.length,63);assert.equal(h.listeners.length,10)
 h.event('focusin',h.other);assert.equal(h.records.length,64);assert.equal(h.listeners.length,0)
})
test('review empty-menu: activating before node exists safely starts observation when it appears',()=>{
 const h=observationHarness();h.menu=null;h.activate();assert.equal(h.records[0].menuId,null)
 h.menu=new ProbeElement('menu');h.event('focusin',h.other);assert.equal(h.observers[0].target,h.menu);h.finish()
})
test('review reentrancy: cleanup called during mutation recording emits at most one terminal row within cap64',()=>{
 const x=initEnvironment();x.init({key:'probe'});x.h.activate()
 for(let i=0;i<61;i++)x.h.event('focusin',x.h.other)
 x.h.mutation(false);let reentered=false
 x.environment.sessionStorage.setItem=(key,value)=>{
  x.storage.set(key,value)
  const last=JSON.parse(value).at(-1)
  if(!reentered&&last.kind==='open-mutation-delivered'){reentered=true;x.collect('probe')}
 }
 x.collect('probe')
 const observations=JSON.parse(x.storage.get('probe')).filter(r=>r.type==='home-locale-observation')
 assert.equal(reentered,true)
 console.log('REVIEW_REENTRANCY_STATE='+JSON.stringify({rows:observations.length,stops:observations.filter(r=>r.kind==='stop').length,finalCount:observations.at(-1).count}))
 assert.equal(observations.filter(r=>r.kind==='stop').length,1,'REENTRANT_DOUBLE_STOP')
 assert.ok(observations.length<=64,'REENTRANT_CAP_OVERFLOW')
 assert.equal(x.diagnosticCount(),0)
})

test('review actual finally: diagnostic and storage exceptions cannot replace original acceptance or transport failure',async()=>{
 const start=source.indexOf('    delayedLocale = null;\n    releaseHeldRsc();')
 const end=source.indexOf('\n  }\n  if (caseFailure)',start);assert.ok(start>=0&&end>start)
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
 const run=new AsyncFunction('transport','page','context','browser','writeFile','prior',`
 let delayedLocale='en',phase='ru-to-en',caseFailure=prior;const cleanupErrors=[];const releaseHeldRsc=()=>{};
 const localeObservationOwner='fixture-owner',navigationTraceKey='probe',evidence='evidence',live=false,engine='fixture',width=390,navigationRequests=[],errors=[],serverLifecycle=[];
 ${source.slice(start,end)}
 if(caseFailure)throw caseFailure;
 `)
 for(const failure of ['cleanup','storage'])for(const transportFails of [false,true]){
  const x=initEnvironment();x.init({key:'probe'});x.h.activate()
  const prior=Error('original acceptance'),transportError=Error('original transport'),actions=[];let artifact
  if(failure==='cleanup')x.environment.window=new Proxy(x.environment.window,{getOwnPropertyDescriptor(){throw Error('synthetic diagnostic failure')}})
  else x.environment.sessionStorage.getItem=()=>{throw Error('synthetic storage failure')}
  const page={evaluate:async(fn,key)=>new Function('window','sessionStorage','return ('+fn.toString()+');')(x.environment.window,x.environment.sessionStorage)(key)}
  const transport={failure:transportFails?transportError:undefined,events:[],homeRscEvents:[],failures:[],dropped:0,drain:async()=>{actions.push('drain');throw Error('synthetic drain')}}
  await assert.rejects(run(transport,page,{close:async()=>{actions.push('context');throw Error('context')}},{close:async()=>{actions.push('browser');throw Error('browser')}},async(_,text)=>{actions.push('write');artifact=JSON.parse(text);throw Error('synthetic writer')},prior),e=>e===(transportFails?transportError:prior))
  assert.deepEqual(actions,['drain','context','browser','drain','write'])
  assert.deepEqual(artifact.cleanupErrors,['initial-drain-failed','context-close-failed','browser-close-failed','final-drain-failed'])
  x.h.event('pagehide',x.h.other,{windowEvent:true});assert.equal(x.diagnosticCount(),0)
 }
})
test('ownership bridge: a foreign proxy holder is never inspected without a matching primitive registration',()=>{
 for(const present of [false,true]){
  const x=initEnvironment();let inspected=0
  const foreign=new Proxy({}, {getOwnPropertyDescriptor(){inspected++;throw Error('foreign holder')}})
  Object.defineProperty(x.environment.window,'probe:locale-cleanup',{value:foreign,writable:false,configurable:false})
  if(present)Object.defineProperty(x.environment.window,'probe:locale-owner',{value:'foreign-owner',writable:false,configurable:false})
  x.init({key:'probe'});x.collect('probe');assert.equal(inspected,0);assert.equal(x.diagnosticCount(),0)
 }
})
test('ownership bridge: inherited collision and accessor collision invoke no foreign code',()=>{
 for(const inherited of [false,true]){
  const x=initEnvironment();let calls=0;const target=inherited?{}:x.environment.window
  Object.defineProperty(target,'probe:locale-cleanup',{get(){calls++;throw Error('foreign getter')}})
  if(inherited)Object.setPrototypeOf(x.environment.window,target)
  x.init({key:'probe'});x.collect('probe');assert.equal(calls,0);assert.equal(x.diagnosticCount(),0)
 }
})
test('ownership bridge: wrong exercise owner cannot collect an owned observer',()=>{
 const x=initEnvironment();x.init({key:'probe'});x.h.activate()
 const raw=new Function('window','sessionStorage','return ('+cleanupConsumer.getText(verifierFile)+');')(x.environment.window,x.environment.sessionStorage)
 raw({key:'probe',localeObservationOwner:'different-owner'});assert.equal(x.diagnosticCount(),7)
 x.collect('probe');assert.equal(x.diagnosticCount(),0)
})
test('ownership bridge: repeat initialization retains one observer and never logs the owner',()=>{
 const x=initEnvironment();x.init({key:'probe'});x.init({key:'probe'});x.h.activate()
 assert.equal(x.h.observers.length,1);assert.equal(x.diagnosticCount(),7)
 x.collect('probe');assert.equal(x.diagnosticCount(),0)
 assert.equal(x.storage.get('probe').includes('fixture-owner'),false)
 const slot=Object.getOwnPropertyDescriptor(x.environment.window,'probe:locale-cleanup')
 const owner=Object.getOwnPropertyDescriptor(x.environment.window,'probe:locale-owner')
 assert.equal(slot.writable,false);assert.equal(slot.configurable,false);assert.equal(owner.value,'fixture-owner')
})
test('ownership bridge: explicit readback failure starts no owned listeners',()=>{
 // Inject only a false installation acknowledgement; the readback must reject it.
 const x=initEnvironment();let definitions=0
 const object=Object.create(Object)
 object.defineProperty=(target,key,descriptor)=>{definitions++;return key==='probe:locale-cleanup'?target:Object.defineProperty(target,key,descriptor)}
 let initCallback
 function findInit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='addInitScript')initCallback=node.arguments[0];ts.forEachChild(node,findInit)}findInit(verifierFile)
 const env={...x.environment,Object:object}
 const init=new Function(...Object.keys(env),'return ('+initCallback.getText(verifierFile)+');')(...Object.values(env))
 init({key:'probe',localeObservationOwner:'fixture-owner'});assert.ok(definitions>0);assert.equal(x.diagnosticCount(),0)
})
test('ownership bridge: collision performs no redefine attempt',()=>{
 const x=initEnvironment();let definitions=0
 Object.defineProperty(x.environment.window,'probe:locale-cleanup',{value:null,writable:false,configurable:false})
 const proxy=new Proxy(x.environment.window,{defineProperty(target,key,descriptor){definitions++;return Reflect.defineProperty(target,key,descriptor)}})
 let initCallback
 function findInit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='addInitScript')initCallback=node.arguments[0];ts.forEachChild(node,findInit)}findInit(verifierFile)
 const env={...x.environment,window:proxy}
 const init=new Function(...Object.keys(env),'return ('+initCallback.getText(verifierFile)+');')(...Object.values(env))
 init({key:'probe',localeObservationOwner:'fixture-owner'});assert.equal(definitions,0);assert.equal(x.diagnosticCount(),0)
})
test('ownership consumer: initializer forwards the per-exercise owner only to init options',async()=>{
 const initializer=verifierFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installEntryDiagnostics')
 assert.ok(initializer)
 const run=new Function('navigationTraceKey','origin',initializer.getText(verifierFile)+';return installEntryDiagnostics;')('probe','https://invalid.test')
 let options
 const requests=await run({addInitScript:async(_,args)=>{options=args}},{on(){}},'fixture-owner')
 assert.deepEqual(options,{key:'probe',localeObservationOwner:'fixture-owner'});assert.deepEqual(requests,[])
 assert.match(source,/const localeObservationOwner = randomUUID\(\);\s*const navigationRequests = await installEntryDiagnostics\(context, page, localeObservationOwner\)/)
})
