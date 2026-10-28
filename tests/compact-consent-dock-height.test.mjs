import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { extractCompactDockLayoutEffect, nativeCompactConsentFixture, prepareNativeConsentTarget, installNativeConsentProbe, sanitizeNativeConsentFailure, preserveNativeConsentFailure } from '../scripts/helpers/native-compact-consent-layout.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/mobile-bottom-navigation.tsx')
// Authored effect executed against a deterministic event/layout model, not a
// claim of native browser focus, scrolling or pointer behavior.
function fixture({sourceOverride=source,mobile=true,hidden=false,retainedInline=false,webkitImportant=false}={}) {
  const properties=new Map(),listeners=new Map(),windowListeners=new Map(),frames=new Map(),timers=new Map()
  let next=0,observer,disconnected=false,dockHeight=69,compact=true,phoneChooser=true,phoneField=true
  // Pinned WebKit MutableStyleProperties.cpp:262-267 rejects a normal
  // custom-property write over an existing important declaration, even when
  // its value differs. This models that source path, not native browser proof.
  const style={setProperty(name,value,priority=''){
      if(value===''){properties.delete(name);return}
      if(webkitImportant&&name.startsWith('--')&&properties.get(name)?.priority==='important'&&priority!=='important')return
      properties.set(name,{value,priority})
    },removeProperty(name){properties.delete(name)},
    getPropertyValue:name=>properties.get(name)?.value||'',getPropertyPriority:name=>properties.get(name)?.priority||''}
  class Element {closest(){return null}}
  class HTMLInputElement extends Element {}
  const form=new Element(),label=new Element(),span=new Element(),consent=new HTMLInputElement(),phone=new HTMLInputElement(),button=new Element(),buttonChild=new Element()
  Object.assign(consent,{type:'checkbox',disabled:false,form})
  Object.assign(phone,{type:'tel',form})
  form.closest=selector=>{if(selector==='[data-contact-channel-chooser][data-reiki-phone-enquiry]')return phoneChooser?form:null;assert.equal(selector,'[data-contact-channel-chooser][data-compact-phone-trigger="true"]');return compact?form:null}
  phone.closest=selector=>selector==='[data-phone-country-input]'&&phoneField?phone:null
  Object.assign(button,{form,disabled:false,isConnected:true})
  for(const target of [button,buttonChild])target.closest=selector=>selector==='button[data-contact-channel-submit]'?button:null
  label.querySelector=selector=>{assert.equal(selector,'input[type="checkbox"]');return consent}
  for(const target of [consent,label,span])target.closest=selector=>selector==='label'?label:selector==='input[type="checkbox"]'&&target===consent?consent:null
  const add=(map,type,fn,options)=>{const list=map.get(type)||[];list.push({fn,options});map.set(type,list)}
  const remove=(map,type,fn)=>{map.set(type,(map.get(type)||[]).filter(x=>x.fn!==fn))}
  const doc={body:{style},activeElement:null,visibilityState:'visible',
    addEventListener:(...args)=>add(listeners,...args),removeEventListener:(...args)=>remove(listeners,...args)}
  const clearance=()=>style.getPropertyPriority('--ia222-bottom-height')==='important'
    ? style.getPropertyValue('--ia222-bottom-height')
    : doc.activeElement===phone?'0px':style.getPropertyValue('--ia222-bottom-height')||'69px'
  const nav={style:{removeProperty(){},set transform(value){}},getBoundingClientRect:()=>({height:doc.activeElement===phone?0:dockHeight,width:doc.activeElement===phone?0:390,bottom:844})}
  const viewport={offsetTop:0,height:844,addEventListener:(...args)=>add(windowListeners,'visual-'+args[0],...args.slice(1)),removeEventListener:(...args)=>remove(windowListeners,'visual-'+args[0],...args.slice(1))}
  const win={visualViewport:viewport,innerHeight:844,matchMedia:()=>({matches:mobile}),
    getComputedStyle:node=>{assert.equal(node,doc.body);return{getPropertyValue:name=>{assert.equal(name,'--ia222-bottom-height');return clearance()}}},
    requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:(fn,ms)=>{assert.equal(ms,0);const id=++next;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),
    addEventListener:(...args)=>add(windowListeners,...args),removeEventListener:(...args)=>remove(windowListeners,...args)}
  const ResizeObserver=class{constructor(fn){observer=fn}observe(target){assert.equal(target,nav)}disconnect(){disconnected=true}}
  const execute=runInNewContext(extractCompactDockLayoutEffect(sourceOverride),{document:doc,window:win,Element,HTMLInputElement,ResizeObserver})
  const cleanup=execute({current:hidden?null:nav})
  const fire=(type,event={},where=listeners)=>{for(const {fn}of[...(where.get(type)||[])])fn({type,...event})}
  const event={isTrusted:true,isPrimary:true,button:0,pointerId:7,target:consent}
  return {doc,style,clearance,form,phone,consent,label,span,properties,listeners,windowListeners,timers,frames,
    button,buttonChild,height:()=>2400+parseFloat(clearance()),
    focusPhone(){doc.activeElement=phone;if(!retainedInline)observer();fire('focusin')},
    press(overrides={}){fire('pointerdown',{...event,...overrides})},
    blurPhone(target=consent){doc.activeElement=target;fire('focusout');fire('focusin')},
    release(overrides={}){fire('pointerup',{...event,...overrides})},
    cancel(overrides={}){fire('pointercancel',{...event,...overrides})},
    fire,fireWindow:(type,event={})=>fire(type,event,windowListeners),
    flush(){for(const [id,fn]of[...timers]){timers.delete(id);fn()}},
    resize(height){dockHeight=height;observer()},setCompact:value=>compact=value,setPhoneChooser:value=>phoneChooser=value,setPhoneField:value=>phoneField=value,
    cleanup(){cleanup?.()},get disconnected(){return disconnected},
  }
}
function assertPressStaysStable(f,target=f.consent) {
  f.focusPhone();const height=f.height(),clearance=f.clearance()
  f.press({target});assert.equal(f.height(),height)
  f.blurPhone();assert.equal(f.height(),height,'Phone blur must not change root height during consent press')
  assert.equal(f.clearance(),clearance)
  f.release();assert.equal(f.height(),height,'Release must not flush before its native click')
  assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'important')
  f.flush();assert.equal(f.height(),height+69)
  assert.equal(f.clearance(),'69px');assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
}

