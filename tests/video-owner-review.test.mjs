import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import originalCatalog from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import digests from '../data/video-catalog/video-review-ci-digests-v1.json' with {type:'json'};
import {videoReviewEvidenceFromSnapshot,buildOwnerVideoReviewModel,
  verifyOwnerVideoReviewSnapshot,VIDEO_OWNER_REVIEW_SCHEMA}
  from '../lib/mandala/video-owner-review.mjs';
import {renderVideoOwnerReviewHtml} from '../lib/mandala/video-owner-review-html.mjs';

test('44 CI-attested masters have unique matching SHA-256 and split rights scope',()=>{
 const evidence=videoReviewEvidenceFromSnapshot();
 assert.equal(evidence.assets.length,44);
 assert.equal(new Set(evidence.assets.map(x=>x.id)).size,44);
 assert.ok(evidence.assets.every(x=>x.sha256.length===64&&
   x.technicalVerified&&x.frameDecoded&&x.codec==='h264'));
 assert.equal(evidence.assets.filter(x=>x.rightsScope==='individual_record').length,12);
 assert.equal(evidence.assets.filter(x=>x.rightsScope==='collection_only').length,32);
});
test('all 120 stories load in the owner review without auto-publishing or XP',()=>{
 const model=buildOwnerVideoReviewModel({locale:'ru'});
 assert.equal(model.schema,VIDEO_OWNER_REVIEW_SCHEMA);
 assert.equal(model.rows.length,120);
 assert.equal(model.counts.candidateFourShots,22);
 assert.equal(model.counts.incompleteVisualCoverage,98);
 assert.equal(model.counts.executableScenarioCount,0);
 assert.equal(model.canExport,false);
 assert.ok(model.rows.every(row=>row.beats.length===4&&row.canExport===false));
 assert.equal(new Set(model.rows.map(x=>x.id)).size,120);
 assert.ok(model.rows.some(x=>x.beats.some(y=>y.selected?.video.startsWith('/videos/holistic-house/'))));
});
test('snapshot cannot accept tampered, duplicated, missing or added source digests',()=>{
 const tampered={...digests,digests:{...digests.digests,'golden-rain':'b'.repeat(64)}};
 const missing={...digests,digests:Object.fromEntries(
   Object.entries(digests.digests).slice(0,43))};
 const added={...digests,digests:{...digests.digests,'invented-scene':'a'.repeat(64)}};
 const broken={...originalCatalog,scenes:originalCatalog.scenes.map((x,i)=>
   i===0?{...x,rightsReference:null}:x)};
 assert.throws(()=>videoReviewEvidenceFromSnapshot(originalCatalog,missing),
   /invalid_owner_video_review_snapshot/);
 assert.throws(()=>videoReviewEvidenceFromSnapshot(originalCatalog,added),
   /invalid_owner_video_review_snapshot/);
 assert.throws(()=>videoReviewEvidenceFromSnapshot(broken,digests),
   /invalid_owner_video_review_snapshot/);
 assert.equal(videoReviewEvidenceFromSnapshot(originalCatalog,tampered).assets[0].sha256,
   'b'.repeat(64),'a versioned snapshot alone is not a new physical verification');
});
test('a fresh CI ffprobe report must exactly match stored hashes and the decoded media',()=>{
 const expected=videoReviewEvidenceFromSnapshot();
 const probe={schemaVersion:'hh-verified-assets-v1',status:'pass',assets:expected.assets};
 assert.equal(verifyOwnerVideoReviewSnapshot({probeReport:probe}).checked,44);
 const damaged={...probe,assets:probe.assets.map((x,i)=>i===0?
   {...x,sha256:'b'.repeat(64)}:x)};
 assert.throws(()=>verifyOwnerVideoReviewSnapshot({probeReport:damaged}),
   /invalid_owner_video_review_snapshot/);
 const wrong={...probe,assets:probe.assets.map((x,i)=>i===0?
   {...x,frameDecoded:false}:x)};
 assert.throws(()=>verifyOwnerVideoReviewSnapshot({probeReport:wrong}),
   /invalid_owner_video_review_snapshot/);
});
test('owner HTML is locally usable, CSP nonced and escapes hostile labels',()=>{
 const model=buildOwnerVideoReviewModel();
 const nonce='AbCdEfGhIjKlMnOpQrStUvWxYz123456';
 const html=renderVideoOwnerReviewHtml(model,nonce);
 assert.match(html,/<meta name="viewport"/);
 assert.match(html,/src=clip\.video|video\.src=selected\.video/);
 assert.match(html,/localStorage/);
 assert.match(html,/hh-local-video-review-notes-v1/);
 assert.match(html,/canExport:false/);
 assert.ok(html.includes('nonce="'+nonce+'"'));
 const entry=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
 assert.ok(entry,'interactive script exists');
 assert.doesNotThrow(()=>new Function(entry[1]));
 const attack={...model,rows:model.rows.map((r,i)=>i===0?
   {...r,title:'</script><script>alert(1)</script>'}:r)};
 const output=renderVideoOwnerReviewHtml(attack,nonce);
 assert.doesNotMatch(output,/<script>alert\(1\)<\/script>/);
 assert.match(output,/\\u003c\/script\\u003e/);
});
test('admin route explicitly denies anonymous requests and never caches private notes',()=>{
 const page=readFileSync(new URL(
   '../app/admin/videos/scenario-review/route.js',import.meta.url),'utf8');
 assert.match(page,/requireAdminRequest\(\)/);
 assert.match(page,/Response\.redirect\(new URL\('\/admin\/login'/);
 assert.match(page,/private, no-store/);
 assert.match(page,/frame-ancestors 'none'/);
 assert.match(page,/script-src 'nonce-/);
 assert.match(page,/noindex, nofollow/);
 assert.doesNotMatch(page,/export async function POST|sendToProvider|chargedXP/);
});

test('mobile owner review exercises real candidate video and private JSON draft',()=>{
 const script=readFileSync(new URL('../scripts/benchmarking/verify-video-owner-review-browser.mjs',import.meta.url),'utf8');
 assert.match(script,/videoWidth/);
 assert.match(script,/approvedForPublication/);
 assert.match(script,/waitForEvent\(['"]download/);
 assert.match(script,/route\.abort/);
});
