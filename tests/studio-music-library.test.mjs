import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 STUDIO_MUSIC_BUCKET,STUDIO_MUSIC_MAX_BYTES,STUDIO_MUSIC_MAX_TOTAL_BYTES,
 STUDIO_MUSIC_MAX_TRACKS,STUDIO_MUSIC_CATEGORIES,studioMusicFileInfo,
 studioMusicCategory,studioMusicTitle,studioMusicApproval,studioMusicAssetId
} from "../lib/mandala/studio-music-contract.mjs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("upload is 30-file browser batch, private new bucket, with bounded storage",()=>{
 assert.equal(STUDIO_MUSIC_BUCKET,"hh-studio-music-library");
 assert.equal(STUDIO_MUSIC_MAX_BYTES,15*1024*1024);
 assert.ok(STUDIO_MUSIC_MAX_TOTAL_BYTES<=300_000_000);
 assert.ok(STUDIO_MUSIC_MAX_TRACKS>=30&&STUDIO_MUSIC_MAX_TRACKS<=60);
 assert.deepEqual([...STUDIO_MUSIC_CATEGORIES],["wellbeing","focus","calm","energy","love"]);
 const ui=read("components/admin-studio-music.jsx");
 assert.match(ui,/type="file" multiple/);
 assert.match(ui,/list\.length>30/);
 assert.match(ui,/uploadToSignedUrl\(intent\.path,intent\.token,file/);
 assert.match(ui,/action:"complete",assetId:intent\.assetId/);
 assert.match(ui,/action:"publish",assetId:item\.id,qualityScore:review\.score,rightsConfirmed:true/);
 assert.doesNotMatch(ui,/service_role|sb_secret_/);
});

test("published source playback remains outside protected local Video Studio editor",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const picker=read("components/studio-music-picker.jsx");
 assert.match(studio,/import \{StudioMusicPicker\}/);
 assert.match(studio,/<StudioMusicPicker locale=\{locale\}/);
 assert.match(studio,/const selected=chooseAudioFile\(file\)/);
 assert.match(studio,/setAttachedAudio\(\{kind:"file",file:selected\.file,id:selected\.url\}\)/);
 assert.match(studio,/setAudioRights\(true\)/);
 assert.match(studio,/startUploadedAudio\(/);
 assert.doesNotMatch(studio,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon/);
 assert.equal((studio.match(/<audio\b/g)||[]).length,1);
 assert.match(picker,/data-video-studio-music-library/);
 assert.match(picker,/fetch\("\/api\/app\/studio-music"/);
 assert.match(picker,/void getRecording\(row,true\)/);
 assert.match(picker,/buffer\.size!==row\.bytes/);
 assert.match(picker,/onSelect\(file\)/);
});
test("filename, declared MIME and file byte limits are validated at the origin",()=>{
 assert.deepEqual(studioMusicFileInfo("piano.MP3","audio/mpeg",1024),
  {ext:"mp3",mime:"audio/mpeg",bytes:1024});
 assert.equal(studioMusicFileInfo("voice.m4a","audio/x-m4a",2048).mime,"audio/mp4");
 assert.equal(studioMusicFileInfo("calm.wav","",4096).mime,"audio/wav");
 for(const row of [
  ["payload.exe","application/octet-stream",1024],
  ["lossless.flac","audio/flac",1024],
  ["v.mp3","audio/wav",1024],
  ["../../escape.mp3","audio/mpeg",1024],
  ["oversize.mp3","audio/mpeg",STUDIO_MUSIC_MAX_BYTES+1],
  ["empty.mp3","audio/mpeg",511],
 ])assert.throws(()=>studioMusicFileInfo(...row));
});

test("only human-reviewed and explicitly licensed commercial recordings get published",()=>{
 assert.deepEqual(studioMusicApproval({qualityScore:4,rightsConfirmed:true}),
  {qualityScore:4,rightsConfirmed:true});
 assert.deepEqual(studioMusicApproval({qualityScore:5,rightsConfirmed:true}),
  {qualityScore:5,rightsConfirmed:true});
 for(const item of [
  {},{qualityScore:5,rightsConfirmed:false},{qualityScore:3,rightsConfirmed:true},
  {qualityScore:"5",rightsConfirmed:true},{qualityScore:NaN,rightsConfirmed:true},
  {qualityScore:6,rightsConfirmed:true},
 ])assert.throws(()=>studioMusicApproval(item),/MUSIC_REVIEW_REQUIRED/);
 for(const category of STUDIO_MUSIC_CATEGORIES)assert.equal(studioMusicCategory(category),category);
 assert.throws(()=>studioMusicCategory("unsafe"));
 assert.equal(studioMusicTitle("  Piano Morning  "),"Piano Morning");
 assert.throws(()=>studioMusicTitle("<script>bad</script>"));
 const u="76c5612e-fbfd-4e0b-a651-dfd0b3b3bec3";
 assert.equal(studioMusicAssetId(u),u);
 assert.throws(()=>studioMusicAssetId("../private"));
});

test("cloud upload API is admin-only, storage private, and public playback is approved-only",()=>{
 const api=read("app/api/admin/studio-music/route.js");
 const pub=read("app/api/app/studio-music/route.js");
 const server=read("lib/mandala/studio-music-library-server.js");
 assert.match(api,/requireAdminRequest\(\)/);
 assert.match(api,/requireSameOrigin\(request,config\)/);
 assert.match(api,/action==="prepare"/);
 assert.match(api,/action==="complete"/);
 assert.match(api,/action==="publish"/);
 assert.match(api,/action==="retire"/);
 assert.match(pub,/signedPublishedStudioMusic\(config,body\)/);
 assert.match(pub,/requireSameOrigin\(request,config\)/);
 assert.match(server,/data\.public!==false/);
 assert.match(server,/createSignedUploadUrl\(objectKey\)/);
 assert.match(server,/sniffPrivateMedia\(store,row\.object_key,row\.mime,config\.supabaseUrl\)/);
 assert.match(server,/status='published' and rights_confirmed=true and quality_score>=4/);
 assert.match(server,/row\.status!=="published"/);
 assert.match(server,/pg_advisory_xact_lock/);
 assert.doesNotMatch(server,/console\.log|process\.env\.HH_APP_SUPABASE_SECRET_KEY|new URL\(input\.url/);
});
