import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {validCandidateDossierId,licenseResearchTrack,
  buildCandidateRightsDossier,readCandidateRightsDossier}
  from '../lib/automations/candidate-rights-dossier.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const uuid='73d5c261-448c-4ddf-b508-45b07102396f';
const row={candidate_id:uuid,source_id:'123456',provider:'wikimedia_commons',
 source_page:'https://commons.wikimedia.org/wiki/File:Quiet_River.webm',
 title:'Quiet River.webm',creator:'Source creator',license_claim:'CC0',
 license_url_claim:'https://creativecommons.org/publicdomain/zero/1.0/',
 category:'stress-anxiety',source_query:'calm river',mime:'video/webm',
 size_bytes:12_000_000,width:1920,height:1080,sha1_claim:'b'.repeat(40),
 review_state:'research_only',rights_state:'unverified',decision:'shortlisted_for_rights_review'};

test('dossier UUIDs are narrow and cannot carry path or query injection',()=>{
 assert.equal(validCandidateDossierId(uuid),true);
 for(const value of ['../id',uuid+'?raw=1','',1234,undefined,'x'.repeat(36)])
   assert.equal(validCandidateDossierId(value),false);
});
test('dossier preserves claimed facts but never licenses or publishes media',()=>{
 const r=buildCandidateRightsDossier(row);
 assert.equal(r.schemaVersion,'hh-commons-rights-research-v1');
 assert.equal(r.researchCandidate.sourceAssetId,'commons-123456');
 assert.equal(r.researchCandidate.sourcePage,row.source_page);
 assert.equal(r.researchCandidate.licenseResearchTrack,'cc0_claim');
 assert.equal(r.investigativePriority,'cc0_local_staging_possible_after_manual_rights_review');
 for(const p of ['licenseApproved','mediaInspected','commercialUseApproved','derivativeUseApproved',
  'localFileVerified','generatorEligible','sourceDownloaded','r2Uploaded'])assert.equal(r[p],false,p);
 assert.equal(r.ownerApprovalRequired,true);
 assert.equal(r.blockedBy.includes('rights_unverified'),true);
 assert.equal(r.blockedBy.includes('source_sha256_not_verified'),true);
 assert.notEqual(r.schemaVersion,'hh-video-vault-batch-v1');
});
test('unshortlisted, rights-approved, or untrusted candidates cannot generate a dossier',()=>{
 for(const patch of [{decision:'rejected'}, {decision:'needs_more_evidence'},
  {review_state:'approved'}, {rights_state:'approved'}, {provider:'pexels'}]){
  assert.throws(()=>buildCandidateRightsDossier({...row,...patch}),/RIGHTS_RESEARCH_REQUIRES_SHORTLIST/);
 }
 for(const url of ['http://commons.wikimedia.org/wiki/File:Quiet_River.webm',
  'https://commons.wikimedia.org/wiki/Category:Quiet_River.webm',
  'https://commons.wikimedia.org.evil.test/wiki/File:Quiet_River.webm',
  'https://commons.wikimedia.org/wiki/File:Quiet_River.webm?download=1',
  'https://commons.wikimedia.org/wiki/File:Quiet_River.webm#section',
  'https://commons.wikimedia.org:444/wiki/File:Quiet_River.webm',
  'https://commons.wikimedia.org/wiki/File:../Quiet_River.webm']){
   assert.throws(()=>buildCandidateRightsDossier({...row,source_page:url}),/RIGHTS_RESEARCH_UNTRUSTED_SOURCE/,url);
  }
});
test('CC BY-SA and public domain claims never silently become CC0',()=>{
 assert.equal(licenseResearchTrack('CC0'),'cc0_claim');
 assert.equal(licenseResearchTrack('CC BY-SA 4.0'),'sharealike_claim');
 assert.equal(licenseResearchTrack('CC BY 3.0'),'attribution_claim');
 assert.equal(licenseResearchTrack('Public domain'),'public_domain_claim');
 assert.equal(licenseResearchTrack('CC BY-NC'),'unknown_claim');
 assert.equal(licenseResearchTrack('something unknown'),'unknown_claim');
 for(const claim of ['CC BY-SA 4.0','CC BY 3.0','Public domain']){
  const r=buildCandidateRightsDossier({...row,license_claim:claim});
  assert.equal(r.investigativePriority,'manual_research_only');
  assert.equal(r.licenseApproved,false);
 }
});
test('unknown or oversized metadata is a warning, never automatic approval',()=>{
 const r=buildCandidateRightsDossier({...row,width:null,height:null,size_bytes:238000000,
  mime:'video/mp4',creator:'',license_url_claim:'https://example.com/false',
  license_claim:'CC0'});
 assert.equal(r.investigativePriority,'manual_research_only');
 assert.equal(r.researchCandidate.licenseUrlClaim,null);
 assert.ok(r.investigationFlags.includes('AUTHOR_MISSING'));
 assert.ok(r.investigationFlags.includes('VIDEO_DIMENSIONS_UNKNOWN'));
 assert.ok(r.investigationFlags.includes('LOCAL_INPUT_SIZE_OUTSIDE_STAGING_LIMIT'));
});
test('private DB lookup uses shortlisted research-only candidate and bounded UUID',async()=>{
 const sql=[];
 const db={query:async(query,params)=>{sql.push(query);assert.deepEqual(params,[uuid]);
   return {rows:[row]};}};
 const r=await readCandidateRightsDossier(db,uuid);
 assert.equal(r.researchCandidate.title,row.title);
 assert.equal(sql.length,1);
 assert.match(sql[0],/inner join app_private\.video_candidate_editorial_reviews_v1/i);
 assert.match(sql[0],/r\.decision='shortlisted_for_rights_review'/);
 assert.doesNotMatch(sql[0],/insert into|update\s|delete\s|app\.video_vault_assets_v1/i);
 await assert.rejects(readCandidateRightsDossier(db,'../anything'),/RIGHTS_RESEARCH_INVALID_REQUEST/);
 const missing=await readCandidateRightsDossier({query:async()=>({rows:[]})},uuid);
 assert.equal(missing,null);
});
test('owner API delegates through existing admin session, not public downloads',()=>{
 const route=readFileSync(resolve(root,'app/api/admin/automations/candidates/dossier/route.js'),'utf8');
 assert.match(route,/ownerMaterialRequest/);
 assert.match(route,/transaction\(config,null/);
 assert.match(route,/consumeRate/);
 assert.match(route,/privateJson/);
 assert.doesNotMatch(route,/r2-client|createR2Client|download|https:\/\/commons/i);
});