for(const retainedInline of [false,true])for(const target of ['consent','label','span'])test('actual layout effect pins computed clearance across '+target+' press; retained inline='+retainedInline,()=>{
  const f=fixture({retainedInline});assertPressStaysStable(f,f[target]);f.cleanup()
  assert.equal(f.properties.size,0);assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.disconnected,true)
  assert.ok([...f.listeners.values(),...f.windowListeners.values()].every(list=>list.length===0))
})

test('resize is deferred only during the held native press and flushes its current height',()=>{
  const f=fixture();f.focusPhone();f.press();f.blurPhone();f.resize(92)
  assert.equal(f.clearance(),'0px');assert.equal(f.height(),2400)
  f.release();f.flush();assert.equal(f.clearance(),'92px')
  f.resize(0);assert.equal(f.clearance(),'0px','Legitimate hidden/desktop height can still become zero outside a press')
  f.resize(82);assert.equal(f.clearance(),'82px')
  f.cleanup()
})

for(const terminal of ['cancel','keydown','blur','pagehide','visibilitychange','cleanup'])test('layout hold ends and cancels its pending timer on '+terminal,()=>{
  const f=fixture();f.focusPhone();f.press();f.blurPhone();f.release();assert.equal(f.timers.size,1)
  if(terminal==='cancel')f.cancel()
  else if(terminal==='keydown')f.fire('keydown')
  else if(terminal==='visibilitychange'){f.doc.visibilityState='hidden';f.fire('visibilitychange')}
  else if(terminal==='cleanup')f.cleanup()
  else f.fireWindow(terminal)
  assert.equal(f.timers.size,0);assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
  if(terminal!=='cleanup'){assert.equal(f.clearance(),'69px');f.cleanup()}
})

for(const invalid of ['desktop','untrusted','secondary','non-primary','disabled','wrong-form','non-tel','non-compact','unrelated-target'])test('height holding ignores '+invalid+' without preventing normal focus measurement',()=>{
  const f=fixture({mobile:invalid!=='desktop'});f.focusPhone();const overrides={}
  if(invalid==='untrusted')overrides.isTrusted=false
  if(invalid==='secondary')overrides.button=2
  if(invalid==='non-primary')overrides.isPrimary=false
  if(invalid==='disabled')f.consent.disabled=true
  if(invalid==='wrong-form')f.phone.form={}
  if(invalid==='non-tel')f.phone.type='email'
  if(invalid==='non-compact')f.setCompact(false)
  if(invalid==='unrelated-target')overrides.target=f.phone
  f.press(overrides);assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
  f.blurPhone();assert.equal(f.clearance(),'69px');f.cleanup()
})

