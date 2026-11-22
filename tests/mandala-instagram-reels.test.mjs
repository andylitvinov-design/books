import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  INSTAGRAM_REELS_PROFILE as profile,
  isInstagramReelSelection,
  isInstagramReelActive,
  reelCaptionCenterY,
  reelCaptionBeatAt,
} from "../lib/mandala/instagram-reels.mjs";
import {selectWebCodecsForRecording} from "../lib/mandala/recording-codecs.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const ready=read("components/mandala-video-ready.tsx");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const director=read("components/mandala-auto-video-director.tsx");
const encoder=read("lib/mandala/webcodecs-mp4-export.ts");

test("Instagram Reel selection is isolated from self/gift/non-Reel work formats",()=>{
  assert.equal(isInstagramReelSelection({scope:"business",workFormat:"insta-reels"}),true);
  for(const wrong of [{scope:"me",workFormat:"insta-reels"},
    {scope:"present",workFormat:"insta-reels"},
    {scope:"business",workFormat:"service-presentation"},
    {scope:"business",workFormat:"video-about-me"},
    null,{}]) assert.equal(isInstagramReelSelection(wrong),false);
  assert.equal(isInstagramReelActive(true,"portrait",30,"personal"),true);
  for(const args of [[false,"portrait",30,"personal"],[true,"square",30,"personal"],
    [true,"portrait",20,"personal"],[true,"portrait",30,"openmotion"]])
    assert.equal(isInstagramReelActive(...args),false);
  assert.match(mirror,/workFormat:"insta-reels"/);
  assert.match(director,/workAspect=path.workFormat==="insta-reels"/);
  assert.match(studio,/setReelMode\(requestedReel\)/);
  assert.match(studio,/setDuration\(INSTAGRAM_REELS_PROFILE\.durationSeconds\)/);
  assert.match(studio,/setAspect\(INSTAGRAM_REELS_PROFILE\.aspect\)/);
  assert.match(studio,/setQuality\("fullhd"\)/);
});

test("Reels use a strict 9:16 30s H.264 MP4 profile with 24 fps, never WebM or 8fps",()=>{
  assert.deepEqual([profile.aspect,profile.durationSeconds,profile.frameRate,profile.container,
    profile.videoCodec,profile.audioCodec,profile.recommendedWidth,profile.recommendedHeight],
    ["portrait",30,24,"mp4","avc","aac",1080,1920]);
  assert.equal(profile.downloadName,"holistic-house-instagram-reel.mp4");
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,safariWebKit:false,
    forceWebCodecs:true,procedural:false}),true,"Chrome must honor deliberate H.264 MP4");
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:true,safariWebKit:true,
    nativeMp4Available:true,userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605 Safari/605",
    forceWebCodecs:true}),true,"iPhone Reel must not silently use old low-fps native default");
  assert.equal(selectWebCodecsForRecording({hasWebCodecs:false,safariWebKit:true,
    forceWebCodecs:true}),false);
  assert.match(studio,/forceWebCodecs:reelModeActive\|\|forceWebCodecs/);
  assert.match(studio,/if\(reelModeActive&&\(!useWebCodecsMp4\|\|!hasWebCodecs/);
  assert.match(studio,/frameRate:reelModeActive\?INSTAGRAM_REELS_PROFILE\.frameRate/);
  assert.match(studio,/allowProceduralBrowser:reelModeActive\|\|/);
  assert.match(encoder,/codec:"avc"/);
  assert.match(encoder,/codec:"aac"/);
  assert.match(encoder,/verifyDecodableMp4Export\(bytes/);
});

test("four genuine editorial beats survive source-bound montage and have safe on-screen text",()=>{
  const beats=["Hook","Context","Value","Call to action"];
  assert.equal(reelCaptionBeatAt(0,30,beats),"Hook");
  assert.equal(reelCaptionBeatAt(7.5,30,beats),"Context");
  assert.equal(reelCaptionBeatAt(15,30,beats),"Value");
  assert.equal(reelCaptionBeatAt(22.5,30,beats),"Call to action");
  assert.equal(reelCaptionBeatAt(29.99,30,beats),"Call to action");
  assert.throws(()=>reelCaptionBeatAt(NaN,30,beats),/invalid_reel_caption_beats/);
  assert.throws(()=>reelCaptionBeatAt(4,30,["one"]),/invalid_reel_caption_beats/);
  assert.equal(reelCaptionCenterY("top",1920),384);
  assert.equal(reelCaptionCenterY("center",1920),940.8);
  assert.equal(reelCaptionCenterY("bottom",1920),1190.4);
  for(const name of ["top","center","bottom"]){
    const y=reelCaptionCenterY(name,1920);
    assert.ok(y>1920*.14&&y<1920*.70,name+" inside Reel safe area");
  }
  assert.match(studio,/reelSafe\?reelCaptionCenterY\(animation.positionId,h\)/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,time,plan,clips,reelSafe\)/);
  assert.match(studio,/captionTexts:plan\.shots\.map\(shot=>normalizeStageCaption/);
  assert.match(studio,/reelCaptionBeatAt\(shot\.startSeconds,seconds,beats\)/);
  assert.match(studio,/setCaptionMode\(reelModeActive\?"none":"custom"\)/);
  assert.match(studio,/\(professionalMode\|\|reelModeActive\) \? <MandalaProfessionalPromo/);
});

test("Reel release uses the existing verified Ready/share paths and source-rights gate",()=>{
  assert.match(studio,/data-instagram-reels-profile/);
  assert.match(studio,/reelModeActive\?INSTAGRAM_REELS_PROFILE\.downloadName/);
  assert.match(studio,/reelDownloadName=\{reelModeActive\?INSTAGRAM_REELS_PROFILE\.downloadName:null\}/);
  assert.match(ready,/reelDownloadName\?:string\|null/);
  assert.match(ready,/const readyDownloadName=video\?\.extension==="mp4"&&reelDownloadName/);
  assert.match(ready,/download=\{readyDownloadName\}/);
  assert.match(ready,/new File\(\[video\.blob\],\s*readyDownloadName/);
  assert.match(studio,/if\(!applyAutoFilm\(presetId,seconds,edit,outputAspect\)\)return/);
  assert.match(studio,/existing\.clips\.join\("\|"\)!==proposal\.montage\.sceneIds\.join\("\|"\)/);
  assert.match(studio,/paintVideoBrandStamp\(ctx,exportBrandVariant\)/);
  assert.match(studio,/setPlaybackStatus\("checking"\)/);
  assert.match(studio,/setResult\(\{url:URL\.createObjectURL\(blob\),extension:"mp4"/);
  assert.match(studio,/setMusic\("none"\);setAttachedAudio\(null\)/);
  assert.doesNotMatch(read("lib/mandala/instagram-reels.mjs"),/fetch\(|axios|publishReel|uploadToInstagram|reserveCredit/);
});
