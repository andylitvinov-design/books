import test from 'node:test';
import assert from 'node:assert/strict';
import {STOCK_POLICIES,assessStockClip} from '../lib/mandala/free-stock-sources.mjs';
import {validateVaultAsset,validateVaultManifest} from '../lib/video-vault/contracts.mjs';

const now=new Date('2026-11-07T03:00:00Z');
const page='https://commons.wikimedia.org/wiki/File:Quiet_Ocean.webm';
const license='https://creativecommons.org/licenses/by/4.0/';
const credit='Ocean Creator / CC BY 4.0 / adapted / '+page;
const asset={
 assetId:'commons-ocean-scene',sourceAssetId:'commons-456789',type:'real_footage',
 category:'water',tags:['ocean','waves'],goals:['stress'],motifs:['calm'],pace:'slow',
 aspect:'portrait',expectedByteBudget:10000000,localFile:'quiet-ocean.webm',
 filmedMasterId:'commons-456789-original',sourceHash:'a'.repeat(64),
 creator:'Ocean Creator',title:'Quiet Ocean',
 originalSourcePage:page,sourceProvider:'wikimedia_ccby',
 licenseId:'cc_by_4_0',licenseUrl:license,
 licenseEvidence:'Owner independently verified the exact CC BY 4.0 media, creator and releases.',
 rightsCheckedOn:'2026-11-07',attributionText:credit,
 noRecognizablePeople:true,noVisibleBrandLogos:true,exactClipLicenseConfirmed:true,
 commercialUseApproved:true,editingApproved:true,identifiableSubjectsCleared:true,
 subjectReleaseStatus:'not_applicable',visualApproved:true,beautyRating:5,
 humanReviewer:'Owner Reviewer',ownerApproved:true,manualFootageVerified:true,
 deliveryPolicy:'scene_edit_only'
};
test('CC BY 4.0 Commons must be separate from CC0 with exact-file license and visible credit',()=>{
 assert.equal(STOCK_POLICIES.wikimedia_commons.id,'cc0_1_0');
 assert.equal(STOCK_POLICIES.wikimedia_ccby.id,'cc_by_4_0');
 assert.equal(STOCK_POLICIES.wikimedia_ccby.attribution,true);
 assert.equal(STOCK_POLICIES.wikimedia_ccby.license,license);
 const source={provider:asset.sourceProvider,sourcePage:page,
  licenseId:asset.licenseId,licenseUrl:asset.licenseUrl,
  author:asset.creator,clipTitle:asset.title,licenseEvidence:asset.licenseEvidence,
  file:asset.localFile,noRecognizablePeople:true,noVisibleBrandLogos:true,
  exactClipLicenseConfirmed:true,commercialUseApproved:true,editingApproved:true,
  identifiableSubjectsCleared:true,checkedOn:asset.rightsCheckedOn,attributionText:credit};
 assert.equal(assessStockClip(source,now),null);
 assert.equal(assessStockClip({...source,attributionText:undefined},now),'attribution_required');
 assert.equal(assessStockClip({...source,attributionText:'CC BY 4.0 / adapted'},now),'attribution_required');
 assert.equal(assessStockClip({...source,sourcePage:'https://commons.wikimedia.org/wiki/Category:Quiet_Ocean.webm'},now),'untrusted_source_page');
 assert.equal(assessStockClip({...source,licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},now),'unverified_license');
});
test('operator-local WebM is input ONLY after reviewed source SHA, owner confirmation and credit',()=>{
 assert.equal(validateVaultAsset(asset,now).localFile,'quiet-ocean.webm');
 const m=validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'commons-ccby-sample',milestone:20,assets:[asset]},now);
 assert.equal(m.assets.length,1);
});
test('source cannot be promoted by a license claim, a media search, or an AI reply',()=>{
 const broken=[
 {licenseId:'cc0_1_0'},
 {licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {sourceProvider:'wikimedia_commons'},
 {attributionText:'CC BY 4.0 / adapted'},
 {attributionText:'Ocean Creator / CC BY 4.0 / adapted'},
 {sourceHash:undefined},{sourceHash:'a'.repeat(40)},
 {ownerApproved:false},{visualApproved:false},{manualFootageVerified:false},
 {commercialUseApproved:false},{editingApproved:false},
 {originalSourcePage:'https://commons.wikimedia.org/wiki/File:Quiet_Ocean.webm?download=1'},
 {sourceAssetId:'random-noncommons'},
 {localFile:'../quiet-ocean.webm'},
 {noRecognizablePeople:false},{subjectReleaseStatus:'unknown'},
 ];
 for(const patch of broken)assert.throws(()=>validateVaultAsset({...asset,...patch},now),/HH_VAULT_/,
   JSON.stringify(patch));
});
test('WebM remains forbidden to all other stock sources',()=>{
 const p={...asset,sourceProvider:'pexels',sourceAssetId:'pexels-original',
  originalSourcePage:'https://www.pexels.com/video/example/',
  licenseId:'pexels_content',licenseUrl:'https://www.pexels.com/license/'};
 assert.throws(()=>validateVaultAsset(p,now),/HH_VAULT_INVALID_ASSET_CONTRACT/);
});
