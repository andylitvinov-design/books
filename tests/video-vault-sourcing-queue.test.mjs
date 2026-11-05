import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourcingQueue,sourceQueueCsv,CATEGORY_TARGETS,NATIVE_ASPECT_TARGETS} from '../lib/video-vault/sourcing-queue.mjs';
const row=(id,path,visualTags=[],extra={})=>({id,sourcePage:'https://dareful.com/'+path+'/',visualTags,...extra});
test('500 unique footage targets, not 500 URLs, and native aspect quotas',()=>{
 assert.equal(Object.values(CATEGORY_TARGETS).reduce((sum,n)=>sum+n,0),500);
 assert.equal(NATIVE_ASPECT_TARGETS.landscape,300);
 assert.equal(NATIVE_ASPECT_TARGETS.portrait,200);
});
test('candidate/duplicate classification never claims physical approval or LIVE',()=>{
 const report=buildSourcingQueue({sources:[
  row('lake-001','lake-001',['lake','sunrise'],{suggestedTheme:'relationships'}),
  row('lake-002','lake-001',['lake']),
  row('woods-001','woods-001',['forest']),
  row('forest-upscale','forest-upscale',['forest'],{nativeAspect:'portrait',nativeAspectVerified:false}),
 ]});
 assert.equal(report.acceptedResearchCandidates,3);
 assert.equal(report.duplicateResearchEntries,1);
 assert.equal(report.sourcing.find(x=>x.category==='water').researchCandidates,1);
 assert.equal(report.sourcing.find(x=>x.category==='relationships').researchCandidates,0);
 assert.equal(report.nativeAspectVerifiedResearchCandidates.portrait,0);
 assert.equal(report.independentlyVerifiedOriginals,null);
 assert.equal(report.cloudR2VerifiedOriginals,null);
 assert.equal(report.generatorEligibleFromResearchQueue,0);
 assert.ok(report.candidates.every(x=>x.countedAsOriginal===false&&!x.generatorEligible));
});
test('native portrait candidate is only inferred from affirmative verified source metadata',()=>{
 const r=buildSourcingQueue([row('portrait-001','portrait-001',['human'],{
  nativeAspect:'portrait',nativeAspectVerified:true,humanReviewed:true,reviewedCategory:'people'
 })]);
 assert.equal(r.nativeAspectVerifiedResearchCandidates.portrait,1);
 assert.equal(r.candidates[0].category,'people');
 assert.equal(r.candidates[0].stage,'CANDIDATE_RESEARCH_ONLY');
});
test('provider acquisition gate cannot be bypassed with candidate approval flags',()=>{
 const p={id:'filmed-001',provider:'pexels',sourcePage:'https://www.pexels.com/video/fresh-001/',visualTags:['people'],
  approvedForPublication:true,ownerApproved:true,visualApproved:true};
 const rows=buildSourcingQueue([p]).candidates;
 assert.match(rows[0].acquisitionGate,/permission_required_for_systematic_bulk/);
 assert.equal(rows[0].generatorEligible,false);
});
test('disallow HLS URLs, relative URLs, unsupported providers, and duplicate IDs',()=>{
 const r=buildSourcingQueue([
  row('scene-001','source-a',['forest']),
  row('scene-001','source-b',['forest']),
  {id:'scene-002',sourcePage:'https://stream.mux.com/clip.m3u8'},
  {id:'scene-003',sourcePage:'https://dareful.com/demo.mp4'},
  {id:'scene-004',provider:'dareful',sourcePage:'https://evil.example.com/demo/'},
  {id:'scene-005',sourcePage:'http://dareful.com/demo/'},
 ]);
 assert.equal(r.acceptedResearchCandidates,1);
 assert.equal(r.duplicateResearchEntries,1);
 assert.equal(r.invalidResearchEntries,4);
});
test('manually reviewed category must still not count as verified footage',()=>{
 const r=buildSourcingQueue([row('couple-001','couple-001',['couple'],{
  humanReviewed:true,reviewedCategory:'relationships',nativeAspectVerified:true,nativeAspect:'landscape'
 })]);
 assert.equal(r.sourcing.find(x=>x.category==='relationships').researchCandidates,1);
 assert.equal(r.generatorEligibleFromResearchQueue,0);
});
test('CSV is inert, quoted, Unicode safe; source data never exports mediaUrl',()=>{
 const r=buildSourcingQueue([{id:'scene-001',provider:'mixkit',sourcePage:'https://mixkit.co/free-stock-video/test/',
  visualTags:['=IMPORTDATA("https://evil.test/")','forest'],mediaUrl:'https://stream.example.com/unlicensed.m3u8'}]);
 const csv=sourceQueueCsv(r);
 assert.match(csv,/\"'=importdata/i);
 assert.ok(!csv.includes('mediaUrl')&&!csv.includes('stream.example.com'));
});
test('invalid input fails closed, no source-side effects',()=>{
 assert.throws(()=>buildSourcingQueue({sources:{foo:'bar'}}),/INVALID_INPUT/);
 assert.throws(()=>buildSourcingQueue(Array.from({length:5001},(_,i)=>({id:'x'+i}))),/INVALID_INPUT/);
});
