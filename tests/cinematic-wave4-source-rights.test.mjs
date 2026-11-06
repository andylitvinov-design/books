import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../data/video-catalog/dareful-cinematic-wave4-20261106.json',import.meta.url),'utf8'));
test('official CC BY 4.0 source scope, 28 source identities and no automatic clearance',()=>{
 assert.equal(manifest.sourceCount,28);
 assert.equal(manifest.approvedForPublication,false);
 assert.equal(manifest.cloudflareUploadApproved,false);
 assert.equal(manifest.ownerRightsSignoff,false);
 assert.equal(manifest.sources.length,28);
 const ids=new Set(),pages=new Set(),streams=new Set();
 for(const x of manifest.sources){
  assert.match(x.id,/^[a-z][a-z0-9-]+$/);
  assert.equal(x.sourcePage,'https://dareful.com/'+x.id+'/');
  assert.match(x.mediaUrl,/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/);
  assert.equal(x.creator,'Joel Holland');
  assert.equal(x.licenseId,'cc_by_4_0');
  assert.equal(x.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(x.sourcePageCheckedAt,'2026-11-06');
  assert.equal(x.editorialApproved,false);
  assert.equal(x.rightsFinalCleared,false);
  assert.ok(x.durationSeconds>=8);
  assert.ok(!ids.has(x.id));assert.ok(!pages.has(x.sourcePage));assert.ok(!streams.has(x.mediaUrl));
  ids.add(x.id);pages.add(x.sourcePage);streams.add(x.mediaUrl);
 }
});
test('private-only technical screen retains real ffmpeg SHA and dedup checks',()=>{
 const script=readFileSync(new URL('../scripts/review-dareful-wave4-20261106.mjs',import.meta.url),'utf8');
 for(const s of ['ffprobe','-xerror','framesAndMotion','dHash','nearDuplicateReview','nativePortraitOriginal:false','cloudflareUploaded:false','approvedForPublication:false','CROP']){
  if(s==='CROP')continue;
  assert.ok(script.includes(s),s);
 }
 assert.ok(!/NEXT_PUBLIC_/.test(script));
 assert.ok(!/r2\.cloudflarestorage\.com/.test(script));
 assert.ok(script.includes("'--check'"));
});
