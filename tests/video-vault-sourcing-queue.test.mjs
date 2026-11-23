import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('Grand Canyon NPS accepts distinct video IDs on one official B-roll page',()=>{
 const a={id:'ed254bb7-155d-451f-67b12e38646dae7e',provider:'nps_grca',sourcePage:'https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd14.htm',visualTags:['water']};
 const b={...a,id:'edae1a5e-155d-451f-67f2a08978c464b2'};
 const result=buildSourcingQueue([a,b,{...a}]);
 assert.equal(result.acceptedResearchCandidates,2);
 assert.equal(result.duplicateResearchEntries,1);
 assert.equal(result.duplicates[0].reason,'DUPLICATE_SOURCE_ID');
 assert.ok(result.candidates.every(x=>x.generatorEligible===false&&x.stage==='CANDIDATE_RESEARCH_ONLY'));
});
test('NPS provider rejects invalid IDs, unapproved archive pages and spoofed host',()=>{
 const a={id:'3ce1b6aa-8163-47f6-bd79-01672ab3e64c',provider:'nps_grca',sourcePage:'https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd02.htm',visualTags:['winter','sky']};
 const report=buildSourcingQueue([a,{...a,id:'invalid-nps-id'},
  {...a,sourcePage:'https://nps.gov/grca/learn/photosmultimedia/b-roll_hd02.htm'},
  {...a,sourcePage:a.sourcePage+'?track=1'},
  {...a,sourcePage:'https://www.nps.gov/grca/learn/photosmultimedia/video.htm'},
  {...a,sourcePage:'https://evil.test/grca/learn/photosmultimedia/b-roll_hd02.htm'}]);
 assert.equal(report.acceptedResearchCandidates,1);
 assert.equal(report.invalidResearchEntries,5);
});
test('54 NPS media-source research records are not approved or counted as originals',()=>{
 const sources=JSON.parse(readFileSync(new URL('../data/video-catalog/nps-grca-research-54-20261106.json',import.meta.url),'utf8'));
 assert.equal(sources.individualOfficialMediaIds,54);
 const report=buildSourcingQueue(sources);
 assert.equal(report.acceptedResearchCandidates,54);
 assert.equal(report.invalidResearchEntries,0);
 assert.equal(report.duplicateResearchEntries,0);
 assert.equal(report.sourcing.find(x=>x.category==='water').researchCandidates,17);
 assert.equal(report.sourcing.find(x=>x.category==='nature').researchCandidates,37);
 assert.equal(report.generatorEligibleFromResearchQueue,0);
 assert.equal(report.cloudR2VerifiedOriginals,null);
 assert.ok(report.candidates.every(x=>x.nativeAspect===null&&!x.liveVerified));
});

import {assessStockClip,STOCK_POLICIES} from '../lib/mandala/free-stock-sources.mjs';
import {auditPublishedSourceOrigins} from '../lib/video-vault/published-provenance.mjs';