test('wrong pointer release/cancel cannot terminate a different live consent press',()=>{
  const f=fixture();f.focusPhone();f.press();f.blurPhone();f.release({pointerId:8});f.cancel({pointerId:8})
  assert.equal(f.timers.size,0);assert.equal(f.clearance(),'0px')
  f.release();f.flush();assert.equal(f.clearance(),'69px');f.cleanup()
})

test('a stale completed timer cannot release a later native press',()=>{
  const f=fixture();f.focusPhone();f.press();f.blurPhone();f.release()
  const stale=[...f.timers.values()][0]
  f.focusPhone();f.press({pointerId:8});f.blurPhone()
  stale();assert.equal(f.clearance(),'0px');assert.equal(f.timers.size,0)
  f.release({pointerId:8});f.flush();assert.equal(f.clearance(),'69px');f.cleanup()
})

test('hidden route clears the custom property without registering gesture/layout listeners',()=>{
  const f=fixture({hidden:true});assert.equal(f.properties.size,0);assert.equal(f.listeners.size,0);assert.equal(f.windowListeners.size,0)
})

for(const [name,from,to]of[
  ['unguarded height writer','      if (heightPress) return;','      /* synthetic missing deferral */'],
  ['missing computed-height pin',"      document.body.style.setProperty('--ia222-bottom-height', height, 'important');",'      /* synthetic missing geometry pin */'],
  ['premature release','      const releasing = heightPress;','      finishHeightPress();\n      const releasing = heightPress;'],
  ['missing release','        finishHeightPress();','        /* synthetic missing release */'],
])test('negative control rejects '+name+' after actual effect execution',()=>{
  assert.equal(source.split(from).length,2);const changed=source.replace(from,to)
  const f=fixture({sourceOverride:changed,retainedInline:true})
  assert.throws(()=>assertPressStaysStable(f),{code:'ERR_ASSERTION'});f.cleanup()
})

