import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_VAULT_ENABLED,checkVaultBudget,rightsBlock,eligibleVaultAsset,selectVaultScenes,verifiedVaultCount,safeVaultKey} from '../lib/video-vault/vault-model.mjs';
const a='a'.repeat(64),b='b'.repeat(64);
const clip=(assetId='lake-1',providerAssetId='one',sha256=a)=>({
 assetId,provider:'dareful',providerAssetId,sourceUrl:'https://dareful.com/lake/',
 type:'real_footage',creator:'Author',licenseId:'cc_by_4_0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
 licenseEvidence:'reviewed',rightsCheckedAt:'2026-11-04',commercialUseOk:true,derivativeEditOk:true,
 ownerReview:'approved',visualRating:5,subjectRelease:'not_applicable',creditRequired:true,
 attributionText:'Author CC BY 4.0 adapted',status:'generator_eligible',technicalVerified:true,
 visualApproved:true,r2HeadVerified:true,r2ReadbackVerified:true,sha256,
 objectKey:`masters/${assetId}/${sha256}.mp4`,posterKey:`posters/${assetId}/${b}.jpg`,
 codec:'h264',pixelFormat:'yuv420p',fileBytes:100000,durationMs:8000,goals:['calm'],motifs:['water'],
 aspect:'portrait',pace:'slow'
});
test('vault feature is OFF by default',()=>assert.equal(VIDEO_VAULT_ENABLED,false));
test('budget fails closed without verified account plan and approval',()=>{
 assert.equal(checkVaultBudget({}).ok,false);
 assert.equal(checkVaultBudget({accountBytes:0,vaultBytes:0,incomingBytes:100000,classAUsed:0,classBUsed:0,usageVerified:true,planVerified:true,writeApproved:true}).ok,true);
 assert.equal(checkVaultBudget({accountBytes:8_000_000_000,vaultBytes:0,incomingBytes:1,classAUsed:0,classBUsed:0,usageVerified:true,planVerified:true,writeApproved:true}).ok,false);
});
test('procedural and restricted sources cannot qualify',()=>{
 assert.equal(rightsBlock({...clip(),type:'original_motion_mp4'}),'NOT_REAL_FOOTAGE');
 assert.equal(rightsBlock({...clip(),licenseId:'mixkit_video_restricted'}),'BLOCKED_LICENSE');
 assert.equal(rightsBlock({...clip(),provider:'pexels'}),'BLOCKED_SOURCE_PERMISSION');
});
test('no HEAD/readback means no generator eligibility',()=>{
 assert.equal(eligibleVaultAsset({...clip(),r2HeadVerified:false}).eligible,false);
 assert.equal(eligibleVaultAsset(clip()).eligible,true);
});
test('strict immutable keys reject traversal and URLs',()=>{
 assert.equal(safeVaultKey(clip().objectKey),true);
 assert.equal(safeVaultKey('https://bad.example/a.mp4'),false);
 assert.equal(safeVaultKey('masters/../a.mp4'),false);
});
test('dedupe by source identity, hash and perceptual hash',()=>{
 const first=clip(),repeat=clip('lake-2','one','c'.repeat(64)),sameHash=clip('lake-3','three',a),second=clip('sea-1','two','d'.repeat(64));
 assert.equal(verifiedVaultCount([first,repeat,sameHash,second]).count,2);
 assert.deepEqual(selectVaultScenes([first,repeat,sameHash,second],{goal:'calm'}).map(x=>x.assetId),['lake-1','sea-1']);
});
