import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { extractCompactDockLayoutEffect, nativeCompactConsentFixture } from '../scripts/helpers/native-compact-consent-layout.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/mobile-bottom-navigation.tsx')
// Authored effect executed against a deterministic event/layout model, not a
// claim of native browser focus, scrolling or pointer behavior.
function fixture({sourceOverride=source,mobile=true,hidden=false,retainedInline=false}={}) {
  const properties=new Map(),listeners=new Map(),windowListeners=new Map(),frames=new Map(),timers=new Map()
  let next=0,observer,disconnected=false,dockHeight=69,compact=true
  const style={setProperty(name,value,priority=''){properties.set(name,{value,priority})},removeProperty(name){properties.delete(name)},
    getPropertyValue:name=>properties.get(name)?.value||'',getPropertyPriority:name=>properties.get(name)?.priority||''}
  class Element {closest(){return null}}
  class HTMLInputElement extends Element {}
  const form=new Element(),label=new Element(),span=new Element(),consent=new HTMLInputElement(),phone=new HTMLInputElement()
  Object.assign(consent,{type:'checkbox',disabled:false,form})
  Object.assign(phone,{type:'tel',form})
  form.closest=selector=>{assert.equal(selector,'[data-contact-channel-chooser][data-compact-phone-trigger="true"]');return compact?form:null}
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
    height:()=>2400+parseFloat(clearance()),
    focusPhone(){doc.activeElement=phone;if(!retainedInline)observer();fire('focusin')},
    press(overrides={}){fire('pointerdown',{...event,...overrides})},
    blurPhone(){doc.activeElement=consent;fire('focusout');fire('focusin')},
    release(overrides={}){fire('pointerup',{...event,...overrides})},
    cancel(overrides={}){fire('pointercancel',{...event,...overrides})},
    fire,fireWindow:(type,event={})=>fire(type,event,windowListeners),
    flush(){for(const [id,fn]of[...timers]){timers.delete(id);fn()}},
    resize(height){dockHeight=height;observer()},setCompact:value=>compact=value,
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