test('native regression is offline, source-extracted, trust-counted and wired after existing channel suite',()=>{
  const helper=read('scripts/helpers/native-compact-consent-layout.mjs'),channel=read('scripts/helpers/native-compact-channel-gestures.mjs')
  assert.match(channel,/await assertNativeCompactConsentLayout\(browser, expect, \{ origin \}\)/)
  assert.match(helper,/assertDaoVerifierBoundary\(origin\)/)
  assert.match(helper,/readFile\(new URL\('\.\.\/\.\.\/components\/mobile-bottom-navigation.tsx'/)
  assert.match(helper,/context.route\('\*\*\/\*', async route => \{blocked\+\+;await route.abort\('blockedbyclient'\)\}\)/)
  assert.match(helper,/await consent.check\(\)/);assert.match(helper,/page.touchscreen.tap\(x,y\)/)
  assert.match(helper,/page.keyboard.press\('Space'\)/);assert.match(helper,/event.isTrusted/)
  assert.match(helper,/assert.equal\(event.height,initialHeight/);assert.match(helper,/initialHeight\+69/)
  assert.ok(helper.indexOf("getPropertyPriority('--ia222-bottom-height')")<helper.indexOf('only then use native Tab'))
  assert.doesNotMatch(helper,/force:\s*true|waitForTimeout|dispatchEvent|\.blur\(|\.checked\s*=|test.skip|fetch\(/)
  assert.doesNotMatch(nativeCompactConsentFixture,/https?:|src=|href=|<script/)
  assert.throws(()=>extractCompactDockLayoutEffect(''))
  assert.throws(()=>extractCompactDockLayoutEffect(source+source))
})

function finalNativeCountContract(helper) {
  const initial=helper.indexOf('.toEqual({inputs:wanted,changes:wanted,trustedInputs:wanted,trustedChanges:wanted})')
  const restored=helper.indexOf("getPropertyPriority('--ia222-bottom-height')",initial)
  const tab=helper.indexOf("await page.keyboard.press('Tab')",restored)
  const cleanup=helper.indexOf('await page.evaluate(()=>{window.__nativeConsentLayoutCleanup();delete window.__nativeConsentLayoutCleanup})')
  const start=helper.indexOf('        assert.deepEqual(await page.evaluate(()=>{')
  const endMarker="kind+' final trusted consent counts after cleanup')"
  const end=helper.indexOf(endMarker,start)
  const close=helper.indexOf('await page.close()',start)
  assert.ok(initial>=0&&restored>initial&&tab>restored&&cleanup>tab&&start>cleanup&&end>start&&close>end,
    'Final native counts must follow restoration, optional Tab and cleanup before page close')
  const block=helper.slice(start,end+endMarker.length)
  assert.match(block,/return\{inputs:s.inputs,changes:s.changes,trustedInputs:s.trustedInputs,trustedChanges:s.trustedChanges\}/)
  assert.match(block,/\{inputs:wanted,changes:wanted,trustedInputs:wanted,trustedChanges:wanted\}/)
  return block
}

test('native final trusted counts remain after restoration, optional Tab and cleanup with negative order guards',()=>{
  const helper=read('scripts/helpers/native-compact-consent-layout.mjs')
  const block=finalNativeCountContract(helper)
  assert.throws(()=>finalNativeCountContract(helper.replace(block,'')),{code:'ERR_ASSERTION'})
  const early=helper.replace(block,'').replace('        await page.evaluate(()=>{window.__nativeConsentLayoutCleanup();',
    block+'\n        await page.evaluate(()=>{window.__nativeConsentLayoutCleanup();')
  assert.notEqual(early,helper)
  assert.throws(()=>finalNativeCountContract(early),{code:'ERR_ASSERTION'})
})

test('actual final native assertion rejects delayed second activation and untrusted count mismatch',async()=>{
  const block=finalNativeCountContract(read('scripts/helpers/native-compact-consent-layout.mjs'))
  const execute=async counts=>{
    const page={evaluate:async fn=>JSON.parse(JSON.stringify(runInNewContext('('+fn.toString()+')()',
      {window:{__nativeConsentLayout:counts}})))} // Model Playwright's serialized realm boundary.
    return new Function('assert','page','wanted','kind','return (async()=>{'+block+'})()')(assert,page,1,'synthetic-count-model')
  }
  await execute({inputs:1,changes:1,trustedInputs:1,trustedChanges:1})
  for(const counts of [
    {inputs:2,changes:2,trustedInputs:2,trustedChanges:2},
    {inputs:1,changes:1,trustedInputs:1,trustedChanges:0},
  ])await assert.rejects(execute(counts),{code:'ERR_ASSERTION'})
})


// These are fixture-precondition models, not native browser results.
test('coordinate preparation uses native scrolling before measurement and hit testing',async()=>{
  const calls=[];let visible=false
  const page={viewportSize:()=>({width:390,height:844})}
  const target={scrollIntoViewIfNeeded:async()=>{calls.push('scroll');visible=true},
    boundingBox:async()=>{calls.push('box');return{x:37,y:visible?600:1390,width:22,height:22}},
    evaluate:async(fn,point)=>{calls.push('hit');assert.deepEqual(point,{x:48,y:611});return true}}
  assert.deepEqual(await prepareNativeConsentTarget(page,target),{x:48,y:611})
  assert.deepEqual(calls,['scroll','box','hit'])
})

for(const bad of ['offscreen','occluded','missing','zero','nonfinite'])test('coordinate preparation fails closed for '+bad,async()=>{
  const target={scrollIntoViewIfNeeded:async()=>{},boundingBox:async()=>bad==='missing'?null:
    {x:37,y:bad==='offscreen'?1390:600,width:bad==='zero'?0:22,height:bad==='nonfinite'?NaN:22},evaluate:async()=>bad!=='occluded'}
  await assert.rejects(prepareNativeConsentTarget({viewportSize:()=>({width:390,height:844})},target),{code:'ERR_ASSERTION'})
})

test('all native branches prepare the target and preserve phone focus before initial geometry and original actions',()=>{
  const helper=read('scripts/helpers/native-compact-consent-layout.mjs')
  const prepare=helper.indexOf('const {x,y}=await prepareNativeConsentTarget(page,target)')
  const focus=helper.indexOf('await expect(phone).toBeFocused()',prepare)
  const initial=helper.indexOf('const initialHeight=',focus)
  const gesture=helper.indexOf("stage='gesture'",initial)
  assert.ok(prepare>0&&focus>prepare&&initial>focus&&gesture>initial)
  assert.match(helper.slice(gesture),/await consent.check\(\)/)
  assert.match(helper.slice(gesture),/page.touchscreen.tap\(x,y\)/)
  assert.equal(helper.split('await prepareNativeConsentTarget(page,target)').length,2)
  assert.match(helper,/catch\(error\) \{\n        await preserveNativeConsentFailure\(page,kind,stage\)\n        throw error\n      \} finally/)
  assert.doesNotMatch(helper,/force:\s*true|waitForTimeout|dispatchEvent|\.blur\(|\.checked\s*=|test.skip|fetch\(/)
  finalNativeCountContract(helper)
})

function probeFixture({clearance='0px'}={}){
  class Node{contains(node){return node===this||(this.children||[]).includes(node)}}
  const consent=Object.assign(new Node(),{checked:false,isConnected:true,disabled:false}),phone=new Node(),label=new Node(),nav=new Node(),body=new Node()
  label.children=[consent];consent.closest=()=>label
  consent.getBoundingClientRect=()=>({top:600,left:37,width:22,height:22});nav.getBoundingClientRect=()=>({height:0})
  const writes=[],listeners=new Map(),inputListeners=new Map()
  body.style={getPropertyValue:()=> '0px',getPropertyPriority:()=> 'important',setProperty:()=>writes.push('style')}
  const document={body,activeElement:phone,documentElement:{scrollHeight:2400},
    querySelector:selector=>selector==='nav'?nav:selector.includes('checkbox')?consent:phone,
    addEventListener(type,fn,options){assert.equal(options.passive,true);const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list)}}
  consent.addEventListener=(type,fn,options)=>{assert.equal(options.passive,true);inputListeners.set(type,fn)}
  const window={scrollY:790};runInNewContext('('+installNativeConsentProbe.toString()+')()',
    {window,document,Node,getComputedStyle:()=>({getPropertyValue:()=>clearance})})
  return{window,consent,phone,writes,fire(type,extra={}){
    const event={type,target:consent,isTrusted:true,isPrimary:true,pointerId:7,button:0,clientX:48,clientY:611,...extra}
    for(const fn of listeners.get(type)||[])fn(event)
    inputListeners.get(type)?.(event)
  }}
}

test('passive exact probe records bounded physical IDs, focus and geometry without field or style writes',()=>{
  const f=probeFixture();f.fire('pointerdown');f.fire('pointerup');f.fire('input');f.fire('change')
  const result=f.window.__nativeConsentLayoutSnapshot()
  assert.equal(result.inputs,1);assert.equal(result.changes,1);assert.equal(result.trustedInputs,1);assert.equal(result.trustedChanges,1)
  assert.equal(result.events[0].pointerId,7);assert.equal(result.events[0].target,1);assert.equal(result.events[0].focus,2)
  assert.equal(result.events[0].important,true);assert.equal(result.events[0].height,2400);assert.equal(result.events[0].clearance,0)
  for(let i=0;i<100;i++)f.fire('pointerdown')
  assert.equal(f.window.__nativeConsentLayoutSnapshot().events.length,48)
  assert.ok(f.window.__nativeConsentLayoutSnapshot().dropped>0);assert.deepEqual(f.writes,[]);assert.equal(f.consent.checked,false)
})

test('native failure serialization rejects unknown text/URLs and bounds event and numeric fields',()=>{
  const secret='PRIVATE_FIXTURE_SENTINEL'
  const record={type:0,phase:1,pointerId:Infinity,height:1e30,top:12.345,important:true,target:secret,value:secret,url:secret}
  const result=sanitizeNativeConsentFailure(secret,secret,{inputs:1,current:record,events:Array(200).fill(record),url:secret})
  assert.equal(result.kind,'unknown');assert.equal(result.stage,'unknown');assert.equal(result.events.length,48)
  assert.equal(result.current.pointerId,null);assert.equal(result.current.height,1000000);assert.equal(result.current.top,12.3)
  const encoded=JSON.stringify(result);assert.ok(encoded.length<25000);assert.ok(!encoded.includes(secret))
  assert.equal(sanitizeNativeConsentFailure('touch-label','hold-release',null).events.length,0)
})

for(const mode of ['completed','rejected','timed_out'])test('native failure evidence reaches bounded stderr path on '+mode,async()=>{
  const output=[]
  const page={evaluate:()=>mode==='completed'?Promise.resolve({inputs:1,events:[]}):mode==='rejected'?Promise.reject(new Error('PRIVATE_ERROR')):new Promise(()=>{})}
  await preserveNativeConsentFailure(page,'touch-checkbox','counts',(...args)=>output.push(args),1)
  assert.equal(output.length,1);assert.equal(output[0][0],'NATIVE_COMPACT_CONSENT_FAILURE')
  const parsed=JSON.parse(output[0][1]);assert.equal(parsed.outcome,mode);assert.equal(parsed.kind,'touch-checkbox');assert.equal(parsed.stage,'counts')
  assert.ok(!output[0][1].includes('PRIVATE_ERROR'))
})


test('native exact-zero gate rejects fractional clearance hidden by diagnostic rounding',()=>{
  const helper=read('scripts/helpers/native-compact-consent-layout.mjs')
  const gate=helper.split('\n').find(line=>line.includes("assert.equal(event.clearanceZero,true,"))
  assert.ok(gate,'The native physical-event gate must assert the unrounded exact-zero boolean')
  const execute=new Function('assert','event','kind',gate)
  for(const clearance of ['0px',' 0px ']){
    const f=probeFixture({clearance});f.fire('pointerdown')
    const event=f.window.__nativeConsentLayout.events[0]
    assert.equal(event.clearanceZero,true);execute(assert,event,'synthetic-exact-zero')
  }
  for(const clearance of ['0.04px','-0.04px','0.0px','0','-0px','invalid']){
    const f=probeFixture({clearance});f.fire('pointerdown')
    const event=f.window.__nativeConsentLayout.events[0]
    if(clearance==='0.04px')assert.equal(event.clearance,0,'Counterexample retains bounded numeric diagnostic zero')
    assert.equal(event.clearanceZero,false)
    assert.throws(()=>execute(assert,event,'synthetic-nonexact-zero'),{code:'ERR_ASSERTION'})
    const logged=sanitizeNativeConsentFailure('mouse-checkbox','geometry',{current:event,events:[event]})
    assert.equal(logged.current.clearanceZero,false);assert.equal(logged.events[0].clearanceZero,false)
  }
  const weakened=helper.replace('assert.equal(event.clearanceZero,true,','assert.equal(event.clearance,0,')
  assert.ok(!weakened.includes('assert.equal(event.clearanceZero,true,'),'Source guard rejects the former rounded-only gate')
})


const ownedPinRemoval="      document.body.style.removeProperty('--ia222-bottom-height');\n      if (saved.value)"
function withoutOwnedPinRemoval(){
  assert.equal(source.split(ownedPinRemoval).length,2,'Exactly one owned-pin removal precedes saved-state restoration')
  return source.replace(ownedPinRemoval,'      if (saved.value)')
}

test('WebKit-faithful setter reproduces old retained pin and candidate clears only its temporary pin',()=>{
  const old=fixture({sourceOverride:withoutOwnedPinRemoval(),webkitImportant:true})
  old.focusPhone();old.press();old.blurPhone();old.release();old.flush()
  assert.equal(old.clearance(),'0px');assert.equal(old.style.getPropertyPriority('--ia222-bottom-height'),'important')
  old.cleanup()
  const fixed=fixture({webkitImportant:true});assertPressStaysStable(fixed);fixed.cleanup()
})

for(const webkitImportant of [false,true])for(const prior of ['normal','empty','important'])test('owned-pin release preserves existing writer policy: WebKit='+webkitImportant+' prior='+prior,()=>{
  const f=fixture({webkitImportant});f.focusPhone()
  if(prior==='empty')f.style.removeProperty('--ia222-bottom-height')
  if(prior==='important')f.style.setProperty('--ia222-bottom-height','14px','important')
  const initial=f.height();f.press();f.blurPhone();f.release()
  assert.equal(f.height(),initial,'Owned pin holds the starting computed geometry through native release')
  f.flush()
  const retainedPrior=webkitImportant&&prior==='important'
  assert.equal(f.clearance(),retainedPrior?'14px':'69px')
  assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),retainedPrior?'important':'')
  // The saved important state is restored first; the unchanged normal writer
  // then follows the engine's existing policy, not universal normalization.
  f.cleanup();assert.equal(f.properties.size,0);assert.equal(f.timers.size,0)
})

for(const terminal of ['cancel','keydown','blur','pagehide','visibilitychange','cleanup'])test('WebKit-faithful owned pin releases on '+terminal,()=>{
  const f=fixture({webkitImportant:true});f.focusPhone();f.press();f.blurPhone();f.release()
  if(terminal==='cancel')f.cancel()
  else if(terminal==='keydown')f.fire('keydown')
  else if(terminal==='visibilitychange'){f.doc.visibilityState='hidden';f.fire('visibilitychange')}
  else if(terminal==='cleanup')f.cleanup()
  else f.fireWindow(terminal)
  assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'');assert.equal(f.timers.size,0)
  if(terminal!=='cleanup'){assert.equal(f.clearance(),'69px');f.cleanup()}
})

test('WebKit-faithful stale completion cannot clear a newer owned pin',()=>{
  const f=fixture({webkitImportant:true});f.focusPhone();f.press();f.blurPhone();f.release()
  const stale=[...f.timers.values()][0]
  f.focusPhone();f.press({pointerId:8});f.blurPhone();stale()
  assert.equal(f.clearance(),'0px');assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'important')
  assert.equal(f.timers.size,0);f.release({pointerId:8});f.flush()
  assert.equal(f.clearance(),'69px');assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'');f.cleanup()
})

test('owned-pin change is confined to active-hold restoration, retaining original measure writer and consent acceptance',()=>{
  const finish=source.slice(source.indexOf('    const finishHeightPress = () => {'),source.indexOf('    const onConsentPointerDown ='))
  const owned=finish.indexOf("document.body.style.removeProperty('--ia222-bottom-height');")
  assert.ok(owned>finish.indexOf('if (!heightPress) return;')&&owned>finish.indexOf('heightPress = null;'))
  assert.ok(owned<finish.indexOf('if (saved.value)')&&finish.indexOf('if (saved.value)')<finish.indexOf('measureHeight();'))
  assert.match(source,/const measureHeight = \(\) => \{\n      if \(heightPress\) return;\n      document.body.style.setProperty\('--ia222-bottom-height', `\$\{element.getBoundingClientRect\(\).height\}px`\);\n    \};/)
  finalNativeCountContract(read('scripts/helpers/native-compact-consent-layout.mjs'))
})


test('height completion does not remove an unrelated inline priority when no owned hold exists',()=>{
  const f=fixture({webkitImportant:true});f.style.setProperty('--ia222-bottom-height','14px','important')
  for(const terminal of ['keydown','blur','pagehide']){
    if(terminal==='keydown')f.fire(terminal);else f.fireWindow(terminal)
    assert.equal(f.style.getPropertyValue('--ia222-bottom-height'),'14px')
    assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'important')
  }
  f.cleanup()
})

