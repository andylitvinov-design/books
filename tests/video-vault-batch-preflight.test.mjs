import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectVaultManifest} from '../lib/video-vault/batch-preflight.mjs';
const h='a'.repeat(64);
const asset={assetId:'forest-one',provider:'dareful',providerAssetId:'source-1',
 sourceUrl:'https://dareful.com/forest/',type:'real_footage',creator:'Author',
 licenseId:'cc_by_4_0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
 licenseEvidence:'Reviewed',rightsCheckedAt:'2026-11-04',commercialUseOk:true,
 derivativeEditOk:true,ownerReview:'approved',visualRating:5,
 subjectRelease:'not_applicable',creditRequired:true,attributionText:'Author CC BY 4.0',
 localFile:'forest.mp4',sourceHash:h};
const manifest={schemaVersion:'hh-video-vault-batch-v1',assets:[asset]};
test('approved manifest is still HOLD without live billing evidence',()=>{
 const r=inspectVaultManifest(manifest);assert.equal(r.status,'HOLD');assert.equal(r.uploads,0);assert.equal(r.ready,0);
});
test('only local source files, never remote URL downloads',()=>{
 assert.throws(()=>inspectVaultManifest({...manifest,assets:[{...asset,localFile:'https://dareful.com/file.mp4'}]}),/LOCAL_FILE_REQUIRED/);
 assert.throws(()=>inspectVaultManifest({...manifest,assets:[{...asset,sourceUrl:'http://dareful.com/forest/'}]}),/UNTRUSTED_SOURCE/);
});
test('no duplicate physical source identities or hashes',()=>{
 assert.throws(()=>inspectVaultManifest({...manifest,assets:[asset,{...asset,assetId:'forest-two'}]}),/DUPLICATE_SOURCE/);
});
test('operator file and license evidence mandatory',()=>{
 assert.throws(()=>inspectVaultManifest({...manifest,assets:[{...asset,licenseEvidence:''}]}),/RIGHTS_OR_REVIEW_PENDING/);
 assert.throws(()=>inspectVaultManifest({...manifest,assets:[{...asset,sourceHash:''}]}),/SOURCE_HASH_REQUIRED/);
});
