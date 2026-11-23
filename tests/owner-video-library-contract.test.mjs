import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ownerVideoFile,ownerVideoId,ownerVideoReview,OWNER_VIDEO_MAX_BYTES,
 OWNER_VIDEO_CATEGORIES,OWNER_VIDEO_BUCKET
} from '../lib/video-library/owner-video-contract.mjs';
const file=()=>({filename:'my-film.mp4',mime:'video/mp4',bytes:1024*1024,title:'Ocean and hope',category:'energy-confidence',tags:['nature','calm']});
const root=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('limited, strict MP4, private bucket and four categories',()=>{
 assert.equal(OWNER_VIDEO_BUCKET,'hh-owner-video-drafts');
 assert.equal(OWNER_VIDEO_CATEGORIES.length,4);
 assert.equal(ownerVideoFile(file()).mime,'video/mp4');
 assert.throws(()=>ownerVideoFile({...file(),filename:'hello.mov'}),/VIDEO_FILE_INVALID/);
 assert.throws(()=>ownerVideoFile({...file(),bytes:OWNER_VIDEO_MAX_BYTES+1}),/VIDEO_FILE_INVALID/);
 assert.throws(()=>ownerVideoFile({...file(),category:'other'}),/VIDEO_CATEGORY_INVALID/);
 assert.throws(()=>ownerVideoFile({...file(),tags:['nature','nature']}),/VIDEO_TAGS_INVALID/);
 assert.throws(()=>ownerVideoFile({...file(),tags:['__proto__']}),/VIDEO_TAGS_INVALID/);
});
test('reviews must not silently grant rights or assert generator eligibility',()=>{
 assert.throws(()=>ownerVideoReview({qualityScore:5,rightsConfirmed:true,sourceType:'licensed_source',peopleCleared:false,sourcePage:'https://pexels.com'}));
 assert.throws(()=>ownerVideoReview({qualityScore:5,rightsConfirmed:true,sourceType:'licensed_source',peopleCleared:true,sourcePage:'http://evil.com'}));
 assert.equal(ownerVideoReview({qualityScore:4,rightsConfirmed:true,sourceType:'owner_original',peopleCleared:true}).sourcePage,null);
 assert.throws(()=>ownerVideoId('test'));
 assert.ok(ownerVideoId('682b9481-87b4-482d-94eb-65950bd686b9'));
 assert.match(root('lib/video-library/owner-video-server.js'),/generatorEligible:false/);
});
test('all APIs owner-only and same-origin, no public raw links',()=>{
 const api=root('app/api/admin/video-library/clips/route.js');
 const server=root('lib/video-library/owner-video-server.js');
 const sql=root('supabase/migrations/20261119163000_hh_owner_video_library_private.sql');
 assert.match(api,/requireAdminRequest/);assert.match(api,/requireSameOrigin/);
 assert.match(server,/createSignedUploadUrl/);assert.match(server,/sha256/);
 assert.match(server,/sniffPrivateMedia/);assert.match(server,/createSignedUrl/);
 assert.match(sql,/force row level security/);
 assert.match(sql,/revoke all .* from public, anon, authenticated/);
 assert.doesNotMatch(sql,/create bucket|insert into storage\.buckets/i);
});