// Source-backed regression: hosted Chromium observed dock clearance 0 -> 69
// and root height 5995 -> 6064 during focusout before the pointer release.
// This model checks the authored writer; it does not simulate browser scrolling.
for(const retainedInline of [false,true])for(const target of ['button','buttonChild'])test('authored clearance pin also protects same compact phone channel '+target+'; retained='+retainedInline,()=>{
  const f=fixture({retainedInline});f.focusPhone();const height=f.height(),clearance=f.clearance()
  f.press({target:f[target]});assert.equal(f.clearance(),clearance)
  f.blurPhone(f.button);f.resize(69)
  assert.equal(f.height(),height,'Allowed height writer must defer during the channel press')
  assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'important')
  f.release({target:f.button});assert.equal(f.height(),height)
  f.flush();assert.equal(f.clearance(),'69px');assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
  f.cleanup();assert.equal(f.properties.size,0);assert.equal(f.timers.size,0)
})

for(const invalid of ['desktop','untrusted','secondary','non-primary','disabled','disconnected','wrong-form','non-tel','wrong-chooser','wrong-phone-field'])test('channel geometry pin excludes '+invalid,()=>{
  const f=fixture({mobile:invalid!=='desktop'});f.focusPhone();const event={target:f.button}
  if(invalid==='untrusted')event.isTrusted=false
  if(invalid==='secondary')event.button=2
  if(invalid==='non-primary')event.isPrimary=false
  if(invalid==='disabled')f.button.disabled=true
  if(invalid==='disconnected')f.button.isConnected=false
  if(invalid==='wrong-form')f.button.form={}
  if(invalid==='non-tel')f.phone.type='email'
  if(invalid==='wrong-chooser')f.setPhoneChooser(false)
  if(invalid==='wrong-phone-field')f.setPhoneField(false)
  f.press(event);assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
  f.blurPhone();assert.equal(f.clearance(),'69px');f.cleanup()
})

