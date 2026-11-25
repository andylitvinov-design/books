import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizePrFiles,recommendDeliveryNext} from '../lib/command-center/pr-artifacts.mjs';
const valid=[{filename:'app/admin/command-center/page.tsx',status:'modified',additions:4,deletions:2},
  {filename:'.github/workflows/hh-pr-core-release.yml',status:'added',additions:6,deletions:0}];
test('file summaries come from bounded trusted GitHub metadata only',()=>{
 const proof=summarizePrFiles(valid,2);
 assert.equal(proof.known,true);assert.equal(proof.count,2);assert.equal(proof.complete,true);
 assert.deepEqual(proof.items.map(x=>x.path),valid.map(x=>x.filename));
 assert.ok(proof.items.every(x=>!Object.hasOwn(x,'patch')&&!Object.hasOwn(x,'contents')));
 assert.equal(summarizePrFiles(valid,5).complete,false);
});
test('unknown or incomplete inventories are never presented as complete',()=>{
 for(const [files,count] of [[null,10],[{},10],[valid,1],[valid,-1],
  [[{...valid[0],filename:'../secret'}],1],
  [[{...valid[0],filename:'src/\nmalicious'}],1],
  [[{...valid[0],status:'unknown'}],1],
  [[{...valid[0],additions:-5}],1],
  [valid,100001]]){
  assert.equal(summarizePrFiles(files,count).known,false);
 }
 assert.equal(summarizePrFiles([],0).complete,true);
 const many=Array.from({length:100},(_,i)=>({...valid[0],filename:'src/f'+i+'.ts'}));
 const summary=summarizePrFiles(many,120);
 assert.equal(summary.known,true);assert.equal(summary.complete,false);
 assert.equal(summary.count,120);assert.equal(summary.items.length,12);
 assert.equal(summarizePrFiles([...many,valid[0]],101).known,false);
});
test('next steps come from evidence, never from model guesses',()=>{
 assert.equal(recommendDeliveryNext({prState:'unknown'}),'inspect_again');
 assert.equal(recommendDeliveryNext({prState:'closed'}),'closed_without_merge');
 assert.equal(recommendDeliveryNext({prState:'open',ci:'failed'}),'repair_checks');
 assert.equal(recommendDeliveryNext({prState:'open',ci:'pending'}),'wait_checks');
 assert.equal(recommendDeliveryNext({prState:'open',ci:'passed'}),'review_protected_merge');
 assert.equal(recommendDeliveryNext({prState:'open',ci:'unknown'}),'check_ci_evidence');
 assert.equal(recommendDeliveryNext({prState:'merged',servingSha:null,codeOnProduction:false}),'verify_deployment_identity');
 assert.equal(recommendDeliveryNext({prState:'merged',servingSha:'a'.repeat(40),codeOnProduction:false}),'await_verified_deployment');
 assert.equal(recommendDeliveryNext({prState:'merged',servingSha:'a'.repeat(40),codeOnProduction:true}),'check_functional_live');
});
test('mobile workbench extends owner-only action and uses a collapsed viewer',()=>{
 const mobile=readFileSync(new URL('../app/admin/command-center/command-center-mobile.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/admin/command-center/command-center-mobile.module.css',import.meta.url),'utf8');
 const api=readFileSync(new URL('../app/api/admin/command-center/route.js',import.meta.url),'utf8');
 assert.match(mobile,/selectedProof\.fileSummary/);
 assert.match(mobile,/<details className=\{styles\.prFiles\}>/);
 assert.match(mobile,/deliveryNextLabels\[lang\]/);
 assert.match(mobile,/t\.releaseBrowser/);
 assert.match(css,/\.prFileRow/);
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/inspect_delivery/);
 assert.doesNotMatch(mobile,/markProductionLive|fakeAgentComplete/);
});
