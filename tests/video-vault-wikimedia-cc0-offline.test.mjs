import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStockClip,STOCK_POLICIES} from '../lib/mandala/free-stock-sources.mjs';
import {validateVaultAsset,validateVaultManifest} from '../lib/video-vault/contracts.mjs';
const now=new Date('2026-11-07T01:00:00Z');
const sourceUrl='https://commons.wikimedia.org/wiki/File:Quiet_River.webm';
const candidate={assetId:'commons-quiet-river',sourceAssetId:'commons-123456',type:'real_footage',
 category:'water',tags:['river','nature'],goals:['stress'],motifs:['flowing'],
 aspect:'landscape',pace:'slow',expectedByteBudget:1000000,localFile:'quiet-river.webm',
 filmedMasterId:'commons-123456-local-original',sourceHash:'a'.repeat(64),
 creator:'Independent creator',title:'Quiet River',originalSourcePage:sourceUrl,
 sourceProvider:'wikimedia_commons',licenseId:'cc0_1_0',
 licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
 licenseEvidence:'Owner independently verified this exact file and original rights.',
 rightsCheckedOn:'2026-11-07',noRecognizablePeople:true,noVisibleBrandLogos:true,
 exactClipLicenseConfirmed:true,commercialUseApproved:true,editingApproved:true,
 identifiableSubjectsCleared:true,subjectReleaseStatus:'not_applicable',
 visualApproved:true,beautyRating:5,humanReviewer:'Source Reviewer',ownerApproved:true,
 manualFootageVerified:true,deliveryPolicy:'scene_edit_only'};

test('Commons is a CC0-only official exact-file-page policy',()=>{
 assert.equal(STOCK_POLICIES.wikimedia_commons.host,'commons.wikimedia.org');
 assert.equal(STOCK_POLICIES.wikimedia_commons.id,'cc0_1_0');
 assert.equal(STOCK_POLICIES.wikimedia_commons.attribution,false);
 assert.equal(STOCK_POLICIES.wikimedia_commons.license,'https://creativecommons.org/publicdomain/zero/1.0/');
});
test('reviewed source WebM can be an offline input without declaring generator readiness',()=>{
 assert.equal(assessStockClip({provider:'wikimedia_commons',sourcePage:sourceUrl,
  licenseId:candidate.licenseId,licenseUrl:candidate.licenseUrl,author:candidate.creator,
  clipTitle:candidate.title,licenseEvidence:candidate.licenseEvidence,file:candidate.localFile,
  noRecognizablePeople:true,noVisibleBrandLogos:true,exactClipLicenseConfirmed:true,
  commercialUseApproved:true,editingApproved:true,identifiableSubjectsCleared:true,
  checkedOn:candidate.rightsCheckedOn},now),null);
 const checked=validateVaultAsset(candidate,now);
 assert.equal(checked.sourceProvider,'wikimedia_commons');
 assert.equal(checked.localFile,'quiet-river.webm');
 assert.equal(validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'commons-cc0-sample',milestone:20,assets:[candidate]},now).assets.length,1);
});
test('non-CC0, missing physical SHA-256, missing owner review cannot pass',()=>{
 for(const patch of [
  {licenseId:'cc_by_sa_4_0'}, {licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
  {sourceHash:undefined}, {sourceHash:'a'.repeat(40)},
  {ownerApproved:false},{exactClipLicenseConfirmed:false},
  {commercialUseApproved:false},{editingApproved:false},
  {noRecognizablePeople:false},{subjectReleaseStatus:'unknown'},
  {originalSourcePage:'https://commons.wikimedia.org/wiki/Category:Quiet_River.webm'},
  {originalSourcePage:'https://commons.wikimedia.org/wiki/File:Quiet_River.webm?download=1'},
  {sourceAssetId:'not-commons-123456'},
  {localFile:'../quiet-river.webm'},
 ])assert.throws(()=>validateVaultAsset({...candidate,...patch},now),/HH_VAULT_/,JSON.stringify(patch));
});
test('WebM is NOT silently enabled for Pexels and other stock providers',()=>{
 const p={...candidate,sourceProvider:'pexels',sourceAssetId:'pexels-original',
  originalSourcePage:'https://www.pexels.com/video/sample-12345/',
  licenseId:'pexels_content',licenseUrl:'https://www.pexels.com/license/'};
 assert.throws(()=>validateVaultAsset(p,now),/HH_VAULT_INVALID_ASSET_CONTRACT/);
});
