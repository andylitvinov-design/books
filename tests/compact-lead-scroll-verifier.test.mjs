import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assertScrollGeometry, readScrollGeometry, verifyCompactLeadScroll } from '../scripts/helpers/compact-lead-scroll-verifier.mjs';
const good = { width: 320, height: 844, reduced: true, behavior: 'auto', padding: 76, rootHeight: 76, navVisible: true, navHeight: 76, navTop: 768, checked: true, centerX: 40, centerY: 700, hitCheckbox: true };
for (const width of [320,1188]) for (const reducedMotion of ['reduce','no-preference']) test(`${width} ${reducedMotion} exact geometry`, () => {
  assertScrollGeometry({...good,width,reduced:reducedMotion==='reduce',behavior:reducedMotion==='reduce'?'auto':'smooth',...(width===1188?{padding:0,navVisible:false}: {})},{width,reducedMotion},true);
});
for (const [name,change] of Object.entries({smoothReduced:{behavior:'smooth'},missingPadding:{padding:0},staleRootHeight:{rootHeight:0},hiddenNavigation:{navVisible:false},unchecked:{checked:false},coveredHit:{hitCheckbox:false},coveredCenter:{centerY:780},outsideViewport:{centerY:900}})) test('reject '+name,()=>{
  assert.throws(()=>assertScrollGeometry({...good,...change},{width:320,reducedMotion:'reduce'},true));
});
test('browser measurement is bounded read-only and contains no contact, path or URL',()=>{
  const node={checked:true,getBoundingClientRect:()=>({left:32,top:692,width:16,height:16})};
  const nav={getBoundingClientRect:()=>({height:76,top:768})};
  const root={};
  const result=runInNewContext('('+readScrollGeometry.toString()+')(node)',{node,innerWidth:320,innerHeight:844,
    document:{documentElement:root,querySelector:selector=>{assert.equal(selector,'.ia222-bottom-navigation');return nav;},elementFromPoint:(x,y)=>{assert.equal(x,40);assert.equal(y,700);return node;}},
    getComputedStyle:element=>element===root?{scrollBehavior:'auto',scrollPaddingBottom:'76px',getPropertyValue:key=>{assert.equal(key,'--ia222-bottom-height');return '76px';}}:{display:'grid',visibility:'visible'},
    matchMedia:()=>({matches:true})});
  assert.deepEqual(JSON.parse(JSON.stringify(result)),good);
});
test('non-loopback regression is rejected before opening browser',async()=>{
  for(const origin of ['https://holistichouse.vercel.app','http://outside.test:3100','http://127.0.0.1:3100@outside.test'])
    await assert.rejects(verifyCompactLeadScroll({newContext(){assert.fail('must not open');}},null,origin,'chromium'),/loopback/);
});
test('existing matrix remains and additional matrix is local-only for both engines',()=>{
  const source=readFileSync(new URL('../scripts/verify-contact-channel-chooser-browser.mjs',import.meta.url),'utf8');
  assert.match(source,/if \(!live\) results\.push\(\.\.\.await verifyCompactLeadScroll\(browser, expect, origin, name\)\)/);
  assert.match(source,/name === "webkit" \? \[390\] : \[320,390,1188\]/);
  assert.match(source,/runEngine\("chromium",chromium\)/); assert.match(source,/runEngine\("webkit",webkit\)/);
  const helper=readFileSync(new URL('../scripts/helpers/compact-lead-scroll-verifier.mjs',import.meta.url),'utf8');
  assert.match(helper,/for \(const width of \[320, 1188\]\) for \(const reducedMotion of \['reduce', 'no-preference'\]\)/);
  assert.doesNotMatch(helper,/force:|scrollIntoView|dispatchEvent|\.press\(/);
});
