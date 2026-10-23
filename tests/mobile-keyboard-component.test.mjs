import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {nextMobileKeyboardOcclusion} from '../lib/mobile-keyboard-occlusion.mjs';
const events=()=>{const handlers=new Map();return {handlers,addEventListener(n,f){handlers.set(n,f)},removeEventListener(n,f){if(handlers.get(n)===f)handlers.delete(n)},emit(n){handlers.get(n)?.()}}};
const style=()=>{const values=new Map();return {values,setProperty(k,v){values.set(k,v)},removeProperty(k){values.delete(k)}}};
test('actual navigation effect follows focus/viewport recovery and cleans all geometry listeners',()=>{
 const source=readFileSync(new URL('../components/mobile-bottom-navigation.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 let effect,disconnected=false,editing=false;const attributes=new Set(),frames=new Map();let frameId=0;
 const nav={style:style(),toggleAttribute(k,on){on?attributes.add(k):attributes.delete(k)},removeAttribute(k){attributes.delete(k)},getBoundingClientRect(){return {width:390,height:attributes.has('data-keyboard-occluded')?0:63,bottom:viewport.height}}};
 const viewport={...events(),height:844,offsetTop:0,scale:1};
 const window={...events(),innerWidth:390,innerHeight:844,visualViewport:viewport,requestAnimationFrame(f){frames.set(++frameId,f);return frameId},cancelAnimationFrame(id){frames.delete(id)}};
 const document={...events(),body:{style:style()},documentElement:{style:style()},activeElement:{matches(){return editing}}};
 const modules={
 'react':{useEffect(f){effect=f},useRef(){return {current:nav}}},
 'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
 'next/link':{default:()=>null},'next/navigation':{usePathname:()=>'/en/services'},
 './compact-navigation-icons':{compactNavigationIcons:{}},'./use-navigation-locale':{useNavigationLocale:()=> 'en'},
 '@/lib/site-navigation-model':{activeCompactNavigationId:()=>null,getCompactNavigation:()=>[],isPublicTestDiscoveryPath:()=>false,navigationCopy:{en:{mobile:'Navigation'}}},
 '@/lib/mobile-keyboard-occlusion.mjs':{nextMobileKeyboardOcclusion}
 };
 const exports={};vm.runInNewContext(compiled,{exports,require(n){assert.ok(Object.hasOwn(modules,n),'Unknown import '+n);return modules[n]},window,document,ResizeObserver:class{observe(){}disconnect(){disconnected=true}}});
 exports.MobileBottomNavigation({});const cleanup=effect();
 const flush=()=>{for(const [id,fn] of frames){frames.delete(id);fn()}};
 const assertHeight=value=>{assert.equal(document.body.style.values.get('--ia222-bottom-height'),value);assert.equal(document.documentElement.style.values.get('--ia222-bottom-height'),value)};
 flush();assertHeight('63px');
 editing=true;document.emit('focusin');flush();assertHeight('63px');assert.equal(attributes.size,0,'Focus alone must not move navigation');
 viewport.height=510;viewport.emit('resize');flush();assertHeight('0px');assert.ok(attributes.has('data-keyboard-occluded'));
 editing=false;document.emit('focusout');flush();assertHeight('0px');assert.ok(attributes.has('data-keyboard-occluded'),'Blur cannot restore bar before viewport');
 viewport.height=700;viewport.emit('resize');flush();assertHeight('0px');
 window.innerHeight=760;viewport.height=760;viewport.emit('resize');flush();assertHeight('63px');assert.equal(attributes.size,0);
 window.emit('resize');flush();assertHeight('63px');
 cleanup();assert.ok(disconnected);assert.equal(attributes.size,0);assert.equal(document.body.style.values.size,0);assert.equal(document.documentElement.style.values.size,0);assert.equal(document.handlers.size,0);assert.equal(window.handlers.size,0);assert.equal(viewport.handlers.size,0);assert.equal(frames.size,0);
});