for(const terminal of ['cancel','keydown','blur','pagehide','visibilitychange','cleanup'])test('channel geometry pin releases through existing '+terminal+' lifecycle, without activation',()=>{
  const f=fixture();f.focusPhone();f.press({target:f.button});f.blurPhone(f.button);f.release({target:f.button});assert.equal(f.timers.size,1)
  if(terminal==='cancel')f.cancel()
  else if(terminal==='keydown')f.fire('keydown')
  else if(terminal==='visibilitychange'){f.doc.visibilityState='hidden';f.fire('visibilitychange')}
  else if(terminal==='cleanup')f.cleanup()
  else f.fireWindow(terminal)
  assert.equal(f.timers.size,0);assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'')
  if(terminal!=='cleanup')f.cleanup()
})

test('channel physical outside release still ends geometry hold without moving focus or scrolling',()=>{
  const f=fixture();f.focusPhone();f.press({target:f.button});f.blurPhone(f.button)
  f.release({target:new Object(),clientX:300,clientY:100});f.flush()
  assert.equal(f.clearance(),'69px');assert.equal(f.doc.activeElement,f.button);assert.equal(f.timers.size,0)
  f.cleanup()
})

test('removing channel eligibility rejects the proposed geometry contract on authored effect code',()=>{
  const gate='if (!fromConsent && !fromPhoneChannel) return;';assert.equal(source.split(gate).length,2)
  const f=fixture({sourceOverride:source.replace(gate,'if (!fromConsent) return;'),retainedInline:true})
  f.focusPhone();const height=f.height();f.press({target:f.button});f.blurPhone(f.button)
  assert.throws(()=>assert.equal(f.height(),height),{code:'ERR_ASSERTION'});f.cleanup()
})

