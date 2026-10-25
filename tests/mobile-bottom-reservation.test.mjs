import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {stripTypeScriptTypes} from 'node:module';
const dir=new URL('../',import.meta.url);
const source=readFileSync(new URL('components/mobile-bottom-navigation.tsx',dir),'utf8');
const css=readFileSync(new URL('app/ia-v2.css',dir),'utf8');
function harness({height=84.5,mobile=true,connected=true,elementPresent=true}={}) {
 let rect={height,width:390,bottom:844}; const styles=new Map(), events=new Map();
 const style={setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)};
 const element={isConnected:connected,style:{removeProperty(){},transform:''},getBoundingClientRect:()=>rect};
 const document={body:{style},activeElement:null,addEventListener:(k,v)=>events.set(k,v),removeEventListener:(k,v)=>{assert.equal(events.get(k),v);events.delete(k)}};
 const window={visualViewport:null,innerHeight:844,matchMedia:()=>({matches:mobile}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener:(k,v)=>events.set(k,v),removeEventListener:(k,v)=>{assert.equal(events.get(k),v);events.delete(k)}};
 let observer; class ResizeObserver {constructor(fn){observer=fn} observe(){} disconnect(){}}
 const start=source.indexOf('  useEffect(() => {')+'  useEffect(() => {'.length;
 const end=source.indexOf('\n  }, [hidden, locale]);',start); assert.ok(start>0&&end>start);
 const cleanup=vm.runInNewContext(stripTypeScriptTypes('(function(){'+source.slice(start,end)+'})()'), {nav:{current:elementPresent?element:null},window,document,ResizeObserver,Number});
 return {styles,events,document,cleanup,resize:()=>observer(),setHeight:h=>rect={...rect,height:h},setMobile:x=>mobile=x,setConnected:x=>element.isConnected=x};
}
for(const active of [null,{}, {tagName:'BODY'}, {tagName:'TEXTAREA'}])test('zero focusout preserves last height with active '+JSON.stringify(active),()=>{const h=harness();h.document.activeElement=active;h.setHeight(0);h.events.get('focusout')();assert.equal(h.styles.get('--ia222-bottom-height'),'84.5px');});
for(const invalid of [0,-1,NaN,Infinity])test('invalid mobile height retains reservation '+invalid,()=>{const h=harness();h.setHeight(invalid);h.resize();assert.equal(h.styles.get('--ia222-bottom-height'),'84.5px');});
test('initial hidden bar leaves CSS fallback instead of zero',()=>{const h=harness({height:0});assert.equal(h.styles.has('--ia222-bottom-height'),false)});
test('positive measurement refreshes reservation',()=>{const h=harness();h.setHeight(91.25);h.resize();assert.equal(h.styles.get('--ia222-bottom-height'),'91.25px')});
test('desktop explicitly releases and mobile reentry starts at fallback',()=>{const h=harness();h.setMobile(false);h.resize();assert.equal(h.styles.size,0);h.setMobile(true);h.setHeight(0);h.resize();assert.equal(h.styles.size,0)});
test('disconnected explicitly releases',()=>{const h=harness();h.setConnected(false);h.resize();assert.equal(h.styles.size,0)});
test('private/questionnaire no element clears property',()=>{const h=harness({elementPresent:false});assert.equal(h.styles.size,0);assert.equal(h.cleanup,undefined)});
test('effect cleanup releases and removes handlers',()=>{const h=harness();h.cleanup();assert.equal(h.styles.size,0);assert.equal(h.events.size,0)});
test('CSS hides editor bar without zero override and reserves safe area',()=>{assert.ok(!css.includes('--ia222-bottom-height: 0px'));assert.equal(css.split('var(--ia222-bottom-height,calc(76px + env(safe-area-inset-bottom, 0px)))').length-1,2);assert.match(css,/:focus\) \.ia222-bottom-navigation \{\s*display: none !important;/);});