test('12 independent official Free Nature Stock pages are research only and exact video-page scoped',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../data/video-catalog/free-nature-stock-sunlight-research-12-20261106.json',import.meta.url),'utf8'));
 assert.equal(manifest.sourcePageCount,12);
 assert.equal(manifest.ownerVisualApproval,false);
 assert.equal(manifest.physicalMediaDownloaded,false);
 const result=buildSourcingQueue(manifest);
 assert.equal(result.acceptedResearchCandidates,12);
 assert.equal(result.duplicateResearchEntries,0);
 assert.equal(result.invalidResearchEntries,0);
 assert.equal(result.generatorEligibleFromResearchQueue,0);
 assert.equal(result.cloudR2VerifiedOriginals,null);
 assert.ok(result.candidates.every(x=>x.provider==='free_nature_stock'&&
  x.nativeAspect===null&&!x.countedAsOriginal&&!x.generatorEligible&&
  x.stage==='CANDIDATE_RESEARCH_ONLY'&&x.category));
});
test('Free Nature Stock cannot treat homepage, photos, CDN, tracking or spoof hosts as approved video pages',()=>{
 const good={id:'warm-sun-001',provider:'free_nature_stock',
  sourcePage:'https://freenaturestock.com/video/red-sunset/',visualTags:['sun']};
 const negative=[
  'https://freenaturestock.com/',
  'https://freenaturestock.com/videos/',
  'https://freenaturestock.com/license/',
  'https://freenaturestock.com/photo/red-sunset/',
  'https://cdn.freenaturestock.com/video/red-sunset/',
  'https://fakefreenaturestock.com/video/red-sunset/',
  'https://freenaturestock.com/video/red-sunset/?affiliate=abc',
  'https://freenaturestock.com/video/red-sunset.mp4',
  'http://freenaturestock.com/video/red-sunset/',
 ];
 const report=buildSourcingQueue([good,...negative.map((sourcePage,i)=>({...good,id:'bad-'+i,sourcePage}))]);
 assert.equal(report.acceptedResearchCandidates,1);
 assert.equal(report.invalidResearchEntries,negative.length);
 assert.equal(report.generatorEligibleFromResearchQueue,0);
});
test('CC0 exact-page source check still requires human evidence and releases',()=>{
 const sample={provider:'free_nature_stock',licenseId:'cc0_1_0',
  licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  sourcePage:'https://freenaturestock.com/video/red-sunset/',
  author:'Free Nature Stock',clipTitle:'Red Sunset',
  licenseEvidence:'Publisher official CC0 license and exact original video page checked',
  noRecognizablePeople:true,noVisibleBrandLogos:true,exactClipLicenseConfirmed:true,
  commercialUseApproved:true,editingApproved:true,identifiableSubjectsCleared:true,
  checkedOn:new Date().toISOString().slice(0,10),file:'red-sunset.mp4'};
 assert.equal(STOCK_POLICIES.free_nature_stock.attribution,false);
 assert.equal(assessStockClip(sample),null);
 assert.equal(assessStockClip({...sample,commercialUseApproved:false}),'unverified_rights');
 assert.equal(assessStockClip({...sample,noRecognizablePeople:false}),'subjects_or_logos_not_clear');
 assert.equal(assessStockClip({...sample,sourcePage:'https://freenaturestock.com/videos/'}),'untrusted_source_page');
 assert.equal(assessStockClip({...sample,sourcePage:'https://cdn.freenaturestock.com/video/red-sunset/'}),'untrusted_source_page');
 assert.equal(assessStockClip({...sample,licenseId:'cc_by_4_0'}),'unverified_license');
});
test('Coverr remains discovery-only: no unverified API subscription or bulk footage admission',()=>{
 const report=buildSourcingQueue([{id:'sample-stock-001',provider:'coverr',
  sourcePage:'https://coverr.co/videos/calm-forest',visualTags:['forest'],
  ownerApproved:true,approvedForPublication:true}]);
 assert.equal(report.acceptedResearchCandidates,1);
 assert.match(report.candidates[0].acquisitionGate,/no_bulk_or_production_api/);
 assert.equal(report.candidates[0].generatorEligible,false);
 assert.equal(STOCK_POLICIES.coverr,undefined);
});
test('real published origin audit separates filmed footage citations, Supareels AI and legacy files',()=>{
 const licensed=JSON.parse(readFileSync(new URL('../data/video-catalog/scene-taxonomy.json',import.meta.url),'utf8'));
 const animated=JSON.parse(readFileSync(new URL('../data/video-catalog/original-motion-scenes-v1.json',import.meta.url),'utf8'));
 const report=auditPublishedSourceOrigins(licensed,animated);
 assert.equal(report.totalPublishedCatalogRecords,licensed.count+animated.count);
 assert.equal(report.licensedOrHistoricalMp4CatalogRows,licensed.count);
 assert.equal(report.proceduralAnimationCatalogRows,animated.count);
 assert.equal(report.independentlyVerifiedFilmedMasters,null);
 assert.equal(report.privateR2OriginalsVerified,null);
 assert.ok(report.camera_derived_catalog_rows>=16);
 assert.ok(report.ai_vendor_catalog_rows>=20);
 assert.ok(report.legacy_unverified_catalog_rows>=12);
 assert.ok(report.referencedSourcePagesByHost['dareful.com']>=16);
 assert.ok(report.draftResearchCandidatesExcluded);
});
test('published origin audit blocks duplicate catalog paths and does not overcount re-crops',()=>{
 const licensed={count:3,scenes:[
  {id:'a',media:'licensed_mp4',video:'/a.mp4',collection:'v1',originMasterKeys:['original:https://dareful.com/a/']},
  {id:'b',media:'licensed_mp4',video:'/b.mp4',collection:'v1',originMasterKeys:['original:https://dareful.com/a/']},
  {id:'c',media:'licensed_mp4',video:'/c.mp4',collection:'v2',originMasterKeys:['original:https://supareels.com/b/']},
 ]};
 const animated={count:1,scenes:[{id:'d',video:'/d.mp4',media:'original_motion_mp4'}]};
 const report=auditPublishedSourceOrigins(licensed,animated);
 assert.equal(report.camera_derived_catalog_rows,2);
 assert.equal(report.referencedSourcePagesByHost['dareful.com'],1);
 assert.equal(report.independentlyVerifiedFilmedMasters,null);
 assert.throws(()=>auditPublishedSourceOrigins({...licensed,scenes:[licensed.scenes[0],
  {...licensed.scenes[1],video:'/a.mp4'},licensed.scenes[2]]},animated),/DUPLICATE/);
});