for(const webkitImportant of [false,true])test('observed focusout writer keeps the 5995 root extent until physical release; WebKit priority='+webkitImportant,()=>{
  const f=fixture({webkitImportant,retainedInline:true});f.focusPhone()
  const rootHeight=()=>5995+parseFloat(f.clearance())
  assert.equal(rootHeight(),5995)
  f.press({target:f.button,clientX:106,clientY:816})
  f.blurPhone(f.button);f.resize(69)
  assert.equal(rootHeight(),5995,'Focusout cannot reintroduce the measured 69px clearance mid-press')
  f.release({target:f.button,clientX:106,clientY:816})
  assert.equal(rootHeight(),5995,'Pin survives physical release until existing next-task flush')
  f.flush();assert.equal(rootHeight(),6064);f.cleanup()
})

test('prior eligibility reproduces the observed 69px focusout extent jump',()=>{
  const gate='if (!fromConsent && !fromPhoneChannel) return;';assert.equal(source.split(gate).length,2)
  const f=fixture({sourceOverride:source.replace(gate,'if (!fromConsent) return;'),retainedInline:true})
  f.focusPhone();const rootHeight=()=>5995+parseFloat(f.clearance());assert.equal(rootHeight(),5995)
  f.press({target:f.button});f.blurPhone(f.button);assert.equal(rootHeight(),6064)
  f.cleanup()
})

for(const terminal of ['cancel','keydown','blur','pagehide','visibilitychange','cleanup'])test('in-flight channel pin terminates before pointerup on '+terminal,()=>{
  const f=fixture();f.focusPhone();f.press({target:f.button});f.blurPhone(f.button)
  assert.equal(f.clearance(),'0px');assert.equal(f.timers.size,0)
  if(terminal==='cancel')f.cancel()
  else if(terminal==='keydown')f.fire('keydown')
  else if(terminal==='visibilitychange'){f.doc.visibilityState='hidden';f.fire('visibilitychange')}
  else if(terminal==='cleanup')f.cleanup()
  else f.fireWindow(terminal)
  assert.equal(f.style.getPropertyPriority('--ia222-bottom-height'),'');assert.equal(f.timers.size,0)
  if(terminal!=='cleanup'){assert.equal(f.clearance(),'69px');f.cleanup()}
})

test('foreign pointer release cannot terminate the current channel pin',()=>{
  const f=fixture();f.focusPhone();f.press({target:f.button});f.blurPhone(f.button)
  f.release({target:f.button,pointerId:9});f.cancel({pointerId:9})
  assert.equal(f.clearance(),'0px');assert.equal(f.timers.size,0)
  f.release({target:f.button});f.flush();assert.equal(f.clearance(),'69px');f.cleanup()
})
